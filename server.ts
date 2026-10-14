import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parsers with high limit for audio payloads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Gemini AI Instance
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Resilient runner with automatic model fallback and retries on 503 / 429
const callWithModelFallback = async <T>(
  action: (modelName: string) => Promise<T>,
  models: string[] = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.5-transcribe'],
  maxRetries = 2
): Promise<T> => {
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await action(model);
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code;
        console.warn(`[Gemini] Model ${model} (attempt ${attempt}/${maxRetries}) failed:`, err?.message || err);
        // If transient 503 (high demand) or 429, wait a bit and retry or try next model
        if (status === 503 || status === 429 || (err?.message && err.message.includes('503'))) {
          await new Promise((r) => setTimeout(r, 600 * attempt));
          continue;
        }
        // If 404 or unsupported, immediately break to next model
        break;
      }
    }
  }

  throw lastError || new Error('All model fallbacks failed');
};

// Local fallback extractor in case of unexpected Gemini API downtime
const fallbackExtractFromText = (rawText: string) => {
  const text = rawText || '';
  const immatMatch = text.match(/\b([A-Z]{2}[- ]?[0-9]{3}[- ]?[A-Z]{2})\b/i) || text.match(/\b([0-9]{1,4}[- ]?[A-Z]{2,3}[- ]?[0-9]{2})\b/i);
  const immatriculation = immatMatch ? immatMatch[1].toUpperCase().replace(/\s+/g, '-') : '';

  // Mileage match (e.g. 140 000 km, 85000km, 45 200 km)
  const kmMatch = text.match(/(\d[\d\s.]*)\s*(?:km|kilom[èe]tres?)/i);
  let compteurValeur: number | undefined;
  if (kmMatch) {
    const rawDigits = kmMatch[1].replace(/[\s.]/g, '');
    const parsed = parseInt(rawDigits, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed < 2000000) {
      compteurValeur = parsed;
    }
  }

  // Vehicle detection
  const brands = [
    'Renault', 'Peugeot', 'Citroën', 'Citroen', 'Dacia', 'Volkswagen', 'VW',
    'Toyota', 'Ford', 'Mercedes', 'Mercedes-Benz', 'BMW', 'Audi', 'Iveco',
    'Fiat', 'Opel', 'Nissan', 'Hyundai', 'Kia', 'Volvo', 'MAN', 'Scania'
  ];
  let vehicule = '';
  for (const b of brands) {
    const brandRegex = new RegExp(`\\b${b}\\b[^.,;\\n]*`, 'i');
    const match = text.match(brandRegex);
    if (match) {
      vehicule = match[0].trim();
      break;
    }
  }

  // Technician match
  const techMatch = text.match(/(?:par|technicien|m[ée]canicien|intervenant)\s+([A-Z][a-zÀ-ÿ]+(?:\s+[A-Z][a-zÀ-ÿ]+)?)/i);
  const technicien = techMatch ? techMatch[1].trim() : '';

  // Parts detection
  const pieces: any[] = [];
  if (/huile|5W30|5W40|0W30|0W20/i.test(text)) {
    const oilQty = text.match(/(\d+(?:[.,]\d+)?)\s*(?:L|litres?)\s*d'huile/i);
    pieces.push({
      designation: text.match(/5W\d+|0W\d+/i)?.[0] ? `Huile moteur ${text.match(/5W\d+|0W\d+/i)?.[0]}` : 'Huile moteur synthèse',
      quantite: oilQty ? parseFloat(oilQty[1].replace(',', '.')) : 5,
      unite: 'L',
      motifRemplacement: 'Entretien préventif / Vidange',
    });
  }
  if (/filtre [aà] huile/i.test(text)) {
    pieces.push({ designation: 'Filtre à huile', quantite: 1, unite: 'pièce', motifRemplacement: 'Entretien préventif' });
  }
  if (/filtre d['’]habitacle|filtre pollen/i.test(text)) {
    pieces.push({ designation: 'Filtre d\'habitacle', quantite: 1, unite: 'pièce', motifRemplacement: 'Entretien préventif' });
  }
  if (/filtre [aà] air/i.test(text)) {
    pieces.push({ designation: 'Filtre à air', quantite: 1, unite: 'pièce', motifRemplacement: 'Entretien préventif' });
  }
  if (/filtre [aà] carburant|filtre [aà] gasoil|filtre gazole/i.test(text)) {
    pieces.push({ designation: 'Filtre à carburant', quantite: 1, unite: 'pièce', motifRemplacement: 'Entretien préventif' });
  }
  if (/plaquettes?(?:\s+de\s+frein)?(?:\s+avant|\s+arri[èe]re)?/i.test(text)) {
    const isAv = /avant/i.test(text);
    pieces.push({
      designation: isAv ? 'Jeu de plaquettes de frein avant' : 'Jeu de plaquettes de frein',
      quantite: 1,
      unite: 'jeu',
      pieceRemplacee: 'Plaquettes usées',
      motifRemplacement: 'Usure normale',
    });
  }
  if (/disques?(?:\s+de\s+frein)?/i.test(text)) {
    pieces.push({
      designation: 'Jeu de disques de frein',
      quantite: 1,
      unite: 'jeu',
      pieceRemplacee: 'Disques usés / hors cote',
      motifRemplacement: 'Usure normale',
    });
  }
  if (/batterie/i.test(text)) {
    pieces.push({
      designation: 'Batterie 12V',
      quantite: 1,
      unite: 'pièce',
      motifRemplacement: 'Remplacement préventif ou défaillance',
    });
  }

  // Tasks detection
  const travaux: string[] = [];
  if (/vidange/i.test(text)) travaux.push('Vidange du moteur et remplacement des filtres');
  if (/frein|plaquette|disque/i.test(text)) travaux.push('Remplacement des éléments de freinage');
  if (/pression|pneumatique|pneus/i.test(text)) travaux.push('Contrôle de la pression des pneumatiques');
  if (/batterie|tension|alternateur/i.test(text)) travaux.push('Contrôle du circuit de charge et batterie');
  if (travaux.length === 0 && text.trim().length > 0) {
    travaux.push(text.slice(0, 150));
  }

  return {
    transcription: text,
    technicien: technicien || undefined,
    vehicule: vehicule || undefined,
    equipement: vehicule || undefined,
    immatriculation: immatriculation || undefined,
    typeIntervention: /vidange|r[ée]vision/i.test(text) ? 'Révision & Vidange' : /frein/i.test(text) ? 'Freinage & Trains' : 'Dépannage Mécanique',
    statutVehicule: /non conforme|immobilis[ée]|danger/i.test(text) ? 'Immobilisé / Dangereux' : /r[ée]serve/i.test(text) ? 'Apte sous réserve' : 'Prêt à rouler / Conforme',
    statutMachine: /non conforme|immobilis[ée]|danger/i.test(text) ? 'Immobilisé / Dangereux' : /r[ée]serve/i.test(text) ? 'Apte sous réserve' : 'Prêt à rouler / Conforme',
    compteurValeur,
    compteurUnite: 'Km',
    travaux,
    pieces,
    anomalies: /anomalie|fuite|d[ée]faut|usure prononc[ée]e|alerte/i.test(text) ? text : 'Aucune anomalie critique constatée.',
  };
};

// Route to transcribe microphone audio using resilient multi-model fallback
app.post('/api/transcribe-audio', async (req, res) => {
  try {
    const { audioData, mimeType = 'audio/webm' } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: 'Audio data is required (base64)' });
    }

    const ai = getAiClient();
    const base64Clean = audioData.replace(/^data:[^;]+;base64,/, '');

    const audioPart = {
      inlineData: {
        mimeType: mimeType.split(';')[0],
        data: base64Clean,
      },
    };

    const transcription = await callWithModelFallback(async (modelName) => {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            audioPart,
            { text: 'Transcris fidèlement et mot pour mot cet enregistrement microphone du mécanicien automobile en français. Conserve les noms de marques, modèles de véhicules, plaques d\'immatriculation, kilométrages, pièces et références mécaniques.' },
          ],
        },
      });
      return response.text?.trim() || '';
    }, ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.5-transcribe']);

    return res.json({ success: true, transcription });
  } catch (error: any) {
    console.error('Error transcribing audio with Gemini fallbacks:', error);
    return res.status(500).json({
      error: 'Erreur lors de la transcription audio par Gemini',
      details: error.message || String(error),
    });
  }
});

// Route to parse technician voice audio recording into structured intervention report
app.post('/api/parse-audio', async (req, res) => {
  const { audioData, mimeType = 'audio/webm', text } = req.body;

  if (!audioData && !text) {
    return res.status(400).json({ error: 'Audio data or text is required' });
  }

  try {
    const ai = getAiClient();

    const parts: any[] = [];
    if (audioData) {
      const base64Clean = audioData.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: mimeType.split(';')[0],
          data: base64Clean,
        },
      });
    }

    const promptText = `Tu es un chef d'atelier mécanicien senior, expert en maintenance et réparation automobile, véhicules légers, utilitaires (VUL) et poids lourds.
Analyse scrupuleusement ces propos dictés par le mécanicien automobile à l'atelier ou en intervention mobile.
${text ? `Transcription fournie : """${text}"""` : ''}
Extrais scrupuleusement les informations pour remplir la fiche d'intervention véhicule.
Règles strictes :
1. Ne devine pas les données manquantes (si une information n'est pas mentionnée, utilise null ou une chaîne vide).
2. Pour le véhicule : identifie la marque, modèle (ex: "Renault Master DCI 150", "Peugeot 208 BlueHDi") et sa plaque d'immatriculation (ex: "EK-842-WX").
3. Pour le compteur : relève le kilométrage (Km) au tableau de bord.
4. Pour les pièces et consommables automobiles :
   - la pièce neuve installée (ex: "Plaquettes de frein avant", "Huile 5W30 C3", "Filtre d'habitacle", "Batterie 12V AGM")
   - la référence constructeur / équipementier si citée
   - la quantité et l'unité (L, jeu, pièce, kit)
   - l'organe ou la pièce défectueuse remplacée (ex: "Plaquettes usées au témoin", "Filtre colmaté", "Disques voilés")
   - le motif de remplacement ("Entretien préventif", "Usure normale", "Casse / Panne", "Fuite / Défaut")
5. Pour le type d'intervention, choisis exactement parmi : "Révision & Vidange", "Dépannage Mécanique", "Freinage & Trains", "Diagnostic & Électronique", "Contrôle Pré-Visite", "Autre".
6. Pour l'état du véhicule après intervention, choisis parmi : "Prêt à rouler / Conforme", "Apte sous réserve", "Immobilisé / Dangereux".
7. Fournis également la transcription textuelle intégrale et fidèle des propos du mécanicien.`;

    parts.push({ text: promptText });

    const parsedJson = await callWithModelFallback(async (modelName) => {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              transcription: {
                type: Type.STRING,
                description: 'Transcription textuelle intégrale et fidèle de la dictée du mécanicien',
              },
              technicien: {
                type: Type.STRING,
                description: 'Nom ou prénom du mécanicien intervenant',
              },
              vehicule: {
                type: Type.STRING,
                description: 'Marque et modèle du véhicule (ex: Renault Master L2H2, Peugeot 208)',
              },
              equipement: {
                type: Type.STRING,
                description: 'Alias pour la marque et modèle du véhicule',
              },
              immatriculation: {
                type: Type.STRING,
                description: 'Plaque d\'immatriculation du véhicule (ex: EK-842-WX)',
              },
              vin: {
                type: Type.STRING,
                description: 'Numéro de série / châssis VIN si mentionné',
              },
              typeIntervention: {
                type: Type.STRING,
                description: 'Type parmi: Révision & Vidange, Dépannage Mécanique, Freinage & Trains, Diagnostic & Électronique, Contrôle Pré-Visite, Autre',
              },
              statutVehicule: {
                type: Type.STRING,
                description: 'Statut du véhicule: Prêt à rouler / Conforme, Apte sous réserve, Immobilisé / Dangereux',
              },
              statutMachine: {
                type: Type.STRING,
                description: 'Alias pour statut du véhicule',
              },
              compteurValeur: {
                type: Type.NUMBER,
                description: 'Kilométrage relevé au compteur du véhicule (en km)',
              },
              compteurUnite: {
                type: Type.STRING,
                description: 'Unité du compteur: Km ou Heures',
              },
              dureeEstimee: {
                type: Type.STRING,
                description: 'Temps passé ou durée de l\'intervention mécanique (ex: 1h30, 45 min)',
              },
              travaux: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Liste des opérations mécaniques réalisées sur le véhicule',
              },
              pieces: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    designation: { type: Type.STRING, description: 'Désignation de la pièce installée / de remplacement' },
                    reference: { type: Type.STRING, description: 'Référence constructeur ou pièce si citée' },
                    quantite: { type: Type.NUMBER, description: 'Quantité numérique utilisée' },
                    unite: { type: Type.STRING, description: 'Unité (ex: pièce, L, kit, m)' },
                    pieceRemplacee: { type: Type.STRING, description: 'Ancienne pièce ou organe remplacé (ex: filtre colmaté, flexible percé)' },
                    motifRemplacement: { type: Type.STRING, description: 'Motif du remplacement (ex: Usure normale, Fuite, Casse, Entretien préventif)' },
                  },
                  required: ['designation', 'quantite'],
                },
                description: 'Liste des pièces détachées et consommables utilisés',
              },
              anomalies: {
                type: Type.STRING,
                description: 'Anomalies constatées, alertes sécurité ou travaux préventifs à prévoir',
              },
            },
            required: [
              'transcription',
              'equipement',
              'typeIntervention',
              'statutMachine',
              'compteurUnite',
              'travaux',
              'pieces',
            ],
          },
        },
      });

      return JSON.parse(response.text || '{}');
    }, ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash']);

    return res.json({ success: true, data: parsedJson });
  } catch (error: any) {
    console.error('Gemini parse failed across all models, falling back to local extraction:', error);

    // If text was provided (e.g. from speech recognition or dictation), use high-accuracy local extractor
    if (text) {
      const fallbackData = fallbackExtractFromText(text);
      return res.json({
        success: true,
        data: fallbackData,
        warning: 'Extraction réalisée par l\'analyseur mécanique local de secours en raison d\'une indisponibilité temporaire du cloud IA.',
      });
    }

    return res.status(500).json({
      error: 'Erreur lors de l\'analyse audio par Gemini',
      details: error.message || String(error),
    });
  }
});

// Vite Middleware for Development / Static file serving for Production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`> Micro-Carnet Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

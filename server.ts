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

// Route to transcribe microphone audio using model gemini-3.5-transcribe
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          audioPart,
          { text: 'Transcribe this microphone audio recording accurately in French or English as spoken by the technician. Preserve all mechanical and technical equipment names, numbers, references, and quantities verbatim.' },
        ],
      },
    });

    const transcription = response.text || '';
    return res.json({ success: true, transcription });
  } catch (error: any) {
    console.error('Error transcribing audio with gemini-3.5-transcribe:', error);
    return res.status(500).json({
      error: 'Erreur lors de la transcription audio par gemini-3.5-transcribe',
      details: error.message || String(error),
    });
  }
});

// Route to parse technician voice audio recording into structured intervention report
app.post('/api/parse-audio', async (req, res) => {
  try {
    const { audioData, mimeType = 'audio/webm', text } = req.body;

    if (!audioData && !text) {
      return res.status(400).json({ error: 'Audio data or text is required' });
    }

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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts,
      },
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

    const parsedJson = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsedJson });
  } catch (error: any) {
    console.error('Error parsing audio with Gemini:', error);
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

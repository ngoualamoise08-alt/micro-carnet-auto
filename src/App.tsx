/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  FileText,
  Download,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Search,
  Star,
  Activity,
  Truck,
  Check,
} from 'lucide-react';
import { InterventionFormData, PieceItem } from './types/intervention';
import { AudioRecorder } from './components/AudioRecorder';
import { InterventionForm } from './components/InterventionForm';
import { RecentInterventions } from './components/RecentInterventions';
import { generateInterventionDocx, downloadInterventionDocx } from './services/wordExport';

const getInitialFormData = (): InterventionFormData => {
  const today = new Date().toISOString().split('T')[0];
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return {
    id: `rep-${Date.now()}`,
    numeroRapport: `INT-${today.replace(/-/g, '')}-${randomSuffix}`,
    date: today,
    technicien: '',
    vehicule: '',
    equipement: '',
    immatriculation: '',
    vin: '',
    typeIntervention: 'Révision & Vidange',
    statutVehicule: 'Prêt à rouler / Conforme',
    statutMachine: 'Prêt à rouler / Conforme',
    compteurValeur: '',
    compteurUnite: 'Km',
    dureeEstimee: '',
    travaux: [''],
    pieces: [],
    anomalies: '',
  };
};

export default function App() {
  const [formData, setFormData] = useState<InterventionFormData>(getInitialFormData());
  const [isProcessingAI, setIsProcessingAI] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const formSectionRef = useRef<HTMLDivElement | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const scrollToForm = () => {
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Called when Gemini parses audio recording
  const handleParsedAudioData = (extracted: any) => {
    setFormData((prev) => {
      const mappedPieces: PieceItem[] = Array.isArray(extracted.pieces)
        ? extracted.pieces.map((p: any, idx: number) => ({
            id: `p-ai-${idx}-${Date.now()}`,
            designation: p.designation || '',
            reference: p.reference || '',
            quantite: Number(p.quantite) || 1,
            unite: p.unite || 'pièce',
          }))
        : prev.pieces;

      const mappedTravaux = Array.isArray(extracted.travaux) && extracted.travaux.length > 0
        ? extracted.travaux
        : prev.travaux;

      return {
        ...prev,
        technicien: extracted.technicien?.trim() ? extracted.technicien : prev.technicien,
        equipement: extracted.equipement || prev.equipement,
        immatriculation: extracted.immatriculation || prev.immatriculation,
        typeIntervention: extracted.typeIntervention || prev.typeIntervention,
        statutMachine: extracted.statutMachine || prev.statutMachine,
        compteurValeur: extracted.compteurValeur !== null && extracted.compteurValeur !== undefined
          ? extracted.compteurValeur
          : prev.compteurValeur,
        compteurUnite: extracted.compteurUnite || prev.compteurUnite,
        dureeEstimee: extracted.dureeEstimee || prev.dureeEstimee,
        travaux: mappedTravaux,
        pieces: mappedPieces.length > 0 ? mappedPieces : prev.pieces,
        anomalies: extracted.anomalies || prev.anomalies,
        transcription: extracted.transcription || prev.transcription,
      };
    });

    showToast('success', 'Rapport pré-rempli par l\'IA Gemini ! Vous pouvez vérifier et signer en bas.');
    scrollToForm();
  };

  const handleResetForm = () => {
    if (window.confirm('Voulez-vous créer une nouvelle fiche d\'intervention vierge ?')) {
      setFormData(getInitialFormData());
      showToast('info', 'Nouvelle fiche vierge initialisée.');
    }
  };

  // Pre-load demo data matching automotive workshop and commercial fleet context
  const handleLoadDemo = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      id: `rep-demo-${Date.now()}`,
      numeroRapport: `INT-${today.replace(/-/g, '')}-482`,
      date: today,
      technicien: 'Marc D. (Chef d\'Atelier Automobile)',
      nomSignataireTechnicien: 'Marc D.',
      vehicule: 'Renault Master 2.3 dCi 150 L2H2 Fourgon',
      equipement: 'Renault Master 2.3 dCi 150 L2H2 Fourgon',
      immatriculation: 'EK-842-WX',
      vin: 'VF1MA000054891230',
      typeIntervention: 'Révision & Vidange',
      statutVehicule: 'Prêt à rouler / Conforme',
      statutMachine: 'Prêt à rouler / Conforme',
      compteurValeur: 142500,
      compteurUnite: 'Km',
      dureeEstimee: '2h30',
      travaux: [
        'Vidange complète carter moteur et remplacement du filtre à huile Mann-Filter',
        'Remplacement du jeu de plaquettes de frein avant ventilées et contrôle des disques (épaisseur 26.2 mm, conforme)',
        'Contrôle des 30 points de sécurité : pneumatiques (AV 4.5 mm, AR 5.2 mm), rotules de direction et amortisseurs',
        'Purge et mise à niveau des fluides (liquide de frein DOT4, lave-glace et liquide de refroidissement -35°C)',
        'Réinitialisation de l\'indicateur d\'entretien au tableau de bord (prochaine révision à 172 500 Km)',
      ],
      pieces: [
        {
          id: 'p-demo-1',
          designation: 'Huile moteur synthèse 5W30 C3 Low-SAPS',
          reference: 'TOTAL-INEO-5W30',
          quantite: 8,
          unite: 'L',
          pieceRemplacee: 'Huile moteur 5W30 usagée vidangée',
          motifRemplacement: 'Entretien préventif',
        },
        {
          id: 'p-demo-2',
          designation: 'Filtre à huile moteur Mann-Filter',
          reference: 'HU-7020-Z',
          quantite: 1,
          unite: 'pièce',
          pieceRemplacee: 'Filtre à huile colmaté',
          motifRemplacement: 'Entretien préventif',
        },
        {
          id: 'p-demo-3',
          designation: 'Jeu de plaquettes de frein avant ventilées',
          reference: 'BREMBO-P68050',
          quantite: 1,
          unite: 'jeu',
          pieceRemplacee: 'Plaquettes avant usées à 85% avec témoin allumé',
          motifRemplacement: 'Usure normale',
        },
        {
          id: 'p-demo-4',
          designation: 'Filtre d\'habitacle anti-allergène & pollen',
          reference: 'FP-26-009',
          quantite: 1,
          unite: 'pièce',
          pieceRemplacee: 'Filtre habitacle encrassé et saturé',
          motifRemplacement: 'Entretien préventif',
        },
      ],
      anomalies: 'Plaquettes arrière à prévoir lors du prochain contrôle dans 15 000 km. Pression des 4 pneumatiques ajustée à 3.2 bars. Essai sur route validé : aucun voyant moteur ni défaut freinage.',
      transcription: 'Révision des 140 000 km effectuée sur le Renault Master immatriculé EK-842-WX. Compteur affiché à 142 500 kilomètres. Vidange moteur avec 8 litres d\'huile synthèse 5W30 et changement du filtre à huile Mann. Remplacement des plaquettes de frein avant qui étaient bien entamées, disques encore dans les cotes. Remplacement filtre habitacle. Contrôle des niveaux et pression des pneus fait, essai routier concluant, véhicule prêt à reprendre la route.',
      nomSignataireClient: 'Laurent B. (Responsable Flotte Véhicules)',
    });
    showToast('success', 'Fiche d\'intervention véhicule de démonstration chargée.');
  };

  const handleExportWord = async () => {
    setIsExporting(true);
    try {
      const blob = await generateInterventionDocx(formData);
      const vehicleClean = (formData.vehicule || formData.equipement || 'Vehicule').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Rapport_Intervention_${vehicleClean}_${formData.date}.docx`;
      downloadInterventionDocx(blob, filename);

      // Auto-save to recent history in localStorage
      try {
        const stored = localStorage.getItem('micro_carnet_auto_history_v1');
        const list = stored ? JSON.parse(stored) : [];
        const index = list.findIndex((item: any) => item.id === formData.id);
        const updated = index >= 0 ? list.map((item: any) => item.id === formData.id ? formData : item) : [formData, ...list].slice(0, 20);
        localStorage.setItem('micro_carnet_auto_history_v1', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not auto-save to history:', e);
      }

      showToast('success', `Rapport Word "${filename}" exporté avec succès !`);
    } catch (err: any) {
      console.error('Docx export error:', err);
      showToast('error', 'Erreur lors de la génération du document Word.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* 1. Top Utility Notification Strip */}
      <div className="bg-[#1d4ed8] text-white text-[11px] font-semibold tracking-wider uppercase py-2 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
            <span>ATELIER AUTOMOBILE · VÉHICULES LÉGERS, VUL & POIDS LOURDS · GESTION DE FLOTTES · CONFORME CNPA / ANFA</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-blue-100 text-[10px]">
            <span>SUPPORT ATELIER : +33 1 42 00 39 00</span>
            <span>·</span>
            <span className="text-amber-300 font-bold">EXPORT WORD (.DOCX) OFFICIEL</span>
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Brand Wordmark with Hamburger icon */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="p-1.5 text-slate-700 hover:text-blue-600 transition-colors"
              title="Menu"
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                <span className="w-full h-0.5 bg-slate-800 rounded-full" />
                <span className="w-full h-0.5 bg-slate-800 rounded-full" />
                <span className="w-full h-0.5 bg-slate-800 rounded-full" />
              </div>
            </button>

            <a href="#" className="flex items-center gap-2 font-black text-lg tracking-tight uppercase text-slate-950">
              <span>MICRO-CARNET</span>
              <span className="text-[10px] font-bold bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded font-mono">
                AUTO
              </span>
            </a>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <a href="#recorder" className="hover:text-blue-600 transition-colors">Dictée Vocale</a>
            <a href="#formulaire" className="hover:text-blue-600 transition-colors">Fiche Véhicule</a>
            <a href="#historique" className="hover:text-blue-600 transition-colors">Historique Plaques</a>
            <a href="#signatures" className="hover:text-blue-600 transition-colors">Signatures</a>
            <a href="#export" className="hover:text-blue-600 transition-colors">Export Word</a>
          </nav>

          {/* Right Zone: Search/Tracking badge & CTA Button */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center bg-slate-100/90 border border-slate-200 rounded-full px-3 py-1.5 text-xs text-slate-600">
              <span className="text-[11px] font-mono text-slate-400 font-semibold mr-1.5">FICHE :</span>
              <span className="font-mono text-xs font-bold text-blue-900 truncate max-w-[110px]">
                {formData.numeroRapport}
              </span>
              <Search className="w-3.5 h-3.5 text-slate-400 ml-2" />
            </div>

            <button
              type="button"
              onClick={handleLoadDemo}
              className="hidden sm:flex items-center px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Exemple Véhicule
            </button>

            <button
              type="button"
              onClick={handleExportWord}
              disabled={isExporting}
              className="h-10 px-4 bg-[#1d4ed8] hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>Exporter</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 3. Hero Section (Strictly Automotive) */}
      <section className="bg-white border-b border-slate-200/80 pt-8 sm:pt-12 pb-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Headline & Automotive Value Proposition */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700">
                <span className="w-2 h-2 bg-blue-600 rounded-xs" />
                <span>GMAO AUTOMOBILE · FLOTTES, UTILITAIRES & ATELIER MÉCANIQUE</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight leading-[1.15]">
                La maintenance qui garde vos véhicules sur la route.
              </h1>

              <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed max-w-xl">
                Rapports d'intervention d'atelier et de dépannage automobile générés en temps réel par dictée vocale mécanicien. Extraction IA automatique des pièces remplacées, kilométrages, révisions et anomalies, avec signatures manuscrites mécanicien & client sur écran et export Word (.docx).
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <a
                  href="#recorder"
                  className="h-12 px-5 bg-[#1d4ed8] hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2.5 cursor-pointer"
                >
                  <span>Démarrer la dictée vocale véhicule</span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                <button
                  type="button"
                  onClick={scrollToForm}
                  className="h-12 px-5 bg-white border border-slate-300 hover:border-slate-400 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-lg shadow-2xs hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span>Voir la fiche d'intervention</span>
                </button>
              </div>

              {/* Social Proof Star Rating Strip */}
              <div className="pt-3 flex items-center gap-2 text-xs text-slate-600">
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <span className="font-bold text-slate-900">4.9/5</span>
                <span className="text-slate-400">·</span>
                <span>Validé par plus de 1,200 mécaniciens d'atelier & gestionnaires de flottes auto</span>
              </div>
            </div>

            {/* Right Column: Automotive Visual Card with Live Telemetry Overlay */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl overflow-hidden border border-slate-200/90 shadow-md bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-6 min-h-[300px] flex flex-col justify-between">
                {/* Background Automotive Graphic Accents */}
                <div className="absolute inset-0 opacity-15 pointer-events-none">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-400 rounded-full blur-3xl" />
                </div>

                {/* Top Badge */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded-md text-[11px] font-mono text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>ATELIER AUTOMOBILE CONNECTÉ</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-amber-400">
                    {formData.date}
                  </span>
                </div>

                {/* Center Vehicle Illustration & Specs */}
                <div className="relative z-10 py-6 my-auto">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold font-mono">
                        VÉHICULE EN INTERVENTION
                      </div>
                      <div className="text-base font-extrabold text-white truncate max-w-[280px]">
                        {formData.vehicule || formData.equipement || 'Sélectionner un véhicule'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Telemetry Card */}
                <div className="relative z-10 bg-white text-slate-950 rounded-xl p-3.5 shadow-lg border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <div className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                      LIVE INTERVENTION VÉHICULE · {formData.numeroRapport}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{formData.statutVehicule || formData.statutMachine || 'Prêt à rouler'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Immatriculation</div>
                      <div className="font-bold text-slate-900 font-mono truncate">
                        {formData.immatriculation || 'En attente'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">Kilométrage</div>
                      <div className="font-bold text-blue-700 font-mono">
                        {formData.compteurValeur !== '' ? `${Number(formData.compteurValeur).toLocaleString('fr-FR')} ${formData.compteurUnite || 'Km'}` : 'Non relevé'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Main Responsive Form & Dictation Workspace */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 pb-36" ref={formSectionRef}>
        {/* Section Title */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-xs" />
              <span>Édition du rapport technique</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">
              Fiche d'Intervention Mécanique
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetForm}
              className="h-9 px-3 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-xs rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser</span>
            </button>
          </div>
        </div>

        {/* Voice Recording Deck */}
        <div id="recorder">
          <AudioRecorder
            onParsedData={handleParsedAudioData}
            isProcessing={isProcessingAI}
            setIsProcessing={setIsProcessingAI}
          />
        </div>

        {/* Main Hybrid Form */}
        <div id="formulaire">
          <InterventionForm formData={formData} onChange={setFormData} />
        </div>

        {/* Local Storage Recent Interventions by Vehicle Plate */}
        <div id="historique">
          <RecentInterventions
            currentForm={formData}
            onLoadIntervention={(loaded) => {
              setFormData(loaded);
              formSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            onNotify={showToast}
          />
        </div>
      </main>

      {/* 5. Sticky Bottom Action Bar with Official Word Export */}
      <div id="export" className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 sm:p-4 shadow-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="hidden sm:block min-w-0">
            <div className="text-xs font-bold text-slate-900 truncate">
              {formData.vehicule || formData.equipement || 'Fiche d\'intervention véhicule'}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {formData.signatureTechnicien ? '✓ Signé par le mécanicien' : 'Signature mécanicien requise'} · {formData.signatureClient ? '✓ Signé par le client' : 'Signature client requise'}
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportWord}
            disabled={isExporting}
            className="w-full sm:w-auto flex-1 sm:flex-initial min-h-[48px] px-6 py-3 bg-[#1d4ed8] hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Génération du document Word (.docx)...</span>
              </>
            ) : (
              <>
                <FileText className="w-5 h-5 text-amber-300" />
                <span>Télécharger le rapport Word officiel (.docx)</span>
                <Download className="w-4 h-4 text-white" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Toast Notification HUD */}
      {notification && (
        <div
          className={`fixed top-20 right-4 z-50 max-w-sm p-4 rounded-xl shadow-xl border flex items-start gap-3 transition-all transform animate-in fade-in slide-in-from-top-4 ${
            notification.type === 'success'
              ? 'bg-slate-950 text-white border-amber-400'
              : notification.type === 'error'
              ? 'bg-red-950 text-white border-red-400'
              : 'bg-blue-950 text-white border-blue-400'
          }`}
        >
          {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
          {notification.type === 'info' && <Sparkles className="w-5 h-5 text-blue-300 shrink-0 mt-0.5" />}
          <div className="text-xs font-semibold leading-snug">{notification.message}</div>
        </div>
      )}
    </div>
  );
}

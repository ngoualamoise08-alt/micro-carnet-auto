import React, { useState, useEffect } from 'react';
import {
  History,
  Car,
  Calendar,
  Gauge,
  Wrench,
  CheckCircle2,
  Trash2,
  BookmarkPlus,
  Search,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { InterventionFormData } from '../types/intervention';

interface RecentInterventionsProps {
  currentForm: InterventionFormData;
  onLoadIntervention: (data: InterventionFormData) => void;
  onNotify?: (type: 'success' | 'error' | 'info', message: string) => void;
}

const STORAGE_KEY = 'micro_carnet_auto_history_v1';

// Seed sample interventions if localStorage is empty
const DEFAULT_RECENT_INTERVENTIONS: InterventionFormData[] = [
  {
    id: 'seed-rep-1',
    numeroRapport: 'INT-AUTO-2026-084',
    date: '2026-10-14',
    technicien: 'Marc Dupont',
    vehicule: 'Renault Master 2.3 dCi 150 L2H2',
    equipement: 'Renault Master 2.3 dCi 150 L2H2',
    immatriculation: 'EK-842-WX',
    vin: 'VF1MA000067891234',
    motorisation: '2.3 dCi 150ch Bi-Turbo Euro 6',
    typeIntervention: 'Révision & Vidange',
    statutVehicule: 'Prêt à rouler / Conforme',
    statutMachine: 'Prêt à rouler / Conforme',
    compteurValeur: 142500,
    compteurUnite: 'Km',
    dureeEstimee: '1h45',
    travaux: [
      'Vidange moteur complète et remplacement filtre à huile',
      'Remplacement filtre à carburant et purge du circuit',
      'Remplacement plaquettes de frein avant et contrôle disques',
    ],
    pieces: [
      {
        id: 'p-1',
        designation: 'Huile moteur 5W30 C3 Low-SAPS',
        reference: 'TOTAL-INEO-5W30',
        quantite: 8,
        unite: 'L',
        pieceRemplacee: 'Huile usagée vidangée',
        motifRemplacement: 'Entretien préventif',
      },
      {
        id: 'p-2',
        designation: 'Jeu plaquettes de frein avant',
        reference: 'BREMBO-P68050',
        quantite: 1,
        unite: 'jeu',
        pieceRemplacee: 'Plaquettes usées à 15% restant',
        motifRemplacement: 'Usure normale',
      },
    ],
    anomalies: 'Disques avant encore conformes mais à prévoir au prochain entretien (cote 26.2mm).',
    nomSignataireTechnicien: 'Marc Dupont',
    nomSignataireClient: 'Transport Express IDF',
  },
  {
    id: 'seed-rep-2',
    numeroRapport: 'INT-AUTO-2026-079',
    date: '2026-10-12',
    technicien: 'Julien Lefevre',
    vehicule: 'Peugeot 208 1.5 BlueHDi 100 S&S',
    equipement: 'Peugeot 208 1.5 BlueHDi 100 S&S',
    immatriculation: 'GF-312-AB',
    vin: 'VF3CCYHYM12345678',
    motorisation: '1.5 BlueHDi 100ch',
    typeIntervention: 'Diagnostic & Électronique',
    statutVehicule: 'Prêt à rouler / Conforme',
    statutMachine: 'Prêt à rouler / Conforme',
    compteurValeur: 68400,
    compteurUnite: 'Km',
    dureeEstimee: '1h15',
    travaux: [
      'Diagnostic valise OBD calculateurs',
      'Remplacement batterie 12V AGM Start&Stop',
      'Apprentissage et réinitialisation BMS au banc',
    ],
    pieces: [
      {
        id: 'p-3',
        designation: 'Batterie 12V 70Ah 760A AGM Start&Stop',
        reference: 'VARTA-E39-AGM',
        quantite: 1,
        unite: 'pièce',
        pieceRemplacee: 'Batterie d’origine en fin de vie (SOH 38%)',
        motifRemplacement: 'Casse / Panne',
      },
    ],
    anomalies: 'Tension de charge alternateur vérifiée à 14.4V. Aucun défaut résiduel.',
    nomSignataireTechnicien: 'Julien Lefevre',
  },
  {
    id: 'seed-rep-3',
    numeroRapport: 'INT-AUTO-2026-061',
    date: '2026-10-09',
    technicien: 'Alexandre Roux',
    vehicule: 'Iveco Daily 35C16 3.0 HPI Fourgon',
    equipement: 'Iveco Daily 35C16 3.0 HPI Fourgon',
    immatriculation: 'CT-489-ZK',
    vin: 'ZCFC35A2205987654',
    motorisation: '3.0 HPI 160ch',
    typeIntervention: 'Freinage & Trains',
    statutVehicule: 'Apte sous réserve',
    statutMachine: 'Apte sous réserve',
    compteurValeur: 189200,
    compteurUnite: 'Km',
    dureeEstimee: '2h30',
    travaux: [
      'Remplacement disques et plaquettes avant ventilés',
      'Purge sous pression liquide de frein DOT 4',
      'Contrôle jeu rotules de direction et silentblocs',
    ],
    pieces: [
      {
        id: 'p-4',
        designation: 'Paire de disques de frein ventilés avant 290mm',
        reference: 'BREMBO-09.A427.11',
        quantite: 1,
        unite: 'jeu',
        pieceRemplacee: 'Disques d’origine hors cote minimale',
        motifRemplacement: 'Usure normale',
      },
      {
        id: 'p-5',
        designation: 'Plaquettes de frein renforcées utilitaire',
        reference: 'FERODO-FDB1617',
        quantite: 1,
        unite: 'jeu',
        pieceRemplacee: 'Plaquettes usées métal sur métal',
        motifRemplacement: 'Usure normale',
      },
      {
        id: 'p-6',
        designation: 'Liquide de frein haute performance DOT 4 LV',
        reference: 'BOSCH-ENV6-DOT4',
        quantite: 1.5,
        unite: 'L',
        pieceRemplacee: 'Liquide de frein dégradé (taux humidité > 3%)',
        motifRemplacement: 'Entretien préventif',
      },
    ],
    anomalies: 'Pneu avant droit à 1.8mm du témoin légal. Remplacement recommandé sous 2 000 km.',
    nomSignataireTechnicien: 'Alexandre Roux',
  },
];

export const RecentInterventions: React.FC<RecentInterventionsProps> = ({
  currentForm,
  onLoadIntervention,
  onNotify,
}) => {
  const [items, setItems] = useState<InterventionFormData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSavedRecently, setIsSavedRecently] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
          return;
        }
      }
      // Seed default sample list
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RECENT_INTERVENTIONS));
      setItems(DEFAULT_RECENT_INTERVENTIONS);
    } catch (e) {
      console.warn('Unable to read localStorage:', e);
      setItems(DEFAULT_RECENT_INTERVENTIONS);
    }
  }, []);

  const saveToStorage = (updatedItems: InterventionFormData[]) => {
    setItems(updatedItems);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedItems));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  };

  // Save current active form into local history
  const handleSaveCurrent = () => {
    const immat = (currentForm.immatriculation || '').trim().toUpperCase();
    if (!immat && !currentForm.vehicule) {
      onNotify?.('error', 'Veuillez renseigner au moins une immatriculation ou un véhicule avant d’enregistrer.');
      return;
    }

    // Check if entry with same id or same report number already exists
    const existingIndex = items.findIndex(
      (item) => item.id === currentForm.id || (immat && item.immatriculation?.toUpperCase() === immat && item.date === currentForm.date)
    );

    let updatedList: InterventionFormData[];
    if (existingIndex >= 0) {
      updatedList = [...items];
      updatedList[existingIndex] = { ...currentForm, id: currentForm.id || `rep-${Date.now()}` };
    } else {
      updatedList = [{ ...currentForm, id: currentForm.id || `rep-${Date.now()}` }, ...items];
    }

    // Keep top 20 recent interventions
    if (updatedList.length > 20) {
      updatedList = updatedList.slice(0, 20);
    }

    saveToStorage(updatedList);
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 3000);
    onNotify?.('success', `Fiche enregistrée en mémoire locale pour l'immatriculation ${immat || currentForm.vehicule}`);
  };

  // Delete an item from history
  const handleDeleteItem = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = items.filter((item) => item.id !== idToDelete);
    saveToStorage(updated);
    onNotify?.('info', 'Fiche retirée de l’historique local.');
  };

  // Reset to default fleet
  const handleResetDefaults = () => {
    saveToStorage(DEFAULT_RECENT_INTERVENTIONS);
    onNotify?.('info', 'Historique réinitialisé avec les fiches véhicules d’exemple.');
  };

  // Filter items by plate number or vehicle name
  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.immatriculation?.toLowerCase().includes(q) ||
      item.vehicule?.toLowerCase().includes(q) ||
      item.equipement?.toLowerCase().includes(q) ||
      item.technicien?.toLowerCase().includes(q) ||
      item.typeIntervention?.toLowerCase().includes(q) ||
      item.numeroRapport?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden mt-8 mb-6">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold tracking-tight text-white">
                Dernières Interventions Récentes
              </h3>
              <span className="text-[10px] font-mono font-bold bg-blue-800 text-blue-200 px-2 py-0.5 rounded-full border border-blue-600/60">
                {items.length} fiches en cache
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Historique localisé par immatriculation · Rechargez une fiche précédente en 1 clic
            </p>
          </div>
        </div>

        {/* Quick action: Save Current Form */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveCurrent}
            className={`h-9 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
              isSavedRecently
                ? 'bg-emerald-500 text-white'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 active:scale-95'
            }`}
            title="Enregistrer la fiche active dans le cache local"
          >
            {isSavedRecently ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Enregistré !</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-4 h-4" />
                <span>Mémoriser la fiche active</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par immatriculation (ex: EK-842-WX), modèle, mécanicien..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-[11px] font-semibold text-slate-600 hover:text-blue-700 flex items-center gap-1 hover:underline cursor-pointer"
            title="Rétablir les exemples par défaut"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Exemples par défaut</span>
          </button>
        </div>
      </div>

      {/* List of Recent Interventions */}
      <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="py-10 text-center text-slate-500">
            <Car className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold">Aucune intervention trouvée pour cette recherche.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Utilisez le bouton « Mémoriser la fiche active » ci-dessus pour ajouter des fiches.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isCurrentlyLoaded =
              item.immatriculation &&
              currentForm.immatriculation &&
              item.immatriculation.toUpperCase() === currentForm.immatriculation.toUpperCase();

            const isReady = item.statutVehicule?.includes('Prêt');
            const isWarning = item.statutVehicule?.includes('réserve');
            const partsCount = item.pieces ? item.pieces.length : 0;
            const hasSigned = Boolean(item.signatureTechnicien || item.signatureClient);

            return (
              <div
                key={item.id}
                onClick={() => {
                  onLoadIntervention(item);
                  onNotify?.('success', `Fiche rechargée : ${item.immatriculation || item.vehicule}`);
                }}
                className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors cursor-pointer group ${
                  isCurrentlyLoaded ? 'bg-blue-50/70 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'
                }`}
              >
                {/* Left Side: License Plate Badge & Vehicle Details */}
                <div className="flex items-start gap-3 min-w-0">
                  {/* French SIV License Plate Style Badge */}
                  <div className="shrink-0 bg-white border-2 border-slate-800 rounded-md shadow-2xs overflow-hidden flex items-stretch h-8 font-mono">
                    <div className="bg-[#003399] text-white px-1.5 flex flex-col items-center justify-center text-[8px] font-bold">
                      <span>★</span>
                      <span>F</span>
                    </div>
                    <div className="px-2.5 flex items-center justify-center font-black text-xs text-slate-900 tracking-wider">
                      {item.immatriculation || 'SANS-IMMAT'}
                    </div>
                  </div>

                  {/* Vehicle Name, Type, and Tech */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                        {item.vehicule || item.equipement || 'Véhicule non spécifié'}
                      </span>
                      {isCurrentlyLoaded && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full">
                          En cours d'édition
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap font-medium">
                      <span className="flex items-center gap-1 text-slate-700 font-semibold">
                        <Wrench className="w-3 h-3 text-slate-400" />
                        {item.typeIntervention}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {item.date}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1 font-mono text-slate-700">
                        <Gauge className="w-3 h-3 text-slate-400" />
                        {item.compteurValeur !== '' ? `${Number(item.compteurValeur).toLocaleString('fr-FR')} ${item.compteurUnite || 'Km'}` : 'Compteur N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Badges & Load Button */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* Status Indicator */}
                  <div className="flex items-center gap-1.5">
                    {partsCount > 0 && (
                      <span className="text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-md">
                        {partsCount} pièce{partsCount > 1 ? 's' : ''}
                      </span>
                    )}

                    {hasSigned && (
                      <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Signé
                      </span>
                    )}

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        isReady
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                          : isWarning
                          ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                          : 'bg-red-50 text-red-700 border border-red-200/80'
                      }`}
                    >
                      {isReady ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                      <span className="hidden md:inline">{item.statutVehicule}</span>
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLoadIntervention(item);
                        onNotify?.('success', `Fiche rechargée : ${item.immatriculation || item.vehicule}`);
                      }}
                      className="h-8 px-2.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      title="Recharger cette fiche dans le formulaire"
                    >
                      <span>Recharger</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Supprimer de l'historique"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-200/80 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Stockage sécurisé dans le navigateur local (localStorage)</span>
        <span className="font-mono text-slate-400">Prêt pour l'atelier sans connexion</span>
      </div>
    </div>
  );
};

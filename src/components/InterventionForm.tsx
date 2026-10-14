import React from 'react';
import {
  Wrench,
  Gauge,
  Calendar,
  User,
  Plus,
  Trash2,
  AlertTriangle,
  FileCheck2,
  Package,
  Layers,
  ChevronDown,
  ChevronUp,
  FileSignature,
} from 'lucide-react';
import {
  InterventionFormData,
  InterventionType,
  VehicleStatus,
  MachineStatus,
  CompteurUnit,
  PieceItem,
} from '../types/intervention';
import { MOCK_VEHICULES, MOCK_CONSOMMABLES } from '../data/mockCatalog';
import { Combobox, ComboboxOption } from './Combobox';
import { SignaturePad } from './SignaturePad';

interface InterventionFormProps {
  formData: InterventionFormData;
  onChange: (updatedData: InterventionFormData) => void;
}

export const InterventionForm: React.FC<InterventionFormProps> = ({
  formData,
  onChange,
}) => {
  const [showTranscription, setShowTranscription] = React.useState(true);

  // Vehicle options for combobox
  const vehicleOptions: ComboboxOption[] = MOCK_VEHICULES.map((v) => ({
    id: v.id,
    label: v.marqueModele,
    sublabel: `${v.immatriculation} · ${v.energie} · ${Number(v.dernierCompteur).toLocaleString('fr-FR')} ${v.typeCompteur}`,
    raw: v,
  }));

  // Consumable options for combobox
  const consumableOptions: ComboboxOption[] = MOCK_CONSOMMABLES.map((p) => ({
    id: p.id,
    label: p.designation,
    sublabel: `Réf: ${p.reference} · Unité: ${p.uniteDefaut}`,
    raw: p,
  }));

  const handleFieldChange = (field: keyof InterventionFormData, value: any) => {
    onChange({
      ...formData,
      [field]: value,
    });
  };

  const handleVehicleSelect = (label: string, option?: ComboboxOption) => {
    if (option && option.raw) {
      const v = option.raw;
      onChange({
        ...formData,
        vehicule: v.marqueModele,
        equipement: v.marqueModele,
        immatriculation: v.immatriculation,
        vin: v.vin || formData.vin,
        compteurUnite: v.typeCompteur,
        compteurValeur: formData.compteurValeur === '' ? v.dernierCompteur : formData.compteurValeur,
      });
    } else {
      onChange({
        ...formData,
        vehicule: label,
        equipement: label,
      });
    }
  };

  // Travaux handlers
  const handleAddTravail = () => {
    onChange({
      ...formData,
      travaux: [...formData.travaux, ''],
    });
  };

  const handleUpdateTravail = (index: number, text: string) => {
    const updated = [...formData.travaux];
    updated[index] = text;
    onChange({
      ...formData,
      travaux: updated,
    });
  };

  const handleRemoveTravail = (index: number) => {
    const updated = formData.travaux.filter((_, i) => i !== index);
    onChange({
      ...formData,
      travaux: updated.length > 0 ? updated : [''],
    });
  };

  // Pieces handlers
  const handleAddPiece = (template?: Partial<PieceItem>) => {
    const newPiece: PieceItem = {
      id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      designation: template?.designation || '',
      reference: template?.reference || '',
      quantite: template?.quantite || 1,
      unite: template?.unite || 'pièce',
      pieceRemplacee: template?.pieceRemplacee || '',
      motifRemplacement: template?.motifRemplacement || 'Entretien préventif',
    };
    onChange({
      ...formData,
      pieces: [...formData.pieces, newPiece],
    });
  };

  const handleUpdatePiece = (index: number, field: keyof PieceItem, value: any) => {
    const updated = [...formData.pieces];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onChange({
      ...formData,
      pieces: updated,
    });
  };

  const handlePieceComboboxSelect = (index: number, label: string, option?: ComboboxOption) => {
    const updated = [...formData.pieces];
    if (option && option.raw) {
      const consumable = option.raw;
      updated[index] = {
        ...updated[index],
        designation: consumable.designation,
        reference: consumable.reference || updated[index].reference,
        unite: consumable.uniteDefaut || updated[index].unite,
      };
    } else {
      updated[index] = {
        ...updated[index],
        designation: label,
      };
    }
    onChange({
      ...formData,
      pieces: updated,
    });
  };

  const handleRemovePiece = (index: number) => {
    const updated = formData.pieces.filter((_, i) => i !== index);
    onChange({
      ...formData,
      pieces: updated,
    });
  };

  const interventionTypes: InterventionType[] = [
    'Révision & Vidange',
    'Dépannage Mécanique',
    'Freinage & Trains',
    'Diagnostic & Électronique',
    'Contrôle Pré-Visite',
    'Autre',
  ];
  const statusOptions: { label: VehicleStatus; color: string; desc: string }[] = [
    { label: 'Prêt à rouler / Conforme', color: 'bg-emerald-50 text-emerald-900 border-emerald-300', desc: 'Véhicule contrôlé et prêt à circuler' },
    { label: 'Apte sous réserve', color: 'bg-amber-50 text-amber-900 border-amber-300', desc: 'Travaux complémentaires ou surveillance prévus' },
    { label: 'Immobilisé / Dangereux', color: 'bg-red-50 text-red-900 border-red-300', desc: 'Interdit de circulation / Défaillance critique' },
  ];

  return (
    <div className="space-y-6">
      {/* Audio Transcription Notice if available */}
      {formData.transcription && (
        <div className="bg-amber-50/80 border border-amber-300 rounded-xl overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setShowTranscription(!showTranscription)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-left font-bold text-xs uppercase tracking-wider text-amber-900 hover:bg-amber-100/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Transcription de la dictée vocale (IA Gemini)</span>
            </div>
            {showTranscription ? (
              <ChevronUp className="w-4 h-4 text-amber-800" />
            ) : (
              <ChevronDown className="w-4 h-4 text-amber-800" />
            )}
          </button>
          {showTranscription && (
            <div className="p-3.5 pt-0 text-xs text-slate-800 italic border-t border-amber-200/60 leading-relaxed font-sans">
              "{formData.transcription}"
            </div>
          )}
        </div>
      )}

      {/* Card 1: Informations Générales & Véhicule */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-900" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            01. Identification du Véhicule & Kilométrage
          </h3>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mécanicien */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-900" />
                <span>Mécanicien intervenant</span>
              </label>
              <input
                type="text"
                value={formData.technicien}
                onChange={(e) => handleFieldChange('technicien', e.target.value)}
                placeholder="Ex: Marc D., Atelier Principal"
                className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-900" />
                <span>Date de l'intervention</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleFieldChange('date', e.target.value)}
                className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Vehicle Combobox */}
            <div className="sm:col-span-2">
              <Combobox
                label="Véhicule / Marque & Modèle"
                required
                options={vehicleOptions}
                value={formData.vehicule || formData.equipement || ''}
                onChange={handleVehicleSelect}
                placeholder="Rechercher marque/modèle de véhicule..."
              />
            </div>

            {/* Immatriculation */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Immatriculation (Plaque)
              </label>
              <input
                type="text"
                value={formData.immatriculation}
                onChange={(e) => handleFieldChange('immatriculation', e.target.value)}
                placeholder="Ex: FP-342-ZA"
                className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-mono font-medium focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* N° Châssis VIN */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Numéro de Série / VIN
              </label>
              <input
                type="text"
                value={formData.vin || ''}
                onChange={(e) => handleFieldChange('vin', e.target.value)}
                placeholder="Ex: VF1MA000054891..."
                className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-mono font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none uppercase"
              />
            </div>

            {/* Kilométrage Relevé */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-blue-900" />
                <span>Kilométrage Compteur</span>
              </label>
              <div className="flex rounded-lg shadow-xs overflow-hidden border border-slate-300 focus-within:ring-2 focus-within:ring-blue-600">
                <input
                  type="number"
                  value={formData.compteurValeur === '' ? '' : formData.compteurValeur}
                  onChange={(e) =>
                    handleFieldChange(
                      'compteurValeur',
                      e.target.value === '' ? '' : Number(e.target.value)
                    )
                  }
                  placeholder="Ex: 142500"
                  className="w-full h-11 px-3.5 bg-white text-base text-slate-900 font-bold font-mono focus:outline-none"
                />
                <div className="flex border-l border-slate-300 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => handleFieldChange('compteurUnite', 'Km')}
                    className={`px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                      formData.compteurUnite === 'Km'
                        ? 'bg-blue-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Km
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFieldChange('compteurUnite', 'Heures')}
                    className={`px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
                      formData.compteurUnite === 'Heures'
                        ? 'bg-blue-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Heures
                  </button>
                </div>
              </div>
            </div>

            {/* Durée d'atelier */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Temps d'atelier passé
              </label>
              <input
                type="text"
                value={formData.dureeEstimee}
                onChange={(e) => handleFieldChange('dureeEstimee', e.target.value)}
                placeholder="Ex: 1h45, 2h30"
                className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Type d'intervention */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Type d'intervention automobile
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {interventionTypes.map((type) => {
                const isSelected = formData.typeIntervention === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleFieldChange('typeIntervention', type)}
                    className={`h-11 px-2 text-xs font-bold uppercase rounded-xl border transition-all cursor-pointer flex items-center justify-center text-center ${
                      isSelected
                        ? 'bg-blue-900 text-amber-300 border-blue-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Statut Véhicule */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              État du véhicule après intervention
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {statusOptions.map((opt) => {
                const isSelected = (formData.statutVehicule || formData.statutMachine) === opt.label;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      handleFieldChange('statutVehicule', opt.label);
                      handleFieldChange('statutMachine', opt.label);
                    }}
                    className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? `${opt.color} ring-2 ring-blue-900 font-bold shadow-xs`
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Card 2: Travaux & Opérations Réalisées */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-900" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. Travaux & Opérations Réalisées ({formData.travaux.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={handleAddTravail}
            className="h-8 px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter une ligne</span>
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-2.5">
          {formData.travaux.map((travail, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-6 text-center font-mono text-xs font-bold text-slate-400 shrink-0">
                {(index + 1).toString().padStart(2, '0')}.
              </span>
              <input
                type="text"
                value={travail}
                onChange={(e) => handleUpdateTravail(index, e.target.value)}
                placeholder="Description de l'opération (ex: Vidange moteur et remplacement filtre)..."
                className="flex-1 h-11 px-3.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none"
              />
              {formData.travaux.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveTravail(index)}
                  className="w-10 h-11 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  title="Supprimer la ligne"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Card 3: Pièces Utilisées pour le Remplacement */}
      <section className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="bg-slate-100/90 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-900" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              03. Pièces Utilisées pour le Remplacement & Fournitures ({formData.pieces.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => handleAddPiece()}
            className="h-8 px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter une pièce de remplacement</span>
          </button>
        </div>

        {/* Quick Add Suggestions Strip (Automotive Parts) */}
        <div className="px-4 py-2.5 bg-blue-50/60 border-b border-slate-200/80 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 shrink-0">
            Ajout rapide pièce véhicule :
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleAddPiece({ designation: 'Jeu de plaquettes de frein avant ventilées', reference: 'BREMBO-P68050', quantite: 1, unite: 'jeu', pieceRemplacee: 'Plaquettes avant usées à 85%', motifRemplacement: 'Usure normale' })}
              className="px-2.5 py-1 bg-white hover:bg-blue-100 border border-blue-200 rounded-md text-[11px] font-semibold text-slate-800 transition-colors cursor-pointer"
            >
              + Plaquettes AV
            </button>
            <button
              type="button"
              onClick={() => handleAddPiece({ designation: 'Filtre à huile moteur Mann-Filter', reference: 'HU-7020-Z', quantite: 1, unite: 'pièce', pieceRemplacee: 'Filtre à huile usagé', motifRemplacement: 'Entretien préventif' })}
              className="px-2.5 py-1 bg-white hover:bg-blue-100 border border-blue-200 rounded-md text-[11px] font-semibold text-slate-800 transition-colors cursor-pointer"
            >
              + Filtre Huile
            </button>
            <button
              type="button"
              onClick={() => handleAddPiece({ designation: 'Huile moteur synthèse 5W30 C3 Low-SAPS', reference: 'TOTAL-INEO-5W30', quantite: 5, unite: 'L', pieceRemplacee: 'Huile moteur usagée vidangée', motifRemplacement: 'Entretien préventif' })}
              className="px-2.5 py-1 bg-white hover:bg-blue-100 border border-blue-200 rounded-md text-[11px] font-semibold text-slate-800 transition-colors cursor-pointer"
            >
              + Huile 5W30 (5L)
            </button>
            <button
              type="button"
              onClick={() => handleAddPiece({ designation: 'Filtre d\'habitacle anti-allergène & pollen', reference: 'FP-26-009', quantite: 1, unite: 'pièce', pieceRemplacee: 'Filtre habitacle saturé', motifRemplacement: 'Entretien préventif' })}
              className="px-2.5 py-1 bg-white hover:bg-blue-100 border border-blue-200 rounded-md text-[11px] font-semibold text-slate-800 transition-colors cursor-pointer"
            >
              + Filtre Habitacle
            </button>
            <button
              type="button"
              onClick={() => handleAddPiece({ designation: 'Filtre à carburant gasoil séparateur d\'eau', reference: 'WK-820-17', quantite: 1, unite: 'pièce', pieceRemplacee: 'Filtre gasoil colmaté', motifRemplacement: 'Entretien préventif' })}
              className="px-2.5 py-1 bg-white hover:bg-blue-100 border border-blue-200 rounded-md text-[11px] font-semibold text-slate-800 transition-colors cursor-pointer"
            >
              + Filtre Gasoil
            </button>
            <button
              type="button"
              onClick={() => handleAddPiece({ designation: 'Paire de disques de frein avant 280mm', reference: 'BREMBO-09.A427.11', quantite: 1, unite: 'paire', pieceRemplacee: 'Disques avec cote minimale atteinte', motifRemplacement: 'Usure normale' })}
              className="px-2.5 py-1 bg-white hover:bg-blue-100 border border-blue-200 rounded-md text-[11px] font-semibold text-slate-800 transition-colors cursor-pointer"
            >
              + Disques Frein AV
            </button>
            <button
              type="button"
              onClick={() => handleAddPiece({ designation: 'Batterie de démarrage 12V 70Ah 760A AGM', reference: 'VARTA-E39-AGM', quantite: 1, unite: 'pièce', pieceRemplacee: 'Batterie d\'origine faible / HS', motifRemplacement: 'Casse / Panne' })}
              className="px-2.5 py-1 bg-white hover:bg-blue-100 border border-blue-200 rounded-md text-[11px] font-semibold text-slate-800 transition-colors cursor-pointer"
            >
              + Batterie 12V
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {formData.pieces.length === 0 ? (
            <div className="text-center py-7 px-4 text-xs text-slate-500 italic bg-slate-50/70 rounded-xl border border-dashed border-slate-300">
              Aucune pièce de remplacement saisie pour ce véhicule. Cliquez sur « Ajouter une pièce de remplacement », choisissez un raccourci ci-dessus ou dictez vos pièces au microphone.
            </div>
          ) : (
            <div className="space-y-3.5">
              {formData.pieces.map((piece, index) => (
                <div
                  key={piece.id || index}
                  className="p-3.5 bg-slate-50/90 border border-slate-200 rounded-xl space-y-3 transition-colors hover:border-slate-300"
                >
                  {/* Row 1: Designation, Reference, Quantity, Unit, Delete */}
                  <div className="space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
                    {/* Designation Combobox */}
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Pièce de remplacement neuve installée sur le véhicule
                      </label>
                      <Combobox
                        options={consumableOptions}
                        value={piece.designation}
                        onChange={(label, opt) => handlePieceComboboxSelect(index, label, opt)}
                        placeholder="Rechercher ou saisir pièce automobile..."
                      />
                    </div>

                    {/* Reference */}
                    <div className="w-full sm:w-40">
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Réf. constructeur / pièce
                      </label>
                      <input
                        type="text"
                        value={piece.reference}
                        onChange={(e) => handleUpdatePiece(index, 'reference', e.target.value)}
                        placeholder="Ex: BREMBO-P68050"
                        className="w-full h-11 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-mono font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    {/* Quantité & Unité */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Quantité
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={piece.quantite}
                          onChange={(e) => handleUpdatePiece(index, 'quantite', Number(e.target.value))}
                          className="w-18 h-11 px-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-bold font-mono text-center focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        />
                        <select
                          value={piece.unite}
                          onChange={(e) => handleUpdatePiece(index, 'unite', e.target.value)}
                          className="h-11 px-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                        >
                          <option value="pièce">pièce</option>
                          <option value="L">L (litres)</option>
                          <option value="jeu">jeu</option>
                          <option value="paire">paire</option>
                          <option value="kit">kit</option>
                          <option value="bidon">bidon</option>
                          <option value="m">m</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleRemovePiece(index)}
                          className="w-10 h-11 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                          title="Supprimer la ligne"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Replaced defective part and Reason for replacement */}
                  <div className="pt-2 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Organe ou pièce d'origine remplacée (état / motif)
                      </label>
                      <input
                        type="text"
                        value={piece.pieceRemplacee || ''}
                        onChange={(e) => handleUpdatePiece(index, 'pieceRemplacee', e.target.value)}
                        placeholder="Ex: Plaquettes avant usées à 85%, filtre colmaté, disque voilé..."
                        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Motif du remplacement
                      </label>
                      <select
                        value={piece.motifRemplacement || 'Entretien préventif'}
                        onChange={(e) => handleUpdatePiece(index, 'motifRemplacement', e.target.value)}
                        className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none cursor-pointer"
                      >
                        <option value="Entretien préventif">Entretien préventif (révision constructeur)</option>
                        <option value="Usure normale">Usure normale constatée</option>
                        <option value="Fuite / Défaut">Fuite ou perte d'étanchéité</option>
                        <option value="Casse / Panne">Casse / Défaillance mécanique</option>
                        <option value="Contre-visite contrôle technique">Contre-visite contrôle technique</option>
                        <option value="Autre">Autre motif</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Card 4: Anomalies & Alertes de Sécurité */}
      <section className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            04. Observations, Anomalies & Points de Vigilance
          </h3>
        </div>

        <div className="p-4 sm:p-5">
          <textarea
            rows={3}
            value={formData.anomalies}
            onChange={(e) => handleFieldChange('anomalies', e.target.value)}
            placeholder="Ex: Disques avant proches de la cote d'usure minimale (à remplacer au prochain jeu de plaquettes). Pneumatiques arrière à surveiller à 150 000 km..."
            className="w-full p-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-none"
          />
          <p className="mt-2 text-[11px] text-slate-500 italic">
            Les anomalies et points de vigilance apparaîtront en évidence dans l'encart d'alerte du document Word officiel.
          </p>
        </div>
      </section>

      {/* Card 5: Signatures Manuscrites & Validation */}
      <section className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="bg-blue-900 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSignature className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              05. Validation & Signatures Manuscrites Directes
            </h3>
          </div>
          <span className="text-[10px] font-mono font-semibold bg-blue-800 text-amber-300 px-2 py-0.5 rounded border border-blue-700">
            Intégré au rapport .docx
          </span>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <p className="text-xs text-slate-600">
            Signez directement sur l'écran (au doigt ou au stylet tactile). Les signatures manuscrites authentiques seront intégrées en haute résolution au document Word exporté.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Signature Mécanicien */}
            <SignaturePad
              title="Visa du Mécanicien"
              subtitle="Certification de la bonne exécution des travaux sur le véhicule"
              defaultRole="Mécanicien Référent"
              signerName={formData.nomSignataireTechnicien || formData.technicien}
              onSignerNameChange={(name) => handleFieldChange('nomSignataireTechnicien', name)}
              signatureDataUrl={formData.signatureTechnicien}
              onSignatureChange={(sig) => handleFieldChange('signatureTechnicien', sig)}
            />

            {/* Signature Client / Responsable Flotte */}
            <SignaturePad
              title="Visa Client / Responsable Flotte"
              subtitle="Bon pour accord des travaux et restitution du véhicule"
              defaultRole="Client / Resp. Flotte"
              signerName={formData.nomSignataireClient || ''}
              onSignerNameChange={(name) => handleFieldChange('nomSignataireClient', name)}
              signatureDataUrl={formData.signatureClient}
              onSignatureChange={(sig) => handleFieldChange('signatureClient', sig)}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

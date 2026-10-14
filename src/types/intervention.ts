export type InterventionType =
  | 'Révision & Vidange'
  | 'Dépannage Mécanique'
  | 'Freinage & Trains'
  | 'Diagnostic & Électronique'
  | 'Contrôle Pré-Visite'
  | 'Autre';

export type VehicleStatus =
  | 'Prêt à rouler / Conforme'
  | 'Apte sous réserve'
  | 'Immobilisé / Dangereux';

// Backward compatibility alias
export type MachineStatus = VehicleStatus;

export type CompteurUnit = 'Km' | 'Heures';

export interface PieceItem {
  id: string;
  designation: string;
  reference: string;
  quantite: number;
  unite: string;
  pieceRemplacee?: string;
  motifRemplacement?: string;
  fournisseur?: string;
}

export interface InterventionFormData {
  id: string;
  numeroRapport: string;
  date: string;
  technicien: string;
  vehicule: string;
  equipement?: string; // alias for vehicule
  immatriculation: string;
  vin?: string;
  motorisation?: string;
  typeIntervention: InterventionType;
  statutVehicule: VehicleStatus;
  statutMachine?: VehicleStatus; // alias
  compteurValeur: number | '';
  compteurUnite: CompteurUnit;
  dureeEstimee: string;
  travaux: string[];
  pieces: PieceItem[];
  anomalies: string;
  transcription?: string;
  signatureTechnicien?: string;
  nomSignataireTechnicien?: string;
  signatureClient?: string;
  nomSignataireClient?: string;
}

export interface CatalogVehicle {
  id: string;
  marqueModele: string;
  immatriculation: string;
  vin: string;
  typeCompteur: CompteurUnit;
  dernierCompteur: number;
  energie: string;
  categorie: string;
}

// Backward compatibility alias
export type CatalogMachine = CatalogVehicle;

export interface CatalogConsommable {
  id: string;
  designation: string;
  reference: string;
  uniteDefaut: string;
  categorie: string;
}

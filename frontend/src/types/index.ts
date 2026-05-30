export interface MenageInput {
    revenu_mensuel: number;
    taille_menage: number;
    nb_enfants: number;
    acces_eau: number;
    electricite: number;
    type_logement: number;
    emploi_chef: number;
    niveau_etude: number;
    distance_centre_sante_km: number;
    zone: number;
    alimentation_suffisante: number;
    acces_internet: number;
    depenses_mensuelles: number;
  }
  
  export type VulnerabiliteLabel = "faible" | "modérée" | "élevée";
  
  export interface PredictionResult {
    prediction: number;
    label: VulnerabiliteLabel;
    color: string;
    icon: string;
    description: string;
    score: number;
  }
  
  export interface HistoryEntry {
    id: string;
    timestamp: Date;
    input: MenageInput;
    result: PredictionResult;
  }
  
  export interface StatsData {
    total: number;
    faible: number;
    moderee: number;
    elevee: number;
  }
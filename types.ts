
export interface Equipment {
  tagAit: string;
  tagEquipment: string;
  manufacturer: string;
  model: string;
  osNumber: string;
  itNumber: string;
  classification: string;
  technicianName: string;
  installationArea: string;
  calibrationDate: string;
  motive: string;
  electrodeReplacement: boolean;
  electrodeManufactureDate: string;
}

export interface Solution {
  type: 'pH 4,00' | 'pH 7,00' | 'pH 10,00';
  lot: string;
  manufactureDate: string;
  expiryDate: string;
  manufacturer: string;
  calibrationTemp: number;
}

export interface CalibrationPoint {
  date: string;
  indicatedPh7: number;
  samplePh7: number;
  error7: number;
  indicatedPh10: number;
  samplePh10: number;
  error10: number;
  mV7: number;
  mV10: number;
  slope: number;
  temperature: number;
  uncertainty: number;
  errorPercentage: number;
}

export interface Verification {
  temperature: number;
  date7: string;
  indicatedPh7: number;
  samplePh7: number;
  error7: number;
  date10: string;
  indicatedPh10: number;
  samplePh10: number;
  error10: number;
  mV7: number;
  mV10: number;
  result: 'Aprovado' | 'Reprovado';
}

export interface ReportData {
  id: string;
  equipment: Equipment;
  solutions: Solution[];
  calibration: CalibrationPoint;
  verification: Verification;
  status: 'Conforme' | 'Não Conforme';
  observations: string;
  calibrationMotive: string;
  normativeRef: string;
  responsible: {
    name: string;
    registration: string;
    sector: string;
    signatureDate: string;
  };
  savedAt?: string;
  calibrationSkipped?: boolean;
}

export interface AIInsight {
  isValid: boolean;
  confidence: number;
  recommendation: string;
  anomalies: string[];
}

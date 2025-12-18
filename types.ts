
export interface LogoConfig {
  url: string | null;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  text?: string;
  textX?: number;
  textY?: number;
  textScale?: number;
  customPalette?: string[];
}

export interface AnalysisResult {
  isPrintable: boolean;
  confidenceScore: number; 
  reasoning: string;
  suggestedColors: string[]; 
  complexityRating: number; 
  estimatedPrice: number;
  recommendedScale: number;
  imageType?: 'logo' | 'photo';
  localDescription?: string;
}

export interface PrintSettings {
  material: 'PLA' | 'PETG' | 'TPU';
  quality: 'draft' | 'standard' | 'fine';
}

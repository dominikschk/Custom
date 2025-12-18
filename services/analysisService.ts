
import { AnalysisResult } from '../types';

export interface CapabilityReport {
  title: string;
  description: string;
  status: 'optimal' | 'warning' | 'critical' | 'info';
}

export const analyzeDesignLocally = async (
  imageData: ImageData, 
  palette: string[]
): Promise<AnalysisResult & { capabilities: CapabilityReport[] }> => {
  return new Promise((resolve) => {
    const { width, height, data } = imageData;
    const colorCount = palette.length;
    
    // Lokale Logo-Erkennung (Varianz)
    let localVarianceSum = 0;
    let samplePoints = 0;
    const step = 8; 
    for (let y = step; y < height - step; y += step) {
      for (let x = step; x < width - step; x += step) {
        const idx = (y * width + x) * 4;
        if (data[idx + 3] < 128) continue; 
        const rIdx = idx + 4;
        const diff = Math.abs(data[idx] - data[rIdx]) + Math.abs(data[idx+1] - data[rIdx+1]) + Math.abs(data[idx+2] - data[rIdx+2]);
        localVarianceSum += diff;
        samplePoints++;
      }
    }
    const avgVariance = localVarianceSum / (samplePoints || 1);
    const imageType: 'logo' | 'photo' = avgVariance > 40 ? 'photo' : 'logo';

    // Lokale Beschreibung generieren
    const dominantColor = palette[0] || 'Unbekannt';
    const localDescription = `${imageType === 'logo' ? 'Grafik-Logo' : 'Foto-ähnliche Struktur'} mit ${colorCount} Farben. Dominanter Ton: ${dominantColor}.`;

    const capabilities: CapabilityReport[] = [
      {
        title: "Druck-Stabilität",
        description: "5mm Extrusion mit verstärkten vertikalen Wänden (Straight-Line-Technik).",
        status: 'optimal'
      },
      {
        title: "Geometrie-Check",
        description: imageType === 'logo' ? "Klare Kanten für saubere Schichtübergänge." : "Warnung: Hohe Komplexität durch Farbverläufe.",
        status: imageType === 'logo' ? 'optimal' : 'warning'
      }
    ];

    const isPrintable = colorCount > 0;
    const estimatedPrice = 14.99 + (Math.max(0, colorCount - 1) * 2.50);

    resolve({
      isPrintable,
      imageType,
      confidenceScore: 90,
      reasoning: "Lokale Bildanalyse abgeschlossen.",
      suggestedColors: palette.slice(0, 4),
      complexityRating: colorCount,
      estimatedPrice: Number(estimatedPrice.toFixed(2)),
      recommendedScale: 30,
      localDescription,
      capabilities
    });
  });
};

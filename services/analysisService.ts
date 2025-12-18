
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
    
    // 1. Strenge Klassifizierung (Foto vs. Logo)
    let localVarianceSum = 0;
    let samplePoints = 0;
    const step = 8; 

    for (let y = step; y < height - step; y += step) {
      for (let x = step; x < width - step; x += step) {
        const idx = (y * width + x) * 4;
        if (data[idx + 3] < 128) continue; 

        const rIdx = idx + 4;
        const diff = Math.abs(data[idx] - data[rIdx]) + 
                     Math.abs(data[idx+1] - data[rIdx+1]) + 
                     Math.abs(data[idx+2] - data[rIdx+2]);
        
        localVarianceSum += diff;
        samplePoints++;
      }
    }

    const avgVariance = localVarianceSum / (samplePoints || 1);
    // Erhöhte Sensitivität: Ab einem Wert von 40 stufen wir es als Foto ein.
    const imageType: 'logo' | 'photo' = avgVariance > 40 ? 'photo' : 'logo';

    // 2. Nozzle Simulation (0.4mm)
    const nozzleThresholdPx = Math.max(2, Math.floor(width / 100)); 
    let thinFeaturesFound = 0;

    for (let y = 1; y < height - 1; y += 12) { 
      for (let x = 1; x < width - 1; x += 12) {
        const idx = (y * width + x) * 4;
        if (data[idx + 3] > 0) {
          let neighbors = 0;
          for (let dy = -nozzleThresholdPx; dy <= nozzleThresholdPx; dy += 2) {
            for (let dx = -nozzleThresholdPx; dx <= nozzleThresholdPx; dx += 2) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4;
              if (data[nIdx + 3] > 0) neighbors++;
            }
          }
          if (neighbors < (nozzleThresholdPx * nozzleThresholdPx * 0.5)) {
            thinFeaturesFound++;
          }
        }
      }
    }

    // 3. Status Berichte
    const capabilities: CapabilityReport[] = [
      {
        title: "Logo-Validierung",
        description: imageType === 'photo' 
          ? "FOTO ERKANNT. Der Druckprozess ist für Fotos gesperrt." 
          : "Logo-Geometrie erkannt. Optimal für 3D-Extrusion.",
        status: imageType === 'photo' ? 'critical' : 'optimal'
      },
      {
        title: "Struktur-Check",
        description: thinFeaturesFound < 80 
          ? "Alle Details sind groß genug für die 0.4mm Düse." 
          : "Einige Details sind sehr fein. Skalierung empfohlen.",
        status: thinFeaturesFound < 80 ? 'optimal' : 'warning'
      }
    ];

    // WICHTIG: Wenn es ein Foto ist, ist es NICHT druckbar (isPrintable = false)
    const isPrintable = imageType === 'logo' && colorCount > 0;
    
    const basePrice = 14.99;
    const colorSurcharge = Math.max(0, colorCount - 1) * 2.50;
    const estimatedPrice = basePrice + colorSurcharge;

    resolve({
      isPrintable,
      imageType,
      confidenceScore: imageType === 'photo' ? 100 : 98,
      reasoning: imageType === 'photo' 
        ? "Fehler: Fotos können nicht sauber in 3D-Kettenanhänger umgewandelt werden. Bitte nutzen Sie ein Logo." 
        : "Design erfolgreich als Logo verifiziert.",
      suggestedColors: palette,
      complexityRating: imageType === 'photo' ? 10 : Math.min(Math.max(colorCount * 2, 1), 10),
      estimatedPrice: Number(estimatedPrice.toFixed(2)),
      recommendedScale: 35,
      capabilities
    });
  });
};

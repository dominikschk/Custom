
import { AnalysisResult } from '../types';

export const analyzeDesignLocally = async (
  imageData: ImageData, 
  palette: string[]
): Promise<AnalysisResult> => {
  return new Promise((resolve) => {
    const { width, height, data } = imageData;
    const colorCount = palette.length;
    
    // 0.4mm Nozzle Check Simulation
    // Wir nehmen an, der Schlüsselanhänger ist 40mm breit. 
    // width (Pixel) entspricht also 40mm. 1mm = width/40.
    // 0.4mm = (width/40) * 0.4 = width/100.
    const nozzleThresholdPx = Math.max(2, Math.floor(width / 100)); 
    let thinFeaturesFound = 0;

    // Einfacher Scan nach isolierten Pixelgruppen (Details < 0.4mm)
    for (let y = 1; y < height - 1; y += 4) {
      for (let x = 1; x < width - 1; x += 4) {
        const idx = (y * width + x) * 4;
        if (data[idx + 3] > 0) {
          // Check Umgebung
          let neighbors = 0;
          for (let dy = -nozzleThresholdPx; dy <= nozzleThresholdPx; dy++) {
            for (let dx = -nozzleThresholdPx; dx <= nozzleThresholdPx; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4;
              if (data[nIdx + 3] > 0) neighbors++;
            }
          }
          // Wenn ein Pixel fast alleine steht (weniger als 30% der Fläche), ist es ein "Thin Feature"
          if (neighbors < (nozzleThresholdPx * nozzleThresholdPx * 1.2)) {
            thinFeaturesFound++;
          }
        }
      }
    }

    const complexityRating = Math.min(Math.max(colorCount * 2 + (thinFeaturesFound > 20 ? 2 : 0), 1), 10);
    const isPrintable = colorCount > 0 && thinFeaturesFound < 500;
    
    let reasoning = `Analyse abgeschlossen: ${colorCount} Farben erkannt.`;
    if (thinFeaturesFound > 50) {
      reasoning += ` Warnung: Zu feine Details für eine 0.4mm Düse erkannt (${thinFeaturesFound} kritische Stellen).`;
    } else {
      reasoning += " Details sind optimal für den FDM-Druck (0.4mm) geeignet.";
    }

    const basePrice = 14.99;
    const colorSurcharge = Math.max(0, colorCount - 1) * 2.50;
    const estimatedPrice = basePrice + colorSurcharge;

    resolve({
      isPrintable,
      confidenceScore: thinFeaturesFound > 100 ? 60 : 98,
      reasoning,
      suggestedColors: palette,
      complexityRating,
      estimatedPrice: Number(estimatedPrice.toFixed(2)),
      recommendedScale: 36
    });
  });
};

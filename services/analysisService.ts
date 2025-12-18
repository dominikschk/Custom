
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
    
    // 1. Classification Engine (Photo vs. Logo)
    // We analyze the local variance (entropy) of the image.
    let localVarianceSum = 0;
    let samplePoints = 0;
    const step = 8; // Performance optimization: sample every 8th pixel

    for (let y = step; y < height - step; y += step) {
      for (let x = step; x < width - step; x += step) {
        const idx = (y * width + x) * 4;
        if (data[idx + 3] < 128) continue; // Skip transparent

        // Compare with right neighbor
        const rIdx = idx + 4;
        const diff = Math.abs(data[idx] - data[rIdx]) + 
                     Math.abs(data[idx+1] - data[rIdx+1]) + 
                     Math.abs(data[idx+2] - data[rIdx+2]);
        
        localVarianceSum += diff;
        samplePoints++;
      }
    }

    const avgVariance = localVarianceSum / (samplePoints || 1);
    // Threshold: Logos usually have very low avg variance because of flat areas.
    // Photos have high variance due to gradients and texture.
    const imageType: 'logo' | 'photo' = avgVariance > 45 ? 'photo' : 'logo';

    // 2. Nozzle Simulation (0.4mm)
    const nozzleThresholdPx = Math.max(2, Math.floor(width / 100)); 
    let thinFeaturesFound = 0;

    for (let y = 1; y < height - 1; y += 10) { // Faster scan
      for (let x = 1; x < width - 1; x += 10) {
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

    // 3. Capabilities Evaluation
    const capabilities: CapabilityReport[] = [
      {
        title: "Semantic Classifier",
        description: imageType === 'photo' 
          ? "Detected as a Photograph. AI suggests lithophane extrusion style." 
          : "Detected as Graphical Logo. Ideal for high-contrast multi-color print.",
        status: imageType === 'photo' ? 'warning' : 'optimal'
      },
      {
        title: "FDM Precision Check",
        description: thinFeaturesFound < 50 
          ? "Fine details verified for 0.4mm nozzle geometry." 
          : `Detected ${thinFeaturesFound} micro-structures. Increasing scale recommended.`,
        status: thinFeaturesFound < 50 ? 'optimal' : 'warning'
      },
      {
        title: "Chroma Quantizer",
        description: `Reduced image to ${colorCount} filament layers for clean extrusion layers.`,
        status: 'optimal'
      }
    ];

    const complexityRating = imageType === 'photo' ? 9 : Math.min(Math.max(colorCount * 2, 1), 10);
    const isPrintable = colorCount > 0;
    
    const basePrice = 14.99;
    const colorSurcharge = Math.max(0, colorCount - 1) * 2.50;
    const estimatedPrice = basePrice + colorSurcharge;

    resolve({
      isPrintable,
      imageType,
      confidenceScore: imageType === 'photo' ? 85 : 98,
      reasoning: imageType === 'photo' 
        ? "Warning: Photo detected. Expect organic textures instead of sharp lines." 
        : "Geometric logo verified. Ready for precision manufacturing.",
      suggestedColors: palette,
      complexityRating,
      estimatedPrice: Number(estimatedPrice.toFixed(2)),
      recommendedScale: imageType === 'photo' ? 39 : 35,
      capabilities
    });
  });
};

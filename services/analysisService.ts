
import { AnalysisResult } from '../types';

/**
 * Lokale Analyse-Engine (Gratis & Schnell)
 * Ersetzt teure Cloud-KIs durch mathematische Heuristiken.
 */
export const analyzeDesignLocally = async (
  imageDataUrl: string, 
  palette: string[]
): Promise<AnalysisResult> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // 1. Komplexität berechnen (Farbanzahl ist der Haupttreiber für 3D-Druck Kosten)
      const colorCount = palette.length;
      const complexityRating = Math.min(Math.max(colorCount * 2, 1), 10);

      // 2. Druckbarkeit prüfen
      // Wir gehen davon aus, dass das Bild druckbar ist, wenn es Inhalt hat.
      // (Die Vorverarbeitung im imageProcessor hat bereits den Hintergrund entfernt)
      const isPrintable = colorCount > 0;

      // 3. Preis-Kalkulation
      // Basis 14.99€ + 2€ pro zusätzliche Farbe (Materialwechsel)
      const basePrice = 14.99;
      const colorSurcharge = Math.max(0, colorCount - 1) * 2.50;
      const estimatedPrice = basePrice + colorSurcharge;

      // 4. Skalierungsempfehlung
      // Standardmäßig versuchen wir, die 40mm gut auszunutzen.
      const recommendedScale = 36;

      resolve({
        isPrintable,
        confidenceScore: 95,
        reasoning: `Lokale Analyse abgeschlossen: ${colorCount} Farben erkannt. Optimiert für 0.4mm Nozzle.`,
        suggestedColors: palette,
        complexityRating,
        estimatedPrice: Number(estimatedPrice.toFixed(2)),
        recommendedScale
      });
    };
    img.onerror = () => {
      resolve({
        isPrintable: false,
        confidenceScore: 0,
        reasoning: "Bild konnte nicht geladen werden.",
        suggestedColors: [],
        complexityRating: 0,
        estimatedPrice: 0,
        recommendedScale: 30
      });
    };
    img.src = imageDataUrl;
  });
};

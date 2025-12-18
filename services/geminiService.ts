
import { GoogleGenAI } from "@google/genai";

export interface AIContentReport {
  classification: 'logo' | 'photo' | 'graphic';
  description: string;
  printingAdvice: string;
}

export const analyzeImageSemantically = async (base64Image: string): Promise<AIContentReport> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Base64 String säubern (Header entfernen)
  const base64Data = base64Image.split(',')[1] || base64Image;

  const prompt = `Analyze this image for a 3D printing service. 
  1. Is it a logo, a photograph, or a general graphic?
  2. What exactly is depicted in this image? (Subject, style)
  3. Give a short advice for FDM 3D printing (0.4mm nozzle).
  
  Return the result in clear sections.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: 'image/png', data: base64Data } }
        ]
      }
    });

    const text = response.text || "";
    
    const classification: 'logo' | 'photo' | 'graphic' = 
      text.toLowerCase().includes('photo') ? 'photo' : 
      (text.toLowerCase().includes('logo') ? 'logo' : 'graphic');

    // Wir extrahieren die Beschreibung grob aus dem Text
    const description = text.split('\n')[1] || "Bildinhalt erkannt.";
    const advice = text.includes('advice') ? text.split('advice')[1] : "Standard FDM Parameter empfohlen.";

    return {
      classification,
      description: text.substring(0, 200) + "...",
      printingAdvice: advice.trim().substring(0, 150)
    };
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    return {
      classification: 'graphic',
      description: "Inhalt konnte nicht eindeutig identifiziert werden.",
      printingAdvice: "Bitte auf hohen Kontrast achten."
    };
  }
};

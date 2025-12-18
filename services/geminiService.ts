
import { GoogleGenAI } from "@google/genai";

export interface AIContentReport {
  classification: 'logo' | 'photo' | 'graphic';
  description: string;
  printingAdvice: string;
}

export const analyzeImageSemantically = async (base64Image: string): Promise<AIContentReport> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = base64Image.split(',')[1] || base64Image;

  const prompt = `CRITICAL TASK: Classification for 3D Printing.
  This service ONLY accepts logos and flat vector-style graphics. 
  It STRICTLY REJECTS photographs, realistic portraits, or complex scenery.
  
  Identify:
  1. CLASSIFICATION: Is this a 'photo' or a 'logo/graphic'?
  2. DETAIL CHECK: Are there elements smaller than 0.4mm (hair, fine textures)?
  3. DESCRIPTION: Short sentence about the content.
  
  If it's a photo, clearly state 'PHOTO DETECTED' in your classification.`;

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
    const lowerText = text.toLowerCase();
    
    let classification: 'logo' | 'photo' | 'graphic' = 'graphic';
    if (lowerText.includes('photo') || lowerText.includes('photograph') || lowerText.includes('realistic')) {
      classification = 'photo';
    } else if (lowerText.includes('logo')) {
      classification = 'logo';
    }

    return {
      classification,
      description: text.substring(0, 150),
      printingAdvice: classification === 'photo' ? "ABGELEHNT: Fotos können nicht gedruckt werden." : "Optimal für 3D-Extrusion."
    };
  } catch (error) {
    return {
      classification: 'graphic',
      description: "Analyse-Fehler.",
      printingAdvice: "Bitte laden Sie ein klares Logo hoch."
    };
  }
};

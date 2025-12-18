
import { supabase } from '../lib/supabase';
import { LogoConfig, AnalysisResult } from '../types';

export interface SavedDesign {
  id: string;
  created_at: string;
  config: LogoConfig;
  analysis: AnalysisResult;
  image_url: string;
  status: string;
}

const base64ToBlob = async (url: string) => {
  const res = await fetch(url);
  return await res.blob();
};

export const saveDesignToDatabase = async (
  config: LogoConfig, 
  analysis: AnalysisResult
): Promise<string> => {
  const designId = 'PF-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  
  if (!supabase) {
    console.warn("Supabase nicht konfiguriert. Design wird lokal verarbeitet.");
    return designId;
  }
  
  try {
    let publicImageUrl = "";

    if (config.url) {
      const blob = await base64ToBlob(config.url);
      const fileName = `${designId}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('designs')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: true
        });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('designs')
          .getPublicUrl(fileName);
        publicImageUrl = urlData.publicUrl;
      }
    }

    await supabase
      .from('designs')
      .insert([{ 
        id: designId, 
        config: config, 
        analysis: analysis,
        image_url: publicImageUrl,
        status: 'pending_payment'
      }]);

    return designId;
  } catch (error) {
    console.error("Database Error:", error);
    return designId;
  }
};

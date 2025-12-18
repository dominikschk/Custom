
export interface ProcessedLogoResult {
  url: string;
  palette: string[];
  imageData: ImageData;
}

export const processLogo = (imageUrl: string): Promise<ProcessedLogoResult> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const targetDim = 1024;
      canvas.width = targetDim;
      canvas.height = targetDim;
      
      const scale = Math.min(targetDim / img.width, targetDim / img.height) * 0.85;
      const x = (targetDim - img.width * scale) / 2;
      const y = (targetDim - img.height * scale) / 2;
      
      ctx.imageSmoothingEnabled = false; 
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Strikte Hintergrund-Entfernung & Kanten-Schärfung
      const bgR = data[0], bgG = data[1], bgB = data[2];
      const paletteSet = new Set<string>();

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        const dist = Math.sqrt(Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2));
        
        if (dist < 45 || a < 110) {
            data[i + 3] = 0;
        } else {
            // Kontrast-Maximierung für 3D-Extrusion
            data[i] = r > 127 ? 255 : Math.max(0, r - 30);
            data[i+1] = g > 127 ? 255 : Math.max(0, g - 30);
            data[i+2] = b > 127 ? 255 : Math.max(0, b - 30);
            data[i+3] = 255;

            const hex = `#${data[i].toString(16).padStart(2,'0')}${data[i+1].toString(16).padStart(2,'0')}${data[i+2].toString(16).padStart(2,'0')}`;
            if (paletteSet.size < 4) paletteSet.add(hex);
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve({ 
        url: canvas.toDataURL('image/png'), 
        palette: Array.from(paletteSet),
        imageData: ctx.getImageData(0, 0, targetDim, targetDim)
      });
    };
    img.src = imageUrl;
  });
};

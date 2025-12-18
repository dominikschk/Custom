
export interface ProcessedLogoResult {
  url: string;
  palette: string[];
}

export const processLogo = (imageUrl: string): Promise<ProcessedLogoResult> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve({url: imageUrl, palette: []}); return; }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      const bgR = data[0], bgG = data[1], bgB = data[2], bgA = data[3];
      const hasAlpha = bgA === 0;
      
      const colorAccumulator: Record<string, { r: number, g: number, b: number, count: number }> = {};
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
      let hasContent = false;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        let isBackground = false;

        if (!hasAlpha) {
            const dist = Math.sqrt(Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2));
            if (dist < 45) isBackground = true;
        } else {
            if (a < 20) isBackground = true;
        }

        if (isBackground) {
            data[i + 3] = 0;
        } else {
            hasContent = true;
            const x = (i / 4) % canvas.width;
            const y = Math.floor((i / 4) / canvas.width);
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;

            const bucketSize = 32;
            const keyR = Math.round(r / bucketSize) * bucketSize;
            const keyG = Math.round(g / bucketSize) * bucketSize;
            const keyB = Math.round(b / bucketSize) * bucketSize;
            const key = `${keyR},${keyG},${keyB}`;

            if (!colorAccumulator[key]) colorAccumulator[key] = { r: 0, g: 0, b: 0, count: 0 };
            colorAccumulator[key].r += r; colorAccumulator[key].g += g; colorAccumulator[key].b += b;
            colorAccumulator[key].count++;
        }
      }
      
      if (!hasContent) { resolve({url: imageUrl, palette: []}); return; }

      const sortedBuckets = Object.values(colorAccumulator).sort((a, b) => b.count - a.count);
      const palette: string[] = [];
      const rgbPalette: {r: number, g: number, b: number}[] = [];
      
      for (const b of sortedBuckets) {
          if (rgbPalette.length >= 4) break;
          const r = Math.round(b.r / b.count), g = Math.round(b.g / b.count), bl = Math.round(b.b / b.count);
          
          let isDistinct = true;
          for (const p of rgbPalette) {
              if (Math.sqrt(Math.pow(r-p.r, 2) + Math.pow(g-p.g, 2) + Math.pow(bl-p.b, 2)) < 50) {
                  isDistinct = false; break;
              }
          }
          if (isDistinct) {
              rgbPalette.push({r, g, b: bl});
              palette.push(`#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bl.toString(16).padStart(2,'0')}`);
          }
      }

      // Quantisierung anwenden
      for (let i = 0; i < data.length; i += 4) {
          if (data[i+3] === 0) continue;
          let minDist = Infinity; let best = rgbPalette[0];
          for (const p of rgbPalette) {
              const d = Math.sqrt(Math.pow(data[i]-p.r, 2) + Math.pow(data[i+1]-p.g, 2) + Math.pow(data[i+2]-p.b, 2));
              if (d < minDist) { minDist = d; best = p; }
          }
          data[i] = best.r; data[i+1] = best.g; data[i+2] = best.b;
      }

      ctx.putImageData(imageData, 0, 0);
      const contentWidth = maxX - minX + 1;
      const contentHeight = maxY - minY + 1;
      const size = Math.max(contentWidth, contentHeight) * 1.1;
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = size; finalCanvas.height = size;
      const finalCtx = finalCanvas.getContext('2d');
      if (!finalCtx) { resolve({url: imageUrl, palette}); return; }

      finalCtx.drawImage(canvas, minX, minY, contentWidth, contentHeight, (size-contentWidth)/2, (size-contentHeight)/2, contentWidth, contentHeight);
      resolve({ url: finalCanvas.toDataURL('image/png'), palette });
    };
    img.onerror = () => resolve({url: imageUrl, palette: []});
    img.src = imageUrl;
  });
};

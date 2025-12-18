
import React, { useState, useRef, useEffect } from 'react';
import { Viewer3D, Viewer3DHandle } from './components/Keychain3D';
import { analyzeDesignLocally, CapabilityReport } from './services/analysisService';
import { processLogo } from './utils/imageProcessor';
import { saveDesignToDatabase } from './services/storageService';
import { LogoConfig, AnalysisResult } from './types';
import { 
  Upload, 
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Move,
  Type,
  Maximize2,
  RotateCw,
  Eye,
  ShoppingCart,
  ChevronRight,
  Box,
  Palette
} from 'lucide-react';

const SHOPIFY_DOMAIN = "NUDIM3D.de"; 
const PRODUCT_PATH = "fff";
const PRODUCT_VARIANT_ID = "5656543382631"; 

const App: React.FC = () => {
  const [logoConfig, setLogoConfig] = useState<LogoConfig>({
    url: null, x: 0, y: 0, scale: 30, rotation: 0, text: "", textX: 0, textY: -18, textScale: 5
  });
  
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [analysis, setAnalysis] = useState<(AnalysisResult & { capabilities?: CapabilityReport[] }) | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const viewerRef = useRef<Viewer3DHandle>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setFileError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const { url, palette, imageData } = await processLogo(event.target?.result as string);
        const localResult = await analyzeDesignLocally(imageData, palette);
        
        setLogoConfig(prev => ({ ...prev, url, customPalette: palette.slice(0, 4) }));
        setAnalysis(localResult);
        setActiveStep(2);
      } catch (err) {
        setFileError("Bildverarbeitung fehlgeschlagen.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleShopifyCheckout = async () => {
      setCheckoutLoading(true);
      try {
          const designId = await saveDesignToDatabase(logoConfig, analysis!);
          const baseUrl = `https://${SHOPIFY_DOMAIN}/products/${PRODUCT_PATH}`;
          const params = new URLSearchParams();
          params.append('variant', PRODUCT_VARIANT_ID);
          params.append('attributes[Design ID]', designId);
          params.append('attributes[Beschreibung]', analysis?.localDescription || 'Individuelles Design');
          window.location.href = `${baseUrl}?${params.toString()}`;
      } catch (err) {
          alert("Fehler beim Warenkorb-Redirect.");
          setCheckoutLoading(false);
      }
  };

  const ControlGroup = ({ label, children }: { label: string, children: React.ReactNode }) => (
    <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">{label}</label>
        <div className="grid grid-cols-1 gap-4">{children}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-nudim-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-nudim-900 rounded-lg flex items-center justify-center text-white"><Box size={22}/></div>
            <h1 className="font-bold text-lg tracking-tight">NUDIM3D <span className="text-slate-400 font-medium">Configurator</span></h1>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase border border-green-100">
            <CheckCircle2 size={12}/> System Aktiv
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: 3D Preview */}
        <div className="lg:col-span-7 h-[500px] lg:h-[650px] relative group">
          <Viewer3D ref={viewerRef} logoConfig={logoConfig} />
          
          {/* View Presets */}
          <div className="absolute bottom-6 right-6 flex gap-2">
            {[
              { icon: <Maximize2 size={14}/>, view: 'top', label: 'Oben' },
              { icon: <Eye size={14}/>, view: 'front', label: 'Front' },
              { icon: <RotateCw size={14}/>, view: 'side', label: 'Seite' }
            ].map(b => (
              <button 
                key={b.view}
                onClick={() => viewerRef.current?.setCameraView(b.view as any)}
                className="bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-shop border border-slate-200 hover:bg-nudim-900 hover:text-white transition-all flex items-center gap-2 text-[10px] font-bold uppercase"
              >
                {b.icon} {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Controls */}
        <div className="lg:col-span-5 space-y-6">
          {activeStep === 1 ? (
            <div className="bg-white p-10 rounded-3xl shadow-shop border border-slate-200 text-center space-y-6">
              <div className="w-20 h-20 bg-nudim-50 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                {isProcessing ? <Loader2 className="animate-spin" size={32}/> : <Upload size={32}/>}
              </div>
              <h2 className="text-xl font-bold">Logo hochladen</h2>
              <p className="text-slate-400 text-sm">Ziehen Sie Ihr Logo hierher oder klicken Sie zum Auswählen. Wir empfehlen quadratische Formate.</p>
              <div className="relative pt-4">
                <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                <button className="w-full py-4 bg-nudim-900 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                   Datei auswählen <ChevronRight size={18}/>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl shadow-shop border border-slate-200 space-y-8 max-h-[700px] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h2 className="font-bold text-lg">Konfiguration</h2>
                <button onClick={() => setActiveStep(1)} className="text-[10px] font-bold text-slate-400 hover:text-nudim-900 uppercase">Logo ändern</button>
              </div>

              {/* Positionierung */}
              <ControlGroup label="Logo & Skalierung">
                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl">
                    <div className="flex justify-between text-[11px] font-bold"><span>Größe</span><span>{logoConfig.scale}mm</span></div>
                    <input type="range" min="10" max="40" value={logoConfig.scale} onChange={e => setLogoConfig({...logoConfig, scale: +e.target.value})} className="custom-range w-full" />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Position X</span>
                            <input type="range" min="-20" max="20" value={logoConfig.x} onChange={e => setLogoConfig({...logoConfig, x: +e.target.value})} className="custom-range w-full" />
                        </div>
                        <div className="space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Position Y</span>
                            <input type="range" min="-20" max="20" value={logoConfig.y} onChange={e => setLogoConfig({...logoConfig, y: +e.target.value})} className="custom-range w-full" />
                        </div>
                    </div>
                </div>
              </ControlGroup>

              {/* Text Tool */}
              <ControlGroup label="Text Hinzufügen (Optional)">
                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl">
                    <input 
                      type="text" 
                      placeholder="Dein Text..." 
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-nudim-900 outline-none"
                      value={logoConfig.text}
                      onChange={e => setLogoConfig({...logoConfig, text: e.target.value})}
                    />
                    {logoConfig.text && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Text Y-Pos</span>
                                <input type="range" min="-22" max="22" value={logoConfig.textY} onChange={e => setLogoConfig({...logoConfig, textY: +e.target.value})} className="custom-range w-full" />
                            </div>
                            <div className="space-y-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Text Größe</span>
                                <input type="range" min="2" max="10" value={logoConfig.textScale} onChange={e => setLogoConfig({...logoConfig, textScale: +e.target.value})} className="custom-range w-full" />
                            </div>
                        </div>
                    )}
                </div>
              </ControlGroup>

              {/* Material/Farben */}
              <ControlGroup label="Material Schichten (Manuell)">
                <div className="flex gap-3">
                    {logoConfig.customPalette?.map((color, i) => (
                        <div key={i} className="relative group">
                            <input 
                              type="color" 
                              value={color} 
                              onChange={e => {
                                  const newP = [...(logoConfig.customPalette || [])];
                                  newP[i] = e.target.value;
                                  setLogoConfig({...logoConfig, customPalette: newP});
                              }}
                              className="w-12 h-12 rounded-xl border-2 border-white shadow-sm cursor-pointer overflow-hidden p-0"
                            />
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-nudim-900 text-white text-[8px] rounded-full flex items-center justify-center font-bold">{i+1}</div>
                        </div>
                    ))}
                </div>
              </ControlGroup>

              {/* Preis & Checkout */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gesamtbetrag</p>
                        <p className="text-2xl font-bold">€{analysis?.estimatedPrice.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded">5mm Precision Line</p>
                    </div>
                </div>
                <button 
                  onClick={handleShopifyCheckout}
                  disabled={checkoutLoading}
                  className="w-full py-5 bg-nudim-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98]"
                >
                  {checkoutLoading ? <Loader2 className="animate-spin"/> : <><ShoppingCart size={20}/> In den Warenkorb</>}
                </button>
              </div>
            </div>
          )}

          {/* Local Analysis Info */}
          {analysis && (
              <div className="p-6 bg-nudim-900 text-white rounded-3xl space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-nudim-gold uppercase tracking-widest">
                    <Box size={14}/> Handwerks-Check
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed italic">"{analysis.localDescription}"</p>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-[10px] text-slate-400 uppercase">Nozzle: 0.4mm</div>
                      <div className="text-[10px] text-slate-400 uppercase">Height: 5.0mm</div>
                  </div>
              </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;

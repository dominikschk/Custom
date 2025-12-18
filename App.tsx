
import React, { useState, useRef } from 'react';
import { Viewer3D, Viewer3DHandle } from './components/Keychain3D';
import { analyzeDesignLocally, CapabilityReport } from './services/analysisService';
import { processLogo } from './utils/imageProcessor';
import { saveDesignToDatabase } from './services/storageService';
import { LogoConfig, AnalysisResult } from './types';
import { 
  Upload, 
  Loader2,
  CheckCircle2,
  Maximize2,
  RotateCw,
  Eye,
  ShoppingCart,
  ChevronRight,
  Box,
  Palette,
  Type,
  Move,
  Settings2,
  Download,
  Trash2,
  Monitor,
  Zap
} from 'lucide-react';

const SHOPIFY_DOMAIN = "NUDIM3D.de"; 
const PRODUCT_PATH = "fff";
const PRODUCT_VARIANT_ID = "5656543382631"; 

const MATERIAL_PRESETS = [
  { name: "Galaxy Black", colors: ["#FFFFFF", "#0A0A0A", "#1A1A1A", "#222222"] },
  { name: "Silk Gold", colors: ["#5D4037", "#D4AF37", "#FFD700", "#B8860B"] },
  { name: "Signal Red", colors: ["#FFFFFF", "#CC0000", "#FF4444", "#880000"] },
  { name: "Translucent Ice", colors: ["#E0F7FA", "#B2EBF2", "#80DEEA", "#4DD0E1"] }
];

const App: React.FC = () => {
  const [logoConfig, setLogoConfig] = useState<LogoConfig>({
    url: null, x: 0, y: 0, scale: 30, rotation: 0, text: "", textX: 0, textY: -18, textScale: 5, customPalette: ["#FFFFFF", "#111111", "#333333", "#555555"], shape: 'square'
  });
  
  const [activeStep, setActiveStep] = useState<1 | 2>(1);
  const [analysis, setAnalysis] = useState<(AnalysisResult & { capabilities?: CapabilityReport[] }) | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const viewerRef = useRef<Viewer3DHandle>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const { url, palette, imageData } = await processLogo(event.target?.result as string);
        const localResult = await analyzeDesignLocally(imageData, palette);
        
        setLogoConfig(prev => ({ 
          ...prev, 
          url, 
          customPalette: palette.length > 0 ? palette.slice(0, 4) : prev.customPalette
        }));
        setAnalysis(localResult);
        setActiveStep(2);
      } catch (err) {
        alert("Bild konnte nicht verarbeitet werden.");
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
          const checkoutUrl = `https://${SHOPIFY_DOMAIN}/products/${PRODUCT_PATH}?variant=${PRODUCT_VARIANT_ID}&attributes[Design_ID]=${designId}&attributes[Material]=${encodeURIComponent(logoConfig.customPalette?.[1] || '')}`;
          window.location.href = checkoutUrl;
      } catch (err) {
          setCheckoutLoading(false);
      }
  };

  const ControlItem = ({ label, value, min, max, onChange, unit = "" }: any) => (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
        <span>{label}</span>
        <span className="text-nudim-900">{value}{unit}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value} 
        step={0.1}
        onChange={e => onChange(parseFloat(e.target.value))} 
        className="custom-range w-full" 
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-nudim-900">
      <header className="border-b border-slate-100 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-nudim-900 rounded-xl flex items-center justify-center text-white shadow-lg"><Box size={22}/></div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tighter leading-none">NUDIM3D</h1>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Premium Customizer</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase border border-green-100">
              <Zap size={10}/> 5mm Pro Line
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-6">
          <div className="h-[500px] lg:h-[650px] relative group">
            {logoConfig.url ? (
              <Viewer3D ref={viewerRef} logoConfig={logoConfig} />
            ) : (
              <div className="w-full h-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-center p-10 space-y-6">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center text-slate-300">
                   {isProcessing ? <Loader2 className="animate-spin" size={32}/> : <Upload size={32}/>}
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black">Logo konfigurieren</h2>
                  <p className="text-slate-400 text-sm max-w-xs mx-auto">Starten Sie jetzt Ihre 3D-Vorschau durch einen einfachen Upload.</p>
                </div>
                <div className="relative">
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  <button className="px-8 py-4 bg-nudim-900 text-white rounded-2xl font-bold flex items-center gap-3 shadow-2xl hover:bg-slate-800 transition-all">
                    Datei wählen <ChevronRight size={18}/>
                  </button>
                </div>
              </div>
            )}

            {logoConfig.url && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 bg-white/80 backdrop-blur-xl p-1.5 rounded-full border border-white/50 shadow-2xl">
                {[
                  { icon: <Maximize2 size={14}/>, view: 'top', label: 'Plan' },
                  { icon: <Eye size={14}/>, view: 'front', label: 'Front' },
                  { icon: <RotateCw size={14}/>, view: 'side', label: 'Side' },
                  { icon: <Monitor size={14}/>, view: 'back', label: 'Back' }
                ].map(b => (
                  <button 
                    key={b.view}
                    onClick={() => viewerRef.current?.setCameraView(b.view as any)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-nudim-900 hover:text-white transition-all whitespace-nowrap"
                  >
                    {b.icon} {b.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-8">
          {activeStep === 2 && (
            <div className="bg-white p-8 rounded-[2.5rem] shadow-shop border border-slate-50 space-y-10 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black tracking-tight">Konfiguration</h2>
                <button onClick={() => setActiveStep(1)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
              </div>

              <div className="space-y-8">
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <Palette size={14}/> Material-Presets
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {MATERIAL_PRESETS.map(p => (
                      <button 
                        key={p.name}
                        onClick={() => setLogoConfig({...logoConfig, customPalette: p.colors})}
                        className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-left hover:bg-white hover:border-nudim-900 transition-all group"
                      >
                        <div className="flex gap-1 mb-2">
                          {p.colors.map((c, i) => <div key={i} className="w-3 h-3 rounded-full border border-white" style={{backgroundColor: c}} />)}
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-tighter">{p.name}</p>
                      </button>
                    ))}
                  </div>
                </section>

                <section className="space-y-5 bg-slate-50 p-6 rounded-[2rem]">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    <Move size={14}/> Geometrie
                  </div>
                  <ControlItem label="Größe" value={logoConfig.scale} min={15} max={45} unit="mm" onChange={(v:any) => setLogoConfig({...logoConfig, scale: v})} />
                  <div className="grid grid-cols-2 gap-4">
                    <ControlItem label="Pos X" value={logoConfig.x} min={-20} max={20} onChange={(v:any) => setLogoConfig({...logoConfig, x: v})} />
                    <ControlItem label="Pos Y" value={logoConfig.y} min={-20} max={20} onChange={(v:any) => setLogoConfig({...logoConfig, y: v})} />
                  </div>
                  <ControlItem label="Rotation" value={logoConfig.rotation} min={0} max={360} unit="°" onChange={(v:any) => setLogoConfig({...logoConfig, rotation: v})} />
                </section>

                <section className="space-y-5 bg-slate-50 p-6 rounded-[2rem]">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    <Type size={14}/> Schrift-Overlay
                  </div>
                  <input 
                    type="text" 
                    placeholder="Wunschtext..." 
                    className="w-full px-5 py-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-nudim-900 outline-none font-bold"
                    value={logoConfig.text}
                    onChange={e => setLogoConfig({...logoConfig, text: e.target.value})}
                  />
                  {logoConfig.text && (
                    <div className="space-y-4 pt-2">
                       <div className="flex gap-2">
                          <button 
                            onClick={() => setLogoConfig({...logoConfig, shape: 'square'})}
                            className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg border ${logoConfig.shape === 'square' ? 'bg-nudim-900 text-white' : 'bg-white'}`}
                          >Sans</button>
                          <button 
                            onClick={() => setLogoConfig({...logoConfig, shape: 'rounded'})}
                            className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg border ${logoConfig.shape === 'rounded' ? 'bg-nudim-900 text-white' : 'bg-white'}`}
                          >Serif</button>
                       </div>
                       <ControlItem label="Text Position" value={logoConfig.textY} min={-25} max={25} onChange={(v:any) => setLogoConfig({...logoConfig, textY: v})} />
                       <ControlItem label="Text Skalierung" value={logoConfig.textScale} min={2} max={10} onChange={(v:any) => setLogoConfig({...logoConfig, textScale: v})} />
                    </div>
                  )}
                </section>
              </div>

              <div className="pt-8 border-t border-slate-100 space-y-6">
                 <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Inkl. 19% MwSt.</p>
                      <p className="text-3xl font-black tracking-tighter">€{analysis?.estimatedPrice.toFixed(2)}</p>
                    </div>
                    <button 
                      onClick={() => viewerRef.current?.downloadSTL()}
                      className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl text-slate-400 hover:text-nudim-900 transition-colors"
                    >
                      <Download size={18}/>
                    </button>
                 </div>
                 <button 
                  onClick={handleShopifyCheckout}
                  disabled={checkoutLoading}
                  className="w-full py-6 bg-nudim-900 text-white rounded-2xl font-black flex items-center justify-center gap-4 shadow-2xl hover:scale-[1.02] transition-all active:scale-[0.98] text-lg uppercase tracking-widest"
                 >
                   {checkoutLoading ? <Loader2 className="animate-spin"/> : <><ShoppingCart size={20}/> Warenkorb</>}
                 </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;

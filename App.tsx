
import React, { useState, useRef, useEffect } from 'react';
import { Viewer3D, Viewer3DHandle } from './components/Keychain3D';
import { analyzeDesignLocally } from './services/analysisService';
import { processLogo } from './utils/imageProcessor';
import { saveDesignToDatabase, getAllDesigns, SavedDesign } from './services/storageService';
import { LogoConfig, AnalysisResult } from './types';
import { 
  Upload, 
  ArrowRight,
  Layers,
  Sparkles,
  Loader2,
  Lock,
  Download,
  ShieldCheck,
  Cpu,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_DOMAIN || "your-shop.myshopify.com"; 
const PRODUCT_VARIANT_ID = process.env.PRODUCT_VARIANT_ID || "123456789"; 

const App: React.FC = () => {
  const queryParams = new URLSearchParams(window.location.search);
  const isAdmin = queryParams.get('admin') === 'true';

  const [logoConfig, setLogoConfig] = useState<LogoConfig>({
    url: null, x: 0, y: 0, scale: 30, rotation: 0,
  });
  
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [redirectStatus, setRedirectStatus] = useState<'idle' | 'saving' | 'redirecting'>('idle');
  const [adminDesigns, setAdminDesigns] = useState<SavedDesign[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  const viewerRef = useRef<Viewer3DHandle>(null);

  useEffect(() => {
    if (isAdmin) {
      setLoadingAdmin(true);
      getAllDesigns().then(data => {
        setAdminDesigns(data);
        setLoadingAdmin(false);
      });
    }
  }, [isAdmin]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setFileError("Datei zu groß. Maximal 5MB."); return; }

    setFileError(null);
    setActiveStep(2); 
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawResult = event.target?.result as string;
      try {
        setProcessingStatus("Bild wird optimiert...");
        const { url, palette, imageData } = await processLogo(rawResult);
        
        setLogoConfig({ url, x: 0, y: 0, scale: 30, rotation: 0 });

        setProcessingStatus("Nozzle-Check (0.4mm)...");
        const localResult = await analyzeDesignLocally(imageData, palette);
        setAnalysis(localResult);
        
        if (localResult.isPrintable) {
          setLogoConfig(prev => ({ ...prev, scale: localResult.recommendedScale }));
          setActiveStep(3); 
        } else {
          setFileError("Das Design enthält zu feine Details oder wurde nicht erkannt.");
          setActiveStep(1);
        }
      } catch (err) {
        setFileError("Analyse fehlgeschlagen.");
        setActiveStep(1);
      } finally {
        setProcessingStatus("");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleShopifyCheckout = async () => {
      if (!analysis || !logoConfig) return;
      setRedirectStatus('saving');
      try {
          const designId = await saveDesignToDatabase(logoConfig, analysis);
          setRedirectStatus('redirecting');
          const baseUrl = `https://${SHOPIFY_DOMAIN}/cart/${PRODUCT_VARIANT_ID}:1`;
          const params = new URLSearchParams();
          params.append('attributes[Design ID]', designId);
          params.append('attributes[Farben]', analysis.suggestedColors.length.toString());
          params.append('attributes[Groesse]', `${logoConfig.scale}mm`);
          window.location.href = `${baseUrl}?${params.toString()}`;
      } catch (err) {
          alert("Fehler beim Checkout.");
          setRedirectStatus('idle');
      }
  };

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between mb-8">
            <h1 className="text-2xl font-bold flex items-center gap-2"><Lock /> Admin Panel</h1>
            <a href="/" className="text-blue-600 font-bold">← Zum Shop</a>
          </div>
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            {loadingAdmin ? <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></div> : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-xs uppercase font-bold text-slate-400">
                  <tr>
                    <th className="p-4">Design ID</th>
                    <th className="p-4">Vorschau</th>
                    <th className="p-4">Specs</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {adminDesigns.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono text-xs">{d.id}</td>
                      <td className="p-4"><img src={d.image_url} className="w-12 h-12 object-contain bg-slate-100 rounded border" /></td>
                      <td className="p-4 text-xs">
                        <span className="block">Scale: {d.config.scale}mm</span>
                        <span className="block text-slate-400">{d.analysis.suggestedColors.length} Farben</span>
                      </td>
                      <td className="p-4">
                        <a href={d.image_url} download={`${d.id}.png`} className="inline-flex items-center gap-1 text-blue-600 font-bold text-xs"><Download size={14}/> PNG</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-orange-100/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg"><Layers size={20} /></div>
            <h1 className="font-display font-bold text-xl tracking-tight">PrintForge <span className="text-orange-600">Studio</span></h1>
          </div>
          <div className="flex items-center gap-6">
              <div className="hidden md:flex gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                 <span className={activeStep >= 1 ? 'text-slate-900' : ''}>01 Design</span>
                 <span className={activeStep >= 3 ? 'text-slate-900' : ''}>02 Edit</span>
                 <span className={activeStep === 4 ? 'text-slate-900' : ''}>03 Order</span>
              </div>
              <div className="h-4 w-px bg-slate-200 hidden md:block"></div>
              <div className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
                <ShieldCheck size={14} /> Safe
              </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7">
          {logoConfig.url ? (
            <Viewer3D ref={viewerRef} logoConfig={logoConfig} detectedColors={analysis?.suggestedColors} />
          ) : (
            <div className="w-full h-[450px] rounded-[2rem] bg-white border border-slate-200 shadow-soft flex flex-col items-center justify-center text-slate-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-dot-pattern opacity-10"></div>
                <div className="bg-slate-50 p-6 rounded-full mb-4"><Upload size={40} className="text-slate-200" /></div>
                <p className="font-medium">Lade ein Logo hoch für die 3D-Vorschau</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-8">
          {activeStep <= 2 && (
            <div className="bg-white p-8 rounded-[2rem] shadow-card border border-slate-100 relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-xl font-bold mb-2">Design erstellen</h2>
                <p className="text-slate-400 text-sm mb-6">Wir verwandeln dein Logo in ein echtes 3D-Produkt.</p>
                
                {activeStep === 1 ? (
                  <div className="group relative h-48 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-slate-50 hover:bg-orange-50 hover:border-orange-200 transition-all cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                    <div className="bg-white p-4 rounded-xl shadow-sm group-hover:scale-110 transition-transform"><Upload className="text-slate-400 group-hover:text-orange-500" /></div>
                    <span className="text-sm font-bold mt-4 text-slate-600">Logo hochladen</span>
                    <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Wird automatisch zentriert</span>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="relative inline-block">
                        <Loader2 className="animate-spin text-orange-500 mb-4" size={32} />
                        <Sparkles className="absolute -top-2 -right-2 text-yellow-400 animate-pulse" size={16} />
                    </div>
                    <p className="text-sm font-bold text-slate-900">{processingStatus}</p>
                    <p className="text-xs text-slate-400 mt-1">Berechne Geometrie & Kosten...</p>
                  </div>
                )}
                {fileError && <p className="text-red-500 text-xs mt-4 font-medium flex items-center gap-1">⚠ {fileError}</p>}
              </div>
            </div>
          )}

          {activeStep >= 3 && analysis && (
            <div className="bg-white p-8 rounded-[2rem] shadow-card border border-slate-100 space-y-8 animate-fade-in">
              <div className="flex justify-between items-start">
                <div>
                    <h2 className="font-bold text-xl">Konfiguration</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1">
                            <Cpu size={10} /> 0.4mm Nozzle Guard active
                        </span>
                    </div>
                </div>
                {analysis.confidenceScore < 80 ? (
                    <div className="bg-amber-50 text-amber-600 p-2 rounded-lg" title="Details sind grenzwertig"><AlertTriangle size={20} /></div>
                ) : (
                    <div className="bg-green-50 text-green-700 p-2 rounded-lg"><CheckCircle2 size={20} /></div>
                )}
              </div>

              {activeStep === 3 ? (
                <div className="space-y-6">
                  {/* Farbauswahl / Erkannte Farben */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Erkannte Farblayer (Max 4)</label>
                    <div className="flex gap-2">
                        {analysis.suggestedColors.map((color, idx) => (
                            <div key={idx} className="group relative">
                                <div className="w-10 h-10 rounded-xl border border-slate-200 shadow-sm transition-transform hover:scale-110" style={{backgroundColor: color}}></div>
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[8px] px-1 py-0.5 rounded uppercase">{color}</div>
                            </div>
                        ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Abmessung</label>
                            <span className="text-xs font-bold">{logoConfig.scale} mm</span>
                        </div>
                        <input type="range" min="15" max="39" value={logoConfig.scale} onChange={e => setLogoConfig({...logoConfig, scale: parseInt(e.target.value)})} className="w-full accent-slate-900 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ausrichtung</label>
                            <span className="text-xs font-bold">{Math.round((logoConfig.rotation * 180) / Math.PI)}°</span>
                        </div>
                        <input type="range" min="0" max={Math.PI * 2} step="0.1" value={logoConfig.rotation} onChange={e => setLogoConfig({...logoConfig, rotation: parseFloat(e.target.value)})} className="w-full accent-slate-900 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer" />
                      </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[10px] leading-relaxed text-slate-600 italic">
                        "{analysis.reasoning}"
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-50">
                    <button onClick={() => setActiveStep(4)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all">
                      Zusammenfassung <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-slate-50 p-6 rounded-2xl space-y-3">
                    <div className="flex justify-between text-sm text-slate-500"><span>Premium Schlüsselanhänger</span><span>14,99 €</span></div>
                    <div className="flex justify-between text-sm text-slate-500"><span>Multi-Color Modifikator</span><span>{(analysis.estimatedPrice - 14.99).toFixed(2)} €</span></div>
                    <div className="flex justify-between text-lg font-bold pt-4 border-t border-slate-200 text-slate-900"><span>Gesamt</span><span>{analysis.estimatedPrice.toFixed(2)} €</span></div>
                  </div>
                  
                  <button 
                    onClick={handleShopifyCheckout} 
                    disabled={redirectStatus !== 'idle'} 
                    className="w-full py-5 bg-orange-600 text-white rounded-2xl font-bold shadow-xl shadow-orange-100 flex items-center justify-center gap-3 hover:bg-orange-700 transition-all"
                  >
                    {redirectStatus === 'idle' ? 'In den Warenkorb legen' : <><Loader2 className="animate-spin" size={18} /> Einen Moment...</>}
                  </button>
                  
                  <button onClick={() => setActiveStep(3)} className="w-full text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 transition-colors">← Design bearbeiten</button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-soft">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 mb-3"><Sparkles size={16}/></div>
                  <h3 className="text-xs font-bold mb-1">Farbreduziert</h3>
                  <p className="text-[10px] text-slate-400 leading-relaxed">Maximal 4 Schichten für saubere Übergänge.</p>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-soft">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-3"><ShieldCheck size={16}/></div>
                  <h3 className="text-xs font-bold mb-1">Druck-Check</h3>
                  <p className="text-[10px] text-slate-400 leading-relaxed">Lokale Vision-Prüfung auf 0.4mm Detailgrad.</p>
              </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;

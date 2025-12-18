
import React, { useState, useRef, useEffect } from 'react';
import { Viewer3D, Viewer3DHandle } from './components/Keychain3D';
import { analyzeDesignLocally, CapabilityReport } from './services/analysisService';
import { analyzeImageSemantically, AIContentReport } from './services/geminiService';
import { processLogo } from './utils/imageProcessor';
import { saveDesignToDatabase, getAllDesigns, SavedDesign } from './services/storageService';
import { LogoConfig, AnalysisResult } from './types';
import { 
  Upload, 
  ArrowRight,
  Sparkles,
  Loader2,
  Lock,
  ShieldCheck,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Info,
  Zap,
  MousePointer2,
  XCircle,
  Gem,
  Crown
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
  const [analysis, setAnalysis] = useState<(AnalysisResult & { capabilities?: CapabilityReport[], aiReport?: AIContentReport }) | null>(null);
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
    if (file.size > 5 * 1024 * 1024) { setFileError("Datei zu groß. Max 5MB."); return; }

    setFileError(null);
    setAnalysis(null);
    setActiveStep(2); 
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawResult = event.target?.result as string;
      try {
        setProcessingStatus("Sicherheits-Check...");
        const { url, palette, imageData } = await processLogo(rawResult);
        
        const localResult = await analyzeDesignLocally(imageData, palette);
        
        if (localResult.imageType === 'photo') {
          setFileError("FOTO ERKANNT: Bitte laden Sie eine Grafik oder ein Logo hoch.");
          setAnalysis(localResult);
          setActiveStep(1);
          return;
        }

        setProcessingStatus("KI Inhalts-Prüfung...");
        const aiSemanticReport = await analyzeImageSemantically(rawResult);
        
        if (aiSemanticReport.classification === 'photo') {
          setFileError("KEINE FOTOS: Die KI hat ein Foto erkannt. Nur Logos sind erlaubt.");
          setAnalysis({ ...localResult, aiReport: aiSemanticReport });
          setActiveStep(1);
          return;
        }

        setLogoConfig({ url, x: 0, y: 0, scale: 30, rotation: 0 });
        setAnalysis({ ...localResult, aiReport: aiSemanticReport });
        
        if (localResult.isPrintable) {
          setLogoConfig(prev => ({ ...prev, scale: localResult.recommendedScale }));
          setActiveStep(3); 
        } else {
          setFileError("Nicht druckbar: Details zu komplex.");
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
          window.location.href = `${baseUrl}?${params.toString()}`;
      } catch (err) {
          alert("Checkout Error.");
          setRedirectStatus('idle');
      }
  };

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-onyx-900 p-8 text-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between mb-8 items-center">
            <h1 className="text-3xl font-display font-bold gold-text-gradient flex items-center gap-3"><Crown /> Admin Dashboard</h1>
            <a href="/" className="text-gold-400 font-bold hover:underline">← Zurück zum Store</a>
          </div>
          <div className="bg-onyx-800 rounded-3xl shadow-luxury overflow-hidden border border-white/5">
            {loadingAdmin ? <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-gold-500" /></div> : (
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 border-b border-white/10 uppercase font-bold text-slate-400">
                  <tr>
                    <th className="p-6">Design ID</th>
                    <th className="p-6">Vorschau</th>
                    <th className="p-6">KI Status</th>
                    <th className="p-6">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {adminDesigns.map(d => (
                    <tr key={d.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-6 font-mono text-gold-200">{d.id}</td>
                      <td className="p-6"><img src={d.image_url} className="w-14 h-14 object-contain bg-white/10 rounded-xl border border-white/10" /></td>
                      <td className="p-6 text-xs italic text-slate-400">{(d.analysis as any).aiReport?.description || 'Logo-Grafik'}</td>
                      <td className="p-6">
                        <a href={d.image_url} download={`${d.id}.png`} className="text-gold-500 font-bold hover:text-gold-400 transition-colors">STL / PNG</a>
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
    <div className="min-h-screen text-slate-100 pb-20">
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3 group cursor-default">
            <div className="w-11 h-11 gold-gradient rounded-2xl flex items-center justify-center text-black shadow-gold-glow group-hover:scale-110 transition-transform"><Crown size={22} /></div>
            <h1 className="font-display font-bold text-2xl tracking-tight">PrintForge <span className="gold-text-gradient">Studio</span></h1>
          </div>
          <div className="hidden md:flex items-center gap-4 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
            <div className="w-2 h-2 rounded-full bg-gold-500 animate-pulse"></div>
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-gold-400">Luxury Manufacturing Active</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 space-y-8">
          {logoConfig.url && activeStep >= 3 ? (
            <div className="relative">
                <div className="absolute -inset-1 gold-gradient rounded-[2.2rem] opacity-20 blur-xl"></div>
                <Viewer3D ref={viewerRef} logoConfig={logoConfig} detectedColors={analysis?.suggestedColors} />
            </div>
          ) : (
            <div className={`w-full h-[500px] rounded-[3rem] bg-onyx-800 border-2 border-dashed transition-all duration-700 relative overflow-hidden flex flex-col items-center justify-center ${fileError ? 'border-red-900/50 bg-red-950/10' : 'border-white/10 hover:border-gold-500/50'}`}>
                {/* Animierte Scan-Line */}
                {!fileError && activeStep === 1 && <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gold-500/5 to-transparent w-full h-20 animate-scan-line z-0"></div>}
                
                {fileError ? (
                  <div className="text-center p-12 z-10 animate-fade-in">
                    <div className="bg-red-500/10 p-6 rounded-full mb-6 inline-block border border-red-500/20"><XCircle size={60} className="text-red-500" /></div>
                    <h3 className="text-white font-display text-2xl mb-3">Zutritt verweigert</h3>
                    <p className="text-red-400 text-sm max-w-sm mx-auto font-medium leading-relaxed">{fileError}</p>
                    <button onClick={() => {setFileError(null); setAnalysis(null);}} className="mt-8 px-10 py-3 gold-gradient text-black rounded-full text-xs font-bold hover:brightness-110 transition-all shadow-gold-glow">Neuer Versuch</button>
                  </div>
                ) : (
                  <div className="relative z-10 text-center">
                    <div className="bg-white/5 p-8 rounded-[2.5rem] mb-6 border border-white/5 shadow-inner group-hover:scale-105 transition-transform duration-500"><Upload size={50} className="text-gold-500/50" /></div>
                    <p className="font-display text-xl text-white mb-2">Signature Logo Upload</p>
                    <p className="text-[10px] uppercase tracking-[0.4em] text-gold-500 font-bold opacity-60">High-Fidelity Scan Ready</p>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                )}
            </div>
          )}

          {analysis && analysis.isPrintable && (
            <div className="bg-onyx-800 border border-white/5 rounded-[3rem] p-10 shadow-luxury animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5"><Gem size={150} className="text-gold-500" /></div>
              <div className="flex items-center gap-3 mb-8 relative z-10">
                <div className="p-3 bg-gold-500/10 text-gold-500 rounded-2xl border border-gold-500/20"><Sparkles size={24}/></div>
                <h3 className="font-display font-bold text-xl gold-text-gradient">Handwerks-Bericht</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                {analysis.capabilities.map((cap, i) => (
                  <div key={i} className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-gold-400/60 tracking-[0.2em]">{cap.title}</span>
                        {cap.status === 'optimal' ? <CheckCircle2 size={14} className="text-gold-400" /> : <AlertTriangle size={14} className="text-amber-500" />}
                    </div>
                    <p className="text-sm leading-relaxed font-medium text-slate-300 italic">"{cap.description}"</p>
                    <div className="w-full h-1 bg-white/5 rounded-full">
                        <div className="h-full bg-gold-500 rounded-full" style={{width: '100%'}}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-8">
          {activeStep <= 2 && (
            <div className="bg-onyx-800 p-10 rounded-[3rem] shadow-luxury border border-white/5 relative overflow-hidden animate-fade-in">
              <h2 className="text-2xl font-display font-bold mb-3 text-white">Präzisions-Check</h2>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">Jedes Design wird durch unsere AI-Vision Engine auf materielle Machbarkeit geprüft.</p>
              
              {activeStep === 2 ? (
                <div className="text-center py-10">
                  <div className="relative inline-block mb-6">
                      <Loader2 className="animate-spin text-gold-500" size={48} />
                      <Sparkles className="absolute -top-3 -right-3 text-gold-300 animate-pulse" size={24} />
                  </div>
                  <p className="text-lg font-display text-white italic">{processingStatus}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-3 items-center p-4 bg-white/5 rounded-2xl border border-white/10">
                    <ShieldCheck className="text-gold-500" size={20} />
                    <span className="text-xs font-bold text-gold-200">Keine Fotos - Nur saubere Vektoren</span>
                  </div>
                  <div className="flex gap-3 items-center p-4 bg-white/5 rounded-2xl border border-white/10 opacity-50">
                    <Zap className="text-slate-500" size={20} />
                    <span className="text-xs font-bold text-slate-400">Automatische Layer-Berechnung</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeStep >= 3 && analysis && analysis.isPrintable && (
            <div className="bg-onyx-800 p-10 rounded-[3rem] shadow-luxury border border-gold-500/20 space-y-10 animate-fade-in">
              <div className="flex justify-between items-center">
                <h2 className="font-display font-bold text-2xl text-white">Signature Config</h2>
                <div className="p-3 bg-white/5 rounded-2xl border border-white/10"><Crown size={24} className="text-gold-500" /></div>
              </div>

              {activeStep === 3 ? (
                <div className="space-y-8">
                  <div className="space-y-5">
                    <label className="text-[10px] font-bold text-gold-400/50 uppercase tracking-[0.3em]">Material Palette</label>
                    <div className="flex gap-5">
                        {analysis.suggestedColors.map((color, idx) => (
                            <div key={idx} className="w-14 h-14 rounded-2xl border-2 border-white/20 shadow-luxury hover:scale-110 transition-transform cursor-pointer" style={{backgroundColor: color}}></div>
                        ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold text-gold-400/50 uppercase tracking-[0.3em]">Jewelry Scale</label>
                            <span className="text-sm font-bold text-white tabular-nums">{logoConfig.scale}mm</span>
                        </div>
                        <input type="range" min="15" max="39" value={logoConfig.scale} onChange={e => setLogoConfig({...logoConfig, scale: parseInt(e.target.value)})} className="w-full accent-gold-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer" />
                      </div>
                  </div>

                  <div className="pt-6">
                    <button onClick={() => setActiveStep(4)} className="w-full py-6 gold-gradient text-black rounded-[2rem] font-bold flex items-center justify-center gap-3 shadow-gold-glow hover:brightness-110 transition-all active:scale-[0.98] group">
                      Checkout Review <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-fade-in">
                  <div className="bg-black/40 p-10 rounded-[2.5rem] space-y-6 border border-white/5">
                    <div className="flex justify-between text-sm text-slate-400 font-bold uppercase tracking-widest"><span>PrintForge Original</span><span>€14.99</span></div>
                    <div className="flex justify-between text-sm text-slate-400 font-bold uppercase tracking-widest"><span>Precision Fee</span><span>€{(analysis.estimatedPrice - 14.99).toFixed(2)}</span></div>
                    <div className="flex justify-between text-2xl font-display font-bold pt-8 border-t border-white/10 text-gold-400 italic"><span>Grand Total</span><span>€{analysis.estimatedPrice.toFixed(2)}</span></div>
                  </div>
                  
                  <button onClick={handleShopifyCheckout} disabled={redirectStatus !== 'idle'} className="w-full py-7 bg-white text-black rounded-[2rem] font-bold shadow-luxury flex items-center justify-center gap-4 hover:bg-gold-50 transition-all text-xl">
                    {redirectStatus === 'idle' ? 'Finalize Order' : <Loader2 className="animate-spin" />}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="p-8 rounded-[3rem] bg-black/40 border border-white/5 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gold-500 mb-4"><ShieldCheck size={24}/></div>
              <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-white">Quality Guarantee</h3>
              <p className="text-xs text-slate-500 leading-relaxed italic">"Our master artisans and AI verification ensure that every keychain meets industrial 3D printing standards."</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;

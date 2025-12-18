
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
  Layers,
  Sparkles,
  Loader2,
  Lock,
  Download,
  ShieldCheck,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Info,
  Zap,
  Image as ImageIcon,
  MousePointer2,
  Eye,
  XCircle
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
        setProcessingStatus("Analysiere Bildtyp...");
        const { url, palette, imageData } = await processLogo(rawResult);
        
        // Erst lokaler Check (schneller & kostenlos)
        const localResult = await analyzeDesignLocally(imageData, palette);
        
        if (localResult.imageType === 'photo') {
          setFileError("FOTO ERKANNT: Wir akzeptieren nur Logos mit klaren Kanten.");
          setAnalysis(localResult);
          setActiveStep(1);
          return;
        }

        setProcessingStatus("KI-Verifizierung...");
        const aiSemanticReport = await analyzeImageSemantically(rawResult);
        
        if (aiSemanticReport.classification === 'photo') {
          setFileError("DIE KI SAGT: Das ist ein Foto. Bitte laden Sie ein echtes Logo hoch.");
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
          setFileError("Analyse fehlgeschlagen. Bild nicht druckbar.");
          setActiveStep(1);
        }
      } catch (err) {
        setFileError("KI Analyse fehlgeschlagen.");
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
          params.append('attributes[Inhalt]', analysis.aiReport?.description || 'Logo');
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
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b uppercase font-bold text-slate-400">
                  <tr>
                    <th className="p-4">ID</th>
                    <th className="p-4">Vorschau</th>
                    <th className="p-4">KI-Inhalt</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {adminDesigns.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-mono">{d.id}</td>
                      <td className="p-4"><img src={d.image_url} className="w-12 h-12 object-contain bg-slate-100 rounded border" /></td>
                      <td className="p-4 text-xs italic text-slate-500">{(d.analysis as any).aiReport?.description || 'Keine Daten'}</td>
                      <td className="p-4">
                        <a href={d.image_url} download={`${d.id}.png`} className="text-blue-600 font-bold">PNG</a>
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
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg"><Zap size={20} fill="currentColor" /></div>
            <h1 className="font-display font-bold text-xl tracking-tight">PrintForge <span className="text-orange-600">Studio</span></h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
            <ShieldCheck size={14} /> Logo-Sicherheit aktiv
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 space-y-6">
          {logoConfig.url && activeStep >= 3 ? (
            <Viewer3D ref={viewerRef} logoConfig={logoConfig} detectedColors={analysis?.suggestedColors} />
          ) : (
            <div className="w-full h-[450px] rounded-[2rem] bg-white border border-slate-200 shadow-soft flex flex-col items-center justify-center text-slate-300 relative overflow-hidden group">
                <div className="absolute inset-0 bg-dot-pattern opacity-10 group-hover:opacity-20 transition-opacity"></div>
                {fileError ? (
                  <div className="text-center p-8 z-10 animate-fade-in">
                    <div className="bg-red-50 p-6 rounded-full mb-4 inline-block"><XCircle size={48} className="text-red-500" /></div>
                    <h3 className="text-red-900 font-bold text-lg mb-2">Upload blockiert</h3>
                    <p className="text-red-600/80 text-sm max-w-md mx-auto font-medium">{fileError}</p>
                    <button onClick={() => {setFileError(null); setAnalysis(null);}} className="mt-6 px-6 py-2 bg-red-600 text-white rounded-full text-xs font-bold hover:bg-red-700 transition-colors">Anderes Bild wählen</button>
                  </div>
                ) : (
                  <>
                    <div className="bg-slate-50 p-6 rounded-full mb-4 animate-bounce-slow shadow-inner"><Upload size={40} className="text-slate-200" /></div>
                    <p className="font-medium text-slate-400 text-center px-8">Logo hierher ziehen<br/><span className="text-[10px] uppercase tracking-widest opacity-60">KEINE FOTOS - NUR GRAFIKEN</span></p>
                  </>
                )}
            </div>
          )}

          {/* KI CAPABILITY PANEL - Nur zeigen wenn es KEIN Foto-Fehler ist oder als Info */}
          {analysis && analysis.capabilities && (
            <div className={`bg-white border rounded-[2rem] p-8 shadow-soft animate-fade-in relative overflow-hidden ${analysis.imageType === 'photo' ? 'border-red-100' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2 mb-6 relative z-10">
                <div className={`p-2 rounded-lg ${analysis.imageType === 'photo' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                  {analysis.imageType === 'photo' ? <AlertTriangle size={18}/> : <Sparkles size={18}/>}
                </div>
                <h3 className="font-bold text-sm tracking-tight uppercase">Vision-Engine Analyse</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                {analysis.capabilities.map((cap, i) => (
                  <div key={i} className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{cap.title}</span>
                        {cap.status === 'optimal' ? <CheckCircle2 size={12} className="text-green-500" /> : <AlertTriangle size={12} className={cap.status === 'critical' ? 'text-red-500' : 'text-amber-500'} />}
                    </div>
                    <p className={`text-[11px] leading-relaxed font-semibold ${cap.status === 'critical' ? 'text-red-600' : 'text-slate-600'}`}>{cap.description}</p>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${cap.status === 'optimal' ? 'bg-green-500' : (cap.status === 'critical' ? 'bg-red-500' : 'bg-orange-500')}`} 
                          style={{width: '100%'}}
                        ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-8">
          {activeStep <= 2 && (
            <div className="bg-white p-8 rounded-[2rem] shadow-card border border-slate-100 relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-xl font-bold mb-2">Logo-Check</h2>
                <p className="text-slate-400 text-sm mb-6 font-medium leading-relaxed">Wir prüfen die Eignung für den 3D-Druck. Fotos werden automatisch abgelehnt.</p>
                
                {activeStep === 1 ? (
                  <div className="group relative h-48 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-slate-50 hover:bg-orange-50 hover:border-orange-200 transition-all cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                    <div className="bg-white p-4 rounded-xl shadow-sm group-hover:scale-110 transition-transform"><Upload className="text-slate-400 group-hover:text-orange-500" /></div>
                    <span className="text-sm font-bold mt-4 text-slate-600">Logo hochladen</span>
                    <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">Keine Fotos akzeptiert</span>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="relative inline-block">
                        <Loader2 className="animate-spin text-orange-500 mb-4" size={32} />
                        <Sparkles className="absolute -top-2 -right-2 text-yellow-400 animate-pulse" size={16} />
                    </div>
                    <p className="text-sm font-bold text-slate-900 tracking-tight">{processingStatus}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeStep >= 3 && analysis && analysis.isPrintable && (
            <div className="bg-white p-8 rounded-[2rem] shadow-card border border-slate-100 space-y-8 animate-fade-in">
              <div className="flex justify-between items-start">
                <div>
                    <h2 className="font-bold text-xl tracking-tight">Anpassung</h2>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.15em]">Logo-Modus</span>
                    </div>
                </div>
                <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl shadow-sm border border-blue-100"><ShieldCheck size={22} /></div>
              </div>

              {activeStep === 3 ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">Filament-Palette</label>
                    <div className="flex gap-4">
                        {analysis.suggestedColors.map((color, idx) => (
                            <div key={idx} className="w-11 h-11 rounded-xl border-2 border-white shadow-card" style={{backgroundColor: color}}></div>
                        ))}
                    </div>
                  </div>

                  <div className="space-y-5">
                      <div>
                        <div className="flex justify-between mb-2 items-center">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Größe</label>
                            <span className="text-[11px] font-bold px-2 py-1 bg-slate-900 text-white rounded-md tabular-nums">{logoConfig.scale}mm</span>
                        </div>
                        <input type="range" min="15" max="39" value={logoConfig.scale} onChange={e => setLogoConfig({...logoConfig, scale: parseInt(e.target.value)})} className="w-full accent-slate-900 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer" />
                      </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50">
                    <button onClick={() => setActiveStep(4)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98]">
                      Weiter zum Checkout <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-slate-50 p-7 rounded-[2rem] space-y-5 shadow-inner">
                    <div className="flex justify-between text-xs text-slate-500 font-bold uppercase tracking-wider"><span>Gesamtpreis</span><span>€{analysis.estimatedPrice.toFixed(2)}</span></div>
                  </div>
                  <button onClick={handleShopifyCheckout} disabled={redirectStatus !== 'idle'} className="w-full py-6 bg-orange-600 text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-3 hover:bg-orange-700 transition-all text-lg">
                    {redirectStatus === 'idle' ? 'In den Warenkorb' : 'Verbinde...'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="p-6 rounded-[2.5rem] bg-slate-900 text-white shadow-soft">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-orange-400 mb-5 shadow-sm"><Lock size={22}/></div>
              <h3 className="text-xs font-bold mb-2 uppercase tracking-widest">Premium Richtlinie</h3>
              <p className="text-[10px] text-slate-400 leading-relaxed font-semibold italic">"Um die höchste Druckqualität zu garantieren, fertigen wir ausschließlich Logos und Grafiken. Fotos sind für dieses Verfahren nicht geeignet."</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;


import React, { useState, useRef, useEffect } from 'react';
import { Viewer3D, Viewer3DHandle } from './components/Keychain3D';
import { analyzeDesignLocally, CapabilityReport } from './services/analysisService';
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
  MousePointer2
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
  const [analysis, setAnalysis] = useState<(AnalysisResult & { capabilities?: CapabilityReport[] }) | null>(null);
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
    if (file.size > 5 * 1024 * 1024) { setFileError("File too large. Max 5MB."); return; }

    setFileError(null);
    setActiveStep(2); 
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawResult = event.target?.result as string;
      try {
        setProcessingStatus("Preprocessing Image...");
        const { url, palette, imageData } = await processLogo(rawResult);
        
        setLogoConfig({ url, x: 0, y: 0, scale: 30, rotation: 0 });

        setProcessingStatus("Running Local Vision Engine...");
        const localResult = await analyzeDesignLocally(imageData, palette);
        setAnalysis(localResult);
        
        if (localResult.isPrintable) {
          setLogoConfig(prev => ({ ...prev, scale: localResult.recommendedScale }));
          setActiveStep(3); 
        } else {
          setFileError("Analysis rejected. Please upload a clear image.");
          setActiveStep(1);
        }
      } catch (err) {
        setFileError("AI Analysis failed.");
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
          params.append('attributes[Type]', analysis.imageType || 'unknown');
          window.location.href = `${baseUrl}?${params.toString()}`;
      } catch (err) {
          alert("Checkout Error.");
          setRedirectStatus('idle');
      }
  };

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between mb-8">
            <h1 className="text-2xl font-bold flex items-center gap-2"><Lock /> Admin Panel</h1>
            <a href="/" className="text-blue-600 font-bold">← Back to Shop</a>
          </div>
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            {loadingAdmin ? <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></div> : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b text-xs uppercase font-bold text-slate-400">
                  <tr>
                    <th className="p-4">Design ID</th>
                    <th className="p-4">Preview</th>
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
                        <span className="block font-bold">Scale: {d.config.scale}mm</span>
                        <span className="block text-slate-400">{d.analysis.imageType || 'logo'} / {d.analysis.suggestedColors.length} Colors</span>
                      </td>
                      <td className="p-4">
                        <a href={d.image_url} download={`${d.id}.png`} className="inline-flex items-center gap-1 text-blue-600 font-bold text-xs hover:underline"><Download size={14}/> DOWNLOAD</a>
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
          <div className="flex items-center gap-6">
              <div className="hidden md:flex gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                 <span className={activeStep >= 1 ? 'text-slate-900 underline decoration-orange-500 decoration-2 underline-offset-8' : ''}>01 Create</span>
                 <span className={activeStep >= 3 ? 'text-slate-900 underline decoration-orange-500 decoration-2 underline-offset-8' : ''}>02 Configure</span>
                 <span className={activeStep === 4 ? 'text-slate-900 underline decoration-orange-500 decoration-2 underline-offset-8' : ''}>03 Checkout</span>
              </div>
              <div className="h-4 w-px bg-slate-200 hidden md:block"></div>
              <div className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                <ShieldCheck size={14} /> AI-Secure
              </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 space-y-6">
          {logoConfig.url ? (
            <Viewer3D ref={viewerRef} logoConfig={logoConfig} detectedColors={analysis?.suggestedColors} />
          ) : (
            <div className="w-full h-[450px] rounded-[2rem] bg-white border border-slate-200 shadow-soft flex flex-col items-center justify-center text-slate-300 relative overflow-hidden group">
                <div className="absolute inset-0 bg-dot-pattern opacity-10 group-hover:opacity-20 transition-opacity"></div>
                <div className="bg-slate-50 p-6 rounded-full mb-4 animate-bounce-slow shadow-inner"><Upload size={40} className="text-slate-200" /></div>
                <p className="font-medium text-slate-400 text-center px-8">Drop your brand assets here<br/><span className="text-[10px] uppercase tracking-widest opacity-60">AI will automatically classify your input</span></p>
            </div>
          )}

          {/* AI CAPABILITY PANEL */}
          {analysis && analysis.capabilities && (
            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-soft animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5"><Cpu size={120} /></div>
              <div className="flex items-center gap-2 mb-6 relative z-10">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Zap size={18}/></div>
                <h3 className="font-bold text-sm tracking-tight uppercase">AI Vision Analysis Report</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                {analysis.capabilities.map((cap, i) => (
                  <div key={i} className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{cap.title}</span>
                        {cap.status === 'optimal' ? <CheckCircle2 size={12} className="text-green-500" /> : <AlertTriangle size={12} className="text-amber-500" />}
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-600 font-semibold">{cap.description}</p>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${cap.status === 'optimal' ? 'bg-green-500' : 'bg-orange-500'}`} 
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
                <h2 className="text-xl font-bold mb-2">Source Recognition</h2>
                <p className="text-slate-400 text-sm mb-6 font-medium leading-relaxed">Our local AI engine instantly classifies and prepares your image for the 3D extrusion process.</p>
                
                {activeStep === 1 ? (
                  <div className="group relative h-48 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-slate-50 hover:bg-orange-50 hover:border-orange-200 transition-all cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                    <div className="bg-white p-4 rounded-xl shadow-sm group-hover:scale-110 transition-transform"><Upload className="text-slate-400 group-hover:text-orange-500" /></div>
                    <span className="text-sm font-bold mt-4 text-slate-600">Upload Media</span>
                    <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">Logo or Photo</span>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="relative inline-block">
                        <Loader2 className="animate-spin text-orange-500 mb-4" size={32} />
                        <Sparkles className="absolute -top-2 -right-2 text-yellow-400 animate-pulse" size={16} />
                    </div>
                    <p className="text-sm font-bold text-slate-900 tracking-tight">{processingStatus}</p>
                    <p className="text-xs text-slate-400 mt-2 font-medium">Validating geometric feasibility...</p>
                  </div>
                )}
                {fileError && <p className="text-red-500 text-xs mt-4 font-bold flex items-center gap-1 bg-red-50 p-3 rounded-lg"><AlertTriangle size={14}/> {fileError}</p>}
              </div>
            </div>
          )}

          {activeStep >= 3 && analysis && (
            <div className="bg-white p-8 rounded-[2rem] shadow-card border border-slate-100 space-y-8 animate-fade-in">
              <div className="flex justify-between items-start">
                <div>
                    <h2 className="font-bold text-xl tracking-tight">Configuration</h2>
                    <div className="flex items-center gap-2 mt-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${analysis.imageType === 'photo' ? 'bg-orange-500' : 'bg-green-500'} animate-pulse`}></div>
                        <span className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.15em]">
                            {analysis.imageType === 'photo' ? 'Photo Detected' : 'Logo Detected'}
                        </span>
                    </div>
                </div>
                <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl shadow-sm border border-blue-100"><Sparkles size={22} /></div>
              </div>

              {activeStep === 3 ? (
                <div className="space-y-6">
                  {/* Visual Classification Info */}
                  <div className={`p-4 rounded-2xl border flex gap-4 items-center ${analysis.imageType === 'photo' ? 'bg-orange-50 border-orange-100 text-orange-800' : 'bg-green-50 border-green-100 text-green-800'}`}>
                      <div className={`p-2 rounded-lg ${analysis.imageType === 'photo' ? 'bg-white' : 'bg-white'}`}>
                        {analysis.imageType === 'photo' ? <ImageIcon size={20} /> : <Zap size={20} />}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest">{analysis.imageType === 'photo' ? 'Complex Detail' : 'Sharp Geometry'}</p>
                        <p className="text-[11px] font-medium leading-tight">{analysis.imageType === 'photo' ? 'Photos result in organic, textured surfaces.' : 'Logos result in clean, defined color layers.'}</p>
                      </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        Extrusion Palette <Info size={10} />
                    </label>
                    <div className="flex gap-4">
                        {analysis.suggestedColors.map((color, idx) => (
                            <div key={idx} className="group relative">
                                <div className="w-11 h-11 rounded-xl border-2 border-white shadow-card transition-all hover:scale-110 cursor-pointer active:scale-90" style={{backgroundColor: color}}></div>
                                <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[9px] px-2 py-1 rounded-full uppercase tracking-tighter whitespace-nowrap z-50 font-bold">{color}</div>
                            </div>
                        ))}
                    </div>
                  </div>

                  <div className="space-y-5">
                      <div>
                        <div className="flex justify-between mb-2 items-center">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Target Scale</label>
                            <span className="text-[11px] font-bold px-2 py-1 bg-slate-900 text-white rounded-md tabular-nums">{logoConfig.scale}mm</span>
                        </div>
                        <input type="range" min="15" max="39" value={logoConfig.scale} onChange={e => setLogoConfig({...logoConfig, scale: parseInt(e.target.value)})} className="w-full accent-slate-900 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-2 items-center">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Orientation</label>
                            <span className="text-[11px] font-bold px-2 py-1 bg-slate-900 text-white rounded-md tabular-nums">{Math.round((logoConfig.rotation * 180) / Math.PI)}°</span>
                        </div>
                        <input type="range" min="0" max={Math.PI * 2} step="0.1" value={logoConfig.rotation} onChange={e => setLogoConfig({...logoConfig, rotation: parseFloat(e.target.value)})} className="w-full accent-slate-900 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer" />
                      </div>
                  </div>

                  <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-inner group cursor-help">
                    <div className="flex items-center gap-2 mb-2">
                        <Cpu size={14} className="text-orange-400" />
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-orange-400">Vision Advice</span>
                    </div>
                    <p className="text-[11px] leading-relaxed font-medium text-slate-300 italic">
                        "{analysis.reasoning}"
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-50">
                    <button onClick={() => setActiveStep(4)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-[0.98] group">
                      Checkout Summary <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-slate-50 p-7 rounded-[2rem] space-y-5 shadow-inner">
                    <div className="flex justify-between text-xs text-slate-500 font-bold uppercase tracking-wider"><span>PrintForge Base Body</span><span>€14.99</span></div>
                    <div className="flex justify-between text-xs text-slate-500 font-bold uppercase tracking-wider"><span>Multi-Layer Setup ({analysis.imageType})</span><span>€{(analysis.estimatedPrice - 14.99).toFixed(2)}</span></div>
                    <div className="flex justify-between text-xl font-bold pt-5 border-t border-slate-200 text-slate-900 italic font-display"><span>Final Total</span><span>€{analysis.estimatedPrice.toFixed(2)}</span></div>
                  </div>
                  
                  <button 
                    onClick={handleShopifyCheckout} 
                    disabled={redirectStatus !== 'idle'} 
                    className="w-full py-6 bg-orange-600 text-white rounded-2xl font-bold shadow-xl shadow-orange-100 flex items-center justify-center gap-3 hover:bg-orange-700 transition-all active:scale-[0.98] disabled:opacity-50 text-lg"
                  >
                    {redirectStatus === 'idle' ? 'Add to Cart' : <><Loader2 className="animate-spin" size={20} /> Securely Linking...</>}
                  </button>
                  
                  <button onClick={() => setActiveStep(3)} className="w-full text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hover:text-slate-900 transition-colors flex items-center justify-center gap-2"><MousePointer2 size={12}/> Adjust Design</button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-[2.5rem] bg-white border border-slate-100 shadow-soft group hover:border-orange-200 transition-all cursor-default">
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 mb-5 group-hover:scale-110 transition-transform shadow-sm"><Zap size={22}/></div>
                  <h3 className="text-xs font-bold mb-2 uppercase tracking-widest text-slate-900">Auto-Detect</h3>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">Our AI classifies photos vs. logos for optimal result.</p>
              </div>
              <div className="p-6 rounded-[2.5rem] bg-white border border-slate-100 shadow-soft group hover:border-blue-200 transition-all cursor-default">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-5 group-hover:scale-110 transition-transform shadow-sm"><ShieldCheck size={22}/></div>
                  <h3 className="text-xs font-bold mb-2 uppercase tracking-widest text-slate-900">Safety Check</h3>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">Every design is pre-simulated for FDM hardware.</p>
              </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;

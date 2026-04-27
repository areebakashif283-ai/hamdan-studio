import React, { useState } from 'react';
import { Scene } from './types';
import { generateStoryboard } from './lib/gemini';
import { AudioSetup } from './components/AudioSetup';
import { Storyboard } from './components/Storyboard';
import { VideoPlayer } from './components/VideoPlayer';
import { Clapperboard, Sparkles } from 'lucide-react';

export default function App() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // App State
  const [script, setScript] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [audioDuration, setAudioDuration] = useState(0);
  const [scenes, setScenes] = useState<Scene[]>([]);

  const handleGenerate = async (finalScript: string, audioFile: File, newAudioUrl: string, duration: number, stylePrompt?: string, referenceImage?: File) => {
    setIsLoading(true);
    setScript(finalScript);
    setAudioUrl(newAudioUrl);
    setAudioDuration(duration);

    try {
      const generatedScenes = await generateStoryboard(finalScript, duration, stylePrompt, referenceImage);
      setScenes(generatedScenes);
      setStep(2);
    } catch (error) {
      console.error(error);
      alert('Failed to generate scenes. Please ensure you have configured your GEMINI_API_KEY environment variable correctly.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadImage = (sceneId: string, file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    
    img.onload = () => {
      setScenes(prev => {
        const sceneIndex = prev.findIndex(s => s.id === sceneId);
        const isZoomIn = sceneIndex % 2 === 0;
        
        return prev.map(s => 
          s.id === sceneId ? { 
            ...s, 
            imageUrl: url, 
            imageElement: img,
            zoomStart: isZoomIn ? 1.0 : 1.15,
            zoomEnd: isZoomIn ? 1.15 : 1.0,
            panXStart: 0,
            panXEnd: 0,
            panYStart: 0,
            panYEnd: 0
          } : s
        );
      });
    };
  };

  const handleBulkUploadImages = (files: File[]) => {
    const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, {numeric: true, sensitivity: 'base'}));
    
    Promise.all(sortedFiles.map(file => {
      return new Promise<{url: string, img: HTMLImageElement, file: File}>((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.src = url;
        img.onload = () => resolve({url, img, file});
      });
    })).then(loadedImages => {
      setScenes(prev => {
        const nextScenes = [...prev];
        let imgIndex = 0;
        for (let i = 0; i < nextScenes.length && imgIndex < loadedImages.length; i++) {
          const isZoomIn = i % 2 === 0;
          const loaded = loadedImages[imgIndex++];
          nextScenes[i] = {
              ...nextScenes[i],
              imageUrl: loaded.url,
              imageElement: loaded.img,
              zoomStart: isZoomIn ? 1.0 : 1.15,
              zoomEnd: isZoomIn ? 1.15 : 1.0,
              panXStart: 0,
              panXEnd: 0,
              panYStart: 0,
              panYEnd: 0
          };
        }
        return nextScenes;
      });
    });
  };

  const handleUpdateScene = (sceneId: string, updates: Partial<Scene>) => {
    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, ...updates } : s));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30 flex flex-col">
      <header className="h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center font-bold text-white text-xs">VA</div>
          <h1 className="font-semibold text-sm tracking-tight text-slate-100">AI Video Automator</h1>
        </div>
        <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-wider">
          <span className={step >= 1 ? "text-emerald-400" : "text-slate-500"}>1. Script & Audio</span>
          <span className={step >= 2 ? "text-emerald-400" : "text-slate-500"}>2. Storyboard</span>
          <span className={step >= 3 ? "text-emerald-400" : "text-slate-500"}>3. Render</span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 flex flex-col">
        <div className="mb-8 text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 bg-emerald-950/30 text-emerald-400 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
            <Sparkles className="w-3 h-3" />
            Automated Timeline Generation
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">
            Transform Your Script Into Video
          </h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Upload your voiceover, paste your script, and let AI build the timeline with exact prompts. Just drop in the images and hit match!
          </p>
        </div>

        {step === 1 && (
          <AudioSetup onGenerate={handleGenerate} isLoading={isLoading} />
        )}

        {step === 2 && (
          <Storyboard 
            scenes={scenes} 
            onUploadImage={handleUploadImage}
            onBulkUploadImages={handleBulkUploadImages}
            onProceed={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <VideoPlayer 
              scenes={scenes} 
              audioUrl={audioUrl} 
              audioDuration={audioDuration} 
              onUpdateScene={handleUpdateScene}
            />
            
            <div className="mt-6 flex justify-center">
              <button 
                onClick={() => setStep(2)}
                className="text-[10px] uppercase font-bold text-slate-500 hover:text-slate-300 transition-colors"
              >
                &larr; Back to Storyboard
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

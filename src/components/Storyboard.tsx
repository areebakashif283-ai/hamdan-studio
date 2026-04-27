import React from "react";
import { Scene } from "../types";
import { Copy, UploadCloud, CheckCircle2, Clock } from "lucide-react";
import { formatTime } from "../lib/utils";

interface StoryboardProps {
  scenes: Scene[];
  onUploadImage: (sceneId: string, file: File) => void;
  onProceed: () => void;
}

export function Storyboard({ scenes, onUploadImage, onProceed }: StoryboardProps) {
  const handleImageChange = (sceneId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage(sceneId, file);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const isReadyForVideo = scenes.every((s) => !!s.imageUrl);

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex-none flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
        <div>
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Step 2: Sequence & Prompts</h2>
          <p className="text-xs text-slate-500 mt-1">Generate images using these exact prompts, then upload to match.</p>
        </div>
        <button
          onClick={onProceed}
          disabled={!isReadyForVideo}
          className={`shrink-0 px-6 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all ${
            isReadyForVideo 
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow shadow-emerald-900/50" 
              : "bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed"
          }`}
        >
          Open Video Player
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {scenes.map((scene, idx) => (
            <div key={scene.id} className="bg-slate-900 flex flex-col border border-slate-800 rounded overflow-hidden">
              <div className="flex border-b border-slate-800 bg-slate-950/50 p-2 items-center justify-between">
                <div className="flex gap-2 items-center">
                  <span className="font-mono text-slate-500 text-xs px-2">{(idx + 1).toString().padStart(3, '0')}</span>
                  <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono">
                    {formatTime(scene.startTime)} - {formatTime(scene.endTime)}
                  </span>
                </div>
                {scene.imageUrl ? (
                  <span className="text-emerald-500 font-bold uppercase text-[9px] flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Ready</span>
                ) : (
                  <span className="text-amber-500 font-bold uppercase text-[9px]">○ Missing</span>
                )}
              </div>
              
              <div className="p-3 flex-1 flex flex-col gap-3">
                <div>
                  <p className="text-slate-300 text-xs leading-relaxed">"{scene.text}"</p>
                </div>

                <div className="relative group flex-1">
                  <div className="p-2 bg-slate-950 border-l-2 border-emerald-500 text-emerald-400 italic font-mono text-[10px] leading-relaxed">
                    <span className="font-bold uppercase not-italic text-emerald-600 mr-1">PROMPT:</span>
                    {scene.imagePrompt}
                  </div>
                  <button 
                    onClick={() => copyToClipboard(scene.imagePrompt)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-slate-800 hover:bg-slate-700 text-white p-1 rounded transition-all"
                    title="Copy Prompt"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="p-2 border-t border-slate-800 bg-slate-950 flex gap-2">
                <div className="w-24 h-16 bg-slate-900 rounded border border-slate-800 flex-shrink-0 relative group overflow-hidden">
                  {scene.imageUrl ? (
                     <>
                        <img src={scene.imageUrl} alt={`Scene ${idx + 1}`} className="w-full h-full object-cover" />
                        <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                          <span className="text-[9px] font-bold text-white uppercase">Replace</span>
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(scene.id, e)} />
                        </label>
                     </>
                  ) : (
                     <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors">
                        <UploadCloud className="w-4 h-4 text-slate-600 mb-1" />
                        <span className="text-[8px] uppercase text-slate-500 font-bold">Upload</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(scene.id, e)} />
                     </label>
                  )}
                </div>
                <div className="flex-1 flex items-center text-[10px] text-slate-600 italic px-2">
                  Match the prompt output to this scene segment duration ({scene.duration.toFixed(1)}s).
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

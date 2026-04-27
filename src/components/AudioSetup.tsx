import React, { useState, useRef } from "react";
import { UploadCloud, Loader2, Play } from "lucide-react";
import { cn, formatTime } from "../lib/utils";

interface AudioSetupProps {
  onGenerate: (script: string, audioFile: File, audioUrl: string, duration: number) => void;
  isLoading: boolean;
}

export function AudioSetup({ onGenerate, isLoading }: AudioSetupProps) {
  const [script, setScript] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    
    // Create an object URL to load the audio and read its duration
    const url = URL.createObjectURL(selected);
    if (audioRef.current) {
      audioRef.current.src = url;
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!script.trim() || !file || duration === 0) return;
    
    const url = URL.createObjectURL(file);
    onGenerate(script, file, url, duration);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      <div className="space-y-3">
        <div className="p-3 bg-slate-900 border border-slate-800 rounded">
          <label className="text-[10px] text-slate-500 block mb-2 uppercase font-bold tracking-wider">Step 1: Write or Paste Your Script</label>
          <textarea
            className="w-full h-40 px-3 py-2 bg-slate-950 border border-slate-800 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-none text-xs text-slate-300 placeholder-slate-700 outline-none"
            placeholder="Once upon a time in a digital world, AI started automating editing..."
            value={script}
            onChange={(e) => setScript(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="p-3 bg-slate-900 border border-slate-800 rounded">
          <label className="text-[10px] text-slate-500 block mb-2 uppercase font-bold tracking-wider">Step 2: Upload Voiceover Audio</label>
          <div className="border border-dashed border-slate-700 rounded bg-slate-950 p-6 text-center hover:bg-slate-900 transition-colors w-full cursor-pointer relative flex flex-col items-center justify-center">
            <input 
              type="file" 
              accept="audio/*" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              onChange={handleFileChange}
              disabled={isLoading}
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <UploadCloud className="w-6 h-6 text-slate-600" />
              {file ? (
                <div className="text-slate-300 text-xs font-bold">
                  {file.name}
                  <span className="block text-[10px] text-slate-500 font-mono mt-1">
                    Duration: {duration > 0 ? formatTime(duration) : "Calculating..."}
                  </span>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-400 font-medium">Click to upload voiceover or drag and drop</p>
                  <p className="text-[10px] text-slate-600">MP3, WAV up to 50MB</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Hidden audio element purely for extracting duration */}
        <audio ref={audioRef} onLoadedMetadata={handleLoadedMetadata} className="hidden" />
      </div>

      <button
        type="submit"
        disabled={!script.trim() || !file || duration === 0 || isLoading}
        className={cn(
          "w-full py-3 rounded flex items-center justify-center gap-2 text-xs font-bold transition-all uppercase tracking-wider",
          (!script.trim() || !file || duration === 0 || isLoading)
            ? "bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed"
            : "bg-emerald-600 hover:bg-emerald-500 text-white shadow shadow-emerald-900/50"
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating Timeline...
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-current" />
            Generate Visual Prompts
          </>
        )}
      </button>
    </form>
  );
}

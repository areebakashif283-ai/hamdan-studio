import React, { useState, useRef } from "react";
import { UploadCloud, Loader2, Play, CheckCircle, XCircle } from "lucide-react";
import { cn, formatTime } from "../lib/utils";
import { validateApiKey } from "../lib/gemini";

interface AudioSetupProps {
  onGenerate: (script: string, audioFile: File, audioUrl: string, duration: number, stylePrompt?: string, referenceImage?: File, apiKey?: string, model?: string) => void;
  isLoading: boolean;
}

export function AudioSetup({ onGenerate, isLoading }: AudioSetupProps) {
  const [script, setScript] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [stylePrompt, setStylePrompt] = useState("");
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-3.1-flash-lite-preview");
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleValidateKey = async () => {
    if (!apiKey.trim()) return;
    setIsValidatingKey(true);
    setKeyStatus('idle');
    const isValid = await validateApiKey(apiKey.trim(), model);
    setKeyStatus(isValid ? 'valid' : 'invalid');
    setIsValidatingKey(false);
  };

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setReferenceImage(selected);
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
    onGenerate(script, file, url, duration, stylePrompt.trim() ? stylePrompt : undefined, referenceImage || undefined, apiKey.trim() ? apiKey.trim() : undefined, model);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full">
      <div className="space-y-3">
        <div className="p-3 bg-slate-900 border border-slate-800 rounded">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">AI Configuration</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={isLoading || isValidatingKey}
              className="bg-slate-950 border border-slate-800 text-slate-300 rounded text-[10px] uppercase font-bold p-1 pr-6 outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="gemini-3-flash-preview">Gemini 3 Flash (Free)</option>
              <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite (Free)</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-xs text-slate-300 placeholder-slate-700 outline-none"
              placeholder="Paste your Gemini AI API key here (Optional if already configured)"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setKeyStatus('idle');
              }}
              disabled={isLoading || isValidatingKey}
            />
            <button
              type="button"
              onClick={handleValidateKey}
              disabled={!apiKey.trim() || isLoading || isValidatingKey}
              className={cn(
                "px-3 py-2 rounded text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1",
                (!apiKey.trim() || isLoading || isValidatingKey) 
                  ? "bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed"
                  : keyStatus === 'valid'
                    ? "bg-emerald-900 text-emerald-400 border border-emerald-800"
                    : keyStatus === 'invalid'
                      ? "bg-rose-900 text-rose-400 border border-rose-800"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white"
              )}
            >
              {isValidatingKey ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : keyStatus === 'valid' ? (
                <><CheckCircle className="w-3 h-3" /> Valid</>
              ) : keyStatus === 'invalid' ? (
                <><XCircle className="w-3 h-3" /> Invalid</>
              ) : (
                "Validate"
              )}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">Get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">Google AI Studio</a> to use the gemini-1.5-flash model.</p>
        </div>

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

        <div className="p-3 bg-slate-900 border border-slate-800 rounded">
          <label className="text-[10px] text-slate-500 block mb-2 uppercase font-bold tracking-wider">Step 3: Visual Style (Optional)</label>
          <textarea
            className="w-full h-20 px-3 py-2 bg-slate-950 border border-slate-800 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 resize-none text-xs text-slate-300 placeholder-slate-700 outline-none mb-3"
            placeholder="E.g., Cinematic lighting, 8k, photorealistic, cyberpunk aesthetic..."
            value={stylePrompt}
            onChange={(e) => setStylePrompt(e.target.value)}
            disabled={isLoading}
          />
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 block mb-1 uppercase font-bold tracking-wider">Reference Image (Optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={isLoading}
                className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[10px] file:uppercase file:font-bold file:tracking-wider file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700"
              />
            </div>
            {referenceImage && (
              <div className="w-12 h-12 rounded bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0">
                <img src={URL.createObjectURL(referenceImage)} alt="Reference" className="w-full h-full object-cover" />
              </div>
            )}
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

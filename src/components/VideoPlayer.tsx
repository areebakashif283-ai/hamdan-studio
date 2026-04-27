import React, { useEffect, useRef, useState } from "react";
import { Scene } from "../types";
import { Play, Pause, Download } from "lucide-react";
import { formatTime } from "../lib/utils";

interface VideoPlayerProps {
  scenes: Scene[];
  audioUrl: string;
  audioDuration: number;
  onUpdateScene: (sceneId: string, updates: Partial<Scene>) => void;
}

export function VideoPlayer({ scenes, audioUrl, audioDuration, onUpdateScene }: VideoPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [transitionStyle, setTransitionStyle] = useState<'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'wipe-right' | 'wipe-left' | 'zoom' | 'none'>('fade');
  const [exportResolution, setExportResolution] = useState('1080p');
  const [exportFps, setExportFps] = useState(30);
  
  // MediaRecorder refs (Optional feature - mostly reliable on Chromium browsers)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const getCanvasDimensions = () => {
    switch(exportResolution) {
      case '4k': return { width: 3840, height: 2160 };
      case '720p': return { width: 1280, height: 720 };
      case 'vertical': return { width: 1080, height: 1920 };
      case '1080p': 
      default: return { width: 1920, height: 1080 };
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Main rendering loop
  useEffect(() => {
    let animationFrameId: number;
    
    const renderFrame = () => {
      const canvas = canvasRef.current;
      const audio = audioRef.current;
      
      if (!canvas || !audio) return;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      const time = audio.currentTime;
      setCurrentTime(time);
      
      // Clear canvas
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Find active scene
      const activeSceneIndex = scenes.findIndex((s) => time >= s.startTime && time < s.endTime);
      const actualIndex = activeSceneIndex !== -1 ? activeSceneIndex : (scenes.length > 0 ? scenes.length - 1 : -1);
      const activeScene = actualIndex !== -1 ? scenes[actualIndex] : null;

      if (activeScene) {
        const FADE_DURATION = 0.8; // seconds fade
        let transitionProgress = 1.0;

        if (transitionStyle !== 'none' && actualIndex > 0 && time >= activeScene.startTime) {
          transitionProgress = Math.min(1.0, (time - activeScene.startTime) / FADE_DURATION);
        }

        const getTransformProgress = (scene: Scene, timeMs: number) => {
           let p = (timeMs - scene.startTime) / scene.duration;
           p = Math.max(0, Math.min(1, p));
           const zoomS = scene.zoomStart ?? 1.05;
           const zoomE = scene.zoomEnd ?? 1.15;
           const panXS = scene.panXStart ?? 0;
           const panXE = scene.panXEnd ?? 0;
           const panYS = scene.panYStart ?? 0;
           const panYE = scene.panYEnd ?? 0;

           return {
             scale: zoomS + (zoomE - zoomS) * p,
             panX: panXS + (panXE - panXS) * p,
             panY: panYS + (panYE - panYS) * p,
           };
        };

        const drawImageCover = (img: HTMLImageElement, alpha: number, transform: {scale: number, panX: number, panY: number}) => {
          const cw = canvas.width;
          const ch = canvas.height;
          const iw = img.width;
          const ih = img.height;
          
          const canvasAspectRatio = cw / ch;
          const imageAspectRatio = iw / ih;
          
          let drawW = cw;
          let drawH = ch;
          let drawX = 0;
          let drawY = 0;
          
          if (imageAspectRatio > canvasAspectRatio) {
            drawW = ch * imageAspectRatio;
            drawX = (cw - drawW) / 2;
          } else {
            drawH = cw / imageAspectRatio;
            drawY = (ch - drawH) / 2;
          }
          
          ctx.globalAlpha = alpha;
          // Apply Ken Burns scale and translation around center
          ctx.save();
          ctx.translate(cw/2, ch/2);
          ctx.translate(transform.panX * cw, transform.panY * ch);
          ctx.scale(transform.scale, transform.scale);
          ctx.translate(-cw/2, -ch/2);
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          ctx.restore();
        };

        const cw = canvas.width;
        const ch = canvas.height;

        // Draw previous scene underneath if we are currently fading
        if (transitionProgress < 1.0 && actualIndex > 0) {
          const prevScene = scenes[actualIndex - 1];
          if (prevScene.imageElement) {
             const transform = getTransformProgress(prevScene, time);
             ctx.save();
             if (transitionStyle === 'slide-left') {
               ctx.translate(-cw * transitionProgress, 0);
             } else if (transitionStyle === 'slide-right') {
               ctx.translate(cw * transitionProgress, 0);
             } else if (transitionStyle === 'slide-up') {
               ctx.translate(0, -ch * transitionProgress);
             } else if (transitionStyle === 'slide-down') {
               ctx.translate(0, ch * transitionProgress);
             }
             drawImageCover(prevScene.imageElement, 1.0, transform);
             ctx.restore();
          }
        }

        // Draw current scene on top
        if (activeScene.imageElement) {
          const transform = getTransformProgress(activeScene, time);
          ctx.save();
          if (transitionProgress < 1.0 && actualIndex > 0) {
            if (transitionStyle === 'fade') {
              drawImageCover(activeScene.imageElement, transitionProgress, transform);
            } else if (transitionStyle === 'slide-left') {
              ctx.translate(cw * (1 - transitionProgress), 0);
              drawImageCover(activeScene.imageElement, 1.0, transform);
            } else if (transitionStyle === 'slide-right') {
              ctx.translate(-cw * (1 - transitionProgress), 0);
              drawImageCover(activeScene.imageElement, 1.0, transform);
            } else if (transitionStyle === 'slide-up') {
              ctx.translate(0, ch * (1 - transitionProgress));
              drawImageCover(activeScene.imageElement, 1.0, transform);
            } else if (transitionStyle === 'slide-down') {
              ctx.translate(0, -ch * (1 - transitionProgress));
              drawImageCover(activeScene.imageElement, 1.0, transform);
            } else if (transitionStyle === 'wipe-right') {
              ctx.beginPath();
              ctx.rect(0, 0, cw * transitionProgress, ch);
              ctx.clip();
              drawImageCover(activeScene.imageElement, 1.0, transform);
            } else if (transitionStyle === 'wipe-left') {
              ctx.beginPath();
              ctx.rect(cw * (1 - transitionProgress), 0, cw * transitionProgress, ch);
              ctx.clip();
              drawImageCover(activeScene.imageElement, 1.0, transform);
            } else if (transitionStyle === 'zoom') {
              const zoomScale = transform.scale + (1 - transitionProgress) * 0.5;
              drawImageCover(activeScene.imageElement, transitionProgress, {...transform, scale: zoomScale});
            } else {
              drawImageCover(activeScene.imageElement, 1.0, transform);
            }
          } else {
            drawImageCover(activeScene.imageElement, 1.0, transform);
          }
          ctx.restore();
        }

        ctx.globalAlpha = 1.0;

        // Add subtle vignette
        const gradient = ctx.createRadialGradient(cw/2, ch/2, cw/4, cw/2, ch/2, cw);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, cw, ch);

        // Draw Subtitles
        if (activeScene.text) {
          ctx.font = "bold 36px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          
          // Add wrap logic or keep it simple? Keeping it simple for demo.
          // In a real app we'd measure text and wrap.
          const x = cw / 2;
          const y = ch - 50;

          // Shadow/Stroke for legibility
          ctx.lineJoin = "round";
          ctx.lineWidth = 10;
          ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
          ctx.strokeText(activeScene.text, x, y);
          
          ctx.fillStyle = "white";
          ctx.fillText(activeScene.text, x, y);
        }
      }

      animationFrameId = requestAnimationFrame(renderFrame);
    };

    animationFrameId = requestAnimationFrame(renderFrame);

    return () => cancelAnimationFrame(animationFrameId);
  }, [scenes, isPlaying, transitionStyle]);

  // Handle Recording Export
  const startRecording = () => {
    if(!canvasRef.current || !audioRef.current) return;
    
    // Attempt dual-stream recording (Canvas + Audio)
    try {
      const canvasStream = canvasRef.current.captureStream(exportFps); // use selected FPS
      
      // We need to capture audio from the element. We use Web Audio API.
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const sourceNode = audioCtx.createMediaElementSource(audioRef.current);
      const destNode = audioCtx.createMediaStreamDestination();
      sourceNode.connect(destNode);
      // Re-connect to destination so user hears it too
      sourceNode.connect(audioCtx.destination);
      
      const audioStream = destNode.stream;
      
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioStream.getAudioTracks()
      ]);

      const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
      
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `rendered-video-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      
      // Auto-play from beginning
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);

    } catch (err) {
      console.error("Recording not fully supported in this environment", err);
      alert("Recording from canvas is experimental in this browser configuration.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col space-y-4">
      <div className="flex items-center justify-between bg-slate-900 p-3 border-b border-slate-800 rounded-t">
        <div className="flex items-center gap-4">
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Render Preview</h2>
          <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Transition:</label>
            <select 
              value={transitionStyle}
              onChange={(e) => setTransitionStyle(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-slate-300 rounded text-[10px] uppercase font-bold p-1 pr-6 outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="fade">Fade</option>
              <option value="slide-left">Slide Left</option>
              <option value="slide-right">Slide Right</option>
              <option value="slide-up">Slide Up</option>
              <option value="slide-down">Slide Down</option>
              <option value="wipe-right">Wipe Right</option>
              <option value="wipe-left">Wipe Left</option>
              <option value="zoom">Zoom</option>
              <option value="none">None</option>
            </select>
          </div>
          <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Format:</label>
            <select 
              value={exportResolution}
              onChange={(e) => setExportResolution(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 rounded text-[10px] uppercase font-bold p-1 pr-6 outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="1080p">1080p (FHD)</option>
              <option value="720p">720p (HD)</option>
              <option value="4k">4K (UHD)</option>
              <option value="vertical">Vertical (9:16)</option>
            </select>
          </div>
          <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">FPS:</label>
            <select 
              value={exportFps}
              onChange={(e) => setExportFps(parseInt(e.target.value))}
              className="bg-slate-950 border border-slate-800 text-slate-300 rounded text-[10px] uppercase font-bold p-1 pr-6 outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value={24}>24 FPS</option>
              <option value={30}>30 FPS</option>
              <option value={60}>60 FPS</option>
            </select>
          </div>
        </div>
        {isRecording ? (
          <button 
            onClick={stopRecording}
            className="bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500/30 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 animate-pulse"
          >
             <div className="w-2 h-2 rounded-full bg-red-500" />
             Stop Recording
          </button>
        ) : (
          <button 
            onClick={startRecording}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 transition-colors shadow shadow-emerald-900/50"
          >
             <Download className="w-3 h-3" />
             Export Video (.webm)
          </button>
        )}
      </div>

      <div className="bg-black border border-slate-800 rounded relative aspect-video flex-shrink-0 group mx-auto w-full max-w-4xl shadow-2xl">
        <canvas 
          ref={canvasRef} 
          width={getCanvasDimensions().width} 
          height={getCanvasDimensions().height} 
          className="w-full h-full object-contain bg-slate-950"
        />
        
        {/* Hidden Audio */}
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          onEnded={() => {
            setIsPlaying(false);
            if (isRecording) stopRecording();
          }} 
        />

        {/* Playback Controls Overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
           <div className="flex items-center gap-3">
              <button onClick={togglePlay} className="text-slate-300 hover:text-emerald-400 transition-colors">
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
              </button>
              <div className="text-slate-300 font-mono text-[10px] tracking-wider w-20">
                {formatTime(currentTime)} / {formatTime(audioDuration)}
              </div>
              {/* Scrubber */}
              <input 
                type="range" 
                min="0" 
                max={audioDuration} 
                step="0.01"
                value={currentTime}
                onChange={(e) => {
                  const time = parseFloat(e.target.value);
                  if (audioRef.current) {
                    audioRef.current.currentTime = time;
                    setCurrentTime(time);
                  }
                }}
                className="flex-grow h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-emerald-500"
              />
           </div>
        </div>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded p-2 overflow-x-auto flex-shrink-0">
        <div className="flex gap-1 min-w-max relative h-16 items-end">
          {scenes.map((scene, idx) => {
             const widthPercent = (scene.duration / audioDuration) * 100;
             const isActive = currentTime >= scene.startTime && currentTime < scene.endTime;
             return (
               <div 
                 key={scene.id} 
                 style={{ width: `${Math.max(widthPercent, 0.5)}%` }}
                 className={`h-full flex-shrink-0 relative overflow-hidden rounded-sm cursor-pointer border-t-2 transition-all ${
                   isActive ? "border-emerald-500 opacity-100 shadow-[0_-2px_10px_rgba(16,185,129,0.3)] bg-slate-800" : "border-slate-800 opacity-50 hover:opacity-80 bg-slate-900"
                 }`}
                 onClick={() => {
                   if(audioRef.current) {
                     audioRef.current.currentTime = scene.startTime;
                     setCurrentTime(scene.startTime);
                   }
                 }}
               >
                 {scene.imageUrl ? (
                   <img src={scene.imageUrl} className="w-full h-full object-cover mix-blend-screen" />
                 ) : (
                   <div className="w-full h-full bg-slate-900" />
                 )}
               </div>
             )
          })}
        </div>
      </div>

      {(() => {
        const idx = scenes.findIndex((s) => currentTime >= s.startTime && currentTime < s.endTime);
        const actualIdx = idx !== -1 ? idx : (scenes.length > 0 ? scenes.length - 1 : -1);
        const activeUIScene = actualIdx !== -1 ? scenes[actualIdx] : null;

        if (!activeUIScene) return null;

        return (
          <div className="bg-slate-900 border border-slate-800 rounded p-4 flex-shrink-0 animate-in fade-in">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-800 flex justify-between items-center pb-2">
              <span>Scene Settings <span className="text-emerald-500">[{actualIdx + 1}]</span></span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Zoom Amount (Start &rarr; End)</label>
                <div className="flex gap-6">
                  <div className="flex-1 space-y-2">
                     <label className="text-[9px] text-slate-600 uppercase flex justify-between"><span>Start Scale</span> <span className="font-mono text-emerald-400">{activeUIScene.zoomStart ?? 1.05}</span></label>
                     <input type="range" min="0.5" max="2.5" step="0.05" value={activeUIScene.zoomStart ?? 1.05} onChange={(e) => onUpdateScene(activeUIScene.id, {zoomStart: parseFloat(e.target.value)})} className="w-full accent-emerald-500" />
                  </div>
                  <div className="flex-1 space-y-2">
                     <label className="text-[9px] text-slate-600 uppercase flex justify-between"><span>End Scale</span> <span className="font-mono text-emerald-400">{activeUIScene.zoomEnd ?? 1.15}</span></label>
                     <input type="range" min="0.5" max="2.5" step="0.05" value={activeUIScene.zoomEnd ?? 1.15} onChange={(e) => onUpdateScene(activeUIScene.id, {zoomEnd: parseFloat(e.target.value)})} className="w-full accent-emerald-500" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Pan Amount X/Y (Start &rarr; End)</label>
                <div className="flex gap-6">
                  <div className="flex-1 space-y-2">
                     <label className="text-[9px] text-slate-600 uppercase flex justify-between"><span>Pan X Start</span> <span className="font-mono text-emerald-400">{activeUIScene.panXStart ?? 0}</span></label>
                     <input type="range" min="-0.5" max="0.5" step="0.05" value={activeUIScene.panXStart ?? 0} onChange={(e) => onUpdateScene(activeUIScene.id, {panXStart: parseFloat(e.target.value)})} className="w-full accent-emerald-500" />
                  </div>
                  <div className="flex-1 space-y-2">
                     <label className="text-[9px] text-slate-600 uppercase flex justify-between"><span>Pan X End</span> <span className="font-mono text-emerald-400">{activeUIScene.panXEnd ?? 0}</span></label>
                     <input type="range" min="-0.5" max="0.5" step="0.05" value={activeUIScene.panXEnd ?? 0} onChange={(e) => onUpdateScene(activeUIScene.id, {panXEnd: parseFloat(e.target.value)})} className="w-full accent-emerald-500" />
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex-1 space-y-2">
                     <label className="text-[9px] text-slate-600 uppercase flex justify-between"><span>Pan Y Start</span> <span className="font-mono text-emerald-400">{activeUIScene.panYStart ?? 0}</span></label>
                     <input type="range" min="-0.5" max="0.5" step="0.05" value={activeUIScene.panYStart ?? 0} onChange={(e) => onUpdateScene(activeUIScene.id, {panYStart: parseFloat(e.target.value)})} className="w-full accent-emerald-500" />
                  </div>
                  <div className="flex-1 space-y-2">
                     <label className="text-[9px] text-slate-600 uppercase flex justify-between"><span>Pan Y End</span> <span className="font-mono text-emerald-400">{activeUIScene.panYEnd ?? 0}</span></label>
                     <input type="range" min="-0.5" max="0.5" step="0.05" value={activeUIScene.panYEnd ?? 0} onChange={(e) => onUpdateScene(activeUIScene.id, {panYEnd: parseFloat(e.target.value)})} className="w-full accent-emerald-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

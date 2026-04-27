export interface Scene {
  id: string;
  text: string;
  duration: number;
  startTime: number;
  endTime: number;
  imagePrompt: string;
  imageUrl?: string;
  imageElement?: HTMLImageElement;
  zoomStart?: number;
  zoomEnd?: number;
  panXStart?: number;
  panXEnd?: number;
  panYStart?: number;
  panYEnd?: number;
}

export interface VideoProject {
  script: string;
  audioUrl?: string;
  audioDuration: number;
  scenes: Scene[];
}

/// <reference types="vite/client" />
import { GoogleGenAI, Type } from "@google/genai";
import { Scene } from "../types";

export async function generateStoryboard(script: string, audioDuration: number): Promise<Scene[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please add it to your environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a video automation director. 
I have a voiceover audio file that is exactly ${audioDuration.toFixed(2)} seconds long.
Here is the script for the voiceover:

<script>
${script}
</script>

Task:
Break the script down into logical, chronological visual scenes. 
For each scene, provide:
1. text: The exact script segment being spoken.
2. duration: The estimated time (in seconds, can be decimals) it takes to speak this segment. The TOTAL SUM of all durations MUST equal exactly ${audioDuration.toFixed(2)}.
3. imagePrompt: A highly detailed, descriptive prompt for an AI image generator (like Midjourney, DALL-E) to create the perfect visual for this exact scene. Make it cinematic, consistent in style, and descriptive.

Return a JSON array of objects.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            duration: { type: Type.NUMBER },
            imagePrompt: { type: Type.STRING },
          },
          required: ["text", "duration", "imagePrompt"],
        },
      },
      temperature: 0.2, // Low temperature for consistent JSON
    },
  });

  const responseText = response.text || "[]";
  const rawScenes = JSON.parse(responseText);

  // Normalize generated durations to exactly match audioDuration
  const totalGeneratedTime = rawScenes.reduce((sum: number, scene: any) => sum + (scene.duration || 0), 0);
  
  let currentTime = 0;
  const scenes: Scene[] = rawScenes.map((scene: any, index: number) => {
    // Normalization factor in case the LLM's math was slightly off
    const normalizedDuration = totalGeneratedTime > 0 
      ? (scene.duration / totalGeneratedTime) * audioDuration 
      : audioDuration / rawScenes.length;

    const start = currentTime;
    const end = index === rawScenes.length - 1 ? audioDuration : currentTime + normalizedDuration;
    
    currentTime = end;

    return {
      id: crypto.randomUUID(),
      text: scene.text,
      duration: normalizedDuration,
      startTime: start,
      endTime: end,
      imagePrompt: scene.imagePrompt,
    };
  });

  return scenes;
}

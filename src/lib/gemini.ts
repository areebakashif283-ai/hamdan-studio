/// <reference types="vite/client" />
import { GoogleGenAI, Type } from "@google/genai";
import { Scene } from "../types";

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64Str = reader.result as string;
      const base64Data = base64Str.split(",")[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
}

export async function generateStoryboard(
  script: string, 
  audioDuration: number,
  stylePrompt?: string,
  referenceImage?: File
): Promise<Scene[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please add it to your environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  let promptText = `You are a video automation director. 
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
3. imagePrompt: A highly detailed, descriptive prompt for an AI image generator (like Midjourney, DALL-E) to create the perfect visual for this exact scene. Make it cinematic, consistent in style, and descriptive.`;

  if (stylePrompt) {
    promptText += `\n\nAdditionally, adhere to the following overall visual style preferences when writing the imagePrompts:\n<style_preferences>\n${stylePrompt}\n</style_preferences>`;
  }

  if (referenceImage) {
    promptText += `\n\nI have attached a reference image to this prompt. Please analyze the image's style, colors, composition, and visual tone, and incorporate its aesthetic deeply into every single imagePrompt you write.`;
  }

  promptText += `\n\nReturn a JSON array of objects.`;

  const parts: any[] = [{ text: promptText }];
  
  if (referenceImage) {
    const base64Data = await fileToBase64(referenceImage);
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: referenceImage.type
      }
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: { parts },
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

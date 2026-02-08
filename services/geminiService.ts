
import { GoogleGenAI, Type } from "@google/genai";
import { Stop } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function optimizeRoute(
  stops: Stop[], 
  startPoint?: { lat: number, lng: number, address?: string },
  endPoint?: { lat: number, lng: number, address?: string }
): Promise<string[]> {
  const prompt = `
    You are a logistics expert. I have a list of delivery stops. 
    Optimize the order of these addresses to minimize travel time/distance (Traveling Salesman Problem heuristic).
    
    REQUIRED START: ${startPoint?.address || (startPoint?.lat ? `${startPoint.lat}, ${startPoint.lng}` : 'Current Location')}
    REQUIRED END (optional): ${endPoint?.address || (endPoint?.lat ? `${endPoint.lat}, ${endPoint.lng}` : 'Not specified')}
    
    Stops to optimize:
    ${stops.map((s, i) => `${i + 1}. ${s.address} (ID: ${s.id})`).join('\n')}
    
    Instructions:
    1. The route MUST start from the specified START point.
    2. The route should ideally end near the specified END point if provided.
    3. Return a JSON array of Stop IDs in the optimized order.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
            description: "The unique ID of the stop in optimized order"
          }
        }
      }
    });

    const result = JSON.parse(response.text || '[]');
    return result;
  } catch (error) {
    console.error("Route optimization failed:", error);
    return stops.map(s => s.id);
  }
}

export async function transcribeAddress(base64Audio: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          inlineData: {
            mimeType: "audio/webm",
            data: base64Audio
          }
        },
        {
          text: "Identify the delivery address spoken in this audio. Return ONLY the formatted address string. If no address is found, return an empty string."
        }
      ]
    });

    return response.text?.trim() || null;
  } catch (error) {
    console.error("Transcription failed:", error);
    return null;
  }
}

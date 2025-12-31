
import { GoogleGenAI, Type } from "@google/genai";
import { AISuggestion } from "../types";

export class GeminiService {
  constructor() {}

  private getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async analyzeTask(taskTitle: string, taskDesc: string): Promise<AISuggestion> {
    try {
      const ai = this.getAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analiza esta tarea y desglósala en pasos refinados: Título: ${taskTitle}, Descripción: ${taskDesc}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subtasks: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Pasos sofisticados para completar la tarea."
              },
              estimatedTime: {
                type: Type.STRING,
                description: "Tiempo estimado de ejecución."
              }
            },
            required: ["subtasks", "estimatedTime"]
          }
        }
      });

      const text = response.text;
      return JSON.parse(text || "{}") as AISuggestion;
    } catch (error) {
      console.error("Oracle Analysis Error:", error);
      throw error;
    }
  }

  async quickChat(prompt: string, attachment?: { data: string, mimeType: string }): Promise<string> {
    const parts: any[] = [{ text: prompt }];
    
    if (attachment) {
      parts.push({
        inlineData: {
          data: attachment.data,
          mimeType: attachment.mimeType
        }
      });
    }

    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction: "Tu nombre es APOLO. Eres un estratega personal de élite y consultor de la Orden (ORDO). Tu tono es extremadamente educado, minimalista y sofisticado. IMPORTANTE: Está terminantemente prohibido usar asteriscos, almohadillas, guiones o cualquier símbolo de formato Markdown. Escribe en párrafos limpios, usando solo letras y puntuación. Tu respuesta debe leerse como una carta de lujo, un consejo de un mentor distinguido o un pergamino sagrado. Sé directo, inspirador y preciso."
      }
    });
    return response.text || "";
  }

  async generateText(prompt: string, systemInstruction: string): Promise<string> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction + " No utilices formato Markdown (asteriscos, almohadillas, etc.).",
      }
    });
    return response.text || "";
  }

  async generateImage(prompt: string): Promise<string> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `A cinematic, ultra-luxury, minimalist and artistic depiction of: ${prompt}. Golden lighting, high-end studio photography, 8k resolution, elegant composition.` }],
      },
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image found.");
  }

  async searchGrounding(query: string): Promise<{ text: string; sources: any[] }> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return {
      text: response.text || "",
      sources: sources
    };
  }
}

export const geminiService = new GeminiService();

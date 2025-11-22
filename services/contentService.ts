import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateExampleSentence = async (word: string, meaning: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Create a simple, natural Japanese example sentence using the word "${word}" (Meaning: ${meaning}). The sentence should be suitable for JLPT N1 learners. Return ONLY the Japanese sentence, no translations or explanations.`,
    });
    return response.text?.trim() || '';
  } catch (error) {
    console.error("Failed to generate example", error);
    return '';
  }
};

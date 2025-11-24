import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Singleton AudioContext to prevent resource exhaustion (browsers limit the number of active contexts)
let ttsAudioContext: AudioContext | null = null;

function getTtsContext(): AudioContext {
  if (!ttsAudioContext) {
    ttsAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return ttsAudioContext;
}

// Helper to decode base64 string to byte array
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper to decode audio data into an AudioBuffer manually (since we get raw PCM)
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const playTextToSpeech = async (text: string): Promise<void> => {
  if (!text) return;

  return new Promise(async (resolve) => {
    try {
      const ctx = getTtsContext();
      
      // Ensure context is running. Browsers may suspend it if not created during user interaction.
      if (ctx.state === 'suspended') {
          await ctx.resume();
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }, 
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (!base64Audio) {
        console.warn("No audio data returned from Gemini API");
        resolve();
        return;
      }

      // Decode PCM data. Gemini TTS preview typically returns 24kHz.
      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        ctx,
        24000,
        1,
      );

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        source.disconnect();
        resolve();
      };

      source.start();

    } catch (error) {
      console.error("Error playing TTS:", error);
      // Resolve anyway so the UI state (spinners) can reset
      resolve();
    }
  });
};
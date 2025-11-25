
import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Singleton AudioContext to prevent resource exhaustion
let ttsAudioContext: AudioContext | null = null;
// Cache to store decoded AudioBuffers for instant playback on repeat
const audioCache = new Map<string, AudioBuffer>();

function getTtsContext(): AudioContext {
  if (!ttsAudioContext) {
    // FIX: Do not force sampleRate here. Mobile browsers (especially iOS) often fail 
    // or mute audio if the context sample rate doesn't match the hardware rate.
    // We handle the 24kHz sample rate in the buffer creation instead.
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
  // Ensure data length is even for Int16 conversion
  let bufferData = data;
  if (data.length % 2 !== 0) {
    const newBuffer = new Uint8Array(data.length + 1);
    newBuffer.set(data);
    bufferData = newBuffer;
  }

  const dataInt16 = new Int16Array(bufferData.buffer, bufferData.byteOffset, bufferData.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  
  // FIX: The context might be 44.1k or 48k, but we tell it this specific buffer is 24k.
  // The Web Audio API handles the resampling automatically during playback.
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
      
      // CRITICAL: Always try to resume the context before playing.
      // Browsers often suspend AudioContext if it wasn't created inside a user interaction.
      if (ctx.state === 'suspended') {
          await ctx.resume();
      }

      // Check Cache First for Instant Playback
      if (audioCache.has(text)) {
        const audioBuffer = audioCache.get(text)!;
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => resolve();
        source.start();
        return;
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

      // Cache the result
      audioCache.set(text, audioBuffer);

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

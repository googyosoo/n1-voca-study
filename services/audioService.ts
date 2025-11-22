import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

// Helper to decode audio data into an AudioBuffer
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
  return new Promise(async (resolve) => {
    let outputAudioContext: AudioContext | null = null;
    
    try {
      // 1. Create Context without fixed sampleRate to be compatible with all hardware
      outputAudioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      
      // 2. Ensure context is running (needed for some browsers/policies)
      if (outputAudioContext.state === 'suspended') {
          await outputAudioContext.resume();
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
        console.error("No audio data returned from Gemini API");
        resolve();
        return;
      }

      // 3. Decode and create buffer at 24kHz (Gemini native rate)
      // The AudioContext handles resampling to hardware rate automatically
      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        outputAudioContext,
        24000,
        1,
      );

      const outputNode = outputAudioContext.createGain();
      outputNode.connect(outputAudioContext.destination);

      const source = outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputNode);
      
      // 4. Handle completion
      source.onended = () => {
        source.disconnect();
        outputNode.disconnect();
        if (outputAudioContext && outputAudioContext.state !== 'closed') {
             outputAudioContext.close();
        }
        resolve();
      };

      source.start();

    } catch (error) {
      console.error("Error playing TTS:", error);
      alert("오디오 재생에 실패했습니다. 다시 시도해주세요.");
      
      // Cleanup on error
      if (outputAudioContext && outputAudioContext.state !== 'closed') {
        outputAudioContext.close();
      }
      resolve();
    }
  });
};
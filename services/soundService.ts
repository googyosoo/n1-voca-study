
let sfxContext: AudioContext | null = null;

const getSfxContext = () => {
  if (!sfxContext) {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      sfxContext = new AudioContext();
    }
  }
  return sfxContext;
};

export const playSound = (type: 'correct' | 'incorrect') => {
  const ctx = getSfxContext();
  if (!ctx) return;

  // Always try to resume suspended context
  if (ctx.state === 'suspended') {
    ctx.resume().catch((e) => console.error("Failed to resume audio context", e));
  }

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  if (type === 'correct') {
    // Ding sound (High Sine wave)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1); // A6
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.start(now);
    osc.stop(now + 0.5);
  } else {
    // Buzz sound (Low Sawtooth wave)
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.3);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.start(now);
    osc.stop(now + 0.3);
  }
};

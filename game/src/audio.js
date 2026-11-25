// Sizzle & Serve — sound effects, synthesized live with WebAudio.
// No audio files: every sizzle, ding and buzz is an oscillator envelope.

let ctx = null;
let muted = false;
// Once AudioContext creation has failed, stop trying: the game stays silent
// instead of throwing on every sound effect.
let audioDead = false;

function ensureCtx() {
  if (audioDead) return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) { audioDead = true; return null; }
      ctx = new AC();
      if (!ctx) { audioDead = true; return null; }
    } catch {
      ctx = null;
      audioDead = true; // never retry a constructor that already failed
    }
  }
  if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

// Prime the context from a user gesture (browsers block audio before one).
export function unlockAudio() { ensureCtx(); }

function tone(freq, dur, type = 'sine', vol = 0.15, slideTo = null, delay = 0) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, vol = 0.08, filterFreq = 4000) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  const gain = c.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start();
}

export const sfx = {
  click() { tone(660, 0.06, 'triangle', 0.1); },
  place() { tone(520, 0.09, 'triangle', 0.14); tone(780, 0.1, 'sine', 0.1, null, 0.05); },
  sizzle() { noiseBurst(0.35, 0.07, 5200); tone(180, 0.25, 'sawtooth', 0.03, 120); },
  flip() { tone(440, 0.08, 'square', 0.06, 660); },
  wrong() { tone(160, 0.22, 'sawtooth', 0.12, 110); },
  ding() {
    tone(880, 0.35, 'sine', 0.16);
    tone(1318, 0.4, 'sine', 0.12, null, 0.09);
    tone(1760, 0.3, 'sine', 0.08, null, 0.18);
  },
  levelUp() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.13, null, i * 0.08)); },
  gameOver() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.28, 'triangle', 0.12, null, i * 0.16)); },
  tick() { tone(980, 0.04, 'square', 0.05); },
};

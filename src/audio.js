// Sonidos cortos y suaves generados con WebAudio (sin archivos externos).
let ctx = null;
let enabled = true;

function context() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, duration, { type = 'sine', gain = 0.035, slide = 0, delay = 0 } = {}) {
  if (!enabled) return;
  const ac = context();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + duration);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const audio = {
  setEnabled(value) { enabled = !!value; },
  get enabled() { return enabled; },
  click() { tone(620, 0.045, { type: 'triangle', gain: 0.018 }); },
  pop() {
    tone(520, 0.09, { type: 'sine', gain: 0.03, slide: 160 });
    tone(880, 0.07, { type: 'triangle', gain: 0.016, delay: 0.03 });
  },
  add() {
    tone(523, 0.1, { type: 'triangle', gain: 0.025 });
    tone(784, 0.12, { type: 'triangle', gain: 0.02, delay: 0.07 });
  },
  success() {
    tone(523, 0.1, { gain: 0.025 });
    tone(659, 0.1, { gain: 0.022, delay: 0.08 });
    tone(784, 0.16, { gain: 0.022, delay: 0.16 });
  },
  error() {
    tone(190, 0.14, { type: 'sawtooth', gain: 0.018 });
    tone(150, 0.16, { type: 'sawtooth', gain: 0.015, delay: 0.1 });
  },
  paint() { tone(440 + Math.random() * 80, 0.03, { type: 'sine', gain: 0.012 }); },
  whoosh() { tone(330, 0.18, { gain: 0.018, slide: 260 }); },
};

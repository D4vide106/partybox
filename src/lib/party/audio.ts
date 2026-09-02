// Web Audio effects — zero-asset synthesized tones + local user settings.

const LS_KEY = "partybox.audio.v1";

export type AudioPrefs = {
  enabled: boolean;
  volume: number; // 0..1
};

const DEFAULTS: AudioPrefs = { enabled: true, volume: 0.6 };

export function loadAudioPrefs(): AudioPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<AudioPrefs>;
    return {
      enabled: p.enabled ?? DEFAULTS.enabled,
      volume: Math.max(0, Math.min(1, p.volume ?? DEFAULTS.volume)),
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveAudioPrefs(p: AudioPrefs) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

// Lazy shared AudioContext (must be created after user gesture in some browsers)
let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Tone = { freq: number; dur: number; type?: OscillatorType; slideTo?: number };

function playSequence(tones: Tone[]) {
  const prefs = loadAudioPrefs();
  if (!prefs.enabled) return;
  const c = getCtx();
  if (!c) return;

  let t = c.currentTime;
  const gain = c.createGain();
  gain.gain.value = prefs.volume * 0.35;
  gain.connect(c.destination);

  for (const tone of tones) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = tone.type ?? "sine";
    osc.frequency.setValueAtTime(tone.freq, t);
    if (tone.slideTo) osc.frequency.linearRampToValueAtTime(tone.slideTo, t + tone.dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.0, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + tone.dur);
    osc.connect(g);
    g.connect(gain);
    osc.start(t);
    osc.stop(t + tone.dur + 0.02);
    t += tone.dur;
  }
}

export const sfx = {
  click:     () => playSequence([{ freq: 880, dur: 0.05, type: "square" }]),
  correct:   () => playSequence([{ freq: 660, dur: 0.08 }, { freq: 990, dur: 0.14 }]),
  wrong:     () => playSequence([{ freq: 220, dur: 0.15, type: "sawtooth" }]),
  countdown: () => playSequence([{ freq: 440, dur: 0.08 }]),
  timeup:    () => playSequence([{ freq: 880, dur: 0.12 }, { freq: 220, dur: 0.25, type: "sawtooth" }]),
  start:     () => playSequence([{ freq: 523, dur: 0.09 }, { freq: 659, dur: 0.09 }, { freq: 784, dur: 0.16 }]),
  results:   () => playSequence([
    { freq: 523, dur: 0.08 }, { freq: 659, dur: 0.08 },
    { freq: 784, dur: 0.08 }, { freq: 1046, dur: 0.2 },
  ]),
  victory:   () => playSequence([
    { freq: 523, dur: 0.12 }, { freq: 659, dur: 0.12 }, { freq: 784, dur: 0.12 },
    { freq: 1046, dur: 0.12 }, { freq: 1318, dur: 0.35 },
  ]),
  join:      () => playSequence([{ freq: 660, dur: 0.06 }, { freq: 990, dur: 0.1 }]),
  leave:     () => playSequence([{ freq: 440, dur: 0.06 }, { freq: 220, dur: 0.1, type: "sawtooth" }]),
  kick:      () => playSequence([
    { freq: 200, dur: 0.08, type: "sawtooth" },
    { freq: 150, dur: 0.12, type: "sawtooth" },
    { freq: 100, dur: 0.2, type: "sawtooth" },
  ]),
  vote:      () => playSequence([{ freq: 587, dur: 0.05, type: "triangle" }, { freq: 880, dur: 0.08, type: "triangle" }]),
};

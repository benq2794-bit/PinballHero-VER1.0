// Redesigned elemental skill cues. Dependency-free 24-bit stereo PCM at 44.1 kHz.
const fs = require('node:fs');
const path = require('node:path');

const RATE = 44100;
const TAU = Math.PI * 2;
const OUT = path.join(__dirname, 'elemental-24');
fs.mkdirSync(OUT, { recursive: true });

function event(at, dur, from, to, level, wave, options = {}) {
  return { at, dur, from, to, level, wave, ...options };
}

function writeWav24(name, duration, events) {
  const frames = Math.ceil(RATE * duration);
  const pcm = Buffer.alloc(frames * 2 * 3);
  const state = events.map(() => [0, 0]);
  for (let i = 0; i < frames; i++) {
    const t = i / RATE;
    let left = 0, right = 0;
    for (let ei = 0; ei < events.length; ei++) {
      const e = events[ei];
      const local = t - e.at;
      if (local < 0 || local >= e.dur) continue;
      const p = local / e.dur;
      const freq = Math.max(20, e.from + (e.to - e.from) * p);
      const phase = TAU * (e.from * local + (e.to - e.from) * local * local / (2 * e.dur))
        + (e.fmDepth ? TAU * e.fmDepth * Math.sin(TAU * (e.fmRate ?? 6) * local) : 0);
      const attack = Math.min(1, local / (e.attack ?? 0.012));
      const release = Math.min(1, (e.dur - local) / (e.release ?? Math.min(0.08, e.dur * 0.3)));
      const decay = Math.exp(-local * (e.decay ?? 0));
      const env = Math.max(0, attack * release) * decay * e.level;
      const pan = Math.max(-1, Math.min(1, e.pan ?? 0));
      const lPan = Math.sqrt((1 - pan) * 0.5), rPan = Math.sqrt((1 + pan) * 0.5);
      for (let ch = 0; ch < 2; ch++) {
        let sample;
        if (e.wave === 'noise') {
          const raw = Math.random() * 2 - 1;
          const cutoff = (e.cutoff ?? 3200) + ((e.cutoffEnd ?? e.cutoff ?? 3200) - (e.cutoff ?? 3200)) * p;
          const alpha = cutoff / (cutoff + RATE / TAU);
          state[ei][ch] += alpha * (raw - state[ei][ch]);
          sample = state[ei][ch];
        } else if (e.wave === 'tri') sample = (2 / Math.PI) * Math.asin(Math.sin(phase));
        else if (e.wave === 'saw') sample = 2 * (phase / TAU - Math.floor(phase / TAU + 0.5));
        else sample = Math.sin(phase);
        const value = sample * env * (ch ? rPan : lPan);
        if (ch) right += value; else left += value;
      }
    }
    const index = i * 6;
    for (const [ch, value] of [[0, left], [1, right]]) {
      const scaled = Math.round(Math.tanh(value * 1.18) * 0.76 * 8388607);
      const offset = index + ch * 3;
      pcm[offset] = scaled & 0xff;
      pcm[offset + 1] = (scaled >> 8) & 0xff;
      pcm[offset + 2] = (scaled >> 16) & 0xff;
    }
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22); header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 6, 28);
  header.writeUInt16LE(6, 32); header.writeUInt16LE(24, 34); header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(path.join(OUT, name), Buffer.concat([header, pcm]));
}

// Fire: furnace draw, charcoal crackle, then a heavy flame bloom and hot hiss.
writeWav24('skill-fire.wav', 0.70, [
  event(0, 0.30, 90, 330, 0.075, 'noise', { cutoff: 260, cutoffEnd: 720, attack: 0.09, release: 0.12, pan: -0.12 }),
  event(0.10, 0.055, 2600, 900, 0.075, 'noise', { cutoff: 4200, attack: 0.001, release: 0.035, pan: -0.18 }),
  event(0.21, 0.045, 3100, 1000, 0.07, 'noise', { cutoff: 4600, attack: 0.001, release: 0.03, pan: 0.2 }),
  event(0.29, 0.024, 3600, 1100, 0.065, 'noise', { cutoff: 5000, attack: 0.001, release: 0.018, pan: -0.05 }),
  event(0.30, 0.33, 112, 42, 0.25, 'sine', { attack: 0.004, release: 0.22 }),
  event(0.30, 0.27, 210, 76, 0.15, 'tri', { attack: 0.002, release: 0.18, pan: 0.08 }),
  event(0.30, 0.23, 2400, 340, 0.17, 'noise', { cutoff: 5200, cutoffEnd: 850, attack: 0.001, release: 0.16, pan: 0.12 }),
  event(0.38, 0.27, 360, 690, 0.075, 'saw', { attack: 0.025, release: 0.16, pan: -0.12 }),
  event(0.46, 0.18, 2800, 800, 0.045, 'noise', { cutoff: 4400, attack: 0.001, release: 0.13, pan: 0.25 })
]);

// Water: gathering whirl, hollow glugs, weighty wave impact and scattered droplets.
writeWav24('skill-water.wav', 0.72, [
  event(0, 0.34, 420, 950, 0.065, 'noise', { cutoff: 650, cutoffEnd: 1500, attack: 0.08, release: 0.14, pan: -0.18 }),
  event(0.045, 0.16, 760, 310, 0.11, 'sine', { attack: 0.004, release: 0.12, fmDepth: 0.045, fmRate: 9, pan: -0.2 }),
  event(0.17, 0.18, 620, 250, 0.12, 'sine', { attack: 0.003, release: 0.14, fmDepth: 0.05, fmRate: 7, pan: 0.22 }),
  event(0.30, 0.065, 3200, 500, 0.16, 'noise', { cutoff: 5100, cutoffEnd: 1900, attack: 0.001, release: 0.05 }),
  event(0.30, 0.34, 92, 37, 0.22, 'sine', { attack: 0.003, release: 0.23 }),
  event(0.32, 0.29, 360, 150, 0.11, 'noise', { cutoff: 1800, cutoffEnd: 320, attack: 0.002, release: 0.20, pan: -0.12 }),
  event(0.42, 0.13, 1450, 680, 0.095, 'sine', { attack: 0.002, release: 0.11, decay: 3.4, pan: -0.28 }),
  event(0.49, 0.12, 1080, 470, 0.08, 'tri', { attack: 0.002, release: 0.10, decay: 3.2, pan: 0.3 }),
  event(0.56, 0.09, 1820, 930, 0.055, 'sine', { attack: 0.002, release: 0.075, decay: 4.2, pan: 0.05 })
]);

// Thunder: nervous charge static, sudden glassy crack, deep rolling thunder, residual sparks.
writeWav24('skill-thunder.wav', 0.74, [
  event(0, 0.20, 2600, 4200, 0.045, 'noise', { cutoff: 4800, cutoffEnd: 6900, attack: 0.06, release: 0.035, pan: -0.08 }),
  event(0.055, 0.018, 4900, 1800, 0.07, 'noise', { cutoff: 6500, attack: 0.001, release: 0.012, pan: -0.2 }),
  event(0.13, 0.022, 5400, 1500, 0.075, 'noise', { cutoff: 6800, attack: 0.001, release: 0.014, pan: 0.18 }),
  event(0.21, 0.032, 6200, 1200, 0.23, 'noise', { cutoff: 7200, attack: 0.001, release: 0.026 }),
  event(0.215, 0.14, 1280, 180, 0.115, 'saw', { attack: 0.001, release: 0.10, pan: -0.08 }),
  event(0.22, 0.44, 76, 32, 0.26, 'sine', { attack: 0.002, release: 0.31 }),
  event(0.24, 0.39, 240, 58, 0.13, 'noise', { cutoff: 1100, cutoffEnd: 170, attack: 0.002, release: 0.28, pan: 0.12 }),
  event(0.36, 0.036, 4700, 900, 0.085, 'noise', { cutoff: 5900, attack: 0.001, release: 0.025, pan: 0.2 }),
  event(0.48, 0.030, 3900, 800, 0.06, 'noise', { cutoff: 5200, attack: 0.001, release: 0.02, pan: -0.18 })
]);

// Wind: pressure gathers from afar, rises into a wavering howl, then tears past and fades.
writeWav24('skill-wind.wav', 0.76, [
  event(0, 0.44, 380, 4200, 0.095, 'noise', { cutoff: 430, cutoffEnd: 3300, attack: 0.12, release: 0.12, pan: -0.28 }),
  event(0.06, 0.51, 245, 740, 0.09, 'sine', { attack: 0.15, release: 0.18, fmDepth: 0.075, fmRate: 3.4, pan: 0.1 }),
  event(0.18, 0.36, 510, 1240, 0.07, 'tri', { attack: 0.12, release: 0.13, fmDepth: 0.04, fmRate: 5.1, pan: 0.22 }),
  event(0.39, 0.18, 2200, 550, 0.115, 'noise', { cutoff: 4400, cutoffEnd: 900, attack: 0.006, release: 0.12, pan: 0.18 }),
  event(0.42, 0.22, 1480, 660, 0.075, 'sine', { attack: 0.012, release: 0.16, fmDepth: 0.10, fmRate: 4.7, pan: -0.18 }),
  event(0.52, 0.17, 900, 2700, 0.045, 'noise', { cutoff: 2300, cutoffEnd: 4100, attack: 0.015, release: 0.12, pan: -0.3 })
]);

console.log('Generated four redesigned 24-bit stereo elemental skill sounds in', OUT);

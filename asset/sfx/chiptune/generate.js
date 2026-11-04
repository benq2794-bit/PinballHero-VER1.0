// Tiny, dependency-free 16-bit SFX generator. Run with: node asset/sfx/chiptune/generate.js
// Output: mono PCM WAV, 22.05 kHz, 16-bit.
const fs = require('node:fs');
const path = require('node:path');

const RATE = 22050;
const OUT = __dirname;
const TAU = Math.PI * 2;

function writeWav(name, duration, events) {
  const count = Math.ceil(RATE * duration);
  const pcm = Buffer.alloc(count * 2);
  for (let i = 0; i < count; i++) {
    const t = i / RATE;
    let value = 0;
    for (const e of events) {
      if (t < e.at || t >= e.at + e.dur) continue;
      const local = t - e.at;
      const p = local / e.dur;
      const freq = e.from + (e.to - e.from) * p;
      const phase = TAU * freq * local;
      let wave;
      if (e.wave === 'noise') wave = (Math.random() * 2 - 1) * (1 - p * 0.45);
      else if (e.wave === 'tri') wave = (2 / Math.PI) * Math.asin(Math.sin(phase));
      else if (e.wave === 'saw') wave = 2 * (phase / TAU - Math.floor(phase / TAU + 0.5));
      else wave = Math.sin(phase) >= 0 ? 1 : -1;
      const attack = Math.min(1, local / (e.attack ?? 0.004));
      const release = Math.min(1, (e.dur - local) / (e.release ?? Math.min(0.035, e.dur * 0.35)));
      const env = Math.max(0, attack * release) * (e.level ?? 0.5);
      value += wave * env;
    }
    // Mild soft clipping avoids harsh peaks when layered notes overlap.
    const shaped = Math.tanh(value * 1.25) * 0.82;
    pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(shaped * 32767))), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVE', 8);
  header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22); header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(path.join(OUT, name), Buffer.concat([header, pcm]));
}

const note = (at, dur, hz, level, wave = 'square', to = hz) => ({ at, dur, from: hz, to, level, wave });
const noise = (at, dur, level, from = 2600, to = 900) => ({ at, dur, from, to, level, wave: 'noise', attack: 0.001, release: 0.025 });

writeWav('ui-click.wav', 0.075, [note(0, 0.055, 1046, 0.16, 'square', 820)]);
writeWav('launch.wav', 0.16, [noise(0, 0.055, 0.18, 2100, 700), note(0, 0.11, 130, 0.32, 'tri', 52), note(0.018, 0.12, 260, 0.21, 'square', 1180)]);
writeWav('hit.wav', 0.115, [noise(0, 0.026, 0.28, 3200, 1100), note(0, 0.085, 190, 0.42, 'tri', 76), note(0.012, 0.052, 390, 0.14, 'square', 245)]);
// Classic MMO-style critical: weighty hit, crisp slash transient, then a brief bright glint.
writeWav('critical.wav', 0.205, [noise(0, 0.022, 0.20, 3800, 1500), note(0, 0.13, 205, 0.30, 'tri', 58), note(0.012, 0.09, 390, 0.12, 'square', 230), note(0.026, 0.12, 920, 0.15, 'tri', 1380), note(0.045, 0.105, 1840, 0.09, 'sine', 1180)]);
// Three quick, distinct impacts for a classic rapid-hit critical preview.
writeWav('critical-burst-preview.wav', 0.31, [
  noise(0, 0.022, 0.17, 3600, 1200), note(0, 0.085, 190, 0.24, 'tri', 60), note(0.012, 0.06, 760, 0.11, 'square', 480),
  noise(0.072, 0.022, 0.15, 3100, 1000), note(0.072, 0.082, 220, 0.21, 'tri', 68), note(0.084, 0.058, 940, 0.12, 'square', 560),
  noise(0.145, 0.028, 0.20, 4200, 1000), note(0.145, 0.12, 150, 0.30, 'tri', 42), note(0.157, 0.075, 1180, 0.15, 'square', 520), note(0.18, 0.10, 1568, 0.07, 'sine', 960)
]);
writeWav('critical-preview.wav', 0.17, [noise(0, 0.018, 0.22, 3200, 1500), note(0, 0.11, 180, 0.24, 'tri', 90), note(0, 0.075, 1480, 0.17, 'tri', 1320), note(0.008, 0.058, 2220, 0.10, 'sine', 1980)]);
writeWav('power-flip.wav', 0.19, [noise(0, 0.075, 0.22, 2600, 420), note(0, 0.12, 165, 0.30, 'tri', 48), note(0.008, 0.065, 1180, 0.16, 'square', 360), noise(0.075, 0.024, 0.17, 3400, 1200), note(0.072, 0.095, 130, 0.26, 'tri', 42), note(0.08, 0.070, 820, 0.12, 'square', 280)]);
writeWav('skill.wav', 0.29, [note(0, 0.21, 392, 0.13, 'tri', 784), note(0.045, 0.12, 587, 0.09, 'tri'), note(0.11, 0.13, 784, 0.11, 'tri'), note(0.17, 0.12, 1047, 0.12, 'tri'), note(0.19, 0.065, 1568, 0.035, 'sine'), noise(0.205, 0.035, 0.035, 2500, 1700)]);
writeWav('skill-fire.wav', 0.30, [noise(0, 0.075, 0.09, 1800, 500), note(0, 0.18, 164, 0.18, 'tri', 82), note(0.035, 0.12, 392, 0.12, 'saw', 784), note(0.105, 0.11, 784, 0.12, 'tri', 1047), noise(0.18, 0.055, 0.06, 2600, 1100)]);
writeWav('skill-water.wav', 0.30, [note(0, 0.19, 330, 0.11, 'sine', 660), note(0.045, 0.13, 523, 0.10, 'tri', 784), note(0.10, 0.15, 784, 0.11, 'sine', 1047), note(0.17, 0.12, 1047, 0.12, 'tri', 784), noise(0.06, 0.09, 0.045, 900, 1900), note(0.205, 0.07, 659, 0.06, 'sine', 523)]);
writeWav('skill-thunder.wav', 0.27, [noise(0, 0.038, 0.13, 4200, 1200), note(0, 0.15, 196, 0.16, 'square', 98), note(0.025, 0.055, 1047, 0.12, 'square', 1568), note(0.09, 0.055, 1319, 0.12, 'square', 1760), note(0.15, 0.09, 1760, 0.13, 'tri', 880), noise(0.16, 0.045, 0.06, 3600, 700)]);
writeWav('skill-wind.wav', 0.30, [noise(0, 0.20, 0.10, 500, 3300), note(0, 0.24, 294, 0.11, 'tri', 1175), note(0.06, 0.16, 587, 0.085, 'sine', 1568), note(0.15, 0.12, 1175, 0.10, 'tri', 784), noise(0.19, 0.07, 0.045, 2600, 1100)]);
writeWav('fever.wav', 0.31, [noise(0, 0.055, 0.08, 1200, 4600), note(0, 0.25, 145, 0.18, 'saw', 920), note(0.035, 0.055, 392, 0.13, 'square', 784), note(0.10, 0.055, 523, 0.14, 'square', 1047), note(0.17, 0.085, 784, 0.16, 'tri', 1568), note(0.20, 0.10, 1175, 0.08, 'sine', 1760)]);
writeWav('break.wav', 0.29, [noise(0, 0.055, 0.28, 3500, 600), note(0, 0.22, 150, 0.38, 'tri', 42), note(0.045, 0.11, 784, 0.18, 'square', 392), note(0.11, 0.10, 523, 0.16, 'square', 262), note(0.17, 0.09, 330, 0.15, 'tri', 165)]);
writeWav('outhole.wav', 0.24, [note(0, 0.22, 150, 0.38, 'tri', 38), note(0.015, 0.16, 92, 0.22, 'sine', 32), noise(0, 0.11, 0.07, 420, 90)]);
console.log('Generated short 16-bit PCM sound effects in', OUT);

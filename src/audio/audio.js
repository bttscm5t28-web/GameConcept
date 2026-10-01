// 程序化民乐：古筝拨弦、笛子、鼓、锣 + 音效（WebAudio 实时合成）
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
function midi(n) { const m = n.match(/^([A-G]#?)(\d)$/); return 12 * (+m[2] + 1) + NOTE[m[1]]; }
function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
// "A4:4 B4:2 -:4" → [{step, m, len}]
function seq(str, start = 0) {
  const out = []; let s = start;
  for (const tok of str.trim().split(/\s+/)) {
    const [n, l] = tok.split(':'); const len = +l || 2;
    if (n !== '-') out.push({ step: s, m: midi(n), len });
    s += len;
  }
  return out;
}
function arps(roots, pattern, bars, offset = 0) {
  const out = [];
  for (let b = 0; b < bars; b++) {
    const r = midi(roots[b % roots.length]);
    pattern.forEach((iv, i) => { if (iv !== null) out.push({ step: offset + b * 16 + i * (16 / pattern.length), m: r + iv, len: 16 / pattern.length }); });
  }
  return out;
}
function hits(bars, steps, offset = 0) { const out = []; for (let b = 0; b < bars; b++) for (const s of steps) out.push({ step: offset + b * 16 + s, m: 0, len: 1 }); return out; }

const SONGS = {
  title: { bpm: 60, bars: 8, tracks: [
    { inst: 'pluck', vel: 0.5, notes: seq('D4:4 A4:4 D5:8 B4:4 A4:2 F#4:2 E4:8 F#4:4 A4:4 B4:4 D5:4 E5:12 -:4 D5:4 B4:4 A4:8 F#4:4 E4:2 D4:2 E4:8 A3:4 D4:4 E4:4 F#4:4 D4:16') },
    { inst: 'flute', vel: 0.22, notes: seq('-:64 A5:12 B5:4 D6:16 B5:8 A5:8 F#5:16') },
    { inst: 'drone', vel: 0.5, notes: [{ step: 0, m: midi('D2'), len: 128 }, { step: 0, m: midi('A2'), len: 128 }] },
  ] },
  town: { bpm: 84, bars: 8, tracks: [
    { inst: 'flute', vel: 0.28, notes: seq('A4:4 B4:2 D5:2 E5:6 D5:2 B4:4 A4:4 F#4:8 E4:4 F#4:2 A4:2 B4:4 D5:4 A4:12 -:4 D5:4 E5:2 F#5:2 E5:4 D5:4 B4:4 D5:2 B4:2 A4:8 F#4:4 A4:4 E4:4 F#4:2 E4:2 D4:12 -:4') },
    { inst: 'pluck', vel: 0.3, notes: arps(['D3', 'B2', 'G2', 'A2', 'D3', 'B2', 'G2', 'A2'], [0, 7, 12, 4, 7, 12, 14, 7], 8) },
    { inst: 'drone', vel: 0.35, notes: [{ step: 0, m: midi('D2'), len: 128 }] },
    { inst: 'block', vel: 0.12, notes: hits(8, [0, 6, 8]) },
  ] },
  forest: { bpm: 66, bars: 8, wind: true, tracks: [
    { inst: 'flute', vel: 0.24, notes: seq('E5:8 D5:4 C5:4 A4:12 -:4 G4:4 A4:4 C5:4 D5:4 E5:16 G5:6 E5:2 D5:8 C5:4 D5:4 A4:8 G4:4 E4:4 G4:4 A4:4 A4:16') },
    { inst: 'pluck', vel: 0.28, notes: arps(['A2', 'F2', 'C3', 'G2', 'A2', 'F2', 'G2', 'E2'], [0, null, 7, 12, null, 15, 7, null], 8) },
    { inst: 'drone', vel: 0.3, notes: [{ step: 0, m: midi('A1'), len: 128 }] },
  ] },
  ruins: { bpm: 58, bars: 8, wind: true, tracks: [
    { inst: 'pluck', vel: 0.4, notes: seq('E4:6 G4:2 A4:8 B4:4 A4:4 G4:8 E4:6 D4:2 E4:8 -:16 B4:6 D5:2 E5:8 D5:4 B4:4 A4:8 G4:4 A4:2 G4:2 E4:8 -:16') },
    { inst: 'drone', vel: 0.45, notes: [{ step: 0, m: midi('E2'), len: 128 }, { step: 0, m: midi('B2'), len: 128 }] },
    { inst: 'tom', vel: 0.35, notes: hits(8, [0, 10]) },
    { inst: 'flute', vel: 0.12, notes: seq('-:96 B5:16 A5:8 G5:8') },
  ] },
  battle: { bpm: 142, bars: 8, tracks: [
    { inst: 'pluck', vel: 0.32, notes: arps(['A2', 'A2', 'F2', 'G2', 'A2', 'A2', 'F2', 'E2'], [0, 0, 7, 0, 10, 0, 12, 7], 8) },
    { inst: 'flute', vel: 0.26, notes: seq('A4:2 C5:2 D5:2 E5:4 G5:2 E5:2 D5:2 C5:4 A4:4 G4:4 A4:4 E5:2 G5:2 A5:4 G5:2 E5:2 D5:4 E5:12 -:4 A5:4 G5:2 E5:2 D5:4 C5:4 D5:2 E5:2 D5:2 C5:2 A4:8 C5:4 D5:4 E5:4 G5:4 A5:12 -:4') },
    { inst: 'tom', vel: 0.55, notes: hits(8, [0, 6, 8, 11]) },
    { inst: 'block', vel: 0.18, notes: hits(8, [4, 12, 14]) },
  ] },
  boss: { bpm: 152, bars: 8, tracks: [
    { inst: 'pluck', vel: 0.36, notes: arps(['D2', 'D2', 'A#1', 'C2', 'D2', 'D2', 'F2', 'C2'], [0, 12, 0, 15, 0, 12, 17, 15], 8) },
    { inst: 'flute', vel: 0.27, notes: seq('D5:6 F5:2 G5:4 A5:4 C6:4 A5:4 G5:8 F5:4 G5:4 A5:2 G5:2 F5:2 D5:2 D5:16 A5:4 C6:4 D6:8 C6:4 A5:4 G5:8 F5:2 G5:2 A5:4 G5:4 F5:4 D5:16') },
    { inst: 'tom', vel: 0.65, notes: hits(8, [0, 3, 6, 8, 11, 14]) },
    { inst: 'gong', vel: 0.35, notes: hits(2, [0], 0).map((n, i) => ({ ...n, step: i * 64 })) },
    { inst: 'drone', vel: 0.4, notes: [{ step: 0, m: midi('D1'), len: 128 }] },
  ] },
  victory: { bpm: 124, bars: 3, once: true, tracks: [
    { inst: 'pluck', vel: 0.45, notes: seq('A4:2 C5:2 E5:2 A5:6 G5:2 E5:2 G5:2 A5:16 -:14') },
    { inst: 'pluck', vel: 0.3, notes: seq('A3:4 E4:4 A4:24') },
    { inst: 'gong', vel: 0.15, notes: [{ step: 0, m: 0, len: 1 }] },
  ] },
  ending: { bpm: 64, bars: 8, tracks: [
    { inst: 'flute', vel: 0.28, notes: seq('A4:4 B4:2 D5:2 E5:6 D5:2 B4:4 A4:4 F#4:8 E4:4 F#4:2 A4:2 B4:4 D5:4 A4:12 -:4 D5:4 E5:2 F#5:2 E5:4 D5:4 B4:4 D5:2 B4:2 A4:8 F#4:4 A4:4 E4:4 F#4:2 E4:2 D4:16') },
    { inst: 'pluck', vel: 0.25, notes: arps(['D3', 'B2', 'G2', 'A2', 'D3', 'B2', 'G2', 'D3'], [0, 7, 12, 16], 8) },
    { inst: 'drone', vel: 0.3, notes: [{ step: 0, m: midi('D2'), len: 128 }] },
  ] },
  tension: { bpm: 70, bars: 4, tracks: [
    { inst: 'drone', vel: 0.5, notes: [{ step: 0, m: midi('D2'), len: 64 }, { step: 0, m: midi('D#2'), len: 64 }] },
    { inst: 'tom', vel: 0.4, notes: hits(4, [0, 3]) },
    { inst: 'pluck', vel: 0.3, notes: seq('D3:6 D#3:2 -:8 D3:6 A#2:2 -:8 D3:4 F3:4 D#3:8 -:16') },
  ] },
};

export class Audio {
  constructor() {
    this.ctx = null; this.cur = null; this.musicVol = 0.6; this.sfxVol = 0.8; this.queued = null;
  }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = (this.ctx = new AC());
    this.master = c.createDynamicsCompressor();
    this.master.connect(c.destination);
    this.music = c.createGain(); this.music.gain.value = this.musicVol; this.music.connect(this.master);
    this.sfx = c.createGain(); this.sfx.gain.value = this.sfxVol; this.sfx.connect(this.master);
    // 混响
    this.verb = c.createConvolver();
    const len = c.sampleRate * 2.8, buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    this.verb.buffer = buf;
    const vg = c.createGain(); vg.gain.value = 0.42; this.verb.connect(vg); vg.connect(this.master);
    this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const nd = this.noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    setInterval(() => this.tick(), 30);
    if (this.queued) { const q = this.queued; this.queued = null; this.play(q); }
  }
  setVolume(music, sfx) {
    this.musicVol = music; this.sfxVol = sfx;
    if (this.ctx) { this.music.gain.value = music; this.sfx.gain.value = sfx; }
  }
  play(name) {
    if (!this.ctx) { this.queued = name; return; }
    if (this.cur?.name === name) return;
    const c = this.ctx;
    if (this.cur) { const old = this.cur; old.gain.gain.setTargetAtTime(0, c.currentTime, 0.4); setTimeout(() => old.gain.disconnect(), 2500); old.dead = true; }
    if (!name || !SONGS[name]) { this.cur = null; return; }
    const song = SONGS[name];
    const gain = c.createGain(); gain.gain.value = 0; gain.gain.setTargetAtTime(1, c.currentTime, 0.3);
    gain.connect(this.music);
    const events = [];
    song.tracks.forEach((t) => t.notes.forEach((n) => events.push({ ...n, inst: t.inst, vel: t.vel })));
    events.sort((a, b) => a.step - b.step);
    const stepDur = 60 / song.bpm / 4;
    this.cur = { name, song, gain, events, idx: 0, start: c.currentTime + 0.1, stepDur, loopLen: song.bars * 16 };
    if (song.wind) this.windNode(gain);
  }
  stopMusic() { this.play(null); }
  tick() {
    const s = this.cur; if (!s || s.dead) return;
    const c = this.ctx, ahead = c.currentTime + 0.15;
    while (true) {
      if (s.idx >= s.events.length) {
        if (s.song.once) return;
        s.idx = 0; s.start += s.loopLen * s.stepDur;
      }
      const e = s.events[s.idx];
      const t = s.start + e.step * s.stepDur;
      if (t > ahead) break;
      if (t > c.currentTime - 0.05) this.inst(e.inst, t, e.m, e.vel, e.len * s.stepDur, s.gain);
      s.idx++;
    }
  }
  inst(kind, t, m, vel, dur, out) {
    const c = this.ctx;
    if (kind === 'pluck') return this.pluck(t, hz(m), vel, out);
    if (kind === 'flute') return this.flute(t, hz(m), vel, dur, out);
    if (kind === 'drone') return this.drone(t, hz(m), vel, dur, out);
    if (kind === 'tom') return this.tom(t, vel, out);
    if (kind === 'block') return this.block(t, vel, out);
    if (kind === 'gong') return this.gong(t, vel, out);
    void c;
  }
  env(t, a, peak, decay, node) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + decay);
    if (node) g.connect(node);
    return g;
  }
  pluck(t, f, vel, out) {
    const c = this.ctx;
    const g = this.env(t, 0.004, vel, 1.6, out);
    const send = c.createGain(); send.gain.value = 0.35; g.connect(send); send.connect(this.verb);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(5200, t); lp.frequency.exponentialRampToValueAtTime(700, t + 0.6); lp.connect(g);
    const o1 = c.createOscillator(); o1.type = 'triangle'; o1.frequency.setValueAtTime(f * 1.012, t); o1.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    const o2 = c.createOscillator(); o2.type = 'sawtooth'; o2.frequency.setValueAtTime(f * 2, t);
    const g2 = c.createGain(); g2.gain.value = 0.12;
    o1.connect(lp); o2.connect(g2); g2.connect(lp);
    o1.start(t); o2.start(t); o1.stop(t + 1.8); o2.stop(t + 1.8);
  }
  flute(t, f, vel, dur, out) {
    const c = this.ctx;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + 0.09);
    g.gain.setValueAtTime(vel, t + Math.max(0.1, dur - 0.08)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.2);
    g.connect(out);
    const send = c.createGain(); send.gain.value = 0.6; g.connect(send); send.connect(this.verb);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(f * 0.985, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.07);
    const lfo = c.createOscillator(); lfo.frequency.value = 5.4; const lg = c.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.6, dur));
    lfo.connect(lg); lg.connect(o.frequency);
    const o2 = c.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f; const g2 = c.createGain(); g2.gain.value = 0.18; o2.connect(g2); g2.connect(g);
    o.connect(g);
    const n = c.createBufferSource(); n.buffer = this.noise; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 2;
    const ng = c.createGain(); ng.gain.value = 0.08; n.connect(bp); bp.connect(ng); ng.connect(g);
    const end = t + dur + 0.25;
    [o, o2, lfo, n].forEach((x) => { x.start(t); x.stop(end); });
  }
  drone(t, f, vel, dur, out) {
    const c = this.ctx;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel * 0.12, t + 1.5);
    g.gain.setValueAtTime(vel * 0.12, t + dur - 1); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.5);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.connect(g); g.connect(out);
    for (const d of [-4, 4]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d; o.connect(lp); o.start(t); o.stop(t + dur + 0.6); }
  }
  tom(t, vel, out) {
    const c = this.ctx;
    const g = this.env(t, 0.003, vel, 0.4, out);
    const o = c.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.3);
    o.connect(g); o.start(t); o.stop(t + 0.45);
  }
  block(t, vel, out) {
    const c = this.ctx;
    const g = this.env(t, 0.002, vel, 0.07, out);
    const o = c.createOscillator(); o.frequency.value = 1150; o.connect(g); o.start(t); o.stop(t + 0.1);
  }
  gong(t, vel, out) {
    const c = this.ctx;
    const g = this.env(t, 0.01, vel, 4.5, out);
    const send = c.createGain(); send.gain.value = 0.5; g.connect(send); send.connect(this.verb);
    [1, 1.47, 2.09, 2.76, 3.41, 4.2].forEach((r, i) => {
      const o = c.createOscillator(); o.frequency.setValueAtTime(98 * r * 1.03, t); o.frequency.exponentialRampToValueAtTime(98 * r, t + 1.2);
      const og = c.createGain(); og.gain.value = 0.5 / (i + 1); o.connect(og); og.connect(g); o.start(t); o.stop(t + 4.6);
    });
  }
  windNode(out) {
    const c = this.ctx;
    const n = c.createBufferSource(); n.buffer = this.noise; n.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.7;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.08; const lg = c.createGain(); lg.gain.value = 300; lfo.connect(lg); lg.connect(bp.frequency);
    const g = c.createGain(); g.gain.value = 0.05;
    n.connect(bp); bp.connect(g); g.connect(out); n.start(); lfo.start();
  }
  // ---------- 音效 ----------
  sfxPlay(name) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + 0.01, o = this.sfx;
    const tone = (f, d, type = 'sine', v = 0.3, f2 = null, at = t) => {
      const g = this.env(at, 0.004, v, d, o); const x = c.createOscillator(); x.type = type; x.frequency.setValueAtTime(f, at);
      if (f2) x.frequency.exponentialRampToValueAtTime(f2, at + d); x.connect(g); x.start(at); x.stop(at + d + 0.05);
    };
    const noise = (d, fType = 'lowpass', f = 1200, v = 0.4, f2 = null, at = t) => {
      const g = this.env(at, 0.004, v, d, o); const n = c.createBufferSource(); n.buffer = this.noise;
      const fl = c.createBiquadFilter(); fl.type = fType; fl.frequency.setValueAtTime(f, at); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, at + d);
      n.connect(fl); fl.connect(g); n.start(at); n.stop(at + d + 0.05);
    };
    switch (name) {
      case 'cursor': tone(1300, 0.04, 'triangle', 0.12); break;
      case 'confirm': tone(880, 0.08, 'triangle', 0.2); tone(1320, 0.12, 'triangle', 0.18, null, t + 0.05); break;
      case 'cancel': tone(500, 0.08, 'triangle', 0.18, 380); break;
      case 'talk': tone(700 + Math.random() * 120, 0.03, 'square', 0.04); break;
      case 'hit': noise(0.12, 'lowpass', 3000, 0.5, 300); tone(120, 0.12, 'sine', 0.5, 50); break;
      case 'weak': noise(0.15, 'highpass', 2000, 0.4); tone(160, 0.15, 'square', 0.25, 60); tone(1800, 0.2, 'sine', 0.15, 1200); break;
      case 'break': this.gong(t, 0.5, o); noise(0.6, 'highpass', 1500, 0.4, 6000); tone(80, 0.5, 'sine', 0.6, 30); break;
      case 'slash': noise(0.15, 'bandpass', 3000, 0.4, 800); break;
      case 'bow': noise(0.08, 'highpass', 4000, 0.3); tone(900, 0.08, 'triangle', 0.12, 400); break;
      case 'fire': noise(0.5, 'lowpass', 600, 0.5, 2500); noise(0.4, 'bandpass', 300, 0.3); break;
      case 'water': noise(0.5, 'bandpass', 2400, 0.4, 400); tone(600, 0.3, 'sine', 0.1, 300); break;
      case 'metal': [2400, 3170, 4100].forEach((f) => tone(f, 0.5, 'sine', 0.1)); noise(0.1, 'highpass', 5000, 0.3); break;
      case 'wood': for (let i = 0; i < 4; i++) tone(1200 + i * 180, 0.06, 'triangle', 0.12, null, t + i * 0.07); break;
      case 'heal': [880, 1108, 1318, 1760].forEach((f, i) => tone(f, 0.4, 'sine', 0.12, null, t + i * 0.08)); break;
      case 'buff': [523, 659, 784].forEach((f, i) => tone(f, 0.3, 'triangle', 0.12, null, t + i * 0.06)); break;
      case 'boost': tone(300, 0.25, 'sawtooth', 0.12, 900); break;
      case 'encounter': noise(0.8, 'bandpass', 400, 0.5, 4000); tone(110, 0.5, 'sawtooth', 0.2, 55); tone(117, 0.5, 'sawtooth', 0.2, 58); break;
      case 'item': [1046, 1318, 1568].forEach((f, i) => tone(f, 0.25, 'triangle', 0.15, null, t + i * 0.07)); break;
      case 'levelup': [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.35, 'triangle', 0.16, null, t + i * 0.09)); break;
      case 'seal': tone(200, 0.8, 'sine', 0.3, 1600); [1318, 1760].forEach((f, i) => tone(f, 0.6, 'sine', 0.12, null, t + 0.6 + i * 0.1)); break;
      case 'door': noise(0.6, 'lowpass', 300, 0.4, 100); tone(70, 0.6, 'sawtooth', 0.15, 40); break;
      case 'whoosh': noise(0.45, 'bandpass', 300, 0.35, 2500); break;
      case 'roar': noise(1.2, 'lowpass', 250, 0.7, 900); tone(65, 1.2, 'sawtooth', 0.35, 40); tone(69, 1.2, 'sawtooth', 0.3, 43); break;
      case 'gear': for (let i = 0; i < 6; i++) tone(300 + (i % 2) * 80, 0.04, 'square', 0.08, null, t + i * 0.06); break;
      case 'chime': [1568, 2093].forEach((f, i) => tone(f, 0.8, 'sine', 0.1, null, t + i * 0.12)); break;
      case 'dodge': tone(600, 0.1, 'sine', 0.1, 900); break;
      case 'ko': tone(300, 0.6, 'triangle', 0.2, 80); break;
    }
  }
}

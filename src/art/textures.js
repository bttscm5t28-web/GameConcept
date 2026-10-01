// 程序化生成的像素贴图（16px = 1 格）
import * as THREE from 'three';
import { makeCanvas, rng, shade, mix, pixelTex, softTex, pixelize, hash2 } from './pixel.js';

const cache = new Map();
function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

export const PAL = {
  grass: ['#4f7d3f', '#5f8f47', '#6fa04f', '#86b45a', '#3f6a36'],
  dirt: ['#8a6b47', '#9b7a52', '#7a5c3c', '#ad8c5f', '#6a4e33'],
  stone: ['#8f8c84', '#9f9b91', '#7c7a73', '#b0aca1', '#65635e'],
  sand: ['#cdb88a', '#d8c597', '#bfa979', '#e2d1a6'],
  wood: ['#8b5a34', '#9c6a3e', '#7a4c2b', '#ab7a4a', '#5f3a20'],
  rock: ['#6e6a62', '#7c776d', '#5d5952', '#8c877b', '#4b4843'],
  moss: ['#4d6b3b', '#5b7b44'],
};

function speckle(g, size, base, others, seed, p = 0.35) {
  const r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (r() < p) { g.fillStyle = others[Math.floor(r() * others.length)]; g.fillRect(x, y, 1, 1); }
  }
}

export function grassTex(variant = 0) {
  return cached('grass' + variant, () => {
    const [c, g] = makeCanvas(16, 16);
    const P = PAL.grass;
    speckle(g, 16, P[1], [P[0], P[2], P[0]], 11 + variant * 7, 0.42);
    const r = rng(91 + variant * 13);
    for (let i = 0; i < 7; i++) { // 草叶
      const x = Math.floor(r() * 15), y = Math.floor(r() * 14) + 1;
      g.fillStyle = P[3]; g.fillRect(x, y, 1, 1);
      g.fillStyle = P[4]; g.fillRect(x, y + 1, 1, 1);
    }
    if (variant === 2) { // 小花
      for (let i = 0; i < 3; i++) {
        const x = Math.floor(r() * 14) + 1, y = Math.floor(r() * 14) + 1;
        g.fillStyle = ['#f2e6c4', '#e9a3b0', '#f0d26a'][i % 3]; g.fillRect(x, y, 1, 1);
      }
    }
    return pixelTex(c);
  });
}

export function dirtTex(variant = 0) {
  return cached('dirt' + variant, () => {
    const [c, g] = makeCanvas(16, 16);
    const P = PAL.dirt;
    speckle(g, 16, P[1], [P[0], P[2], P[3]], 21 + variant, 0.45);
    const r = rng(5 + variant);
    for (let i = 0; i < 4; i++) {
      const x = Math.floor(r() * 14), y = Math.floor(r() * 14);
      g.fillStyle = P[3]; g.fillRect(x, y, 2, 1);
      g.fillStyle = P[4]; g.fillRect(x, y + 1, 2, 1);
    }
    return pixelTex(c);
  });
}

export function stoneTex(variant = 0) {
  return cached('stone' + variant, () => {
    const [c, g] = makeCanvas(16, 16);
    const P = PAL.stone;
    speckle(g, 16, P[1], [P[0], P[3]], 31 + variant, 0.3);
    g.fillStyle = P[4];
    // 石板缝
    const off = variant % 2 ? 8 : 0;
    g.fillRect(0, 7, 16, 1); g.fillRect(0, 15, 16, 1);
    g.fillRect((4 + off) % 16, 0, 1, 7); g.fillRect((12 + off) % 16, 8, 1, 7);
    g.fillStyle = P[3];
    g.fillRect(0, 8, 16, 1); g.fillRect(0, 0, 16, 1);
    if (variant === 2) { g.fillStyle = PAL.moss[0]; g.fillRect(2, 6, 3, 1); g.fillRect(9, 14, 4, 1); g.fillStyle = PAL.moss[1]; g.fillRect(3, 5, 1, 1); }
    return pixelTex(c);
  });
}

export function sandTex(variant = 0) {
  return cached('sand' + variant, () => {
    const [c, g] = makeCanvas(16, 16);
    const P = PAL.sand;
    speckle(g, 16, P[0], [P[1], P[2], P[3]], 41 + variant, 0.4);
    return pixelTex(c);
  });
}

export function woodTex(variant = 0) {
  return cached('wood' + variant, () => {
    const [c, g] = makeCanvas(16, 16);
    const P = PAL.wood;
    const r = rng(51 + variant);
    for (let y = 0; y < 16; y++) {
      const plank = Math.floor(y / 4);
      const base = P[(plank + variant) % 4];
      for (let x = 0; x < 16; x++) {
        g.fillStyle = r() < 0.15 ? shade(base, -0.12) : base;
        g.fillRect(x, y, 1, 1);
      }
      if (y % 4 === 3) { g.fillStyle = P[4]; g.fillRect(0, y, 16, 1); }
    }
    g.fillStyle = '#3d2614'; g.fillRect(2, 1, 1, 1); g.fillRect(13, 9, 1, 1);
    return pixelTex(c);
  });
}

export function rockSideTex(variant = 0) {
  return cached('rockside' + variant, () => {
    const [c, g] = makeCanvas(16, 16);
    const P = PAL.rock;
    speckle(g, 16, P[1], [P[0], P[2]], 61 + variant, 0.35);
    const r = rng(71 + variant);
    for (let i = 0; i < 4; i++) { // 地层
      const y = 2 + i * 4 + Math.floor(r() * 2);
      g.fillStyle = P[4]; g.fillRect(0, y, 16, 1);
      g.fillStyle = P[3]; g.fillRect(0, y - 1, 16, 1);
    }
    for (let i = 0; i < 3; i++) { g.fillStyle = P[4]; g.fillRect(Math.floor(r() * 16), Math.floor(r() * 16), 1, 3); }
    return pixelTex(c);
  });
}

export function grassSideTex() {
  return cached('grassside', () => {
    const [c, g] = makeCanvas(16, 16);
    speckle(g, 16, PAL.dirt[2], [PAL.dirt[4], PAL.dirt[0]], 81, 0.4);
    const r = rng(83);
    for (let x = 0; x < 16; x++) {
      const d = 3 + Math.floor(r() * 3);
      for (let y = 0; y < d; y++) { g.fillStyle = y === d - 1 ? PAL.grass[4] : PAL.grass[y % 2 ? 1 : 2]; g.fillRect(x, y, 1, 1); }
    }
    return pixelTex(c);
  });
}

export function roofTex(color = '#4b5866') {
  return cached('roof' + color, () => {
    const [c, g] = makeCanvas(16, 16);
    g.fillStyle = color; g.fillRect(0, 0, 16, 16);
    for (let x = 0; x < 16; x += 4) { // 筒瓦垄
      g.fillStyle = shade(color, 0.22); g.fillRect(x, 0, 1, 16);
      g.fillStyle = shade(color, 0.1); g.fillRect(x + 1, 0, 1, 16);
      g.fillStyle = shade(color, -0.35); g.fillRect(x + 3, 0, 1, 16);
    }
    for (let y = 3; y < 16; y += 4) { g.fillStyle = shade(color, -0.2); g.fillRect(0, y, 16, 1); }
    return pixelTex(c);
  });
}

// 房屋正立面：白墙、木框、门窗
export function facadeTex(wCells, hCells, { wall = '#e8dfcc', frame = '#5a3a22', door = true, doorX = 0.5, windows = 2, sign = null, seed = 1 } = {}) {
  const key = `facade${wCells}_${hCells}_${wall}_${frame}_${door}_${doorX}_${windows}_${sign}_${seed}`;
  return cached(key, () => {
    const W = wCells * 16, H = hCells * 16;
    const [c, g] = makeCanvas(W, H);
    const r = rng(seed);
    g.fillStyle = wall; g.fillRect(0, 0, W, H);
    for (let i = 0; i < W * H * 0.12; i++) { // 墙面斑驳
      g.fillStyle = r() < 0.5 ? shade(wall, -0.06) : shade(wall, 0.05);
      g.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1, 1);
    }
    // 墙基（石）
    g.fillStyle = '#7d786f'; g.fillRect(0, H - 4, W, 4);
    g.fillStyle = '#5f5b54'; g.fillRect(0, H - 4, W, 1);
    // 木框
    g.fillStyle = frame;
    g.fillRect(0, 0, 2, H); g.fillRect(W - 2, 0, 2, H); g.fillRect(0, 0, W, 2);
    g.fillRect(0, Math.floor(H * 0.42), W, 1);
    for (let x = 16; x < W - 4; x += 16) g.fillRect(x, 0, 1, H - 4);
    const dw = 10, dh = Math.min(H - 6, 18);
    const dx = Math.floor(W * doorX - dw / 2);
    if (door) {
      g.fillStyle = '#3b2617'; g.fillRect(dx - 1, H - 4 - dh - 1, dw + 2, dh + 1);
      g.fillStyle = '#6b3f22'; g.fillRect(dx, H - 4 - dh, dw, dh);
      g.fillStyle = '#7d4c2a'; g.fillRect(dx, H - 4 - dh, dw / 2 - 1, dh);
      g.fillStyle = '#c99a3a'; g.fillRect(dx + dw / 2 - 2, H - 4 - dh / 2, 1, 1); g.fillRect(dx + dw / 2 + 1, H - 4 - dh / 2, 1, 1);
      g.fillStyle = '#b8322a'; g.fillRect(dx - 3, H - 4 - dh - 1, 2, 10); g.fillRect(dx + dw + 1, H - 4 - dh - 1, 2, 10); // 春联
    }
    // 窗（格栅）
    const slots = [];
    for (let i = 0; i < windows; i++) slots.push((i + 1) / (windows + 1));
    slots.forEach((t) => {
      const wx = Math.floor(W * t - 5), wy = Math.floor(H * 0.42) - 9;
      if (door && Math.abs(wx + 5 - (dx + dw / 2)) < 12) return;
      g.fillStyle = '#3b2617'; g.fillRect(wx - 1, wy - 1, 12, 10);
      g.fillStyle = '#f3d08a'; g.fillRect(wx, wy, 10, 8);
      g.fillStyle = '#6b3f22';
      for (let k = 0; k < 10; k += 3) g.fillRect(wx + k, wy, 1, 8);
      for (let k = 0; k < 8; k += 3) g.fillRect(wx, wy + k, 10, 1);
    });
    if (sign) { // 匾额
      const sw = 22, sx = Math.floor(W / 2 - sw / 2);
      g.fillStyle = '#2b1d14'; g.fillRect(sx - 1, 2, sw + 2, 11);
      g.fillStyle = '#1d2a3a'; g.fillRect(sx, 3, sw, 9);
      g.fillStyle = '#e2b84e'; g.font = '10px JDKai, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(sign, W / 2, 8);
    }
    return pixelTex(c);
  });
}

export function plainWallTex(wall = '#e8dfcc', frame = '#5a3a22') {
  return cached('pwall' + wall + frame, () => {
    const [c, g] = makeCanvas(16, 16);
    g.fillStyle = wall; g.fillRect(0, 0, 16, 16);
    const r = rng(3);
    for (let i = 0; i < 30; i++) { g.fillStyle = shade(wall, r() < 0.5 ? -0.06 : 0.05); g.fillRect(Math.floor(r() * 16), Math.floor(r() * 16), 1, 1); }
    g.fillStyle = frame; g.fillRect(0, 0, 1, 16); g.fillRect(0, 0, 16, 1);
    return pixelTex(c, { repeat: [1, 1] });
  });
}

export function barkTex() {
  return cached('bark', () => {
    const [c, g] = makeCanvas(16, 16);
    speckle(g, 16, '#5e4430', ['#4a3424', '#6f5139'], 101, 0.4);
    g.fillStyle = '#3a281b';
    for (let x = 1; x < 16; x += 4) g.fillRect(x, 0, 1, 16);
    return pixelTex(c);
  });
}

export function foliageTex(base = '#4f7d3f', seed = 1) {
  return cached('fol' + base + seed, () => {
    const [c, g] = makeCanvas(16, 16);
    const r = rng(seed);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = r();
      g.fillStyle = v < 0.25 ? shade(base, -0.25) : v < 0.7 ? base : v < 0.92 ? shade(base, 0.18) : shade(base, 0.38);
      g.fillRect(x, y, 1, 1);
    }
    return pixelTex(c);
  });
}

export function blossomTex() {
  return cached('blossom', () => {
    const [c, g] = makeCanvas(16, 16);
    const r = rng(7);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const v = r();
      g.fillStyle = v < 0.2 ? '#b75f7a' : v < 0.6 ? '#e48aa4' : v < 0.88 ? '#f2b6c6' : '#fff0f2';
      g.fillRect(x, y, 1, 1);
    }
    return pixelTex(c);
  });
}

export function bambooStalkTex() {
  return cached('bamboo', () => {
    const [c, g] = makeCanvas(8, 32);
    for (let y = 0; y < 32; y++) {
      g.fillStyle = '#5c8a3c'; g.fillRect(0, y, 8, 1);
      g.fillStyle = '#7aa84d'; g.fillRect(1, y, 2, 1);
      g.fillStyle = '#466e2f'; g.fillRect(6, y, 2, 1);
    }
    g.fillStyle = '#c9d98a'; g.fillRect(0, 15, 8, 1); g.fillRect(0, 31, 8, 1);
    g.fillStyle = '#3a5a28'; g.fillRect(0, 16, 8, 1); g.fillRect(0, 0, 8, 1);
    return pixelTex(c, { repeat: [1, 1] });
  });
}

// 竹叶簇（透明）
export function bambooLeafTex(seed = 3) {
  return cached('bleaf' + seed, () => {
    const [c, g] = makeCanvas(48, 48);
    const r = rng(seed);
    const cols = ['#4d7a35', '#6a9a44', '#86b558', '#3c6129'];
    for (let i = 0; i < 26; i++) {
      const cx = 6 + r() * 36, cy = 6 + r() * 36, ang = (r() - 0.5) * 2.2 + 0.6, len = 6 + r() * 7;
      g.save(); g.translate(cx, cy); g.rotate(ang);
      g.fillStyle = cols[Math.floor(r() * cols.length)];
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.5, -2.2, len, 0); g.quadraticCurveTo(len * 0.5, 2.2, 0, 0); g.fill();
      g.restore();
    }
    pixelize(c, { outlineColor: '#2a4220', threshold: 90 });
    return pixelTex(c, { mip: false });
  });
}

export function grassTuftTex(kind = 0) {
  return cached('tuft' + kind, () => {
    const [c, g] = makeCanvas(16, 16);
    const r = rng(17 + kind);
    const cols = kind === 2 ? ['#9bb860', '#c2cf7a'] : ['#5f8f47', '#86b45a', '#4f7d3f'];
    for (let i = 0; i < 9; i++) {
      const x = 2 + Math.floor(r() * 12), h = 4 + Math.floor(r() * 7);
      g.fillStyle = cols[i % cols.length];
      for (let y = 0; y < h; y++) g.fillRect(x + Math.round(Math.sin(y * 0.5 + i) * (y / h) * 1.5), 15 - y, 1, 1);
    }
    if (kind === 1) { // 野花
      const fc = ['#f4e7c5', '#e48aa4', '#f0d26a', '#a9b8f0'];
      for (let i = 0; i < 3; i++) { g.fillStyle = fc[Math.floor(r() * 4)]; const x = 3 + Math.floor(r() * 10), y = 5 + Math.floor(r() * 5); g.fillRect(x, y, 2, 2); g.fillStyle = '#f0d26a'; g.fillRect(x, y, 1, 1); }
    }
    return pixelTex(c, { mip: false });
  });
}

export function bronzeTex() {
  return cached('bronze', () => {
    const [c, g] = makeCanvas(32, 32);
    const r = rng(9);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const v = r();
      g.fillStyle = v < 0.5 ? '#6b5a32' : v < 0.8 ? '#7d6b3c' : v < 0.93 ? '#4f7a66' : '#6fa08a';
      g.fillRect(x, y, 1, 1);
    }
    // 雷纹
    g.fillStyle = '#3c3018';
    for (let k = 0; k < 4; k++) {
      const ox = (k % 2) * 16, oy = Math.floor(k / 2) * 16;
      g.fillRect(ox + 2, oy + 2, 12, 1); g.fillRect(ox + 13, oy + 2, 1, 10); g.fillRect(ox + 5, oy + 11, 9, 1);
      g.fillRect(ox + 5, oy + 5, 1, 7); g.fillRect(ox + 5, oy + 5, 6, 1); g.fillRect(ox + 10, oy + 5, 1, 4); g.fillRect(ox + 8, oy + 8, 3, 1);
    }
    g.fillStyle = '#b39a58';
    for (let k = 0; k < 4; k++) { const ox = (k % 2) * 16, oy = Math.floor(k / 2) * 16; g.fillRect(ox + 2, oy + 1, 12, 1); }
    return pixelTex(c);
  });
}

export function steleTex(text = '') {
  return cached('stele' + text, () => {
    const [c, g] = makeCanvas(32, 48);
    speckle(g, 48, '#6f6c66', ['#5e5b55', '#7f7c75'], 5, 0.3);
    g.fillStyle = '#4c4a45';
    g.fillRect(3, 3, 26, 1); g.fillRect(3, 44, 26, 1); g.fillRect(3, 3, 1, 42); g.fillRect(28, 3, 1, 42);
    g.fillStyle = '#3b3934';
    const r = rng(text.length + 3);
    for (let col = 0; col < 4; col++) for (let row = 0; row < 7; row++) {
      if (r() < 0.15) continue;
      const x = 22 - col * 5, y = 7 + row * 5;
      g.fillRect(x, y, 3, 1); g.fillRect(x + 1, y, 1, 3); if (r() < 0.5) g.fillRect(x, y + 2, 3, 1);
    }
    return pixelTex(c);
  });
}

// 水墨远山（背景）
export function inkMountainsTex(layers = 4, { tint = '#5e7b78', sky = '#e9e2cf', seed = 3, w = 1024, h = 320 } = {}) {
  return cached(`ink${layers}${tint}${sky}${seed}${w}`, () => {
    const [c, g] = makeCanvas(w, h);
    const r = rng(seed);
    for (let L = 0; L < layers; L++) {
      const t = L / (layers - 1 || 1);
      const col = mix(mix(tint, sky, 0.72), shade(tint, -0.2), t);
      const base = h * (0.38 + t * 0.4);
      const amp = h * (0.36 - t * 0.17);
      const peaks = [];
      for (let i = 0; i < 5 + L * 2; i++) peaks.push({ x: r() * w, a: amp * (0.4 + r() * 0.7), s: 50 + r() * 140 });
      g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 2) {
        let y = base;
        for (const p of peaks) { const d = (x - p.x) / p.s; y -= p.a * Math.exp(-d * d) * (1 + 0.1 * Math.sin(x * 0.07 + L)); }
        y += Math.sin(x * 0.031 + L * 2) * 4 + (r() - 0.5) * 1.5;
        g.lineTo(x, y);
      }
      g.lineTo(w, h); g.closePath();
      const grd = g.createLinearGradient(0, base - amp, 0, h);
      grd.addColorStop(0, col); grd.addColorStop(0.55, mix(col, sky, 0.25)); grd.addColorStop(1, mix(col, sky, 0.75));
      g.fillStyle = grd; g.fill();
      // 皴擦
      g.globalAlpha = 0.12; g.strokeStyle = shade(col, -0.3);
      for (let i = 0; i < 40; i++) { const x = r() * w; g.beginPath(); g.moveTo(x, base - r() * amp * 0.7); g.lineTo(x + (r() - 0.5) * 30, base + 10); g.stroke(); }
      g.globalAlpha = 1;
    }
    // 底部雾
    const fog = g.createLinearGradient(0, h * 0.55, 0, h);
    fog.addColorStop(0, 'rgba(0,0,0,0)'); fog.addColorStop(1, sky);
    g.fillStyle = fog; g.fillRect(0, 0, w, h);
    const t = softTex(c);
    t.wrapS = THREE.RepeatWrapping;
    return t;
  });
}

export function skyTex(top, bottom, key = '') {
  return cached('sky' + top + bottom + key, () => {
    const [c, g] = makeCanvas(4, 256);
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, top); grd.addColorStop(1, bottom);
    g.fillStyle = grd; g.fillRect(0, 0, 4, 256);
    return softTex(c);
  });
}

export function radialTex(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', size = 64, key = '') {
  return cached('rad' + inner + outer + size + key, () => {
    const [c, g] = makeCanvas(size, size);
    const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, inner); grd.addColorStop(1, outer);
    g.fillStyle = grd; g.fillRect(0, 0, size, size);
    const t = softTex(c); t.colorSpace = THREE.NoColorSpace;
    return t;
  });
}

export function blobShadowTex() {
  return cached('blob', () => {
    const [c, g] = makeCanvas(32, 16);
    const grd = g.createRadialGradient(16, 8, 1, 16, 8, 15);
    grd.addColorStop(0, 'rgba(20,14,10,0.55)'); grd.addColorStop(1, 'rgba(20,14,10,0)');
    g.save(); g.scale(1, 0.5); g.translate(0, 8); g.restore();
    g.fillStyle = grd; g.fillRect(0, 0, 32, 16);
    return softTex(c);
  });
}

export function mistTex(seed = 1) {
  return cached('mist' + seed, () => {
    const [c, g] = makeCanvas(256, 128);
    const r = rng(seed);
    for (let i = 0; i < 70; i++) {
      const x = r() * 256, y = 30 + r() * 68, rad = 14 + r() * 36;
      const grd = g.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, 'rgba(255,255,255,0.22)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      // 横向重复无缝
      if (x < rad) { g.save(); g.translate(256, 0); g.fillRect(x - rad, y - rad, rad * 2, rad * 2); g.restore(); }
      if (x > 256 - rad) { g.save(); g.translate(-256, 0); g.fillRect(x - rad, y - rad, rad * 2, rad * 2); g.restore(); }
    }
    const t = softTex(c); t.wrapS = THREE.RepeatWrapping;
    return t;
  });
}

export function paperTex() {
  return cached('paper', () => {
    const S = 256;
    const [c, g] = makeCanvas(S, S);
    const img = g.createImageData(S, S);
    const r = rng(42);
    for (let i = 0; i < S * S; i++) {
      const v = 128 + (r() - 0.5) * 40;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    // 纸纤维
    g.globalAlpha = 0.25;
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = r() < 0.5 ? '#a0a0a0' : '#606060';
      const x = r() * S, y = r() * S, a = r() * Math.PI, l = 4 + r() * 14;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
}

// 带字的贴图（匾额、旗帜、符文）
export function glyphTex(text, { w = 32, h = 32, bg = null, fg = '#e2b84e', font = 'bold 22px serif', border = null, pixel = true } = {}) {
  return cached(`glyph${text}${w}${h}${bg}${fg}${font}${border}`, () => {
    const [c, g] = makeCanvas(w, h);
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    if (border) { g.strokeStyle = border; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2); }
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 1);
    if (pixel && !bg) pixelize(c, { outline: false, threshold: 90 });
    return pixel ? pixelTex(c, { mip: false }) : softTex(c);
  });
}

export function lanternTex() {
  return cached('lantern', () => {
    const [c, g] = makeCanvas(16, 16);
    g.fillStyle = '#d23c2c'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#f0603e'; g.fillRect(3, 0, 4, 16);
    g.fillStyle = '#9a2218'; g.fillRect(12, 0, 4, 16);
    g.fillStyle = '#e8b54a'; g.fillRect(0, 0, 16, 2); g.fillRect(0, 14, 16, 2);
    g.fillStyle = '#ffd9a0'; g.fillRect(6, 6, 3, 3);
    return pixelTex(c);
  });
}

export function hashPick(x, z, n, seed = 0) { return Math.floor(hash2(x, z, seed) * n); }

// 树冠叶片卡（透明像素簇）
export function leafCardTex(kind = 'green', seed = 1) {
  return cached('leafcard' + kind + seed, () => {
    const S = 64;
    const [c, g] = makeCanvas(S, S);
    const r = rng(seed * 13 + kind.length);
    const pal = {
      green: ['#3f6a36', '#4f7d3f', '#6a9a4a', '#86b45a', '#a8c870'],
      pine: ['#2a4a32', '#345a3a', '#46704a', '#5a8a58', '#7aa070'],
      peach: ['#c25a7a', '#e48aa4', '#f2b6c6', '#fff0f2', '#f8d0dc'],
      willow: ['#5a7a3a', '#7a9a4a', '#9ab85a', '#b8d07a', '#c8dc8a'],
      autumn: ['#8a4a2a', '#b8682a', '#d8902a', '#e8b84a', '#f0d070'],
    }[kind];
    // 外形：若干圆团叠加
    const blobs = [];
    for (let i = 0; i < 7; i++) blobs.push([S / 2 + (r() - 0.5) * S * 0.45, S / 2 + (r() - 0.5) * S * 0.35, S * (0.16 + r() * 0.12)]);
    const inside = (x, y) => blobs.some(([bx, by, br]) => (x - bx) ** 2 + (y - by) ** 2 < br * br);
    const img = g.createImageData(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (!inside(x, y)) continue;
      // 叶片光照：左上亮右下暗 + 噪声
      const light = 1 - (x / S) * 0.5 - (y / S) * 0.7 + (r() - 0.5) * 0.7;
      let idx = Math.max(0, Math.min(4, Math.floor(light * 3 + 1.2)));
      if (kind === 'peach' && r() < 0.12) idx = 3;
      const hex = pal[idx];
      const i = (y * S + x) * 4;
      img.data[i] = parseInt(hex.slice(1, 3), 16); img.data[i + 1] = parseInt(hex.slice(3, 5), 16); img.data[i + 2] = parseInt(hex.slice(5, 7), 16); img.data[i + 3] = 255;
    }
    // 边缘锯齿：随机挖掉
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      if (img.data[i + 3] && (!inside(x + 2, y) || !inside(x - 2, y) || !inside(x, y + 2) || !inside(x, y - 2)) && r() < 0.45) img.data[i + 3] = 0;
    }
    g.putImageData(img, 0, 0);
    if (kind === 'willow') { // 垂丝
      for (let i = 0; i < 18; i++) { const x = 4 + r() * (S - 8), y0 = S * 0.3 + r() * S * 0.3, len = 10 + r() * 20; g.fillStyle = pal[1 + Math.floor(r() * 3)]; g.fillRect(Math.floor(x), Math.floor(y0), 1, Math.floor(len)); }
    }
    pixelize(c, { outlineColor: kind === 'peach' ? '#7a3a4a' : '#22301c', threshold: 100 });
    return pixelTex(c, { mip: false });
  });
}

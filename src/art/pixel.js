// 像素美术基础工具：画布、随机数、颜色、描边、贴图
import * as THREE from 'three';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
}

export function rng(seed = 1) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

export function hash2(x, y, seed = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgbToHex([r, g, b]) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
// f>0 提亮，f<0 压暗；暗部偏冷、亮部偏暖，更有手绘感
export function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  if (f >= 0) return rgbToHex([r + (255 - r) * f, g + (250 - g) * f, b + (225 - b) * f]);
  const k = 1 + f;
  return rgbToHex([r * k, g * k + 4 * -f, b * k + 18 * -f]);
}
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

// 阈值化 alpha + 自动 1px 描边，让矢量绘制变成干净的像素画
export function pixelize(c, { outlineColor = '#1e1612', threshold = 110, outline = true } = {}) {
  const g = c.getContext('2d');
  const { width: w, height: h } = c;
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) d[i + 3] = d[i + 3] > threshold ? 255 : 0;
  if (outline) {
    const [or, og, ob] = hexToRgb(outlineColor);
    const src = new Uint8ClampedArray(d);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3]) continue;
      const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < w && yy < h && src[(yy * w + xx) * 4 + 3];
      if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) {
        d[i] = or; d[i + 1] = og; d[i + 2] = ob; d[i + 3] = 255;
      }
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

export function pixelTex(c, { mip = true, repeat = null } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = mip ? THREE.NearestMipmapLinearFilter : THREE.NearestFilter;
  t.generateMipmaps = mip;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.anisotropy = 4;
  return t;
}

export function softTex(c, repeat = null) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// 带高光/阴影的像素矩形（光从左上来）
export function prect(g, x, y, w, h, color, { hi = 0.18, lo = -0.25, edge = true } = {}) {
  g.fillStyle = color; g.fillRect(x, y, w, h);
  if (!edge || w < 2 || h < 2) return;
  g.fillStyle = shade(color, hi); g.fillRect(x, y, w, 1); g.fillRect(x, y, 1, h);
  g.fillStyle = shade(color, lo); g.fillRect(x + w - 1, y, 1, h); g.fillRect(x, y + h - 1, w, 1);
}

// 有序抖动噪声填充
export function ditherFill(g, x0, y0, w, h, colors, seed = 1, density = [0.5]) {
  const r = rng(seed);
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const v = r();
    let idx = 0;
    for (let k = 0; k < density.length; k++) if (v > density[k]) idx = k + 1;
    g.fillStyle = colors[Math.min(idx, colors.length - 1)];
    g.fillRect(x, y, 1, 1);
  }
}

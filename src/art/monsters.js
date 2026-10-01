// 程序化妖怪像素画（侧向朝右，面对右侧的我方）
import { makeCanvas, pixelize, pixelTex, shade, rng } from './pixel.js';

function ell(g, x, y, rx, ry, c, rot = 0) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill(); }
function poly(g, pts, c) { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); }
function rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }


function drawShanxiao(g, G, king) {

    // 后腿/身体
    ell(g, 22, 34, 16, 13, '#5a4a3e');
    ell(g, 20, 30, 13, 10, '#6e5c4c');
    ell(g, 26, 38, 8, 7, '#a8957c'); // 肚
    rect(g, 12, 42, 7, 10, '#4a3c32'); rect(g, 26, 43, 7, 9, '#4a3c32'); rect(g, 10, 50, 10, 3, '#2e2620'); rect(g, 25, 50, 10, 3, '#2e2620');
    // 白鬃
    for (let i = 0; i < 7; i++) ell(g, 18 + i * 3, 17 + Math.abs(i - 3), 5, 7, i % 2 ? '#e8e2d4' : '#cfc7b6', 0.3);
    // 头（山魈红鼻蓝颊）
    ell(g, 37, 22, 10, 9, '#5a4a3e');
    ell(g, 41, 24, 6, 7, '#3d6fa0');
    rect(g, 40, 17, 3, 13, '#d23c2c'); rect(g, 41, 17, 1, 13, '#f06a4a');
    rect(g, 38, 30, 7, 2, '#f0d8a0');
    [G, g].forEach((c) => { rect(c, 37, 20, 2, 2, '#ffb43a'); rect(c, 43, 20, 2, 2, '#ffb43a'); });
    // 长臂
    poly(g, [30, 26, 46, 34, 50, 46, 45, 47, 40, 37, 28, 32], '#5a4a3e');
    rect(g, 44, 45, 7, 4, '#3a2e26');
    poly(g, [12, 26, 4, 38, 6, 48, 10, 47, 11, 38, 18, 30], '#4e4036');
      if (king) {
      poly(g, [30, 10, 32, 3, 35, 9, 38, 2, 41, 9, 44, 3, 45, 12, 30, 13], '#e8c040');
      for (const c of [g, G]) rect(c, 37, 6, 2, 2, '#ff4a3a');
      rect(g, 44, 41, 7, 3, '#c9a24a'); rect(g, 4, 40, 6, 3, '#c9a24a');
      g.strokeStyle = '#a8241a'; g.lineWidth = 2; g.beginPath(); g.moveTo(14, 30); g.lineTo(30, 36); g.stroke();
    }
}
function drawPuppet(g, G, p) {

    const { W, Wd, Wl, B } = p;
    rect(g, 15, 42, 6, 13, Wd); rect(g, 26, 42, 6, 13, Wd); rect(g, 13, 54, 10, 3, '#3a2a1a'); rect(g, 25, 54, 10, 3, '#3a2a1a');
    rect(g, 16, 46, 4, 2, B); rect(g, 27, 46, 4, 2, B);
    rect(g, 11, 20, 26, 23, W); rect(g, 11, 20, 26, 2, Wl); rect(g, 35, 20, 2, 23, Wd);
    // 胸前齿轮
    ell(g, 24, 31, 7, 7, B); ell(g, 24, 31, 3, 3, '#6b5a32');
    for (let a = 0; a < 8; a++) rect(g, 23 + Math.cos(a * 0.785) * 8, 30 + Math.sin(a * 0.785) * 8, 3, 3, B);
    // 头
    rect(g, 14, 6, 20, 14, W); rect(g, 14, 6, 20, 2, Wl); rect(g, 32, 6, 2, 14, Wd);
    rect(g, 12, 3, 24, 4, '#3a2a1a'); rect(g, 22, 0, 4, 4, B);
    rect(g, 17, 11, 14, 4, '#2a1c12');
    [G, g].forEach((c) => rect(c, 26, 12, 4, 2, p.eye));
    // 臂与刃
    rect(g, 36, 22, 6, 7, Wd); rect(g, 38, 28, 5, 9, W); rect(g, 37, 36, 8, 3, B);
    poly(g, [44, 38, 46, 38, 46, 56, 43, 52], '#d8dee2');
    rect(g, 5, 22, 6, 7, Wd); rect(g, 4, 28, 5, 10, W);
      if (p.armor) { rect(g, 9, 19, 30, 4, '#c9a24a'); rect(g, 12, 2, 24, 2, '#c9a24a'); poly(g, [8, 20, 4, 14, 12, 18], '#c9a24a'); poly(g, [40, 20, 44, 14, 36, 18], '#c9a24a'); }
}

export const MONSTERS = {
  bamboo: { w: 40, h: 48, draw(g, G) {
    // 根须
    rect(g, 13, 41, 3, 6, '#6a5030'); rect(g, 23, 41, 3, 6, '#6a5030'); rect(g, 9, 45, 5, 2, '#5a4026'); rect(g, 25, 45, 6, 2, '#5a4026');
    // 竹身
    g.fillStyle = '#5c8a3c'; g.beginPath(); g.roundRect(11, 12, 18, 32, 6); g.fill();
    rect(g, 13, 13, 4, 30, '#7aa84d'); rect(g, 25, 13, 3, 30, '#466e2f');
    rect(g, 11, 22, 18, 2, '#c9d98a'); rect(g, 11, 34, 18, 2, '#c9d98a'); rect(g, 11, 24, 18, 1, '#3a5a28'); rect(g, 11, 36, 18, 1, '#3a5a28');
    // 叶臂
    ell(g, 6, 28, 7, 2.5, '#6a9a44', -0.6); ell(g, 34, 27, 7, 2.5, '#6a9a44', 0.6); ell(g, 4, 31, 5, 2, '#4d7a35', -0.2);
    // 叶冠
    for (let i = 0; i < 6; i++) ell(g, 14 + i * 2.5, 8 + (i % 2) * 2, 8, 2.4, i % 2 ? '#86b558' : '#4d7a35', -1.2 + i * 0.45);
    // 面
    rect(g, 15, 17, 12, 4, '#3a5a28');
    [G, g].forEach((c) => { rect(c, 17, 18, 3, 2, '#ffe36a'); rect(c, 23, 18, 3, 2, '#ffe36a'); });
    rect(g, 18, 26, 8, 2, '#2a3a1c'); rect(g, 19, 27, 1, 2, '#e8f0c0'); rect(g, 23, 27, 1, 2, '#e8f0c0');
  } },
  shanxiao: { w: 54, h: 54, draw(g, G) { drawShanxiao(g, G, false); } },
  shanxiaoKing: { w: 54, h: 56, draw(g, G) { g.translate(0, 2); G.translate(0, 2); drawShanxiao(g, G, true); } },
  puppet: { w: 46, h: 58, draw(g, G) { drawPuppet(g, G, { W: '#9a6a3c', Wd: '#6e4a28', Wl: '#bc8c58', B: '#b0904a', eye: '#ff6a3a' }); } },
  puppetBronze: { w: 46, h: 58, draw(g, G) { drawPuppet(g, G, { W: '#6b7a5a', Wd: '#45503a', Wl: '#8fa078', B: '#c9a24a', eye: '#7affd0', armor: true }); } },
  nigui: { w: 44, h: 54, draw(g, G) {
    // 半透明水鬼：湿发遮面、水草缠身
    poly(g, [8, 30, 36, 30, 40, 50, 30, 46, 22, 52, 14, 46, 4, 50], '#5a8a8a');
    ell(g, 22, 30, 13, 15, '#7aa8a0');
    ell(g, 22, 34, 9, 11, '#a8d0c8');
    // 长发
    poly(g, [8, 10, 36, 10, 40, 34, 34, 28, 30, 40, 26, 30, 22, 42, 18, 30, 14, 40, 10, 28, 4, 34], '#1d2a2a');
    ell(g, 22, 14, 12, 9, '#1d2a2a');
    for (const c of [g, G]) { rect(c, 16, 20, 3, 2, '#d0fff0'); rect(c, 25, 20, 3, 2, '#d0fff0'); }
    rect(g, 19, 25, 6, 2, '#2a3a3a');
    // 手
    poly(g, [36, 30, 44, 22, 44, 26, 38, 34], '#a8d0c8'); poly(g, [8, 30, 0, 24, 0, 28, 6, 34], '#a8d0c8');
    // 水草
    g.strokeStyle = '#3a6a3a'; g.lineWidth = 2; g.beginPath(); g.moveTo(12, 34); g.quadraticCurveTo(20, 38, 14, 46); g.moveTo(30, 32); g.quadraticCurveTo(24, 40, 32, 46); g.stroke();
  } },
  bat: { w: 56, h: 36, draw(g, G) {
    const wing = (d) => poly(g, [28, 16, 28 + d * 10, 4, 28 + d * 22, 2, 28 + d * 27, 10, 28 + d * 24, 18, 28 + d * 18, 14, 28 + d * 16, 22, 28 + d * 10, 18, 28 + d * 6, 24], '#4a3050');
    wing(-1); wing(1);
    g.strokeStyle = '#2a1830'; g.lineWidth = 1; for (const d of [-1, 1]) { g.beginPath(); g.moveTo(28, 16); g.lineTo(28 + d * 22, 3); g.moveTo(28, 16); g.lineTo(28 + d * 18, 14); g.stroke(); }
    ell(g, 28, 20, 7, 9, '#5a3a5e'); ell(g, 28, 22, 4, 6, '#7a5a6e');
    poly(g, [22, 13, 23, 4, 27, 12], '#5a3a5e'); poly(g, [34, 13, 33, 4, 29, 12], '#5a3a5e');
    for (const c of [g, G]) { rect(c, 24, 16, 2, 2, '#ff4a5a'); rect(c, 30, 16, 2, 2, '#ff4a5a'); }
    rect(g, 26, 22, 1, 2, '#f0f0f0'); rect(g, 29, 22, 1, 2, '#f0f0f0');
  } },
  foxfire: { w: 42, h: 44, glowAll: 0.85, draw(g, G) {
    const body = (c, a, b) => {
      // 火尾
      for (let i = 0; i < 3; i++) poly(c, [10, 26 + i * 4, -2 + i * 3, 14 + i * 9, 6, 32 + i * 3], i % 2 ? b : a);
      ell(c, 22, 28, 12, 13, a);
      poly(c, [14, 20, 12, 6, 20, 16], a); poly(c, [26, 16, 33, 5, 31, 20], a); // 耳
      ell(c, 23, 30, 8, 9, b);
    };
    body(g, '#5ab8e8', '#c8f0ff');
    rect(g, 18, 25, 4, 2, '#1d3a6a'); rect(g, 27, 25, 4, 2, '#1d3a6a');
    rect(g, 22, 33, 5, 1, '#2a5a8a');
    body(G, '#4a90c0', '#a0d8f0');
  } },
  ghostfire: { w: 42, h: 44, glowAll: 0.9, draw(g, G) {
    const body = (c, a, b) => {
      for (let i = 0; i < 3; i++) poly(c, [10, 26 + i * 4, -2 + i * 3, 14 + i * 9, 6, 32 + i * 3], i % 2 ? b : a);
      ell(c, 22, 28, 12, 13, a); poly(c, [14, 20, 12, 6, 20, 16], a); poly(c, [26, 16, 33, 5, 31, 20], a);
      ell(c, 23, 30, 8, 9, b);
    };
    body(g, '#6ad89a', '#dcffe0');
    rect(g, 18, 25, 4, 2, '#1a4a2a'); rect(g, 27, 25, 4, 2, '#1a4a2a');
    body(G, '#4ab07a', '#a0f0c0');
  } },
  toad: { w: 54, h: 42, draw(g, G) {
    ell(g, 26, 26, 22, 14, '#7a7870'); ell(g, 24, 22, 17, 10, '#8f8c84');
    ell(g, 32, 33, 12, 6, '#a8a49a');
    ell(g, 40, 16, 10, 8, '#8f8c84');
    ell(g, 14, 20, 6, 4, '#5b7b44'); ell(g, 28, 14, 5, 3, '#4d6b3b'); ell(g, 8, 30, 5, 3, '#5b7b44');
    g.strokeStyle = '#4b4843'; g.lineWidth = 1; g.beginPath(); g.moveTo(18, 14); g.lineTo(22, 22); g.lineTo(19, 28); g.moveTo(30, 18); g.lineTo(34, 24); g.stroke();
    rect(g, 40, 34, 10, 6, '#6e6a62'); rect(g, 6, 34, 12, 6, '#6e6a62');
    rect(g, 40, 22, 12, 2, '#3b3934');
    [G, g].forEach((c) => { rect(c, 40, 11, 4, 4, '#ffb43a'); rect(c, 46, 12, 3, 3, '#ffb43a'); });
    rect(g, 41, 12, 1, 2, '#3a2a10');
    [G, g].forEach((c) => { rect(c, 20, 20, 2, 6, '#7ad0c0'); rect(c, 18, 22, 6, 2, '#7ad0c0'); });
  } },
  taotie: { w: 132, h: 116, draw(g, G) {
    const r = rng(77);
    // 烟影躯体
    for (let i = 0; i < 40; i++) ell(g, 20 + r() * 90, 70 + r() * 40, 10 + r() * 16, 8 + r() * 10, i % 3 ? '#2a1f30' : '#3a2a40');
    // 角（卷曲）
    const horn = (c, sx) => {
      for (let t = 0; t < 1; t += 0.04) {
        const a = t * 4.2, R = 22 * (1 - t * 0.7);
        const x = 66 + sx * (24 + Math.cos(a) * R * 0.8 + t * 10), y = 26 - Math.sin(a) * R * 0.9 - t * 6;
        ell(c, x, y, 6 - t * 3.5, 6 - t * 3.5, t < 0.5 ? '#7d6b3c' : '#9c8a50');
      }
    };
    horn(g, -1); horn(g, 1);
    // 面具主体
    poly(g, [20, 38, 112, 38, 120, 60, 104, 92, 28, 92, 12, 60], '#6b5a32');
    poly(g, [28, 42, 104, 42, 110, 60, 98, 86, 34, 86, 22, 60], '#7d6b3c');
    // 纹饰
    g.strokeStyle = '#4f7a66'; g.lineWidth = 2;
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(66 + s * 8, 44); g.lineTo(66 + s * 30, 44); g.lineTo(66 + s * 40, 54); g.lineTo(66 + s * 34, 70); g.stroke();
      g.beginPath(); g.moveTo(66 + s * 44, 62); g.lineTo(66 + s * 52, 62); g.lineTo(66 + s * 48, 76); g.stroke();
    }
    rect(g, 63, 40, 6, 34, '#4f7a66'); rect(g, 64, 40, 4, 34, '#6fa08a');
    // 眼眶 + 发光眼
    for (const s of [-1, 1]) { ell(g, 66 + s * 22, 56, 13, 9, '#2a2014'); }
    for (const c of [g, G]) for (const s of [-1, 1]) { ell(c, 66 + s * 22, 56, 9, 6, '#ff5a2a'); ell(c, 66 + s * 22, 56, 3, 5, '#fff0a0'); }
    // 巨口与獠牙
    poly(g, [32, 80, 100, 80, 92, 100, 40, 100], '#1a1018');
    for (const c of [g, G]) poly(c, [40, 86, 92, 86, 88, 96, 44, 96], c === G ? '#a0281a' : '#5a1a1a');
    for (let i = 0; i < 7; i++) poly(g, [40 + i * 8, 80, 46 + i * 8, 80, 43 + i * 8, 89], '#e8dcc0');
    poly(g, [36, 100, 44, 100, 40, 88], '#e8dcc0'); poly(g, [88, 100, 96, 100, 92, 88], '#e8dcc0');
    // 高光边
    g.strokeStyle = '#b39a58'; g.lineWidth = 1; g.beginPath(); g.moveTo(20, 38); g.lineTo(112, 38); g.stroke();
  } },
};

const cache = new Map();
export function buildMonster(key) {
  if (cache.has(key)) return cache.get(key);
  const def = MONSTERS[key];
  const [c, g] = makeCanvas(def.w + 4, def.h + 4);
  const [gc, G] = makeCanvas(def.w + 4, def.h + 4);
  g.translate(2, 2); G.translate(2, 2);
  def.draw(g, G);
  pixelize(c, { outlineColor: key === 'foxfire' ? '#1d3a6a' : key === 'ghostfire' ? '#1a4a2a' : '#1a1210' });
  pixelize(gc, { outline: false });
  const res = { canvas: c, texture: pixelTex(c, { mip: false }), glow: pixelTex(gc, { mip: false }), w: c.width, h: c.height, glowAll: def.glowAll || 0 };
  cache.set(key, res);
  return res;
}

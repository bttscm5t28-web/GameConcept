// 竹海古道专用的程序化道具：石灯笼、倒竹、蘑菇、窝棚、土地庙、机关灯、机关鸟、野外妖怪立绘……
import * as THREE from 'three';
import * as T from '../../art/textures.js';
import * as P from '../../art/props.js';
import { buildMonster } from '../../art/monsters.js';
import { rng, makeCanvas } from '../../art/pixel.js';
import { radialTex } from '../../art/textures.js';

const lam = P.lam;
const MAT = P.MAT;
function shadowy(o) { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }
function box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; }
function cyl(rt, rb, h, mat, seg = 8, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y, z); return m; }

const stoneMat = () => lam('fo_stone', { map: T.stoneTex(1) });
const mossStoneMat = () => lam('fo_mstone', { map: T.stoneTex(2) });

// 竖排刻字贴图
const vtCache = new Map();
export function verticalText(text, { w = 32, h = 96, bg = '#6f6c66', fg = '#2e2c28', font = 'bold 20px serif', border = '#4c4a45', gold = false } = {}) {
  const key = text + w + h + bg + fg + font;
  if (vtCache.has(key)) return vtCache.get(key);
  const [c, g] = makeCanvas(w, h);
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const r = rng(text.length * 7 + 3);
  for (let i = 0; i < w * h * 0.08; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)'; g.fillRect(Math.floor(r() * w), Math.floor(r() * h), 1, 1); }
  if (border) { g.strokeStyle = border; g.lineWidth = 2; g.strokeRect(2, 2, w - 4, h - 4); }
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  const chars = [...text];
  const step = (h - 10) / chars.length;
  chars.forEach((ch, i) => {
    const y = 6 + step * (i + 0.5);
    if (!gold) { g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillText(ch, w / 2 + 1, y + 1); }
    g.fillStyle = fg; g.fillText(ch, w / 2, y);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  vtCache.set(key, tex);
  return tex;
}

// 石灯笼（沿古道排列，部分已熄灭）
export function stoneLantern({ lit = true, mossy = false, intensity = 2.4, broken = false, seed = 1 } = {}) {
  const g = new THREE.Group();
  const sm = mossy ? mossStoneMat() : stoneMat();
  const r = rng(seed);
  g.add(box(0.62, 0.14, 0.62, sm, 0, 0.07, 0));
  g.add(cyl(0.11, 0.14, 0.62, sm, 6, 0, 0.45, 0));
  g.add(box(0.56, 0.1, 0.56, sm, 0, 0.8, 0));
  if (broken) { // 灯室塌落在一旁
    const fall = new THREE.Group();
    fall.add(box(0.36, 0.3, 0.36, sm, 0, 0.15, 0));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.26, 4), sm); roof.rotation.y = Math.PI / 4; roof.position.set(0.1, 0.1, 0.42); roof.rotation.z = 1.3;
    fall.add(roof);
    fall.position.set(0.5 + r() * 0.2, 0, 0.15); fall.rotation.y = r() * 3;
    g.add(fall);
    return shadowy(g);
  }
  // 灯室：四根小柱 + 发光纸窗
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.06, 0.32, 0.06, sm, sx * 0.15, 1.01, sz * 0.15));
  const glowMat = new THREE.MeshBasicMaterial({ color: lit ? '#ffcf7a' : '#3a3428', fog: true });
  const core = box(0.24, 0.24, 0.24, glowMat, 0, 1.0, 0);
  g.add(core);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.3, 4), sm);
  roof.rotation.y = Math.PI / 4; roof.position.y = 1.32;
  g.add(roof);
  g.add(box(0.08, 0.14, 0.08, sm, 0, 1.52, 0));
  shadowy(g); core.castShadow = false;
  if (lit) {
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: radialTex(), color: '#ffb560', transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.set(0, 1.0, 0.2); g.add(halo);
    const pl = new THREE.PointLight('#ffb060', intensity, 5.5, 1.7);
    pl.position.set(0, 1.0, 0.35); g.add(pl);
    g.userData.light = pl; g.userData.flicker = core;
  }
  return g;
}

// 倒伏的竹子
export function fallenBamboo(len = 3, seed = 1) {
  const g = new THREE.Group();
  const r = rng(seed);
  const tex = T.bambooStalkTex().clone(); tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, len * 0.6); tex.needsUpdate = true;
  const mat = new THREE.MeshLambertMaterial({ map: tex, color: '#d8d0a0' });
  const n = 1 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const l = len * (0.7 + r() * 0.3);
    const s = cyl(0.07, 0.085, l, mat, 6, 0, 0.08 + i * 0.12, (i - 0.5) * 0.18);
    s.rotation.z = Math.PI / 2; s.rotation.y = (r() - 0.5) * 0.25;
    g.add(s);
  }
  const lmat = new THREE.MeshLambertMaterial({ map: T.bambooLeafTex(5), alphaTest: 0.5, side: THREE.DoubleSide, color: '#c8b878' });
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), lmat);
    p.position.set(len / 2 - 0.2 - r() * 0.5, 0.25 + r() * 0.2, (r() - 0.5) * 0.4); p.rotation.set(-1.0 + r() * 0.6, r() * 3, r());
    g.add(p);
  }
  return shadowy(g);
}

// 蘑菇丛（有一种在暗处会发出幽光）
export function mushrooms(seed = 1, { glow = false } = {}) {
  const g = new THREE.Group();
  const r = rng(seed);
  const n = 3 + Math.floor(r() * 3);
  const capCol = glow ? '#7ae0c8' : ['#b8442e', '#c88a4a', '#a8743a'][Math.floor(r() * 3)];
  const capMat = glow ? new THREE.MeshLambertMaterial({ color: capCol, emissive: new THREE.Color('#2a9a80'), emissiveIntensity: 0.9 }) : lam('fo_cap' + capCol, { color: capCol, flatShading: true });
  const stemMat = lam('fo_stem', { color: '#e8dcc0' });
  for (let i = 0; i < n; i++) {
    const s = 0.5 + r() * 0.8;
    const x = (r() - 0.5) * 0.5, z = (r() - 0.5) * 0.4;
    g.add(cyl(0.025 * s, 0.035 * s, 0.16 * s, stemMat, 5, x, 0.08 * s, z));
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
    cap.position.set(x, 0.15 * s, z); cap.scale.y = 0.7;
    g.add(cap);
  }
  return shadowy(g);
}

// 树桩（可选：插着斧头）
export function stump({ axe = false } = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.32, 0.4, 0.42, MAT.bark(), 9, 0, 0.21, 0));
  const top = cyl(0.31, 0.31, 0.02, lam('fo_ring', { color: '#c9a878' }), 9, 0, 0.43, 0); g.add(top);
  if (axe) {
    const ax = new THREE.Group();
    ax.add(box(0.05, 0.62, 0.05, MAT.wood(), 0, 0.31, 0));
    ax.add(box(0.05, 0.16, 0.24, lam('fo_iron', { color: '#8a8e90' }), 0, 0.0, 0.09));
    ax.position.set(0.05, 0.44, 0); ax.rotation.x = -0.5; ax.rotation.z = 0.25;
    g.add(ax);
  }
  return shadowy(g);
}

// 猎户窝棚：竹竿搭的斜顶棚子
export function hut() {
  const g = new THREE.Group();
  const pole = lam('fo_pole', { color: '#8a7a4a' });
  const thatch = lam('fo_thatch', { color: '#9a8a52', flatShading: true });
  for (const [x, z, h] of [[-1.3, -0.7, 1.9], [1.3, -0.7, 1.9], [-1.3, 0.7, 1.2], [1.3, 0.7, 1.2]]) g.add(cyl(0.06, 0.07, h, pole, 6, x, h / 2, z));
  const roof = box(3.0, 0.12, 1.9, thatch, 0, 1.6, 0); roof.rotation.x = 0.36; g.add(roof);
  for (let i = 0; i < 7; i++) { const s = cyl(0.04, 0.04, 2.0, pole, 5, -1.3 + i * 0.43, 1.66, 0); s.rotation.x = Math.PI / 2 + 0.36; g.add(s); }
  // 后墙编竹
  const wall = box(2.7, 1.7, 0.06, lam('fo_weave', { color: '#7a6a3e' }), 0, 0.85, -0.72); g.add(wall);
  for (let i = 0; i < 6; i++) g.add(box(2.7, 0.04, 0.08, pole, 0, 0.2 + i * 0.28, -0.69));
  // 柴堆
  for (let i = 0; i < 6; i++) { const l = cyl(0.08, 0.08, 0.9, MAT.bark(), 6, 1.75 + (i % 3) * 0.16 - 0.16, 0.08 + Math.floor(i / 3) * 0.15, 0.2); l.rotation.x = Math.PI / 2; g.add(l); }
  // 草垫、火塘
  g.add(box(1.2, 0.05, 0.8, lam('fo_mat', { color: '#b8a066' }), -0.5, 0.03, -0.1));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.add(box(0.14, 0.1, 0.14, stoneMat(), 0.5 + Math.cos(a) * 0.26, 0.05, 0.25 + Math.sin(a) * 0.26)); }
  g.add(box(0.3, 0.04, 0.3, lam('fo_ash', { color: '#3a3430' }), 0.5, 0.03, 0.25));
  // 晾着的兽皮
  const hide = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.55), lam('fo_hide', { color: '#a87a4a', side: THREE.DoubleSide }));
  hide.position.set(-1.3, 1.05, 0.05); hide.rotation.y = Math.PI / 2; g.add(hide);
  return shadowy(g);
}

// 土地庙：半人高的小庙 + 泥塑土地公
export function shrine() {
  const g = new THREE.Group();
  g.add(box(2.6, 0.3, 2.0, stoneMat(), 0, 0.15, 0));
  const wallM = lam('fo_shrinewall', { color: '#b8a488' });
  g.add(box(2.1, 1.25, 0.16, wallM, 0, 0.92, -0.72));
  for (const sx of [-1, 1]) g.add(box(0.16, 1.25, 1.5, wallM, sx * 0.97, 0.92, 0));
  for (const sx of [-1, 1]) g.add(box(0.16, 1.3, 0.16, MAT.redWood(), sx * 0.97, 0.95, 0.72));
  g.add(box(2.1, 0.06, 1.5, lam('fo_shrinefloor', { color: '#5a4a3a' }), 0, 0.31, 0));
  // 神像
  const robe = lam('fo_godrobe', { color: '#a8442e' });
  g.add(cyl(0.18, 0.28, 0.55, robe, 8, 0, 0.6, -0.35));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), lam('fo_godface', { color: '#e8c8a0' })).translateY(0.98).translateZ(-0.35));
  g.add(box(0.2, 0.12, 0.05, lam('fo_beard', { color: '#f0ece0' }), 0, 0.88, -0.22));
  g.add(box(0.3, 0.08, 0.3, lam('fo_hat', { color: '#3a3a3a' }), 0, 1.12, -0.35));
  // 对联
  const red = '#9a2e22';
  const c1 = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.95), new THREE.MeshLambertMaterial({ map: verticalText('公公十分公道', { w: 16, h: 96, bg: red, fg: '#e8c870', font: 'bold 13px serif', border: null, gold: true }) }));
  c1.position.set(0.97, 0.95, 0.81); g.add(c1);
  const c2 = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.95), new THREE.MeshLambertMaterial({ map: verticalText('婆婆一片婆心', { w: 16, h: 96, bg: red, fg: '#e8c870', font: 'bold 13px serif', border: null, gold: true }) }));
  c2.position.set(-0.97, 0.95, 0.81); g.add(c2);
  const roof = P.chineseRoof(2.9, 2.2, 0.75, '#4a4a3e');
  roof.position.y = 1.52; g.add(roof);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.26), new THREE.MeshLambertMaterial({ map: T.glyphTex('土地庙', { w: 48, h: 16, bg: '#2a1d17', fg: '#e2b84e', font: 'bold 12px serif', border: '#c9a24a', pixel: false }) }));
  plaque.position.set(0, 1.5, 0.82); g.add(plaque);
  return shadowy(g);
}

// 供桌：香炉 + 供果
export function altar() {
  const g = new THREE.Group();
  g.add(box(1.3, 0.08, 0.55, MAT.redWood(), 0, 0.62, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.07, 0.6, 0.07, MAT.darkWood(), sx * 0.58, 0.3, sz * 0.22));
  const burner = cyl(0.13, 0.1, 0.16, MAT.bronze(), 10, 0, 0.74, 0); g.add(burner);
  for (let i = 0; i < 3; i++) {
    g.add(cyl(0.008, 0.008, 0.3, lam('fo_incense', { color: '#8a3a22' }), 4, -0.05 + i * 0.05, 0.95, 0));
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 3), new THREE.MeshBasicMaterial({ color: '#ff8a3a' }));
    tip.position.set(-0.05 + i * 0.05, 1.1, 0); g.add(tip);
  }
  g.add(cyl(0.16, 0.12, 0.03, lam('fo_plate', { color: '#d8d0c0' }), 10, 0.4, 0.68, 0));
  for (let i = 0; i < 3; i++) g.add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), lam('fo_fruit', { color: '#c88a3a' })).translateX(0.36 + (i % 2) * 0.08).translateY(0.73 + (i === 2 ? 0.05 : 0)).translateZ(i === 2 ? 0 : -0.03 + i * 0.06));
  return shadowy(g);
}

// 小豆的机关鸟
export function mechBird() {
  const g = new THREE.Group();
  const body = new THREE.Group();
  const wood = lam('fo_birdwood', { color: '#c89a5a' });
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), wood); b.scale.set(1, 0.85, 1.3); body.add(b);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), wood); head.position.set(0, 0.08, 0.12); body.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 5), lam('fo_beak', { color: '#e8b84a' })); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.07, 0.21); body.add(beak);
  const eye = lam('fo_eye', { color: '#1a1410' });
  for (const sx of [-1, 1]) body.add(box(0.02, 0.02, 0.02, eye, sx * 0.055, 0.1, 0.15));
  const tail = box(0.1, 0.02, 0.14, lam('fo_birdtail', { color: '#3a8a8a' }), 0, 0.02, -0.18); tail.rotation.x = -0.4; body.add(tail);
  body.add(box(0.03, 0.03, 0.03, lam('fo_reddot', { color: '#e0402a' }), 0, 0.05, -0.24));
  const wingMat = lam('fo_wing', { color: '#4ab0a8', side: THREE.DoubleSide });
  const wings = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * 0.09, 0.04, 0);
    const w = box(0.2, 0.015, 0.14, wingMat, sx * 0.1, 0, 0); pivot.add(w);
    body.add(pivot); wings.push({ pivot, sx });
  }
  // 发条钥匙
  const key = box(0.02, 0.07, 0.07, MAT.gold(), 0, 0.14, -0.04); body.add(key);
  g.add(body);
  g.userData.body = body; g.userData.wings = wings;
  g.userData.flap = (t, k = 1) => { for (const { pivot, sx } of wings) pivot.rotation.z = sx * (0.2 + Math.sin(t * 28) * 0.8 * k); };
  return shadowy(g);
}

// 墨家机关灯（存档点）
export function mohistLamp() {
  const g = new THREE.Group();
  const br = MAT.bronze();
  g.add(box(0.8, 0.2, 0.8, stoneMat(), 0, 0.1, 0));
  g.add(cyl(0.14, 0.2, 1.3, br, 8, 0, 0.85, 0));
  const gr = P.gear({ r: 0.22, teeth: 9, thick: 0.06 }); gr.position.set(0, 0.75, 0.2); g.add(gr);
  const gr2 = P.gear({ r: 0.14, teeth: 7, thick: 0.06 }); gr2.position.set(0.27, 0.95, 0.18); g.add(gr2);
  g.add(box(0.5, 0.06, 0.5, br, 0, 1.52, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.04, 0.45, 0.04, br, sx * 0.2, 1.76, sz * 0.2));
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.3, 4), br); cap.rotation.y = Math.PI / 4; cap.position.y = 2.12; g.add(cap);
  const orbMat = new THREE.MeshBasicMaterial({ color: '#3a4a44' });
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 0), orbMat); orb.position.y = 1.78; g.add(orb);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: radialTex(), color: '#6affd8', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.position.set(0, 1.78, 0.25); g.add(halo);
  const pl = new THREE.PointLight('#7affd8', 0, 7, 1.5); pl.position.set(0, 1.8, 0.4); g.add(pl);
  shadowy(g); orb.castShadow = false;
  let on = 0, target = 0;
  g.userData.setLit = (v, instant = false) => { target = v ? 1 : 0; if (instant) on = target; };
  g.userData.update = (t, dt = 0.016) => {
    on += (target - on) * Math.min(1, (dt || 0.016) * 2.5);
    const k = on * (0.9 + Math.sin(t * 3.1) * 0.06 + Math.sin(t * 7.7) * 0.04);
    orbMat.color.setRGB(0.23 + 0.25 * k, 0.29 + 0.71 * k, 0.27 + 0.58 * k);
    halo.material.opacity = 0.65 * k;
    pl.intensity = 6 * k;
    orb.rotation.y = t * 0.8; gr.rotation.z = t * 0.5 * on; gr2.rotation.z = -t * 0.8 * on;
  };
  return g;
}

// 刻字界碑
export function boundaryStele(text = '墨家禁地') {
  const g = new THREE.Group();
  const face = new THREE.MeshLambertMaterial({ map: verticalText(text, { w: 28, h: 96, bg: '#7a786e', fg: '#2a2622', font: 'bold 19px serif' }) });
  const side = lam('fo_steleside', { color: '#6a685e' });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.9, 0.3), [side, side, side, side, face, side]);
  body.position.y = 1.15; g.add(body);
  g.add(box(0.9, 0.22, 0.55, mossStoneMat(), 0, 0.11, 0));
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.25, 4), side); cap.rotation.y = Math.PI / 4; cap.position.y = 2.22; cap.scale.z = 0.6; g.add(cap);
  // 墨家机关纹：一枚小齿轮
  const gr = P.gear({ r: 0.1, teeth: 8, thick: 0.03 }); gr.position.set(0, 1.92, 0.16); g.add(gr);
  return shadowy(g);
}

// 路标：木桩 + 竖牌
export function signpost(text = '竹海古道') {
  const g = new THREE.Group();
  g.add(box(0.14, 1.6, 0.14, MAT.darkWood(), 0, 0.8, 0));
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 1.0), new THREE.MeshLambertMaterial({ map: verticalText(text, { w: 22, h: 72, bg: '#8a6a44', fg: '#2a1a10', font: 'bold 15px serif', border: '#5a4028' }), side: THREE.DoubleSide }));
  board.position.set(0, 1.0, 0.09); g.add(board);
  g.add(box(0.42, 0.06, 0.12, MAT.darkWood(), 0, 1.55, 0.05));
  return shadowy(g);
}

// 竹简残片：散落在平石上
export function bambooSlips() {
  const g = new THREE.Group();
  const flat = box(1.1, 0.3, 0.8, mossStoneMat(), 0, 0.15, 0); flat.rotation.y = 0.2; g.add(flat);
  const sm = lam('fo_slip', { color: '#c8b07a' });
  const ink = lam('fo_slipink', { color: '#3a2a1a' });
  for (let i = 0; i < 7; i++) {
    const s = box(0.06, 0.02, 0.55, sm, -0.22 + i * 0.07, 0.31, 0); s.rotation.y = 0.2 + (i > 4 ? (i - 4) * 0.25 : 0); g.add(s);
    for (let k = 0; k < 4; k++) g.add(box(0.03, 0.022, 0.04, ink, -0.22 + i * 0.07, 0.315, -0.18 + k * 0.12));
  }
  const scroll = cyl(0.06, 0.06, 0.12, sm, 8, 0.38, 0.36, 0.05); g.add(scroll);
  return shadowy(g);
}

// 刻着深深爪痕的巨石
export function clawRock() {
  const g = new THREE.Group();
  const r = P.rock({ s: 2.2, seed: 7, mossy: true }); r.rotation.y = 0.4; g.add(r);
  const dark = lam('fo_claw', { color: '#2a2420' });
  for (let i = 0; i < 3; i++) { const c = box(0.05, 0.6, 0.06, dark, -0.2 + i * 0.18, 0.55, 0.78); c.rotation.z = 0.35; g.add(c); }
  return shadowy(g);
}

// 木桥（与 b 格的行走高度 0.22 对齐；两端有坡道）
export function woodBridge(len = 4.4, width = 3) {
  const g = new THREE.Group();
  const tex = T.woodTex(0).clone(); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(width, 1); tex.needsUpdate = true;
  const plank = new THREE.MeshLambertMaterial({ map: tex });
  const n = Math.round(len * 3.2);
  for (let i = 0; i < n; i++) {
    const z = -len / 2 + (i + 0.5) * (len / n);
    const p = box(width + (i % 2) * 0.12, 0.08, len / n - 0.03, plank, (i % 3 - 1) * 0.03, 0.17, z); g.add(p);
  }
  // 斜坡
  for (const sz of [-1, 1]) {
    const ramp = box(width, 0.06, 0.9, plank, 0, 0.1, sz * (len / 2 + 0.42)); ramp.rotation.x = sz * 0.22; g.add(ramp);
  }
  // 桥墩
  for (const z of [-len / 2 + 0.6, 0, len / 2 - 0.6]) for (const sx of [-1, 1]) g.add(cyl(0.1, 0.12, 1.1, MAT.darkWood(), 6, sx * (width / 2 - 0.15), -0.4, z));
  // 栏杆
  for (const sx of [-1, 1]) {
    for (let i = 0; i <= 4; i++) g.add(box(0.1, 0.62, 0.1, MAT.redWood(), sx * (width / 2 + 0.02), 0.5, -len / 2 + (i / 4) * len));
    g.add(box(0.07, 0.07, len + 0.1, MAT.redWood(), sx * (width / 2 + 0.02), 0.78, 0));
    g.add(box(0.05, 0.05, len, MAT.darkWood(), sx * (width / 2 + 0.02), 0.45, 0));
  }
  return shadowy(g);
}

// 竹栅栏门（近路）
export function bambooGate(w = 2.4) {
  const g = new THREE.Group();
  const pole = lam('fo_gatepole', { color: '#8a9a52' });
  const panel = new THREE.Group();
  const n = Math.round(w / 0.16);
  for (let i = 0; i < n; i++) { const h = 1.2 + Math.sin(i * 1.7) * 0.08; panel.add(cyl(0.045, 0.05, h, pole, 5, -w / 2 + 0.08 + i * (w / n), h / 2, 0)); }
  for (const y of [0.35, 0.9]) panel.add(box(w, 0.05, 0.06, lam('fo_rope', { color: '#6a5a3a' }), 0, y, 0.05));
  g.add(panel);
  for (const sx of [-1, 1]) g.add(cyl(0.07, 0.08, 1.45, MAT.darkWood(), 6, sx * (w / 2 + 0.05), 0.72, 0));
  const knot = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.03, 4, 8), lam('fo_knot', { color: '#b8442e' })); knot.position.set(w / 2 - 0.1, 0.9, 0.1); g.add(knot);
  g.userData.panel = panel;
  return shadowy(g);
}

// 野外的妖怪立绘（剧情用，复用战斗像素图）
const FPX = 1 / 22;
export function fieldMonster(sprite, { scale = 1, float = false } = {}) {
  const sp = buildMonster(sprite);
  const w = sp.w * FPX * scale, h = sp.h * FPX * scale;
  const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2, 0);
  const nrm = geo.attributes.normal; for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 0.55, 0.835);
  const mat = new THREE.MeshLambertMaterial({ map: sp.texture, alphaTest: 0.5, side: THREE.DoubleSide, emissive: new THREE.Color(1, 1, 1), emissiveMap: sp.glow, emissiveIntensity: sp.glowAll ? 0.8 : 1.2 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: sp.texture, alphaTest: 0.5 });
  const g = new THREE.Group();
  g.add(mesh);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(w * 0.3, 16), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.28, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.scale.y = 0.5; blob.position.y = 0.02;
  g.add(blob);
  const ph = Math.random() * 6;
  g.userData.mesh = mesh; g.userData.mat = mat;
  g.userData.baseY = 0;
  g.userData.anim = (t) => {
    if (float) mesh.position.y = g.userData.baseY + 0.3 + Math.sin(t * 2.2 + ph) * 0.12;
    else { mesh.position.y = g.userData.baseY; mesh.scale.y = 1 + Math.sin(t * 2.6 + ph) * 0.025; }
  };
  return g;
}

// 地面光斑（穿过竹叶的金色日光）
export function sunFlecks(cells, { color = '#ffd88a', opacity = 0.32, seed = 3 } = {}) {
  const g = new THREE.Group();
  const r = rng(seed);
  const tex = radialTex('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 64, 'fleck');
  const mats = [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  for (const [x, z] of cells) {
    const s = 0.6 + r() * 1.3;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s * 1.4, s), mats[Math.floor(r() * 3)]);
    m.rotation.x = -Math.PI / 2; m.rotation.z = r() * 3;
    m.position.set(x, 0.04, z);
    m.renderOrder = 3;
    g.add(m);
  }
  g.userData.update = (t) => mats.forEach((m, i) => { m.opacity = opacity * (0.55 + 0.45 * Math.sin(t * (0.35 + i * 0.17) + i * 2.1)); });
  return g;
}

// 林下暗影（让密竹边缘更有层次）
export function shadePatch(w, d, opacity = 0.25) {
  const tex = radialTex('rgba(0,0,0,1)', 'rgba(0,0,0,0)', 64, 'shade');
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex, color: '#0a1408', transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.renderOrder = 2;
  return m;
}

// 青色妖气（剧情用：被残片吸收的妖气）
export function wispCloud(n = 24, color = '#7affc8') {
  const g = new THREE.Group();
  const tex = radialTex();
  const mat = new THREE.SpriteMaterial({ map: tex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const parts = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(mat);
    s.scale.setScalar(0.25 + Math.random() * 0.3);
    s.userData.o = new THREE.Vector3((Math.random() - 0.5) * 1.6, 0.3 + Math.random() * 1.4, (Math.random() - 0.5) * 1.0);
    s.userData.ph = Math.random() * 6;
    g.add(s); parts.push(s);
  }
  g.userData.parts = parts; g.userData.mat = mat;
  return g;
}

// 北端石阶（通往旧坊的上坡）
export function stoneSteps(width = 3, n = 4, depth = 0.35, rise = 0.4) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const h = rise * (i + 1);
    g.add(box(width, h, depth, i % 2 ? mossStoneMat() : stoneMat(), 0, h / 2, -i * depth));
  }
  for (const sx of [-1, 1]) for (let i = 0; i < n; i += 2) {
    const r = P.rock({ s: 0.7, seed: i + (sx > 0 ? 9 : 3), mossy: true }); r.position.set(sx * (width / 2 + 0.2), rise * (i + 1) - 0.1, -i * depth); g.add(r);
  }
  return shadowy(g);
}

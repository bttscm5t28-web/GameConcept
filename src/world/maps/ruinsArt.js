// 墨家旧坊专用的程序化美术：五行机关门、机关台、墨家机关灯、水闸、像素妖物摆件等
import * as THREE from 'three';
import * as P from '../../art/props.js';
import * as T from '../../art/textures.js';
import { buildMonster } from '../../art/monsters.js';
import { makeCanvas, rng, softTex, pixelTex } from '../../art/pixel.js';

const lam = P.lam;
const MAT = P.MAT;

export const ELEMS = ['金', '木', '水', '火', '土'];
export const ELEM_COLOR = ['#fff0b8', '#8af09a', '#7ac8ff', '#ff8a4a', '#e8b860'];

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
function cyl(rt, rb, h, mat, seg = 8, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
const stoneMat = () => lam('ru_stone', { map: T.stoneTex(1) });
const mossMat = () => lam('ru_moss', { map: T.stoneTex(2) });

// 发光光晕（加色混合，配合 bloom）
export function halo(color = '#ffb060', size = 1.4, opacity = 0.7) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.radialTex(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.scale.set(size, size, 1);
  s.renderOrder = 7;
  return s;
}

// ---------- 文字贴图 ----------
const texCache = new Map();
export function vertTextTex(text, { fg = '#2a2420', bg = null, font = 'bold 26px serif', w = 40, step = 30, pad = 8, glow = null } = {}) {
  const key = [text, fg, bg, font, w, step, glow].join('|');
  if (texCache.has(key)) return texCache.get(key);
  const chars = [...text];
  const h = pad * 2 + chars.length * step;
  const [c, g] = makeCanvas(w, h);
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (glow) { g.shadowColor = glow; g.shadowBlur = 6; }
  g.fillStyle = fg;
  chars.forEach((ch, i) => g.fillText(ch, w / 2, pad + step * (i + 0.5)));
  const t = softTex(c);
  texCache.set(key, t);
  return t;
}
export function glyph(ch, color) {
  return T.glyphTex(ch, { w: 32, h: 32, fg: color, font: 'bold 26px serif', pixel: false });
}

// ---------- 像素妖物摆件（休眠傀儡、铜甲傀儡、饕餮之影） ----------
export function spriteOf(key, { scale = 1, glow = 1.3, half = null, color = '#ffffff' } = {}) {
  const sp = buildMonster(key);
  const EPX = 1 / 26;
  const fw = sp.w * EPX * scale, h = sp.h * EPX * scale;
  const w = half ? fw / 2 : fw;
  const geo = new THREE.PlaneGeometry(w, h);
  geo.translate(0, h / 2, 0);
  if (half) {
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, half === 'L' ? uv.getX(i) * 0.5 : 0.5 + uv.getX(i) * 0.5);
  }
  const n = geo.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 0.55, 0.835);
  const mat = new THREE.MeshLambertMaterial({ map: sp.texture, alphaTest: 0.5, side: THREE.DoubleSide, color, emissive: new THREE.Color(1, 1, 1), emissiveMap: sp.glow, emissiveIntensity: glow, transparent: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: sp.texture, alphaTest: 0.5 });
  const g = new THREE.Group();
  g.add(mesh);
  g.userData.mesh = mesh; g.userData.mat = mat; g.userData.w = w; g.userData.h = h;
  return g;
}

// 横倒在地上的傀儡（贴地的精灵 + 散落零件）
export function fallenPuppet(seed = 1, { split = false } = {}) {
  const g = new THREE.Group();
  const r = rng(seed);
  const tint = '#8a8478';
  if (split) {
    const L = spriteOf('puppet', { scale: 0.95, glow: 0.0, half: 'L', color: tint });
    const R = spriteOf('puppet', { scale: 0.95, glow: 0.0, half: 'R', color: tint });
    L.position.set(-0.55, 0.04, 0); L.rotation.set(-1.45, 0, 0.32);
    R.position.set(0.6, 0.04, 0.15); R.rotation.set(-1.5, 0, -0.42);
    g.add(L, R);
    // 切口处的焦痕
    const scar = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 1.6), new THREE.MeshBasicMaterial({ color: '#2a1828', transparent: true, opacity: 0.65, depthWrite: false }));
    scar.rotation.x = -Math.PI / 2; scar.rotation.z = 0.15; scar.position.set(0.02, 0.03, -0.3);
    g.add(scar);
  } else {
    const s = spriteOf('puppet', { scale: 0.95, glow: 0.0, color: tint });
    s.rotation.set(-1.4 - r() * 0.12, 0, (r() - 0.5) * 0.8);
    s.position.y = 0.05;
    g.add(s);
  }
  for (let i = 0; i < 5; i++) {
    const p = i % 2 ? box(0.18, 0.08, 0.12, MAT.wood(), 0, 0.04, 0) : P.gear({ r: 0.13 + r() * 0.1, teeth: 8, thick: 0.05 });
    p.position.set((r() - 0.5) * 2.2, i % 2 ? 0.04 : 0.03, (r() - 0.3) * 1.2);
    if (!(i % 2)) p.rotation.x = -Math.PI / 2;
    p.rotation.y = r() * 6;
    g.add(p);
  }
  return g;
}

// 靠墙瘫坐的休眠傀儡
export function slumpedPuppet(seed = 2) {
  const g = new THREE.Group();
  const s = spriteOf('puppet', { scale: 1.0, glow: 0.0, color: '#7e7a70' });
  s.rotation.set(-0.25, 0, (seed % 2 ? 1 : -1) * 0.22);
  s.position.y = -0.25;
  g.add(s);
  const moss = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.5), new THREE.MeshLambertMaterial({ map: T.grassTuftTex(0), alphaTest: 0.5, side: THREE.DoubleSide }));
  moss.position.set(0, 0.2, 0.25);
  g.add(moss);
  return g;
}

// ---------- 石刻 ----------
export function carvedStone(text, { w = 1.5, h = 2.3, seed = 3 } = {}) {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(w, h, 0.55, 2, 3, 1);
  const p = geo.attributes.position, r = rng(seed);
  for (let i = 0; i < p.count; i++) if (p.getY(i) > h / 2 - 0.01) p.setY(i, p.getY(i) - r() * 0.35);
  geo.computeVertexNormals();
  const side = mossMat();
  const face = new THREE.MeshLambertMaterial({ map: T.stoneTex(1) });
  const slab = new THREE.Mesh(geo, [side, side, side, side, face, side]);
  slab.position.y = h / 2; slab.castShadow = slab.receiveShadow = true;
  slab.rotation.z = 0.03;
  g.add(slab);
  const t = vertTextTex(text, { fg: '#2a2622', font: 'bold 28px serif', w: 40, step: 32 });
  const tm = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5 * (t.image.height / 40)), new THREE.MeshLambertMaterial({ map: t, transparent: true, depthWrite: false }));
  tm.position.set(0, h * 0.48, 0.285);
  g.add(tm);
  const base = P.rock({ s: 1.4, seed: seed + 4, mossy: true }); base.scale.y = 0.5; base.position.y = 0.05;
  g.add(base);
  return g;
}

// ---------- 墨家机关灯（存档点） ----------
export function mohistLamp() {
  const g = new THREE.Group();
  g.add(box(0.7, 0.3, 0.7, stoneMat(), 0, 0.15, 0));
  g.add(cyl(0.12, 0.16, 1.1, stoneMat(), 6, 0, 0.85, 0));
  g.add(box(0.8, 0.12, 0.8, stoneMat(), 0, 1.45, 0));
  // 灯笼框（四根铜柱 + 顶）
  const br = MAT.bronze();
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(box(0.06, 0.6, 0.06, br, sx * 0.28, 1.81, sz * 0.28));
  const roof = P.chineseRoof(0.95, 0.95, 0.32, '#3a4450'); roof.position.y = 2.1; g.add(roof);
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), new THREE.MeshBasicMaterial({ color: '#ffe0a0' }));
  core.position.y = 1.8; g.add(core);
  const gear = P.gear({ r: 0.2, teeth: 8, thick: 0.05 });
  gear.position.set(0, 1.8, 0.31); g.add(gear);
  const h = halo('#ffc070', 1.6, 0.75); h.position.y = 1.8; g.add(h);
  const pl = new THREE.PointLight('#ffc27a', 6, 7.5, 1.5); pl.position.set(0, 1.9, 0.4); g.add(pl);
  g.userData.update = (t) => {
    gear.rotation.z = t * 1.4; core.rotation.y = t * 0.8;
    const k = 1 + Math.sin(t * 3.1) * 0.06;
    pl.intensity = 6 * k; h.material.opacity = 0.65 * k;
  };
  return g;
}

// ---------- 五行机关门 ----------
export function wuxingGate() {
  const g = new THREE.Group();
  const st = stoneMat();
  // 门框
  for (const sx of [-2.35, 2.35]) {
    g.add(box(0.7, 3.4, 0.9, st, sx, 1.7, 0));
    g.add(box(0.9, 0.3, 1.1, st, sx, 0.15, 0));
  }
  g.add(box(5.6, 0.55, 1.0, st, 0, 3.55, 0));
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.42), new THREE.MeshLambertMaterial({ map: T.glyphTex('五行机关', { w: 80, h: 20, bg: '#1d2a2a', fg: '#e2b84e', font: 'bold 15px serif', border: '#8a7a3a', pixel: false }) }));
  plaque.position.set(0, 3.55, 0.51);
  g.add(plaque);
  const roof = P.chineseRoof(6.2, 1.5, 0.6, '#3a4248'); roof.position.y = 3.8; g.add(roof);
  // 门板（青铜，可下沉）
  const door = new THREE.Group();
  const tex = T.bronzeTex().clone(); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 2); tex.needsUpdate = true;
  const dmat = new THREE.MeshLambertMaterial({ map: tex, emissive: new THREE.Color('#141008') });
  door.add(box(4.0, 3.1, 0.45, dmat, 0, 1.55, 0));
  // 门缝
  door.add(box(0.05, 3.0, 0.48, lam('ru_seam', { color: '#1a140c' }), 0, 1.55, 0));
  // 门钉
  const gold = MAT.gold();
  for (let i = 0; i < 4; i++) for (const sx of [-1, 1]) { const n = cyl(0.06, 0.06, 0.06, gold, 6, sx * (0.45 + i * 0.42), 0.35, 0.25); n.rotation.x = Math.PI / 2; door.add(n); }
  const rings = [];
  [-1.25, 0, 1.25].forEach((x, i) => {
    const ring = new THREE.Group();
    const gear = P.gear({ r: 0.42, teeth: 10, thick: 0.12 });
    ring.add(gear);
    const gm = new THREE.MeshBasicMaterial({ map: glyph('金', ELEM_COLOR[0]), transparent: true, depthWrite: false, toneMapped: false });
    const gp = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), gm);
    gp.position.z = 0.13; ring.add(gp);
    ring.position.set(x, 1.95, 0.26);
    door.add(ring);
    rings.push({ group: ring, gear, mat: gm, i });
  });
  // 环与环之间的连杆
  door.add(box(2.6, 0.07, 0.06, gold, 0, 1.95, 0.27));
  door.add(box(3.3, 0.1, 0.06, gold, 0, 0.9, 0.25));
  g.add(door);
  // 门后的暗处（门下沉后露出的门洞阴影）
  g.userData.door = door; g.userData.rings = rings;
  return g;
}

// ---------- 机关台 ----------
export function pedestal(idx) {
  const g = new THREE.Group();
  g.add(box(1.0, 0.25, 1.0, stoneMat(), 0, 0.12, 0));
  g.add(box(0.75, 0.75, 0.75, mossMat(), 0, 0.62, 0));
  const top = box(0.95, 0.12, 0.95, stoneMat(), 0, 1.05, 0);
  g.add(top);
  // 台面上的转盘（平放的齿轮）
  const dial = new THREE.Group();
  const gear = P.gear({ r: 0.36, teeth: 10, thick: 0.08 });
  gear.rotation.x = Math.PI / 2;
  dial.add(gear);
  dial.add(box(0.06, 0.08, 0.36, MAT.gold(), 0, 0.06, 0.18));
  dial.position.y = 1.17;
  g.add(dial);
  // 侧面刻着环序（壹/贰/叁）
  const num = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), new THREE.MeshLambertMaterial({ map: T.glyphTex(['壹', '贰', '叁'][idx], { w: 24, h: 24, fg: '#d8c890', font: 'bold 18px serif', pixel: false }), transparent: true }));
  num.position.set(0, 0.64, 0.38);
  g.add(num);
  // 悬浮的五行字
  const gm = new THREE.MeshBasicMaterial({ map: glyph('金', ELEM_COLOR[0]), transparent: true, depthWrite: false, toneMapped: false, fog: false });
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), gm);
  gp.position.y = 1.85; gp.renderOrder = 8;
  g.add(gp);
  const h = halo(ELEM_COLOR[0], 1.5, 0.55); h.position.y = 1.85; g.add(h);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.12, 0.6, 6, 1, true), new THREE.MeshBasicMaterial({ color: ELEM_COLOR[0], transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  beam.position.y = 1.45; g.add(beam);
  g.userData = { ...g.userData, dial, glyphMesh: gp, glyphMat: gm, halo: h, beam, pulse: 0 };
  g.userData.set = (e) => {
    gm.map = glyph(ELEMS[e], ELEM_COLOR[e]); gm.needsUpdate = true;
    h.material.color.set(ELEM_COLOR[e]); beam.material.color.set(ELEM_COLOR[e]);
  };
  g.userData.update = (t) => {
    gp.position.y = 1.85 + Math.sin(t * 1.6 + idx) * 0.06;
    h.position.y = gp.position.y;
    const pu = g.userData.pulse;
    if (pu > 0) g.userData.pulse = Math.max(0, pu - 0.03);
    const k = 1 + g.userData.pulse * 1.8;
    gp.scale.setScalar(k * (g.userData.dim ? 0.9 : 1));
    h.material.opacity = (g.userData.solved ? 0.9 : 0.5) * (1 + g.userData.pulse) * (g.userData.dim ? 0.3 : 1);
  };
  return g;
}

// ---------- 鼎室水闸 ----------
export function sluiceGate() {
  const g = new THREE.Group();
  const st = stoneMat();
  for (const sx of [-2.3, 2.3]) g.add(box(0.6, 3.6, 0.8, st, sx, 1.8, 0));
  g.add(box(5.2, 0.5, 0.9, st, 0, 3.75, 0));
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.36), new THREE.MeshLambertMaterial({ map: T.glyphTex('鼎室', { w: 48, h: 16, bg: '#2a1a1a', fg: '#e2b84e', font: 'bold 13px serif', border: '#8a6a3a', pixel: false }) }));
  plaque.position.set(0, 3.75, 0.46); g.add(plaque);
  const roof = P.chineseRoof(5.8, 1.4, 0.6, '#2e3440'); roof.position.y = 4.0; g.add(roof);
  const bars = new THREE.Group();
  const br = MAT.bronze();
  for (let i = 0; i < 9; i++) bars.add(box(0.12, 3.3, 0.12, br, -1.8 + i * 0.45, 1.65, 0));
  for (const y of [0.5, 1.6, 2.7]) bars.add(box(4.0, 0.12, 0.14, br, 0, y, 0));
  // 「坎」字锁盘
  const lock = new THREE.Group();
  const lg = P.gear({ r: 0.32, teeth: 8, thick: 0.1 }); lock.add(lg);
  const lm = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), new THREE.MeshBasicMaterial({ map: glyph('坎', '#7ac8ff'), transparent: true, depthWrite: false, toneMapped: false }));
  lm.position.z = 0.07; lock.add(lm);
  lock.position.set(0, 1.6, 0.14);
  bars.add(lock);
  g.add(bars);
  g.userData.bars = bars; g.userData.lock = lg;
  return g;
}

// ---------- 九州鼎图拓片 ----------
export function rubbingTex() {
  if (texCache.has('rubbing')) return texCache.get('rubbing');
  const [c, g] = makeCanvas(96, 128);
  const r = rng(77);
  g.fillStyle = '#d8ccb0'; g.fillRect(0, 0, 96, 128);
  for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? 'rgba(120,100,70,0.12)' : 'rgba(255,250,230,0.15)'; g.fillRect(r() * 96, r() * 128, 1, 1); }
  // 墨拓底
  g.fillStyle = '#2a2620';
  g.fillRect(10, 18, 76, 76);
  g.fillStyle = '#d8ccb0';
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const x = 13 + i * 24.5, y = 21 + j * 24.5;
    g.strokeStyle = '#d8ccb0'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, 21, 21);
    // 每州一个小鼎的轮廓
    g.fillRect(x + 7, y + 8, 8, 6); g.fillRect(x + 6, y + 7, 10, 1); g.fillRect(x + 7, y + 14, 1, 3); g.fillRect(x + 14, y + 14, 1, 3);
    g.fillRect(x + 7, y + 5, 1, 2); g.fillRect(x + 14, y + 5, 1, 2);
  }
  // 豫州（居中）被朱砂圈出
  g.strokeStyle = '#b8322a'; g.lineWidth = 2;
  g.beginPath(); g.arc(48, 56, 14, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#2a2620'; g.font = 'bold 11px serif'; g.textAlign = 'center';
  g.fillText('九州鼎圖', 48, 12);
  g.font = '9px serif';
  g.fillText('禹收九牧之金', 48, 106);
  g.fillText('鑄鼎象物', 48, 118);
  // 破损
  g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.moveTo(96, 96); g.lineTo(80, 128); g.lineTo(96, 128); g.fill();
  g.beginPath(); g.moveTo(0, 0); g.lineTo(9, 0); g.lineTo(0, 14); g.fill();
  g.globalCompositeOperation = 'source-over';
  const t = pixelTex(c, { mip: false });
  texCache.set('rubbing', t);
  return t;
}
export function scrollStand() {
  const g = new THREE.Group();
  const wd = MAT.darkWood();
  for (const sx of [-0.6, 0.6]) g.add(box(0.08, 2.2, 0.08, wd, sx, 1.1, 0));
  g.add(box(1.4, 0.08, 0.08, wd, 0, 2.15, 0));
  const scroll = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 1.28), new THREE.MeshLambertMaterial({ map: rubbingTex(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide }));
  scroll.position.set(0, 1.42, 0.02);
  scroll.rotation.z = 0.04;
  g.add(scroll);
  const rod = cyl(0.035, 0.035, 1.1, wd, 6, 0, 0.76, 0.02); rod.rotation.z = Math.PI / 2; g.add(rod);
  g.userData.update = (t) => { scroll.rotation.y = Math.sin(t * 0.9) * 0.06; };
  return g;
}

// ---------- 师叔的工作台 ----------
export function workbench() {
  const g = new THREE.Group();
  const wd = MAT.wood();
  g.add(box(2.2, 0.12, 1.0, wd, 0, 0.9, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(0.1, 0.9, 0.1, MAT.darkWood(), sx * 1.0, 0.45, sz * 0.42));
  // 半成品木鸢
  const kite = new THREE.Group();
  kite.add(box(0.12, 0.1, 0.9, wd, 0, 0, 0));
  const wingM = new THREE.MeshLambertMaterial({ color: '#c8b48a', side: THREE.DoubleSide });
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.4), wingM);
    wing.rotation.x = -Math.PI / 2; wing.rotation.z = sx * 0.2; wing.position.set(sx * 0.4, 0.04, -0.05);
    kite.add(wing);
  }
  // 只有一侧蒙了皮，另一侧露着竹骨
  kite.children[2].visible = false;
  for (let i = 0; i < 3; i++) kite.add(box(0.7, 0.02, 0.02, wd, 0.4, 0.04, -0.2 + i * 0.15));
  kite.position.set(-0.45, 1.02, 0.05); kite.rotation.y = 0.4;
  g.add(kite);
  const gr = P.gear({ r: 0.18, teeth: 8, thick: 0.05 }); gr.rotation.x = -Math.PI / 2; gr.position.set(0.55, 0.99, 0.1); g.add(gr);
  const gr2 = P.gear({ r: 0.1, teeth: 6, thick: 0.05 }); gr2.rotation.x = -Math.PI / 2; gr2.position.set(0.8, 0.99, -0.2); g.add(gr2);
  // 墨斗、纸卷、未写完的信
  g.add(box(0.2, 0.12, 0.14, lam('ru_ink', { color: '#3a2a20' }), 0.85, 1.02, 0.25));
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.32), lam('ru_paper', { color: '#e8dcc0' }));
  paper.rotation.x = -Math.PI / 2; paper.rotation.z = 0.2; paper.position.set(0.25, 0.97, 0.25);
  g.add(paper);
  const sc = cyl(0.05, 0.05, 0.5, lam('ru_scroll', { color: '#d8c8a0' }), 6, -0.9, 1.0, 0.3); sc.rotation.z = Math.PI / 2; g.add(sc);
  return g;
}

// ---------- 地面装饰 ----------
export function footprints(pts) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: '#1e1610', transparent: true, opacity: 0.55, depthWrite: false });
  const geo = new THREE.CircleGeometry(0.1, 8);
  pts.forEach(([x, z, a], i) => {
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2; m.rotation.z = a || 0;
    m.scale.set(1, 1.9, 1);
    m.position.set(x + (i % 2 ? 0.16 : -0.16), 0.015, z);
    m.renderOrder = 1;
    g.add(m);
  });
  return g;
}
export function decal(color = '#1a1418', r = 0.6, opacity = 0.6) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 14), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.scale.y = 0.75;
  return m;
}

// 鼎座四周的铜纹地环
export function floorSeal(r = 3.0) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: '#5affd0', transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  for (const [a, b] of [[r - 0.12, r], [r * 0.72 - 0.08, r * 0.72]]) {
    const m = new THREE.Mesh(new THREE.RingGeometry(a, b, 48), mat);
    m.rotation.x = -Math.PI / 2; m.position.y = 0.02; g.add(m);
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: T.glyphTex('冀兖青徐扬荆豫梁雍'[i], { w: 24, h: 24, fg: '#ffffff', font: 'bold 18px serif', pixel: false }), color: '#7affd8', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 }));
    s.rotation.x = -Math.PI / 2; s.rotation.z = -a + Math.PI / 2;
    s.position.set(Math.cos(a) * r * 0.86, 0.025, Math.sin(a) * r * 0.86);
    g.add(s);
  }
  g.userData.mat = mat;
  return g;
}

// 墙上的挂幡
export function banner(text, color = '#5a1e1e') {
  const g = new THREE.Group();
  g.add(box(1.2, 0.07, 0.07, MAT.darkWood(), 0, 2.4, 0));
  const tex = vertTextTex(text, { fg: '#e8d090', bg: color, font: 'bold 26px serif', w: 40, step: 32, pad: 10 });
  const hgt = 1.0 * (tex.image.height / 40);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.0, hgt, 1, 6), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
  cloth.position.set(0, 2.36 - hgt / 2, 0.02);
  g.add(cloth);
  g.userData.update = (t) => { cloth.rotation.x = Math.sin(t * 0.8 + text.length) * 0.04; };
  return g;
}

// 倾倒的石柱
export function fallenPillar(len = 3, seed = 1) {
  const g = new THREE.Group();
  const r = rng(seed);
  const p = cyl(0.3, 0.33, len, lam('ru_pillar', { map: T.stoneTex(1) }), 8, 0, 0.3, 0);
  p.rotation.z = Math.PI / 2; g.add(p);
  for (let i = 0; i < 3; i++) { const rk = P.rock({ s: 0.35 + r() * 0.3, seed: seed * 7 + i }); rk.position.set((r() - 0.5) * len, 0, (r() - 0.5) * 0.9); g.add(rk); }
  return g;
}

// 碎石堆（断墙残块）
export function rubble(seed = 1, s = 1) {
  const g = new THREE.Group();
  const r = rng(seed);
  for (let i = 0; i < 5; i++) {
    const b = box((0.4 + r() * 0.5) * s, (0.25 + r() * 0.35) * s, (0.35 + r() * 0.4) * s, i % 2 ? mossMat() : stoneMat());
    b.position.set((r() - 0.5) * 1.1 * s, b.geometry.parameters.height / 2 - 0.02, (r() - 0.5) * 0.8 * s);
    b.rotation.set((r() - 0.5) * 0.4, r() * 3, (r() - 0.5) * 0.5);
    g.add(b);
  }
  const rk = P.rock({ s: 0.8 * s, seed: seed + 11, mossy: true }); rk.position.set(0.2, 0, 0.1); g.add(rk);
  return g;
}

// 断墙（立着的残墙段，顶部参差）
export function brokenWall(w = 2, h = 2.2, seed = 1) {
  const g = new THREE.Group();
  const r = rng(seed);
  const n = Math.max(2, Math.round(w / 0.5));
  for (let i = 0; i < n; i++) {
    const hh = h * (0.35 + r() * 0.65);
    g.add(box(w / n + 0.01, hh, 0.7, i % 3 ? stoneMat() : mossMat(), -w / 2 + (i + 0.5) * (w / n), hh / 2, 0));
  }
  return g;
}

// 落下的水流（龙口出水）
export function waterSpout(h = 2.0) {
  const g = new THREE.Group();
  const head = box(0.55, 0.45, 0.6, MAT.bronze(), 0, h + 0.1, 0);
  g.add(head);
  const tex = T.mistTex(5).clone(); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 2); tex.needsUpdate = true;
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: '#bfe8ff', transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide });
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(0.45, h + 0.3), mat);
  fall.position.set(-0.2, (h + 0.3) / 2 - 0.25, 0.05);
  g.add(fall);
  const core = new THREE.Mesh(new THREE.PlaneGeometry(0.2, h + 0.3), new THREE.MeshBasicMaterial({ color: '#e8f6ff', transparent: true, opacity: 0.55, depthWrite: false }));
  core.position.copy(fall.position); core.position.z += 0.01;
  g.add(core);
  const foam = halo('#d8f0ff', 1.1, 0.5); foam.position.set(-0.2, 0.0, 0.1); g.add(foam);
  g.userData.update = (t) => { tex.offset.y = t * 1.6; foam.scale.setScalar(1.0 + Math.sin(t * 9) * 0.08); };
  return g;
}

// 荷叶
export function lilyPads(n, area, seed = 1) {
  const g = new THREE.Group();
  const r = rng(seed);
  const mat = lam('ru_lily', { color: '#4a6a3a', side: THREE.DoubleSide });
  const fl = lam('ru_lotus', { color: '#e8a0b8', emissive: new THREE.Color('#3a1020') });
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.22 + r() * 0.18, 9, 0.3, Math.PI * 2 - 0.6), mat);
    m.rotation.x = -Math.PI / 2; m.rotation.z = r() * 6;
    m.position.set(area[0] + r() * (area[2] - area[0]), -0.17, area[1] + r() * (area[3] - area[1]));
    g.add(m);
    if (r() < 0.3) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 5), fl); f.position.copy(m.position); f.position.y += 0.08; f.rotation.x = Math.PI; g.add(f); }
  }
  return g;
}

// 倒塌的书架（竹简散落）
export function ruinedShelf(seed = 1) {
  const g = new THREE.Group();
  const r = rng(seed);
  const wd = MAT.darkWood();
  const frame = new THREE.Group();
  for (const sx of [-0.9, 0.9]) frame.add(box(0.1, 2.0, 0.4, wd, sx, 1.0, 0));
  for (const y of [0.3, 0.9, 1.5]) frame.add(box(1.9, 0.06, 0.4, wd, 0, y, 0));
  frame.rotation.z = 0.32; frame.position.x = 0.35;
  g.add(frame);
  const slip = lam('ru_slip', { color: '#c8a868' });
  for (let i = 0; i < 9; i++) {
    const s = cyl(0.07, 0.07, 0.5, slip, 6, (r() - 0.5) * 2.0, 0.07, 0.4 + r() * 0.5);
    s.rotation.z = Math.PI / 2; s.rotation.y = r() * 3;
    g.add(s);
  }
  return g;
}

// 墨家铁砧与炉
export function anvil() {
  const g = new THREE.Group();
  const iron = lam('ru_iron', { color: '#3a3a40' });
  g.add(box(0.5, 0.45, 0.4, stoneMat(), 0, 0.22, 0));
  g.add(box(0.8, 0.18, 0.32, iron, 0, 0.54, 0));
  g.add(box(0.3, 0.12, 0.2, iron, 0.48, 0.58, 0));
  return g;
}

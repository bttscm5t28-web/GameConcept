// 低多边形 + 像素贴图的场景道具
import * as THREE from 'three';
import * as T from './textures.js';
import { rng, shade } from './pixel.js';

const matCache = new Map();
export function lam(key, params) {
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial(params));
  return matCache.get(key);
}
function shadowy(o) { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }

const M = {
  wood: () => lam('wood', { map: T.woodTex(0) }),
  darkWood: () => lam('dwood', { color: '#5a3a22' }),
  redWood: () => lam('rwood', { color: '#9a2e22' }),
  stone: () => lam('stone', { map: T.stoneTex(0) }),
  rock: () => lam('rock', { map: T.rockSideTex(0), flatShading: true }),
  bark: () => lam('bark', { map: T.barkTex() }),
  bronze: () => lam('bronze', { map: T.bronzeTex(), emissive: new THREE.Color('#1a1408') }),
  gold: () => lam('gold', { color: '#c9a24a', emissive: new THREE.Color('#2a1a00') }),
};
export { M as MAT };

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}
function cyl(rt, rb, h, mat, seg = 8, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  return m;
}

// 飞檐翘角屋顶
export function chineseRoof(w, d, h, color = '#4b5866') {
  const g = new THREE.Group();
  const tex = T.roofTex(color).clone();
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const slope = Math.hypot(d / 2, h);
  tex.repeat.set(w * 1.2, slope * 1.2);
  tex.needsUpdate = true;
  const mat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
  for (const side of [1, -1]) {
    const geo = new THREE.PlaneGeometry(w, 1, 14, 6);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / (w / 2); // -1..1
      const v = 0.5 - p.getY(i); // 0 屋脊 → 1 檐口
      const lift = Math.pow(Math.abs(u), 6) * v * v * h * 0.55;
      const x = p.getX(i) * (1 + 0.05 * v * Math.pow(Math.abs(u), 3));
      const y = h * (1 - v) - Math.sin(Math.PI * v) * h * 0.14 + lift;
      const z = side * v * (d / 2);
      p.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    g.add(m);
  }
  // 山墙
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-d / 2 + 0.25, 0); gableShape.lineTo(0, h - 0.05); gableShape.lineTo(d / 2 - 0.25, 0); gableShape.closePath();
  const gGeo = new THREE.ShapeGeometry(gableShape);
  const gMat = lam('gable', { color: '#d9cfba', side: THREE.DoubleSide });
  for (const sx of [-1, 1]) {
    const gm = new THREE.Mesh(gGeo, gMat);
    gm.rotation.y = Math.PI / 2; gm.position.x = sx * (w / 2 - 0.35);
    g.add(gm);
  }
  // 正脊 + 鸱吻
  const ridgeMat = lam('ridge' + color, { color: shade(color, -0.25) });
  g.add(box(w * 0.92, 0.16, 0.18, ridgeMat, 0, h + 0.04, 0));
  for (const sx of [-1, 1]) {
    const c = box(0.14, 0.34, 0.16, ridgeMat, sx * w * 0.46, h + 0.18, 0);
    c.rotation.z = -sx * 0.5;
    g.add(c);
  }
  return shadowy(g);
}

export function house({ w = 4, d = 3, h = 2.2, wall = '#e8dfcc', roof = '#4b5866', sign = null, door = true, doorX = 0.5, windows = 2, seed = 1, frame = '#5a3a22' } = {}) {
  const g = new THREE.Group();
  const front = new THREE.MeshLambertMaterial({ map: T.facadeTex(w, Math.ceil(h), { wall, frame, door, doorX, windows, sign, seed }) });
  const side = new THREE.MeshLambertMaterial({ map: T.plainWallTex(wall, frame) });
  side.map = side.map.clone(); side.map.repeat.set(d, h); side.map.wrapS = side.map.wrapT = THREE.RepeatWrapping; side.map.needsUpdate = true;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w - 0.2, h, d - 0.2), [side, side, side, side, front, side]);
  body.position.y = h / 2 + 0.15;
  g.add(body);
  g.add(box(w + 0.1, 0.3, d + 0.1, M.stone(), 0, 0.0, 0));
  // 廊柱
  for (const sx of [-1, 1]) g.add(box(0.16, h, 0.16, M.redWood(), sx * (w / 2 - 0.1), h / 2 + 0.15, d / 2 - 0.05));
  const roof3 = chineseRoof(w + 1.0, d + 1.2, Math.min(1.6, d * 0.45), roof);
  roof3.position.y = h + 0.12;
  g.add(roof3);
  return shadowy(g);
}

export function lantern({ hang = false, light = true, color = '#ff9a4a', intensity = 5, dist = 7 } = {}) {
  const g = new THREE.Group();
  const lmat = lam('lanternmat', { map: T.lanternTex(), emissive: new THREE.Color('#ff5a2a'), emissiveIntensity: 1.6, emissiveMap: T.lanternTex() });
  let ly = 1.9;
  if (!hang) {
    g.add(cyl(0.06, 0.08, 2.2, M.darkWood(), 6, 0, 1.1, 0));
    g.add(box(0.7, 0.06, 0.08, M.darkWood(), 0.25, 2.15, 0));
    ly = 1.8;
  }
  const L = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), lmat);
  L.scale.y = 1.2; L.position.set(hang ? 0 : 0.5, ly, 0);
  g.add(L);
  g.add(box(0.2, 0.05, 0.2, M.gold(), L.position.x, ly + 0.3, 0));
  g.add(box(0.2, 0.05, 0.2, M.gold(), L.position.x, ly - 0.3, 0));
  shadowy(g); L.castShadow = false;
  if (light) {
    const pl = new THREE.PointLight(color, intensity, dist, 1.6);
    pl.position.set(L.position.x, ly, 0.3);
    g.add(pl);
    g.userData.light = pl;
  }
  g.userData.flicker = L;
  return g;
}

export function tree({ kind = 'pine', scale = 1, seed = 1 } = {}) {
  const g = new THREE.Group();
  const r = rng(seed);
  const trunkH = (kind === 'willow' ? 2.6 : kind === 'peach' ? 1.7 : 2.4) * scale;
  const trunk = cyl(0.11 * scale, 0.24 * scale, trunkH, M.bark(), 6, 0, trunkH / 2, 0);
  trunk.rotation.z = (r() - 0.5) * 0.12;
  g.add(trunk);
  for (let i = 0; i < 3; i++) { // 枝
    const b = cyl(0.04 * scale, 0.08 * scale, 1.1 * scale, M.bark(), 5);
    const a = (i / 3) * Math.PI * 2 + r();
    b.position.set(Math.cos(a) * 0.35 * scale, trunkH * (0.7 + i * 0.08), Math.sin(a) * 0.2);
    b.rotation.z = Math.cos(a) * 0.9; b.rotation.x = Math.sin(a) * 0.5;
    g.add(b);
  }
  const tex = T.leafCardTex(kind === 'pine' ? 'pine' : kind, 1 + (seed % 3));
  const tex2 = T.leafCardTex(kind === 'pine' ? 'pine' : kind, 4 + (seed % 2));
  const mats = [tex, tex2].map((t, i) => {
    const m = new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, color: i ? '#ffffff' : '#d8d8d0' });
    return m;
  });
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 });
  // 内部体积
  const coreMat = lam('treecore' + kind, { color: kind === 'peach' ? '#9a4a5e' : kind === 'pine' ? '#22382a' : kind === 'willow' ? '#4a6230' : '#33522c', flatShading: true });
  const cy = trunkH + (kind === 'pine' ? 0.9 : 0.6) * scale;
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95 * scale, 0), coreMat);
  core.position.y = cy; core.scale.set(1.25, kind === 'willow' ? 1.2 : 0.9, 1);
  g.add(core);
  const n = kind === 'pine' ? 14 : 16;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    let x, y, z, s;
    if (kind === 'pine') {
      const layer = Math.floor(t * 4);
      const rad = (1.4 - layer * 0.28) * scale;
      const a = r() * Math.PI * 2;
      x = Math.cos(a) * rad * (0.4 + r() * 0.6); z = Math.sin(a) * rad * 0.5; y = trunkH - 0.2 + layer * 0.55 * scale + r() * 0.2;
      s = (1.5 - layer * 0.18) * scale;
    } else {
      const a = r() * Math.PI * 2, rr = Math.sqrt(r());
      x = Math.cos(a) * rr * 1.25 * scale; z = Math.sin(a) * rr * 0.8 * scale + 0.15; y = cy + (r() - 0.45) * (kind === 'willow' ? 1.8 : 1.3) * scale;
      s = (1.3 + r() * 0.7) * scale;
    }
    const card = new THREE.Mesh(new THREE.PlaneGeometry(s, s), mats[i % 2]);
    card.position.set(x, y, z);
    card.rotation.set((r() - 0.5) * 0.4, (r() - 0.5) * 0.9, r() * Math.PI * 2);
    card.customDepthMaterial = depth;
    g.add(card);
  }
  return shadowy(g);
}

export function rock({ s = 1, seed = 1, mossy = false } = {}) {
  const r = rng(seed);
  const geo = new THREE.DodecahedronGeometry(0.5 * s, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.9 + r() * 0.3), p.getY(i) * (0.6 + r() * 0.2), p.getZ(i) * (0.9 + r() * 0.3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mossy ? lam('mossrock', { map: T.stoneTex(2), flatShading: true }) : M.rock());
  m.position.y = 0.2 * s;
  m.rotation.y = r() * 6;
  return shadowy(m);
}

export function fence(len = 3, axis = 'x') {
  const g = new THREE.Group();
  const w = M.wood();
  for (let i = 0; i <= len; i++) g.add(box(0.1, 0.8, 0.1, w, i - len / 2, 0.4, 0));
  g.add(box(len, 0.07, 0.06, w, 0, 0.6, 0));
  g.add(box(len, 0.07, 0.06, w, 0, 0.3, 0));
  if (axis === 'z') g.rotation.y = Math.PI / 2;
  return shadowy(g);
}

export function crate(s = 0.6) { return shadowy(box(s, s, s, lam('crate', { map: T.woodTex(1) }), 0, s / 2, 0)); }

export function jar(s = 1, color = '#7a4a2a') {
  const pts = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector2(0.05 + Math.sin(t * Math.PI) * 0.22 + (t > 0.85 ? 0.04 : 0), t * 0.6)); }
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 8), lam('jar' + color, { color, flatShading: true }));
  m.scale.setScalar(s);
  return shadowy(m);
}

export function well() {
  const g = new THREE.Group();
  g.add(cyl(0.7, 0.75, 0.7, M.stone(), 10, 0, 0.35, 0));
  const water = cyl(0.55, 0.55, 0.05, lam('wellwater', { color: '#2a4a5a' }), 10, 0, 0.6, 0);
  g.add(water);
  for (const sx of [-1, 1]) g.add(box(0.1, 1.6, 0.1, M.darkWood(), sx * 0.6, 0.8, 0));
  g.add(box(1.4, 0.1, 0.1, M.darkWood(), 0, 1.55, 0));
  const r = chineseRoof(1.8, 1.4, 0.5, '#5a4a3a');
  r.position.y = 1.6; g.add(r);
  return shadowy(g);
}

export function stele(text = '碑') {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ map: T.steleTex(text) });
  const side = lam('stoneSide', { color: '#6f6c66' });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.25), [side, side, side, side, mat, side]));
  g.children[0].position.y = 0.95;
  g.add(box(1.1, 0.25, 0.5, M.stone(), 0, 0.12, 0));
  const cap = box(1.05, 0.15, 0.35, side, 0, 1.72, 0);
  g.add(cap);
  return shadowy(g);
}

export function paifang(text = '洛水渡') {
  const g = new THREE.Group();
  const red = M.redWood();
  for (const sx of [-1.4, 1.4]) { g.add(box(0.28, 3.2, 0.28, red, sx, 1.6, 0)); g.add(box(0.5, 0.4, 0.5, M.stone(), sx, 0.2, 0)); }
  g.add(box(3.4, 0.25, 0.3, red, 0, 2.7, 0));
  g.add(box(3.0, 0.18, 0.25, red, 0, 2.2, 0));
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.42), new THREE.MeshLambertMaterial({ map: T.glyphTex(text, { w: 64, h: 20, bg: '#1d2a3a', fg: '#e2b84e', font: 'bold 15px serif', border: '#c9a24a', pixel: false }) }));
  plaque.position.set(0, 2.46, 0.16);
  g.add(plaque);
  const roof = chineseRoof(4.2, 1.1, 0.55, '#3d4856');
  roof.position.y = 2.82;
  g.add(roof);
  return shadowy(g);
}

export function bridge(len = 4, width = 2) {
  const g = new THREE.Group();
  const n = Math.ceil(len * 3);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const y = Math.sin(t * Math.PI) * 0.45 + 0.05;
    g.add(box(width, 0.12, len / n + 0.02, M.wood(), 0, y, -len / 2 + t * len));
  }
  for (const sx of [-1, 1]) for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    g.add(box(0.08, 0.6, 0.08, M.redWood(), sx * (width / 2), Math.sin(t * Math.PI) * 0.45 + 0.35, -len / 2 + t * len));
  }
  return shadowy(g);
}

export function boat() {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-1.8, 0.3); shape.quadraticCurveTo(-1.2, -0.25, 0, -0.3); shape.quadraticCurveTo(1.2, -0.25, 1.8, 0.35); shape.lineTo(-1.8, 0.3);
  const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 1.0, bevelEnabled: false }), M.wood());
  hull.position.z = -0.5;
  g.add(hull);
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.4, 10, 1, true, 0, Math.PI), lam('canopy', { color: '#2a2622', side: THREE.DoubleSide }));
  canopy.rotation.z = Math.PI / 2; canopy.rotation.y = 0; canopy.position.set(0, 0.3, 0);
  g.add(canopy);
  g.add(box(0.05, 1.6, 0.05, M.darkWood(), 1.5, 0.9, 0));
  return shadowy(g);
}

export function stall({ cloth = '#c9423a', flag = '茶' } = {}) {
  const g = new THREE.Group();
  g.add(box(1.8, 0.8, 0.8, M.wood(), 0, 0.4, 0));
  for (const sx of [-0.85, 0.85]) for (const sz of [-0.35, 0.35]) g.add(box(0.07, 2, 0.07, M.darkWood(), sx, 1, sz));
  const c = box(2.1, 0.06, 1.2, lam('cloth' + cloth, { color: cloth }), 0, 2.0, 0.1);
  c.rotation.x = 0.18; g.add(c);
  for (let i = 0; i < 3; i++) { const j = jar(0.6, ['#7a4a2a', '#4a5a6a', '#8a7a5a'][i]); j.position.set(-0.5 + i * 0.5, 0.8, 0); g.add(j); }
  if (flag) {
    g.add(box(0.05, 2.8, 0.05, M.darkWood(), 1.1, 1.4, 0.3));
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.8), new THREE.MeshLambertMaterial({ map: T.glyphTex(flag, { w: 16, h: 24, bg: '#e8dcc0', fg: '#2a1d17', font: 'bold 13px serif', border: '#b8322a', pixel: false }), side: THREE.DoubleSide }));
    f.position.set(1.37, 2.3, 0.3);
    g.add(f);
    g.userData.flag = f;
  }
  return shadowy(g);
}

export function pier(len = 5, width = 3) {
  const g = new THREE.Group();
  const deck = box(width, 0.15, len, M.wood(), 0, 0.02, 0);
  const tex = T.woodTex(0).clone(); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(width, len); tex.needsUpdate = true;
  deck.material = new THREE.MeshLambertMaterial({ map: tex });
  g.add(deck);
  for (let i = 0; i <= len; i += 1.5) for (const sx of [-1, 1]) g.add(cyl(0.09, 0.09, 1.4, M.darkWood(), 6, sx * (width / 2 - 0.1), -0.5, -len / 2 + i));
  return shadowy(g);
}

export function dryingRack() {
  const g = new THREE.Group();
  for (const sx of [-1, 1]) g.add(box(0.08, 1.8, 0.08, M.darkWood(), sx, 0.9, 0));
  g.add(box(2.2, 0.06, 0.06, M.darkWood(), 0, 1.75, 0));
  const net = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.2), lam('net', { color: '#8a7a5a', transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
  net.position.set(0, 1.15, 0); g.add(net);
  return shadowy(g);
}

export function gear({ r = 0.8, teeth = 12, thick = 0.2 } = {}) {
  const g = new THREE.Group();
  const mat = M.bronze();
  const disk = cyl(r, r, thick, mat, 16);
  disk.rotation.x = Math.PI / 2; g.add(disk);
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const t = box(0.22, 0.22, thick, mat, Math.cos(a) * (r + 0.08), Math.sin(a) * (r + 0.08), 0);
    t.rotation.z = a; g.add(t);
  }
  const hub = cyl(r * 0.3, r * 0.3, thick + 0.1, M.gold(), 8); hub.rotation.x = Math.PI / 2; g.add(hub);
  return shadowy(g);
}

export function ding({ s = 1, glow = false } = {}) {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.55 + Math.sin(t * Math.PI * 0.9) * 0.25 + (t > 0.92 ? 0.08 : 0), t * 0.9)); }
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 12), M.bronze());
  body.position.y = 0.45;
  g.add(body);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.5; g.add(cyl(0.08, 0.11, 0.6, M.bronze(), 6, Math.cos(a) * 0.45, 0.3, Math.sin(a) * 0.45)); }
  for (const sx of [-1, 1]) { const ear = box(0.08, 0.35, 0.3, M.bronze(), sx * 0.62, 1.48, 0); g.add(ear); }
  if (glow) {
    const gm = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.04, 14), new THREE.MeshBasicMaterial({ color: '#7affd0' }));
    gm.position.y = 1.32; g.add(gm); g.userData.glow = gm;
  }
  g.scale.setScalar(s);
  return shadowy(g);
}

export function brazier({ light = true } = {}) {
  const g = new THREE.Group();
  g.add(cyl(0.35, 0.2, 0.4, M.bronze(), 8, 0, 0.9, 0));
  for (let i = 0; i < 3; i++) { const a = i * 2.09; g.add(cyl(0.04, 0.04, 0.8, M.bronze(), 5, Math.cos(a) * 0.22, 0.4, Math.sin(a) * 0.22)); }
  const fire = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 6), new THREE.MeshBasicMaterial({ color: '#ffb050' }));
  fire.position.y = 1.3; g.add(fire);
  g.userData.flicker = fire;
  shadowy(g); fire.castShadow = false;
  if (light) { const pl = new THREE.PointLight('#ff8a3a', 7, 8, 1.6); pl.position.y = 1.5; g.add(pl); g.userData.light = pl; }
  return g;
}

export function pillar({ h = 3, broken = false, color = '#8f8c84' } = {}) {
  const g = new THREE.Group();
  const hh = broken ? h * (0.4 + Math.random() * 0.3) : h;
  g.add(cyl(0.3, 0.34, hh, lam('pillar' + color, { map: T.stoneTex(1) }), 8, 0, hh / 2, 0));
  g.add(box(0.8, 0.25, 0.8, M.stone(), 0, 0.12, 0));
  if (!broken) g.add(box(0.8, 0.2, 0.8, M.stone(), 0, h, 0));
  return shadowy(g);
}

export function wallSeg(w = 1, h = 2, d = 1, mat = null) {
  return shadowy(box(w, h, d, mat || lam('ruinwall', { map: T.stoneTex(2) }), 0, h / 2, 0));
}

export function chest() {
  const g = new THREE.Group();
  const base = box(0.7, 0.38, 0.45, lam('chest', { color: '#8a3a22' }), 0, 0.19, 0);
  g.add(base);
  const lid = new THREE.Group();
  lid.add(box(0.72, 0.16, 0.47, lam('chestlid', { color: '#a8442a' }), 0, 0.08, 0.235));
  lid.position.set(0, 0.38, -0.235);
  g.add(lid);
  g.add(box(0.74, 0.06, 0.48, M.gold(), 0, 0.3, 0));
  g.add(box(0.1, 0.12, 0.05, M.gold(), 0, 0.36, 0.24));
  g.userData.lid = lid;
  return shadowy(g);
}

export function waterwheel(r = 1.4) {
  const g = new THREE.Group();
  const wheel = new THREE.Group();
  const w = M.wood();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const spoke = box(0.08, r * 2, 0.08, w); spoke.rotation.z = a; wheel.add(spoke);
    const pad = box(0.5, 0.06, 0.6, w, Math.cos(a) * r, Math.sin(a) * r, 0); pad.rotation.z = a; wheel.add(pad);
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 4, 20), w); wheel.add(rim);
  wheel.rotation.y = Math.PI / 2;
  const holder = new THREE.Group(); holder.add(wheel);
  holder.position.y = r + 0.1;
  g.add(holder);
  for (const s of [-0.4, 0.4]) g.add(box(0.12, r + 0.3, 0.12, M.darkWood(), s, (r + 0.3) / 2, 0));
  g.userData.wheel = wheel;
  return shadowy(g);
}

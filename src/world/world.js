// 大地图：网格地形、道具、NPC、碰撞、触发、镜头
import * as THREE from 'three';
import * as T from '../art/textures.js';
import { hash2, makeCanvas, mix, softTex } from '../art/pixel.js';
import { lam } from '../art/props.js';
import * as P from '../art/props.js';
import { Actor } from './actor.js';
import { shared, applyOcclusionFade, applySway, waterMaterial, particles } from './effects.js';

const TYPES = {
  '.': { top: 'grass', h: 0, walk: true, decor: 'grass' },
  'f': { top: 'grassF', h: 0, walk: true, decor: 'flower' },
  ',': { top: 'dirt', h: 0, walk: true, decor: 'pebble' },
  '=': { top: 'stone', h: 0, walk: true },
  'r': { top: 'stoneMoss', h: 0, walk: true, decor: 'ruin' },
  'd': { top: 'darkStone', h: 0, walk: true },
  's': { top: 'sand', h: 0, walk: true },
  'w': { top: 'wood', h: 0.08, bottom: -0.1, walk: true, water: true },
  'b': { top: 'riverbed', h: -0.6, walk: true, water: true, walkH: 0.22 },
  '~': { top: 'riverbed', h: -0.6, walk: false, water: true },
  '#': { top: 'grass', side: 'rock', h: 1.6, walk: false },
  '^': { top: 'grass', side: 'rock', h: 3.4, walk: false },
  'W': { top: 'stone', side: 'ruinwall', h: 2.4, walk: false },
  'B': { top: 'grass', h: 0, walk: false, bamboo: true },
  'T': { top: 'grass', h: 0, walk: false, tree: true },
  'X': { top: 'grass', h: 0, walk: false },
  'Y': { top: 'stone', h: 0, walk: false },
};

function topTex(name, v) {
  switch (name) {
    case 'grass': return T.grassTex(v % 2);
    case 'grassF': return T.grassTex(v % 3 === 0 ? 2 : v % 2);
    case 'dirt': return T.dirtTex(v % 2);
    case 'stone': return T.stoneTex(v % 2);
    case 'stoneMoss': return T.stoneTex(v % 3 === 0 ? 2 : v % 2);
    case 'darkStone': return lamTexDark(v);
    case 'sand': return T.sandTex(0);
    case 'wood': return T.woodTex(v % 2);
    case 'riverbed': return T.sandTex(1);
    default: return T.grassTex(0);
  }
}
const darkCache = {};
function lamTexDark(v) { return (darkCache[v % 2] ||= T.stoneTex(v % 2)); }

export class World {
  constructor(game) {
    this.game = game;
    this.camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.5, 300);
    this.camOffset = new THREE.Vector3(0, 12.2, 18.6);
    this.camTarget = new THREE.Vector3();
    this.camFocus = null; // 剧情镜头目标
    this.shake = 0;
    this.npcs = [];
    this.objects = [];
    this.triggers = [];
    this.exits = [];
    this.updaters = [];
    this.trail = [];
  }

  // ---------- 加载 ----------
  load(def, spawn) {
    this.def = def;
    const scene = (this.scene = new THREE.Scene());
    this.npcs = []; this.objects = []; this.triggers = []; this.exits = []; this.updaters = []; this.solids = []; this.trail = [];
    this.grid = def.grid.map((row) => row.split(''));
    this.H = this.grid.length; this.W = this.grid[0].length;
    const env = def.env;
    scene.fog = new THREE.Fog(env.fog, env.fogNear ?? 26, env.fogFar ?? 70);
    scene.background = new THREE.Color(env.fog);
    // 灯光
    const hemi = new THREE.HemisphereLight(env.hemi[0], env.hemi[1], env.hemi[2]);
    scene.add(hemi);
    const sun = (this.sun = new THREE.DirectionalLight(env.sun[0], env.sun[1]));
    this.sunOffset = new THREE.Vector3(...env.sunDir);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -20; sc.right = 20; sc.top = 20; sc.bottom = -20; sc.near = 1; sc.far = 90;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    scene.add(sun); scene.add(sun.target);
    if (env.ambient) scene.add(new THREE.AmbientLight(env.ambient[0], env.ambient[1]));
    this.buildGround();
    this.buildBackdrop(env);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(this.W + 60, this.H + 40), waterMaterial(env.water || {}));
    water.rotation.x = -Math.PI / 2; water.position.set(this.W / 2, -0.2, this.H / 2 + 6);
    water.renderOrder = 2;
    scene.add(water);
    // 玩家
    const g = this.game;
    this.player = new Actor('moheng', { id: 'player' });
    scene.add(this.player.group);
    this.follower = null;
    if (g.state.party.includes('wuyue') && !def.noFollower) {
      this.follower = new Actor('wuyue', { id: 'wuyue' });
      scene.add(this.follower.group);
    }
    def.build?.(this, g);
    for (const n of def.npcs?.(g) || []) this.addNPC(n);
    for (const o of def.objects?.(g) || []) this.objects.push(o);
    for (const t of def.triggers?.(g) || []) this.triggers.push(t);
    for (const e of def.exits || []) this.exits.push(e);
    this.player.setPos(spawn.x, spawn.z, this.heightAt(spawn.x, spawn.z));
    this.player.face(spawn.dir || 'down');
    if (this.follower) { this.follower.setPos(spawn.x, spawn.z + 0.01); this.follower.face(spawn.dir || 'down'); }
    this.camTarget.set(spawn.x, 0.8, spawn.z);
    this.clampCam(this.camTarget);
    this.updateCamera(0, true);
    this.encounterMeter = 0;
    this.nextEncounter = 14 + Math.random() * 18;
    return scene;
  }

  pad() { return { w: 12, n: 8, s: 10 }; }

  cellRaw(x, z) {
    const cx = Math.max(0, Math.min(this.W - 1, x)), cz = Math.max(0, Math.min(this.H - 1, z));
    return this.grid[cz][cx];
  }
  cell(x, z) {
    if (x < 0 || z < 0 || x >= this.W || z >= this.H) return null;
    return this.grid[z][x];
  }
  setCell(x, z, ch) { this.grid[z][x] = ch; }

  buildGround() {
    const pad = this.pad();
    const groups = new Map();
    const tufts = [], flowers = [], pebbles = [], bamboo = [], trees = [];
    for (let z = -pad.n; z < this.H + pad.s; z++) for (let x = -pad.w; x < this.W + pad.w; x++) {
      let ch = this.cellRaw(x, z);
      const outside = x < 0 || z < 0 || x >= this.W || z >= this.H;
      if (outside && ch === 'w') ch = '~';
      if (outside && (ch === 'b')) ch = '~';
      if (outside && z < 0 && ch !== '^' && ch !== '#' && ch !== 'B' && ch !== 'W') ch = '#';
      if (outside && (ch === ',' || ch === '=' || ch === 'r' || ch === 'd')) ch = this.def.padFill || '.';
      if (ch === 'o') continue;
      const t = TYPES[ch] || TYPES['.'];
      const v = Math.floor(hash2(x, z, 7) * 6);
      const key = ch + '_' + (v % 3);
      if (!groups.has(key)) groups.set(key, { t, v, list: [] });
      groups.get(key).list.push([x, z]);
      const r = hash2(x, z, 13);
      if (t.decor === 'grass' && r < 0.55) tufts.push([x, z, r]);
      if (t.decor === 'flower' && r < 0.8) flowers.push([x, z, r]);
      if (t.decor === 'pebble' && r < 0.25) pebbles.push([x, z, r]);
      if (t.bamboo) bamboo.push([x, z]);
      if (t.tree && (!outside || r < 0.35)) trees.push([x, z, r]);
      if (ch === '#' || ch === '^') { if (r < 0.3 && !outside) tufts.push([x, z, r, t.h]); }
    }
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const m4 = new THREE.Matrix4();
    for (const [key, { t, v, list }] of groups) {
      const bottom = t.bottom ?? (t.h - 1.2);
      const hgt = t.h - bottom;
      const top = new THREE.MeshLambertMaterial({ map: topTex(t.top, v) });
      let sideTex;
      if (t.side === 'rock') { sideTex = T.rockSideTex(v % 2).clone(); sideTex.wrapT = THREE.RepeatWrapping; sideTex.repeat.set(1, hgt); sideTex.needsUpdate = true; }
      else if (t.side === 'ruinwall') { sideTex = T.stoneTex(2).clone(); sideTex.wrapT = THREE.RepeatWrapping; sideTex.repeat.set(1, hgt); sideTex.needsUpdate = true; }
      else if (t.top === 'wood') sideTex = T.woodTex(1);
      else if (t.top === 'riverbed') sideTex = T.sandTex(2);
      else if (t.top === 'stone' || t.top === 'stoneMoss' || t.top === 'darkStone') sideTex = T.stoneTex(1);
      else sideTex = T.grassSideTex();
      const side = lam('side_' + key + hgt, { map: sideTex });
      if (t.h > 1) applyOcclusionFade(side);
      const mats = [side, side, top, side, side, side];
      if (t.h > 1) applyOcclusionFade(top);
      const im = new THREE.InstancedMesh(geo, mats, list.length);
      list.forEach(([x, z], i) => {
        m4.makeScale(1, hgt, 1);
        m4.setPosition(x + 0.5, bottom + hgt / 2, z + 0.5);
        im.setMatrixAt(i, m4);
      });
      im.receiveShadow = true; im.castShadow = t.h > 0.5;
      this.scene.add(im);
    }
    // 草丛与花
    const tuftGeo = new THREE.PlaneGeometry(0.8, 0.8); tuftGeo.translate(0, 0.38, 0);
    const mk = (arr, texKind, scale) => {
      if (!arr.length) return;
      const mat = applySway(new THREE.MeshLambertMaterial({ map: T.grassTuftTex(texKind), alphaTest: 0.5, side: THREE.DoubleSide }), 0.12);
      const im = new THREE.InstancedMesh(tuftGeo, mat, arr.length);
      arr.forEach(([x, z, r, h = 0], i) => {
        m4.makeScale(scale * (0.7 + r), scale * (0.7 + r), 1);
        m4.setPosition(x + 0.2 + hash2(x, z, 3) * 0.6, h, z + 0.2 + hash2(x, z, 5) * 0.6);
        im.setMatrixAt(i, m4);
      });
      im.receiveShadow = true;
      this.scene.add(im);
    };
    mk(tufts.filter((a) => a[2] < 0.38 || a[3]), 0, 1);
    mk(tufts.filter((a) => a[2] >= 0.38 && !a[3]), 2, 0.8);
    mk(flowers, 1, 0.9);
    if (pebbles.length) {
      const pg = new THREE.DodecahedronGeometry(0.08, 0);
      const im = new THREE.InstancedMesh(pg, lam('pebble', { color: '#8f8577', flatShading: true }), pebbles.length);
      pebbles.forEach(([x, z, r], i) => { m4.makeScale(1 + r * 2, 0.6, 1 + r); m4.setPosition(x + hash2(x, z, 9), 0.02, z + hash2(x, z, 11)); im.setMatrixAt(i, m4); });
      im.receiveShadow = true;
      this.scene.add(im);
    }
    if (bamboo.length) this.buildBamboo(bamboo);
    for (const [x, z, r] of trees) {
      const kind = this.def.treeKind || 'pine';
      const t = P.tree({ kind: Array.isArray(kind) ? kind[Math.floor(r * kind.length)] : kind, scale: 0.9 + r * 0.5, seed: x * 31 + z });
      t.position.set(x + 0.5, 0, z + 0.5);
      t.traverse((m) => { if (m.isMesh) applyOcclusionFade(m.material); });
      this.scene.add(t);
    }
  }

  buildBamboo(cells) {
    const stalks = [], leaves = [];
    for (const [x, z] of cells) {
      const n = 2 + Math.floor(hash2(x, z, 21) * 2);
      for (let i = 0; i < n; i++) {
        const sx = x + 0.15 + hash2(x, z, 30 + i) * 0.7, sz = z + 0.15 + hash2(x, z, 40 + i) * 0.7;
        const h = 6 + hash2(x, z, 50 + i) * 5;
        const lean = (hash2(x, z, 60 + i) - 0.5) * 0.12;
        stalks.push([sx, sz, h, lean]);
        for (let k = 0; k < 3; k++) leaves.push([sx + lean * h * (0.6 + k * 0.15) + (hash2(x, z, 70 + i * 3 + k) - 0.5) * 1.0, h * (0.5 + k * 0.2), sz + (hash2(x, z, 80 + k) - 0.5) * 0.6, hash2(x, z, 90 + i + k)]);
      }
    }
    const sGeo = new THREE.CylinderGeometry(0.06, 0.075, 1, 6); sGeo.translate(0, 0.5, 0);
    const sTex = T.bambooStalkTex().clone(); sTex.wrapT = THREE.RepeatWrapping; sTex.repeat.set(1, 5); sTex.needsUpdate = true;
    const sMat = applyOcclusionFade(new THREE.MeshLambertMaterial({ map: sTex }));
    const im = new THREE.InstancedMesh(sGeo, sMat, stalks.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    stalks.forEach(([x, z, h, lean], i) => {
      e.set(0, 0, lean); q.setFromEuler(e);
      m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, h, 1));
      im.setMatrixAt(i, m4);
    });
    im.castShadow = true; im.receiveShadow = true;
    this.scene.add(im);
    const lGeo = new THREE.PlaneGeometry(2.4, 2.4);
    const lMats = [3, 7].map((s) => applyOcclusionFade(applySway(new THREE.MeshLambertMaterial({ map: T.bambooLeafTex(s), alphaTest: 0.5, side: THREE.DoubleSide }), 0.15)));
    lMats.forEach((mat, mi) => {
      const sub = leaves.filter((_, i) => i % 2 === mi);
      const li = new THREE.InstancedMesh(lGeo, mat, sub.length);
      sub.forEach(([x, y, z, r], i) => {
        e.set(0, (r - 0.5) * 0.8, (r - 0.5) * 2); q.setFromEuler(e);
        const s = 0.8 + r * 0.6;
        m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s));
        li.setMatrixAt(i, m4);
      });
      li.castShadow = true;
      li.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: mat.map, alphaTest: 0.5 });
      this.scene.add(li);
    });
  }

  buildBackdrop(env) {
    const pad = this.pad();
    const W = this.W + pad.w * 2 + 40;
    const tex = T.inkMountainsTex(4, { tint: env.mountain || '#5e7b78', sky: env.fog, seed: env.seed || 3 }).clone();
    tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(W / 60, 1); tex.needsUpdate = true;
    const sky = T.skyTex(env.skyTop || env.fog, env.fog, 'bd');
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W, 44), new THREE.MeshBasicMaterial({ map: sky, fog: false, depthWrite: false }));
    back.position.set(this.W / 2, 10, -pad.n - 14);
    back.rotation.x = -0.35;
    this.scene.add(back);
    const mtn = new THREE.Mesh(new THREE.PlaneGeometry(W, 20), new THREE.MeshBasicMaterial({ map: tex, transparent: true, fog: false, depthWrite: false }));
    mtn.position.set(this.W / 2, 3.5, -pad.n - 12);
    mtn.rotation.x = -0.35;
    this.scene.add(mtn);
    if (env.sunDisc) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), new THREE.MeshBasicMaterial({ color: env.sunDisc, fog: false, transparent: true, opacity: 0.9 }));
      disc.position.set(this.W * 0.7, 11, -pad.n - 13.5); disc.rotation.x = -0.35;
      disc.renderOrder = -1;
      this.scene.add(disc);
      mtn.renderOrder = 0;
    }
  }

  // ---------- 放置 ----------
  add(obj, x, z, { solid = null, y = 0, rot = 0, fade = false } = {}) {
    obj.position.set(x, y, z);
    obj.rotation.y = rot;
    this.scene.add(obj);
    if (solid) {
      const [w, d] = solid;
      this.solids.push({ x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2 });
    }
    if (fade) obj.traverse((m) => { if (m.isMesh) { const ms = Array.isArray(m.material) ? m.material : [m.material]; ms.forEach(applyOcclusionFade); } });
    obj.traverse((o) => { if (o.userData.update) this.updaters.push(o.userData.update); });
    if (obj.userData.flicker) this.updaters.push((t) => {
      const f = obj.userData.flicker; const k = 1 + Math.sin(t * 13 + x) * 0.06 + Math.sin(t * 7.3 + z) * 0.05;
      f.scale.setScalar(k);
      if (obj.userData.light) obj.userData.light.intensity = (obj.userData.baseI ??= obj.userData.light.intensity) * k;
    });
    return obj;
  }
  solidRect(x0, z0, x1, z1) { const r = { x0, z0, x1, z1 }; this.solids.push(r); return r; }
  removeSolid(r) { this.solids = this.solids.filter((s) => s !== r); }
  onUpdate(fn) { this.updaters.push(fn); }

  addNPC(def) {
    const a = new Actor(def.look, { id: def.id, scale: def.scale || 1 });
    a.def = def;
    a.setPos(def.x, def.z, this.heightAt(def.x, def.z));
    a.face(def.dir || 'down');
    a.home = { x: def.x, z: def.z };
    a.wanderT = Math.random() * 3;
    this.scene.add(a.group);
    this.npcs.push(a);
    return a;
  }
  npc(id) { return this.npcs.find((n) => n.id === id); }
  removeNPC(id) { const n = this.npc(id); if (n) { this.scene.remove(n.group); this.npcs = this.npcs.filter((x) => x !== n); } }

  // ---------- 物理 ----------
  heightAt(x, z) {
    const c = this.cell(Math.floor(x), Math.floor(z));
    const t = TYPES[c];
    if (!t) return 0;
    if (t.walkH !== undefined) return t.walkH;
    return t.walk ? Math.max(0, t.h) : 0;
  }
  blocked(x, z, r = 0.26) {
    for (const [dx, dz] of [[-r, -r], [r, -r], [-r, r], [r, r], [0, 0]]) {
      const c = this.cell(Math.floor(x + dx), Math.floor(z + dz * 0.6));
      if (!c || !(TYPES[c]?.walk)) return true;
    }
    for (const s of this.solids) if (x + r > s.x0 && x - r < s.x1 && z + r * 0.6 > s.z0 && z - r * 0.6 < s.z1) return true;
    for (const n of this.npcs) if (n.def?.solid !== false && n.visible && Math.hypot(n.x - x, (n.z - z) * 1.4) < 0.5) return true;
    return false;
  }

  // ---------- 镜头 ----------
  clampCam(v) {
    const m = this.def.camMargin || { x0: 10, x1: 10, z0: 6, z1: 4 };
    v.x = Math.max(m.x0, Math.min(this.W - m.x1, v.x));
    v.z = Math.max(m.z0, Math.min(this.H - m.z1, v.z));
  }
  updateCamera(dt, snap = false) {
    const tgt = new THREE.Vector3();
    if (this.camFocus) tgt.copy(this.camFocus);
    else { tgt.set(this.player.x, 0.8, this.player.z); this.clampCam(tgt); }
    if (snap) this.camTarget.copy(tgt);
    else this.camTarget.lerp(tgt, 1 - Math.exp(-dt * (this.camFocus ? 2.2 : 4.5)));
    const off = this.camOffset;
    this.camera.position.copy(this.camTarget).add(off);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      const s = this.shake * 0.35;
      this.camera.position.x += (Math.random() - 0.5) * s; this.camera.position.y += (Math.random() - 0.5) * s;
    }
    this.camera.lookAt(this.camTarget);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.sun.position.copy(this.camTarget).add(this.sunOffset);
    this.sun.target.position.copy(this.camTarget);
    shared.uPlayer.value.set(this.player.x, this.player.y + 0.7, this.player.z);
    shared.uCamDir.value.copy(off).normalize();
  }
  panTo(x, z, dur = 1.2) {
    this.camFocus = new THREE.Vector3(x, 0.8, z);
    return new Promise((r) => setTimeout(r, dur * 1000));
  }
  release() { this.camFocus = null; }

  // ---------- 每帧 ----------
  update(dt, t, mode) {
    const g = this.game;
    const input = g.input;
    const p = this.player;
    if (mode === 'explore') {
      const a = input.axis();
      const run = input.isHeld('dash');
      const spd = (run ? 5.6 : 3.4) * dt;
      p.running = run;
      if (a.x || a.z) {
        const nx = p.x + a.x * spd, nz = p.z + a.z * spd;
        let moved = 0;
        if (!this.blocked(nx, p.z)) { moved += Math.abs(nx - p.x); p.x = nx; }
        if (!this.blocked(p.x, nz)) { moved += Math.abs(nz - p.z); p.z = nz; }
        p.dir = Math.abs(a.x) > Math.abs(a.z) ? (a.x > 0 ? 'right' : 'left') : (a.z > 0 ? 'down' : 'up');
        p.moving = moved > 0.0001;
        if (p.moving) this.onStep(moved);
      } else p.moving = false;
      p.y = this.heightAt(p.x, p.z);
      this.checkTriggers();
      // 互动
      const target = this.nearestInteractable();
      g.ui.setPromptTarget(target);
      if (target && input.consume('confirm')) g.interact(target);
      if (input.consume('menu') || input.consume('cancel')) g.openMenu();
    } else if (mode !== 'script') {
      p.moving = false;
    }
    // 跟随者
    if (this.follower) {
      const last = this.trail[this.trail.length - 1];
      if (!last || Math.hypot(last.x - p.x, last.z - p.z) > 0.08) this.trail.push({ x: p.x, z: p.z, dir: p.dir });
      if (this.trail.length > 60) this.trail.shift();
      const f = this.follower;
      if (!f.path && !f.scripted) {
        const idx = this.trail.length - 11;
        if (idx >= 0) {
          const tp = this.trail[idx];
          f.moving = Math.hypot(tp.x - f.x, tp.z - f.z) > 0.01;
          if (f.moving) f.faceToward(tp.x, tp.z);
          f.x = tp.x; f.z = tp.z; f.y = this.heightAt(f.x, f.z);
        } else f.moving = false;
      }
      f.running = p.running;
      f.update(dt, this);
    }
    p.update(dt, null);
    // NPC 闲逛
    for (const n of this.npcs) {
      if (n.def.wander && !n.path && mode === 'explore') {
        n.wanderT -= dt;
        if (n.wanderT <= 0) {
          n.wanderT = 2 + Math.random() * 4;
          const tx = n.home.x + (Math.random() - 0.5) * n.def.wander * 2, tz = n.home.z + (Math.random() - 0.5) * n.def.wander;
          if (!this.blocked(tx, tz) && Math.hypot(tx - p.x, tz - p.z) > 1.2) n.walkTo(tx, tz, 1.2);
        }
      }
      n.update(dt, this);
    }
    for (const u of this.updaters) u(t, dt);
    shared.time.value = t;
    this.updateCamera(dt);
    g.ui.updateBubbles(this);
  }

  resetTrail() {
    const f = this.follower, p = this.player;
    if (!f) return;
    this.trail = [];
    for (let i = 0; i <= 12; i++) { const k = i / 12; this.trail.push({ x: f.x + (p.x - f.x) * k, z: f.z + (p.z - f.z) * k, dir: p.dir }); }
  }

  onStep(d) {
    const enc = this.def.encounters;
    if (!enc || this.game.state.flags.noEncounter || (enc.cond && !enc.cond(this.game))) { this.game.ui.setDanger(null); return; }
    this.encounterMeter += d;
    const k = this.encounterMeter / this.nextEncounter;
    this.game.ui.setDanger(k);
    if (k >= 1) {
      this.encounterMeter = 0;
      this.nextEncounter = 16 + Math.random() * 20;
      const table = enc.table;
      const pick = table[Math.floor(Math.random() * table.length)];
      this.game.randomBattle(pick, enc.bg);
    }
  }

  nearestInteractable() {
    const p = this.player;
    const fx = p.dir === 'left' ? -1 : p.dir === 'right' ? 1 : 0, fz = p.dir === 'up' ? -1 : p.dir === 'down' ? 1 : 0;
    let best = null, bd = 1e9;
    const consider = (o, x, z, r) => {
      const dx = x - p.x, dz = z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > r) return;
      const facing = (dx * fx + dz * fz) / (d || 1);
      const score = d - facing * 0.6;
      if (facing < -0.3 && d > 0.7) return;
      if (score < bd) { bd = score; best = o; }
    };
    for (const n of this.npcs) if (n.def.talk && n.visible) consider({ kind: 'npc', npc: n, x: n.x, z: n.z, y: n.h + 0.3 }, n.x, n.z, 1.5);
    for (const o of this.objects) if (!o.enabled || o.enabled(this.game)) consider({ kind: 'obj', obj: o, x: o.x, z: o.z, y: o.y ?? 1.2 }, o.x, o.z, o.r || 1.3);
    return best;
  }

  checkTriggers() {
    const p = this.player, g = this.game;
    for (const tr of this.triggers) {
      const key = `trig_${this.def.id}_${tr.id}`;
      if (tr.once !== false && g.state.flags[key]) continue;
      if (tr.cond && !tr.cond(g)) continue;
      if (p.x >= tr.x0 && p.x <= tr.x1 && p.z >= tr.z0 && p.z <= tr.z1) {
        if (tr.once !== false) g.state.flags[key] = true;
        g.runScript(tr.run);
        return;
      }
    }
    for (const e of this.exits) {
      if (p.x >= e.x0 && p.x <= e.x1 && p.z >= e.z0 && p.z <= e.z1) {
        if (e.cond && !e.cond(g)) { if (e.blocked) g.runScript(e.blocked); continue; }
        g.changeMap(e.to, e.spawn);
        return;
      }
    }
  }
}

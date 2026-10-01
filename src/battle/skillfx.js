// 招式演出（轩辕剑式：剑气、符咒、机关、巫蛊）
// 每个演出在命中瞬间调用 hit(target, i) 结算伤害，演出节奏决定结算时机
import * as THREE from 'three';
import * as A from './fxart.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => k * k * (3 - 2 * k);
const easeIn = (k) => k * k * k;

async function projectile(fx, mesh, from, to, dur, { arc = 0, trail = null, spin = 0, face = true } = {}) {
  fx.add(mesh);
  await fx.anim(dur, (k) => {
    const e = ease(k);
    mesh.position.set(lerp(from.x, to.x, e), lerp(from.y, to.y, e) + Math.sin(k * Math.PI) * arc, lerp(from.z, to.z, e));
    if (spin) mesh.rotation.z += spin;
    else if (face) mesh.rotation.z = Math.atan2(to.y - from.y, to.x - from.x) - Math.PI / 2;
    if (trail) fx.vfx.emit(mesh.position, 2, trail);
  });
  fx.remove(mesh);
}

async function meleeIn(fx, u, t) {
  const tp = fx.feet(t);
  const dir = Math.sign(tp.x - u.home.x) || -1;
  fx.pose(u, 'idle');
  await fx.move(u, V(tp.x - dir * (t.boss ? 2.4 : 1.3), 0, tp.z + 0.05), 0.22);
}
async function meleeOut(fx, u) { await fx.move(u, u.home.clone(), 0.25); fx.pose(u, 'idle'); }

// 符纸投射
async function throwTalisman(fx, u, t, color = '#ffd070') {
  fx.pose(u, 'cast');
  const from = fx.center(u).add(V(-0.3, 0.5, 0));
  const m = A.spritePlane(A.talismanTex(), 0.3, 0.6);
  await projectile(fx, m, from, fx.center(t), 0.32, { arc: 0.8, spin: 0.5, trail: { color, color2: '#ffffff', speed: 0.3, life: 0.35, size: 0.16 } });
}

export const SKILL_FX = {
  // ---------- 普攻 ----------
  async attack(fx, u, [t], boost, hit) {
    const n = 1 + boost;
    if (u.weapon === 'charm') {
      for (let i = 0; i < n; i++) {
        fx.sfx('whoosh');
        await throwTalisman(fx, u, t);
        fx.vfx.preset('hit', fx.center(t)); fx.vfx.emit(fx.center(t), 16, { color: '#ffe08a', speed: 2.5, life: 0.4, size: 0.18 });
        fx.sfx('hit'); hit(t, i);
        await fx.sleep(90);
      }
      fx.pose(u, 'idle');
      return;
    }
    await meleeIn(fx, u, t);
    for (let i = 0; i < n; i++) {
      fx.pose(u, 'attack');
      fx.sfx('slash');
      fx.vfx.slash(fx.center(t), '#eaf4ff', i % 2 ? -1 : 1);
      fx.vfx.preset('hit', fx.center(t));
      hit(t, i);
      await fx.sleep(170);
      fx.pose(u, 'idle');
      await fx.sleep(70);
    }
    await meleeOut(fx, u);
  },

  // ---------- 墨衡 ----------
  async liuguang(fx, u, [t], boost, hit) {
    const n = 2 + boost;
    const c = fx.center(t);
    fx.pose(u, 'attack');
    fx.sfx('whoosh');
    // 化作流光
    const start = fx.center(u);
    await fx.anim(0.14, (k) => fx.vfx.emit(V(lerp(start.x, c.x, k), lerp(start.y, c.y, k), c.z), 6, { color: '#bfe4ff', color2: '#ffffff', speed: 0.4, life: 0.35, size: 0.22 }));
    fx.visible(u, false);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.4;
      const p1 = V(c.x + Math.cos(a) * 1.6, c.y + Math.sin(a) * 1.0, c.z + 0.4), p2 = V(c.x - Math.cos(a) * 1.6, c.y - Math.sin(a) * 1.0, c.z + 0.4);
      fx.ghost(u, p2);
      await fx.anim(0.08, (k) => fx.vfx.emit(V(lerp(p1.x, p2.x, k), lerp(p1.y, p2.y, k), p1.z), 8, { color: '#d8f0ff', color2: '#5aa8ff', speed: 0.3, life: 0.3, size: 0.2 }));
      fx.vfx.slash(c, i % 2 ? '#bfe4ff' : '#ffffff', i % 2 ? -1 : 1);
      fx.sfx('slash');
      fx.vfx.preset('hit', c);
      hit(t, i);
      await fx.sleep(90);
    }
    fx.visible(u, true);
    fx.pose(u, 'attack');
    fx.vfx.emit(c, 40, { color: '#ffffff', color2: '#7ac0ff', speed: 5, life: 0.5, size: 0.18 });
    await fx.sleep(260);
    fx.pose(u, 'idle');
  },

  async tiangang(fx, u, [t], boost, hit) {
    const n = 3 + boost * 2;
    fx.pose(u, 'cast');
    fx.sfx('metal');
    const c = fx.center(t);
    const circle = A.spritePlane(A.runeCircleTex('#ffe08a'), 3.2, 3.2, { additive: true });
    circle.position.set(c.x, c.y + 3.2, c.z); circle.rotation.x = -Math.PI / 2.4;
    fx.add(circle);
    fx.vfx.light(V(c.x, c.y + 3, c.z), '#ffe8a0', 30, 1.6);
    const swords = [];
    for (let i = 0; i < n; i++) {
      const s = A.swordMesh();
      const a = (i / n) * Math.PI * 2;
      s.position.set(c.x + Math.cos(a) * 1.1, c.y + 3.0 + Math.sin(a) * 0.3, c.z + Math.sin(a) * 0.6);
      s.scale.setScalar(0.01);
      fx.add(s); swords.push(s);
    }
    await fx.anim(0.45, (k) => { circle.rotation.z = k * 2; swords.forEach((s, i) => s.scale.setScalar(ease(Math.min(1, k * 1.6 - i * 0.08)) + 0.01)); });
    await fx.sleep(120);
    for (let i = 0; i < n; i++) {
      const s = swords[i];
      const from = s.position.clone();
      const to = V(c.x + (Math.random() - 0.5) * 0.6, c.y - 0.3, c.z + 0.2);
      fx.sfx('slash');
      fx.anim(0.13, (k) => { s.position.lerpVectors(from, to, easeIn(k)); circle.rotation.z += 0.05; }).then(() => {
        fx.vfx.emit(to, 18, { color: '#fff6c8', color2: '#ffc040', speed: 4, life: 0.35, size: 0.15 });
        fx.remove(s);
      });
      await fx.sleep(i === n - 1 ? 140 : 70);
    }
    fx.vfx.preset('metal', c);
    fx.shake(0.25);
    hit(t, 0);
    await fx.anim(0.3, (k) => { circle.material.opacity = 1 - k; });
    fx.remove(circle);
    fx.pose(u, 'idle');
  },

  async liannu(fx, u, [t], boost, hit) {
    const n = 2 + boost;
    fx.pose(u, 'attack');
    for (let i = 0; i < n; i++) {
      fx.sfx('bow');
      const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.04), new THREE.MeshBasicMaterial({ color: '#fff0c0' }));
      const from = fx.center(u).add(V(-0.5, 0.1 + (i % 2) * 0.12, 0));
      const to = fx.center(t).add(V(0, (Math.random() - 0.5) * 0.5, 0));
      fx.add(bolt);
      await fx.anim(0.12, (k) => { bolt.position.lerpVectors(from, to, k); fx.vfx.emit(bolt.position, 2, { color: '#ffd080', speed: 0.2, life: 0.2, size: 0.12 }); });
      fx.remove(bolt);
      fx.vfx.preset('bow', to); fx.sfx('hit');
      hit(t, i);
      await fx.sleep(60);
    }
    await fx.sleep(150);
    fx.pose(u, 'idle');
  },

  async modou(fx, u, [t], boost, hit) {
    fx.pose(u, 'attack');
    fx.sfx('whoosh');
    const c = fx.center(t), from = fx.center(u);
    const lines = [];
    for (let i = 0; i < 4 + boost; i++) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.05), new THREE.MeshBasicMaterial({ color: '#141018', transparent: true, side: THREE.DoubleSide }));
      fx.add(l); lines.push({ l, off: (i - 2) * 0.35, a: Math.random() * 6 });
    }
    await fx.anim(0.35, (k) => {
      lines.forEach(({ l, off }) => {
        const tx = lerp(from.x, c.x, ease(k)), ty = lerp(from.y, c.y + off, ease(k));
        const len = Math.hypot(tx - from.x, ty - from.y);
        l.scale.x = Math.max(0.01, len); l.position.set((from.x + tx) / 2, (from.y + ty) / 2, c.z + 0.3);
        l.rotation.z = Math.atan2(ty - from.y, tx - from.x);
      });
    });
    fx.sfx('hit');
    // 缠绕
    await fx.anim(0.4, (k) => {
      lines.forEach(({ l, off, a }, i) => {
        l.scale.x = 1.6; l.position.set(c.x, c.y + off * 0.8, c.z + 0.35); l.rotation.z = a + k * 4 * (i % 2 ? 1 : -1);
      });
      fx.vfx.emit(c, 3, { color: '#2a2440', color2: '#6a5a8a', speed: 1.2, life: 0.6, size: 0.25 });
    });
    hit(t, 0);
    fx.vfx.preset('ink', c);
    await fx.anim(0.3, (k) => lines.forEach(({ l }) => (l.material.opacity = 1 - k)));
    lines.forEach(({ l }) => fx.remove(l));
    fx.pose(u, 'idle');
  },

  async muyuan(fx, u, targets, boost, hit) {
    fx.pose(u, 'cast');
    fx.sfx('wood');
    const kite = A.spritePlane(A.kiteTex(), 2.2, 1.3);
    const from = fx.center(u).add(V(0, 1.5, 0));
    fx.add(kite);
    kite.position.copy(from);
    await fx.anim(0.4, (k) => { kite.position.y = from.y + k * 1.4; kite.position.x = from.x - k * 0.8; kite.rotation.z = Math.sin(k * 6) * 0.15; });
    const passes = 1 + (boost >= 2 ? 1 : 0);
    for (let p = 0; p < passes; p++) {
      const sorted = [...targets].sort((a, b) => b.home.x - a.home.x);
      for (let i = 0; i < sorted.length; i++) {
        const t = sorted[i];
        const c = fx.center(t), st = kite.position.clone();
        fx.sfx('whoosh');
        await fx.anim(0.22, (k) => {
          kite.position.set(lerp(st.x, c.x, k), lerp(st.y, c.y, easeIn(k)), lerp(st.z, c.z + 0.4, k));
          kite.rotation.z = -0.5 * k;
          fx.vfx.emit(kite.position, 3, { color: '#c8f08a', color2: '#7a5a2a', speed: 0.6, life: 0.5, size: 0.16 });
        });
        fx.vfx.preset('wood', c); fx.sfx('hit');
        hit(t, p);
        const s2 = kite.position.clone();
        await fx.anim(0.16, (k) => { kite.position.set(s2.x - k * 0.8, s2.y + k * 1.6, s2.z); kite.rotation.z = -0.5 + k; });
      }
    }
    const e = kite.position.clone();
    await fx.anim(0.4, (k) => { kite.position.set(e.x + k * 6, e.y + k * 2, e.z); });
    fx.remove(kite);
    fx.pose(u, 'idle');
  },

  // ---------- 巫月 ----------
  async fentian(fx, u, [t], boost, hit) {
    fx.sfx('whoosh');
    await throwTalisman(fx, u, t, '#ff9a4a');
    const c = fx.center(t), f = fx.feet(t);
    // 符印
    const seal = A.spritePlane(A.runeCircleTex('#ff7a30'), 2.6, 2.6, { additive: true });
    seal.position.set(f.x, 0.05, f.z); seal.rotation.x = -Math.PI / 2;
    fx.add(seal);
    await fx.anim(0.25, (k) => { seal.scale.setScalar(ease(k)); seal.rotation.z = k; });
    fx.sfx('fire');
    // 火柱
    const tex = A.flameGradTex().clone(); tex.needsUpdate = true;
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7 + boost * 0.15, 0.9 + boost * 0.15, 4.5, 16, 1, true), new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    pillar.position.set(f.x, 2.25, f.z);
    fx.add(pillar);
    fx.vfx.light(c, '#ff6a20', 70, 0.9);
    fx.shake(0.2 + boost * 0.1);
    let hitDone = false;
    await fx.anim(0.75, (k) => {
      pillar.scale.set(1 + Math.sin(k * 30) * 0.05, ease(Math.min(1, k * 3)), 1 + Math.sin(k * 30) * 0.05);
      tex.offset.y -= 0.04;
      fx.vfx.emit(V(f.x + (Math.random() - 0.5), 0.2, f.z), 4, { color: '#ffe080', color2: '#ff3a10', speed: 0.6, up: 4, life: 0.7, size: 0.3 });
      if (!hitDone && k > 0.25) { hitDone = true; hit(t, 0); }
    });
    await fx.anim(0.25, (k) => { pillar.material.opacity = 1 - k; seal.material.opacity = 1 - k; });
    fx.remove(pillar); fx.remove(seal);
    fx.pose(u, 'idle');
  },

  async hanlan(fx, u, [t], boost, hit) {
    fx.sfx('whoosh');
    await throwTalisman(fx, u, t, '#8ad8ff');
    const f = fx.feet(t), c = fx.center(t);
    fx.sfx('water');
    fx.vfx.ring(V(f.x, 0.05, f.z), '#8ad8ff', 0.7, 3);
    const spikes = [];
    const n = 7 + boost * 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 0.5 + Math.random() * 0.6;
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.4 + Math.random(), 5), new THREE.MeshBasicMaterial({ color: i % 2 ? '#c8f0ff' : '#7ac8f0', transparent: true, opacity: 0.85 }));
      s.position.set(f.x + Math.cos(a) * r, -1, f.z + Math.sin(a) * r * 0.6);
      s.rotation.z = -Math.cos(a) * 0.4; s.rotation.x = Math.sin(a) * 0.3;
      fx.add(s); spikes.push(s);
    }
    await fx.anim(0.22, (k) => spikes.forEach((s, i) => (s.position.y = lerp(-1, 0.55, ease(Math.min(1, k * 1.3 - (i % 3) * 0.1))))));
    fx.vfx.preset('water', c);
    fx.vfx.light(c, '#8ad8ff', 40, 0.6);
    hit(t, 0);
    fx.shake(0.15);
    await fx.sleep(350);
    await fx.anim(0.3, (k) => spikes.forEach((s) => { s.material.opacity = 0.85 * (1 - k); s.position.y -= 0.02; }));
    spikes.forEach((s) => fx.remove(s));
    fx.pose(u, 'idle');
  },

  async yanbeng(fx, u, [t], boost, hit) {
    fx.pose(u, 'cast');
    fx.sfx('whoosh');
    const c = fx.center(t), f = fx.feet(t);
    const circle = A.spritePlane(A.runeCircleTex('#e0b060'), 2.4, 2.4, { additive: true });
    circle.position.set(f.x, 0.05, f.z); circle.rotation.x = -Math.PI / 2; fx.add(circle);
    const n = 3 + boost * 2;
    for (let i = 0; i < n; i++) {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.35, 0), new THREE.MeshLambertMaterial({ color: '#8a7a62', flatShading: true }));
      const to = V(f.x + (Math.random() - 0.5) * 1.2, 0.3, f.z + (Math.random() - 0.5) * 0.6);
      const from = V(to.x + 1.5, 7, to.z);
      fx.add(r);
      fx.anim(0.32, (k) => { r.position.lerpVectors(from, to, easeIn(k)); r.rotation.x += 0.2; r.rotation.y += 0.15; }).then(() => {
        fx.vfx.emit(to, 20, { color: '#c8b088', color2: '#6a5a42', speed: 3, up: 1.5, gravity: 6, life: 0.6, size: 0.25 });
        fx.sfx('hit'); fx.shake(0.12);
        fx.anim(0.3, (k) => r.scale.setScalar(1 - k)).then(() => fx.remove(r));
      });
      await fx.sleep(110);
    }
    await fx.sleep(250);
    hit(t, 0);
    await fx.anim(0.25, (k) => (circle.material.opacity = 1 - k));
    fx.remove(circle);
    fx.pose(u, 'idle');
  },

  async huichun(fx, u, [t], boost, hit) {
    fx.pose(u, 'cast');
    fx.sfx('chime');
    const from = fx.center(u), to = fx.center(t);
    const flies = [];
    for (let i = 0; i < 6 + boost * 2; i++) {
      const b = A.spritePlane(A.butterflyTex(), 0.4, 0.3, { additive: true });
      b.userData = { ph: Math.random() * 6, r: 0.6 + Math.random() * 0.5, d: Math.random() * 0.3 };
      fx.add(b); flies.push(b);
    }
    await fx.anim(1.0, (k) => {
      flies.forEach((b) => {
        const kk = Math.max(0, Math.min(1, (k - b.userData.d) / 0.7));
        const e = ease(kk), a = b.userData.ph + k * 8;
        b.position.set(lerp(from.x, to.x, e) + Math.cos(a) * b.userData.r * (1 - e * 0.5), lerp(from.y, to.y, e) + Math.sin(a * 1.3) * 0.4 + 0.3, lerp(from.z, to.z, e) + 0.3);
        b.scale.x = 0.3 + Math.abs(Math.sin(k * 40 + b.userData.ph));
        if (Math.random() < 0.3) fx.vfx.emit(b.position, 1, { color: '#9affd8', speed: 0.2, life: 0.5, size: 0.12 });
      });
    });
    fx.sfx('heal');
    fx.vfx.preset('heal', to);
    hit(t, 0);
    await fx.anim(0.3, (k) => flies.forEach((b) => (b.material.opacity = 1 - k)));
    flies.forEach((b) => fx.remove(b));
    fx.pose(u, 'idle');
  },

  async linghu(fx, u, targets, boost, hit) {
    fx.pose(u, 'cast');
    fx.sfx('buff');
    const circles = targets.map((t) => {
      const f = fx.feet(t);
      const c = A.spritePlane(A.runeCircleTex('#9ad8ff'), 2.2, 2.2, { additive: true });
      c.position.set(f.x, 0.06, f.z); c.rotation.x = -Math.PI / 2; fx.add(c);
      return c;
    });
    await fx.anim(0.8, (k) => {
      circles.forEach((c, i) => { c.rotation.z = k * 3; c.scale.setScalar(ease(Math.min(1, k * 2))); });
      targets.forEach((t) => fx.vfx.emit(fx.feet(t).add(V((Math.random() - 0.5) * 1.2, 0.1, 0)), 2, { color: '#c8ecff', color2: '#ffffff', speed: 0.1, up: 2.5, life: 0.7, size: 0.14 }));
    });
    targets.forEach((t, i) => { fx.vfx.preset('buff', fx.center(t)); hit(t, i); });
    await fx.anim(0.4, (k) => circles.forEach((c) => (c.material.opacity = 1 - k)));
    circles.forEach((c) => fx.remove(c));
    fx.pose(u, 'idle');
  },

  async zhuque(fx, u, targets, boost, hit) {
    fx.pose(u, 'cast');
    await fx.cutin('炎阵·朱雀', '南明离火，朱雀临凡');
    fx.dim(true);
    fx.sfx('fire');
    const bird = A.spritePlane(A.zhuqueTex(), 5.4, 3.24);
    bird.material.color.setRGB(1.6, 1.3, 1.1);
    const halo = A.spritePlane(A.zhuqueTex(), 6.4, 3.9, { additive: true, opacity: 0.35 });
    halo.position.z = -0.05; bird.add(halo);
    bird.scale.x = -1;
    const xs = targets.map((t) => t.home.x);
    const y = 2.4;
    const x0 = 8, x1 = Math.min(...xs) - 6;
    fx.add(bird);
    const done = new Set();
    await fx.anim(1.3, (k) => {
      bird.position.set(lerp(x0, x1, k), y + Math.sin(k * Math.PI * 3) * 0.3, 1.2);
      bird.scale.y = 1 + Math.sin(k * 40) * 0.08;
      fx.vfx.emit(V(bird.position.x + 1.2, bird.position.y - 0.3, bird.position.z), 6, { color: '#ffe080', color2: '#ff3a10', speed: 1, up: -0.5, life: 0.8, size: 0.35 });
      targets.forEach((t, i) => {
        if (!done.has(t) && bird.position.x < t.home.x + 0.5) {
          done.add(t);
          const c = fx.center(t);
          fx.vfx.preset('fire', c); fx.vfx.light(c, '#ff6a20', 60, 0.8);
          fx.sfx('fire'); fx.shake(0.18);
          hit(t, i);
        }
      });
    });
    fx.remove(bird);
    fx.dim(false);
    fx.pose(u, 'idle');
  },

  // ---------- 炼妖·摄魂 ----------
  async seal(fx, u, [t], boost, hit, ok) {
    fx.pose(u, 'cast');
    fx.sfx('seal');
    const shard = A.spritePlane(A.shardTex(), 0.7, 0.85);
    const sp = fx.center(u).add(V(-0.6, 1.4, 0.3));
    shard.position.copy(sp); fx.add(shard);
    const circle = A.spritePlane(A.runeCircleTex('#7affd0'), 3, 3, { additive: true });
    const tf = fx.feet(t); circle.position.set(tf.x, 0.06, tf.z); circle.rotation.x = -Math.PI / 2; fx.add(circle);
    fx.vfx.light(sp, '#7affd0', 30, 2.2);
    await fx.anim(0.6, (k) => { shard.rotation.y = k * 6; circle.rotation.z = k * 4; circle.scale.setScalar(ease(k)); });
    const c = fx.center(t);
    await fx.anim(1.0, (k) => {
      fx.vfx.emit(c, 4, { color: '#9affd8', color2: '#3ad0a0', size: 0.22, life: 0.6, to: sp });
      shard.rotation.y += 0.3;
      if (ok) fx.squash(t, 1 - ease(k) * 0.9, k * 8);
      else fx.squash(t, 1 - Math.sin(k * Math.PI) * 0.35, Math.sin(k * 20) * 0.3);
    });
    hit(t, 0);
    if (ok) { fx.vfx.preset('seal', sp); fx.flash('#bfffe8'); }
    else { fx.squash(t, 1, 0); fx.vfx.emit(c, 40, { color: '#ff6a5a', speed: 4, life: 0.5, size: 0.2 }); }
    await fx.anim(0.35, (k) => { circle.material.opacity = 1 - k; shard.material.opacity = 1 - k; });
    fx.remove(circle); fx.remove(shard);
    fx.pose(u, 'idle');
  },

  // ---------- 道具 ----------
  async item(fx, u, [t], boost, hit, kind) {
    fx.pose(u, 'cast');
    if (kind === 'bomb') {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshLambertMaterial({ color: '#2a2622' }));
      fx.sfx('whoosh');
      await projectile(fx, b, fx.center(u), fx.center(t), 0.45, { arc: 1.6, trail: { color: '#ffb060', speed: 0.3, life: 0.3, size: 0.12 } });
      fx.vfx.preset('fire', fx.center(t)); fx.vfx.preset('break', fx.center(t)); fx.sfx('fire'); fx.shake(0.3);
      hit(t, 0);
    } else {
      fx.sfx('item');
      const c = fx.center(t);
      fx.vfx.emit(c.clone().add(V(0, 1.2, 0)), 20, { color: '#fff6c8', color2: '#9affb0', speed: 0.5, gravity: 2, life: 0.8, size: 0.16 });
      await fx.sleep(300);
      fx.vfx.preset(kind === 'revive' ? 'buff' : 'heal', c);
      fx.sfx(kind === 'revive' ? 'chime' : 'heal');
      hit(t, 0);
    }
    await fx.sleep(250);
    fx.pose(u, 'idle');
  },
};

// ---------- 敌方招式 ----------
export const ENEMY_FX = {
  async melee(fx, e, targets, hit, color = '#ffb070') {
    const t = targets[0];
    const from = e.home.clone();
    const tp = fx.feet(t);
    fx.sfx('whoosh');
    await fx.move(e, V(tp.x - (e.boss ? 3.2 : 1.6), from.y, tp.z), 0.2);
    for (const tt of targets) { fx.vfx.slash(fx.center(tt), color, 1); fx.vfx.preset('hit', fx.center(tt)); hit(tt); }
    fx.sfx('hit');
    fx.shake(e.boss ? 0.35 : 0.15);
    await fx.sleep(220);
    await fx.move(e, from, 0.28);
  },
  async spin(fx, e, targets, hit) {
    const from = e.home.clone();
    await fx.move(e, V(1.0, from.y, 0.3), 0.25);
    for (let i = 0; i < 2; i++) { fx.vfx.slash(V(1.8, 1.2, 0.3), '#ffd0a0', 1); fx.vfx.slash(V(2.8, 1.0, 0.8), '#ffd0a0', -1); fx.sfx('slash'); await fx.sleep(110); }
    targets.forEach((t) => { fx.vfx.preset('hit', fx.center(t)); hit(t); });
    fx.shake(0.2);
    await fx.sleep(200);
    await fx.move(e, from, 0.3);
  },
  async flame(fx, e, targets, hit, color = '#7ad0ff', color2 = '#2a6aff') {
    for (const t of targets) {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color }));
      fx.sfx('fire');
      await projectile(fx, orb, fx.center(e), fx.center(t), 0.35, { arc: 0.6, trail: { color, color2, speed: 0.4, life: 0.4, size: 0.25 } });
      fx.vfx.emit(fx.center(t), 40, { color, color2, speed: 2.5, up: 1.5, life: 0.6, size: 0.3 });
      hit(t);
    }
    await fx.sleep(150);
  },
  async mist(fx, e, targets, hit, color = '#a07ad0') {
    fx.sfx('whoosh');
    for (const t of targets) { fx.vfx.emit(fx.center(t), 40, { color, color2: '#3a2a5a', speed: 1.4, life: 1.0, size: 0.35 }); hit(t); }
    await fx.sleep(500);
  },
  async roar(fx, e, targets, hit) {
    fx.sfx('roar');
    fx.vfx.preset('roar', fx.center(e));
    fx.shake(0.6);
    await fx.sleep(300);
    for (const t of targets) { fx.vfx.preset('debuff', fx.center(t)); hit(t); }
    await fx.sleep(400);
  },
  async buffself(fx, e, targets, hit) {
    fx.sfx('roar'); fx.shake(0.2);
    fx.vfx.preset('buff', fx.center(e));
    hit(e);
    await fx.sleep(500);
  },
  async swallow(fx, e, targets, hit) {
    fx.sfx('roar');
    fx.dim(true);
    const c = fx.center(e);
    const vortex = A.spritePlane(A.runeCircleTex('#c060ff'), 6, 6, { additive: true });
    vortex.position.set(c.x + 0.5, c.y - 0.5, c.z + 1.5); fx.add(vortex);
    await fx.anim(1.0, (k) => {
      vortex.rotation.z -= 0.2; vortex.scale.setScalar(0.3 + k);
      targets.forEach((t) => fx.vfx.emit(fx.center(t), 3, { color: '#c070ff', color2: '#ff5a2a', size: 0.25, life: 0.6, to: c }));
    });
    fx.shake(0.8); fx.flash('#ff8a5a');
    targets.forEach((t) => { fx.vfx.preset('break', fx.center(t)); hit(t); });
    await fx.anim(0.4, (k) => (vortex.material.opacity = 1 - k));
    fx.remove(vortex);
    fx.dim(false);
  },
};

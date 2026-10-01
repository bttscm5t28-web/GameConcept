// 战斗特效：CPU 粒子爆发、斩击、光环
import * as THREE from 'three';
import { radialTex } from '../art/textures.js';

export class VFX {
  constructor(scene, { additive = true } = {}) {
    this.scene = scene;
    this.max = 1600;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(this.max * 3);
    this.col = new Float32Array(this.max * 3);
    this.size = new Float32Array(this.max);
    this.alpha = new Float32Array(this.max);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    this.geo = geo;
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { gain: { value: additive ? 1.6 : 1.0 }, map: { value: radialTex('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 64, 'vfx') } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA;
        void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * 300.0 / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D map; uniform float gain; varying vec3 vC; varying float vA;
        void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vC * gain, t.a * vA * (gain > 1.5 ? 1.0 : 0.55)); }`,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 20;
    scene.add(this.points);
    this.parts = [];
    this.meshes = [];
  }
  emit(o, n, { color = '#ffffff', color2 = null, speed = 3, life = 0.8, size = 0.25, gravity = 0, spread = [1, 1, 1], up = 0, drag = 1.5, ring = false, swirl = 0, to = null } = {}) {
    const c1 = new THREE.Color(color), c2 = new THREE.Color(color2 || color);
    for (let i = 0; i < n; i++) {
      if (this.parts.length >= this.max) this.parts.shift();
      let vx, vy, vz;
      if (ring) { const a = Math.random() * Math.PI * 2; vx = Math.cos(a) * speed; vy = (Math.random() - 0.3) * speed * 0.3; vz = Math.sin(a) * speed * 0.5; }
      else { vx = (Math.random() - 0.5) * 2 * speed * spread[0]; vy = (Math.random() - 0.5) * 2 * speed * spread[1] + up; vz = (Math.random() - 0.5) * 2 * speed * spread[2]; }
      const c = c1.clone().lerp(c2, Math.random());
      this.parts.push({ x: o.x + (Math.random() - 0.5) * 0.2, y: o.y + (Math.random() - 0.5) * 0.2, z: o.z, vx, vy, vz, life: life * (0.6 + Math.random() * 0.6), t: 0, size: size * (0.6 + Math.random() * 0.8), c, gravity, drag, swirl, to, ox: o.x, oy: o.y });
    }
  }
  // 斩击弧光
  slash(o, color = '#ffffff', flip = 1) {
    const geo = new THREE.RingGeometry(0.7, 0.95, 24, 1, -0.9, 1.9);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(o.x, o.y, o.z + 0.3);
    m.rotation.z = flip > 0 ? 0.6 : 2.5;
    m.scale.set(flip, 1, 1);
    this.scene.add(m);
    this.meshes.push({ m, t: 0, life: 0.3, grow: 1.6 });
  }
  ring(o, color = '#ffe08a', life = 0.6, size = 2) {
    const geo = new THREE.RingGeometry(0.8, 1, 32);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(o.x, o.y, o.z); m.rotation.x = -Math.PI / 2;
    m.scale.setScalar(0.2);
    this.scene.add(m);
    this.meshes.push({ m, t: 0, life, grow: size, ring: true });
  }
  light(o, color = '#ffb060', intensity = 30, life = 0.4) {
    const l = new THREE.PointLight(color, intensity, 9, 1.5);
    l.position.set(o.x, o.y + 0.5, o.z + 1);
    this.scene.add(l);
    this.meshes.push({ m: l, t: 0, life, light: true, base: intensity });
  }
  update(dt) {
    const P = this.parts;
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.t += dt;
      if (p.t >= p.life) { P.splice(i, 1); continue; }
      if (p.to) { // 吸入
        const k = Math.min(1, dt * 4);
        p.x += (p.to.x - p.x) * k; p.y += (p.to.y - p.y) * k; p.z += (p.to.z - p.z) * k;
      } else {
        p.vy -= p.gravity * dt;
        const d = Math.exp(-p.drag * dt);
        p.vx *= d; p.vy *= d; p.vz *= d;
        if (p.swirl) { const a = p.swirl * dt; const dx = p.x - p.ox, dy = p.y - p.oy; p.x = p.ox + dx * Math.cos(a) - dy * Math.sin(a); p.y = p.oy + dx * Math.sin(a) + dy * Math.cos(a); }
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      }
    }
    const n = Math.min(P.length, this.max);
    for (let i = 0; i < this.max; i++) {
      if (i < n) {
        const p = P[i], k = p.t / p.life;
        this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
        this.col[i * 3] = p.c.r; this.col[i * 3 + 1] = p.c.g; this.col[i * 3 + 2] = p.c.b;
        this.size[i] = p.size * (1 - k * 0.5); this.alpha[i] = 1 - k * k;
      } else { this.alpha[i] = 0; this.size[i] = 0; }
    }
    for (const a of ['position', 'color', 'size', 'alpha']) this.geo.attributes[a].needsUpdate = true;
    this.geo.setDrawRange(0, n);
    for (let i = this.meshes.length - 1; i >= 0; i--) {
      const o = this.meshes[i];
      o.t += dt;
      const k = o.t / o.life;
      if (k >= 1) { this.scene.remove(o.m); o.m.geometry?.dispose(); this.meshes.splice(i, 1); continue; }
      if (o.light) o.m.intensity = o.base * (1 - k);
      else { o.m.material.opacity = 1 - k; const s = (o.ring ? 0.2 : 1) + k * o.grow; o.m.scale.set(o.m.scale.x < 0 ? -s : s, s, s); }
    }
  }
  // 预设
  preset(kind, o) {
    switch (kind) {
      case 'hit': this.emit(o, 18, { color: '#fff4d0', color2: '#ffb060', speed: 3, life: 0.35, size: 0.18 }); break;
      case 'slash': this.slash(o, '#eaf4ff'); this.emit(o, 14, { color: '#ffffff', color2: '#a8d0ff', speed: 4, life: 0.3, size: 0.15 }); break;
      case 'bow': this.emit(o, 10, { color: '#ffe8b0', speed: 2, life: 0.3, size: 0.14 }); break;
      case 'metal': this.slash(o, '#fff0b0'); this.slash({ ...o, y: o.y + 0.2 }, '#ffffff', -1); this.emit(o, 40, { color: '#fff6c8', color2: '#d8a840', speed: 6, life: 0.5, size: 0.16, drag: 3 }); this.light(o, '#fff0c0', 40); break;
      case 'fire': this.emit(o, 70, { color: '#ffd060', color2: '#ff4a1a', speed: 1.5, up: 2.5, life: 0.9, size: 0.35, spread: [0.8, 0.4, 0.5] }); this.light(o, '#ff7a30', 50, 0.6); break;
      case 'water': this.emit(o, 60, { color: '#d8f4ff', color2: '#3a90d0', speed: 4, up: 2, gravity: 9, life: 0.9, size: 0.22 }); this.ring({ ...o, y: 0.05 }, '#8ad0ff', 0.6, 2.5); break;
      case 'wood': this.emit(o, 46, { color: '#c8f08a', color2: '#4a9a3a', speed: 3.5, life: 0.8, size: 0.2, swirl: 6 }); break;
      case 'ink': this.emit(o, 50, { color: '#2a2440', color2: '#6a5a8a', speed: 2.5, life: 1.0, size: 0.3 }); break;
      case 'heal': this.emit({ ...o, y: o.y - 0.6 }, 40, { color: '#d8ffb0', color2: '#ffe08a', speed: 0.6, up: 1.8, life: 1.2, size: 0.2, drag: 0.5 }); this.ring({ ...o, y: 0.05 }, '#b8ff9a', 0.9, 2); break;
      case 'buff': this.ring({ ...o, y: 0.05 }, '#ffe08a', 0.8, 2.2); this.emit({ ...o, y: o.y - 0.5 }, 26, { color: '#ffe8a0', speed: 0.5, up: 2, life: 1.0, size: 0.18 }); break;
      case 'debuff': this.emit(o, 30, { color: '#a07ad0', color2: '#3a2a5a', speed: 1, gravity: 2, life: 0.9, size: 0.22 }); break;
      case 'break': this.emit(o, 90, { color: '#ffffff', color2: '#ffd070', speed: 8, life: 0.8, size: 0.22, drag: 2.5, gravity: 4 }); this.ring(o, '#fff0c0', 0.5, 4); this.light(o, '#ffffff', 80, 0.5); break;
      case 'seal': this.emit(o, 80, { color: '#9affd8', color2: '#3ad0a0', speed: 3, life: 1.2, size: 0.25, swirl: 8, drag: 0.5 }); this.light(o, '#7affd0', 40, 1.2); break;
      case 'death': this.emit(o, 50, { color: '#ffffff', color2: '#b0a0d0', speed: 1.5, up: 1, life: 1.0, size: 0.25, drag: 1 }); break;
      case 'boost': this.emit({ ...o, y: o.y - 0.6 }, 16, { color: '#ffe8a0', color2: '#ff9a40', speed: 0.6, up: 1.6, life: 0.7, size: 0.16, spread: [0.6, 0.2, 0.3] }); break;
      case 'roar': this.ring(o, '#c060ff', 0.8, 6); this.emit(o, 60, { color: '#a050ff', color2: '#300a40', speed: 6, life: 0.8, size: 0.3 }); break;
      case 'charge': this.emit({ ...o, x: o.x + 3 }, 30, { color: '#ff6a3a', color2: '#ffd0a0', size: 0.25, life: 0.8, to: o }); break;
    }
  }
}

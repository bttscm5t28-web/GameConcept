// 像素角色（Billboard 精灵，参与光照与投影）
import * as THREE from 'three';
import { buildHumanSheet, ROWS, BATTLE_FRAMES } from '../art/characters.js';
import { blobShadowTex } from '../art/textures.js';

const sheetCache = new Map();
export function getSheet(look) {
  const k = typeof look === 'string' ? look : JSON.stringify(look);
  if (!sheetCache.has(k)) sheetCache.set(k, buildHumanSheet(look));
  return sheetCache.get(k);
}

export const PX = 1 / 20; // 每像素世界尺寸

export class Actor {
  constructor(look, { id = null, scale = 1 } = {}) {
    this.id = id;
    this.sheet = getSheet(look);
    const { cw, ch, cols, rows } = this.sheet;
    this.tex = this.sheet.texture.clone();
    this.tex.repeat.set(1 / cols, 1 / rows);
    this.tex.needsUpdate = true;
    const w = cw * PX * scale, h = ch * PX * scale;
    const geo = new THREE.PlaneGeometry(w, h);
    geo.translate(0, h / 2 - PX * scale, 0);
    // 法线微微朝上，让精灵更均匀地吃到光
    const n = geo.attributes.normal;
    for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 0.55, 0.835);
    this.mat = new THREE.MeshLambertMaterial({ map: this.tex, alphaTest: 0.5, side: THREE.DoubleSide, emissive: new THREE.Color(0, 0, 0), emissiveMap: this.tex });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.castShadow = true;
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.tex, alphaTest: 0.5 });
    this.group = new THREE.Group();
    this.group.add(this.mesh);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.9 * scale, 0.45 * scale), new THREE.MeshBasicMaterial({ map: blobShadowTex(), transparent: true, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02;
    this.group.add(blob);
    this.blob = blob;
    this.h = h;
    this.x = 0; this.z = 0; this.y = 0;
    this.dir = 'down';
    this.moving = false;
    this.animT = 0;
    this.frame = 0;
    this.speed = 3.2;
    this.path = null;
    this.pose = null;
    this.flashT = 0;
    this.visible = true;
    this.setFrame(ROWS.down, 0);
  }
  setFrame(row, col) {
    const { cols, rows } = this.sheet;
    this.tex.offset.set(col / cols, 1 - (row + 1) / rows);
  }
  setPos(x, z, y = 0) { this.x = x; this.z = z; this.y = y; this.sync(); }
  face(dir) { this.dir = dir; }
  faceToward(x, z) {
    const dx = x - this.x, dz = z - this.z;
    this.dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'right' : 'left') : (dz > 0 ? 'down' : 'up');
  }
  sync() { this.group.position.set(this.x, this.y, this.z); }
  flash(t = 0.25) { this.flashT = t; }
  walkTo(x, z, speed = null) {
    return new Promise((res) => { this.path = { x, z, speed: speed || this.speed, res }; });
  }
  update(dt, world) {
    if (this.path) {
      const dx = this.path.x - this.x, dz = this.path.z - this.z;
      const d = Math.hypot(dx, dz);
      const step = this.path.speed * dt;
      if (d <= step) {
        this.x = this.path.x; this.z = this.path.z;
        const r = this.path.res; this.path = null; this.moving = false; r();
      } else {
        this.x += (dx / d) * step; this.z += (dz / d) * step;
        this.moving = true;
        this.dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'right' : 'left') : (dz > 0 ? 'down' : 'up');
      }
      if (world) this.y = world.heightAt(this.x, this.z);
    }
    this.animT += dt * (this.moving ? (this.running ? 11 : 8) : 1.6);
    if (this.pose) {
      const f = this.pose === 'idle' ? (Math.floor(this.animT) % 2 ? BATTLE_FRAMES.idle1 : BATTLE_FRAMES.idle0) : BATTLE_FRAMES[this.pose];
      this.setFrame(ROWS.battle, f);
    } else if (this.moving) {
      const seq = [1, 0, 2, 0];
      this.setFrame(ROWS[this.dir], seq[Math.floor(this.animT) % 4]);
    } else {
      this.setFrame(ROWS[this.dir], 0);
    }
    if (this.flashT > 0) {
      this.flashT -= dt;
      const k = Math.max(0, this.flashT) * 8;
      this.mat.emissive.setRGB(k, k, k);
    } else if (this.mat.emissive.r !== this.glowBase) {
      const b = this.glowBase || 0; this.mat.emissive.setRGB(b, b, b);
    }
    this.mesh.visible = this.visible;
    this.blob.visible = this.visible;
    this.sync();
  }
}

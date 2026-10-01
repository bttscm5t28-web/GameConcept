// 招式用到的程序化美术：符纸、八卦法阵、木鸢、朱雀、灵蝶、飞剑
import * as THREE from 'three';
import { makeCanvas, pixelize, pixelTex, softTex } from '../art/pixel.js';

const cache = {};
const once = (k, f) => (cache[k] ||= f());

export const talismanTex = () => once('talisman', () => {
  const [c, g] = makeCanvas(12, 24);
  g.fillStyle = '#f0d878'; g.fillRect(1, 0, 10, 24);
  g.fillStyle = '#d8b850'; g.fillRect(10, 0, 1, 24);
  g.fillStyle = '#b8261a';
  g.fillRect(3, 2, 6, 1); g.fillRect(5, 3, 2, 3); g.fillRect(3, 6, 6, 1); g.fillRect(4, 8, 1, 6); g.fillRect(7, 8, 1, 6); g.fillRect(4, 11, 4, 1);
  g.fillRect(3, 16, 6, 1); g.fillRect(5, 17, 2, 4); g.fillRect(3, 21, 6, 1);
  return pixelTex(c, { mip: false });
});

export const runeCircleTex = (color = '#ffd070') => once('rune' + color, () => {
  const S = 256;
  const [c, g] = makeCanvas(S, S);
  g.translate(S / 2, S / 2);
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 3;
  g.beginPath(); g.arc(0, 0, 120, 0, 7); g.stroke();
  g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 108, 0, 7); g.stroke();
  g.beginPath(); g.arc(0, 0, 58, 0, 7); g.stroke();
  // 八卦
  const gua = ['111', '000', '010', '101', '001', '100', '110', '011'];
  for (let i = 0; i < 8; i++) {
    g.save(); g.rotate((i / 8) * Math.PI * 2);
    gua[i].split('').forEach((b, k) => {
      const y = -98 + k * 10;
      if (b === '1') g.fillRect(-16, y, 32, 5); else { g.fillRect(-16, y, 13, 5); g.fillRect(3, y, 13, 5); }
    });
    g.restore();
  }
  // 太极
  g.beginPath(); g.arc(0, 0, 40, 0, 7); g.stroke();
  g.beginPath(); g.arc(0, -20, 20, -Math.PI / 2, Math.PI / 2); g.arc(0, 20, 20, -Math.PI / 2, Math.PI / 2, true); g.arc(0, 0, 40, Math.PI / 2, -Math.PI / 2); g.fill();
  g.beginPath(); g.arc(0, -20, 5, 0, 7); g.fill();
  g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(0, 20, 5, 0, 7); g.fill();
  g.globalCompositeOperation = 'source-over';
  // 外圈符文点
  for (let i = 0; i < 36; i++) { g.save(); g.rotate((i / 36) * Math.PI * 2); g.fillRect(-2, -116, 4, 6); g.restore(); }
  const t = softTex(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
});

// 木鸢（墨子木鸢）像素画
export const kiteTex = () => once('kite', () => {
  const [c, g] = makeCanvas(48, 28);
  g.fillStyle = '#9c6a3e';
  g.beginPath(); g.moveTo(2, 12); g.lineTo(22, 8); g.lineTo(26, 13); g.lineTo(22, 18); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(46, 12); g.lineTo(26, 8); g.lineTo(22, 13); g.lineTo(26, 18); g.closePath(); g.fill();
  g.fillStyle = '#c9a24a'; g.fillRect(20, 9, 8, 10);
  g.fillStyle = '#7a4c2b'; g.fillRect(22, 18, 4, 8); g.fillRect(19, 24, 10, 3);
  g.fillStyle = '#e8d8b0'; for (let x = 5; x < 20; x += 4) g.fillRect(x, 11, 2, 2); for (let x = 29; x < 44; x += 4) g.fillRect(x, 11, 2, 2);
  g.fillStyle = '#3a2a1a'; g.fillRect(23, 6, 2, 4); g.fillStyle = '#ff6a3a'; g.fillRect(23, 11, 2, 2);
  pixelize(c, { outlineColor: '#2a1a0e' });
  return pixelTex(c, { mip: false });
});

// 朱雀
export const zhuqueTex = () => once('zhuque', () => {
  const [c, g] = makeCanvas(120, 72);
  const wing = (dir) => {
    for (let i = 0; i < 7; i++) {
      g.fillStyle = ['#ffe28a', '#ffb040', '#ff7a2a', '#e8401a', '#c0281a', '#ff9a3a', '#ffd060'][i];
      g.beginPath(); g.moveTo(60, 34);
      g.quadraticCurveTo(60 + dir * (20 + i * 6), 6 + i * 3, 60 + dir * (44 + i * 6), 2 + i * 6);
      g.quadraticCurveTo(60 + dir * (34 + i * 4), 26 + i * 3, 60, 40);
      g.fill();
    }
  };
  wing(-1); wing(1);
  // 尾羽
  for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#ff7a2a' : '#ffd060'; g.beginPath(); g.moveTo(56, 40); g.quadraticCurveTo(50 - i * 4, 58, 40 - i * 8, 70); g.quadraticCurveTo(58, 56, 64, 40); g.fill(); }
  g.fillStyle = '#e8401a'; g.beginPath(); g.ellipse(60, 36, 8, 12, 0, 0, 7); g.fill();
  g.fillStyle = '#ffd060'; g.beginPath(); g.ellipse(60, 22, 6, 6, 0, 0, 7); g.fill();
  g.fillStyle = '#ffe28a'; g.beginPath(); g.moveTo(60, 12); g.lineTo(56, 4); g.lineTo(62, 10); g.lineTo(66, 2); g.lineTo(64, 14); g.fill();
  g.fillStyle = '#fff6c8'; g.fillRect(56, 21, 3, 2); g.fillRect(62, 21, 3, 2);
  pixelize(c, { outline: false, threshold: 60 });
  return pixelTex(c, { mip: false });
});

export const butterflyTex = () => once('bfly', () => {
  const [c, g] = makeCanvas(16, 12);
  g.fillStyle = '#7affc8'; g.beginPath(); g.ellipse(4, 4, 4, 4, 0, 0, 7); g.ellipse(12, 4, 4, 4, 0, 0, 7); g.fill();
  g.fillStyle = '#3ad0a0'; g.beginPath(); g.ellipse(5, 9, 3, 3, 0, 0, 7); g.ellipse(11, 9, 3, 3, 0, 0, 7); g.fill();
  g.fillStyle = '#eafff6'; g.fillRect(7, 2, 2, 9);
  pixelize(c, { outline: false });
  return pixelTex(c, { mip: false });
});

export const shardTex = () => once('shard', () => {
  const [c, g] = makeCanvas(20, 24);
  g.fillStyle = '#7d6b3c'; g.beginPath(); g.moveTo(4, 2); g.lineTo(17, 5); g.lineTo(15, 20); g.lineTo(6, 22); g.lineTo(2, 12); g.closePath(); g.fill();
  g.fillStyle = '#4f7a66'; g.fillRect(6, 7, 8, 1); g.fillRect(13, 7, 1, 7); g.fillRect(8, 13, 6, 1); g.fillRect(8, 10, 1, 4);
  g.fillStyle = '#b39a58'; g.fillRect(5, 3, 8, 1);
  g.fillStyle = '#9affd8'; g.fillRect(9, 9, 2, 2);
  pixelize(c, { outlineColor: '#1a1408' });
  return pixelTex(c, { mip: false });
});

export const flameGradTex = () => once('flamegrad', () => {
  const [c, g] = makeCanvas(32, 128);
  const grd = g.createLinearGradient(0, 128, 0, 0);
  grd.addColorStop(0, 'rgba(255,240,180,1)'); grd.addColorStop(0.3, 'rgba(255,150,50,0.95)'); grd.addColorStop(0.7, 'rgba(220,50,20,0.6)'); grd.addColorStop(1, 'rgba(120,20,10,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 32, 128);
  const side = g.createLinearGradient(0, 0, 32, 0);
  side.addColorStop(0, 'rgba(0,0,0,1)'); side.addColorStop(0.5, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = side; g.fillRect(0, 0, 32, 128);
  const t = softTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
});

export function swordMesh(color = '#e8f0ff', glow = '#ffe08a') {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.3, 0.02), new THREE.MeshBasicMaterial({ color }));
  blade.position.y = -0.65;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.2, 4), new THREE.MeshBasicMaterial({ color }));
  tip.rotation.z = Math.PI; tip.position.y = -1.4;
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.07), new THREE.MeshBasicMaterial({ color: '#c9a24a' }));
  const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.32, 0.06), new THREE.MeshBasicMaterial({ color: '#5a2a1a' }));
  hilt.position.y = 0.18;
  const aura = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 1.8), new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
  aura.position.y = -0.7;
  g.add(blade, tip, guard, hilt, aura);
  return g;
}

export function spritePlane(tex, w, h, { additive = false, opacity = 1 } = {}) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: additive ? 0 : 0.4, opacity, side: THREE.DoubleSide, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
}

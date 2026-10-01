// 战斗舞台：与大地图同风格的 HD-2D 布景
import * as THREE from 'three';
import * as T from '../art/textures.js';
import * as P from '../art/props.js';
import { hash2 } from '../art/pixel.js';
import { particles, applySway, shared } from '../world/effects.js';

const THEMES = {
  town: { fog: '#e9dcc0', hemi: ['#d8e6ee', '#6a5a3a', 1.2], sun: ['#ffe2b0', 2.2], tile: 'stone', mountain: '#6e8a84' },
  forest: { fog: '#c9d8a8', hemi: ['#d0ecb0', '#3a4a2a', 1.1], sun: ['#fff0c0', 2.4], tile: 'grass', mountain: '#4e7a5a' },
  ruins: { fog: '#6a6478', hemi: ['#8a90b8', '#2a2018', 0.9], sun: ['#ffb07a', 1.5], tile: 'stoneMoss', mountain: '#4a4a5e' },
  boss: { fog: '#1e1626', hemi: ['#5a4a7a', '#1a1010', 0.7], sun: ['#c07aff', 0.9], tile: 'dark', mountain: '#2a2236' },
};

export function buildStage(theme) {
  const th = THEMES[theme] || THEMES.forest;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(th.fog);
  scene.fog = new THREE.Fog(th.fog, 14, 40);
  scene.add(new THREE.HemisphereLight(th.hemi[0], th.hemi[1], th.hemi[2]));
  const sun = new THREE.DirectionalLight(th.sun[0], th.sun[1]);
  sun.position.set(-5, 12, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 });
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  // 地面
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const tops = [0, 1, 2].map((v) => {
    const map = th.tile === 'grass' ? T.grassTex(v === 2 ? 2 : v) : th.tile === 'stone' ? T.stoneTex(v % 2) : T.stoneTex(v === 0 ? 2 : v % 2);
    const m = new THREE.MeshLambertMaterial({ map, color: th.tile === 'dark' ? '#6a6070' : '#ffffff' });
    return m;
  });
  const side = new THREE.MeshLambertMaterial({ map: T.grassSideTex() });
  const m4 = new THREE.Matrix4();
  for (let v = 0; v < 3; v++) {
    const cells = [];
    for (let x = -16; x < 16; x++) for (let z = -12; z < 8; z++) if (Math.floor(hash2(x, z, 5) * 3) === v) cells.push([x, z]);
    const im = new THREE.InstancedMesh(geo, [side, side, tops[v], side, side, side], cells.length);
    cells.forEach(([x, z], i) => { m4.makeTranslation(x + 0.5, -0.5, z + 0.5); im.setMatrixAt(i, m4); });
    im.receiveShadow = true;
    scene.add(im);
  }
  // 草丛
  if (th.tile === 'grass') {
    const tg = new THREE.PlaneGeometry(0.8, 0.8); tg.translate(0, 0.38, 0);
    const mat = applySway(new THREE.MeshLambertMaterial({ map: T.grassTuftTex(0), alphaTest: 0.5, side: THREE.DoubleSide }), 0.1);
    const im = new THREE.InstancedMesh(tg, mat, 160);
    for (let i = 0; i < 160; i++) { m4.makeTranslation((hash2(i, 1, 3) - 0.5) * 28, 0, -10 + hash2(i, 2, 3) * 16); im.setMatrixAt(i, m4); }
    scene.add(im);
  }
  const add = (o, x, z, s = 1) => { o.position.set(x, 0, z); o.scale.multiplyScalar(s); scene.add(o); return o; };
  const updaters = [];
  // 布景
  if (theme === 'forest') {
    for (let i = 0; i < 26; i++) {
      const x = (hash2(i, 7, 1) - 0.5) * 30, z = -4 - hash2(i, 8, 1) * 8;
      const h = 7 + hash2(i, 9, 1) * 4;
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, h, 6), new THREE.MeshLambertMaterial({ map: T.bambooStalkTex() }));
      st.position.set(x, h / 2, z); st.castShadow = true; scene.add(st);
      for (let k = 0; k < 3; k++) {
        const lf = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), applySway(new THREE.MeshLambertMaterial({ map: T.bambooLeafTex(3 + (k % 2) * 4), alphaTest: 0.5, side: THREE.DoubleSide }), 0.15));
        lf.position.set(x + (hash2(i, k, 4) - 0.5), h * (0.55 + k * 0.17), z); lf.castShadow = true; scene.add(lf);
      }
    }
    scene.add(particles({ count: 60, area: [-12, -6, 12, 4], y: [0.5, 5], color: '#fff2b0', size: 0.06, speed: 0.5 }));
    scene.add(particles({ count: 30, area: [-12, -6, 12, 4], y: [0, 7], color: '#8ab858', size: 0.1, kind: 'fall', additive: false, speed: 0.6 }));
  } else if (theme === 'town') {
    add(P.house({ w: 5, d: 3, roof: '#4b5866', seed: 3 }), -6, -7);
    add(P.house({ w: 4, d: 3, roof: '#5a4a3a', seed: 5, wall: '#efe6d2' }), 2, -8);
    add(P.tree({ kind: 'peach', seed: 2 }), 7, -5);
    add(P.lantern({ light: false }), -2, -4);
    scene.add(particles({ count: 40, area: [-12, -6, 12, 4], y: [0, 6], color: '#f2b6c6', size: 0.09, kind: 'fall', additive: false, speed: 0.5 }));
  } else if (theme === 'ruins' || theme === 'boss') {
    for (let i = 0; i < 8; i++) add(P.pillar({ h: 4, broken: i % 3 === 1 }), -13 + i * 3.7, -6 - (i % 2) * 2);
    const b1 = add(P.brazier(), -7, -2.5), b2 = add(P.brazier(), 7, -2.5);
    [b1, b2].forEach((b) => updaters.push((t) => { b.userData.flicker.scale.setScalar(1 + Math.sin(t * 12 + b.position.x) * 0.08); }));
    if (theme === 'boss') {
      const d = add(P.ding({ s: 2.8, glow: true }), 0, -8.5);
      updaters.push((t) => { d.userData.glow.material.color.setHSL(0.45, 1, 0.5 + Math.sin(t * 2) * 0.15); });
      scene.add(particles({ count: 120, area: [-12, -8, 12, 4], y: [0, 6], color: '#c070ff', size: 0.1, speed: 0.4 }));
      const pl = new THREE.PointLight('#7a3aff', 20, 16, 1.4); pl.position.set(-3, 3, 1); scene.add(pl);
    } else {
      add(P.gear({ r: 1.4 }), 3, -8).rotation.set(0, 0.3, 0);
      scene.add(particles({ count: 50, area: [-12, -6, 12, 4], y: [0, 5], color: '#ffb070', size: 0.06, speed: 0.6 }));
    }
  }
  // 远景
  const mt = new THREE.Mesh(new THREE.PlaneGeometry(80, 22), new THREE.MeshBasicMaterial({ map: T.inkMountainsTex(4, { tint: th.mountain, sky: th.fog, seed: 5 }), transparent: true, fog: false, depthWrite: false }));
  mt.position.set(0, 4, -22); scene.add(mt);
  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.3, 200);
  camera.position.set(0.4, 3.6, 10.5);
  camera.lookAt(0.2, 1.1, 0);
  return { scene, camera, updaters, sun };
}

export { shared };

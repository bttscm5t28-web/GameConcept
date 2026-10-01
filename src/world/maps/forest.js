// 竹海古道：洛水渡以北、通往墨家旧坊的竹林古道（第一章 · 第二张地图）
import * as THREE from 'three';
import * as P from '../../art/props.js';
import * as T from '../../art/textures.js';
import { registerLook } from '../../art/characters.js';
import { ENCOUNTERS } from '../../data/db.js';
import { makeGrid, fillRect, line, scatter, toRows, chestObj } from './helpers.js';
import { mistLayer, godRays, particles, applySway } from '../effects.js';
import { hash2 } from '../../art/pixel.js';
import * as A from './forestArt.js';

// 樵夫老孙
registerLook('laosun', { hair: '#3a3530', hairStyle: 'knot', band: '#7a5a3a', skin: '#c98e60', robe: '#6a5a3a', trim: '#a89060', sash: '#3a2e22', pants: '#4a4030', shoes: '#2b2019', beard: '#4a4038', extras: ['pack'], weapon: 'none' });

const W = 38, H = 56;

function grid() {
  const g = makeGrid(W, H, 'B');
  // 南入口空地
  fillRect(g, 14, 49, 24, 55, '.');
  fillRect(g, 13, 51, 14, 54, '.'); fillRect(g, 24, 50, 25, 53, '.');
  // 伏击空地
  fillRect(g, 12, 41, 21, 46, '.');
  fillRect(g, 13, 40, 18, 40, '.');
  // 西南角落（宝箱）
  line(g, [[12, 44], [9, 44]], '.', 2);
  fillRect(g, 5, 42, 9, 46, '.');
  // 东南角落（宝箱）
  line(g, [[24, 51], [28, 50]], '.', 2);
  fillRect(g, 27, 47, 31, 51, '.');
  // 山溪
  fillRect(g, 0, 32, 37, 34, '~');
  fillRect(g, 12, 35, 23, 35, 's'); fillRect(g, 13, 31, 26, 31, 's');
  fillRect(g, 0, 31, 3, 31, '~'); fillRect(g, 35, 35, 37, 35, '~'); fillRect(g, 0, 35, 4, 35, '~');
  // 老孙的猎户窝棚
  fillRect(g, 25, 35, 34, 41, '.');
  fillRect(g, 25, 35, 34, 35, 's');
  line(g, [[19, 39], [24, 39], [26, 38]], ',', 2);
  // 巫月空地
  fillRect(g, 10, 21, 27, 29, '.');
  fillRect(g, 12, 30, 25, 30, '.');
  fillRect(g, 9, 23, 9, 27, '.'); fillRect(g, 28, 22, 28, 27, '.');
  // 土地庙
  fillRect(g, 1, 17, 8, 26, '.');
  line(g, [[10, 24], [7, 22]], ',', 2);
  fillRect(g, 3, 19, 6, 21, '=');
  // 猎道（近路）
  line(g, [[4, 16], [4, 11], [8, 9], [14, 9]], '.', 2);
  // 中段空地
  fillRect(g, 21, 11, 31, 17, '.');
  fillRect(g, 32, 13, 34, 15, '.');
  // 山道口南侧的疏林（减少前景竹林对山道的遮挡）
  fillRect(g, 7, 11, 19, 14, '.');
  fillRect(g, 9, 15, 17, 15, '.');
  // 山道
  fillRect(g, 14, 6, 25, 10, 'r');
  fillRect(g, 0, 0, 37, 1, '^');
  fillRect(g, 0, 2, 15, 5, '#'); fillRect(g, 23, 2, 37, 5, '#');
  fillRect(g, 16, 0, 22, 5, 'r');
  // 主路
  line(g, [[19, 55], [19, 50], [18, 47], [16, 44], [15, 41], [17, 38], [19, 36], [19, 35]], ',', 3);
  line(g, [[19, 31], [19, 29], [18, 24], [19, 20], [23, 17], [26, 14], [24, 11], [20, 9], [19, 6]], ',', 3);
  fillRect(g, 18, 0, 20, 5, ',');
  // 木桥
  fillRect(g, 18, 32, 20, 34, 'b');
  scatter(g, 'f', ['.'], 0.08, 11);
  // 山道两侧的松
  g[6][14] = 'T'; g[6][25] = 'T'; g[7][25] = 'T';
  return toRows(g);
}

const tween = (ms, f) => new Promise((res) => {
  const t0 = performance.now();
  const step = () => { const k = Math.min(1, (performance.now() - t0) / ms); f(k); if (k < 1) requestAnimationFrame(step); else res(); };
  requestAnimationFrame(step);
});
const ease = (k) => 1 - Math.pow(1 - k, 3);
const hasWy = (ctx) => ctx.state.party.includes('wuyue');
const birdHere = (f) => !f.fo_birdTaken && f.birdQuest !== 'found' && f.birdQuest !== 'done';

export default function forest(game) {
  game.registerSpeaker('laosun', '老孙', 'laosun');
  const refs = { shake: 0 };
  const F = () => game.state.flags;

  // 妖怪从某处滑到某处
  const slide = (o, x, z, ms = 500) => { const x0 = o.position.x, z0 = o.position.z; return tween(ms, (k) => { const e = ease(k); o.position.x = x0 + (x - x0) * e; o.position.z = z0 + (z - z0) * e; }); };
  const lunge = async (o, dx = 0, dz = 0.6) => { const x0 = o.position.x, z0 = o.position.z; await tween(160, (k) => { o.position.x = x0 + dx * k; o.position.z = z0 + dz * k; }); await tween(260, (k) => { o.position.x = x0 + dx * (1 - k); o.position.z = z0 + dz * (1 - k); }); };
  const vanish = (o, ms = 600) => tween(ms, (k) => { o.userData.mat.opacity = 1 - k; o.userData.mat.transparent = true; o.userData.baseY = k * 0.6; if (k >= 1) o.visible = false; });

  // 青铜残片吸收妖气的演出
  async function absorb(ctx, fromX, fromZ) {
    const w = game.world;
    const cloud = A.wispCloud(30);
    cloud.position.set(fromX, 0, fromZ);
    w.scene.add(cloud);
    const light = new THREE.PointLight('#7affd0', 0, 6, 1.5);
    w.scene.add(light);
    const p = w.player;
    ctx.sfx('seal');
    await tween(1800, (k) => {
      const e = ease(k);
      for (const s of cloud.userData.parts) {
        const o = s.userData.o;
        const swirl = (1 - e) * 0.8;
        const a = s.userData.ph + k * 9;
        s.position.set(o.x * (1 - e) + (p.x - fromX) * e + Math.cos(a) * swirl * 0.4, o.y * (1 - e) + 0.9 * e + Math.sin(a * 1.3) * 0.15, o.z * (1 - e) + (p.z - fromZ) * e + Math.sin(a) * swirl * 0.3);
        s.scale.setScalar((0.25 + Math.sin(a) * 0.08) * (1 - e * 0.7));
      }
      cloud.userData.mat.opacity = 1 - Math.max(0, (k - 0.75) * 4);
      light.position.set(p.x, 1.0, p.z + 0.3);
      light.intensity = Math.sin(k * Math.PI) * 9;
    });
    w.scene.remove(cloud);
    ctx.flash('#bfffe8', 700, 0.8);
    ctx.sfx('chime');
    light.intensity = 6;
    await tween(1200, (k) => { light.intensity = 6 * (1 - k); });
    w.scene.remove(light);
  }

  return {
    id: 'forest', name: '竹海古道', sub: '幽篁深处 · 午后', music: 'forest', battleBg: 'forest',
    grid: grid(),
    treeKind: 'pine',
    padFill: ',',
    env: {
      fog: '#a9bc8a', skyTop: '#d2e2b4', fogNear: 24, fogFar: 64,
      hemi: ['#dcefb8', '#2c3c20', 1.05], sun: ['#ffd88c', 2.5], sunDir: [-10, 15, 7], ambient: ['#e6ffd0', 0.16],
      mountain: '#4a6e52', sunDisc: '#fff2c8', seed: 5,
      water: { deep: '#1c4a42', shallow: '#4f8f78', foam: '#e2f4e2' },
    },
    look: { bloom: 0.62, tilt: 3.6, band: 0.15, focusY: 0.5, vignette: 0.5, saturation: 1.08, warm: [1.06, 1.01, 0.86] },
    camMargin: { x0: 11, x1: 11, z0: 6.5, z1: 3.5 },
    spawns: {
      default: { x: 19.5, z: 54.6, dir: 'up' },
      fromTown: { x: 19.5, z: 54.6, dir: 'up' },
      fromRuins: { x: 19.5, z: 3.6, dir: 'down' },
    },
    exits: [
      { x0: 16, z0: 55.4, x1: 23, z1: 57, to: 'town', spawn: 'fromForest' },
      { x0: 16, z0: -1, x1: 23, z1: 1.5, to: 'ruins', spawn: 'fromForest', cond: (g) => g.state.flags.fo_bossDone },
    ],
    encounters: {
      table: ENCOUNTERS.forest, bg: 'forest',
      cond: (g) => g.state.flags.fo_ambushDone && g.world.player.z > 10.8 && !(g.world.player.x < 9.5 && g.world.player.z < 25.5 && g.world.player.z > 16.5),
    },

    build(w) {
      const f = F();
      const add = (o, x, z, opt) => w.add(o, x, z, opt);

      // ---------- 石灯笼：沿古道排列，有的早已熄灭 ----------
      const lanterns = [
        [16.6, 53.0, 1], [22.4, 52.8, 1], [21.7, 49.4, 0, 1], [13.1, 45.6, 1], [20.0, 41.7, 0, 0, 1],
        [17.0, 35.6, 1], [22.0, 35.6, 0, 1], [17.0, 30.7, 1], [22.0, 30.7, 1], [16.1, 26.2, 0, 1],
        [21.4, 21.4, 1], [17.6, 19.4, 0, 1, 1], [21.8, 15.8, 1], [27.6, 12.5, 0, 1, 1], [17.2, 9.6, 1],
      ];
      lanterns.forEach(([x, z, lit, mossy, broken], i) => add(A.stoneLantern({ lit: !!lit, mossy: !!mossy, broken: !!broken, seed: i + 3, intensity: 2.2 }), x, z, { solid: [0.5, 0.4] }));

      // ---------- 南入口：路标、山石 ----------
      add(A.signpost('竹海古道'), 15.6, 52.2, { solid: [0.3, 0.3] });
      add(A.fallenBamboo(3.2, 2), 14.6, 50.2, { rot: 0.3, solid: [2.4, 0.5] });

      // ---------- 伏击处：会动的竹丛 ----------
      if (!f.fo_ambushDone) {
        const clump = new THREE.Group();
        const sTex = T.bambooStalkTex().clone(); sTex.wrapT = THREE.RepeatWrapping; sTex.repeat.set(1, 5); sTex.needsUpdate = true;
        const sm = new THREE.MeshLambertMaterial({ map: sTex, color: '#b8c890' });
        const lm = applySway(new THREE.MeshLambertMaterial({ map: T.bambooLeafTex(3), alphaTest: 0.5, side: THREE.DoubleSide, color: '#a8c070' }), 0.1);
        for (let i = 0; i < 6; i++) {
          const h = 5 + i * 0.5;
          const s = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, h, 6), sm);
          s.position.set((i % 3 - 1) * 0.35, h / 2, Math.floor(i / 3) * 0.4 - 0.2); s.castShadow = true;
          clump.add(s);
          const l = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), lm); l.position.set(s.position.x, h * 0.85, s.position.z); l.rotation.z = i; clump.add(l);
        }
        add(clump, 22.6, 44.5);
        refs.clump = clump;
        w.onUpdate((t) => { const k = refs.shake; clump.rotation.z = Math.sin(t * 23) * 0.035 * k + Math.sin(t * 1.3) * 0.01; clump.rotation.x = Math.cos(t * 19) * 0.02 * k; });
        const mon = A.fieldMonster('bamboo', { scale: 1.0 });
        add(mon, 22.8, 44.6); mon.visible = false; refs.ambMon = mon;
      }
      add(A.stump({ axe: true }), 12.9, 41.5, { solid: [0.7, 0.5] });
      add(A.mushrooms(4), 12.4, 46.2);
      add(A.mushrooms(9, { glow: true }), 21.4, 46.0);
      add(A.fallenBamboo(2.6, 5), 20.6, 43.4, { rot: -0.4, solid: [1.6, 0.6] });
      add(A.mushrooms(12), 5.6, 45.6);
      add(A.fallenBamboo(2.4, 8), 7.4, 42.4, { rot: 0.1, solid: [2.0, 0.4] });
      add(A.mushrooms(15, { glow: true }), 30.8, 47.4);
      add(P.rock({ s: 1.2, seed: 21, mossy: true }), 28.0, 47.4, { solid: [0.9, 0.6] });

      // ---------- 山溪与木桥 ----------
      add(A.woodBridge(4.6, 3), 19.5, 33.5);
      [[13.2, 35.4, 1.0], [23.0, 35.5, 0.8], [12.6, 31.4, 1.1], [25.6, 31.3, 0.9], [9.0, 33.2, 1.4], [28.5, 33.8, 1.2], [4.5, 32.6, 1.0], [33.0, 33.0, 1.3], [15.0, 33.6, 0.7]].forEach(([x, z, s], i) => add(P.rock({ s, seed: i + 30, mossy: i % 2 === 0 }), x, z, { solid: [s * 0.8, s * 0.5] }));
      const m1 = mistLayer({ w: 80, d: 5, y: 0.25, opacity: 0.26, speed: 0.01, seed: 4, color: '#e8f4e0' }); add(m1, 19, 33.6, { y: 0.25 }); m1.rotation.x = -Math.PI / 2.6;
      const m2 = mistLayer({ w: 80, d: 4, y: 0.75, opacity: 0.14, speed: -0.006, seed: 6, color: '#f0f8e8' }); add(m2, 19, 34.4, { y: 0.75 }); m2.rotation.x = -Math.PI / 2.6;
      w.scene.add(particles({ count: 40, area: [3, 29, 35, 38], y: [0.3, 2.0], color: '#c8ff9a', size: 0.07, speed: 0.5 }));

      // ---------- 老孙的窝棚 ----------
      add(A.hut(), 31.2, 37.4, { solid: [3.0, 1.6], fade: true });
      add(P.rock({ s: 0.9, seed: 41, mossy: true }), 26.0, 36.0, { solid: [0.7, 0.5] });
      add(A.mushrooms(19), 34.2, 39.0);
      add(A.fallenBamboo(2.8, 11), 27.8, 40.6, { rot: 0.15, solid: [2.4, 0.4] });
      if (!f.fo_sunSaved) {
        const ng = A.fieldMonster('nigui', { scale: 1.0, float: true });
        add(ng, 29.4, 34.9); ng.userData.baseY = -0.9; refs.nigui = ng;
      }

      // ---------- 巫月空地 ----------
      add(P.rock({ s: 1.8, seed: 51, mossy: true }), 18.6, 22.4, { solid: [1.3, 0.8] });
      add(A.fallenBamboo(3.4, 13), 12.4, 27.6, { rot: 0.5, solid: [2.4, 0.9] });
      add(A.fallenBamboo(2.6, 14), 25.6, 24.6, { rot: -0.2, solid: [2.2, 0.5] });
      add(A.mushrooms(23), 10.6, 22.0);
      add(A.mushrooms(24, { glow: true }), 26.6, 28.2);
      add(P.rock({ s: 0.9, seed: 52 }), 24.4, 21.6, { solid: [0.7, 0.5] });
      if (!f.fo_wuyueJoined) {
        refs.wyMons = [
          [A.fieldMonster('shanxiao', { scale: 1.0 }), 16.6, 24.4],
          [A.fieldMonster('shanxiao', { scale: 1.0 }), 20.7, 24.3],
          [A.fieldMonster('foxfire', { scale: 0.9, float: true }), 18.7, 23.4],
        ].map(([m, x, z]) => add(m, x, z));
      }

      // ---------- 土地庙 ----------
      add(A.shrine(), 4.5, 17.9, { solid: [2.6, 1.9], fade: true });
      add(A.altar(), 4.5, 19.6, { solid: [1.3, 0.5] });
      add(P.lantern({ light: true, intensity: 2.5 }), 2.1, 19.3, { solid: [0.3, 0.3] });
      add(A.fallenBamboo(2.6, 17), 6.6, 23.6, { rot: 0.2, solid: [2.0, 0.4] });
      add(A.mushrooms(27), 1.5, 21.8);
      add(P.rock({ s: 1.0, seed: 61, mossy: true }), 1.6, 23.6, { solid: [0.7, 0.5] });
      if (birdHere(f)) {
        const bird = A.mechBird();
        add(bird, 4.25, 19.6, { y: 0.66, rot: 0.4 });
        refs.bird = bird;
        w.onUpdate((t) => {
          if (refs.birdScripted) return;
          const k = Math.max(0, Math.sin(t * 0.9)) > 0.93 ? 1 : 0;
          bird.userData.flap(t, k);
          bird.userData.body.position.y = k ? Math.abs(Math.sin(t * 10)) * 0.08 : 0;
          bird.userData.body.rotation.x = Math.sin(t * 1.7) > 0.8 ? 0.4 : 0;
        });
      }
      // 猎道栅栏
      const gate = A.bambooGate(2.2);
      add(gate, 5.0, 16.2);
      if (f.fo_shortcutOpen) { gate.userData.panel.position.x = -1.9; gate.userData.panel.rotation.y = 0.3; }
      else refs.gateSolid = w.solidRect(3.9, 15.85, 6.1, 16.55);
      refs.gate = gate;
      add(A.mushrooms(31), 8.2, 9.4);
      add(P.rock({ s: 1.1, seed: 71, mossy: true }), 11.6, 10.6, { solid: [0.8, 0.5] });

      // ---------- 中段空地：爪痕、竹简 ----------
      add(A.clawRock(), 29.6, 11.6, { solid: [1.9, 1.2] });
      add(A.bambooSlips(), 33.3, 13.6, { solid: [1.1, 0.8] });
      add(A.fallenBamboo(3.0, 19), 24.0, 13.0, { rot: 0.6, solid: [2.0, 1.2] });
      add(A.mushrooms(33), 31.4, 14.8);
      add(A.mushrooms(34, { glow: true }), 21.6, 11.4);
      add(P.rock({ s: 0.8, seed: 81 }), 27.4, 16.4, { solid: [0.6, 0.4] });

      // ---------- 山道：界碑、机关灯、石阶、山魈王 ----------
      add(A.boundaryStele('墨家禁地'), 15.3, 7.3, { solid: [0.8, 0.5] });
      const lamp = A.mohistLamp();
      add(lamp, 22.8, 8.0, { solid: [0.8, 0.8] });
      lamp.userData.setLit(!!f.fo_lampLit, true);
      refs.lamp = lamp;
      add(A.stoneSteps(4.6, 4, 0.35, 0.4), 19.5, 1.25);
      [[16.3, 6.4, 1.0], [23.0, 9.8, 0.9], [14.6, 9.2, 0.8], [24.6, 6.3, 1.2]].forEach(([x, z, s], i) => add(P.rock({ s, seed: 90 + i, mossy: true }), x, z, { solid: [s * 0.7, s * 0.45] }));
      if (!f.fo_bossDone) {
        const king = A.fieldMonster('shanxiaoKing', { scale: 1.25 });
        add(king, 19.5, 2.4);
        refs.king = king;
        refs.kingSolid = w.solidRect(16, 0, 23, 3.0);
      }
      {
        const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), P.lam('fo_cloth', { color: '#1d1a24', side: THREE.DoubleSide }));
        cloth.rotation.x = -Math.PI / 2; cloth.rotation.z = 0.6; cloth.position.y = 0.04;
        const trim = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.05), P.lam('fo_clothtrim', { color: '#7a2a3a', side: THREE.DoubleSide }));
        trim.position.set(0, -0.14, 0.001); cloth.add(trim);
        add(cloth, 17.2, 3.2, { y: 0.04 });
        cloth.rotation.x = -Math.PI / 2; cloth.rotation.z = 0.6;
        cloth.visible = !!f.fo_bossDone;
        refs.cloth = cloth;
      }

      // 野外妖怪的呼吸/漂浮
      w.onUpdate((t) => { for (const k of ['ambMon', 'nigui', 'king']) refs[k]?.userData.anim(t); refs.wyMons?.forEach((m) => m.userData.anim(t)); });

      // ---------- 光与空气 ----------
      // 地面金色光斑
      const fleck = [];
      for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
        const c = w.grid[z][x];
        if ('.,f=rs'.includes(c) && hash2(x, z, 77) < 0.16) fleck.push([x + hash2(x, z, 78), z + hash2(x, z, 79)]);
      }
      add(A.sunFlecks(fleck, { opacity: 0.3 }), 0, 0);
      // 光束
      for (const [area, n, seed] of [[[14, 46, 25, 55], 5, 3], [[11, 39, 22, 47], 4, 5], [[10, 20, 28, 30], 6, 7], [[1, 15, 9, 24], 3, 9], [[20, 9, 32, 18], 4, 11], [[8, 30, 30, 37], 4, 13], [[14, 4, 25, 11], 3, 15]]) {
        const rays = godRays({ count: n, area, color: '#ffe6a0', opacity: 0.15, seed });
        add(rays, 0, 0);
      }
      // 飘落竹叶、浮尘
      w.scene.add(particles({ count: 170, area: [0, 0, W, H], y: [0.2, 8], color: '#a8c460', size: 0.11, kind: 'fall', additive: false, speed: 0.32 }));
      w.scene.add(particles({ count: 60, area: [0, 0, W, H], y: [0.2, 7], color: '#d8c070', size: 0.09, kind: 'fall', additive: false, speed: 0.26 }));
      w.scene.add(particles({ count: 160, area: [0, 0, W, H], y: [0.3, 5], color: '#fff0b8', size: 0.05, speed: 0.35 }));
      // 林下薄雾
      const m3 = mistLayer({ w: 60, d: 6, y: 1.2, opacity: 0.12, speed: 0.004, seed: 8, color: '#e8f0d0' }); add(m3, 19, 24, { y: 1.2 }); m3.rotation.x = -Math.PI / 2.6;
      const m4 = mistLayer({ w: 60, d: 6, y: 1.6, opacity: 0.16, speed: -0.003, seed: 9, color: '#eef4e0' }); add(m4, 19, 5, { y: 1.6 }); m4.rotation.x = -Math.PI / 2.6;
    },

    npcs: (g) => {
      const f = g.state.flags;
      const list = [];
      if (!f.fo_wuyueJoined && !g.state.party.includes('wuyue')) {
        list.push({ id: 'wuyue', look: 'wuyue', x: 18.7, z: 25.6, dir: 'up', turn: false,
          talk: async (ctx) => { await ctx.say('wuyue', '别过来！……我说的是那几只妖怪，也包括你！'); } });
      }
      if (!f.fo_sunSaved) {
        list.push({ id: 'laosun', look: 'laosun', x: 29.0, z: 38.9, dir: 'up',
          talk: async (ctx) => { await ctx.say('laosun', '救、救命……水里那东西还在！'); } });
      }
      return list;
    },

    objects: (g) => [
      // 路标
      { x: 15.6, z: 52.6, r: 1.2, icon: '标', async onInteract(ctx) {
        await ctx.narr('木牌上的字被风雨蚀得发白：「竹海古道。北通旧坊，南抵洛水。」');
        await ctx.narr('下面还有人用刀刻了一行小字：「日落莫行，逢竹声莫应。」');
        await ctx.say('moheng', '「逢竹声莫应」……竹子还能叫人不成？');
      } },
      // 樵夫的斧头
      { x: 12.9, z: 42.0, r: 1.2, icon: '斧', async onInteract(ctx) {
        await ctx.narr('一截新砍的竹桩上，斜插着一柄柴斧。斧刃已经起了一层薄锈，柄上用刀尖刻着个歪歪扭扭的「孙」字。');
        if (!ctx.flags.fo_sunSaved) {
          await ctx.say('moheng', '是老孙叔的斧子……砍柴的人，不会把吃饭的家伙随手扔下。');
          await ctx.narr('泥地上有一串慌乱的脚印，深一脚浅一脚，朝东边的溪水方向去了。');
          await ctx.say('moheng', '他是被什么东西追着跑的。得快些找到他。');
        } else await ctx.say('moheng', '孙叔说回头自己来取。这斧子沉得很，我就不替他扛了。');
        ctx.flags.fo_sawAxe = true;
      } },
      // 溪水
      { x: 14.8, z: 35.4, r: 1.4, icon: '溪', async onInteract(ctx) {
        await ctx.narr('溪水从北山的石缝里淌出来，清得能数清水底的卵石。几尾小鱼停在竹影里，一动不动。');
        await ctx.narr('掬一捧水，凉意直透指骨——可水面上浮着的那层薄雾，却带着一丝说不出的腥气。');
        if (hasWy(ctx)) await ctx.say('wuyue', '水是好水，雾不是好雾。南疆的瘴气起来之前，也是这个味道。');
        else await ctx.say('moheng', '老周叔说过，有溺鬼的水，雾都是腥的……');
      } },
      // 老孙的窝棚
      { x: 31.2, z: 38.6, r: 1.4, icon: '棚', async onInteract(ctx) {
        await ctx.narr('猎户们搭的窝棚，竹竿捆着茅草，勉强能遮风挡雨。火塘里的灰还是温的，草垫上压出一个人蜷缩的形状。');
        if (ctx.flags.fo_sunSaved) await ctx.narr('棚柱上挂着一串晒干的野山椒，大概是老孙留下的。');
      } },
      // 土地庙供桌（机关鸟 / 上香）
      { x: 4.5, z: 20.2, r: 1.3, icon: '庙', async onInteract(ctx) {
        if (birdHere(ctx.flags) && refs.bird) return birdScene(ctx);
        if (!ctx.flags.fo_shrineLore) {
          ctx.flags.fo_shrineLore = true;
          await ctx.narr('土地庙不过半人来高，泥塑的土地公缺了半边胡子，却仍笑眯眯的。两侧褪色的对联写着：「公公十分公道，婆婆一片婆心」。');
          await ctx.narr('香炉里插着三炷新香，香灰还没冷透。炉沿上，落着几粒细碎的银屑。');
          if (hasWy(ctx)) {
            await ctx.say('moheng', '这香……是最近才有人来上的？');
            await ctx.say('wuyue', '……我插的。');
            await ctx.say('wuyue', '出门在外，到了别人的地界，先拜一拜当地的土地，这是我们巫族的规矩。看什么看？');
            await ctx.say('moheng', '没什么。只是觉得，这规矩很好。');
          } else {
            await ctx.say('moheng', '银屑……刘嫂说的那个南疆姑娘，也来过这里？');
          }
        }
        const c = await ctx.choose(['上一炷香（恢复全员）', '离开']);
        if (c === 0) {
          await ctx.narr('青烟袅袅升起，在竹影里打了个旋，散入午后的日光中。');
          ctx.healAll(); ctx.sfx('heal');
          await ctx.say('moheng', '土地公公，弟子途经贵地，还请保佑一路平安。');
        }
      } },
      // 猎道栅栏
      { x: 5.0, z: 16.2, r: 1.5, icon: '栅', enabled: (gg) => !gg.state.flags.fo_shortcutOpen, async onInteract(ctx) {
        if (!ctx.flags.fo_shortcutKnown) {
          await ctx.narr('一道竹栅栏拦住了往北的小径。绳结缠得又紧又密，看不出从哪里下手。');
          await ctx.say('moheng', '这结法有讲究……硬拆的话，整排栅栏都会塌下来。还是别乱动了。');
          return;
        }
        await ctx.say('moheng', '孙叔说，绳结是活扣，往左拧三圈——');
        for (let i = 0; i < 3; i++) { ctx.sfx('gear'); await ctx.wait(320); }
        ctx.sfx('door');
        const pnl = refs.gate.userData.panel;
        await tween(700, (k) => { pnl.position.x = -1.9 * ease(k); pnl.rotation.y = 0.3 * k; });
        if (refs.gateSolid) game.world.removeSolid(refs.gateSolid);
        ctx.flags.fo_shortcutOpen = true;
        await ctx.say('moheng', '开了！猎户的机关，倒有几分墨家的巧思。');
        if (hasWy(ctx)) await ctx.say('wuyue', '一根绳子而已，你也能夸出花来。');
        ctx.toast('猎道已打开，可直通山道口');
      } },
      // 爪痕
      { x: 29.6, z: 12.6, r: 1.5, icon: '痕', async onInteract(ctx) {
        await ctx.narr('一块半人高的青石上，赫然印着三道爪痕。石屑翻卷，深可没指。');
        await ctx.narr('爪痕边沾着几缕灰褐色的粗毛，腥膻扑鼻。不远处的竹子被齐腰折断，断口还是新的。');
        await ctx.say('moheng', '能在石头上抓出这么深的印子……这东西少说也有八尺高。');
        if (hasWy(ctx)) {
          await ctx.say('wuyue', '是山魈。而且不是普通的山魈——普通山魈只会抓树，抓石头是在划地盘。');
          await ctx.say('wuyue', '它在告诉所有路过的东西：再往北，就是它的山了。');
        }
      } },
      // 竹简残片
      { x: 33.3, z: 14.4, r: 1.3, icon: '简', async onInteract(ctx) {
        await ctx.narr('平石上散落着几片竹简，编绳早已朽断。墨迹虽已漫漶，仍能勉强辨出几行古篆——');
        await ctx.story(['昔夏之方有德也，远方图物，', '贡金九牧，铸鼎象物，', '百物而为之备，', '使民知神奸。', '!……鼎迁于商，载祀六百。'], { hold: 2.0 });
        await ctx.say('moheng', '是《左传》里王孙满论鼎的话：「铸鼎象物，使民知神奸」。');
        await ctx.say('moheng', '九鼎上铸着天下百物的形貌，让百姓认得哪些是神、哪些是奸邪……');
        await ctx.say('moheng', '若残片真是鼎的一部分，那它能认出妖物、吸纳妖气，也就说得通了。');
        if (hasWy(ctx)) {
          await ctx.say('wuyue', '你们中原人管这叫「知神奸」。我们南疆的说法简单些——');
          await ctx.say('wuyue', '「鼎是山川的眼睛」。眼睛闭上了，妖怪才敢出来。');
        }
        if (!ctx.flags.fo_slipsRead) { ctx.flags.fo_slipsRead = true; ctx.give('dew', 1); await ctx.narr('竹简下压着一只小瓷瓶，大概是哪位过路的读书人遗落的。'); }
      } },
      // 墨家界碑
      { x: 15.3, z: 7.9, r: 1.3, icon: '碑', async onInteract(ctx) {
        await ctx.narr('一块青石界碑立在山道口，碑首嵌着一枚小小的铜齿轮。四个大字刀劈斧凿：「墨家禁地」。');
        await ctx.narr('碑侧另有一行小字：「非请勿入。入者，兼爱之；犯者，非攻之。」');
        await ctx.say('moheng', '……好霸道的界碑。可这字里，还是墨家的意思——来者是客，犯者才挡。');
        if (hasWy(ctx)) await ctx.say('wuyue', '「非攻」？立块碑把山都圈起来了，还说自己非攻。');
      } },
      // 墨家机关灯（存档点）
      { x: 22.8, z: 8.7, r: 1.4, icon: '灯', async onInteract(ctx) {
        if (!ctx.flags.fo_lampLit) {
          await ctx.narr('一盏青铜铸成的灯台，灯座上嵌着几枚咬合的齿轮，灯罩里空空荡荡，积满了竹叶。');
          await ctx.say('moheng', '墨家的机关灯！师父说过，旧坊外的山道上每隔一里就有一盏，只要拨动机括，就能借地气长明不熄。');
          await ctx.say('moheng', '齿轮还没锈死……让我试试。');
          ctx.sfx('gear'); await ctx.wait(400); ctx.sfx('gear'); await ctx.wait(400);
          refs.lamp.userData.setLit(true);
          ctx.flags.fo_lampLit = true;
          ctx.sfx('chime');
          ctx.flash('#c8fff0', 500, 0.35);
          await ctx.wait(900);
          await ctx.narr('齿轮咔哒咔哒地转了起来，灯罩里亮起一团清冷的青光。光晕所及之处，林间的妖气仿佛都退开了几分。');
          if (hasWy(ctx)) await ctx.say('wuyue', '……好干净的光。你们墨家，倒也不全是只会造兵器的。');
        }
        const c = await ctx.choose(['在灯下歇息（恢复全员・保存进度）', '离开']);
        if (c === 0) { await ctx.fadeOut(500); ctx.healAll(); ctx.sfx('heal'); await ctx.wait(400); await ctx.fadeIn(500); ctx.save(); }
      } },
      // 黑袍布角
      { x: 17.2, z: 3.6, r: 1.2, icon: '布', enabled: (gg) => gg.state.flags.fo_bossDone, async onInteract(ctx) {
        await ctx.narr('石阶下压着一角撕破的黑布。布料细密，绝非山里人穿得起的；边缘绣着一道暗红色的回纹。');
        await ctx.say('moheng', '黑袍……孙叔说的那些人，果然从这里上了山。');
        if (hasWy(ctx)) await ctx.say('wuyue', '布上有股味道……像是铜锈，又像是血。');
        ctx.flags.fo_sawCloth = true;
      } },
      chestObj(g.world, 'forest1', 6.2, 43.2, [['herb', 2], ['money', 30]], P),
      chestObj(g.world, 'forest2', 30.0, 48.2, [['firebomb', 2]], P),
      chestObj(g.world, 'forest3', 33.4, 40.2, [['incense', 1], ['dew', 1]], P),
      chestObj(g.world, 'forest4', 7.4, 18.0, [['qingyu', 1]], P),
      chestObj(g.world, 'forest5', 6.8, 10.0, [['spirit', 1], ['money', 60]], P),
      chestObj(g.world, 'forest6', 31.2, 16.2, [['herb', 2], ['dew', 1]], P),
    ],

    triggers: (g) => [
      { id: 'ambush', x0: 14.5, z0: 46.6, x1: 21.5, z1: 48.2, cond: (gg) => !gg.state.flags.fo_ambushDone, run: ambushScene },
      { id: 'cry', x0: 14, z0: 37.5, x1: 22, z1: 40.5, cond: (gg) => gg.state.flags.fo_ambushDone && !gg.state.flags.fo_sunSaved,
        run: async (ctx) => {
          ctx.face('player', 'right');
          await ctx.say('「远处的声音」', '……救命啊——有没有人呐——！');
          await ctx.emote('player', '！', 700);
          await ctx.say('moheng', '东边，溪水那头！是孙叔的声音！');
          ctx.objective('循着呼救声，往东边的溪岸去看看');
        } },
      { id: 'sun', x0: 23.4, z0: 36.4, x1: 26.4, z1: 41.2, cond: (gg) => !gg.state.flags.fo_sunSaved, run: sunScene },
      { id: 'wuyue', x0: 15.5, z0: 28.8, x1: 23.5, z1: 31.4, cond: (gg) => !gg.state.flags.fo_wuyueJoined && !gg.state.party.includes('wuyue'), run: wuyueScene },
      { id: 'temple', x0: 1, z0: 17, x1: 9.5, z1: 24.8, cond: (gg) => birdHere(gg.state.flags) && !!refs.bird,
        run: async (ctx) => {
          ctx.sfx('cursor');
          refs.birdScripted = true;
          const t0 = performance.now();
          await tween(900, () => { const t = (performance.now() - t0) / 1000; refs.bird.userData.flap(t, 1); refs.bird.userData.body.position.y = Math.abs(Math.sin(t * 9)) * 0.12; });
          refs.birdScripted = false;
          await ctx.emote('player', '？', 800);
          await ctx.say('moheng', '庙里……好像有什么东西在扑腾？');
        } },
      { id: 'pass', x0: 13.5, z0: 9.0, x1: 26, z1: 11.2, cond: (gg) => !gg.state.flags.fo_bossDone,
        run: async (ctx) => {
          await ctx.pan(19.5, 6.5, 1.2);
          await ctx.narr('竹林在这里到了尽头。山道陡然收窄，两侧山崖如削，石阶一路向北，没入云雾。');
          await ctx.say('moheng', '过了这道山口，就是旧坊了。');
          if (hasWy(ctx)) await ctx.say('wuyue', '……嘘。你听，石阶上面有喘气的声音。很粗，很沉。');
          else await ctx.say('moheng', '……石阶上面，好像有什么东西在喘气。');
          ctx.release();
          await ctx.say('moheng', '那边那盏青铜灯……是墨家的机关灯？先过去看看。');
          ctx.objective('调查山道口的墨家机关灯，整备后再登上石阶');
        } },
      { id: 'boss', x0: 15.5, z0: 3.4, x1: 23.5, z1: 5.8, cond: (gg) => !gg.state.flags.fo_bossDone, run: bossScene },
    ],

    async onEnter(ctx) {
      if (ctx.flags.fo_entered) return;
      ctx.flags.fo_entered = true;
      await ctx.wait(1500);
      await ctx.narr('出了洛水渡北门，便是竹海。');
      await ctx.narr('千竿万竿的翠竹遮天蔽日，午后的日光被层层竹叶筛碎，落在长满青苔的石灯笼上，斑斑驳驳，像撒了一地碎金。');
      await ctx.say('moheng', '阿柱哥说，顺着石灯笼走，别离开大路……');
      await ctx.say('moheng', '可这些灯笼，怕是有好些年没人点过了。');
      if (ctx.flags.gotShard) await ctx.say('moheng', '（怀里的残片……从进林子起，就一直微微发烫。）');
      ctx.objective('沿着石灯笼穿过竹海，前往北山的墨家旧坊');
    },
  };

  // ======================= 剧情 =======================
  async function ambushScene(ctx) {
    ctx.music('tension');
    await ctx.narr('风停了。');
    refs.shake = 1;
    ctx.sfx('whoosh');
    await ctx.wait(800);
    await ctx.narr('可竹叶还在沙沙作响——东边那丛竹子，正一下一下地摇晃，像是有什么东西在里面翻身。');
    ctx.face('player', 'right');
    await ctx.emote('player', '？', 900);
    await ctx.say('moheng', '……没有风，竹子怎么会自己动？');
    await ctx.pan(21, 44.8, 0.8);
    refs.shake = 3; ctx.shake(0.5); ctx.sfx('roar');
    const mon = refs.ambMon;
    if (mon) { mon.visible = true; await slide(mon, 20.6, 45.0, 450); }
    refs.shake = 0.3;
    await ctx.say('moheng', '竹、竹妖！阿柱哥说的「会动的竹子」，原来不是吓唬人的！');
    await ctx.say('moheng', '路被它堵死了……跑是跑不掉了。');
    await ctx.say('moheng', '冷静，墨衡。爹说过——竹妖怕金铁之声，剑招对它最管用！');
    ctx.release();
    await ctx.battle(['bamboo'], { tutorial: true, noFlee: true, intro: '竹妖拦住了去路！' });
    if (mon) mon.visible = false;
    refs.shake = 0;
    ctx.flags.fo_ambushDone = true;
    // —— 残片吸收妖气 ——
    await ctx.wait(300);
    await ctx.narr('竹妖化作一地枯黄的竹叶。可它倒下的地方，一缕青黑色的妖气迟迟没有散去——');
    await absorb(ctx, 20.6, 45.0);
    await ctx.narr('那缕妖气像是被什么牵引着，丝丝缕缕，尽数钻进了墨衡的行囊。');
    await ctx.emote('player', '！', 800);
    await ctx.say('moheng', '残片……在发烫！');
    await ctx.narr('取出来一看，青铜残片上的饕餮纹正泛着幽幽青光，仿佛饮下了那缕妖气，过了好一会儿才沉沉暗了下去。');
    await ctx.say('moheng', '它把妖气……吸进去了？');
    await ctx.say('moheng', '《墨经》残卷里提过一句：上古之鼎，「铸百物之形，摄百物之魂」。我一直以为那只是古人的夸张……');
    await ctx.say('moheng', '如果这真是鼎的碎片——那么趁妖物露出破绽、魂魄不稳的时候，也许就能用它把妖魂收进来。');
    await ctx.story(['青铜残片 · 炼妖之术', '战斗中，妖物陷入「破绽」时，', '墨衡可用残片施展「炼妖·摄魂」，', '将其魂魄封入鼎中，化为「妖魄」。', '!妖魄可在菜单「炼妖」中炼化为丹药与符箓。'], { hold: 2.0 });
    ctx.flags.sealUnlocked = true;
    ctx.toast('习得「炼妖·摄魂」');
    ctx.sfx('levelup');
    await ctx.say('moheng', '炼妖……师叔一定知道得更多。得赶紧去旧坊问个明白。');
    ctx.music('forest');
    ctx.objective('沿着石灯笼北行，穿过竹海（林中妖物出没，可试试「炼妖·摄魂」）');
  }

  async function sunScene(ctx) {
    ctx.music('tension');
    await ctx.say('laosun', '别、别过来！我老孙一辈子没干过亏心事，你找错人啦——！');
    await ctx.pan(29.2, 37.0, 1.0);
    await ctx.narr('窝棚前，一个樵夫打扮的汉子抱着右脚缩在柴堆边。溪水里浮起一团惨白的影子，湿漉漉的长发拖在水面上，正一寸一寸地朝岸上爬。');
    const ng = refs.nigui;
    if (ng) await tween(900, (k) => { ng.userData.baseY = -0.9 + 0.9 * ease(k); ng.position.z = 34.9 + 0.8 * k; });
    ctx.sfx('roar');
    await ctx.say('moheng', '是溺鬼！——孙叔！别动！');
    ctx.release();
    await ctx.walk('player', 27.4, 38.6, 5);
    ctx.face('player', 'right');
    if (hasWy(ctx)) await ctx.say('wuyue', '水里的脏东西，最怕火。正好拿来试试我的符。');
    else await ctx.say('moheng', '老周叔说，溺鬼专拖人下水……可这里是岸上，轮不到你撒野！');
    await ctx.battle(hasWy(ctx) ? ['nigui', 'nigui'] : ['nigui'], { noFlee: true, intro: '溺鬼从溪水中爬上岸来！' });
    if (ng) ng.visible = false;
    ctx.music('forest');
    ctx.flags.fo_sunSaved = true;
    ctx.flags.sunRescued = true;
    ctx.face('laosun', 'player'); ctx.face('player', 'laosun');
    await ctx.say('laosun', '走、走了？那东西真走了？');
    await ctx.say('laosun', '你……你是洛水渡墨家那小子？阿衡？');
    await ctx.say('moheng', '是我。孙叔，您伤着哪儿了？');
    await ctx.say('laosun', '脚，脚崴了。前天进山砍柴，那水鬼从溪里冒出来，我扔下斧头就跑，一脚踩进石缝里……');
    await ctx.say('laosun', '在这窝棚里缩了两宿，啃了两天野果子。那东西天一擦黑就在水边转悠，我连眼都不敢合。');
    if (ctx.flags.fo_sawAxe) {
      await ctx.say('moheng', '您的斧子还插在南边的竹桩上呢，柄上刻着个「孙」字。');
      await ctx.say('laosun', '嘿！那可是我爹传下来的，丢了要挨祖宗骂。回头我自个儿去拔。');
    }
    await ctx.say('moheng', '阿柱哥让我捎话——孙婶都急哭了，叫您赶紧回家。');
    await ctx.say('laosun', '那婆娘……嘴上比刀子还凶，心比豆腐还软。');
    await ctx.emote('laosun', '…', 900);
    await ctx.say('laosun', '阿衡，你救了我这条老命，我老孙没啥好东西……这个你拿着。');
    await ctx.say('laosun', '早年给一个过路的道士指过路，他留下这张符，说贴在腿上能日行百里。我这腿脚，贴了也是白瞎。');
    ctx.give('shenxing', 1);
    await ctx.say('laosun', '还有几包草药，我自己在山里采的，止血化瘀，灵得很。');
    ctx.give('herb', 2);
    await ctx.say('laosun', '你是要去北山的旧坊吧？听我一句——');
    await ctx.say('laosun', '过了溪往西，有座土地庙。庙后头有条猎道，拿竹栅栏拦着，那是我们打猎人的近路，能直通山道口。');
    await ctx.say('laosun', '栅栏上的绳结是活扣，往左拧三圈就开。外人不知道这个窍门。');
    ctx.flags.fo_shortcutKnown = true;
    await ctx.say('laosun', '还有……');
    await ctx.narr('老孙压低了嗓子，朝北边的山影望了一眼。');
    await ctx.say('laosun', '前几天夜里，我在山道上撞见几个人。一身黑袍，脸上扣着青铜面具，抬着个蒙了布的大家伙，往旧坊里去。');
    await ctx.say('laosun', '走路一点声儿都没有，跟飘似的。我躲在石头后头，大气都不敢出。');
    await ctx.say('moheng', '黑袍人……去了旧坊？');
    await ctx.say('laosun', '打那以后，山魈王就下山守在了山道口。往常那畜生可从不离开山顶的。');
    await ctx.say('laosun', '阿衡，旧坊那地方，怕是不太平。你师叔他……');
    await ctx.say('moheng', '……那我就更得快些去了。');
    if (hasWy(ctx)) {
      await ctx.emote('wuyue', '…', 900);
      await ctx.say('moheng', '巫月姑娘？');
      await ctx.say('wuyue', '……没什么。青铜面具，听着让人不舒服罢了。');
    }
    await ctx.say('laosun', '我这腿歇了两天，能走了。那水鬼一除，我这就回村，省得我那婆娘把渡口哭塌喽。');
    await ctx.say('laosun', '你们多保重！见着山魈王，可千万别硬拼啊！');
    await ctx.walkPath('laosun', [[26.4, 39.0], [24.0, 39.5]], 1.4);
    await ctx.fadeOut(500);
    ctx.remove('laosun');
    await ctx.wait(300);
    await ctx.fadeIn(500);
    await ctx.narr('老孙拄着一根竹竿，一瘸一拐地往洛水渡的方向去了。');
    ctx.objective(ctx.flags.fo_wuyueJoined ? '登上北边的山道，前往墨家旧坊' : '过溪北行，穿过竹海前往墨家旧坊');
  }

  async function wuyueScene(ctx) {
    ctx.music('tension');
    await ctx.say('「少女的声音」', '——退开！再往前一步，本姑娘就把你们烧成焦炭！');
    ctx.face('player', 'up');
    await ctx.emote('player', '！', 700);
    await ctx.pan(18.7, 25.0, 1.1);
    await ctx.narr('空地中央，一个银饰叮当的少女背靠着青石，手中法杖上的铜铃急急作响。两头山魈和一团幽蓝的狐火，正把她围在中间。');
    await ctx.say('moheng', '一身银饰……是刘嫂说的那位南疆姑娘！');
    await ctx.say('wuyue', '哼，三只小妖也想拦我？我、我只是灵力还没缓过来——');
    const mons = refs.wyMons || [];
    ctx.sfx('roar'); ctx.shake(0.4);
    if (mons[0]) await lunge(mons[0], 0.4, 0.5);
    await ctx.emote('wuyue', '！', 600);
    await ctx.say('moheng', '姑娘小心！');
    ctx.release();
    await ctx.walkPath('player', [[19.2, 28.6], [18.8, 27.0]], 5.2);
    ctx.face('player', 'up');
    ctx.face('wuyue', 'player');
    await ctx.say('wuyue', '你是谁？！……中原人？少来多管闲事！');
    await ctx.say('moheng', '多管闲事也好，总不能眼睁睁看着你被吃掉。');
    await ctx.say('moheng', '山魈皮糙肉厚，刀剑难伤；可狐火怕水——姑娘的符里，可有水行的？');
    await ctx.emote('wuyue', '…', 600);
    await ctx.say('wuyue', '……用不着你教！看好了，别拖我后腿！');
    ctx.face('wuyue', 'up');
    ctx.join('wuyue');
    await ctx.battle(['shanxiao', 'foxfire', 'shanxiao'], { tutorial: true, noFlee: true, intro: '与南疆少女联手，击退妖物！' });
    mons.forEach((m) => { m.visible = false; });
    ctx.flags.fo_wuyueJoined = true;
    ctx.music('forest');
    ctx.face('wuyue', 'player'); ctx.face('player', 'wuyue');
    await ctx.say('wuyue', '……哼。就算你不来，我一个人也收拾得了它们。');
    await ctx.say('moheng', '是是。姑娘那道火符很厉害，我在书上都没见过那样的写法。');
    await ctx.say('wuyue', '书上？你们中原人什么都往书里写，写完了又不信。');
    // 银铃自鸣
    ctx.sfx('chime');
    await ctx.wait(350);
    ctx.sfx('chime');
    await ctx.emote('wuyue', '！', 900);
    await ctx.narr('巫月腰间的银铃忽然自己响了起来。叮——叮——没有风，铃声却一声比一声急。');
    await ctx.say('wuyue', '……银铃在响。');
    await ctx.walk('wuyue', ctx.actor('player').x, ctx.actor('player').z - 0.9, 2);
    await ctx.say('wuyue', '你身上带着什么东西？拿出来。');
    await ctx.say('moheng', '这个？洛水里捞起来的一块铜片……');
    ctx.flash('#bfffe8', 700, 0.7); ctx.sfx('seal');
    await ctx.wait(500);
    await ctx.narr('残片一离开行囊，便泛起了淡淡的青光。银铃骤然一静——随即像受了惊的鸟群，响成一片。');
    await ctx.say('wuyue', '鼎气……果然是鼎气！大巫说的一点都没错。');
    await ctx.say('moheng', '鼎气？姑娘知道这残片的来历？');
    await ctx.say('wuyue', '我叫巫月，南疆巫族。');
    await ctx.say('wuyue', '三个月前，族里供奉的铜铃一夜之间全响了。大巫闭关占了七天七夜，说北方有鼎苏醒，地脉翻动，妖气也会跟着起来。');
    await ctx.say('wuyue', '她让我出来查看。我一路追着这股气息，从苍梧走到洛水——');
    await ctx.say('wuyue', '结果它就落在你这么个书呆子手里。');
    await ctx.say('moheng', '在下墨衡，墨家旁支的机关师……这铜片是渡口的渔夫捞上来的。我正要送去北山的旧坊，交给师叔墨拙。');
    await ctx.emote('wuyue', '！', 700);
    await ctx.say('wuyue', '墨家？就是那帮造机关、修城墙、什么都想拆开来看看的中原人？');
    await ctx.walk('wuyue', ctx.actor('wuyue').x, ctx.actor('wuyue').z - 0.6, 1.5);
    ctx.face('wuyue', 'player');
    await ctx.say('wuyue', '我把话说在前头：鼎不是你们中原人的。当年禹王收九州之金铸鼎，那金子里也有我们南疆的一份！');
    await ctx.say('wuyue', '你们要是想把它据为己有——先问问我的铜铃答不答应。');
    const c = await ctx.ask('moheng', '（她好像对中原人很有戒心……）', ['我不是来抢鼎的', '老实说，我也不知道该拿它怎么办']);
    if (c === 0) {
      await ctx.say('moheng', '墨家的规矩是「兼爱、非攻」。别人的东西，我们不抢；该护着的东西，我们拼了命也要护住。');
      await ctx.say('moheng', '这残片若真是九鼎之物，它该去哪儿，不该由我一个人说了算。');
      await ctx.say('wuyue', '……说得好听。中原人说话，一向比唱歌还好听。');
    } else {
      await ctx.say('moheng', '我连它为什么会发光、为什么会吸妖气都弄不清楚。所以才要去问师叔。');
      await ctx.say('moheng', '你要是知道得比我多，我倒想请教请教。');
      await ctx.say('wuyue', '……你这人，倒是老实得有点傻。');
    }
    await ctx.emote('wuyue', '…', 1000);
    await ctx.say('wuyue', '好吧。我跟你走一趟。');
    await ctx.say('moheng', '欸？');
    await ctx.say('wuyue', '别误会！我是怕你半路被妖怪吃了，那铜片落到更坏的人手里。我得亲眼盯着它。');
    await ctx.say('wuyue', '还有，刚才的事……谢——');
    await ctx.say('wuyue', '……算了。那两只山魈本来就快不行了，你不过是捡了个便宜。');
    await ctx.say('moheng', '（嘴上一点不饶人……不过，好像也不是什么坏人。）');
    await ctx.say('wuyue', '还愣着干什么？走啊，书呆子。前面的路我可不认得，你带路。');
    ctx.objective(ctx.flags.fo_sunSaved ? '与巫月同行，登上北边的山道前往墨家旧坊' : '与巫月同行，穿过竹海前往北山的墨家旧坊');
    ctx.game.autosave();
  }

  async function birdScene(ctx) {
    const bird = refs.bird;
    const wasActive = ctx.flags.birdQuest === 'active';
    await ctx.narr('供桌上，香灰早已冷了一半。一只巴掌大的木鸟立在供盘边，正歪着脑袋，一下一下地啄着干瘪的野果。');
    await ctx.say('moheng', '青色的翅膀，尾巴上一个小红点……');
    await ctx.emote('player', '！', 700);
    await ctx.say('moheng', '这不是我给小豆做的机关鸟吗！');
    refs.birdScripted = true;
    const p = game.world.player;
    const x0 = bird.position.x, y0 = bird.position.y, z0 = bird.position.z;
    const t0 = performance.now();
    ctx.sfx('whoosh');
    // 受惊：扑腾着飞起来，绕了半圈
    await tween(900, (k) => { const t = (performance.now() - t0) / 1000; bird.userData.flap(t, 1); bird.position.y = y0 + Math.sin(k * Math.PI) * 0.6; bird.position.x = x0 + Math.sin(k * Math.PI * 2) * 0.4; });
    await ctx.say('moheng', '别怕，别怕——是我呀。你的翅膀还是我亲手装的呢。');
    // 落到墨衡手上
    const tx = p.x + 0.35, tz = p.z + 0.1;
    await tween(1300, (k) => {
      const t = (performance.now() - t0) / 1000; const e = ease(k);
      bird.userData.flap(t, 1 - k * 0.7);
      bird.position.x = x0 + (tx - x0) * e; bird.position.z = z0 + (tz - z0) * e;
      bird.position.y = y0 + (1.15 - y0) * e + Math.sin(k * Math.PI) * 0.7;
      bird.rotation.y = Math.atan2(tx - x0, tz - z0);
    });
    ctx.sfx('chime');
    await ctx.wait(400);
    await ctx.narr('机关鸟扑棱了两下翅膀，乖乖落在墨衡的掌心，发条「咔哒」一声，停住了。');
    await ctx.say('moheng', '发条早该松了才对……是那夜洛水的光，让它「活」过来的吗？');
    if (hasWy(ctx)) {
      await ctx.say('wuyue', '木头做的鸟，也会自己飞？……你们墨家，倒还真有点意思。');
      await ctx.say('moheng', '它只是想回家罢了。飞得太远，迷了路。');
      await ctx.say('wuyue', '……哼。跟某些人一样。');
    }
    bird.visible = false;
    ctx.give('bird', 1);
    ctx.flags.fo_birdTaken = true;
    ctx.flags.birdQuest = 'found';
    refs.bird = null;
    if (wasActive) {
      await ctx.say('moheng', '小豆一定急坏了。等回渡口，第一件事就是把它还给她。');
      ctx.toast('找到了机关鸟！回洛水渡交给小豆吧');
    } else {
      await ctx.say('moheng', '小豆那丫头，怕是哭鼻子哭了好几回了。回渡口的时候带给她吧。');
    }
  }

  async function bossScene(ctx) {
    ctx.music('tension');
    await ctx.pan(19.5, 4.0, 1.0);
    await ctx.narr('石阶上，蹲着一头小山似的灰毛巨兽。它颈上挂着一串兽骨，獠牙间叼着半截竹子，正慢条斯理地嚼着。');
    await ctx.say('moheng', '好大的山魈……那块石头上的爪痕，就是它留下的。');
    const king = refs.king;
    ctx.sfx('roar'); ctx.shake(0.8);
    if (king) await lunge(king, 0, 0.7);
    await ctx.narr('巨兽吐掉竹子，捶着胸膛长啸一声，震得满山竹叶簌簌而落。');
    if (hasWy(ctx)) {
      await ctx.say('wuyue', '山魈王。在南疆，一头山魈王就能占住整座山头，连猎户都得绕着走。');
      await ctx.say('wuyue', '怕了？现在掉头还来得及哦，书呆子。');
      await ctx.say('moheng', '怕。');
      await ctx.say('moheng', '可它身后就是旧坊，师叔还在里面。墨家子弟，没有见了难处就绕道的道理。');
      await ctx.say('wuyue', '……哼，说得倒像那么回事。');
      await ctx.say('wuyue', '它浑身是毛，最怕火。我来烧，你来砍——别让它碰到我！');
    } else {
      await ctx.say('moheng', '……怕是怕的。可它身后就是旧坊，墨家子弟，没有见了难处就绕道的道理。');
    }
    ctx.release();
    await ctx.battle(['shanxiaowang'], { noFlee: true, intro: '山魈王挡住了去路！' });
    ctx.flags.fo_bossDone = true;
    if (refs.kingSolid) game.world.removeSolid(refs.kingSolid);
    ctx.music('forest');
    if (king) {
      await ctx.pan(19.5, 3.5, 0.6);
      ctx.sfx('roar');
      await ctx.narr('山魈王哀嚎一声，捂着伤口翻上山崖，几个起落，便没入了云雾深处。');
      await tween(900, (k) => { king.position.y = k * 3.5; king.position.x = 19.5 + k * 3; king.userData.mat.transparent = true; king.userData.mat.opacity = 1 - k; });
      king.visible = false;
      ctx.release();
    }
    await ctx.say('moheng', '呼……总算过去了。');
    if (hasWy(ctx)) {
      await ctx.say('wuyue', '还行嘛。刚才那一剑，勉强算有点样子。');
      await ctx.say('moheng', '巫月姑娘的火符也——');
      await ctx.say('wuyue', '不用你夸。我本来就很厉害。');
      ctx.face('wuyue', 'up');
      await ctx.emote('wuyue', '…', 900);
      await ctx.say('wuyue', '……不过，它为什么会守在这里？山魈王从不下山，除非……山上有让它更害怕的东西。');
    }
    if (refs.cloth) refs.cloth.visible = true;
    await ctx.narr('石阶下，一角撕破的黑布被风掀起，又落了回去。');
    ctx.objective('登上北边的石阶，前往墨家旧坊');
    ctx.game.autosave();
  }
}

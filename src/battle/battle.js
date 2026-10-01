// 回合制战斗：破绽(护盾)/蓄气(BP)/五行克制/炼妖封印
import * as THREE from 'three';
import { buildStage } from './stage.js';
import { VFX } from './vfx.js';
import { SKILL_FX, ENEMY_FX } from './skillfx.js';
import { buildMonster } from '../art/monsters.js';
import { Actor } from '../world/actor.js';
import { shared } from '../world/effects.js';
import { HEROES, SKILLS, ITEMS, ENEMIES, ICON, SOULS } from '../data/db.js';
import { stats, gainExp, addItem } from '../core/state.js';
import { el, $, ListNav, portrait } from '../ui/ui.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EPX = 1 / 26;
const BOOST_MUL = [1, 1.9, 2.7, 3.5];

export class Battle {
  constructor(game) { this.game = game; this.tweens = []; }

  // ---------- 初始化 ----------
  setup(opts) {
    const g = this.game;
    this.opts = opts;
    const st = buildStage(opts.bg || 'forest');
    this.scene = st.scene; this.camera = st.camera; this.stageUpdaters = st.updaters;
    this.camBase = this.camera.position.clone();
    this.vfx = new VFX(this.scene);
    this.smoke = new VFX(this.scene, { additive: false });
    this.tweens = [];
    this.round = 0; this.result = null; this.tipsShown = new Set(); this.boostedThisRound = new Set(); this.defeated = []; this.sealedSouls = [];
    this.dimLevel = 0; this.dimTarget = 0;
    // 我方
    this.party = g.state.party.map((id, i) => {
      const s = stats(g.state, id), h = g.state.heroes[id];
      const actor = new Actor(HEROES[id].look);
      const home = new THREE.Vector3(i === 0 ? 2.7 : 3.9, 0, i === 0 ? -0.5 : 1.3);
      actor.setPos(home.x, home.z); actor.pose = 'idle';
      this.scene.add(actor.group);
      return { side: 'party', id, name: HEROES[id].name, weapon: HEROES[id].weapon, actor, home, group: actor.group,
        hp: Math.max(1, h.hp), maxhp: s.hp, sp: h.sp, maxsp: s.sp, atk: s.atk, def: s.def, mag: s.mag, res: s.res, spd: s.spd,
        bp: 1, buffs: {}, ko: false, h: 1.5 };
    });
    // 敌方
    const n = opts.enemies.length;
    const slots = n === 1 ? [[-2.9, -0.2]] : n === 2 ? [[-2.3, -1.0], [-3.6, 1.0]] : [[-2.0, -1.5], [-3.9, -0.3], [-2.3, 1.4]];
    const counts = {};
    this.enemies = opts.enemies.map((key, i) => {
      const d = ENEMIES[key];
      counts[key] = (counts[key] || 0) + 1;
      const pos = d.boss ? [-3.2, -1.6] : (d.miniboss ? [-2.9, -0.5] : slots[i]);
      return this.makeEnemy(key, pos, opts.enemies.filter((k) => k === key).length > 1 ? String.fromCharCode(64 + counts[key]) : '');
    });
    this.buildUI();
    this.camera.aspect = window.innerWidth / window.innerHeight; this.camera.updateProjectionMatrix();
    g.renderer.setView(this.scene, this.camera);
    g.renderer.setLook({ bloom: opts.bg === 'boss' ? 0.75 : 0.5, bloomThreshold: 0.86, tilt: 1.6, band: 0.26, focusY: 0.42, vignette: 0.5 });
  }

  makeEnemy(key, [x, z], suffix = '') {
    const d = ENEMIES[key];
    const sp = buildMonster(d.sprite);
    const w = sp.w * EPX * d.scale, hgt = sp.h * EPX * d.scale;
    const geo = new THREE.PlaneGeometry(w, hgt); geo.translate(0, hgt / 2, 0);
    const nrm = geo.attributes.normal; for (let i = 0; i < nrm.count; i++) nrm.setXYZ(i, 0, 0.55, 0.835);
    const mat = new THREE.MeshLambertMaterial({ map: sp.texture, alphaTest: 0.5, side: THREE.DoubleSide, emissive: new THREE.Color(1, 1, 1), emissiveMap: sp.glow, emissiveIntensity: sp.glowAll ? 0.9 : 1.3 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: sp.texture, alphaTest: 0.5 });
    const group = new THREE.Group();
    group.add(mesh);
    const blob = new THREE.Mesh(new THREE.CircleGeometry(w * 0.32, 20), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.3, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2; blob.scale.y = 0.5; blob.position.y = 0.02;
    group.add(blob);
    const home = new THREE.Vector3(x, d.float ? 0.35 : 0, z);
    group.position.copy(home);
    this.scene.add(group);
    const e = { side: 'enemy', key, def: d, name: d.name + suffix, mesh, mat, sp, group, home, h: hgt, w,
      hp: d.hp, maxhp: d.hp, atk: d.atk, def_: d.def, mag: d.mag, res: d.res, spd: d.spd,
      shield: d.shield, maxShield: d.shield, weak: [...d.weak], revealed: new Set(this.game.state.flags['known_' + key] || []),
      broken: 0, buffs: {}, ko: false, boss: !!d.boss, miniboss: !!d.miniboss, phase: 1, turnCount: 0, charging: false, bob: Math.random() * 6, squash: 1, twist: 0 };
    e.def = d; e.defense = d.def;
    return e;
  }

  // ---------- 界面 ----------
  buildUI() {
    const root = (this.ui = el('div')); root.id = 'battle';
    root.innerHTML = `<div class="order"></div><div class="msg"></div><div class="einfos"></div><div class="party"></div><div class="pops"></div><div class="cursors"></div>`;
    this.game.ui.layer.appendChild(root);
    this.renderParty();
  }
  renderParty() {
    const box = $('.party', this.ui);
    box.innerHTML = '';
    for (const u of this.party) {
      const d = el('div', 'pm' + (u.ko ? ' ko' : '') + (this.active === u ? ' act' : ''));
      const bp = Array.from({ length: 5 }, (_, i) => `<i class="${i < u.bp ? (this.active === u && i >= u.bp - this.boost ? 'use' : 'on') : ''}"></i>`).join('');
      const buffs = Object.entries(u.buffs).map(([k, b]) => `<span style="color:${b.amt > 0 ? '#8fd0ff' : '#ff8a7a'};margin-left:4px">${{ def: '防', atk: '攻', spd: '速', res: '抗' }[k]}${b.amt > 0 ? '↑' : '↓'}</span>`).join('');
      d.innerHTML = `<div class="n">${u.name}</div>
        <div class="row">气血<div class="bar hp"><i style="transform:scaleX(${u.hp / u.maxhp})"></i></div><span class="v">${u.hp}/${u.maxhp}</span></div>
        <div class="row">灵力<div class="bar sp"><i style="transform:scaleX(${u.sp / u.maxsp})"></i></div><span class="v">${u.sp}/${u.maxsp}</span></div>
        <div class="row"><div class="bp">${bp}</div>${buffs}${u.defending ? '<span style="color:#ffd070;margin-left:6px">防御</span>' : ''}</div>`;
      box.appendChild(d);
    }
  }
  renderOrder(order, idx = -1) {
    const box = $('.order', this.ui);
    box.innerHTML = '<span class="lbl">行动</span>';
    order.forEach((u, i) => {
      const o = el('div', 'o ' + (u.side === 'party' ? 'ally' : 'enemy') + (i === idx ? ' now' : '') + (i < idx ? ' done' : ''));
      o.style.backgroundImage = `url(${u.side === 'party' ? portrait(HEROES[u.id].look) : u.sp.canvas.toDataURL()})`;
      if (u.side === 'enemy') o.style.backgroundSize = 'contain';
      o.title = u.name;
      box.appendChild(o);
    });
  }
  msg(text, ms = 1100) {
    const m = $('.msg', this.ui);
    m.textContent = text; m.classList.add('on');
    clearTimeout(this._mt);
    if (ms) this._mt = setTimeout(() => m.classList.remove('on'), ms);
  }
  pop(u, text, cls = '') {
    const p = this.screen(this.center(u).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.3 + Math.random() * 0.4, 0)));
    const e = el('div', 'pop ' + cls, text);
    e.style.left = p.x + 'px'; e.style.top = p.y + 'px';
    $('.pops', this.ui).appendChild(e);
    setTimeout(() => e.remove(), 1200);
  }
  stamp(text, sub = '') {
    const s = el('div', 'stamp', text + (sub ? `<small>${sub}</small>` : ''));
    this.ui.appendChild(s);
    setTimeout(() => s.remove(), 1150);
  }
  screen(v) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * window.innerWidth, y: (-p.y * 0.5 + 0.5) * window.innerHeight };
  }
  updateEnemyInfo() {
    const box = $('.einfos', this.ui);
    if (!box) return;
    this.enemies.forEach((e, i) => {
      let d = box.children[i];
      if (!d) { d = el('div', 'einfo'); box.appendChild(d); }
      if (e.ko) { d.style.opacity = 0; return; }
      d.style.opacity = 1;
      const p = this.screen(new THREE.Vector3(e.group.position.x, e.group.position.y - 0.15, e.group.position.z));
      d.style.left = p.x + 'px'; d.style.top = p.y + 'px';
      const wk = e.weak.map((w) => `<span class="${e.revealed.has(w) ? 'r ' + w : ''}">${e.revealed.has(w) ? ICON[w] : '？'}</span>`).join('');
      const key = `${e.shield}|${e.broken}|${wk}|${e.hp}|${e.charging}`;
      if (d._k === key) return;
      d._k = key;
      d.innerHTML = `<div class="top"><div class="sh ${e.broken ? 'brk' : ''}">${e.broken ? '破' : e.shield}</div><div><div class="nm">${e.name}</div><div class="hpb"><i style="transform:scaleX(${e.hp / e.maxhp})"></i></div></div></div><div class="wk">${wk}</div>${e.charging ? '<div class="charge">蓄力中…</div>' : ''}`;
    });
  }

  // ---------- 演出辅助 ----------
  center(u) { const p = u.group.position; return new THREE.Vector3(p.x, p.y + u.h * 0.5, p.z + 0.05); }
  feet(u) { const p = u.group.position; return new THREE.Vector3(p.x, 0, p.z); }
  anim(dur, fn) { return new Promise((res) => this.tweens.push({ t: 0, dur, fn, res })); }
  fxCtx() {
    if (this._fx) return this._fx;
    const b = this, g = this.game;
    this._fx = {
      scene: this.scene, vfx: this.vfx,
      sleep, anim: (d, f) => b.anim(d, f),
      center: (u) => b.center(u), feet: (u) => b.feet(u),
      add: (o) => b.scene.add(o), remove: (o) => b.scene.remove(o),
      sfx: (n) => g.audio.sfxPlay(n),
      shake: (a) => { b.shakeT = Math.max(b.shakeT || 0, a); },
      flash: (c) => g.ui.flash(c, 350, 0.6),
      dim: (on) => { b.dimTarget = on ? 1 : 0; },
      pose: (u, p) => { if (u.actor) u.actor.pose = u.ko ? 'ko' : p; },
      visible: (u, v) => { u.group.visible = v; },
      move: (u, to, dur) => { const from = u.group.position.clone(); return b.anim(dur, (k) => { const e = k * k * (3 - 2 * k); u.group.position.lerpVectors(from, to, e); }); },
      ghost: (u, pos) => {
        if (!u.actor) return;
        const m = u.actor.mesh.clone(); m.material = u.actor.mat.clone(); m.material.transparent = true; m.material.opacity = 0.6; m.material.emissive = new THREE.Color('#5aa8ff');
        m.position.copy(pos).sub(new THREE.Vector3(0, u.h * 0.5, 0)); b.scene.add(m);
        b.anim(0.35, (k) => { m.material.opacity = 0.6 * (1 - k); }).then(() => b.scene.remove(m));
      },
      squash: (u, s, tw) => { u.squash = s; u.twist = tw; },
      cutin: (name, sub) => b.cutin(name, sub),
    };
    return this._fx;
  }
  cutin(name, sub) {
    const c = el('div');
    c.style.cssText = 'position:absolute;left:0;right:0;top:34%;height:130px;pointer-events:none;overflow:hidden';
    c.innerHTML = `<div style="position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(16,12,10,.92) 15%,rgba(16,12,10,.92) 85%,transparent);transform:scaleX(0);transition:transform .25s"></div>
      <div style="position:absolute;left:0;right:0;top:12px;text-align:center;font-family:var(--kai);font-size:76px;color:#ffd78a;letter-spacing:18px;text-shadow:0 0 20px #ff6a2a;opacity:0;transform:translateX(80px);transition:all .35s">${name}</div>
      <div style="position:absolute;left:0;right:0;bottom:8px;text-align:center;font-size:18px;color:#e8dcc0;letter-spacing:8px;opacity:0;transition:opacity .4s .2s">${sub}</div>`;
    this.ui.appendChild(c);
    requestAnimationFrame(() => { c.children[0].style.transform = 'scaleX(1)'; c.children[1].style.opacity = 1; c.children[1].style.transform = 'none'; c.children[2].style.opacity = 1; });
    this.game.audio.sfxPlay('boost');
    return sleep(1050).then(() => { c.style.transition = 'opacity .3s'; c.style.opacity = 0; setTimeout(() => c.remove(), 300); });
  }

  // ---------- 每帧 ----------
  update(dt, t) {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.fn(k);
      if (k >= 1) { this.tweens.splice(i, 1); tw.res(); }
    }
    for (const u of this.party) u.actor.update(dt, null);
    for (const e of this.enemies) {
      if (e.ko && !e.dying) continue;
      e.bob += dt;
      const s = e.squash ?? 1;
      const by = e.def.float ? Math.sin(e.bob * 2) * 0.12 : 0;
      e.mesh.position.y = by;
      e.mesh.scale.set(s * (1 + Math.sin(e.bob * 2.4) * 0.015), s * (1 - Math.sin(e.bob * 2.4) * 0.015), 1);
      e.mesh.rotation.z = e.twist || 0;
      if (e.flashT > 0) { e.flashT -= dt; e.mat.emissiveMap = e.sp.texture; e.mat.emissiveIntensity = Math.max(0, e.flashT * 6); }
      else { e.mat.emissiveMap = e.sp.glow; e.mat.emissiveIntensity = e.broken ? 0.4 : (e.sp.glowAll ? 0.9 : 1.3); }
      if ((e.boss || e.miniboss) && !e.broken && Math.random() < dt * (e.boss ? 14 : 6)) {
        const c = this.center(e);
        this.smoke.emit({ x: c.x + (Math.random() - 0.5) * e.w * 0.8, y: e.group.position.y + 0.2, z: c.z - 0.2 }, 1, { color: e.boss ? '#7a3aa0' : '#a05a3a', color2: e.boss ? '#2a0a3a' : '#3a1a10', speed: 0.2, up: 1.2, life: 1.6, size: e.boss ? 0.7 : 0.4, drag: 0.4 });
      }
      if (e.broken) { e.mesh.rotation.z = Math.sin(e.bob * 8) * 0.03; e.mat.color.setRGB(0.75, 0.75, 0.85); } else e.mat.color.setRGB(1, 1, 1);
    }
    this.vfx.update(dt);
    this.smoke.update(dt);
    // 蓄气光环
    if (this.active && this.boost > 0 && Math.random() < 0.5 + this.boost * 0.2) this.vfx.preset('boost', this.center(this.active));
    // 镜头
    this.dimLevel += (this.dimTarget - this.dimLevel) * Math.min(1, dt * 5);
    this.game.renderer.grade.uniforms.fade.value = this.dimLevel * 0.55;
    const cam = this.camera;
    cam.position.copy(this.camBase);
    cam.position.x += Math.sin(t * 0.3) * 0.15; cam.position.y += Math.sin(t * 0.23) * 0.05;
    if (this.shakeT > 0) { this.shakeT -= dt; const s = this.shakeT * 0.6; cam.position.x += (Math.random() - 0.5) * s; cam.position.y += (Math.random() - 0.5) * s; }
    cam.lookAt(0.2, 1.1, 0);
    cam.aspect = window.innerWidth / window.innerHeight; cam.updateProjectionMatrix();
    for (const u of this.stageUpdaters) u(t);
    shared.time.value = t;
    this.updateEnemyInfo();
    this.updateCursors();
  }

  // ---------- 主流程 ----------
  async run(opts) {
    const g = this.game;
    this.snapshot = JSON.stringify(g.state);
    this.setup(opts);
    g.audio.play(opts.music || (opts.boss ? 'boss' : 'battle'));
    // 登场
    for (const e of this.enemies) { e.group.position.x -= 6; }
    for (const u of this.party) u.group.position.x += 5;
    await g.ui.ink(false, 0.7);
    await Promise.all([
      ...this.enemies.map((e) => { const from = e.group.position.clone(); return this.anim(0.6, (k) => e.group.position.lerpVectors(from, e.home, 1 - Math.pow(1 - k, 3))); }),
      ...this.party.map((u) => { const from = u.group.position.clone(); u.actor.pose = null; u.actor.dir = 'left'; u.actor.moving = true; return this.anim(0.7, (k) => u.group.position.lerpVectors(from, u.home, k)).then(() => { u.actor.moving = false; u.actor.pose = 'idle'; }); }),
    ]);
    this.msg(opts.intro || (this.enemies.some((e) => e.boss) ? `${this.enemies[0].name} 现身！` : this.enemies.length > 1 ? '妖物来袭！' : `遭遇${this.enemies[0].name}！`), 1400);
    await sleep(600);
    if (opts.onStart) await opts.onStart(this);
    await this.tip('start');
    while (!this.result) {
      this.round++;
      const order = this.computeOrder();
      this.boostedThisRound = new Set();
      for (let i = 0; i < order.length && !this.result; i++) {
        const u = order[i];
        if (u.ko) continue;
        if (u.side === 'enemy' && u.broken) continue;
        this.renderOrder(order, i);
        if (u.side === 'party') {
          u.defending = false;
          this.active = u;
          const act = await this.playerTurn(u);
          this.active = null;
          await this.doPlayerAction(u, act);
        } else {
          await this.enemyTurn(u);
        }
        this.renderParty();
        this.checkEnd();
        await sleep(160);
      }
      if (this.result) break;
      await this.endRound();
    }
    $('.cursors', this.ui).innerHTML = '';
    if (this.result === 'win') await this.victory();
    else if (this.result === 'lose') {
      const r = await this.defeat();
      if (r === 'retry') { this.cleanup(); g.state = JSON.parse(this.snapshot); return this.run(opts); }
    } else if (this.result === 'flee') {
      this.syncBack();
    }
    this.cleanup();
    return this.result;
  }
  cleanup() {
    this.ui?.remove();
    this.game.renderer.grade.uniforms.fade.value = 0;
  }

  computeOrder() {
    const list = [];
    for (const u of [...this.party, ...this.enemies]) {
      if (u.ko) continue;
      const spd = u.spd * (1 + (u.buffs.spd?.amt || 0));
      list.push({ u, s: spd * (0.85 + Math.random() * 0.3) });
      if (u.boss && u.phase === 2) list.push({ u, s: spd * 0.6 * (0.85 + Math.random() * 0.3) });
    }
    list.sort((a, b) => b.s - a.s);
    return list.map((x) => x.u);
  }

  async endRound() {
    for (const u of this.party) {
      if (!u.ko && !this.boostedThisRound.has(u)) u.bp = Math.min(5, u.bp + 1);
      this.tickBuffs(u);
    }
    for (const e of this.enemies) {
      if (e.ko) continue;
      this.tickBuffs(e);
      if (e.broken) {
        e.broken--;
        if (!e.broken) { e.shield = e.maxShield; this.pop(e, '恢复', 'small'); }
      }
    }
    this.renderParty();
    if (this.round === 1) await this.tip('bp');
  }
  tickBuffs(u) { for (const k of Object.keys(u.buffs)) { if (--u.buffs[k].turns <= 0) delete u.buffs[k]; } }

  checkEnd() {
    if (this.enemies.every((e) => e.ko)) this.result = 'win';
    else if (this.party.every((u) => u.ko)) this.result = 'lose';
  }

  // ---------- 玩家回合 ----------
  async playerTurn(u) {
    this.boost = 0;
    this.renderParty();
    const fx = this.fxCtx();
    fx.move(u, u.home.clone().add(new THREE.Vector3(-0.35, 0, 0)), 0.15);
    try {
      while (true) {
        const sealOK = u.id === 'moheng' && this.game.state.flags.sealUnlocked && !this.opts.noSeal;
        const opts = [
          { k: 'attack', label: `攻击<span class="tag">${ICON[u.weapon]}</span>` },
          { k: 'skill', label: '招式' },
          { k: 'item', label: '道具' },
          { k: 'defend', label: '防御' },
        ];
        if (sealOK) opts.push({ k: 'seal', label: '炼妖·摄魂', disabled: !this.enemies.some((e) => !e.ko && e.broken && !e.boss && !e.miniboss) });
        if (!this.opts.noFlee && !this.enemies.some((e) => e.boss || e.miniboss)) opts.push({ k: 'flee', label: '撤退' });
        const pick = await this.menu(u.name, opts, { boostable: true, desc: (o) => ({
          attack: `以${u.weapon === 'sword' ? '剑' : '符'}攻击单体。蓄气可增加攻击次数。`,
          skill: '施展招式，消耗灵力。蓄气可强化威力或增加段数。',
          item: '使用随身道具。', defend: '本回合受到的伤害减半，下回合优先行动。',
          seal: '以青铜残片吸纳「破绽」状态妖物的魂魄。气血越低越容易成功。', flee: '从战斗中撤退。' })[o.k] });
        if (!pick) continue;
        if (pick.k === 'attack') { const t = await this.pickTarget('enemy'); if (t) return { type: 'skill', skill: 'attack', targets: t }; }
        else if (pick.k === 'skill') {
          const known = HEROES[u.id].skills.filter((s) => s.lv <= this.game.state.heroes[u.id].lv).map((s) => s.id);
          const sk = await this.menu('招式', known.map((id) => ({ k: id, label: `${SKILLS[id].name}<span class="r">${SKILLS[id].sp}</span>`, disabled: u.sp < SKILLS[id].sp })), { boostable: true, cancel: true, desc: (o) => SKILLS[o.k].desc });
          if (!sk) continue;
          const t = await this.pickTarget(SKILLS[sk.k].target);
          if (t) return { type: 'skill', skill: sk.k, targets: t };
        } else if (pick.k === 'item') {
          const its = Object.entries(this.game.state.items).filter(([id, n]) => n > 0 && ITEMS[id]?.battle);
          if (!its.length) { this.msg('没有可用的道具', 900); continue; }
          const it = await this.menu('道具', its.map(([id, n]) => ({ k: id, label: `${ITEMS[id].name}<span class="r">×${n}</span>` })), { cancel: true, desc: (o) => ITEMS[o.k].desc });
          if (!it) continue;
          const t = await this.pickTarget(ITEMS[it.k].target);
          if (t) return { type: 'item', item: it.k, targets: t };
        } else if (pick.k === 'defend') return { type: 'defend' };
        else if (pick.k === 'seal') { const t = await this.pickTarget('broken'); if (t) return { type: 'seal', targets: t }; }
        else if (pick.k === 'flee') return { type: 'flee' };
      }
    } finally {
      fx.move(u, u.home.clone(), 0.12);
      this.renderParty();
    }
  }

  menu(title, options, { boostable = false, cancel = false, desc = null } = {}) {
    return new Promise((resolve) => {
      const box = el('div', 'cmd');
      box.innerHTML = `<div class="head"><span>${title}</span>${boostable ? '<span style="font-size:13px;color:#b9ab8e">Q/E 或 ←→ 蓄气</span>' : ''}</div>`;
      const items = options.map((o) => { const e = el('div', 'opt' + (o.disabled ? ' disabled' : ''), o.label); box.appendChild(e); return { el: e, disabled: o.disabled, o }; });
      const dsc = el('div', 'desc');
      this.ui.appendChild(box); this.ui.appendChild(dsc);
      let ctl = null;
      if (boostable) {
        ctl = el('div', 'boostCtl', '<div data-d="-1">－气</div><div data-d="1">＋气</div>');
        ctl.querySelectorAll('div').forEach((b) => b.addEventListener('click', () => this.changeBoost(+b.dataset.d)));
        this.ui.appendChild(ctl);
        requestAnimationFrame(() => ctl.style.setProperty('--cmdh', box.offsetHeight + 8 + 'px'));
      }
      const nav = new ListNav(box, items, { cancel, onMove: (it) => { dsc.textContent = desc ? desc(it.o) : ''; dsc.classList.toggle('hidden', !desc); } });
      this.handler = (input) => {
        if (boostable) { if (input.consume('right') || input.consume('boostUp')) this.changeBoost(1); if (input.consume('left') || input.consume('boostDown')) this.changeBoost(-1); }
        const r = nav.update(input, this.game.audio);
        if (!r) return;
        box.remove(); dsc.remove(); ctl?.remove(); this.handler = null;
        resolve(r.cancel ? null : items[r.pick].o);
      };
    });
  }
  changeBoost(d) {
    const u = this.active; if (!u) return;
    const nb = Math.max(0, Math.min(3, this.boost + d, u.bp));
    if (nb !== this.boost) { this.boost = nb; this.game.audio.sfxPlay(d > 0 ? 'boost' : 'cancel'); this.renderParty(); }
  }

  pickTarget(kind) {
    return new Promise((resolve) => {
      let cands;
      if (kind === 'enemy' || kind === 'allEnemies') cands = this.enemies.filter((e) => !e.ko);
      else if (kind === 'broken') cands = this.enemies.filter((e) => !e.ko && e.broken && !e.boss && !e.miniboss);
      else if (kind === 'ally' || kind === 'allies') cands = this.party.filter((u) => !u.ko);
      else if (kind === 'ko') cands = this.party.filter((u) => u.ko);
      else cands = [];
      if (!cands.length) { this.msg('没有可选的目标', 900); resolve(null); return; }
      const all = kind === 'allEnemies' || kind === 'allies';
      cands.sort((a, b) => a.home.z - b.home.z);
      let idx = 0;
      this.cursorTargets = all ? cands : [cands[0]];
      const set = (i) => { idx = (i + cands.length) % cands.length; this.cursorTargets = all ? cands : [cands[idx]]; this.msg(all ? (kind === 'allies' ? '我方全体' : '敌方全体') : cands[idx].name, 0); };
      set(0);
      // 鼠标点击敌人
      const onClick = (ev) => {
        const pt = { x: ev.clientX, y: ev.clientY };
        let best = -1, bd = 1e9;
        cands.forEach((c, i) => { const s = this.screen(this.center(c)); const d = Math.hypot(s.x - pt.x, s.y - pt.y); if (d < bd) { bd = d; best = i; } });
        if (best >= 0 && bd < 160) { if (best === idx || all) this._pickNow = true; else set(best); }
      };
      this.game.renderer.renderer.domElement.addEventListener('click', onClick);
      const finish = (v) => { this.handler = null; this.cursorTargets = null; $('.msg', this.ui).classList.remove('on'); this.game.renderer.renderer.domElement.removeEventListener('click', onClick); resolve(v); };
      this.handler = (input) => {
        if (input.consume('boostUp')) this.changeBoost(1);
        if (input.consume('boostDown')) this.changeBoost(-1);
        if (!all) {
          if (input.consume('up') || input.consume('left')) { set(idx - 1); this.game.audio.sfxPlay('cursor'); }
          if (input.consume('down') || input.consume('right')) { set(idx + 1); this.game.audio.sfxPlay('cursor'); }
        }
        if (input.consume('confirm') || this._pickNow) { this._pickNow = false; this.game.audio.sfxPlay('confirm'); finish(all ? cands : [cands[idx]]); }
        else if (input.consume('cancel')) { this.game.audio.sfxPlay('cancel'); finish(null); }
      };
    });
  }
  updateCursors() {
    const box = $('.cursors', this.ui); if (!box) return;
    const ts = this.cursorTargets || [];
    while (box.children.length < ts.length) box.appendChild(el('div', 'cursor', '▼'));
    [...box.children].forEach((c, i) => {
      const t = ts[i];
      if (!t) { c.style.display = 'none'; return; }
      c.style.display = '';
      const p = this.screen(new THREE.Vector3(t.group.position.x, t.group.position.y + t.h + 0.3, t.group.position.z));
      c.style.left = p.x + 'px'; c.style.top = p.y + 'px';
    });
  }

  // ---------- 结算 ----------
  calc(user, target, sk, powerMul) {
    const isMag = sk.kind === 'mag';
    const a = isMag ? user.mag : user.atk;
    const atkMul = 1 + (user.buffs.atk?.amt || 0);
    const dStat = (isMag ? target.res : (target.side === 'enemy' ? target.defense : target.def)) * (1 + (target.buffs[isMag ? 'res' : 'def']?.amt || 0));
    let dmg = (a * atkMul * sk.power * powerMul * 2.2 - dStat * 1.1);
    dmg = Math.max(dmg, a * sk.power * powerMul * 0.35);
    dmg *= 0.9 + Math.random() * 0.2;
    return dmg;
  }

  hitTypes(user, sk) {
    const t = [];
    if (sk.elem) t.push(sk.elem);
    if (sk.weap) t.push(sk.weap);
    if (!sk.elem && !sk.weap && sk.kind === 'phys') t.push(user.weapon);
    return t;
  }

  async damageEnemy(e, dmg, types, { user = null, silentWeak = false } = {}) {
    if (e.ko) return;
    const weakHits = types.filter((w) => e.weak.includes(w));
    let cls = '';
    if (weakHits.length) {
      dmg *= 1.3; cls = 'weak';
      for (const w of weakHits) if (!e.revealed.has(w)) { e.revealed.add(w); this.game.state.flags['known_' + e.key] = [...e.revealed]; }
      this.game.audio.sfxPlay('weak');
    }
    if (e.broken) { dmg *= 2; cls = 'big'; }
    dmg = Math.round(dmg);
    e.hp = Math.max(0, e.hp - dmg);
    e.flashT = 0.18;
    this.pop(e, dmg, cls);
    if (weakHits.length && !e.broken && e.shield > 0) {
      e.shield--;
      if (e.shield === 0) await this.breakEnemy(e);
    }
    if (weakHits.length && !silentWeak) this.tipLater = this.tipLater || 'weak';
    if (e.hp <= 0) await this.killEnemy(e);
  }

  async breakEnemy(e) {
    e.broken = 2;
    this.game.state.stats.breaks++;
    const fx = this.fxCtx();
    this.vfx.preset('break', this.center(e));
    this.game.audio.sfxPlay('break');
    fx.shake(0.4);
    this.game.ui.flash('#fff', 250, 0.5);
    this.stamp('破', '破 绽');
    if (e.charging) { e.charging = false; setTimeout(() => this.msg('蓄力被打断了！', 1300), 700); }
    this.tipLater = 'break';
  }

  async killEnemy(e) {
    e.ko = true; e.dying = true;
    this.defeated = this.defeated || [];
    this.defeated.push(e);
    this.vfx.preset('death', this.center(e));
    this.game.audio.sfxPlay('ko');
    await this.anim(0.5, (k) => { e.mat.opacity = 1 - k; e.mat.transparent = true; e.mesh.scale.y = 1 - k * 0.3; });
    e.group.visible = false; e.dying = false;
  }

  damageParty(u, dmg, { cls = 'party' } = {}) {
    if (u.ko) return 0;
    if (u.defending) dmg *= 0.5;
    dmg = Math.max(1, Math.round(dmg));
    u.hp = Math.max(0, u.hp - dmg);
    u.actor.flash(0.2);
    u.actor.pose = 'hurt';
    setTimeout(() => { if (!u.ko) u.actor.pose = 'idle'; }, 350);
    this.pop(u, dmg, cls);
    if (u.hp <= 0) { u.ko = true; u.bp = 0; u.buffs = {}; u.actor.pose = 'ko'; this.game.audio.sfxPlay('ko'); }
    this.renderParty();
    return dmg;
  }

  async doPlayerAction(u, act) {
    const g = this.game, fx = this.fxCtx();
    const boost = this.boost;
    if (boost) { u.bp -= boost; this.boostedThisRound.add(u); this.vfx.ring(this.feet(u).setY(0.05), '#ffb040', 0.5, 2); }
    this.renderParty();
    if (act.type === 'defend') { u.defending = true; this.msg(`${u.name} 防御`); g.audio.sfxPlay('buff'); this.vfx.preset('buff', this.center(u)); await sleep(500); return; }
    if (act.type === 'flee') {
      this.msg('撤退…');
      if (Math.random() < 0.75) { g.audio.sfxPlay('whoosh'); await Promise.all(this.party.map((p) => fx.move(p, p.home.clone().add(new THREE.Vector3(6, 0, 0)), 0.5))); this.result = 'flee'; }
      else { await sleep(500); this.msg('没能逃掉！'); await sleep(700); }
      return;
    }
    if (act.type === 'seal') {
      const t = act.targets[0];
      this.msg('炼妖·摄魂', 1600);
      const chance = t.hp / t.maxhp <= 0.5 ? 1 : 0.5;
      const ok = Math.random() < chance;
      await SKILL_FX.seal(fx, u, [t], boost, () => {}, ok);
      if (ok) {
        t.ko = true; t.sealed = true; t.group.visible = false;
        (this.defeated = this.defeated || []).push(t);
        const soul = t.def.soul;
        if (soul) { g.state.souls[soul] = (g.state.souls[soul] || 0) + 1; this.sealedSouls = (this.sealedSouls || []).concat(soul); }
        g.state.stats.sealed++;
        this.msg(`封印成功！获得「${SOULS[soul] || '妖魄'}」`, 1600);
        await sleep(900);
      } else { this.msg('妖气挣扎……封印失败', 1400); await sleep(700); }
      this.checkEnd();
      return;
    }
    if (act.type === 'item') {
      const it = ITEMS[act.item];
      addItem(g.state, act.item, -1);
      this.msg(`${u.name} 使用「${it.name}」`);
      await SKILL_FX.item(fx, u, act.targets, 0, (t) => {
        if (it.use === 'heal') { const amt = it.amount; t.hp = Math.min(t.maxhp, t.hp + amt); this.pop(t, amt, 'heal'); if (it.sp) t.sp = Math.min(t.maxsp, t.sp + it.sp); }
        if (it.use === 'sp') { t.sp = Math.min(t.maxsp, t.sp + it.amount); this.pop(t, it.amount, 'heal'); }
        if (it.use === 'revive') { t.ko = false; t.hp = Math.round(t.maxhp / 2); t.actor.pose = 'idle'; this.pop(t, t.hp, 'heal'); }
        if (it.use === 'bomb') this.damageEnemy(t, it.amount * (0.9 + Math.random() * 0.2), [it.elem]);
      }, it.use === 'bomb' ? 'bomb' : it.use);
      this.renderParty();
      await this.flushTips();
      return;
    }
    // 招式
    const sk = SKILLS[act.skill];
    if (sk.sp) u.sp -= sk.sp;
    this.renderParty();
    if (act.skill !== 'attack') this.msg(`${u.name}「${sk.name}」${boost ? ' · 蓄气' + boost : ''}`, 1500);
    if (boost >= 2 && act.skill !== 'zhuque' && act.skill !== 'attack') await this.cutin(sk.name, `${'一二三'[boost - 1]}段蓄气`);
    let targets = act.targets;
    if (sk.target === 'allEnemies') targets = this.enemies.filter((e) => !e.ko);
    const powerMul = sk.boost === 'power' ? BOOST_MUL[boost] : 1;
    const types = this.hitTypes(u, sk);
    const pending = [];
    await (SKILL_FX[sk.fx] || SKILL_FX.attack)(fx, u, targets, boost, (t) => {
      if (sk.kind === 'phys' || sk.kind === 'mag') {
        if (t.ko) return;
        pending.push(this.damageEnemy(t, this.calc(u, t, sk, powerMul), types, { user: u }));
      } else if (sk.kind === 'heal') {
        const amt = Math.round(u.mag * sk.power * powerMul * 1.5 + 10);
        t.hp = Math.min(t.maxhp, t.hp + amt); this.pop(t, amt, 'heal'); this.renderParty();
      } else if (sk.kind === 'buff') {
        t.buffs.def = { amt: 0.4 + boost * 0.1, turns: 3 + boost }; t.buffs.res = { amt: 0.3 + boost * 0.1, turns: 3 + boost };
        this.pop(t, '防御提升', 'small'); this.renderParty();
      } else if (sk.kind === 'debuff') {
        t.buffs.def = { amt: -0.3 - boost * 0.08, turns: 2 + boost }; t.buffs.spd = { amt: -0.3, turns: 2 + boost };
        this.pop(t, '防御·速度下降', 'small');
      }
    });
    await Promise.all(pending);
    await this.flushTips();
  }

  // ---------- 敌方回合 ----------
  async enemyTurn(e) {
    const g = this.game, fx = this.fxCtx();
    e.turnCount++;
    const alive = this.party.filter((u) => !u.ko);
    if (!alive.length) return;
    // Boss：蓄力 → 饕餮吞天
    if (e.boss) {
      if (e.charging) {
        e.charging = false;
        this.msg('饕餮之影「饕餮吞天」', 1800);
        await ENEMY_FX.swallow(fx, e, alive, (t) => this.damageParty(t, this.calc(e, t, { kind: 'mag', power: 2.3 }, 1)));
        return;
      }
      if (e.turnCount % 4 === 3) {
        e.charging = true;
        this.msg('饕餮之影张开巨口，开始吞纳天地灵气……', 2200);
        g.audio.sfxPlay('roar');
        await this.anim(1.2, () => this.vfx.preset('charge', this.center(e)));
        if (!this.tipsShown.has('charge')) await this.tip('charge');
        return;
      }
    }
    const acts = e.def.acts;
    let total = acts.reduce((s, a) => s + a.w, 0), r = Math.random() * total, act = acts[0];
    for (const a of acts) { r -= a.w; if (r <= 0) { act = a; break; } }
    const pickT = () => { const weights = alive.map((u) => 1 + (u.id === 'wuyue' ? 0.2 : 0) - (u.defending ? 0.3 : 0)); let s = weights.reduce((a, b) => a + b, 0) * Math.random(); for (let i = 0; i < alive.length; i++) { s -= weights[i]; if (s <= 0) return alive[i]; } return alive[0]; };
    this.msg(`${e.name}「${act.name}」`, 1300);
    await sleep(250);
    const targets = act.all ? alive : [pickT()];
    if (act.kind === 'phys') {
      const hit = (t) => { const d = this.damageParty(t, this.calc(e, t, act, 1)); if (act.drain) { e.hp = Math.min(e.maxhp, e.hp + Math.round(d * 0.5)); this.pop(e, Math.round(d * 0.5), 'heal'); } };
      if (act.all) await ENEMY_FX.spin(fx, e, targets, hit);
      else await ENEMY_FX.melee(fx, e, targets, hit, e.boss ? '#c070ff' : '#ffb070');
    } else if (act.kind === 'mag') {
      const hit = (t) => { this.damageParty(t, this.calc(e, t, act, 1)); if (act.debuff) { t.buffs.def = { amt: -0.25, turns: 2 }; this.pop(t, '防御下降', 'small'); } };
      if (e.boss) await ENEMY_FX.roar(fx, e, targets, hit);
      else if (act.fx === 'water' || e.key === 'nigui') await ENEMY_FX.flame(fx, e, targets, hit, '#8ad8ff', '#1a5a8a');
      else if (e.key === 'ghostfire') await ENEMY_FX.flame(fx, e, targets, hit, '#7affb0', '#1a8a4a');
      else await ENEMY_FX.flame(fx, e, targets, hit);
    } else if (act.kind === 'debuff') {
      await ENEMY_FX.mist(fx, e, targets, (t) => { t.buffs[act.stat] = { amt: -0.3, turns: 2 }; this.pop(t, `${{ spd: '速度', def: '防御' }[act.stat]}下降`, 'small'); });
    } else if (act.kind === 'buffself') {
      await ENEMY_FX.buffself(fx, e, [], () => { e.buffs.atk = { amt: 0.35, turns: 3 }; this.pop(e, '攻击提升', 'small'); });
    }
    this.renderParty();
    // Boss 二阶段
    if (e.boss && e.phase === 1 && e.hp <= e.maxhp * 0.5 && !e.ko) await this.bossPhase2(e);
  }

  async bossPhase2(e) {
    const g = this.game, fx = this.fxCtx();
    e.phase = 2;
    fx.dim(true);
    g.audio.sfxPlay('roar');
    fx.shake(1.0);
    this.vfx.preset('roar', this.center(e));
    if (this.opts.onPhase2) await this.opts.onPhase2(this);
    this.msg('饕餮之影发出震天怒吼——鼎纹重铸，弱点改变了！', 2400);
    const p2 = e.def.phase2;
    e.maxShield = p2.shield; e.shield = p2.shield; e.broken = 0; e.charging = false;
    e.weak = [...p2.weak]; e.revealed = new Set();
    await sleep(1200);
    // 召唤鼎魂火
    const spots = [[-1.6, 1.8], [-1.8, -2.2]];
    for (const s of spots) {
      if (this.enemies.filter((x) => !x.ko).length >= 3) break;
      const m = this.makeEnemy('ghostfire', s);
      this.enemies.push(m);
      this.vfx.preset('seal', this.center(m));
      g.audio.sfxPlay('fire');
      await sleep(300);
    }
    fx.dim(false);
    this.msg('鼎魂火被召唤了出来！', 1500);
    await sleep(800);
  }

  // ---------- 提示 ----------
  async flushTips() {
    if (this.tipLater) { const t = this.tipLater; this.tipLater = null; await this.tip(t); if (t === 'break' && this.game.state.flags.sealUnlocked) await this.tip('seal'); }
  }
  async tip(key) {
    if (!this.opts.tutorial || this.tipsShown.has(key) || this.game.state.flags['tip_' + key]) return;
    const TIPS = {
      start: ['破绽与弱点', '每只妖物都有<b>护盾值</b>（头顶数字）和若干<b>弱点</b>（“？”）。<br>用对应的<b>五行</b>（金木水火土）或<b>兵器</b>（剑弩符）击中弱点，就能削减护盾。<br>五行相克：<b>金克木、木克土、土克水、水克火、火克金</b>。'],
      weak: ['击中弱点！', '弱点被揭示，护盾减少 1。<br>同一回合内多次命中弱点，能更快打出「破绽」。'],
      break: ['破绽！', '护盾归零时，妖物进入<b>破绽</b>状态：<br>本回合与下回合<b>无法行动</b>，受到的伤害<b>翻倍</b>。趁此机会全力进攻！'],
      bp: ['蓄气', '每回合结束，同伴会积攒 1 点<b>气</b>（菱形，最多 5 点）。<br>选择行动时按 <span class="k">E</span>/<span class="k">→</span> 蓄气（最多 3 点）：普攻与连击招式<b>增加段数</b>，术法<b>威力倍增</b>。<br>蓄气的那一回合不会积攒新的气。'],
      seal: ['炼妖·摄魂', '青铜残片能吸纳<b>破绽</b>状态妖物的魂魄！<br>对方气血低于一半时必定成功。封印可得「妖魄」，在菜单「炼妖」中炼化成道具与符箓。'],
      charge: ['小心蓄力！', '饕餮之影正在蓄力，下回合将施展毁灭性的「饕餮吞天」。<br>在它出手前<b>打出破绽</b>，就能打断蓄力！也可以选择<b>防御</b>减半伤害。'],
    };
    const T = TIPS[key]; if (!T) return;
    this.tipsShown.add(key); this.game.state.flags['tip_' + key] = true;
    const box = el('div', 'tip', `<h4>${T[0]}</h4>${T[1]}<div class="more">— 确认继续 —</div>`);
    this.ui.appendChild(box);
    this.game.audio.sfxPlay('chime');
    await new Promise((res) => { box.addEventListener('click', () => this.game.input.press('confirm')); this.handler = (input) => { if (input.consume('confirm') || input.consume('cancel')) { this.handler = null; box.remove(); res(); } }; });
  }

  handleInput(input) { this.handler?.(input); }

  // ---------- 胜负 ----------
  syncBack() {
    const s = this.game.state;
    for (const u of this.party) { s.heroes[u.id].hp = u.ko ? 1 : u.hp; s.heroes[u.id].sp = u.sp; }
  }

  async victory() {
    const g = this.game, s = g.state;
    s.stats.battles++;
    g.audio.play('victory');
    for (const u of this.party) if (!u.ko) u.actor.pose = 'cast';
    const def = this.defeated || [];
    const exp = def.reduce((a, e) => a + (e.def.exp || 0), 0) + (this.opts.bonusExp || 0);
    const money = def.reduce((a, e) => a + (e.def.money || 0), 0);
    s.money += money;
    this.syncBack();
    const lines = [`<div class="line"><span>修为</span><span>+${exp}</span></div>`, `<div class="line"><span>铜钱</span><span>+${money}</span></div>`];
    if (this.sealedSouls?.length) lines.push(`<div class="line"><span>妖魄</span><span>${this.sealedSouls.map((x) => SOULS[x]).join('、')}</span></div>`);
    // 掉落
    const drops = [];
    for (const e of def) if (!e.sealed && Math.random() < 0.22 && !e.boss) drops.push(Math.random() < 0.7 ? 'herb' : 'dew');
    for (const d of this.opts.drops || []) drops.push(d);
    for (const d of drops) addItem(s, d, 1);
    if (drops.length) lines.push(`<div class="line"><span>获得</span><span>${drops.map((d) => ITEMS[d].name).join('、')}</span></div>`);
    for (const u of this.party) {
      const ups = gainExp(s, u.id, exp);
      for (const up of ups) {
        lines.push(`<div class="line lv"><span>${u.name} 境界提升</span><span>Lv.${up.lv}</span></div>`);
        for (const l of up.learned) lines.push(`<div class="line lv"><span>　领悟招式</span><span>「${SKILLS[l].name}」</span></div>`);
      }
      if (ups.length) { g.audio.sfxPlay('levelup'); this.vfx.preset('buff', this.center(u)); }
    }
    await sleep(800);
    const box = el('div', 'result', `<h2>胜</h2>${lines.join('')}<div class="opt sel" style="margin-top:14px">— 继续 —</div>`);
    this.ui.appendChild(box);
    await new Promise((res) => { box.addEventListener('click', () => g.input.press('confirm')); this.handler = (input) => { if (input.consume('confirm')) { this.handler = null; res(); } }; });
    g.audio.sfxPlay('confirm');
    box.remove();
    await g.ui.ink(true, 0.6);
  }

  async defeat() {
    const g = this.game;
    g.audio.play('tension');
    await sleep(900);
    const box = el('div', 'result', `<h2>败</h2><div style="text-align:center;color:#b9ab8e;margin-bottom:14px">胜败乃兵家常事，少侠请重新来过。</div>`);
    const a = el('div', 'opt', '再战一次'), b = el('div', 'opt', '回到标题');
    box.append(a, b);
    this.ui.appendChild(box);
    const nav = new ListNav(box, [{ el: a }, { el: b }], { cancel: false });
    const r = await new Promise((res) => { this.handler = (input) => { const x = nav.update(input, g.audio); if (x) { this.handler = null; res(x.pick); } }; });
    await g.ui.ink(true, 0.6);
    if (r === 0) return 'retry';
    this.cleanup();
    g.toTitle();
    return 'title';
  }
}

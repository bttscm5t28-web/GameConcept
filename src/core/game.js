// 游戏主控：模式切换、剧情脚本、地图切换、存档
import * as THREE from 'three';
import { Renderer } from '../render/renderer.js';
import { Input } from './input.js';
import { Audio } from '../audio/audio.js';
import { UI, el, $, ListNav } from '../ui/ui.js';
import { World } from '../world/world.js';
import { Battle } from '../battle/battle.js';
import { Menu } from '../ui/menu.js';
import { newState, save, load, hasSave, healAll, addItem, addEquip, stats } from './state.js';
import { ITEMS, EQUIP, HEROES } from '../data/db.js';
import { MAPS } from '../world/maps/index.js';
import { LOOKS } from '../art/characters.js';

class Abort extends Error {}

export const SPEAKERS = {
  moheng: ['墨衡', 'moheng'], wuyue: ['巫月', 'wuyue'], chenbo: ['陈伯', 'chenbo'], laozhou: ['老周', 'laozhou'],
  liusao: ['刘嫂', 'liusao'], xiaodou: ['小豆', 'xiaodou'], azhu: ['阿柱', 'azhu'], huolang: ['货郎', 'huolang'],
  shishu: ['墨拙', 'shishu'], heipao: ['黑袍人', 'heipao'], villagerA: ['村妇', 'villagerA'], villagerB: ['老者', 'villagerB'],
};

export class Game {
  constructor() {
    this.renderer = new Renderer(document.getElementById('game'));
    this.input = new Input();
    this.audio = new Audio();
    this.ui = new UI(this);
    this.world = new World(this);
    this.battleSys = new Battle(this);
    this.menu = new Menu(this);
    this.state = newState();
    this.mode = 'boot';
    this.clock = new THREE.Clock();
    this.t = 0;
    const qs = new URLSearchParams(location.search);
    this.debug = qs.has('debug');
    this.dtCap = +(qs.get('dtcap') || 0.05);
    this.ctx = this.makeCtx();
    window.game = this;
    const kick = () => this.audio.init();
    window.addEventListener('keydown', kick); window.addEventListener('pointerdown', kick);
    this.setupTouch();
  }

  start() {
    this.toTitle();
    const loop = () => { requestAnimationFrame(loop); this.frame(); };
    loop();
  }

  frame() {
    const dt = Math.min(this.dtCap, this.clock.getDelta());
    this.t += dt;
    if (this.mode !== 'title' && this.mode !== 'boot') this.state.stats.playTime += dt;
    const modal = this.ui.update(this.input, dt);
    const m = this.mode;
    if (m === 'explore' || m === 'script' || m === 'title' || m === 'menu') {
      if (this.world.scene) this.world.update(dt, this.t, modal || m !== 'explore' ? 'script' : 'explore');
      if (m === 'title') this.titleUpdate?.(dt);
      if (m === 'menu' && !modal) this.menu.update(this.input, dt);
    } else if (m === 'battle') {
      if (!modal) this.battleSys.handleInput(this.input);
      this.battleSys.update(dt, this.t);
    }
    if (this.world.scene || m === 'battle') this.renderer.render(this.t);
    this.input.endFrame();
  }

  // ---------- 地图 ----------
  enterMap(id, spawn, { banner = true } = {}) {
    const def = MAPS[id](this);
    this.state.map = id;
    const sp = typeof spawn === 'string' ? def.spawns[spawn] : spawn || def.spawns.default;
    this.state.pos = { ...sp };
    const scene = this.world.load(def, sp);
    this.renderer.setView(scene, this.world.camera);
    this.renderer.setLook(def.look || {});
    this.audio.play(def.music);
    if (banner && def.name) setTimeout(() => this.ui.banner(def.name, def.sub), 500);
    this.ui.showHUD(true);
    this.ui.setObjective(this.state.objective);
    return def;
  }
  async changeMap(id, spawn) {
    if (this.mode === 'transition') return;
    const prev = this.mode;
    this.mode = 'transition';
    this.audio.sfxPlay('whoosh');
    this.ui.hideBubbles();
    await this.ui.ink(true, 0.7);
    const def = this.enterMap(id, spawn);
    this.autosave();
    await new Promise((r) => setTimeout(r, 200));
    await this.ui.ink(false, 0.8);
    this.mode = prev === 'script' ? 'script' : 'explore';
    if (def.onEnter) this.runScript(def.onEnter);
  }

  // ---------- 剧情 ----------
  async runScript(fn, arg) {
    const prev = this.mode === 'script' ? 'script' : 'explore';
    this.mode = 'script';
    this.ui.setPromptTarget(null);
    this.ui.setDanger(null);
    try { await fn(this.ctx, arg); }
    catch (e) { if (!(e instanceof Abort)) console.error(e); else return; }
    if (this.mode === 'script') this.mode = prev;
    if (this.world.follower?.scripted) { this.world.follower.scripted = false; this.world.resetTrail(); }
    this.world.release();
  }
  interact(t) {
    this.input.consume('confirm');
    if (t.kind === 'npc') {
      const n = t.npc;
      this.runScript(async (ctx) => {
        const p = this.world.player;
        const oldDir = n.dir;
        if (n.def.turn !== false) n.faceToward(p.x, p.z);
        p.faceToward(n.x, n.z);
        await n.def.talk(ctx, n);
        if (n.def.turn !== false && n.def.keepFace !== true) n.dir = oldDir;
      });
    } else {
      this.runScript(async (ctx) => { await t.obj.onInteract(ctx, t.obj); });
    }
  }
  async randomBattle(enemies, bg) {
    this.runScript(async (ctx) => { await ctx.battle(enemies, { bg, random: true }); });
  }
  async battle(enemies, opts = {}) {
    const prev = this.mode;
    this.mode = 'transition';
    this.ui.hideBubbles(); this.ui.setDanger(null);
    this.audio.sfxPlay('encounter');
    this.ui.flash('#fff', 250, 0.7);
    await this.ui.ink(true, 0.6);
    this.mode = 'battle';
    this.ui.showHUD(false);
    const res = await this.battleSys.run({ enemies, tutorial: true, ...opts, bg: opts.bg || this.world.def?.battleBg || 'forest' });
    if (res === 'title' || this.mode === 'title') throw new Abort();
    // 回到地图
    this.renderer.setView(this.world.scene, this.world.camera);
    this.renderer.setLook(this.world.def.look || {});
    this.ui.showHUD(true);
    this.audio.play(opts.afterMusic || this.world.def.music);
    this.mode = prev === 'transition' ? 'script' : prev;
    this.mode = 'script';
    await this.ui.ink(false, 0.6);
    return res;
  }

  openMenu() {
    this.mode = 'menu';
    this.ui.setPromptTarget(null);
    this.audio.sfxPlay('confirm');
    this.menu.open(() => { this.mode = 'explore'; });
  }

  autosave() { if (!this.state.flags.noSave) { this.state.pos = { x: this.world.player.x, z: this.world.player.z, dir: this.world.player.dir }; save(this.state); } }

  // ---------- 脚本接口 ----------
  makeCtx() {
    const g = this;
    const actor = (id) => id === 'player' || id === 'moheng' ? g.world.player : id === 'follower' || (id === 'wuyue' && g.world.follower && !g.world.npc('wuyue')) ? g.world.follower : g.world.npc(id);
    const ctx = {
      game: g,
      get state() { return g.state; },
      get world() { return g.world; },
      flags: new Proxy({}, { get: (_, k) => g.state.flags[k], set: (_, k, v) => { g.state.flags[k] = v; return true; } }),
      say(who, text, opts = {}) {
        const sp = SPEAKERS[who];
        if (sp) return g.ui.say(sp[0], text, { look: sp[1], ...opts });
        return g.ui.say(who, text, opts);
      },
      narr(text) { return g.ui.say(null, text, { narr: true }); },
      ask(who, text, options) { const sp = SPEAKERS[who]; return g.ui.ask(sp ? sp[0] : who, text, options, { look: sp?.[1] }); },
      choose(options) { return g.ui.choose(options); },
      wait(ms) { return new Promise((r) => setTimeout(r, ms)); },
      actor,
      walk(id, x, z, speed) { const a = actor(id); if (!a) return Promise.resolve(); if (a === g.world.follower) a.scripted = true; return a.walkTo(x, z, speed); },
      async walkPath(id, pts, speed) { for (const [x, z] of pts) await ctx.walk(id, x, z, speed); },
      face(id, dir) { const a = actor(id); if (!a) return; if (typeof dir === 'string' && ['up', 'down', 'left', 'right'].includes(dir)) a.face(dir); else { const b = actor(dir); if (b) a.faceToward(b.x, b.z); } },
      async emote(id, e, ms = 1200) { const a = actor(id); if (!a) return; a.emote = e; g.audio.sfxPlay('cursor'); await ctx.wait(ms); a.emote = null; },
      emoteOn(id, e) { const a = actor(id); if (a) a.emote = e; },
      spawn(def) { return g.world.addNPC(def); },
      remove(id) { g.world.removeNPC(id); },
      pan(x, z, dur = 1.2) { return g.world.panTo(x, z, dur); },
      release() { g.world.release(); },
      shake(t = 0.5) { g.world.shake = t; },
      flash(c = '#fff', ms = 400, peak = 0.85) { g.ui.flash(c, ms, peak); },
      fadeOut(ms = 700) { return g.ui.fadeBlack(true, ms); },
      fadeIn(ms = 700) { return g.ui.fadeBlack(false, ms); },
      async battle(enemies, opts) { return g.battle(enemies, opts); },
      give(id, n = 1, silent = false) {
        if (EQUIP[id]) { addEquip(g.state, id, n); if (!silent) { g.ui.toast(`获得装备 <b>${EQUIP[id].name}</b>${n > 1 ? ' ×' + n : ''}`); g.audio.sfxPlay('item'); } return; }
        addItem(g.state, id, n);
        if (!silent) { g.ui.toast(`获得 <b>${ITEMS[id].name}</b>${n > 1 ? ' ×' + n : ''}`); g.audio.sfxPlay('item'); }
      },
      take(id, n = 1) { addItem(g.state, id, -n); },
      has(id) { return (g.state.items[id] || 0) > 0; },
      money(n) { g.state.money += n; g.ui.updateMoney(); if (n > 0) { g.ui.toast(`获得 <b>${n}</b> 铜钱`); g.audio.sfxPlay('item'); } },
      objective(t) { g.state.objective = t; g.ui.setObjective(t); g.audio.sfxPlay('chime'); },
      banner(a, b) { g.ui.banner(a, b); },
      music(n) { g.audio.play(n); },
      sfx(n) { g.audio.sfxPlay(n); },
      join(id) {
        if (!g.state.party.includes(id)) g.state.party.push(id);
        const npc = g.world.npc(id);
        const f = new (g.world.player.constructor)(HEROES[id].look, { id });
        const x = npc ? npc.x : g.world.player.x, z = npc ? npc.z : g.world.player.z;
        if (npc) g.world.removeNPC(id);
        f.setPos(x, z); g.world.scene.add(f.group); g.world.follower = f; g.world.resetTrail();
        g.ui.toast(`<b>${HEROES[id].name}</b> 加入了队伍`); g.audio.sfxPlay('levelup');
      },
      healAll() { healAll(g.state); },
      save() { g.autosave(); g.ui.toast('进度已保存'); },
      async toast(t) { g.ui.toast(t); },
      async story(lines, opts) { g.ui.hideBubbles(); return g.ui.storyCols(lines, opts); },
      changeMap(id, sp) { return g.changeMap(id, sp); },
      async inkOut() { await g.ui.ink(true, 0.7); },
      async inkIn() { await g.ui.ink(false, 0.8); },
      stats(id) { return stats(g.state, id); },
      async shop(list) { return g.menu.shop(list); },
      chapterEnd() { return g.chapterEnd(); },
    };
    return ctx;
  }

  // ---------- 标题 ----------
  toTitle() {
    this.mode = 'title';
    this.ui.layer.innerHTML = '';
    this.ui.modal = null;
    this.ui.showHUD(false);
    this.ui.setObjective(null);
    this.ui.black(false);
    const st = this.state = newState();
    st.flags.titleScreen = true;
    this.enterMap('town', { x: 20, z: 14, dir: 'down' }, { banner: false });
    this.world.player.visible = false;
    this.ui.showHUD(false);
    this.ui.setObjective(null);
    this.renderer.setLook({ ...(this.world.def.look || {}), tilt: 4, band: 0.1 });
    this.audio.play('title');
    let t = 0;
    this.titleUpdate = (dt) => {
      t += dt;
      this.world.camFocus = new THREE.Vector3(14 + Math.sin(t * 0.05) * 6, 0.8, 15 + Math.cos(t * 0.04) * 2);
    };
    const box = el('div'); box.id = 'title';
    box.innerHTML = `<div class="logo">九鼎记<span class="seal">青铜残响</span></div><div class="chap">第一章 · 洛水青铜</div><div class="menu"></div><div class="foot">方向键/WASD 移动 · 空格/回车 确认 · Esc 菜单 · Shift 疾行</div>`;
    this.ui.layer.appendChild(box);
    const menu = $('.menu', box);
    const opts = [['new', '新的旅程']];
    if (hasSave()) opts.unshift(['cont', '继续旅程']);
    opts.push(['help', '操作说明']);
    const items = opts.map(([k, l]) => { const e = el('div', 'opt', l); menu.appendChild(e); return { el: e, k }; });
    const nav = new ListNav(menu, items, { cancel: false });
    this.ui.modal = {
      update: (input) => {
        const r = nav.update(input, this.audio);
        if (!r) return;
        this.audio.init();
        const k = items[r.pick].k;
        if (k === 'help') {
          this.ui.modal = null;
          this.ui.say(null, '移动：方向键 / WASD（按住 Shift 疾行）\n确认/调查：空格 / 回车 / Z\n菜单：Esc / M\n战斗中：←→ 或 Q/E 调整「蓄气」', { narr: true }).then(() => { this.ui.modal = { update: (i) => this.ui.modalTitle(i) }; });
          this.ui.modalTitle = (i) => { const rr = nav.update(i, this.audio); if (rr) { this.ui.modal = null; this.startFrom(items[rr.pick].k, box, nav, items); } };
          return;
        }
        this.ui.modal = null;
        this.startFrom(k, box);
      },
    };
  }
  async startFrom(k, box) {
    if (k === 'help') { this.toTitle(); return; }
    this.titleUpdate = null;
    this.audio.sfxPlay('confirm');
    await this.ui.ink(true, 1.0);
    box.remove();
    this.world.camFocus = null;
    if (k === 'cont') {
      const s = load();
      if (s) { this.state = s; this.mode = 'explore'; this.enterMap(s.map, s.pos); await this.ui.ink(false, 0.9); return; }
    }
    this.state = newState();
    this.mode = 'script';
    this.audio.play(null);
    await this.ctx.story([
      '上古之时，黄帝采首山之铜，铸鼎于荆山之下。',
      '鼎成九尊，分镇九州地脉——',
      '鼎在，则山河安宁，妖邪伏藏。',
      '后世兵燹不绝，九鼎沉没于烟尘之中，',
      '再无人记得它们的模样。',
      '三千年后。',
      '!——洛水，开始发光。',
    ], { hold: 2.4 });
    this.enterMap('town', 'opening', { banner: false });
    this.ui.black(true);
    this.mode = 'explore';
    const def = this.world.def;
    if (def.prologue) this.runScript(def.prologue);
  }

  async chapterEnd() {
    const s = this.state;
    s.flags.chapter1Done = true;
    save(s);
    await this.ui.ink(true, 1.2);
    this.audio.play('ending');
    const box = el('div'); box.id = 'chapterEnd';
    const tm = Math.floor(s.stats.playTime / 60);
    box.innerHTML = `<div class="big">第一章 · 完</div><div class="small">洛 水 青 铜</div>
      <div class="tbl">游戏时长　${tm} 分钟<br>战斗次数　${s.stats.battles}<br>打出破绽　${s.stats.breaks} 次<br>封印妖魄　${s.stats.sealed} 只<br>墨衡　Lv.${s.heroes.moheng.lv}　·　巫月　Lv.${s.heroes.wuyue.lv}</div>
      <div class="next">第二章「南疆蛊月」　敬请期待</div><div class="opt sel">回到标题</div>`;
    this.ui.layer.appendChild(box);
    this.ui.black(false);
    box.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1500 });
    await new Promise((res) => { this.ui.modal = { update: (i) => { if (i.consume('confirm')) { this.ui.modal = null; res(); } } }; box.addEventListener('click', () => this.input.press('confirm')); });
    box.remove();
    this.toTitle();
    throw new Abort();
  }

  registerSpeaker(key, name, look) { SPEAKERS[key] = [name, look]; }

  // ---------- 调试 ----------
  debugStart({ map = 'town', spawn = 'default', flags = {}, party = null, lv = null, items = null } = {}) {
    this.ui.layer.innerHTML = ''; this.ui.modal = null; this.titleUpdate = null; this.world.camFocus = null;
    this.state = newState();
    Object.assign(this.state.flags, flags);
    if (party) this.state.party = party;
    if (lv) for (const id in this.state.heroes) { this.state.heroes[id].lv = lv; }
    if (lv) healAll(this.state);
    if (items) Object.assign(this.state.items, items);
    this.mode = 'explore';
    this.enterMap(map, spawn);
    this.ui.black(false);
  }
  debugBattle(enemies, bg, opts = {}) { this.runScript((ctx) => ctx.battle(enemies, { bg, ...opts })); }

  // ---------- 触屏 ----------
  setupTouch() {
    if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return;
    const t = el('div'); t.id = 'touch';
    t.innerHTML = `<div class="pad"><div class="knob"></div></div><div class="btns"><div class="sm" data-a="menu">菜</div><div class="sm" data-a="cancel">退</div><div data-a="confirm">确</div></div>`;
    document.getElementById('ui').appendChild(t);
    const pad = $('.pad', t), knob = $('.knob', t);
    const setStick = (e) => {
      const r = pad.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
      const l = Math.min(1, Math.hypot(x, y)) || 1, k = Math.hypot(x, y) || 1;
      this.input.stick = { x: (x / k) * l, y: (y / k) * l };
      knob.style.transform = `translate(${(x / k) * l * 40}px, ${(y / k) * l * 40}px)`;
      // 菜单方向
      const dir = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up');
      if (l > 0.6 && this._tdir !== dir) { this._tdir = dir; if (this.mode !== 'explore') this.input.press(dir); }
      if (l < 0.4) this._tdir = null;
    };
    pad.addEventListener('pointerdown', (e) => { pad.setPointerCapture(e.pointerId); setStick(e); });
    pad.addEventListener('pointermove', (e) => { if (e.buttons) setStick(e); });
    pad.addEventListener('pointerup', () => { this.input.stick = null; knob.style.transform = ''; this._tdir = null; });
    t.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.input.press(b.dataset.a); }));
  }
}

// DOM 界面：对话、选项、提示、横幅、转场、菜单
import * as THREE from 'three';
import { portraitURL, LOOKS } from '../art/characters.js';

const $ = (sel, root = document) => root.querySelector(sel);
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
export { el, $ };

const portraitCache = {};
export function portrait(look) { if (!look || !LOOKS[look]) return null; return (portraitCache[look] ||= portraitURL(look)); }

// 通用键盘/鼠标列表选择
export class ListNav {
  constructor(container, items, { onMove, cols = 1, cancel = true, initial = 0, onRender } = {}) {
    this.container = container; this.items = items; this.idx = initial; this.cols = cols; this.cancel = cancel; this.onMove = onMove;
    this.onRender = onRender;
    items.forEach((it, i) => {
      it.el.addEventListener('mouseenter', () => { if (!it.disabled) this.select(i); });
      it.el.addEventListener('click', (e) => { e.stopPropagation(); if (!it.disabled) { this.select(i); this.pick = i; } });
    });
    this.select(Math.min(initial, items.length - 1));
  }
  select(i) {
    if (!this.items.length) return;
    this.idx = i;
    this.items.forEach((it, k) => it.el.classList.toggle('sel', k === i));
    const c = this.container, e = this.items[i]?.el;
    if (e && c && c.scrollHeight > c.clientHeight + 2) {
      const top = e.offsetTop - c.offsetTop;
      if (top < c.scrollTop) c.scrollTop = top - 4;
      else if (top + e.offsetHeight > c.scrollTop + c.clientHeight) c.scrollTop = top + e.offsetHeight - c.clientHeight + 4;
    }
    this.onMove?.(this.items[i], i);
  }
  // 返回 {pick:i} | {cancel:true} | null
  update(input, audio) {
    if (this.pick !== undefined) { const p = this.pick; this.pick = undefined; audio?.sfxPlay('confirm'); return { pick: p }; }
    const n = this.items.length;
    let d = 0;
    if (input.consume('down')) d = this.cols;
    if (input.consume('up')) d = -this.cols;
    if (this.cols > 1) { if (input.consume('right')) d = 1; if (input.consume('left')) d = -1; }
    if (d && n) { this.select((this.idx + d + n) % n); audio?.sfxPlay('cursor'); }
    if (input.consume('confirm')) {
      const it = this.items[this.idx];
      if (it && !it.disabled) { audio?.sfxPlay('confirm'); return { pick: this.idx }; }
      audio?.sfxPlay('cancel');
    }
    if (this.cancel && input.consume('cancel')) { audio?.sfxPlay('cancel'); return { cancel: true }; }
    return null;
  }
}

export class UI {
  constructor(game) {
    this.game = game;
    const root = (this.root = $('#ui'));
    root.innerHTML = `
      <div id="objective" class="hidden"><span class="seal">目标</span><span class="txt"></span></div>
      <div id="money" class="hidden"></div>
      <div id="banner"><div class="name"></div><div class="sub"></div></div>
      <div id="bubbles"></div>
      <div id="danger" class="hidden">妖</div>
      <div id="toasts"></div>
      <div id="dialogue" class="hidden"><div class="name"></div><div class="portrait"></div><div class="body"><div class="text"></div></div><div class="more">▼</div></div>
      <div id="layer"></div>
      <canvas id="fx"></canvas>
      <div id="flash"></div>`;
    this.dlg = $('#dialogue'); this.layer = $('#layer');
    this.fx = $('#fx'); this.fxg = this.fx.getContext('2d');
    this.bubbles = $('#bubbles');
    this.bubblePool = [];
    this.modal = null; // {update(input)}
    this.dlg.addEventListener('click', () => game.input.press('confirm'));
    const rs = () => { this.fx.width = window.innerWidth; this.fx.height = window.innerHeight; };
    rs(); window.addEventListener('resize', rs);
    this.v = new THREE.Vector3();
  }

  update(input, dt) {
    if (this.modal) { this.modal.update(input, dt); return true; }
    return false;
  }

  // ---------- 对话 ----------
  say(name, text, { look = null, narr = false, speed = 46 } = {}) {
    const g = this.game;
    return new Promise((resolve) => {
      const d = this.dlg;
      d.classList.remove('hidden');
      d.classList.toggle('narr', narr || !name);
      const nm = $('.name', d); nm.textContent = name || ''; nm.style.display = name ? '' : 'none';
      const pt = $('.portrait', d); const url = portrait(look);
      pt.style.display = url ? '' : 'none'; if (url) pt.style.backgroundImage = `url(${url})`;
      const tx = $('.text', d); const more = $('.more', d);
      let shown = 0, acc = 0; const chars = [...text];
      tx.textContent = ''; more.style.visibility = 'hidden';
      this.modal = {
        update: (input, dt) => {
          if (shown < chars.length) {
            acc += dt * speed * (input.isHeld('confirm') ? 3 : 1);
            const n = Math.min(chars.length, Math.floor(acc));
            if (n > shown) { if (n % 3 === 0) g.audio.sfxPlay('talk'); shown = n; tx.textContent = chars.slice(0, shown).join(''); }
            if (input.consume('confirm')) { shown = chars.length; tx.textContent = text; }
            if (shown >= chars.length) more.style.visibility = 'visible';
            input.consume('cancel');
          } else if (input.consume('confirm') || input.consume('cancel')) {
            this.modal = null;
            d.classList.add('hidden');
            resolve();
          }
        },
      };
    });
  }

  choose(options, { cancel = -1 } = {}) {
    return new Promise((resolve) => {
      const box = el('div', 'choices');
      const items = options.map((o) => { const e = el('div', 'opt', o); box.appendChild(e); return { el: e }; });
      this.layer.appendChild(box);
      const nav = new ListNav(box, items, { cancel: cancel >= 0 });
      this.modal = {
        update: (input) => {
          const r = nav.update(input, this.game.audio);
          if (!r) return;
          box.remove(); this.modal = null;
          resolve(r.cancel ? cancel : r.pick);
        },
      };
    });
  }

  // 带选项的对话
  async ask(name, text, options, opts = {}) {
    const d = this.dlg;
    const p = this.say(name, text, opts);
    // 文字打完后直接出选项（对话框保持显示）
    await new Promise((r) => { const iv = setInterval(() => { if ($('.more', d).style.visibility === 'visible') { clearInterval(iv); r(); } }, 50); });
    this.modal = null;
    const idx = await this.choose(options, opts);
    d.classList.add('hidden');
    void p;
    return idx;
  }

  // ---------- HUD ----------
  setObjective(text) {
    const o = $('#objective');
    if (!text) { o.classList.add('hidden'); return; }
    o.classList.remove('hidden');
    $('.txt', o).textContent = text;
    o.animate([{ opacity: 0, transform: 'translateX(-20px)' }, { opacity: 1, transform: 'none' }], { duration: 600 });
  }
  showHUD(on) {
    $('#objective').style.opacity = on ? 1 : 0;
    $('#money').classList.toggle('hidden', !on);
    this.updateMoney();
  }
  updateMoney() { $('#money').textContent = `铜钱 ${this.game.state.money}`; }
  setDanger(k) {
    const d = $('#danger');
    if (k === null || k === undefined) { d.classList.add('hidden'); return; }
    d.classList.remove('hidden');
    const c = k < 0.4 ? '#7ac06a' : k < 0.75 ? '#e8c04a' : '#e0503a';
    d.style.color = c; d.style.boxShadow = `0 0 ${6 + k * 14}px ${c}`;
  }
  banner(name, sub = '') {
    const b = $('#banner');
    $('.name', b).innerHTML = name + `<span class="stamp">${this.game.state.flags.chapter || '第一章'}</span>`;
    $('.sub', b).textContent = sub;
    b.classList.add('show');
    clearTimeout(this._bt);
    this._bt = setTimeout(() => b.classList.remove('show'), 3200);
  }
  toast(html) {
    const t = el('div', 'toast', html);
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), 2700);
  }

  // ---------- 世界气泡 ----------
  setPromptTarget(t) { this.promptTarget = t; }
  project(x, y, z, cam) {
    this.v.set(x, y, z).project(cam);
    return { x: (this.v.x * 0.5 + 0.5) * window.innerWidth, y: (-this.v.y * 0.5 + 0.5) * window.innerHeight, vis: this.v.z < 1 };
  }
  updateBubbles(world) {
    const list = [];
    const g = this.game;
    if (g.mode === 'explore' && this.promptTarget) {
      const t = this.promptTarget;
      const ico = t.kind === 'npc' ? '…' : (t.obj.icon || '！');
      list.push({ cls: 'bubble prompt', html: ico, x: t.x, y: (t.npc ? t.npc.y : 0) + t.y, z: t.z });
    }
    if (g.mode === 'explore' || g.mode === 'script') {
      for (const n of world.npcs) {
        const m = n.def.marker?.(g);
        if (m && n.visible && !(this.promptTarget?.npc === n)) list.push({ cls: 'bubble mark' + (m === 'side' ? ' side' : ''), html: m === 'side' ? '？' : '！', x: n.x, y: n.y + n.h + 0.5, z: n.z });
        if (n.emote) list.push({ cls: 'bubble emote', html: n.emote, x: n.x, y: n.y + n.h + 0.5, z: n.z });
      }
      for (const a of [world.player, world.follower]) if (a?.emote) list.push({ cls: 'bubble emote', html: a.emote, x: a.x, y: a.y + a.h + 0.5, z: a.z });
    }
    while (this.bubblePool.length < list.length) { const e = el('div'); this.bubbles.appendChild(e); this.bubblePool.push(e); }
    this.bubblePool.forEach((e, i) => {
      const b = list[i];
      if (!b) { e.style.display = 'none'; return; }
      const p = this.project(b.x, b.y, b.z, world.camera);
      e.style.display = p.vis ? '' : 'none';
      if (e.className !== b.cls) e.className = b.cls;
      if (e.innerHTML !== b.html) e.innerHTML = b.html;
      e.style.left = p.x + 'px'; e.style.top = p.y + 'px';
    });
  }
  hideBubbles() { this.bubblePool.forEach((e) => (e.style.display = 'none')); }

  // ---------- 转场 ----------
  ink(cover = true, dur = 0.9) {
    const c = this.fx, g = this.fxg;
    const W = c.width, H = c.height, R = Math.hypot(W, H);
    const blobs = [];
    for (let i = 0; i < 9; i++) blobs.push({ x: Math.random() * W, y: Math.random() * H, s: 0.35 + Math.random() * 0.5, d: Math.random() * 0.35, seed: Math.random() * 100 });
    blobs.push({ x: W / 2, y: H / 2, s: 0.75, d: 0, seed: 7 });
    const draw = (k) => {
      g.clearRect(0, 0, W, H);
      if (!cover) { g.fillStyle = '#100c0a'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'destination-out'; }
      g.fillStyle = '#100c0a';
      for (const b of blobs) {
        const t = Math.max(0, Math.min(1, (k - b.d) / (1 - b.d)));
        const e = t * t * (3 - 2 * t);
        const r = e * R * b.s;
        if (r <= 0) continue;
        g.beginPath();
        for (let a = 0; a <= 64; a++) {
          const th = (a / 64) * Math.PI * 2;
          const n = 1 + 0.12 * Math.sin(th * 5 + b.seed) + 0.07 * Math.sin(th * 11 + b.seed * 2) + 0.04 * Math.sin(th * 23 + b.seed);
          const x = b.x + Math.cos(th) * r * n, y = b.y + Math.sin(th) * r * n;
          a ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.fill();
        // 飞白溅点
        if (t > 0.05 && t < 0.9) for (let s = 0; s < 6; s++) { const th = b.seed + s * 1.1; g.beginPath(); g.arc(b.x + Math.cos(th) * r * 1.15, b.y + Math.sin(th) * r * 1.15, r * 0.04, 0, 7); g.fill(); }
      }
      g.globalCompositeOperation = 'source-over';
    };
    return new Promise((res) => {
      const t0 = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / (dur * 1000));
        draw(k);
        if (k < 1) requestAnimationFrame(step);
        else { if (cover) { g.fillStyle = '#100c0a'; g.fillRect(0, 0, W, H); } else g.clearRect(0, 0, W, H); res(); }
      };
      step();
    });
  }
  black(on) { const g = this.fxg; g.clearRect(0, 0, this.fx.width, this.fx.height); if (on) { g.fillStyle = '#100c0a'; g.fillRect(0, 0, this.fx.width, this.fx.height); } }
  flash(color = '#fff', dur = 300, peak = 0.85) {
    const f = $('#flash'); f.style.background = color;
    f.animate([{ opacity: peak }, { opacity: 0 }], { duration: dur, easing: 'ease-out' });
  }
  async fadeBlack(on, dur = 600) {
    const g = this.fxg, W = this.fx.width, H = this.fx.height;
    const t0 = performance.now();
    await new Promise((res) => {
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / dur);
        g.clearRect(0, 0, W, H); g.fillStyle = `rgba(16,12,10,${on ? k : 1 - k})`; g.fillRect(0, 0, W, H);
        k < 1 ? requestAnimationFrame(step) : res();
      };
      step();
    });
  }

  // ---------- 竖排文字（序章/幕间） ----------
  storyCols(lines, { hold = 2.2 } = {}) {
    const g = this.game;
    return new Promise((resolve) => {
      const wrap = el('div'); wrap.id = 'story';
      const cols = el('div', 'cols');
      lines.forEach((l) => { const p = el('p', l.startsWith('!') ? 'red' : '', l.replace(/^!/, '')); cols.appendChild(p); });
      wrap.appendChild(cols); wrap.appendChild(el('div', 'skip', '按 确认键 继续'));
      this.layer.appendChild(wrap);
      const ps = [...cols.children];
      let i = 0, timer = 0.4;
      this.modal = {
        update: (input, dt) => {
          timer -= dt;
          const adv = input.consume('confirm');
          if (i < ps.length && (timer <= 0 || adv)) { ps[i].classList.add('on'); i++; timer = hold; g.audio.sfxPlay('chime'); return; }
          if (i >= ps.length && (adv || timer < -6)) {
            this.modal = null;
            wrap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 800 }).onfinish = () => { wrap.remove(); };
            setTimeout(resolve, 500);
          }
          input.consume('cancel');
        },
      };
    });
  }
}

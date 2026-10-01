// 暂停菜单：队伍 / 道具 / 装备 / 炼妖 / 系统，及商店
import { el, $, ListNav, portrait } from './ui.js';
import { HEROES, SKILLS, ITEMS, EQUIP, SOULS, RECIPES, expToNext } from '../data/db.js';
import { stats, addItem, addEquip, equipItem, save } from '../core/state.js';

const STATN = { hp: '气血', sp: '灵力', atk: '攻击', def: '防御', mag: '术法', res: '抗性', spd: '身法' };
const SLOTN = { weapon: '兵器', armor: '护甲', acc: '饰物' };

function bonusText(e) { return Object.keys(STATN).filter((k) => e[k]).map((k) => `${STATN[k]}${e[k] > 0 ? '+' : ''}${e[k]}`).join(' '); }

export class Menu {
  constructor(game) { this.game = game; this.stack = []; }

  open(onClose) {
    const g = this.game;
    this.onClose = onClose;
    const root = (this.root = el('div')); root.id = 'menu';
    root.innerHTML = `<div class="scroll"><div class="tabs"><div class="title">行囊</div></div><div class="content"></div></div><div class="hint">↑↓ 选择 · 确认 · Esc 返回</div>`;
    g.ui.layer.appendChild(root);
    root.addEventListener('click', (e) => { if (e.target === root) g.input.press('cancel'); });
    const tabs = [['party', '队伍'], ['items', '道具'], ['equip', '装备'], ['refine', '炼妖'], ['system', '系统']];
    const tabBox = $('.tabs', root);
    const items = tabs.map(([k, l]) => { const e = el('div', 'opt', l); tabBox.appendChild(e); return { el: e, k }; });
    this.content = $('.content', root);
    this.stack = [];
    const nav = new ListNav(tabBox, items, { onMove: (it) => this.render(it.k) });
    this.push(nav, (i) => this.enter(items[i].k), () => this.close());
    this.render('party');
  }
  push(nav, onPick, onCancel) { this.stack.push({ nav, onPick, onCancel }); }
  pop() { this.stack.pop(); }
  close() {
    this.root?.remove(); this.root = null; this.stack = [];
    this.game.audio.sfxPlay('cancel');
    this.onClose?.();
  }
  update(input) {
    const top = this.stack[this.stack.length - 1];
    if (!top) return;
    const r = top.nav.update(input, this.game.audio);
    if (!r) return;
    if (r.cancel) top.onCancel?.(); else top.onPick?.(r.pick);
  }

  // ---------- 各页 ----------
  render(tab) {
    this.tab = tab;
    const c = this.content, s = this.game.state;
    c.innerHTML = '';
    if (tab === 'party') {
      c.innerHTML = '<h3>队伍</h3>';
      for (const id of s.party) {
        const h = s.heroes[id], st = stats(s, id), H = HEROES[id];
        const sk = H.skills.filter((x) => x.lv <= h.lv).map((x) => `<b>${SKILLS[x.id].name}</b>`).join('');
        const nextSk = H.skills.find((x) => x.lv > h.lv);
        const eq = Object.entries(h.equip).map(([k, v]) => `${SLOTN[k]}：${v ? EQUIP[v].name : '—'}`).join('　');
        c.appendChild(el('div', 'card', `<img src="${portrait(H.look)}"><div style="flex:1">
          <div><span class="nm">${H.name}</span><span class="tt">${H.title}　Lv.${h.lv}</span></div>
          <div class="row" style="display:flex;gap:10px;align-items:center;font-size:13px">气血<div class="bar hp" style="flex:1"><i style="transform:scaleX(${h.hp / st.hp})"></i></div>${h.hp}/${st.hp}</div>
          <div class="row" style="display:flex;gap:10px;align-items:center;font-size:13px">灵力<div class="bar sp" style="flex:1"><i style="transform:scaleX(${h.sp / st.sp})"></i></div>${h.sp}/${st.sp}</div>
          <div class="row" style="display:flex;gap:10px;align-items:center;font-size:13px">修为<div class="bar exp" style="flex:1"><i style="transform:scaleX(${h.exp / expToNext(h.lv)})"></i></div>${h.exp}/${expToNext(h.lv)}</div>
          <div class="stats">${['atk', 'def', 'mag', 'res', 'spd'].map((k) => `<div><span>${STATN[k]}</span>${st[k]}</div>`).join('')}</div>
          <div class="skills">${eq}</div>
          <div class="skills">招式：${sk}${nextSk ? `<span style="color:#7a6a52">　（Lv.${nextSk.lv} 领悟「${SKILLS[nextSk.id].name}」）</span>` : ''}</div></div>`));
      }
      const tm = Math.floor(s.stats.playTime / 60);
      c.appendChild(el('div', 'desc', `铜钱 ${s.money}　·　游戏时间 ${tm} 分　·　战斗 ${s.stats.battles} 次　·　封印 ${s.stats.sealed} 只<br>当前目标：${s.objective || '—'}`));
    } else if (tab === 'items') {
      c.innerHTML = '<h3>道具</h3><div class="list"></div><div class="desc"></div>';
      const list = $('.list', c);
      const entries = Object.entries(s.items).filter(([, n]) => n > 0);
      const cons = entries.filter(([id]) => !ITEMS[id].key), keys = entries.filter(([id]) => ITEMS[id].key);
      this.itemEntries = [...cons, ...keys];
      if (!this.itemEntries.length) list.innerHTML = '<div style="color:#8a7a62">行囊空空。</div>';
      this.itemEls = this.itemEntries.map(([id, n]) => { const e = el('div', 'opt', `${ITEMS[id].key ? '<span class="tag" style="background:#6a2a22">要</span> ' : ''}${ITEMS[id].name}<span class="r">${ITEMS[id].key ? '' : '×' + n}</span>`); list.appendChild(e); return { el: e, id, disabled: false }; });
      $('.desc', c).textContent = '选择道具查看说明，可对同伴使用。';
    } else if (tab === 'equip') {
      c.innerHTML = '<h3>装备</h3><div class="list"></div><div class="desc">选择同伴与部位更换装备。</div>';
      const list = $('.list', c);
      this.eqEls = [];
      for (const id of s.party) {
        const h = s.heroes[id];
        list.appendChild(el('div', '', `<div style="font-family:var(--kai);font-size:20px;margin:8px 0 2px;color:#f0dfb8">${HEROES[id].name}</div>`));
        for (const slot of ['weapon', 'armor', 'acc']) {
          const cur = h.equip[slot];
          const e = el('div', 'opt', `${SLOTN[slot]}<span class="r">${cur ? EQUIP[cur].name + '　' + bonusText(EQUIP[cur]) : '—'}</span>`);
          list.appendChild(e);
          this.eqEls.push({ el: e, hid: id, slot });
        }
      }
      const bag = Object.entries(s.equipBag).filter(([, n]) => n > 0);
      list.appendChild(el('div', 'skills', `行囊中的装备：${bag.length ? bag.map(([id, n]) => EQUIP[id].name + (n > 1 ? '×' + n : '')).join('、') : '无'}`));
    } else if (tab === 'refine') {
      const owned = Object.entries(s.souls).filter(([, n]) => n > 0);
      c.innerHTML = `<h3>炼妖</h3><div class="skills" style="margin-bottom:10px">青铜残片中封存的妖魄：${owned.length ? owned.map(([k, n]) => `<b>${SOULS[k]}×${n}</b>`).join('') : '尚无'}</div><div class="list"></div><div class="desc">在战斗中对「破绽」状态的妖物使用「炼妖·摄魂」即可封印其魂魄。</div>`;
      const list = $('.list', c);
      this.recEls = RECIPES.map((r) => {
        const ok = Object.entries(r.need).every(([k, n]) => (s.souls[k] || 0) >= n);
        const need = Object.entries(r.need).map(([k, n]) => `${SOULS[k]}×${n}`).join(' + ');
        const e = el('div', 'opt' + (ok ? '' : ' disabled'), `${r.name}<span class="r">${need}</span>`);
        list.appendChild(e);
        return { el: e, r, disabled: !ok };
      });
      if (!s.flags.sealUnlocked) { list.innerHTML = '<div style="color:#8a7a62">（青铜残片似乎还沉睡着……）</div>'; this.recEls = []; }
    } else if (tab === 'system') {
      c.innerHTML = `<h3>系统</h3><div class="list"></div><div class="desc">进度会在切换地图时自动保存。</div>`;
      const list = $('.list', c);
      const a = this.game.audio;
      this.sysEls = [
        { k: 'save', label: '保存进度' },
        { k: 'music', label: `音乐音量<span class="r">${Math.round(a.musicVol * 10)}</span>` },
        { k: 'sfx', label: `音效音量<span class="r">${Math.round(a.sfxVol * 10)}</span>` },
        { k: 'title', label: '回到标题' },
      ].map((o) => { const e = el('div', 'opt', o.label); list.appendChild(e); return { el: e, ...o }; });
    }
  }

  enter(tab) {
    const g = this.game, s = g.state;
    if (tab === 'items' && this.itemEls?.length) {
      const desc = $('.desc', this.content);
      const nav = new ListNav(this.content, this.itemEls, { onMove: (it) => (desc.textContent = ITEMS[it.id].desc) });
      this.push(nav, async (i) => {
        const id = this.itemEls[i].id, it = ITEMS[id];
        if (it.key || it.use === 'bomb' || !it.use) { g.audio.sfxPlay('cancel'); return; }
        const who = await this.pickHero(it.use === 'revive' ? '对谁使用？' : `对谁使用「${it.name}」？`);
        if (!who) return;
        const h = s.heroes[who], st = stats(s, who);
        if (it.use === 'heal') { if (h.hp >= st.hp && !(it.sp && h.sp < st.sp)) { g.ui.toast('气血已满'); return; } h.hp = Math.min(st.hp, h.hp + it.amount); if (it.sp) h.sp = Math.min(st.sp, h.sp + it.sp); }
        else if (it.use === 'sp') { if (h.sp >= st.sp) { g.ui.toast('灵力已满'); return; } h.sp = Math.min(st.sp, h.sp + it.amount); }
        else if (it.use === 'revive') { g.ui.toast('无人倒下'); return; }
        else if (it.use === 'perm') { h.bonus[it.stat] = (h.bonus[it.stat] || 0) + it.amount; if (it.stat === 'sp') h.sp += it.amount; g.audio.sfxPlay('levelup'); }
        addItem(s, id, -1);
        g.audio.sfxPlay('heal');
        g.ui.toast(`${HEROES[who].name} 使用了 <b>${it.name}</b>`);
        this.refresh('items');
      }, () => { this.pop(); this.render('items'); });
    } else if (tab === 'equip') {
      const nav = new ListNav(this.content, this.eqEls);
      this.push(nav, (i) => this.chooseEquip(this.eqEls[i]), () => { this.pop(); this.render('equip'); });
    } else if (tab === 'refine' && this.recEls?.length) {
      const nav = new ListNav(this.content, this.recEls, { onMove: (it) => ($('.desc', this.content).textContent = (ITEMS[it.r.give]?.desc) || '') });
      this.push(nav, (i) => {
        const r = this.recEls[i].r;
        for (const [k, n] of Object.entries(r.need)) s.souls[k] -= n;
        addItem(s, r.give, r.n);
        g.audio.sfxPlay('seal');
        g.ui.toast(`炼化成功：<b>${r.name}</b>`);
        s.stats.refined = (s.stats.refined || 0) + 1;
        this.refresh('refine');
      }, () => { this.pop(); this.render('refine'); });
    } else if (tab === 'system') {
      const nav = new ListNav(this.content, this.sysEls);
      this.push(nav, (i) => {
        const k = this.sysEls[i].k, a = g.audio;
        if (k === 'save') { g.autosave(); g.ui.toast('进度已保存'); }
        if (k === 'music') { a.setVolume((Math.round(a.musicVol * 10) + 2) % 12 / 10, a.sfxVol); this.refresh('system', i); }
        if (k === 'sfx') { a.setVolume(a.musicVol, (Math.round(a.sfxVol * 10) + 2) % 12 / 10); a.sfxPlay('confirm'); this.refresh('system', i); }
        if (k === 'title') { this.close(); g.toTitle(); }
      }, () => { this.pop(); this.render('system'); });
    } else if (tab === 'party') {
      // 无二级
    }
  }
  refresh(tab, idx = 0) {
    this.pop();
    this.render(tab);
    this.enter(tab);
    const top = this.stack[this.stack.length - 1];
    if (top && idx) top.nav.select(Math.min(idx, top.nav.items.length - 1));
  }

  pickHero(title) {
    const s = this.game.state;
    return new Promise((res) => {
      const box = el('div', 'choices');
      box.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);right:auto;bottom:auto';
      box.appendChild(el('div', '', `<div style="padding:0 14px 6px;color:#c9a24a;font-family:var(--kai)">${title}</div>`));
      const items = s.party.map((id) => { const st = stats(s, id), h = s.heroes[id]; const e = el('div', 'opt', `${HEROES[id].name}<span class="r">${h.hp}/${st.hp}　${h.sp}/${st.sp}</span>`); box.appendChild(e); return { el: e, id }; });
      this.root.appendChild(box);
      const nav = new ListNav(box, items);
      this.push(nav, (i) => { this.pop(); box.remove(); res(items[i].id); }, () => { this.pop(); box.remove(); res(null); });
    });
  }

  chooseEquip({ hid, slot }) {
    const g = this.game, s = g.state;
    const cur = s.heroes[hid].equip[slot];
    const cands = Object.entries(s.equipBag).filter(([id, n]) => n > 0 && EQUIP[id].slot === slot && (!EQUIP[id].who || EQUIP[id].who === hid));
    const box = el('div', 'choices');
    box.style.cssText = 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);right:auto;bottom:auto;min-width:420px';
    box.appendChild(el('div', '', `<div style="padding:0 14px 6px;color:#c9a24a;font-family:var(--kai)">${HEROES[hid].name} · ${SLOTN[slot]}（当前：${cur ? EQUIP[cur].name : '无'}）</div>`));
    const before = stats(s, hid);
    const diff = (id) => {
      const h = s.heroes[hid];
      const save0 = h.equip[slot]; h.equip[slot] = id;
      const after = stats(s, hid); h.equip[slot] = save0;
      return Object.keys(STATN).filter((k) => after[k] !== before[k]).map((k) => `<span style="color:${after[k] > before[k] ? '#8fe07a' : '#ff8a7a'}">${STATN[k]}${after[k] > before[k] ? '↑' : '↓'}${Math.abs(after[k] - before[k])}</span>`).join(' ');
    };
    const items = cands.map(([id]) => { const e = el('div', 'opt', `${EQUIP[id].name}<span class="r">${diff(id) || '—'}</span>`); box.appendChild(e); return { el: e, id }; });
    if (cur) { const e = el('div', 'opt', '卸下'); box.appendChild(e); items.push({ el: e, id: null }); }
    if (!items.length) { g.ui.toast('没有可更换的装备'); return; }
    const dsc = el('div', 'skills', ''); dsc.style.padding = '6px 14px'; box.appendChild(dsc);
    this.root.appendChild(box);
    const nav = new ListNav(box, items, { onMove: (it) => (dsc.textContent = it.id ? EQUIP[it.id].desc : '') });
    this.push(nav, (i) => {
      equipItem(s, hid, slot, items[i].id);
      g.audio.sfxPlay('item');
      this.pop(); box.remove();
      this.refresh('equip');
    }, () => { this.pop(); box.remove(); });
  }

  // ---------- 商店 ----------
  shop(list) {
    const g = this.game, s = g.state;
    return new Promise((res) => {
      const root = el('div'); root.id = 'menu';
      root.innerHTML = `<div class="scroll" style="height:min(520px,86vh)"><div class="content"><h3>货郎的担子</h3><div class="skills money"></div><div class="list"></div><div class="desc"></div></div></div><div class="hint">确认 购买 · Esc 离开</div>`;
      g.ui.layer.appendChild(root);
      const c = $('.content', root);
      const draw = () => { $('.money', c).textContent = `铜钱：${s.money}`; };
      draw();
      const items = list.map((id) => {
        const d = ITEMS[id] || EQUIP[id];
        const own = ITEMS[id] ? s.items[id] || 0 : s.equipBag[id] || 0;
        const e = el('div', 'opt', `${d.name}${EQUIP[id] ? '<span class="tag">装</span>' : ''}<span class="r">${d.price} 文　持有 ${own}</span>`);
        $('.list', c).appendChild(e);
        return { el: e, id, d };
      });
      const nav = new ListNav(c, items, { onMove: (it) => ($('.desc', c).innerHTML = it.d.desc + (EQUIP[it.id] ? `<br><span style="color:#c9a24a">${bonusText(it.d)}${it.d.who ? '　（' + HEROES[it.d.who].name + '专用）' : ''}</span>` : '')) });
      const prevMode = g.mode;
      g.ui.modal = {
        update: (input) => {
          const r = nav.update(input, g.audio);
          if (!r) return;
          if (r.cancel) { root.remove(); g.ui.modal = null; g.mode = prevMode; res(); return; }
          const it = items[r.pick];
          if (s.money < it.d.price) { g.ui.toast('铜钱不够'); g.audio.sfxPlay('cancel'); return; }
          s.money -= it.d.price;
          if (EQUIP[it.id]) addEquip(s, it.id, 1); else addItem(s, it.id, 1);
          g.audio.sfxPlay('item'); g.ui.updateMoney();
          const own = ITEMS[it.id] ? s.items[it.id] : s.equipBag[it.id];
          it.el.innerHTML = `${it.d.name}${EQUIP[it.id] ? '<span class="tag">装</span>' : ''}<span class="r">${it.d.price} 文　持有 ${own}</span>`;
          draw();
        },
      };
    });
  }
}

export { save };

// 存档状态
import { HEROES, heroStats, expToNext } from '../data/db.js';

const KEY = 'jiuding_ch1_save_v1';

export function newState() {
  const s = {
    map: 'town', pos: { x: 20, z: 21, dir: 'up' },
    flags: {},
    party: ['moheng'],
    heroes: {},
    items: { herb: 3, dew: 1 },
    equipBag: {},
    souls: {},
    money: 60,
    objective: '',
    stats: { battles: 0, sealed: 0, playTime: 0, breaks: 0 },
  };
  for (const id of Object.keys(HEROES)) {
    const lv = id === 'wuyue' ? 2 : 1;
    const equip = id === 'moheng' ? { weapon: 'tieren', armor: 'buyi', acc: null } : { weapon: 'tongling', armor: 'yinsi', acc: 'shechong' };
    s.heroes[id] = { lv, exp: 0, hp: 0, sp: 0, bonus: {}, equip };
    const full = heroStats(id, lv, {}, equip);
    s.heroes[id].hp = full.hp; s.heroes[id].sp = full.sp;
  }
  return s;
}

export function stats(state, id) {
  const h = state.heroes[id];
  return heroStats(id, h.lv, h.bonus, h.equip);
}

export function gainExp(state, id, exp) {
  const h = state.heroes[id];
  const ups = [];
  h.exp += exp;
  while (h.exp >= expToNext(h.lv)) {
    h.exp -= expToNext(h.lv);
    const before = stats(state, id);
    h.lv++;
    const after = stats(state, id);
    h.hp += after.hp - before.hp; h.sp += after.sp - before.sp;
    const learned = HEROES[id].skills.filter((s) => s.lv === h.lv).map((s) => s.id);
    ups.push({ lv: h.lv, learned });
  }
  return ups;
}

export function healAll(state) {
  for (const id of Object.keys(state.heroes)) { const st = stats(state, id); state.heroes[id].hp = st.hp; state.heroes[id].sp = st.sp; }
}

export function addEquip(state, id, n = 1) { state.equipBag[id] = (state.equipBag[id] || 0) + n; if (state.equipBag[id] <= 0) delete state.equipBag[id]; }
export function equipItem(state, hid, slot, id) {
  const h = state.heroes[hid];
  const before = stats(state, hid);
  if (h.equip[slot]) addEquip(state, h.equip[slot], 1);
  h.equip[slot] = id || null;
  if (id) addEquip(state, id, -1);
  const after = stats(state, hid);
  h.hp = Math.max(1, Math.min(after.hp, h.hp + Math.max(0, after.hp - before.hp)));
  h.sp = Math.min(after.sp, h.sp + Math.max(0, after.sp - before.sp));
}
export function addItem(state, id, n = 1) { state.items[id] = (state.items[id] || 0) + n; if (state.items[id] <= 0) delete state.items[id]; }

export function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch { return false; }
}
export function load() {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}
export function hasSave() { try { return !!localStorage.getItem(KEY); } catch { return false; } }
export function clearSave() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }

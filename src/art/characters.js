// 程序化像素人物：每格 24x32，行 = 下/上/左/右/战斗；列 = 帧
import { makeCanvas, shade, pixelize, pixelTex } from './pixel.js';

export const CELL_W = 24, CELL_H = 32;
export const ROWS = { down: 0, up: 1, left: 2, right: 3, battle: 4 };
export const BATTLE_FRAMES = { idle0: 0, idle1: 1, attack: 2, cast: 3, hurt: 4, ko: 5 };

export const LOOKS = {
  moheng: { hair: '#2a2220', hairStyle: 'knot', band: '#3d78a8', skin: '#f1c9a0', robe: '#33507a', trim: '#d9cfb4', sash: '#b98a3e', pants: '#4a3a2c', shoes: '#2b2019', extras: ['backpack'], weapon: 'sword' },
  wuyue: { hair: '#1f1a26', hairStyle: 'long', skin: '#f4d0ae', robe: '#7a2f4f', trim: '#d8dce6', sash: '#2f6d8a', pants: '#2f6d8a', shoes: '#3a2a22', extras: ['silver', 'skirt'], weapon: 'talisman', long: true },
  chenbo: { hair: '#c9c4ba', hairStyle: 'short', skin: '#e2b48a', robe: '#7a5a3c', trim: '#c9b48a', sash: '#4d3a28', pants: '#4d3a28', shoes: '#2b2019', hat: 'douli', beard: '#e8e4dc', long: true },
  laozhou: { hair: '#3a302a', hairStyle: 'short', skin: '#d9a57a', robe: '#4f6a6a', trim: '#b8a57a', sash: '#3a2e22', pants: '#3a3a3a', shoes: '#2b2019', hat: 'douli', extras: ['cape'] },
  liusao: { hair: '#2a2220', hairStyle: 'bun', skin: '#f3cfab', robe: '#c76f4e', trim: '#f0dcc0', sash: '#e8e0cc', pants: '#5a3a3a', shoes: '#3a2a22', extras: ['apron'], long: true },
  xiaodou: { hair: '#2a2220', hairStyle: 'twinbun', skin: '#f6d2b0', robe: '#c9423a', trim: '#f0c95a', sash: '#3a6a3a', pants: '#3a6a3a', shoes: '#2b2019', child: true },
  azhu: { hair: '#2a2220', hairStyle: 'short', band: '#6a7a3a', skin: '#cf9466', robe: '#8a6a40', trim: '#5a4a30', sash: '#3a2e22', pants: '#5a4a3a', shoes: '#2b2019', extras: ['axe'] },
  huolang: { hair: '#3a302a', hairStyle: 'short', skin: '#e9bb90', robe: '#4f7a4f', trim: '#e0d0a0', sash: '#a83a2a', pants: '#3a3a2a', shoes: '#2b2019', hat: 'cap', extras: ['pack'] },
  villagerA: { hair: '#4a3a2a', hairStyle: 'bun', skin: '#f0c8a0', robe: '#6f8fa0', trim: '#e8e0cc', sash: '#4a5a6a', pants: '#3a3a4a', shoes: '#2b2019', long: true },
  villagerB: { hair: '#9a948a', hairStyle: 'short', skin: '#e0b088', robe: '#8a7a5a', trim: '#d0c0a0', sash: '#4a3a2a', pants: '#4a3a2a', shoes: '#2b2019', beard: '#cfcac0', long: true },
  shishu: { hair: '#b9b3a8', hairStyle: 'knot', skin: '#e0b088', robe: '#2f3a3a', trim: '#b8945a', sash: '#6a2a22', pants: '#2a2a2a', shoes: '#1f1a16', beard: '#d8d3ca', long: true, extras: ['goggles'] },
  heipao: { hair: '#15121a', hairStyle: 'hood', skin: '#d8d0c0', robe: '#1d1a24', trim: '#7a2a3a', sash: '#3a2a3a', pants: '#15121a', shoes: '#0f0d10', long: true, extras: ['mask'], weapon: 'none' },
};

function P(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }

function layout(o) {
  return o.child
    ? { ht: 11, hh: 9, bt: 20, bb: 26, lt: 27 }
    : { ht: 5, hh: 10, bt: 15, bb: 26, lt: 27 };
}

function drawHat(g, o, L, side) {
  if (o.hat === 'douli') {
    const y = L.ht - 3, s = '#c9a660', d = '#8f7240';
    const rows = side ? [[11, 3], [9, 7], [7, 11], [5, 15]] : [[11, 2], [9, 6], [7, 10], [4, 16]];
    rows.forEach(([x, w], i) => { P(g, x, y + i, w, 1, i === rows.length - 1 ? d : s); if (i > 0) P(g, x + 1, y + i, 1, 1, shade(s, 0.25)); });
  } else if (o.hat === 'cap') {
    P(g, 8, L.ht - 1, 8, 3, '#3a3a4a'); P(g, 8, L.ht - 1, 8, 1, '#55556a');
  }
}

function drawHeadFront(g, o, L, back) {
  const t = L.ht;
  // 脸
  P(g, 8, t + 2, 8, L.hh - 2, o.skin); P(g, 8, t + L.hh - 1, 1, 1, 'rgba(0,0,0,0)');
  P(g, 15, t + 3, 1, L.hh - 3, shade(o.skin, -0.12));
  if (o.extras?.includes('mask') && !back) {
    P(g, 8, t + 2, 8, L.hh - 2, '#d8d0c0'); P(g, 15, t + 2, 1, L.hh - 2, '#a89f8f');
    P(g, 9, t + 5, 2, 1, '#121014'); P(g, 13, t + 5, 2, 1, '#121014');
    P(g, 11, t + 3, 2, 5, '#9a2a3a');
  }
  // 头发
  const H = o.hair, Hh = shade(H, 0.25);
  if (o.hairStyle === 'hood') {
    P(g, 7, t, 10, 4, o.robe); P(g, 7, t, 1, L.hh, o.robe); P(g, 16, t, 1, L.hh, o.robe);
    P(g, 8, t - 1, 8, 1, o.robe); P(g, 9, t, 4, 1, shade(o.robe, 0.2));
    if (back) P(g, 7, t, 10, L.hh + 1, o.robe);
    return;
  }
  P(g, 8, t, 8, 3, H); P(g, 9, t, 3, 1, Hh);
  P(g, 8, t + 3, 1, 3, H); P(g, 15, t + 3, 1, 3, H);
  if (!back) { P(g, 9, t + 3, 2, 1, H); P(g, 13, t + 3, 1, 1, H); }
  if (back) { P(g, 8, t, 8, L.hh - 1, H); P(g, 9, t + 1, 2, 3, Hh); }
  if (o.hairStyle === 'long') { P(g, 7, t + 2, 1, 9, H); P(g, 16, t + 2, 1, 9, H); if (back) P(g, 8, t + 6, 8, 8, H); }
  if (o.hairStyle === 'knot') { P(g, 11, t - 2, 2, 2, H); P(g, 11, t - 2, 1, 1, Hh); P(g, 10, t, 4, 1, o.band || '#b98a3e'); }
  if (o.hairStyle === 'bun') { P(g, 10, t - 3, 4, 3, H); P(g, 11, t - 3, 1, 1, Hh); P(g, 14, t - 2, 2, 1, '#d8b04a'); }
  if (o.hairStyle === 'twinbun') { P(g, 6, t - 1, 3, 3, H); P(g, 15, t - 1, 3, 3, H); P(g, 6, t + 1, 3, 1, '#c9423a'); P(g, 15, t + 1, 3, 1, '#c9423a'); }
  if (o.band && o.hairStyle !== 'knot' || o.hairStyle === 'knot' && o.band) {
    P(g, 8, t + 2, 8, 1, o.band);
    if (!back) { P(g, 16, t + 3, 1, 2, o.band); P(g, 17, t + 4, 1, 2, shade(o.band, -0.2)); }
    else { P(g, 11, t + 3, 2, 3, o.band); }
  }
  if (o.extras?.includes('silver')) { P(g, 9, t - 1, 6, 1, '#d8dce6'); P(g, 11, t - 3, 2, 2, '#eef0f6'); P(g, 10, t - 2, 1, 1, '#b8bcc8'); P(g, 13, t - 2, 1, 1, '#b8bcc8'); }
  if (!back) {
    // 眼、腮红、嘴
    const ey = t + 5;
    P(g, 10, ey, 1, 2, '#2a1d17'); P(g, 13, ey, 1, 2, '#2a1d17');
    P(g, 10, ey, 1, 1, '#5a4030');
    if (!o.beard) { P(g, 9, ey + 2, 1, 1, shade(o.skin, -0.08)); P(g, 14, ey + 2, 1, 1, shade(o.skin, -0.08)); }
    if (o.extras?.includes('goggles')) { P(g, 9, t + 3, 6, 1, '#6a4a2a'); P(g, 9, t + 4, 2, 1, '#9fd0d8'); P(g, 13, t + 4, 2, 1, '#9fd0d8'); }
    if (o.beard) { P(g, 9, t + L.hh - 2, 6, 3, o.beard); P(g, 10, t + L.hh + 1, 4, 1, o.beard); P(g, 11, t + L.hh - 2, 2, 1, shade(o.skin, -0.3)); }
  }
}

function drawBodyFront(g, o, L, frame, back) {
  const { bt, bb, lt } = L;
  const step = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  // 腿 + 鞋
  const legH = 30 - lt;
  const lUp = step === 1 ? 1 : 0, rUp = step === -1 ? 1 : 0;
  P(g, 9, lt, 2, legH - lUp, o.pants); P(g, 13, lt, 2, legH - rUp, o.pants);
  P(g, 8, 30 - lUp, 3, 2, o.shoes); P(g, 13, 30 - rUp, 3, 2, o.shoes);
  // 袖与手
  const aL = step, aR = -step;
  P(g, 6, bt + 1 + Math.max(0, aL), 2, 6, shade(o.robe, -0.05)); P(g, 6, bt + 7 + Math.max(0, aL), 2, 1, o.skin);
  P(g, 16, bt + 1 + Math.max(0, aR), 2, 6, shade(o.robe, -0.18)); P(g, 16, bt + 7 + Math.max(0, aR), 2, 1, shade(o.skin, -0.1));
  P(g, 6, bt + 1, 1, 1, shade(o.robe, 0.15));
  // 袍
  const longExtra = o.long ? 2 : 0;
  P(g, 8, bt, 8, bb - bt + longExtra, o.robe);
  P(g, 7, bb - 3, 10, 3 + longExtra, o.robe);
  P(g, 8, bt, 1, bb - bt, shade(o.robe, 0.16));
  P(g, 15, bt, 1, bb - bt + longExtra, shade(o.robe, -0.2)); P(g, 16, bb - 3, 1, 3 + longExtra, shade(o.robe, -0.25));
  P(g, 7, bb - 1 + longExtra, 10, 1, shade(o.robe, -0.28));
  if (o.extras?.includes('skirt')) { P(g, 7, bb - 2, 10, 1, o.trim); P(g, 7, bb + 1, 10, 1, o.sash); }
  if (!back) {
    // 交领
    P(g, 10, bt, 1, 1, o.trim); P(g, 11, bt + 1, 1, 1, o.trim); P(g, 12, bt + 2, 1, 1, o.trim);
    P(g, 13, bt, 1, 1, o.trim); P(g, 12, bt + 1, 1, 1, o.trim);
    P(g, 11, bt, 2, 1, o.skin);
  }
  // 腰带
  P(g, 8, bt + 5, 8, 1, o.sash); P(g, 8, bt + 6, 8, 1, shade(o.sash, -0.25));
  if (!back) P(g, 11, bt + 6, 1, 2, o.sash);
  if (o.extras?.includes('apron') && !back) { P(g, 9, bt + 6, 6, 6, o.trim); P(g, 14, bt + 6, 1, 6, shade(o.trim, -0.15)); }
  if (o.extras?.includes('silver') && !back) { for (let x = 9; x <= 14; x += 1) P(g, x, bt + 1, 1, 1, x % 2 ? '#eef0f6' : '#a8acb8'); P(g, 11, bt + 2, 2, 1, '#eef0f6'); }
  if (o.extras?.includes('cape')) {
    P(g, 6, bt, 12, 7, '#a8915a'); for (let x = 6; x < 18; x += 2) P(g, x, bt + 2, 1, 5, '#7f6a3e');
    P(g, 6, bt + 7, 12, 1, '#6f5a32');
  }
  if (o.extras?.includes('backpack')) {
    if (back) {
      P(g, 7, bt - 1, 10, 9, '#7a5230'); P(g, 7, bt - 1, 10, 1, '#9c6c40'); P(g, 16, bt - 1, 1, 9, '#5a3a20');
      P(g, 7, bt - 1, 2, 2, '#c9a24a'); P(g, 15, bt - 1, 2, 2, '#c9a24a'); P(g, 7, bt + 6, 2, 2, '#c9a24a'); P(g, 15, bt + 6, 2, 2, '#c9a24a');
      P(g, 11, bt + 2, 2, 2, '#c9a24a'); P(g, 10, bt + 2, 1, 1, '#8a6a2a'); P(g, 13, bt + 3, 1, 1, '#8a6a2a');
    } else { P(g, 9, bt, 1, 5, '#5a3a20'); P(g, 14, bt, 1, 5, '#5a3a20'); P(g, 7, bt - 2, 1, 2, '#7a5230'); P(g, 16, bt - 2, 1, 2, '#7a5230'); }
  }
  if (o.extras?.includes('axe')) {
    P(g, back ? 9 : 16, bt - 4, 1, 10, '#6a4a2a');
    P(g, back ? 7 : 16, bt - 5, 3, 3, '#b8b8b8');
  }
  if (o.extras?.includes('pack')) {
    if (back) { P(g, 7, bt, 10, 8, '#b89a6a'); P(g, 7, bt + 3, 10, 1, '#7a5a3a'); }
    else { P(g, 9, bt, 1, 4, '#7a5a3a'); P(g, 14, bt, 1, 4, '#7a5a3a'); }
  }
}

function drawSide(g, o, L, frame, pose = null) {
  const { ht: t, hh, bt, bb, lt } = L;
  const step = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  const ox = pose === 'attack' ? -2 : pose === 'hurt' ? 2 : 0;
  const oy = pose === 'idle1' ? 1 : 0;
  const X = (x) => x + ox;
  // 腿
  const legH = 30 - lt;
  if (step === 0 && !pose) {
    P(g, X(10), lt, 2, legH, shade(o.pants, -0.15)); P(g, X(12), lt, 2, legH, o.pants);
    P(g, X(9), 30, 3, 2, o.shoes); P(g, X(11), 30, 4, 2, shade(o.shoes, 0.1));
  } else if (pose) {
    P(g, X(9), lt, 2, legH, shade(o.pants, -0.15)); P(g, X(13), lt, 2, legH, o.pants);
    P(g, X(8), 30, 3, 2, o.shoes); P(g, X(13), 30, 3, 2, o.shoes);
  } else {
    const f = step === 1;
    P(g, X(8), lt, 2, legH - 1, f ? o.pants : shade(o.pants, -0.15)); P(g, X(7), 29, 3, 2, o.shoes);
    P(g, X(13), lt, 2, legH, f ? shade(o.pants, -0.15) : o.pants); P(g, X(13), 30, 3, 2, o.shoes);
  }
  // 背匣
  if (o.extras?.includes('backpack')) { P(g, X(15), bt - 1 + oy, 4, 9, '#7a5230'); P(g, X(15), bt - 1 + oy, 4, 1, '#9c6c40'); P(g, X(17), bt - 1 + oy, 2, 2, '#c9a24a'); P(g, X(17), bt + 6 + oy, 2, 2, '#c9a24a'); }
  if (o.extras?.includes('pack')) { P(g, X(15), bt + oy, 4, 8, '#b89a6a'); }
  if (o.extras?.includes('axe')) { P(g, X(15), bt - 4 + oy, 1, 10, '#6a4a2a'); P(g, X(15), bt - 5 + oy, 3, 3, '#b8b8b8'); }
  // 袍
  const longExtra = o.long ? 2 : 0;
  P(g, X(9), bt + oy, 6, bb - bt + longExtra - oy, o.robe);
  P(g, X(8), bb - 3, 8, 3 + longExtra, o.robe);
  P(g, X(9), bt + oy, 1, bb - bt, shade(o.robe, 0.15));
  P(g, X(14), bt + oy, 1, bb - bt + longExtra, shade(o.robe, -0.2));
  P(g, X(8), bb - 1 + longExtra, 8, 1, shade(o.robe, -0.28));
  if (o.extras?.includes('skirt')) { P(g, X(8), bb - 2, 8, 1, o.trim); P(g, X(8), bb + 1, 8, 1, o.sash); }
  P(g, X(9), bt + 5 + oy, 6, 1, o.sash);
  P(g, X(9), bt + oy, 2, 1, o.trim); P(g, X(10), bt + 1 + oy, 1, 1, o.trim);
  if (o.extras?.includes('apron')) { P(g, X(8), bt + 6 + oy, 2, 6, o.trim); }
  if (o.extras?.includes('cape')) { P(g, X(8), bt + oy, 9, 7, '#a8915a'); for (let x = 8; x < 17; x += 2) P(g, X(x), bt + 2 + oy, 1, 5, '#7f6a3e'); }
  // 头
  const ty = t + oy;
  P(g, X(9), ty + 2, 6, hh - 2, o.skin); P(g, X(8), ty + 6, 1, 1, o.skin);
  if (o.extras?.includes('mask')) { P(g, X(8), ty + 2, 5, hh - 2, '#d8d0c0'); P(g, X(9), ty + 3, 1, 5, '#9a2a3a'); }
  if (o.hairStyle === 'hood') {
    P(g, X(10), ty - 1, 7, hh + 1, o.robe); P(g, X(9), ty - 1, 5, 3, o.robe); P(g, X(10), ty, 3, 1, shade(o.robe, 0.2));
  } else {
    P(g, X(9), ty, 7, 3, o.hair); P(g, X(12), ty, 4, hh - 3, o.hair); P(g, X(10), ty, 2, 1, shade(o.hair, 0.25));
    if (o.hairStyle === 'long') P(g, X(13), ty + 2, 3, 12, o.hair);
    if (o.hairStyle === 'knot') { P(g, X(12), ty - 2, 2, 2, o.hair); }
    if (o.hairStyle === 'bun') { P(g, X(13), ty - 2, 4, 4, o.hair); P(g, X(16), ty - 1, 2, 1, '#d8b04a'); }
    if (o.hairStyle === 'twinbun') { P(g, X(9), ty - 2, 3, 3, o.hair); P(g, X(14), ty - 1, 3, 3, o.hair); }
    if (o.band) { P(g, X(9), ty + 2, 7, 1, o.band); P(g, X(16), ty + 3, 2, 1, o.band); P(g, X(17), ty + 4, 2, 1, shade(o.band, -0.2)); }
    if (o.extras?.includes('silver')) { P(g, X(10), ty - 1, 5, 1, '#d8dce6'); P(g, X(11), ty - 3, 2, 2, '#eef0f6'); }
  }
  if (!o.extras?.includes('mask')) {
    const closed = pose === 'hurt';
    P(g, X(10), ty + 5, 1, closed ? 1 : 2, '#2a1d17');
    if (o.extras?.includes('goggles')) { P(g, X(9), ty + 3, 4, 1, '#6a4a2a'); P(g, X(9), ty + 4, 2, 1, '#9fd0d8'); }
    if (o.beard) { P(g, X(8), ty + hh - 2, 4, 3, o.beard); }
  }
  drawHat(g, { ...o }, { ...L, ht: ty }, true);
  // 手臂
  const ay = bt + 1 + oy;
  if (pose === 'attack') {
    P(g, X(5), ay + 1, 6, 2, o.robe); P(g, X(4), ay + 1, 1, 2, o.skin);
    if (o.weapon === 'sword') { P(g, X(-4) < 0 ? 0 : X(-4), ay, 8, 1, '#e8eef2'); P(g, 0, ay + 1, 8, 1, '#9aa4ac'); P(g, X(4), ay - 1, 1, 4, '#c9a24a'); }
    else if (o.weapon === 'talisman') { P(g, X(1), ay - 1, 3, 5, '#f0d878'); P(g, X(2), ay, 1, 3, '#b8322a'); }
    else { P(g, X(2), ay + 1, 2, 2, '#5a2a6a'); }
  } else if (pose === 'cast') {
    P(g, X(10), ay - 7, 2, 8, o.robe); P(g, X(10), ay - 8, 2, 1, o.skin);
    if (o.weapon === 'talisman') { P(g, X(9), ay - 12, 3, 5, '#f0d878'); P(g, X(10), ay - 11, 1, 3, '#b8322a'); }
    else if (o.weapon === 'sword') { P(g, X(10), ay - 16, 1, 9, '#e8eef2'); }
  } else {
    const sw = step === 1 ? -2 : step === -1 ? 2 : 0;
    P(g, X(11 + sw), ay, 2, 6, shade(o.robe, -0.08)); P(g, X(11 + sw), ay + 6, 2, 1, o.skin);
    if (pose && o.weapon === 'sword') { P(g, X(9), ay + 5, 1, 7, '#d8dee2'); P(g, X(9), ay + 4, 1, 1, '#c9a24a'); }
    if (pose && o.weapon === 'talisman') { P(g, X(10), ay + 5, 2, 3, '#f0d878'); }
  }
}

function drawKO(g, o) {
  // 倒地
  P(g, 4, 26, 15, 4, o.robe); P(g, 4, 29, 15, 1, shade(o.robe, -0.3));
  P(g, 7, 26, 2, 4, o.sash);
  P(g, 18, 27, 4, 2, o.pants); P(g, 21, 27, 2, 3, o.shoes);
  P(g, 0, 25, 5, 5, o.skin); P(g, 0, 24, 5, 2, o.hairStyle === 'hood' ? o.robe : o.hair); P(g, 0, 26, 1, 4, o.hairStyle === 'hood' ? o.robe : o.hair);
  P(g, 2, 27, 2, 1, '#2a1d17');
}

export function buildHumanSheet(look) {
  const o = typeof look === 'string' ? LOOKS[look] : look;
  const cols = 6, rows = 5;
  const [c, g] = makeCanvas(cols * CELL_W, rows * CELL_H);
  const cell = (col, row, fn) => {
    const [cc, gg] = makeCanvas(CELL_W, CELL_H);
    fn(gg);
    pixelize(cc, { outlineColor: '#1e1612' });
    g.drawImage(cc, col * CELL_W, row * CELL_H);
  };
  const L = layout(o);
  for (let f = 0; f < 3; f++) {
    cell(f, 0, (gg) => { drawBodyFront(gg, o, L, f, false); drawHeadFront(gg, o, L, false); drawHat(gg, o, L, false); });
    cell(f, 1, (gg) => { drawBodyFront(gg, o, L, f, true); drawHeadFront(gg, o, L, true); drawHat(gg, o, L, false); });
    cell(f, 2, (gg) => drawSide(gg, o, L, f));
    // 右 = 左镜像
    const [cc, gg] = makeCanvas(CELL_W, CELL_H);
    drawSide(gg, o, L, f); pixelize(cc);
    g.save(); g.translate((f + 1) * CELL_W, 3 * CELL_H); g.scale(-1, 1); g.drawImage(cc, 0, 0); g.restore();
  }
  ['idle0', 'idle1', 'attack', 'cast', 'hurt'].forEach((pose, i) => cell(i, 4, (gg) => drawSide(gg, o, L, 0, pose)));
  cell(5, 4, (gg) => drawKO(gg, o));
  return { canvas: c, texture: pixelTex(c, { mip: false }), cols, rows, cw: CELL_W, ch: CELL_H, look: o };
}

export function registerLook(key, look) { LOOKS[key] = look; }

// 对话头像：取正面头部放大
export function portraitURL(look) {
  const sheet = buildHumanSheet(look);
  const [c, g] = makeCanvas(18, 18);
  g.drawImage(sheet.canvas, 3, 0, 18, 18, 0, 0, 18, 18);
  const [big, bg] = makeCanvas(72, 72);
  bg.imageSmoothingEnabled = false;
  bg.drawImage(c, 0, 0, 72, 72);
  return big.toDataURL();
}

// 数据：角色、技能、道具、妖怪、遇敌
export const ELEM = { metal: '金', wood: '木', water: '水', fire: '火', earth: '土' };
export const WEAP = { sword: '剑', bow: '弩', charm: '符' };
export const ICON = { metal: '金', wood: '木', water: '水', fire: '火', earth: '土', sword: '剑', bow: '弩', charm: '符' };

export const HEROES = {
  moheng: {
    name: '墨衡', title: '墨家机关师', look: 'moheng', weapon: 'sword',
    base: { hp: 132, sp: 40, atk: 17, def: 11, mag: 9, res: 9, spd: 11 },
    grow: { hp: 18, sp: 4, atk: 3, def: 2, mag: 1, res: 1.5, spd: 1 },
    skills: [
      { id: 'liuguang', lv: 1 }, { id: 'tiangang', lv: 1 }, { id: 'liannu', lv: 2 }, { id: 'modou', lv: 3 }, { id: 'muyuan', lv: 4 },
    ],
  },
  wuyue: {
    name: '巫月', title: '南疆巫女', look: 'wuyue', weapon: 'charm',
    base: { hp: 104, sp: 62, atk: 10, def: 8, mag: 19, res: 14, spd: 13 },
    grow: { hp: 13, sp: 7, atk: 1, def: 1.5, mag: 3, res: 2, spd: 1.2 },
    skills: [
      { id: 'fentian', lv: 1 }, { id: 'hanlan', lv: 1 }, { id: 'huichun', lv: 1 }, { id: 'yanbeng', lv: 3 }, { id: 'linghu', lv: 3 }, { id: 'zhuque', lv: 5 },
    ],
  },
};

// boost: 'hits' 增加段数 / 'power' 增加威力 / 'turns' 增加回合
// fx: 对应 battle/skillfx.js 中的招式演出
export const SKILLS = {
  attack: { name: '攻击', kind: 'phys', power: 1, boost: 'hits', target: 'enemy', fx: 'attack' },
  liuguang: { name: '墨剑·流光', desc: '身随剑走，化作数道流光连斩单体。（剑）', sp: 5, kind: 'phys', weap: 'sword', power: 0.62, hits: 2, boost: 'hits', target: 'enemy', fx: 'liuguang' },
  tiangang: { name: '天罡剑气', desc: '以墨家心法引动金气，召唤飞剑自天而降。（金）', sp: 8, kind: 'phys', elem: 'metal', power: 1.75, boost: 'power', target: 'enemy', fx: 'tiangang' },
  liannu: { name: '机关·连弩', desc: '袖中机关弩连射，箭矢如蝗。（弩）', sp: 5, kind: 'phys', weap: 'bow', power: 0.7, hits: 2, boost: 'hits', target: 'enemy', fx: 'liannu' },
  modou: { name: '墨斗·缚灵线', desc: '弹出浸墨灵线缚住妖物，降低其防御与速度。', sp: 7, kind: 'debuff', target: 'enemy', fx: 'modou', boost: 'turns' },
  muyuan: { name: '机关·木鸢', desc: '放出公输遗制的木鸢，俯冲啄击全体敌人。（木）', sp: 12, kind: 'phys', elem: 'wood', power: 0.95, boost: 'power', target: 'allEnemies', fx: 'muyuan' },
  fentian: { name: '离火·焚天符', desc: '离卦火符化作火柱，焚烧单体。（火）', sp: 6, kind: 'mag', elem: 'fire', power: 1.7, boost: 'power', target: 'enemy', fx: 'fentian' },
  hanlan: { name: '坎水·寒澜符', desc: '坎卦水符凝成寒澜冰锥，冲击单体。（水）', sp: 6, kind: 'mag', elem: 'water', power: 1.7, boost: 'power', target: 'enemy', fx: 'hanlan' },
  huichun: { name: '蛊术·回春', desc: '放出碧色灵蝶蛊，为一名同伴疗伤。', sp: 8, kind: 'heal', power: 2.4, boost: 'power', target: 'ally', fx: 'huichun' },
  yanbeng: { name: '坤土·岩崩符', desc: '坤卦土符召来落石，砸击单体。（土）', sp: 7, kind: 'mag', elem: 'earth', power: 1.6, boost: 'power', target: 'enemy', fx: 'yanbeng' },
  linghu: { name: '巫咒·灵护', desc: '巫族护身咒结成灵纹法阵，提高全体防御。', sp: 9, kind: 'buff', target: 'allies', fx: 'linghu', boost: 'turns' },
  zhuque: { name: '炎阵·朱雀', desc: '以血为引召唤朱雀虚影，烈焰席卷全体敌人。（火）', sp: 14, kind: 'mag', elem: 'fire', power: 1.05, boost: 'power', target: 'allEnemies', fx: 'zhuque' },
};

export const ITEMS = {
  herb: { name: '回春散', desc: '恢复一名同伴 80 点气血。', price: 20, use: 'heal', amount: 80, target: 'ally', battle: true },
  dew: { name: '清心露', desc: '恢复一名同伴 25 点灵力。', price: 30, use: 'sp', amount: 25, target: 'ally', battle: true },
  incense: { name: '还魂香', desc: '复苏倒下的同伴，恢复一半气血。', price: 80, use: 'revive', target: 'ko', battle: true },
  firebomb: { name: '雷火弹', desc: '墨家火器，对单体造成火属性伤害（可破盾）。', price: 40, use: 'bomb', elem: 'fire', amount: 70, target: 'enemy', battle: true },
  strength: { name: '力字符', desc: '使用后永久提升攻击 2 点。', use: 'perm', stat: 'atk', amount: 2, target: 'ally', battle: false },
  stoneskin: { name: '石肤符', desc: '使用后永久提升防御 2 点。', use: 'perm', stat: 'def', amount: 2, target: 'ally', battle: false },
  spirit: { name: '灵犀符', desc: '使用后永久提升灵力上限 8 点。', use: 'perm', stat: 'sp', amount: 8, target: 'ally', battle: false },
  bird: { name: '机关鸟', desc: '小豆丢失的木制机关鸟，翅膀还能扑腾。', key: true },
  shard: { name: '青铜残片', desc: '洛水中捞起的青铜碎片，刻着饕餮纹，隐隐发烫。', key: true },
  letter: { name: '师叔的信', desc: '墨拙师叔半年前寄来的信：「若见青铜异物，速来旧坊。」', key: true },
  gearkey: { name: '机关钥', desc: '刻有「坎」字的青铜机关钥，可开启旧坊的水闸。', key: true },
  tea: { name: '桂花茶', desc: '刘嫂泡的桂花茶，喝了浑身暖洋洋。恢复 40 气血与 10 灵力。', price: 12, use: 'heal', amount: 40, sp: 10, target: 'ally', battle: true },
};

// 装备：slot = weapon / armor / acc；who 限定角色
export const EQUIP = {
  tieren: { name: '铁刃短剑', slot: 'weapon', who: 'moheng', atk: 4, desc: '渡口铁匠打的短剑，刃口还算锋利。' },
  xuantie: { name: '墨家玄铁剑', slot: 'weapon', who: 'moheng', atk: 10, spd: 1, desc: '墨家旧坊所铸，剑身刻有「兼爱」二字。' },
  qingfeng: { name: '青锋剑', slot: 'weapon', who: 'moheng', atk: 7, price: 160, desc: '货郎从关中带来的好剑。' },
  tongling: { name: '铜铃杖', slot: 'weapon', who: 'wuyue', mag: 4, desc: '巫族少女的随身法杖，挂着三枚铜铃。' },
  yinyue: { name: '银月巫杖', slot: 'weapon', who: 'wuyue', mag: 9, sp: 6, desc: '杖首镶着弯月银饰，灵力充盈。' },
  buyi: { name: '粗布短褐', slot: 'armor', def: 3, desc: '寻常百姓的布衣。' },
  yinsi: { name: '银丝巫衣', slot: 'armor', who: 'wuyue', def: 5, res: 5, desc: '南疆银线织成，可御邪气。' },
  pijia: { name: '鹿皮甲', slot: 'armor', def: 7, price: 120, desc: '鞣制鹿皮所制，轻便耐用。' },
  jiguanjia: { name: '墨家机关甲', slot: 'armor', who: 'moheng', def: 12, res: 4, spd: -1, desc: '以榫卯木片与铜扣编成，坚固异常。' },
  pinganjie: { name: '平安结', slot: 'acc', hp: 20, desc: '小豆送的红绳结，据说能保平安。' },
  qingyu: { name: '青玉佩', slot: 'acc', res: 6, price: 90, desc: '温润青玉，可宁心神。' },
  shenxing: { name: '神行符', slot: 'acc', spd: 4, price: 150, desc: '贴于腿上，步履如风。' },
  shechong: { name: '灵蛇护符', slot: 'acc', hp: 12, sp: 12, desc: '巫族灵蛇骨所制，护持心脉。' },
  tongjing: { name: '护心铜镜', slot: 'acc', def: 5, res: 3, desc: '古旧铜镜，背面铸有雷纹。' },
};

export const SOULS = {
  bamboo: '竹妖魄', shanxiao: '山魈魄', foxfire: '狐火魄', puppet: '傀儡魄', toad: '石蟾魄', nigui: '溺鬼魄', bat: '蝠妖魄',
};

export const RECIPES = [
  { need: { bamboo: 2 }, give: 'herb', n: 2, name: '回春散 ×2' },
  { need: { foxfire: 2 }, give: 'firebomb', n: 1, name: '雷火弹 ×1' },
  { need: { shanxiao: 2 }, give: 'strength', n: 1, name: '力字符 ×1' },
  { need: { toad: 2 }, give: 'stoneskin', n: 1, name: '石肤符 ×1' },
  { need: { puppet: 1, foxfire: 1 }, give: 'spirit', n: 1, name: '灵犀符 ×1' },
  { need: { bamboo: 1, toad: 1 }, give: 'dew', n: 2, name: '清心露 ×2' },
  { need: { nigui: 2 }, give: 'incense', n: 1, name: '还魂香 ×1' },
  { need: { bat: 2, foxfire: 1 }, give: 'firebomb', n: 2, name: '雷火弹 ×2' },
];

export const ENEMIES = {
  bamboo: { name: '竹妖', sprite: 'bamboo', hp: 78, atk: 15, def: 7, mag: 8, res: 6, spd: 9, shield: 2, weak: ['metal', 'fire', 'sword'], exp: 14, money: 9, soul: 'bamboo', scale: 1,
    acts: [{ name: '竹叶刃', kind: 'phys', power: 1.0, w: 3 }, { name: '缠根', kind: 'debuff', stat: 'spd', w: 1 }] },
  shanxiao: { name: '山魈', sprite: 'shanxiao', hp: 128, atk: 19, def: 9, mag: 6, res: 6, spd: 8, shield: 3, weak: ['wood', 'bow', 'charm'], exp: 22, money: 15, soul: 'shanxiao', scale: 1.1,
    acts: [{ name: '重拳', kind: 'phys', power: 1.2, w: 3 }, { name: '怒吼', kind: 'buffself', w: 1 }] },
  foxfire: { name: '狐火', sprite: 'foxfire', hp: 66, atk: 10, def: 6, mag: 18, res: 12, spd: 15, shield: 2, weak: ['water', 'sword'], exp: 16, money: 12, soul: 'foxfire', scale: 0.95, float: true,
    acts: [{ name: '鬼火', kind: 'mag', power: 1.1, w: 3 }, { name: '狐火燎原', kind: 'mag', power: 0.6, all: true, w: 1 }] },
  puppet: { name: '机关傀儡', sprite: 'puppet', hp: 160, atk: 23, def: 15, mag: 5, res: 8, spd: 7, shield: 4, weak: ['fire', 'bow'], exp: 30, money: 22, soul: 'puppet', scale: 1.15,
    acts: [{ name: '机关刃', kind: 'phys', power: 1.1, w: 3 }, { name: '旋转斩', kind: 'phys', power: 0.7, all: true, w: 1 }] },
  toad: { name: '石蟾', sprite: 'toad', hp: 140, atk: 18, def: 18, mag: 12, res: 10, spd: 6, shield: 3, weak: ['wood', 'charm', 'sword'], exp: 26, money: 18, soul: 'toad', scale: 1.05,
    acts: [{ name: '岩舌', kind: 'phys', power: 1.0, w: 2 }, { name: '石化毒雾', kind: 'debuff', stat: 'def', all: true, w: 1 }] },
  nigui: { name: '溺鬼', sprite: 'nigui', hp: 96, atk: 12, def: 8, mag: 17, res: 10, spd: 10, shield: 3, weak: ['earth', 'sword', 'fire'], exp: 18, money: 13, soul: 'nigui', scale: 1, float: true,
    acts: [{ name: '怨水', kind: 'mag', power: 1.05, fx: 'water', w: 3 }, { name: '水缚', kind: 'debuff', stat: 'spd', w: 1 }] },
  bat: { name: '蝠妖', sprite: 'bat', hp: 72, atk: 17, def: 6, mag: 8, res: 7, spd: 18, shield: 2, weak: ['bow', 'fire', 'metal'], exp: 17, money: 11, soul: 'bat', scale: 1, float: true,
    acts: [{ name: '吸血', kind: 'phys', power: 0.9, drain: true, w: 3 }, { name: '超声', kind: 'debuff', stat: 'def', w: 1 }] },
  shanxiaowang: { name: '山魈王', sprite: 'shanxiaoKing', hp: 560, atk: 23, def: 11, mag: 8, res: 8, spd: 9, shield: 5, weak: ['wood', 'bow', 'fire', 'charm'], exp: 90, money: 120, soul: 'shanxiao', scale: 1.45, miniboss: true,
    acts: [{ name: '重拳', kind: 'phys', power: 1.2, w: 3 }, { name: '裂地拳', kind: 'phys', power: 0.8, all: true, w: 2 }, { name: '狂怒', kind: 'buffself', w: 1 }] },
  guard: { name: '铜甲傀儡', sprite: 'puppetBronze', hp: 720, atk: 27, def: 20, mag: 6, res: 10, spd: 7, shield: 6, weak: ['fire', 'bow', 'earth'], exp: 130, money: 160, soul: 'puppet', scale: 1.5, miniboss: true,
    acts: [{ name: '机关刃', kind: 'phys', power: 1.15, w: 3 }, { name: '旋转斩', kind: 'phys', power: 0.75, all: true, w: 2 }, { name: '铜壁', kind: 'buffself', w: 1 }] },
  ghostfire: { name: '鼎魂火', sprite: 'ghostfire', hp: 90, atk: 10, def: 8, mag: 16, res: 12, spd: 16, shield: 2, weak: ['water', 'metal'], exp: 0, money: 0, scale: 0.95, float: true,
    acts: [{ name: '魂火', kind: 'mag', power: 1.0, w: 1 }] },
  taotie: { name: '饕餮之影', sprite: 'taotie', hp: 1500, atk: 30, def: 16, mag: 22, res: 14, spd: 10, shield: 6, weak: ['metal', 'fire', 'bow', 'charm'], exp: 220, money: 300, scale: 0.86, boss: true, float: true,
    phase2: { shield: 8, weak: ['wood', 'water', 'sword', 'charm'] },
    acts: [{ name: '噬咬', kind: 'phys', power: 1.25, w: 3 }, { name: '青铜咆哮', kind: 'mag', power: 0.7, all: true, debuff: 'def', w: 2 }] },
};

export const ENCOUNTERS = {
  forest: [['bamboo'], ['bamboo', 'bamboo'], ['foxfire', 'bamboo'], ['shanxiao'], ['bamboo', 'foxfire'], ['nigui'], ['nigui', 'bamboo'], ['shanxiao', 'foxfire']],
  ruins: [['puppet'], ['toad', 'foxfire'], ['toad', 'bat'], ['puppet', 'bat'], ['bat', 'bat', 'foxfire'], ['toad', 'nigui']],
};

export function expToNext(lv) { return Math.round(22 * Math.pow(lv, 1.45)); }

export function heroStats(id, lv, bonus = {}, equip = {}) {
  const h = HEROES[id];
  const s = {};
  for (const k in h.base) {
    let v = h.base[k] + h.grow[k] * (lv - 1) + (bonus[k] || 0);
    for (const slot in equip) { const e = EQUIP[equip[slot]]; if (e && e[k]) v += e[k]; }
    s[k] = Math.round(v);
  }
  return s;
}

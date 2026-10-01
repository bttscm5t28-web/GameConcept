// 墨家旧坊：北山山腰的墨家机关城遗址（第一章终章）
// 流程：山门到达 → 外院探索 → 中庭「五行机关门」解谜 → 长廊铜甲傀儡 → 鼎室水闸 → 黑袍人 / 饕餮之影 → 结局
import * as THREE from 'three';
import * as P from '../../art/props.js';
import { makeGrid, fillRect, line, toRows, chestObj } from './helpers.js';
import { mistLayer, particles, godRays, applyOcclusionFade } from '../effects.js';
import * as T from '../../art/textures.js';
import { ENCOUNTERS } from '../../data/db.js';
import * as A from './ruinsArt.js';

const W = 40, H = 46;
const START = [1, 3, 4];   // 木 火 土
const ANSWER = [0, 2, 1];  // 金 水 木 —— 金生水，水生木，木生火
const PED = [[14.6, 21.0], [20, 21.7], [25.4, 21.0]];
const GUARD_POS = [20, 13.0];
const WRECK_POS = [21.6, 13.9];
const SHISHU_POS = [23.4, 7.1];
const DING = [20, 5.3];

const raf = () => new Promise((r) => requestAnimationFrame(r));
async function tween(ms, fn) {
  const t0 = performance.now();
  for (;;) { const k = Math.min(1, (performance.now() - t0) / ms); fn(k); if (k >= 1) return; await raf(); }
}
const ease = (k) => k * k * (3 - 2 * k);

function grid(F) {
  const g = makeGrid(W, H, '^');
  // 南坡：山门外
  fillRect(g, 4, 39, 35, 45, '.');
  fillRect(g, 4, 39, 6, 45, 'T'); fillRect(g, 33, 39, 35, 45, 'T');
  fillRect(g, 7, 43, 8, 45, 'T'); fillRect(g, 31, 43, 32, 45, 'T'); fillRect(g, 7, 39, 7, 40, 'T'); fillRect(g, 32, 39, 32, 40, 'T');
  fillRect(g, 10, 41, 13, 42, 'f'); fillRect(g, 26, 40, 29, 41, 'f');
  line(g, [[19, 45], [19, 42], [20, 40], [20, 39]], ',', 4);
  // 外墙与外院
  fillRect(g, 2, 24, 37, 38, 'W');
  fillRect(g, 3, 25, 36, 37, 'r');
  fillRect(g, 18, 38, 21, 38, ',');
  fillRect(g, 18, 25, 21, 37, '=');
  // 水渠（东墙龙口出水 → 水车 → 南流），一座小桥
  fillRect(g, 27, 27, 36, 28, '~');
  fillRect(g, 27, 29, 28, 36, '~');
  fillRect(g, 27, 32, 28, 33, 'b');
  // 外院 ↔ 中庭 的残墙缺口
  fillRect(g, 15, 24, 24, 24, 'r');
  // 中庭与两侧院
  fillRect(g, 2, 10, 37, 23, 'W');
  fillRect(g, 10, 19, 29, 23, 'r');
  fillRect(g, 3, 13, 8, 23, 'r');     // 西：藏书阁
  fillRect(g, 31, 13, 36, 23, 'r');   // 东：工坊
  fillRect(g, 9, 20, 9, 21, 'r'); fillRect(g, 30, 20, 30, 21, 'r');
  // 长廊：两侧水池
  fillRect(g, 10, 11, 29, 17, '~');
  fillRect(g, 17, 11, 22, 17, 'r');
  fillRect(g, 18, 18, 21, 18, F.ruinsGateOpen ? 'r' : 'Y');
  // 鼎室
  fillRect(g, 9, 1, 30, 10, 'W');
  fillRect(g, 10, 2, 29, 9, 'd');
  fillRect(g, 10, 10, 29, 10, 'Y');   // 低矮的石栏（视线可以看进鼎室）
  fillRect(g, 18, 10, 21, 10, F.ruinsSluiceOpen ? 'd' : 'Y');
  return toRows(g);
}

// 天色：黄昏 → 入夜，随剧情推进
const dayStage = (f) => (f.ruinsBossDone ? 1 : f.ruinsSluiceOpen ? 0.92 : f.ruinsGuardDone ? 0.8 : f.ruinsGateOpen ? 0.6 : f.ruinsCourtyard ? 0.32 : 0.08);

export default function ruins(game) {
  const R = { ped: [], wheelBoost: 0, dingMode: 'calm' };
  const F0 = game.state.flags;

  // ---------- 小工具 ----------
  const ringsNow = () => (game.state.flags.ruinsGateOpen ? ANSWER.slice() : (game.state.flags.ruinsRings || START).slice());
  function showRing(i, e) {
    R.ped[i]?.userData.set(e);
    const ring = R.gate?.userData.rings[i];
    if (ring) { ring.mat.map = A.glyph(A.ELEMS[e], A.ELEM_COLOR[e]); ring.mat.needsUpdate = true; }
  }
  function burst(area, color, count = 60, y = [0, 2.2], ms = 3200, additive = true, size = 0.12) {
    const p = particles({ count, area, y, color, size, additive, speed: 1.6 });
    game.world.scene.add(p);
    tween(ms, (k) => { p.material.uniforms.opacity.value = 1 - k * k; }).then(() => game.world.scene.remove(p));
    return p;
  }
  function setGuardAwake(on) { if (R.guard) R.guard.userData.mat.emissiveIntensity = on ? 1.8 : 0.35; }

  // ---------- 剧情 ----------
  async function arrival(ctx) {
    ctx.flags.ruinsArrived = true;
    await ctx.wait(200);
    ctx.walk('player', 19.8, 41.8, 1.6);
    ctx.walk('wuyue', 21.1, 42.8, 1.6);
    await ctx.pan(20, 38.6, 2.6);
    await ctx.narr('夕阳沉在北山的肩头，把半座山门染成了旧铜的颜色。');
    await ctx.narr('墨家旧坊——昔年天下闻名的机关之城，如今只剩断墙、荒草，和一架不知疲倦的水车。');
    ctx.face('wuyue', 'player');
    await ctx.say('moheng', '就是这里了……「墨家旧坊」。');
    await ctx.say('moheng', '小时候爹带我来过一回。那时山门的漆还是朱红的，门口两尊木傀儡会给客人作揖，我吓得躲在爹身后，死活不肯出来。');
    ctx.sfx('chime');
    await ctx.emote('wuyue', '♪', 900);
    await ctx.narr('巫月腰间的银铃无风自鸣，叮叮当当，一声紧过一声。');
    await ctx.say('wuyue', '……又响了。从进山起它就没消停过，越往上走，响得越急。');
    await ctx.say('wuyue', '鼎气就在这座山里，错不了。');
    await ctx.say('moheng', '你的铃铛，对这块残片也有感应？');
    await ctx.say('wuyue', '不然你以为我为什么跟着你？……别多想，我是跟着铃铛走，正好和你同路而已。');
    await ctx.walk('player', 19.9, 39.9, 1.8);
    await ctx.emote('player', '！', 700);
    await ctx.say('moheng', '等等。你看地上。');
    await ctx.pan(20, 36.5, 1.2);
    await ctx.narr('门槛前的青苔被踩得稀烂，一行脚印一直延伸进院子深处。泥印还是湿的。');
    await ctx.narr('门楣上那道墨家封条被人从正中斩断——切口平整如镜，边缘却焦黑卷曲。');
    await ctx.say('moheng', '不是刀。刀口不会烧焦……是符火。');
    await ctx.walk('wuyue', 21.0, 40.6, 2.4);
    await ctx.say('wuyue', '竹海里那个樵夫说的「黑袍人」？');
    await ctx.say('moheng', '师叔从不许外人踏进旧坊一步。若是有人硬闯进来……');
    await ctx.emote('player', '…', 900);
    await ctx.say('moheng', '……师叔！');
    ctx.face('wuyue', 'player');
    await ctx.say('wuyue', '喂！别一个人往里冲——');
    await ctx.say('wuyue', '真是的，你们中原人都这么急性子吗？……跟紧点。里面要是有什么东西，我的铃铛会比你先知道。');
    ctx.release();
    ctx.objective('寻找墨拙师叔');
  }

  async function courtyard(ctx) {
    ctx.flags.ruinsCourtyard = true;
    await ctx.pan(20, 20.2, 1.4);
    await ctx.narr('中庭尽头，一扇青铜大门封死了去路。门上并排嵌着三枚铜环，环心各有一字，在暮色里幽幽发亮。');
    await ctx.say('moheng', '五行机关门……爹的手札里画过它。三环各转五行，对上了，门才会开。');
    await ctx.say('moheng', '脚印到这里就断了。黑袍人没走这扇门——那他是怎么进去的？');
    ctx.sfx('chime');
    await ctx.emote('wuyue', '♪', 700);
    await ctx.say('wuyue', '铃铛响得更急了。门后面……有什么东西在等着。');
    await ctx.say('wuyue', '先说好，你们墨家的木头机关，我一窍不通。……不过五行嘛，倒是略懂一二。');
    ctx.release();
    ctx.objective('解开中庭的五行机关门');
  }

  async function readRiddle(ctx) {
    await ctx.narr('石碑上刻着一行篆字：');
    await ctx.narr('「三环循相生之道：首环为金，末环生火。」');
    if (!ctx.flags.ruinsRiddleRead) {
      ctx.flags.ruinsRiddleRead = true;
      await ctx.narr('碑下另有小字：「三台自左而右，依次为首、中、末三环。」');
      await ctx.say('wuyue', '「相生」？这个我熟。金生水，水生木，木生火，火生土，土生金——巫族的孩子，三岁就会背。');
      await ctx.say('moheng', '首环是金。末环要能生出火来……');
      await ctx.say('wuyue', '能生火的，当然是木头呀。你在家烧火做饭，难道往灶膛里塞石头？');
      await ctx.say('moheng', '那中间一环，就得是金所生、又能生木的……');
      await ctx.say('wuyue', '停停停，后面你自己想！什么都让我替你们墨家人做完，那还要你干嘛？');
      return;
    }
    const lines = ['金生水，水生木，木生火……你背到哪儿了？', '首环为金，末环生火。中间那一环……喂，你可是墨家的人。', '要我说，直接拿你的剑把门劈开算了。——开玩笑的，别当真。'];
    await ctx.say('wuyue', lines[Math.floor(Math.random() * lines.length)]);
  }

  async function turnRing(ctx, i) {
    const rings = ringsNow();
    rings[i] = (rings[i] + 1) % 5;
    ctx.flags.ruinsRings = rings;
    ctx.flags.ruinsTurns = (ctx.flags.ruinsTurns || 0) + 1;
    ctx.sfx('gear');
    const p = R.ped[i], ring = R.gate.userData.rings[i];
    const d0 = p.userData.dial.rotation.y, r0 = ring.gear.rotation.z;
    p.userData.pulse = 1;
    await tween(420, (k) => { const e = ease(k); p.userData.dial.rotation.y = d0 - e * (Math.PI * 2 / 5); ring.gear.rotation.z = r0 - e * (Math.PI * 2 / 5); });
    showRing(i, rings[i]);
    ctx.sfx('cursor');
    ctx.toast(`${['首', '中', '末'][i]}环 · <b>${A.ELEMS[rings[i]]}</b>`);
    if (rings.every((v, k) => v === ANSWER[k])) { await openGate(ctx); return; }
    if (ctx.flags.ruinsTurns >= 10 && !ctx.flags.ruinsHint) {
      ctx.flags.ruinsHint = true;
      await ctx.say('wuyue', '……你是在跟这几个铜环较劲，还是在跟我较劲？');
      await ctx.say('wuyue', '听好了，我只说一遍：金生水，水生木，木生火。首环是金，末环是木——中间那个，你总该知道了吧？');
    }
  }

  async function openGate(ctx) {
    ctx.flags.ruinsGateOpen = true;
    await ctx.wait(250);
    await ctx.pan(20, 20.4, 0.9);
    R.ped.forEach((p) => { p.userData.solved = true; p.userData.pulse = 1; });
    ctx.sfx('chime');
    await ctx.narr('三枚铜环同时一震。「金」「水」「木」三字依次亮起，光芒顺着门上的铜槽连成一线——');
    const rings = R.gate.userData.rings;
    const base = rings.map((r) => r.gear.rotation.z);
    ctx.sfx('gear'); ctx.shake(0.6);
    setTimeout(() => ctx.sfx('gear'), 380); setTimeout(() => ctx.sfx('gear'), 760);
    await tween(1300, (k) => rings.forEach((r, i) => { r.gear.rotation.z = base[i] + ease(k) * Math.PI * 2 * (i % 2 ? -1 : 1); }));
    ctx.sfx('door'); ctx.shake(2.8);
    burst([17.6, 18.6, 22.4, 19.8], '#c8b090', 90, [0, 2.4], 3600, false, 0.14);
    const door = R.gate.userData.door;
    setTimeout(() => ctx.sfx('break'), 1500);
    await tween(2600, (k) => { door.position.y = -3.4 * ease(k); door.position.x = Math.sin(k * 80) * 0.02 * (1 - k); });
    for (let x = 18; x <= 21; x++) ctx.world.setCell(x, 18, 'r');
    ctx.flash('#fff6d8', 400, 0.35);
    await ctx.wait(400);
    await ctx.say('moheng', '开了！');
    await ctx.say('wuyue', '哼，还不是多亏我提点。');
    await ctx.say('moheng', '是是是，多谢巫姑娘指点。');
    await ctx.say('wuyue', '……「巫姑娘」？听着怪别扭的。叫我巫月就行。');
    await ctx.pan(20, 14.0, 1.4);
    ctx.sfx('gear');
    setGuardAwake(true); await ctx.wait(220); setGuardAwake(false); await ctx.wait(160); setGuardAwake(true); await ctx.wait(300); setGuardAwake(false);
    await ctx.narr('门后是一道长廊，两侧水池里映着最后一抹残霞。长廊尽头，一个高大的身影一动不动地立着。');
    ctx.release();
    ctx.objective('穿过长廊，前往鼎室');
  }

  async function guardScene(ctx) {
    await ctx.pan(20, 13.6, 1.0);
    await ctx.narr('那是一尊铜甲傀儡，足有两人高，拄着一柄长刃，挡在鼎室门前。');
    await ctx.say('moheng', '是「丙一」……旧坊的护坊傀儡，师叔亲手造的。');
    await ctx.say('moheng', '我七岁那年来旧坊，就是它把我扛在肩膀上，绕着外院走了一整圈。');
    ctx.sfx('gear'); ctx.shake(0.4);
    setGuardAwake(true);
    await ctx.narr('傀儡胸口的铜纹忽然亮了——不是墨家机关那种温吞的橙光，而是一种阴冷的、近乎碧绿的光。');
    await ctx.say('wuyue', '它身上缠着鼎气！跟你那块破铜片一模一样的味道——它被侵染了！');
    const gz = R.guard.position.z;
    ctx.sfx('roar'); ctx.shake(0.5);
    await tween(500, (k) => { R.guard.position.z = gz + ease(k) * 0.5; });
    await ctx.say('铜甲傀儡', '……护……坊……');
    await ctx.say('铜甲傀儡', '擅入鼎室者——斩。');
    await ctx.say('moheng', '丙一，是我，阿衡！你不认得我了吗？');
    await ctx.say('wuyue', '没用的！它脑子里现在只剩鼎气在叫唤——阿衡，拔剑！');
    await ctx.say('moheng', '……对不住了，丙一。等这事了结，我一定亲手把你修好。');
    await ctx.battle(['guard'], { noFlee: true, intro: '护坊傀儡「丙一」挡住了去路！' });
    ctx.flags.ruinsGuardDone = true;
    // 换成残骸
    ctx.world.removeSolid(R.guardSolid);
    R.guard.visible = false;
    R.wreck.visible = true;
    R.wreckSolid = ctx.world.solidRect(WRECK_POS[0] - 0.8, WRECK_POS[1] - 0.35, WRECK_POS[0] + 0.8, WRECK_POS[1] + 0.35);
    ctx.sfx('break'); ctx.shake(0.5);
    await ctx.narr('傀儡轰然跪倒，胸甲裂开，露出层层叠叠的榫卯与铜簧。那抹碧光闪了两下，熄灭了。');
    await ctx.walk('player', 20.5, 14.4, 2);
    ctx.face('player', 'right');
    await ctx.say('moheng', '……机芯里卡着什么东西。');
    await ctx.narr('一个用油布仔细裹好的小包。里面是一册手札，和一枚刻着「坎」字的青铜钥匙。');
    ctx.give('gearkey', 1);
    await ctx.narr('手札的字迹清瘦而急促，是师叔的笔迹。');
    await ctx.narr('「三月初九。镇鼎夜鸣三声，鼎腹生光。豫州之气已醒，九鼎恐将尽出。」');
    await ctx.narr('「四月十七。山下有人打听旧坊所在。黑衣，覆面，身上带着一股水腥气。」');
    await ctx.narr('「五月初二。闭鼎室水闸，钥交丙一。除了衡儿，谁也别想从它手里拿走——这孩子小时候，它最疼他。」');
    await ctx.emote('player', '…', 1300);
    await ctx.say('moheng', '师叔……');
    await ctx.say('wuyue', '他早就料到会出事。……也早就料到，你会来。');
    await ctx.say('moheng', '水闸就在长廊尽头。走吧——师叔一定在鼎室里。');
    ctx.release();
    ctx.objective('用机关钥打开鼎室水闸');
    ctx.save();
  }

  async function openSluice(ctx) {
    await ctx.narr('青铜闸门紧紧封着鼎室的入口。闸门正中嵌着一个锁盘，凹进去一个「坎」字。');
    if (!ctx.has('gearkey')) { await ctx.say('moheng', '要钥匙才能打开……'); return; }
    await ctx.narr('机关钥嵌进锁盘，严丝合缝。墨衡用力一拧——');
    ctx.take('gearkey', 1);
    ctx.sfx('gear');
    const lock = R.sluice.userData.lock, bars = R.sluice.userData.bars;
    await tween(700, (k) => { lock.rotation.z = -ease(k) * Math.PI; });
    ctx.sfx('door'); ctx.shake(1.6);
    R.wheelBoost = 1;
    setTimeout(() => ctx.sfx('gear'), 500); setTimeout(() => ctx.sfx('gear'), 1300);
    burst([17.6, 10.2, 22.4, 11.4], '#9ad8ff', 50, [0, 3], 3000, true, 0.08);
    await tween(2600, (k) => { bars.position.y = -2.6 * ease(k); });
    for (let x = 18; x <= 21; x++) ctx.world.setCell(x, 10, 'd');
    ctx.flags.ruinsSluiceOpen = true;
    await ctx.narr('远处，外院的水车骤然转快，水声隆隆。整座旧坊的机关仿佛同时醒了过来，青铜闸门在隆隆声中缓缓沉入地槽。');
    ctx.face('wuyue', 'up');
    await ctx.emote('wuyue', '…', 900);
    await ctx.say('wuyue', '铃铛……不响了。');
    await ctx.say('wuyue', '……不对。是响得太急，连成了一片。');
    await ctx.say('moheng', '进去吧。');
    ctx.objective('进入鼎室');
  }

  async function climax(ctx) {
    const g = ctx.game, w = ctx.world;
    ctx.flags.ruinsClimax = true;
    ctx.music(null);
    ctx.remove('shishu');
    const sh = ctx.spawn({ id: 'shishu', look: 'shishu', x: SHISHU_POS[0], z: SHISHU_POS[1], dir: 'left' });
    sh.pose = 'ko';
    await ctx.pan(21, 6.6, 1.6);
    await ctx.narr('鼎室里没有点灯。只有大鼎腹中透出的青光，一明一灭，像是有什么东西在里面呼吸。');
    await ctx.narr('大鼎脚下，蜷着一个人影。');
    await ctx.say('moheng', '……师叔？');
    await ctx.emote('player', '！', 600);
    await ctx.say('moheng', '师叔——！');
    ctx.walk('wuyue', 21.0, 8.6, 4.2);
    await ctx.walkPath('player', [[21.9, 8.4], [22.1, 7.4]], 5);
    ctx.face('player', 'right');
    await ctx.wait(400);
    await ctx.say('shishu', '……咳……衡儿？');
    await ctx.say('shishu', '你这孩子……来得倒是时候。也来得，真不是时候。');
    await ctx.say('moheng', '你伤得好重……别说话，我这儿有药——');
    await ctx.say('shishu', '皮肉伤，死不了。老骨头硬着呢。');
    await ctx.say('shishu', '……你身上带着那东西吧？洛水里出来的那个。');
    ctx.sfx('seal'); ctx.flash('#bfffe8', 700, 0.5);
    R.dingPulse = 1;
    await ctx.narr('怀里的青铜残片忽然烫得像一块炭。大鼎腹中传来一声低沉的嗡鸣，与它遥遥相和。');
    await ctx.say('shishu', '果然……是豫州鼎的残片。');
    await ctx.say('moheng', '豫州鼎？九鼎之一的……那个豫州鼎？');
    await ctx.say('shishu', '禹王收九牧之金，铸九鼎，象九州。鼎在，山川百物各安其位；鼎碎，藏在纹路里的东西，就要从裂缝里爬出来。');
    await ctx.say('shishu', '这尊是墨家照古图仿铸的镇鼎，没有真鼎的神力，却听得见它们的动静。这半年，它夜夜都在鸣。');
    await ctx.say('shishu', '九鼎……正在一尊接一尊地醒过来。');
    ctx.face('wuyue', 'shishu');
    await ctx.say('wuyue', '……大巫说的，果然没错。');
    await ctx.say('shishu', '这位姑娘是？');
    await ctx.say('wuyue', '巫月，南疆巫族。——老人家，是谁把你伤成这样的？');
    await ctx.say('shishu', '一个穿黑袍的人。他说，他来自「玄冥」。');
    await ctx.say('shishu', '他要的是《九州鼎图》。墨家守了两百年的东西……图上画着九鼎沉落的地方。');
    await ctx.say('shishu', '我把图封进鼎腹，拿性命压着机关。他打不开，便说……要等。');
    await ctx.say('moheng', '等什么？');
    await ctx.say('shishu', '等一把能打开鼎腹的「钥匙」，自己送上门来——');
    await ctx.emote('shishu', '！', 700);
    sh.pose = 'hurt';
    await ctx.say('shishu', '……衡儿，快走！他等的，就是你身上的残片！');

    // —— 黑袍人现身
    ctx.music('tension');
    ctx.sfx('whoosh'); ctx.flash('#2a1030', 500, 0.6);
    await ctx.say('heipao', '晚了。');
    const hp = ctx.spawn({ id: 'heipao', look: 'heipao', x: 26.4, z: 1.6, dir: 'down' });
    hp.y = 2.4; hp.sync();
    ctx.face('player', 'heipao'); ctx.face('wuyue', 'heipao');
    await ctx.pan(24, 4.8, 1.0);
    await ctx.narr('后墙的阴影里，有人轻轻落了下来。黑袍，覆面，脚步没有一点声音。');
    ctx.sfx('dodge');
    await tween(520, (k) => { hp.z = 1.6 + k * 1.4; hp.y = 2.4 * (1 - k) + Math.sin(k * Math.PI) * 0.7; });
    hp.y = 0; ctx.shake(0.2);
    await ctx.say('heipao', '墨家的小子。九鼎，不是你们能碰的东西。');
    await ctx.say('moheng', '你就是伤了师叔的人？');
    await ctx.say('heipao', '他守着一口假鼎、一张旧图、一屋子不会动的木头，守了二十年。我不过是替他卸下担子。');
    await ctx.walk('heipao', 22.5, 3.9, 1.4);
    ctx.face('heipao', 'player');
    await ctx.say('heipao', '至于开鼎的钥匙——多谢你一路送来。');
    ctx.face('heipao', 'left');
    ctx.sfx('seal'); ctx.flash('#a8ffe8', 500, 0.55); ctx.shake(0.6);
    R.dingPulse = 1;
    await ctx.narr('他抬手虚按，墨衡怀中的残片竟自行亮起。大鼎上的饕餮纹像活了一样扭动，鼎口缓缓浮起一卷泛黄的帛图。');
    // 鼎图飞向黑袍人
    const scroll = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.66), new THREE.MeshBasicMaterial({ map: A.rubbingTex(), transparent: true, side: THREE.DoubleSide, alphaTest: 0.3 }));
    w.scene.add(scroll);
    const sHalo = A.halo('#9affd8', 1.4, 0.7); w.scene.add(sHalo);
    await tween(1500, (k) => {
      const e = ease(k);
      const up = Math.min(1, k * 2.2);
      scroll.position.set(20 + (22.3 - 20) * Math.max(0, (k - 0.45) / 0.55), 3.4 + up * 1.2 - Math.max(0, k - 0.45) * 2.6, DING[1] + (4.0 - DING[1]) * e);
      scroll.rotation.y = k * 6; sHalo.position.copy(scroll.position);
    });
    w.scene.remove(scroll); w.scene.remove(sHalo);
    await ctx.say('heipao', '《九州鼎图》，归玄冥了。');
    await ctx.say('shishu', '住手……那图上的东西，不是给人用的……');
    await ctx.say('wuyue', '想走？先问过我的铃铛！');
    await ctx.walk('wuyue', 21.6, 7.6, 5);
    ctx.sfx('fire'); ctx.flash('#ff9a6a', 300, 0.5);
    await ctx.wait(200);
    ctx.face('heipao', 'wuyue');
    ctx.sfx('whoosh'); ctx.shake(0.5); ctx.flash('#3a1a4a', 300, 0.6);
    const wy = ctx.actor('wuyue');
    const wz0 = wy.z;
    await tween(300, (k) => { wy.z = wz0 + ease(k) * 1.3; });
    await ctx.emote('wuyue', '！', 600);
    await ctx.say('heipao', '南疆的小巫女。你的大巫没教过你——别对看不透的东西出手？');
    await ctx.say('wuyue', '你……！');
    ctx.face('heipao', 'player');
    await ctx.say('heipao', '残片，我暂且寄放在你那里。');
    await ctx.say('heipao', '我倒想看看，被豫州鼎选中的，究竟是块什么料子。');
    await ctx.narr('他指间夹着一张漆黑的符纸，轻轻一弹。符纸贴上鼎身，燃起幽紫色的火。');
    // 黑符
    const tal = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.4), new THREE.MeshBasicMaterial({ color: '#120818', side: THREE.DoubleSide }));
    const tHalo = A.halo('#b060ff', 0.9, 0.9);
    w.scene.add(tal); w.scene.add(tHalo);
    ctx.sfx('whoosh');
    await tween(450, (k) => { tal.position.set(22.3 - k * 1.2, 1.6 + Math.sin(k * Math.PI) * 0.4, 4.0 + k * 1.2); tal.rotation.z = k * 9; tHalo.position.copy(tal.position); });
    w.scene.remove(tal); w.scene.remove(tHalo);
    R.dingMode = 'evil';
    ctx.sfx('roar'); ctx.shake(2.2); ctx.flash('#8a40ff', 700, 0.75);
    burst([17.5, 3, 22.5, 7], '#b070ff', 120, [0.5, 5], 4500, true, 0.14);
    await ctx.narr('残片与大鼎同时发出刺耳的长鸣。鼎口喷出浓稠的黑气，在半空凝成一张巨口、两只燃烧的眼——');
    // 饕餮之影浮现
    R.taotie.visible = true;
    await ctx.pan(20, 5.6, 0.6);
    const tm = R.taotie.userData.mat;
    await tween(1600, (k) => { const e = ease(k); tm.opacity = e * 0.92; R.taotie.scale.setScalar(0.6 + e * 0.4); R.taotie.position.y = 0.8 + e * 1.4; });
    await ctx.say('heipao', '饕餮，贪食之兽。饿了上千年……好好吃一顿吧。');
    ctx.sfx('whoosh'); ctx.flash('#1a0a20', 500, 0.8);
    burst([hp.x - 0.8, hp.z - 0.6, hp.x + 0.8, hp.z + 0.6], '#6a3aa0', 60, [0, 2.5], 2600, false, 0.16);
    ctx.remove('heipao');
    await ctx.narr('黑袍人的身影化作一缕黑烟，散进了殿顶的破洞。');
    ctx.face('player', 'up'); ctx.face('wuyue', 'up');
    await ctx.say('wuyue', '那、那是什么鬼东西——！');
    await ctx.say('shishu', '饕餮之影……鼎纹里镇了上千年的凶念！衡儿，用残片——只有残片能把它收回去！');
    await ctx.say('moheng', '巫月，护住师叔！');
    await ctx.say('wuyue', '你自己当心才是！……喂，可别死了啊！');

    // —— Boss 战
    await ctx.battle(['taotie'], {
      boss: true, noFlee: true, bg: 'boss', music: 'boss', afterMusic: 'ending',
      intro: '饕餮之影 自鼎中苏醒！',
      onStart: async () => {
        await ctx.say('shishu', '衡儿，听着！饕餮贪食，张口吞天之前必露破绽——抢在它出手前，打穿它的护甲！');
      },
      onPhase2: async () => {
        await ctx.say('wuyue', '它在吸鼎里的魂火……鼎纹变了！刚才那套打法不管用了！');
        await ctx.say('moheng', '「五行毋常胜，说在宜」——它现在怕水、怕木！巫月，用寒澜符！');
        await ctx.say('wuyue', '用不着你教！……那几团鬼火交给我，你盯紧大的！');
      },
    });
    ctx.flags.ruinsBossDone = true;
    await ending(ctx);
  }

  async function ending(ctx) {
    const w = ctx.world;
    const sh = ctx.actor('shishu');
    ctx.face('player', 'up'); ctx.face('wuyue', 'up');
    await ctx.pan(20.6, 6.0, 0.8);
    await ctx.narr('饕餮之影发出最后一声哀嚎。黑气翻卷着，被墨衡怀中的残片一口一口吸了进去。');
    ctx.sfx('seal');
    const p = w.player;
    const t0 = R.taotie.position.clone();
    const tm = R.taotie.userData.mat;
    await tween(1800, (k) => {
      const e = k * k;
      R.taotie.position.set(t0.x + (p.x - t0.x) * e, t0.y + (0.9 - t0.y) * e, t0.z + (p.z - t0.z) * e);
      R.taotie.scale.setScalar(1 - e * 0.95);
      tm.opacity = 0.92 * (1 - e * 0.7);
    });
    R.taotie.visible = false;
    R.dingMode = 'rest';
    ctx.flash('#c8fff0', 900, 0.85); ctx.sfx('chime'); ctx.shake(0.5);
    burst([p.x - 0.6, p.z - 0.4, p.x + 0.6, p.z + 0.4], '#9affe0', 50, [0.3, 2.4], 2600, true, 0.1);
    await ctx.wait(700);
    ctx.toast('<b>青铜残片</b> 发生了变化');
    await ctx.narr('铜锈片片剥落，露出底下青碧如水的铜色。残片的边缘，竟生出了半寸新的纹路——像一头兽，终于找回了自己的半张脸。');
    await ctx.say('moheng', '残片……变得完整了一些？');
    await ctx.say('shishu', '饕餮，本就是铸在豫州鼎上的凶兽。它回到它该回的地方去了。');
    if (sh) sh.pose = 'hurt';
    await ctx.say('shishu', '扶我一把。……罢了，不必，我自己站得起来。');
    if (sh) { sh.pose = null; sh.face('down'); }
    await ctx.wait(300);
    await ctx.say('shishu', '那黑袍人说得不错。我守了二十年，图还是丢了。');
    await ctx.say('moheng', '师叔……');
    await ctx.say('shishu', '可是你——你让残片认了主。这是我和你爹守了半辈子，也没等来的事。');
    await ctx.say('shishu', '你爹当年离开旧坊时说过一句话。他说，墨家的手艺，不是为了造天下最利的兵器，而是为了让天下人，不必再拿起兵器。');
    await ctx.say('shishu', '他没做完的事……看来，要落在你肩上了。');
    await ctx.say('shishu', '这把剑，是我当年给你爹铸的。他走得急，没来得及带上。');
    ctx.give('xuantie', 1);
    await ctx.narr('剑身乌沉，剑脊上刻着两个小字：「兼爱」。');
    await ctx.say('moheng', '……我会好好用它。');
    await ctx.say('shishu', '不是「好好用」，是「少用」。——懂吗？');
    await ctx.say('moheng', '嗯。兼爱，非攻。');
    await ctx.emote('shishu', '♪', 800);

    // 残片指路
    ctx.sfx('chime'); ctx.flash('#9affe0', 500, 0.4);
    R.beam.visible = true;
    R.beam.position.set(p.x, 1.0, p.z + 4.6);
    await tween(900, (k) => { R.beam.material.opacity = k * 0.55; R.beam.scale.y = 0.2 + k * 0.8; });
    await ctx.narr('就在这时，残片在墨衡掌心里微微一转。一缕青光如细丝般探出，笔直地指向南方的夜色深处。');
    await ctx.say('shishu', '九鼎之间，气脉相连。残片吞了饕餮，便能感应到下一块碎片——它在指路。');
    await ctx.say('shishu', '往南……很远的南边。过了长江，过了洞庭，是十万大山。');
    await ctx.emote('wuyue', '！', 800);
    await ctx.say('wuyue', '……南疆。');
    await ctx.say('wuyue', '是我的家。');
    await ctx.say('moheng', '巫月？');
    await ctx.say('wuyue', '大巫说过，九鼎醒时，南疆的「蛊月」会染上血色。我离开寨子那晚，月亮已经红了半边。');
    await ctx.say('wuyue', '我原以为，只要找到鼎气的源头就能回去复命……原来那源头，一直在往我家的方向指。');
    tween(900, (k) => { R.beam.material.opacity = 0.55 * (1 - k); }).then(() => { R.beam.visible = false; });
    await ctx.emote('wuyue', '…', 1200);
    ctx.face('wuyue', 'player'); ctx.face('player', 'wuyue');
    await ctx.say('wuyue', '……喂，墨衡。');
    await ctx.say('moheng', '嗯？');
    await ctx.say('wuyue', '别、别误会！我可不是要请你帮忙。');
    await ctx.say('wuyue', '只是你这块破铜片既然指着南疆，你总得有个带路的吧？南疆的瘴气，你们中原人吸一口就倒，到时候还得我把你背回来。');
    await ctx.say('wuyue', '还有，先说好——进了寨子，不许乱碰东西，不许乱吃东西，见了大巫要行礼，见了蛊罐要绕着走！');
    await ctx.emote('player', '♪', 700);
    await ctx.say('moheng', '好。那就拜托你了，巫月。');
    await ctx.say('wuyue', '……哼。知道就好。');
    await ctx.say('shishu', '呵呵……衡儿，你爹当年要是也有人这么管着，或许就不会一去不回了。');
    await ctx.say('shishu', '去吧。旧坊有我。我还得把丙一修好，再想想法子，把鼎图从玄冥手里讨回来。');
    await ctx.say('shishu', '路上记着——鼎不认人，只认心。');
    ctx.objective('前往南疆');

    // 尾声：山巅上的黑袍人
    await ctx.fadeOut(900);
    const hp = ctx.spawn({ id: 'heipao', look: 'heipao', x: 34.5, z: 2.6, dir: 'down' });
    hp.y = 3.4; hp.sync();
    ctx.flags.noEncounter = true;
    await ctx.pan(32.5, 4.4, 0.01);
    await ctx.wait(300);
    await ctx.fadeIn(1200);
    await ctx.narr('山巅之上，夜风猎猎。');
    await ctx.say('heipao', '……豫州，醒了。');
    await ctx.say('heipao', '墨家的小子，南疆的小巫女。往南走吧。');
    await ctx.say('heipao', '等到九鼎尽出的那一天，你们就会看清——这天下，本来的模样。');
    ctx.sfx('whoosh'); ctx.flash('#1a0a20', 600, 0.7);
    ctx.remove('heipao');
    ctx.flags.noEncounter = false;
    await ctx.wait(900);
    await ctx.inkOut();
    ctx.music('ending');
    await ctx.story([
      '那一夜，北山的机关灯一盏接一盏亮了起来，',
      '像是在为远行的人送别。',
      '少年掌心的残片微微发烫，',
      '指着南方——十万大山的深处。',
      '那里的月亮，已经红了半边。',
      '而在更北、更冷的地方，',
      '有人缓缓展开了一卷泛黄的帛图。',
      '!九鼎将出，天下将乱。',
    ], { hold: 2.6 });
    await ctx.chapterEnd();
  }

  // ---------- 地图定义 ----------
  return {
    id: 'ruins', spriteLift: 0.28, name: '墨家旧坊', sub: '北山 · 机关城遗址 · 黄昏', music: 'ruins', battleBg: 'ruins',
    grid: grid(F0),
    treeKind: 'pine',
    bake: true,
    padFill: '.',
    env: {
      fog: '#7a5a6c', skyTop: '#3a2c58', fogNear: 30, fogFar: 74,
      hemi: ['#c0a0c0', '#3a2420', 0.85], sun: ['#ffa060', 2.1], sunDir: [-16, 7, 4], ambient: ['#6a4a7a', 0.22],
      mountain: '#3e3452', sunDisc: '#ffc488', seed: 5,
      water: { deep: '#1e2c44', shallow: '#4a5a78', foam: '#f0c8a8' },
    },
    look: { bloom: 0.85, bloomThreshold: 0.74, tilt: 3.3, band: 0.16, focusY: 0.5, vignette: 0.52, saturation: 1.08, warm: [1.07, 0.97, 0.98], shadowTint: [0.9, 0.84, 1.14] },
    camMargin: { x0: 11, x1: 11, z0: 6.3, z1: 5.5 },
    spawns: {
      default: { x: 19.8, z: 44.8, dir: 'up' },
      fromForest: { x: 19.8, z: 44.8, dir: 'up' },
    },
    exits: [{ x0: 16, z0: 45.55, x1: 24, z1: 47, to: 'forest', spawn: 'fromRuins' }],
    encounters: { table: ENCOUNTERS.ruins, bg: 'ruins', cond: (g) => g.world.player.z > 18.8 && !g.state.flags.ruinsClimax },

    build(w, g) {
      const F = g.state.flags;
      const add = (o, x, z, opt) => w.add(o, x, z, opt);
      const scene = w.scene;

      // ===== 天色（黄昏 → 夜） =====
      const hemi = scene.children.find((o) => o.isHemisphereLight);
      const backs = scene.children.filter((o) => o.isMesh && o.material?.fog === false && o.material.map && o.position.z < -8);
      const disc = scene.children.find((o) => o.isMesh && o.geometry?.type === 'CircleGeometry' && o.position.z < -8);
      if (disc) { disc.position.x = 9; disc.position.y = 6.2; }
      const C = (h) => new THREE.Color(h);
      const DUSK = { fog: C('#7a5a6c'), sun: C('#ffa060'), sunI: 2.1, hs: C('#c0a0c0'), hg: C('#3a2420'), hi: 0.85, sky: C('#ffffff') };
      const NIGHT = { fog: C('#262640'), sun: C('#8aa0ff'), sunI: 0.8, hs: C('#5a66a0'), hg: C('#16121e'), hi: 0.6, sky: C('#525a90') };
      let dk = dayStage(F);
      const applySky = (k) => {
        scene.fog.color.lerpColors(DUSK.fog, NIGHT.fog, k);
        scene.background.copy(scene.fog.color);
        w.sun.color.lerpColors(DUSK.sun, NIGHT.sun, k);
        w.sun.intensity = DUSK.sunI + (NIGHT.sunI - DUSK.sunI) * k;
        if (hemi) { hemi.color.lerpColors(DUSK.hs, NIGHT.hs, k); hemi.groundColor.lerpColors(DUSK.hg, NIGHT.hg, k); hemi.intensity = DUSK.hi + (NIGHT.hi - DUSK.hi) * k; }
        backs.forEach((m) => m.material.color.lerpColors(DUSK.sky, NIGHT.sky, k));
        if (disc) { disc.material.opacity = 0.9 * Math.max(0, 1 - k * 1.6); disc.position.y = 6.2 - k * 3; }
      };
      applySky(dk);
      w.onUpdate((t, dt) => { const tg = dayStage(g.state.flags); if (Math.abs(tg - dk) > 0.001) { dk += (tg - dk) * Math.min(1, dt * 0.4); applySky(dk); } });

      // ===== 墙脚补齐 =====
      // 引擎里高地形（W/^/#）的方块底部悬空在 h-1.2，紧邻平地时会露出缝隙看到下面的水面，这里补上实心墙脚
      {
        const kinds = { W: [2.4, T.stoneTex(2)], '^': [3.4, T.rockSideTex(0)], '#': [1.6, T.rockSideTex(1)] };
        const lists = { W: [], '^': [], '#': [] };
        for (let z = -8; z < H + 10; z++) for (let x = -12; x < W + 12; x++) {
          let ch = w.cellRaw(x, z);
          const out = x < 0 || z < 0 || x >= W || z >= H;
          if (out && z < 0 && !'^#BW'.includes(ch)) ch = '#';
          if (lists[ch]) lists[ch].push([x, z]);
        }
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const m4 = new THREE.Matrix4();
        for (const k in lists) {
          if (!lists[k].length) continue;
          const [h, tx] = kinds[k];
          const top = h - 1.2, hh = top + 1.2;
          const tex = tx.clone(); tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, hh); tex.needsUpdate = true;
          const mat = applyOcclusionFade(new THREE.MeshLambertMaterial({ map: tex }));
          const im = new THREE.InstancedMesh(geo, mat, lists[k].length);
          lists[k].forEach(([x, z], i) => { m4.makeScale(1, hh, 1); m4.setPosition(x + 0.5, -1.2 + hh / 2 - 0.001, z + 0.5); im.setMatrixAt(i, m4); });
          im.receiveShadow = true;
          scene.add(im);
        }
      }

      // ===== 南坡 · 山门 =====
      add(P.paifang('墨家旧坊'), 20, 38.5, { fade: true });
      w.solidRect(18.3, 38.25, 18.9, 38.75); w.solidRect(21.1, 38.25, 21.7, 38.75);
      // 断裂的封条
      const sealMat = new THREE.MeshLambertMaterial({ map: A.vertTextTex('墨家封', { fg: '#a8221a', bg: '#e8dcc0', font: 'bold 22px serif', w: 30, step: 26, pad: 4 }), side: THREE.DoubleSide });
      [[18.6, -0.25, 0.3], [21.4, 0.3, -0.2]].forEach(([x, rz, ry]) => {
        const s = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.75), sealMat);
        s.position.set(x, 1.6, 38.68); s.rotation.set(0, ry, rz); scene.add(s);
      });
      const torn = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.5), sealMat); torn.rotation.x = -Math.PI / 2; torn.rotation.z = 0.8; torn.position.set(19.7, 0.02, 39.2); scene.add(torn);
      add(P.pillar({ h: 2.6, broken: true }), 16.2, 40.2, { solid: [0.6, 0.6] });
      add(P.pillar({ h: 2.6, broken: true }), 23.8, 40.0, { solid: [0.6, 0.6] });
      add(P.lantern({ light: true, intensity: 4, color: '#ffae5a' }), 17.2, 39.4, { solid: [0.3, 0.3] });
      [[11, 39.6, 1.2], [14.2, 43.6, 0.8], [27.5, 43.2, 1.1], [24.6, 41.6, 0.7], [9.5, 41, 0.9], [30.2, 39.8, 1.0], [16.4, 44.6, 0.6]].forEach(([x, z, s], i) => add(P.rock({ s, seed: i + 30, mossy: i % 2 === 0 }), x, z, { solid: [s * 0.7, s * 0.5] }));
      add(A.rubble(5, 1.0), 13.5, 39.4); add(A.rubble(9, 0.8), 26.2, 39.3);
      // 新鲜的脚印：从山门一路进外院
      const fp = [];
      for (let z = 45.2; z > 25.4; z -= 0.55) fp.push([19.6 + Math.sin(z * 0.7) * 0.25, z, Math.sin(z) * 0.2]);
      add(A.footprints(fp), 0, 0);

      // ===== 外院 =====
      // 甬道两侧的残柱与火盆
      [[17.4, 27, false], [22.6, 27, true], [17.4, 30.5, true], [22.6, 30.5, false], [17.4, 34, false], [22.6, 34, true]].forEach(([x, z, b]) => add(P.pillar({ h: 3.2, broken: b }), x, z, { solid: [0.6, 0.6], fade: true }));
      add(P.brazier(), 16.7, 36.4, { solid: [0.6, 0.6] });
      add(P.brazier(), 23.3, 36.4, { solid: [0.6, 0.6] });
      add(P.brazier(), 23.3, 25.8, { solid: [0.6, 0.6] });
      const unlit = add(P.brazier({ light: false }), 16.7, 25.8, { solid: [0.6, 0.6] });
      const uh = A.halo('#ff9a4a', 1.3, 0.55); uh.position.y = 1.35; unlit.add(uh);
      // 墨家机关灯（存档点）
      add(A.mohistLamp(), 15.3, 35.0, { solid: [0.7, 0.7] });
      // 巨齿轮（天枢轮·第三）
      const big = P.gear({ r: 1.7, teeth: 16, thick: 0.4 });
      add(big, 7.4, 28.4, { solid: [3.6, 0.8], y: 0.55 });
      big.rotation.z = 0.3; big.rotation.y = 0.12;
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.4, 8), P.MAT.darkWood()); axle.rotation.x = Math.PI / 2; axle.position.set(7.4, 0.55, 28.4); scene.add(axle);
      [[5.4, 29.6, 0.45], [9.6, 29.8, 0.3], [6.2, 27.0, 0.35]].forEach(([x, z, r], i) => { const s = P.gear({ r, teeth: 8, thick: 0.1 }); s.rotation.x = -Math.PI / 2 + 0.2; s.rotation.z = i; add(s, x, z, { y: 0.06 }); });
      // 石刻「兼爱非攻」
      add(A.carvedStone('兼爱非攻', { seed: 4 }), 11, 30.3, { solid: [1.5, 0.6], fade: true });
      // 休眠的傀儡
      add(A.slumpedPuppet(1), 5.0, 25.55, { solid: [1.0, 0.5] });
      add(A.slumpedPuppet(2), 13.4, 25.55, { solid: [1.0, 0.5] });
      add(A.fallenPuppet(3), 9.6, 34.2, { solid: [1.4, 0.7] });
      add(A.fallenPuppet(7), 24.4, 32.0, { solid: [1.4, 0.7] });
      add(A.fallenPuppet(11, { split: true }), 32.3, 33.4, { solid: [1.8, 0.7] });
      // 水车、龙口、齿轮组
      const ww = add(P.waterwheel(1.35), 32.5, 28.0, { rot: Math.PI / 2, y: -0.55, dynamic: true });
      add(A.waterSpout(1.7), 36.75, 28.0);
      const wallGears = [[30.9, 1.7, 0.62, 12, 1], [32.3, 2.15, 0.46, 9, -1.35], [33.5, 1.55, 0.36, 8, 1.72]].map(([x, y, r, n, sp]) => {
        const gg = P.gear({ r, teeth: n, thick: 0.14 }); add(gg, x, 25.12, { y, dynamic: true }); gg.userData.sp = sp; return gg;
      });
      const belt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.7, 0.06), P.MAT.darkWood()); belt.position.set(31.6, 1.0, 25.2); belt.rotation.z = -0.5; scene.add(belt);
      w.onUpdate((t, dt) => {
        R.wheelBoost = Math.max(0, R.wheelBoost - dt * 0.12);
        const sp = 0.55 * (1 + R.wheelBoost * 2.5);
        R.wheelAng = (R.wheelAng || 0) + dt * sp;
        ww.userData.wheel.rotation.z = -R.wheelAng;
        wallGears.forEach((gg) => { gg.rotation.z = R.wheelAng * gg.userData.sp; });
      });
      add(P.bridge(2.6, 2.2), 28, 33, { rot: Math.PI / 2 });
      // 散落杂物
      add(A.rubble(3, 1.1), 12.4, 26.4, { solid: [1.0, 0.6] });
      add(A.rubble(8, 0.9), 25.8, 26.3, { solid: [0.9, 0.5] });
      add(A.fallenPillar(3.2, 2), 5.0, 31.6, { solid: [3.2, 0.7] });
      add(A.brokenWall(2.4, 1.6, 4), 4.6, 34.0, { solid: [2.4, 0.7] });
      [[34.0, 36.2, 'c'], [35.0, 36.4, 'j'], [30.4, 36.6, 'j'], [3.8, 29.0, 'c'], [26.0, 36.6, 'c']].forEach(([x, z, k], i) => add(k === 'c' ? P.crate(0.55 + (i % 2) * 0.1) : P.jar(1.1, '#5a4a3a'), x, z, { solid: [0.6, 0.6] }));
      add(P.tree({ kind: 'pine', seed: 41, scale: 1.15 }), 4.4, 36.0, { solid: [0.6, 0.6], fade: true });
      add(P.tree({ kind: 'pine', seed: 43, scale: 1.0 }), 35.3, 31.0, { solid: [0.6, 0.6], fade: true });

      // ===== 中庭 · 五行机关门 =====
      R.gate = add(A.wuxingGate(), 20, 18.5, { fade: true, dynamic: true });
      if (F.ruinsGateOpen) R.gate.userData.door.position.y = -3.4;
      PED.forEach(([x, z], i) => {
        const p = add(A.pedestal(i), x, z, { solid: [0.95, 0.95] });
        R.ped.push(p);
      });
      ringsNow().forEach((e, i) => { showRing(i, e); R.gate.userData.rings[i].gear.rotation.z = -e * (Math.PI * 2 / 5); R.ped[i].userData.dial.rotation.y = -e * (Math.PI * 2 / 5); });
      if (F.ruinsGateOpen) R.ped.forEach((p) => { p.userData.solved = true; });
      add(P.stele('谜'), 12.0, 19.9, { solid: [1.1, 0.5] });
      add(P.brazier(), 17.0, 19.75, { solid: [0.6, 0.6] });
      add(P.brazier(), 23.0, 19.75, { solid: [0.6, 0.6] });
      add(P.pillar({ h: 3.4, broken: true }), 10.8, 22.6, { solid: [0.6, 0.6], fade: true });
      add(P.pillar({ h: 3.4, broken: false }), 29.2, 22.6, { solid: [0.6, 0.6], fade: true });
      // 黑符灰烬
      const ash = A.decal('#141018', 0.55, 0.75); add(ash, 25.9, 22.7);
      const frost = A.decal('#d8e4f0', 0.95, 0.22); add(frost, 25.9, 22.7);
      scene.add(particles({ count: 14, area: [25.4, 22.3, 26.4, 23.1], y: [0.05, 0.8], color: '#a060ff', size: 0.05, speed: 0.6 }));
      // 墙缺口处的残块
      add(A.rubble(12, 0.8), 15.3, 24.4); add(A.rubble(14, 0.7), 24.7, 24.5);

      // ===== 西院 · 藏书阁 =====
      add(P.house({ w: 5, d: 2.8, h: 2.2, roof: '#3a3e48', wall: '#cfc4ac', seed: 21, sign: '藏书', windows: 2, frame: '#3a2a1e' }), 5.5, 14.4, { solid: [5, 2.7], fade: true });
      add(A.ruinedShelf(3), 5.0, 17.4, { solid: [2.2, 0.6] });
      const desk = new THREE.Group();
      const dt0 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.6), P.MAT.wood()); dt0.position.y = 0.55; desk.add(dt0);
      for (const sx of [-0.5, 0.5]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.5), P.MAT.darkWood()); l.position.set(sx, 0.27, 0); desk.add(l); }
      const slips = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshLambertMaterial({ map: A.vertTextTex('五行毋常胜', { fg: '#3a2a1a', bg: '#c8a868', font: 'bold 18px serif', w: 26, step: 20, pad: 3 }) }));
      slips.rotation.x = -Math.PI / 2; slips.rotation.z = Math.PI / 2; slips.position.y = 0.6; desk.add(slips);
      desk.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
      add(desk, 7.2, 17.6, { solid: [1.2, 0.6] });
      add(A.scrollStand(), 4.0, 19.9, { solid: [1.3, 0.3] });
      add(A.fallenPillar(2.4, 6), 6.4, 22.7, { solid: [2.4, 0.6] });
      add(P.lantern({ light: true, intensity: 4.5, color: '#ffb070' }), 8.3, 18.9, { solid: [0.3, 0.3] });
      add(P.jar(1.0, '#4a4a40'), 3.6, 17.2, { solid: [0.5, 0.5] });

      // ===== 东院 · 工坊 =====
      add(P.house({ w: 5, d: 2.8, h: 2.2, roof: '#4a3a30', wall: '#d6c8ac', seed: 22, sign: '工坊', windows: 1, doorX: 0.3, frame: '#4a2a1a' }), 34, 14.4, { solid: [5, 2.7], fade: true });
      add(A.workbench(), 33.2, 18.0, { solid: [2.2, 1.0] });
      add(A.anvil(), 35.6, 18.4, { solid: [0.8, 0.5] });
      const forge = add(P.brazier(), 35.8, 20.2, { solid: [0.6, 0.6] });
      const fh = A.halo('#ff7a30', 1.8, 0.5); fh.position.y = 1.3; forge.add(fh);
      scene.add(particles({ count: 22, area: [35.3, 19.8, 36.3, 20.6], y: [1.3, 3.2], color: '#ffb050', size: 0.05, speed: 1.4 }));
      [[31.6, 16.4, 0.5], [32.3, 16.5, 0.34]].forEach(([x, z, r]) => { const gg = P.gear({ r, teeth: 10, thick: 0.1 }); gg.rotation.x = -0.35; add(gg, x, z, { y: r + 0.05 }); });
      [[31.6, 22.5, 'c'], [32.4, 22.6, 'c'], [34.4, 22.6, 'j']].forEach(([x, z, k]) => add(k === 'c' ? P.crate(0.55) : P.jar(1.0, '#6a4a3a'), x, z, { solid: [0.6, 0.6] }));

      // ===== 长廊 =====
      [[16.9, 11.6], [23.1, 11.6], [16.9, 14.6], [23.1, 14.6]].forEach(([x, z]) => add(P.pillar({ h: 2.8 }), x, z, { fade: true }));
      add(P.lantern({ light: true, intensity: 4.5, color: '#ffb070' }), 22.6, 16.8, { solid: [0.3, 0.3] });
      scene.add(A.lilyPads(16, [10.2, 11.2, 16.4, 17.6], 3));
      scene.add(A.lilyPads(16, [23.6, 11.2, 29.8, 17.6], 9));
      // 铜甲傀儡 / 残骸
      R.guard = A.spriteOf('puppetBronze', { scale: 1.25, glow: 0.35 });
      add(R.guard, GUARD_POS[0], GUARD_POS[1], { dynamic: true });
      const blob = new THREE.Mesh(new THREE.CircleGeometry(0.8, 16), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.35, depthWrite: false }));
      blob.rotation.x = -Math.PI / 2; blob.scale.y = 0.5; blob.position.y = 0.02; R.guard.add(blob);
      R.wreck = A.spriteOf('puppetBronze', { scale: 1.1, glow: 0.0, color: '#8a8a80' });
      R.wreck.userData.mesh.rotation.set(-0.55, 0, 0.35);
      R.wreck.userData.mesh.position.y = -0.4;
      add(R.wreck, WRECK_POS[0], WRECK_POS[1], { dynamic: true });
      if (F.ruinsGuardDone) { R.guard.visible = false; R.wreckSolid = w.solidRect(WRECK_POS[0] - 0.8, WRECK_POS[1] - 0.35, WRECK_POS[0] + 0.8, WRECK_POS[1] + 0.35); }
      else { R.wreck.visible = false; R.guardSolid = w.solidRect(GUARD_POS[0] - 0.8, GUARD_POS[1] - 0.4, GUARD_POS[0] + 0.8, GUARD_POS[1] + 0.4); }
      // 鼎室水闸
      R.sluice = add(A.sluiceGate(), 20, 10.5, { fade: true, dynamic: true });
      if (F.ruinsSluiceOpen) { R.sluice.userData.bars.position.y = -2.6; R.sluice.userData.lock.rotation.z = -Math.PI; }
      // 鼎室前的石栏
      for (const [x0, x1] of [[9.8, 17.6], [22.4, 30.2]]) add(A.balustrade(x1 - x0), (x0 + x1) / 2, 10.5, { fade: true });

      // ===== 鼎室 =====
      R.ding = add(P.ding({ s: 2.3, glow: true }), DING[0], DING[1], { solid: [3.0, 2.6], dynamic: true });
      R.seal = add(A.floorSeal(3.1), DING[0], DING[1]);
      add(P.brazier(), 14.6, 3.8, { solid: [0.6, 0.6] });
      add(P.brazier(), 25.4, 3.8, { solid: [0.6, 0.6] });
      [[14.6, 8.2], [25.4, 8.2]].forEach(([x, z]) => { const b = add(P.brazier({ light: false }), x, z, { solid: [0.6, 0.6] }); const h = A.halo('#ff9a4a', 1.3, 0.5); h.position.y = 1.35; b.add(h); });
      [[11.2, 3.2], [11.2, 6.0], [11.2, 8.8], [28.8, 3.2], [28.8, 6.0], [28.8, 8.8]].forEach(([x, z], i) => add(P.pillar({ h: 3.8, broken: i === 4 }), x, z, { solid: [0.6, 0.6], fade: true }));
      add(A.banner('兼爱'), 15.6, 2.08); add(A.banner('非攻'), 24.4, 2.08);
      add(A.rubble(21, 1.0), 27.4, 2.8, { solid: [1.0, 0.6] });
      add(A.rubble(23, 0.8), 12.6, 5.0, { solid: [0.8, 0.5] });
      const beamWood = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 0.3), P.MAT.darkWood()); beamWood.position.set(26.4, 0.18, 6.6); beamWood.rotation.y = 0.5; beamWood.castShadow = true; scene.add(beamWood);
      const dingLight = new THREE.PointLight('#5affd0', 9, 11, 1.4); dingLight.position.set(20, 4.0, 5.8); scene.add(dingLight);
      const dingHalo = A.halo('#5affd0', 3.6, 0.45); dingHalo.position.set(20, 3.2, 5.3); scene.add(dingHalo);
      R.taotie = A.spriteOf('taotie', { scale: 1.0, glow: 1.6, color: '#c8a8e8' });
      R.taotie.userData.mat.transparent = true; R.taotie.userData.mat.alphaTest = 0.02; R.taotie.userData.mat.opacity = 0; R.taotie.userData.mat.depthWrite = false;
      R.taotie.visible = false;
      add(R.taotie, 20, 5.0, { y: 0.8, dynamic: true });
      // 指路的青光
      R.beam = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 9), new THREE.MeshBasicMaterial({ color: '#8affe0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      R.beam.rotation.x = -Math.PI / 2; R.beam.visible = false; scene.add(R.beam);
      R.dingMode = F.ruinsBossDone ? 'rest' : 'calm';
      R.dingPulse = 0;
      const COL = { calm: [C('#5affd0'), 9], evil: [C('#b050ff'), 14], rest: [C('#8ae8d0'), 5] };
      const cur = new THREE.Color('#5affd0');
      w.onUpdate((t, dt) => {
        const [c, inten] = COL[R.dingMode];
        cur.lerp(c, Math.min(1, dt * 2));
        R.dingPulse = Math.max(0, R.dingPulse - dt * 0.8);
        const wave = 0.5 + 0.5 * Math.sin(t * (R.dingMode === 'evil' ? 5 : 1.6));
        const k = 0.75 + wave * 0.35 + R.dingPulse * 1.5;
        dingLight.color.copy(cur); dingLight.intensity = inten * k;
        dingHalo.material.color.copy(cur); dingHalo.material.opacity = 0.32 * k;
        R.ding.userData.glow.material.color.copy(cur).multiplyScalar(0.42 + wave * 0.3 + R.dingPulse * 0.4);
        R.seal.userData.mat.color.copy(cur); R.seal.userData.mat.opacity = 0.14 + 0.12 * k;
        R.seal.rotation.y = t * 0.05;
        if (R.taotie.visible) {
          R.taotie.userData.mesh.position.y = Math.sin(t * 1.3) * 0.12;
          R.taotie.userData.mesh.scale.x = 1 + Math.sin(t * 2.1) * 0.02;
        }
        if (R.guard.visible && !g.state.flags.ruinsGuardDone && g.state.flags.ruinsGateOpen) R.guard.userData.mat.emissiveIntensity = Math.max(R.guard.userData.mat.emissiveIntensity * 0.97, 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(t * 2.4)));
      });

      // ===== 氛围：雾、光束、粒子 =====
      const mists = [
        [mistLayer({ w: 80, d: 6, y: 0.4, opacity: 0.12, speed: 0.006, seed: 2, color: '#e8c8d8' }), 20, 49, 0.4],
        [mistLayer({ w: 60, d: 5, y: 0.3, opacity: 0.09, speed: 0.005, seed: 6, color: '#c8b8e8' }), 20, 31, 0.3],
        [mistLayer({ w: 40, d: 5, y: 0.25, opacity: 0.16, speed: 0.008, seed: 8, color: '#b090e0' }), 20, 6.5, 0.25],
        [mistLayer({ w: 30, d: 4, y: 0.15, opacity: 0.16, speed: -0.006, seed: 9, color: '#b8c8f0' }), 20, 14.5, 0.15],
      ];
      for (const [m, x, z, y] of mists) { w.add(m, x, z, { y }); m.rotation.x = -Math.PI / 2.6; }
      scene.add(godRays({ count: 5, area: [4, 24, 34, 36], color: '#ffb880', opacity: 0.09, seed: 3 }));
      scene.add(godRays({ count: 3, area: [14, 2, 26, 8], color: '#c8c0ff', opacity: 0.1, seed: 7 }));
      // 萤火、余烬、尘埃、妖气
      scene.add(particles({ count: 60, area: [4, 38, 36, 46], y: [0.3, 3], color: '#d8ff8a', size: 0.06, speed: 0.35 }));
      scene.add(particles({ count: 50, area: [3, 25, 37, 37], y: [0.3, 3.5], color: '#e8ffa0', size: 0.055, speed: 0.3 }));
      scene.add(particles({ count: 40, area: [14, 18, 26, 37], y: [0.5, 3.5], color: '#ffa860', size: 0.045, speed: 0.9 }));
      scene.add(particles({ count: 70, area: [3, 12, 37, 46], y: [0.2, 6], color: '#ffe0c0', size: 0.03, speed: 0.25 }));
      scene.add(particles({ count: 40, area: [10, 10, 30, 18], y: [0.2, 3], color: '#9a70ff', size: 0.06, speed: 0.4 }));
      R.miasma = particles({ count: 120, area: [10, 1, 30, 10], y: [0.2, 5], color: '#a860ff', size: 0.075, speed: 0.45 });
      scene.add(R.miasma);
      scene.add(particles({ count: 40, area: [17, 3, 23, 7.5], y: [1.5, 5], color: '#7affd8', size: 0.06, speed: 0.6 }));
      scene.add(particles({ count: 50, area: [3, 13, 9, 23], y: [0.3, 4], color: '#ffe8b0', size: 0.035, speed: 0.2 }));
      scene.add(particles({ count: 30, area: [31, 13, 37, 23], y: [0.3, 4], color: '#ffd090', size: 0.035, speed: 0.2 }));
      if (F.ruinsBossDone) R.miasma.material.uniforms.opacity.value = 0.25;
    },

    npcs: (g) => {
      const f = g.state.flags;
      if (!f.ruinsBossDone) return [];
      return [{
        id: 'shishu', look: 'shishu', x: SHISHU_POS[0] + 0.3, z: SHISHU_POS[1] + 0.3, dir: 'down',
        talk: async (ctx) => {
          const c = await ctx.ask('shishu', '衡儿，要走了？南边路远，在旧坊歇一宿再动身吧。', ['歇息一晚（恢复全员、保存进度）', '再说说话', '这就出发']);
          if (c === 0) { await ctx.fadeOut(600); ctx.healAll(); ctx.sfx('heal'); await ctx.wait(400); await ctx.fadeIn(600); ctx.save(); }
          else if (c === 1) {
            const lines = [
              '丙一的机芯我拆开看了，还有得救。等你回来，它又能把你扛上肩膀了——只怕到时候你太沉，它扛不动喽。',
              '那姑娘嘴上厉害，心是热的。南疆的规矩多，你多听她的。',
              '鼎图丢了，可图上的东西，一半在我脑子里。另一半……就靠你们去走出来了。',
              '你爹的事，等你从南疆回来，我慢慢说给你听。',
            ];
            await ctx.say('shishu', lines[Math.floor(Math.random() * lines.length)]);
          } else await ctx.say('shishu', '去吧。记着——鼎不认人，只认心。');
        },
      }];
    },

    objects: (g) => [
      // 山门匾额
      { x: 20, z: 39.3, r: 1.2, icon: '匾', async onInteract(ctx) {
        await ctx.narr('匾额上「墨家旧坊」四字笔力沉雄，相传是墨家先代钜子的手书。');
        await ctx.narr('两侧楹柱刻着一副对联，大半已被风雨磨平，只认得出下联的后半句：「……不为天下造利器，但求天下无兵戈。」');
      } },
      // 墨家机关灯（回复、存档）
      { x: 15.3, z: 35.6, r: 1.2, icon: '灯', async onInteract(ctx) {
        if (!ctx.flags.ruinsLamp) {
          ctx.flags.ruinsLamp = true;
          await ctx.narr('一盏墨家机关灯。灯芯是一枚会自己转动的小齿轮，转一圈，灯就亮一分。');
          await ctx.narr('灯座上刻着一行小字：「夜行者，于此歇脚。」');
        }
        const c = await ctx.choose(['歇息片刻（恢复全员、保存进度）', '离开']);
        if (c === 0) { await ctx.fadeOut(500); ctx.healAll(); ctx.sfx('heal'); await ctx.wait(400); await ctx.fadeIn(500); ctx.save(); }
      } },
      // 兼爱非攻
      { x: 11, z: 30.9, r: 1.3, icon: '碑', async onInteract(ctx) {
        await ctx.narr('一块天然巨石，刻着四个大字：「兼爱　非攻」。');
        await ctx.narr('刻痕极深，像是用凿子一下一下凿进去的。石缝里长满了青苔，却没有一株长进字里——有人常来清扫。');
        if (ctx.flags.ruinsLoreStone) return;
        ctx.flags.ruinsLoreStone = true;
        await ctx.say('moheng', '爹说，墨家的祖师墨子，曾经十天十夜赶到楚国，只为劝楚王不要攻宋。');
        await ctx.say('moheng', '他在楚王面前和公输班比试攻守，公输班九次攻城，九次都被他守住了。最后，楚王罢了兵。');
        await ctx.say('wuyue', '跑了十天十夜，就为了不让别人打仗？……你们墨家人，真是傻得可以。');
        await ctx.emote('wuyue', '…', 700);
        await ctx.say('wuyue', '……不过，倒也不讨厌。');
      } },
      // 巨齿轮
      { x: 7.4, z: 29.3, r: 1.5, icon: '轮', async onInteract(ctx) {
        await ctx.narr('半截埋进土里的巨大齿轮，比人还高。齿缝间长出了蕨草，铜锈绿得发黑。');
        await ctx.narr('轮辐上刻着一行小字：「天枢轮·第三。旧坊九轮，水车为心，此轮为骨。」');
        if (ctx.flags.ruinsLoreGear) return;
        ctx.flags.ruinsLoreGear = true;
        await ctx.say('moheng', '旧坊的机关全靠外院那架水车带动。水推轮，轮推轴，一环扣一环，连到每一道门、每一盏灯。');
        await ctx.say('moheng', '墨家造机关，讲究「以小力，致大用」……可惜这一轮，怕是二十年没转过了。');
      } },
      // 水车
      { x: 32.5, z: 26.2, r: 1.5, icon: '轮', async onInteract(ctx) {
        await ctx.narr('老水车吱呀吱呀地转着。山泉从东墙的铜兽口中吐出，推着它不紧不慢地走。');
        await ctx.say('moheng', '还在转……整座旧坊，就剩它还没停下。');
        if (!ctx.flags.ruinsSluiceOpen) await ctx.say('moheng', '水车的力道顺着地下的转轴传走了。内院那些大机关，应该也都靠它。');
      } },
      // 被劈开的傀儡
      { x: 32.3, z: 34.0, r: 1.4, icon: '傀', async onInteract(ctx) {
        await ctx.narr('一尊木傀儡被齐腰劈成了两半，散落一地。切口平滑，边缘焦黑，像是被什么极烫的东西一划而过。');
        await ctx.narr('断口深处，残留着一缕若有若无的紫黑色雾气。');
        if (ctx.flags.ruinsLoreSplit) return;
        ctx.flags.ruinsLoreSplit = true;
        await ctx.say('moheng', '和山门封条上的切口一样。不是刀剑……是用符火把铜木一并熔断。这得多大的力道。');
        await ctx.say('wuyue', '雾气里有股水腥味。又冷又腥，像井底的淤泥。');
        await ctx.say('wuyue', '寨子里的老人说过，北方有一路术法，借的是「死水」的力量。修这种术的人，身上永远是湿冷的。');
        await ctx.say('moheng', '背上的铭文——「护坊·丙七」。它是守外院的。……它到最后也没退。');
      } },
      // 休眠的傀儡
      { x: 9.6, z: 34.9, r: 1.3, icon: '傀', async onInteract(ctx) {
        await ctx.narr('一尊旧傀儡仰面躺在荒草里，双臂还保持着抬起的姿势，像是在睡梦里想抓住什么。');
        await ctx.narr('它胸口积满了落叶。几只萤火虫在它空洞的眼眶里一明一灭。');
        if (ctx.flags.ruinsLoreSleep) return;
        ctx.flags.ruinsLoreSleep = true;
        await ctx.say('moheng', '这种傀儡靠「机枢」驱动，只要水车还转，灌注灵力就能醒来。可它们都太老了……');
        await ctx.say('wuyue', '它们……会做梦吗？');
        await ctx.say('moheng', '爹说，好的机关师会在傀儡心口刻一句话。也许，那就是它们的梦吧。');
      } },
      // 黑符灰烬
      { x: 25.9, z: 23.2, r: 1.2, icon: '灰', async onInteract(ctx) {
        await ctx.narr('石板上有一小撮黑灰，还没被风吹散。灰烬四周的石面结了一层薄薄的白霜——在这初夏的黄昏里。');
        await ctx.narr('半片没烧尽的符角上，用朱砂写着两个字：「玄冥」。');
        if (ctx.flags.ruinsLoreAsh) return;
        ctx.flags.ruinsLoreAsh = true;
        await ctx.say('wuyue', '玄冥……');
        await ctx.say('moheng', '你知道？');
        await ctx.say('wuyue', '南疆的古歌里，玄冥是北方的神。主水，主冬……也主死。');
        await ctx.say('wuyue', '敢拿神的名字画符，要么是狂妄，要么……是真有所依仗。');
        await ctx.say('moheng', '黑袍人到过这里，却没去碰机关门。他不需要开门——他是从别的路进去的。');
      } },
      // 谜面石碑
      { x: 12.0, z: 20.5, r: 1.2, icon: '碑', async onInteract(ctx) { await readRiddle(ctx); } },
      // 机关台
      ...PED.map(([x, z], i) => ({ x, z: z + 0.6, r: 1.0, y: 2.4, icon: '轮', enabled: (gg) => !gg.state.flags.ruinsGateOpen, async onInteract(ctx) { await turnRing(ctx, i); } })),
      // 机关门
      { x: 20, z: 19.3, r: 1.3, y: 2.2, icon: '门', enabled: (gg) => !gg.state.flags.ruinsGateOpen, async onInteract(ctx) {
        const r = ringsNow().map((e) => `「${A.ELEMS[e]}」`).join('');
        await ctx.narr(`青铜门严丝合缝，三枚铜环依次显示着${r}。门缝里透出一股阴冷的气息。`);
        if (!ctx.flags.ruinsRiddleRead) await ctx.say('moheng', '光盯着门看没用。中庭里应该留了提示……那边的石碑？');
        else await ctx.say('moheng', '转动门前的三座机关台，就能改变铜环上的字。');
      } },
      // 墨经残卷
      { x: 7.2, z: 18.2, r: 1.2, icon: '卷', async onInteract(ctx) {
        await ctx.narr('半卷被虫蛀过的竹简摊在断案上，墨迹古拙，是《墨经》的抄本。');
        await ctx.narr('「五行毋常胜，说在宜。」');
        await ctx.narr('旁边有人用蝇头小楷批注：「火铄金，火多也；金靡炭，金多也。相克非恒常之理，视其多寡、因其所宜而已。机关之道亦然。——拙」');
        if (ctx.flags.ruinsLoreBook) return;
        ctx.flags.ruinsLoreBook = true;
        await ctx.say('moheng', '五行相克，没有永远的输赢，要看时势，看多寡……这是师叔的批注。');
        await ctx.say('wuyue', '哼，这道理在巫族连小孩子都懂。蛊虫相食，从来不是个头大的赢。');
        await ctx.say('moheng', '机关也是一样。一枚齿轮转得再快，卡错了位置，整座机关就停了。');
      } },
      // 九州鼎图拓片
      { x: 4.0, z: 20.5, r: 1.2, icon: '图', async onInteract(ctx) {
        await ctx.narr('一幅泛黄的拓片挂在木架上。墨色拓出九个方格，每格里都有一尊小鼎的轮廓——是《九州鼎图》的拓本。');
        await ctx.narr('正中「豫州」那一格，被朱砂重重圈了起来。旁边批着两个字：「洛水」。');
        if (ctx.flags.ruinsLoreMap) return;
        ctx.flags.ruinsLoreMap = true;
        await ctx.say('moheng', '……洛水！师叔早就知道，豫州鼎的碎片会出现在洛水？');
        ctx.sfx('chime');
        await ctx.narr('怀中的残片轻轻一颤，像是认出了什么。');
        await ctx.say('wuyue', '九个格子，九尊鼎。你们中原人可真会给自己找麻烦。');
        await ctx.say('wuyue', '左下角那一格……梁州？再往南，是不是就……');
        await ctx.say('moheng', '再往南就出了九州的图了。怎么了？');
        await ctx.say('wuyue', '……没什么。我随口一问。');
      } },
      // 师叔的工作台
      { x: 33.2, z: 18.9, r: 1.3, icon: '案', async onInteract(ctx) {
        await ctx.narr('师叔的工作台。木屑、铜屑、墨线，乱中有序。一只半成品的木鸢摊在案上，一边翅膀蒙好了绢，另一边还露着竹骨。');
        await ctx.narr('压在墨斗底下的，是一封没写完的信：');
        await ctx.narr('「衡儿：见字如面。旧坊近来不太平，你暂且不要来。若见青铜异物，切莫——」');
        await ctx.narr('字迹到这里就断了，一滴墨洇开了一大片。');
        if (ctx.flags.ruinsLoreDesk) return;
        ctx.flags.ruinsLoreDesk = true;
        await ctx.emote('player', '…', 1000);
        await ctx.say('moheng', '「切莫」……切莫什么呢，师叔。');
        await ctx.say('moheng', '半年前那封信里，你明明叫我速来的。是后来……改了主意吗？');
        await ctx.say('wuyue', '他是怕你出事吧。');
        await ctx.say('wuyue', '我们寨子的大巫也是这样。嘴上说「快去快回」，夜里却一个人坐在火塘边，一坐就是一宿。');
        await ctx.say('moheng', '……走吧。得快点找到他。');
      } },
      // 水闸
      { x: 20, z: 11.4, r: 1.4, y: 2.0, icon: '闸', enabled: (gg) => gg.state.flags.ruinsGuardDone && !gg.state.flags.ruinsSluiceOpen, async onInteract(ctx) { await openSluice(ctx); } },
      // 丙一残骸
      { x: WRECK_POS[0], z: WRECK_POS[1] + 0.5, r: 1.2, icon: '傀', enabled: (gg) => !!gg.state.flags.ruinsGuardDone, async onInteract(ctx) {
        await ctx.narr('丙一跪在长廊上，铜甲上满是裂痕。像是在守着什么，又像是在请罪。');
        await ctx.say('moheng', ctx.flags.ruinsBossDone ? '师叔说你还有得救。……等我回来，丙一。' : '等这一切结束，我一定把你修好。');
      } },
      // 大鼎（战后）
      { x: 20, z: 7.1, r: 1.6, icon: '鼎', enabled: (gg) => !!gg.state.flags.ruinsBossDone, async onInteract(ctx) {
        await ctx.narr('镇鼎静静立着，青光温润如水。鼎腹已经空了——那卷图，不在了。');
      } },
      // 宝箱
      chestObj(g.world, 'ruins1', 4.2, 26.3, [['herb', 2], ['money', 60]], P),
      chestObj(g.world, 'ruins2', 35.2, 35.4, [['yinyue', 1]], P),
      chestObj(g.world, 'ruins3', 3.9, 22.3, [['tongjing', 1], ['dew', 1]], P),
      (() => {
        const base = chestObj(g.world, 'ruins4', 36.0, 22.3, [], P);
        return { ...base, async onInteract(ctx) {
          await base.onInteract(ctx);
          await ctx.narr('箱子里叠着一副墨家机关甲，木片打磨得温润发亮。甲上系着一张纸条：');
          await ctx.narr('「给衡儿。等他长到穿得下的那天。」');
          ctx.give('jiguanjia', 1);
          await ctx.say('moheng', '……师叔。');
        } };
      })(),
      chestObj(g.world, 'ruins5', 28.4, 19.8, [['dew', 2], ['money', 80]], P),
      chestObj(g.world, 'ruins6', 6.1, 36.5, [['firebomb', 2], ['herb', 1]], P),
    ],

    triggers: () => [
      { id: 'courtyard', x0: 10, z0: 18.8, x1: 30, z1: 23.6, run: courtyard },
      { id: 'guard', x0: 16.5, z0: 10.5, x1: 23.5, z1: 16.7, once: false, cond: (gg) => gg.state.flags.ruinsGateOpen && !gg.state.flags.ruinsGuardDone, run: guardScene },
      { id: 'climax', x0: 9.5, z0: 1, x1: 30.5, z1: 9.6, once: false, cond: (gg) => gg.state.flags.ruinsSluiceOpen && !gg.state.flags.ruinsBossDone, run: climax },
    ],

    async onEnter(ctx) {
      if (!ctx.flags.ruinsArrived) await arrival(ctx);
    },
  };
}

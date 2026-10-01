// 洛水渡：洛水北岸的小渡口（序章 + 城镇）
import * as P from '../../art/props.js';
import { makeGrid, fillRect, line, scatter, toRows, chestObj } from './helpers.js';
import { mistLayer, particles, flyingBirds } from '../effects.js';
import { registerLook } from '../../art/characters.js';

registerLook('shusheng', { hair: '#2a2220', hairStyle: 'knot', band: '#e8e0cc', skin: '#f1cba6', robe: '#d8d0bc', trim: '#4a5a6a', sash: '#4a5a6a', pants: '#5a5a5a', shoes: '#2b2019', long: true });
registerLook('suanming', { hair: '#8a847a', hairStyle: 'short', skin: '#dcae86', robe: '#3a3a5a', trim: '#c9a24a', sash: '#8a2a2a', pants: '#2a2a3a', shoes: '#1f1a16', hat: 'cap', beard: '#bdb6aa', long: true });
registerLook('chuanfu', { hair: '#2a2220', hairStyle: 'short', band: '#8a3a2a', skin: '#c88a5e', robe: '#5a6a5a', trim: '#a89a7a', sash: '#3a2e22', pants: '#4a4a3a', shoes: '#2b2019', hat: 'douli' });

const W = 40, H = 30;

function grid() {
  const g = makeGrid(W, H, '.');
  fillRect(g, 0, 0, W - 1, 2, 'B');            // 北面竹林
  fillRect(g, 0, 0, 1, H - 1, '#'); fillRect(g, W - 2, 0, W - 1, 20, '#');
  fillRect(g, 0, 21, W - 1, 21, 's');          // 河岸
  fillRect(g, 0, 22, W - 1, H - 1, '~');       // 洛水
  fillRect(g, 2, 11, 37, 12, '=');             // 主街
  fillRect(g, 31, 0, 33, 10, ',');             // 北路
  fillRect(g, 15, 13, 24, 18, '=');            // 广场
  fillRect(g, 19, 19, 20, 21, ',');
  fillRect(g, 18, 22, 21, 26, 'w');            // 码头
  line(g, [[14, 17], [4, 17], [4, 20]], ',', 2);
  fillRect(g, 2, 3, 3, 9, 'B');
  scatter(g, 'f', ['.'], 0.06, 7);
  fillRect(g, 26, 14, 28, 17, 'f');
  return toRows(g);
}

export default function town(game) {
  const F = game.state.flags;
  game.registerSpeaker('shusheng', '书生', 'shusheng');
  game.registerSpeaker('suanming', '算命先生', 'suanming');
  game.registerSpeaker('chuanfu', '船夫', 'chuanfu');
  return {
    id: 'town', name: '洛水渡', sub: '洛水之畔 · 晨', music: 'town', battleBg: 'town',
    grid: grid(),
    env: { fog: '#ece0c6', skyTop: '#d6e2e6', fogNear: 30, fogFar: 78, hemi: ['#dbe8ef', '#7a6a48', 1.25], sun: ['#ffe4b8', 2.3], sunDir: [-9, 15, 11], ambient: ['#fff2dc', 0.25], mountain: '#6e8a84', sunDisc: '#fff4d8', water: { deep: '#24525c', shallow: '#4f8a8c', foam: '#e8f4ee' } },
    look: { bloom: 0.5, tilt: 3.4, band: 0.15, focusY: 0.5, warm: [1.05, 1.0, 0.9] },
    camMargin: { x0: 11.5, x1: 11.5, z0: 7, z1: 3 },
    spawns: {
      opening: { x: 20, z: 23.2, dir: 'up' },
      default: { x: 32, z: 2.2, dir: 'down' },
      fromForest: { x: 32, z: 1.6, dir: 'down' },
      home: { x: 6, z: 9.6, dir: 'down' },
    },
    exits: [{
      x0: 30.5, z0: -1, x1: 34.5, z1: 0.6, to: 'forest', spawn: 'fromTown',
      cond: (g) => g.state.flags.townGateOpen,
    }],

    build(w) {
      const add = (o, x, z, opt) => w.add(o, x, z, opt);
      // 房屋
      add(P.house({ w: 5, d: 3.5, roof: '#4b5866', seed: 1, sign: null, windows: 2 }), 6, 7, { solid: [5, 3.4], fade: true });
      add(P.house({ w: 5, d: 3.5, roof: '#3e4a5a', seed: 2, sign: '茶肆', doorX: 0.3, windows: 2, wall: '#efe6d2' }), 13.5, 7, { solid: [5, 3.4], fade: true });
      add(P.house({ w: 5, d: 3.5, roof: '#5a4a3a', seed: 3, sign: '杂货', windows: 2, wall: '#e2d6bc' }), 21, 7, { solid: [5, 3.4], fade: true });
      add(P.house({ w: 4, d: 3, roof: '#4b5866', seed: 4, windows: 1 }), 27, 6.5, { solid: [4, 2.9], fade: true });
      add(P.house({ w: 4, d: 3, roof: '#6a5238', seed: 5, windows: 1, wall: '#d8cbb0', frame: '#4a3020' }), 7, 15.5, { solid: [4, 2.9], fade: true });
      add(P.house({ w: 5, d: 3.5, roof: '#3e4a5a', seed: 6, windows: 2 }), 31, 15.6, { solid: [5, 3.4], fade: true });
      add(P.house({ w: 4, d: 3, roof: '#5a4a3a', seed: 7, windows: 2, wall: '#efe6d2' }), 36, 6.5, { solid: [4, 2.9], fade: true });
      // 牌坊
      add(P.paifang('竹海'), 32, 4.2, { fade: true });
      w.solidRect(30.3, 3.9, 30.9, 4.5); w.solidRect(33.1, 3.9, 33.7, 4.5);
      // 广场
      add(P.well(), 19.5, 15.5, { solid: [1.6, 1.6], fade: true });
      add(P.stall({ cloth: '#b8463a', flag: '茶' }), 13.5, 9.6, { solid: [2.0, 0.9] });
      add(P.stall({ cloth: '#4a6a8a', flag: '货' }), 22.5, 13.8, { solid: [2.0, 0.9] });
      add(P.stele('洛水渡'), 35.5, 13.6, { solid: [1.1, 0.5] });
      // 街灯
      [4, 10, 17, 24, 29, 36].forEach((x) => add(P.lantern({ light: true, intensity: 3.5 }), x, 10.2, { solid: [0.3, 0.3] }));
      // 树
      [[4, 19.8, 'willow'], [12, 20, 'willow'], [27, 19.8, 'willow'], [35.5, 20, 'willow'], [16.6, 3.8, 'peach'], [25.2, 3.4, 'peach'], [2.8, 13.5, 'peach'], [36.5, 9.2, 'peach'], [24.2, 17.2, 'peach'], [10.5, 3.6, 'pine'], [29.3, 2.8, 'pine'], [36, 3.5, 'pine']].forEach(([x, z, kind], i) => {
        add(P.tree({ kind, seed: i + 3, scale: kind === 'pine' ? 1.1 : 1 }), x, z, { solid: [0.6, 0.6], fade: true });
      });
      // 码头 / 船
      add(P.pier(5, 4), 19.5, 24.5);
      const boat = add(P.boat(), 23.6, 24.2, { rot: Math.PI / 2 });
      const boat2 = add(P.boat(), 9, 26.5, { rot: 0.3 });
      w.onUpdate((t) => { boat.position.y = Math.sin(t * 1.3) * 0.05 - 0.1; boat.rotation.z = Math.sin(t * 0.9) * 0.03; boat2.position.y = Math.sin(t * 1.1 + 1) * 0.05 - 0.1; boat2.position.x = 9 + Math.sin(t * 0.05) * 2; });
      // 渔家
      add(P.dryingRack(), 11, 15.2, { solid: [2.2, 0.3] });
      add(P.dryingRack(), 3.3, 18.6, { solid: [2.2, 0.3], rot: Math.PI / 2 });
      [[24.6, 9.2], [25.3, 9.5], [17.8, 9.4], [8.8, 9.3]].forEach(([x, z], i) => add(i % 2 ? P.jar(1.1, '#6a4a3a') : P.crate(0.55), x, z, { solid: [0.6, 0.6] }));
      add(P.fence(4), 4, 9.6); w.solidRect(2, 9.5, 6, 9.7);
      add(P.fence(3, 'z'), 9.6, 16.5); w.solidRect(9.5, 15, 9.7, 18);
      [[5, 21.3], [14, 21.4], [30, 21.3]].forEach(([x, z], i) => add(P.rock({ s: 0.9, seed: i + 2, mossy: true }), x, z, { solid: [0.7, 0.5] }));
      // 氛围
      const m1 = mistLayer({ w: 90, d: 9, y: 0.3, opacity: 0.18, speed: 0.008, seed: 2 }); w.add(m1, 20, 25, { y: 0.3 }); m1.rotation.x = -Math.PI / 2.6;
      const m2 = mistLayer({ w: 90, d: 7, y: 0.9, opacity: 0.12, speed: -0.005, seed: 3 }); w.add(m2, 20, 27, { y: 0.9 }); m2.rotation.x = -Math.PI / 2.6;
      w.scene.add(particles({ count: 90, area: [2, 2, 38, 22], y: [0.2, 6], color: '#f2b6c6', size: 0.09, kind: 'fall', additive: false, speed: 0.45 }));
      w.scene.add(particles({ count: 70, area: [2, 2, 38, 24], y: [0.5, 4], color: '#fff3c8', size: 0.05, speed: 0.4 }));
      // 炊烟
      [[6, 6.2], [13.5, 6.2], [27, 5.8], [7, 15], [36, 6]].forEach(([x, z], i) => {
        const sm = particles({ count: 14, area: [x - 0.2, z - 0.2, x + 0.2, z + 0.2], y: [3.6, 8.5], color: '#f2efe8', size: 0.32, kind: 'smoke', additive: false, speed: 0.8 + i * 0.1, opacity: 0.6 });
        w.scene.add(sm);
      });
      // 河上白鹭、蝴蝶
      w.add(flyingBirds({ count: 3, from: [-6, 5.5, 23], to: [46, 7, 20], period: 32, seed: 1 }), 0, 0);
      w.scene.add(particles({ count: 12, area: [24, 13, 30, 18], y: [0.3, 1.4], color: '#f6e27a', size: 0.08, speed: 0.9, additive: false }));
      w.scene.add(particles({ count: 10, area: [3, 3, 12, 10], y: [0.3, 1.4], color: '#ffffff', size: 0.07, speed: 0.9, additive: false }));
      // 河岸芦苇、荷叶
      [[2.5, 21.6], [8.6, 21.8], [16.6, 21.7], [24.6, 21.8], [33.5, 21.6], [37.5, 21.8]].forEach(([x, z], i) => w.add(P.reeds({ n: 6 + (i % 3), seed: i + 5 }), x, z));
      [[5, 23.6], [13, 24.5], [27.5, 23.4], [33, 25], [9, 25]].forEach(([x, z], i) => { const l = P.lotus({ n: 3 + (i % 3), seed: i + 2, flower: i % 2 === 0 }); w.add(l, x, z, { y: -0.19 }); });
    },

    npcs: (g) => {
      const f = g.state.flags;
      const list = [];
      // 陈伯
      list.push({ id: 'chenbo', look: 'chenbo', x: f.gotShard ? 19.5 : 19.5, z: f.gotShard ? 20.2 : 21.0, dir: 'down',
        marker: (gg) => (gg.state.flags.gotShard && !gg.state.flags.chenboBlessing ? 'main' : null),
        talk: async (ctx) => {
          if (!ctx.flags.gotShard) {
            await ctx.say('chenbo', '老周在西边河岸补网，你快去瞧瞧他捞上来的东西。');
          } else if (!ctx.flags.chenboBlessing) {
            await ctx.say('chenbo', '让我看看……这残片上的纹路，我年轻时在洛阳古董铺见过一回，是饕餮纹。');
            await ctx.say('moheng', '师叔信里说过，若见青铜异物，速去旧坊找他。陈伯，我想去一趟竹海那边。');
            await ctx.say('chenbo', '……墨家的东西，终究还是找上门来了。');
            await ctx.emote('chenbo', '…', 900);
            await ctx.say('chenbo', '你爹当年也是这样，背着机关匣就走，一走就是三年。');
            await ctx.say('chenbo', '罢了。你长大了，这渡口留不住你。这些盘缠和伤药带上，竹海里不太平，凡事多留个心眼。');
            ctx.money(80); ctx.give('herb', 3);
            await ctx.say('chenbo', '北门的阿柱那边，我已经打过招呼了。早去早回。');
            ctx.flags.chenboBlessing = true;
            ctx.objective('从北边牌坊出发，穿过竹海前往墨家旧坊');
          } else if (withYue(ctx) && !ctx.flags.yueChenbo) {
            ctx.flags.yueChenbo = true;
            await ctx.say('chenbo', '这位是……南疆来的姑娘？');
            await ctx.say('wuyue', '巫族，巫月。老人家不必拘礼。');
            await ctx.say('chenbo', '巫族……二十年前，阿衡他爹也曾说起过南疆的巫族，说那里的人能听懂山川的声音。');
            await ctx.say('chenbo', '姑娘，阿衡这孩子心实，路上劳你多照看。');
            await ctx.say('wuyue', '……嗯。我会的。');
          } else {
            const lines = ['路上饿了就吃干粮，别逞强。', '竹海的妖物怕金铁之声。你爹以前常这么说。', '早去早回啊，阿衡。'];
            await ctx.say('chenbo', lines[Math.floor(Math.random() * lines.length)]);
          }
        } });
      // 老周
      list.push({ id: 'laozhou', look: 'laozhou', x: 6.5, z: 19.2, dir: 'down',
        marker: (gg) => (!gg.state.flags.gotShard ? 'main' : null),
        talk: async (ctx) => {
          if (!ctx.flags.gotShard) return shardScene(ctx);
          await ctx.say('laozhou', '那块铜片你收好，可别再扔回河里了。昨夜我这把老骨头可是吓得不轻。');
          if (ctx.flags.chapterMid) await ctx.say('laozhou', '听说你要进竹海？那里的溺鬼专拖人下水，见了水边的影子，躲远些。');
        } });
      // 刘嫂（茶肆）
      list.push({ id: 'liusao', look: 'liusao', x: 12.2, z: 10.5, dir: 'down',
        marker: (gg) => (gg.state.flags.gotShard && !gg.state.flags.teaQuest ? 'side' : null),
        talk: async (ctx) => {
          if (!ctx.flags.gotShard) { await ctx.say('liusao', '哟，阿衡，起这么早？昨夜河上那光你瞧见没？我家那口子说是河神显灵了。'); return; }
          if (withYue(ctx) && !ctx.flags.yueLiusao) {
            ctx.flags.yueLiusao = true;
            await ctx.say('liusao', '哎呀！这不就是前天来喝茶的那位姑娘嘛！你们俩怎么凑一块儿了？');
            await ctx.say('wuyue', '……路上捡的。他非要跟着我。');
            await ctx.say('moheng', '明明是你说要盯着那块铜片——');
            await ctx.say('liusao', '哈哈哈，好好好，嫂子懂，嫂子都懂。来，这两碗茶算嫂子请的！');
            ctx.healAll(); ctx.sfx('heal');
            return;
          }
          if (!ctx.flags.teaQuest) {
            await ctx.say('liusao', '要去竹海？那你顺路帮嫂子个忙——');
            await ctx.say('liusao', '阿柱在北门守了一整夜，饭都没顾上吃。这壶桂花茶你帮我带给他，热乎着呢。');
            ctx.give('tea', 1);
            ctx.flags.teaQuest = 'carry';
            await ctx.say('liusao', '另外啊，前天有个南疆打扮的姑娘来喝茶，一身银饰叮叮当当的，打听竹海里的路……你若撞见了，多照应着点。');
            return;
          }
          const c = await ctx.ask('liusao', '要喝碗茶歇歇脚吗？桂花茶十二文一碗，喝了浑身暖洋洋。', ['来一碗（恢复全员）', '买一壶带走（12 文）', '不用了']);
          if (c === 0) { ctx.healAll(); ctx.sfx('heal'); await ctx.say('liusao', '慢慢喝，不收钱，就当给你践行了。'); }
          if (c === 1) { if (ctx.state.money >= 12) { ctx.money(-12); ctx.give('tea', 1); } else await ctx.say('liusao', '钱不够？那下回再说吧。'); }
        } });
      // 小豆（支线：机关鸟）
      list.push({ id: 'xiaodou', look: 'xiaodou', x: 18, z: 16.8, dir: 'down', wander: 1.5,
        marker: (gg) => { const q = gg.state.flags.birdQuest; return !q ? 'side' : (q === 'found' ? 'main' : null); },
        talk: async (ctx) => {
          const q = ctx.flags.birdQuest;
          if (withYue(ctx) && !ctx.flags.yueDou) {
            ctx.flags.yueDou = true;
            await ctx.say('xiaodou', '哇……姐姐头上的银角角好漂亮！会叮叮响！');
            await ctx.say('wuyue', '这叫银角，我们寨子里的姑娘长大了都要戴。……你喜欢的话，给你一个小铃铛。');
            await ctx.emote('xiaodou', '♪', 900);
          }
          if (!q) {
            await ctx.say('xiaodou', '呜呜……墨衡哥哥……');
            await ctx.say('moheng', '小豆？怎么哭鼻子了？');
            await ctx.say('xiaodou', '你给我做的机关鸟……昨晚河上闪了一道光，它扑棱棱自己飞起来，一直飞进竹海里去了！');
            await ctx.say('xiaodou', '娘不让我进竹海……哥哥你要是路过，能帮我找找吗？');
            const c = await ctx.ask('moheng', '（机关鸟自己飞走了？难道也和那道光有关……）', ['包在我身上', '我看看吧']);
            await ctx.say('xiaodou', c === 0 ? '嗯！拉钩！' : '哥哥最好了！');
            ctx.flags.birdQuest = 'active';
            ctx.toast('支线「飞走的机关鸟」开始');
          } else if (q === 'active') {
            await ctx.say('xiaodou', '机关鸟的翅膀是青色的，尾巴上有我画的小红点！');
          } else if (q === 'found') {
            await ctx.say('moheng', '小豆，你看这是什么？');
            await ctx.emote('xiaodou', '！', 800);
            await ctx.say('xiaodou', '我的机关鸟！哥哥你真的找到啦！');
            ctx.take('bird', 1);
            await ctx.say('xiaodou', '这个给你！是娘编的平安结，戴着它，妖怪就不敢欺负你了！');
            ctx.give('pinganjie', 1);
            ctx.flags.birdQuest = 'done';
            ctx.toast('支线「飞走的机关鸟」完成');
          } else {
            await ctx.say('xiaodou', '机关鸟今天又会扑翅膀了！哥哥最厉害了！');
          }
        } });
      // 阿柱（北门）
      if (!f.azhuMoved) list.push({ id: 'azhu', look: 'azhu', x: 32, z: 6.2, dir: 'down', keepFace: true,
        marker: (gg) => (gg.state.flags.teaQuest === 'carry' ? 'side' : null),
        talk: async (ctx) => {
          if (ctx.flags.teaQuest === 'carry') {
            await ctx.say('moheng', '阿柱哥，刘嫂托我给你带了壶桂花茶。');
            await ctx.say('azhu', '嘿！还是刘嫂惦记我。');
            ctx.take('tea', 1);
            await ctx.say('azhu', '……真香。阿衡，这个你拿着——我爷爷那辈从山里捡的铜镜，说能挡煞。我一个砍柴的，用不上。');
            ctx.give('tongjing', 1);
            ctx.flags.teaQuest = 'done';
          }
          if (!ctx.flags.chenboBlessing) {
            await ctx.say('azhu', '竹海这几天邪乎得很，前天老孙进去砍柴，到现在还没回来。');
            await ctx.say('azhu', '没陈伯点头，谁也别想从我这儿过去。');
          } else {
            await ctx.say('azhu', '陈伯跟我说了。你小子……真要进竹海？');
            await ctx.say('azhu', '记住，顺着石灯笼走，别离开大路。见了会动的竹子，掉头就跑！');
            await ctx.say('azhu', '要是碰见老孙，叫他赶紧回家，他媳妇都急哭了。');
            ctx.flags.townGateOpen = true;
            if (!ctx.flags.azhuStep) {
              ctx.flags.azhuStep = true;
              await ctx.walk('azhu', 30.2, 6.4, 2);
              ctx.face('azhu', 'right');
            }
          }
        } });
      else list.push({ id: 'azhu', look: 'azhu', x: 30.2, z: 6.4, dir: 'right', talk: async (ctx) => { await ctx.say('azhu', '路上小心！'); } });
      // 货郎
      list.push({ id: 'huolang', look: 'huolang', x: 22.5, z: 15, dir: 'down',
        talk: async (ctx) => {
          await ctx.say('huolang', '走过路过，不要错过！关中的好剑，南疆的符纸，洛阳的伤药，应有尽有咯！');
          await ctx.shop(['herb', 'dew', 'tea', 'incense', 'firebomb', 'qingfeng', 'pijia', 'qingyu', 'shenxing']);
          await ctx.say('huolang', '客官慢走，常来啊！');
        } });
      // 村民
      list.push({ id: 'villagerA', look: 'villagerA', x: 15.5, z: 21.3, dir: 'down',
        talk: async (ctx) => {
          await ctx.say('villagerA', '昨夜那光啊，从河底一直冲到天上，青幽幽的，像一口大鼎的形状……');
          await ctx.say('villagerA', '我奶奶说，洛水底下镇着上古的宝贝，每隔几百年就要翻一次身。可别是什么灾兆才好。');
        } });
      list.push({ id: 'villagerB', look: 'villagerB', x: 16.2, z: 14.2, dir: 'right',
        talk: async (ctx) => {
          if (!ctx.flags.lore1) {
            await ctx.say('villagerB', '后生，你听说过「九鼎」吗？');
            await ctx.say('villagerB', '大禹治水之后，收九州之金铸成九鼎，鼎上铸着天下山川百物、神魔鬼怪的图样。');
            await ctx.say('villagerB', '有鼎在，人就认得哪些是妖、哪些是神，便不会被妖物所害。');
            await ctx.say('villagerB', '后来周室衰微，九鼎沉于泗水……也有人说，那只是其中一尊。其余八尊，散落四方，至今下落不明。');
            ctx.flags.lore1 = true;
          } else await ctx.say('villagerB', '老头子我活了七十岁，头一回见洛水发光。怕是天下要不太平喽。');
        } });
      // 书生（墨家往事）
      list.push({ id: 'shusheng', look: 'shusheng', x: 11.2, z: 19.4, dir: 'down',
        talk: async (ctx) => {
          if (!ctx.flags.lore2) {
            await ctx.say('shusheng', '「兼相爱，交相利」……啊，是墨衡兄。在下正读《墨子》，读到《非攻》一篇，心有戚戚焉。');
            await ctx.say('shusheng', '你们墨家先贤，止楚攻宋，九设攻城之机而九拒之，以一人之智退一国之兵。何等气魄！');
            await ctx.say('moheng', '那都是几百年前的事了。如今墨家分作三支，各守各的旧坊，连一年一次的聚会都凑不齐人了。');
            await ctx.say('shusheng', '可惜，可惜。不过在下听说，墨家机关术里藏着一门「格物之学」，专研金石草木——连上古的青铜器，墨家都能看出门道来。');
            ctx.flags.lore2 = true;
          } else {
            await ctx.say('shusheng', '「天下兼相爱则治，交相恶则乱。」墨衡兄此去，一路平安。');
          }
        } });
      // 算命先生
      list.push({ id: 'suanming', look: 'suanming', x: 25.6, z: 15.2, dir: 'left',
        talk: async (ctx) => {
          if (withYue(ctx) && ctx.flags.fortune && !ctx.flags.yueFortune) {
            ctx.flags.yueFortune = true;
            await ctx.say('suanming', '哈！老夫说什么来着？北行遇贵人，女子，叮当作响——一字不差！');
            await ctx.say('wuyue', '……你这算命的，是不是在我进渡口那天就瞧见我了？');
            await ctx.say('suanming', '咳咳，天机，天机不可泄露。');
            return;
          }
          if (!ctx.flags.fortune) {
            await ctx.say('suanming', '这位小哥，留步！老夫观你印堂之上隐有青光，乃是……乃是大吉大凶之兆啊！');
            const c = await ctx.ask('moheng', '（大吉大凶？）', ['请先生细说（10 文）', '不必了']);
            if (c === 0 && ctx.state.money >= 10) {
              ctx.money(-10);
              await ctx.say('suanming', '嗯……乾卦九五，飞龙在天。你此行向北，必遇一位贵人，是女子，带着叮当作响的东西。');
              await ctx.say('suanming', '只是——鼎卦之象，「鼎折足，覆公餗」。小哥日后若遇大器，千万莫要贪心，器重则足折啊。');
              await ctx.say('moheng', '……先生怎知我要往北去？');
              await ctx.say('suanming', '嘿嘿，天机，天机。（其实老夫看见你从北门问路来着。）');
              ctx.flags.fortune = true;
            } else if (c === 0) {
              await ctx.say('suanming', '没钱？那……那老夫就送你一句：出门在外，钱要带够。');
            } else await ctx.say('suanming', '不信便罢，不信便罢。天机自有定数。');
          } else {
            await ctx.say('suanming', '老夫这卦，向来不准则已，一准惊人。小哥且看着吧。');
          }
        } });
      // 船夫
      list.push({ id: 'chuanfu', look: 'chuanfu', x: 21.3, z: 25.6, dir: 'down',
        talk: async (ctx) => {
          await ctx.say('chuanfu', '过河？今儿可不开船。昨夜那道光把河底的鱼都惊得往上蹦，水流也怪得很，船一下水就打转。');
          if (ctx.flags.gotShard) await ctx.say('chuanfu', '你手里那东西……靠近它，我这船桨上的铜箍都在发烫。阿衡，你可得当心些。');
        } });
      if (f.titleScreen) return [];
      return list;
    },

    objects: (g) => [
      { x: 6, z: 9.3, r: 1.3, icon: '家', async onInteract(ctx) {
        if (!ctx.flags.homeVisited) {
          ctx.flags.homeVisited = true;
          await ctx.narr('墨衡的家。屋里堆满了做到一半的机关零件，墙上挂着父亲留下的墨斗。');
          await ctx.say('moheng', '爹的旧皮甲还在箱子里……带上吧，竹海里用得着。');
          ctx.give('pijia', 1);
          await ctx.say('moheng', '（可以在菜单「装备」中换上。）');
        }
        const c = await ctx.choose(['在家休息（恢复全员、保存进度）', '离开']);
        if (c === 0) { await ctx.fadeOut(500); ctx.healAll(); ctx.sfx('heal'); await ctx.wait(400); await ctx.fadeIn(500); ctx.save(); }
      } },
      { x: 35.5, z: 14.2, r: 1.2, icon: '碑', async onInteract(ctx) {
        await ctx.narr('石碑上刻着：「洛水渡。禹王导洛，自熊耳至于此，东会于伊。」');
        await ctx.narr('碑的背面还有一行模糊的小字：「……鼎沉之处，水不寒，夜有光。」');
      } },
      { x: 19.5, z: 16.6, r: 1.3, icon: '井', async onInteract(ctx) { await ctx.narr('井水清冽，倒映着天光。井沿上被打水的绳子磨出了深深的槽。'); } },
      { x: 24.2, z: 10.6, r: 1.0, icon: '告', async onInteract(ctx) {
        await ctx.narr('渡口告示：「近日竹海多有妖物出没，樵夫孙某入山未归。行人务必结伴而行，日落前出山。——洛水渡里正」');
      } },
      chestObj(g.world, 'town1', 2.8, 15.6, [['dew', 1]], P),
      chestObj(g.world, 'town2', 37.2, 17.8, [['money', 40], ['herb', 1]], P),
      chestObj(g.world, 'town3', 26.6, 3.3, [['firebomb', 1]], P),
    ],

    triggers: (g) => [
      { id: 'gate', x0: 30.5, z0: 4.5, x1: 33.5, z1: 5.5, cond: (gg) => !gg.state.flags.chenboBlessing && gg.state.flags.gotShard, once: false,
        run: async (ctx) => {
          await ctx.say('azhu', '喂喂，阿衡！竹海可不是闹着玩的地方，没陈伯点头不许过去！');
          await ctx.walk('player', 32, 8.4);
        } },
    ],

    async prologue(ctx) {
      const g = ctx.game;
      g.world.camFocus = null;
      await ctx.pan(20, 26, 0.01);
      await ctx.wait(300);
      await g.ui.fadeBlack(false, 1600);
      ctx.banner('洛水渡', '洛水之畔 · 晨');
      await ctx.pan(20, 23, 2.5);
      await ctx.narr('洛水渡，天光未亮。河面上的雾还没有散去。');
      ctx.release();
      await ctx.wait(400);
      await ctx.say('chenbo', '阿衡——！阿衡！');
      ctx.face('player', 'up');
      await ctx.emote('player', '！', 700);
      await ctx.walk('chenbo', 19.6, 21.8, 1.6);
      await ctx.say('chenbo', '又在渡船上守了一夜？你这孩子，也不怕着凉。');
      await ctx.say('moheng', '陈伯……昨夜河上有光，我盯了半宿，一直到天快亮才没了。');
      await ctx.say('chenbo', '你也瞧见了？整个渡口都传遍了，说洛水像烧起来一样，青幽幽的。');
      await ctx.say('chenbo', '老周一早撒网，说捞上来个怪东西，正嚷嚷着找你呢。你是墨家后人，懂这些古怪物件，快去西边河岸瞧瞧。');
      ctx.objective('去西边河岸找渔夫老周');
      ctx.flags.started = true;
      ctx.toast('方向键/WASD 移动 · 空格 调查 · Esc 菜单');
      ctx.game.autosave();
    },
  };
}

const withYue = (ctx) => ctx.state.party.includes('wuyue');

async function shardScene(ctx) {
  await ctx.say('laozhou', '阿衡！你可算来了！快瞧瞧这玩意儿——');
  ctx.sfx('chime');
  await ctx.narr('老周从鱼篓里捧出一块巴掌大的青铜碎片。铜锈斑驳，却刻着狰狞的兽面纹路。');
  await ctx.say('laozhou', '邪门得很！我一撒网，它自个儿就钻进来了。夜里还嗡嗡地响，跟有活物在里头似的。');
  await ctx.say('moheng', '让我看看……');
  ctx.flash('#bfffe8', 900, 0.9);
  ctx.sfx('seal');
  ctx.shake(0.4);
  await ctx.wait(500);
  await ctx.narr('指尖触到铜片的一刹那，耳边仿佛响起了一声悠远的钟鸣——');
  await ctx.narr('「……九州……镇……」');
  await ctx.emote('player', '！', 800);
  await ctx.say('laozhou', '怎、怎么了？你脸都白了！');
  await ctx.say('moheng', '……没事。这上面是饕餮纹，至少是商周以前的东西。');
  await ctx.say('moheng', '师叔半年前来信说过：「若见青铜异物，速来旧坊。」难道指的就是这个？');
  await ctx.say('laozhou', '那你就拿去吧！这东西我可不敢留家里，我那口子昨晚做了一宿噩梦。');
  ctx.give('shard', 1);
  ctx.give('letter', 1, true);
  ctx.flags.gotShard = true;
  await ctx.say('moheng', '（墨家旧坊在竹海北边的山里……得先跟陈伯说一声。）');
  ctx.objective('回码头告诉陈伯，准备出发');
}

# 九鼎记 · 引擎与内容接口说明

Web（Three.js + Vite）HD-2D 风格 JRPG。所有美术均为代码程序化生成（像素贴图、像素人物/妖怪、低多边形道具）。

## 目录
- `src/core/game.js` 游戏主控：模式切换、剧情脚本 `ctx` 接口、地图切换、存档、标题/章节结束。
- `src/core/state.js` 存档状态（flags / party / heroes / items / equipBag / souls / money / objective / stats）。
- `src/data/db.js` 数据：角色、招式、道具、装备、妖怪、遇敌表、炼妖配方。
- `src/world/world.js` 大地图：网格地形、道具放置、碰撞、NPC、触发器、出口、遇敌、镜头。
- `src/world/maps/*.js` 地图与剧情（town 洛水渡 / forest 竹海古道 / ruins 墨家旧坊）。
- `src/world/effects.js` 水面、雾、光束、粒子、遮挡淡出、风吹摇曳。
- `src/art/*` 程序化美术：`textures.js` 贴图，`characters.js` 人物，`monsters.js` 妖怪，`props.js` 道具。
- `src/battle/*` 战斗：`battle.js` 逻辑，`skillfx.js` 招式演出，`stage.js` 战斗布景，`vfx.js` 粒子。
- `src/ui/*` 界面：对话、菜单、商店、样式。

## 坐标
x 向右（东），z 向下（南，朝向镜头），y 向上。网格 1 格 = 1 单位，格子 (cx, cz) 的中心是 (cx+0.5, cz+0.5)。镜头固定从南侧俯视，所以 **北边（z 小）是远景**，高大物体放在玩家北侧不会挡视线；南侧的高物体会自动做网点淡出。

## 地图定义（`export default function (game) { return def }`）
```js
{
  id, name, sub,                 // 地名横幅
  music: 'town'|'forest'|'ruins'|'tension'|'boss'|'ending'|'battle',
  battleBg: 'town'|'forest'|'ruins'|'boss',
  grid: [ '....', ... ],         // 每行字符串，长度一致
  env: { fog, skyTop, fogNear, fogFar, hemi: [sky, ground, intensity], sun: [color, intensity], sunDir: [x,y,z], ambient: [color, i], mountain, sunDisc, water: {deep, shallow, foam} },
  look: { bloom, tilt, band, focusY, vignette, exposure, saturation, warm: [r,g,b], shadowTint: [r,g,b] },
  camMargin: { x0, x1, z0, z1 },  // 镜头离地图边缘的最小距离（可视宽约 22、高约 13）
  padFill: '.',                   // 地图外延填充
  spawns: { default: {x,z,dir}, fromTown: {...}, ... },
  exits: [{ x0, z0, x1, z1, to: 'mapId', spawn: 'spawnName', cond?: (g) => bool }],
  encounters: { table: [['bamboo'], ['foxfire','bamboo']], bg: 'forest', cond?: (g) => bool },
  build(world, game) { ... },     // 放置道具、粒子、雾气
  npcs: (game) => [ npcDef ],
  objects: (game) => [ { x, z, r, icon: '碑', enabled?: (g)=>bool, async onInteract(ctx, obj) {} } ],
  triggers: (game) => [ { id, x0, z0, x1, z1, once?: true, cond?: (g)=>bool, async run(ctx) {} } ],
  async onEnter(ctx) {},          // 每次进入地图时运行
}
```
### 地形字符
| 字符 | 含义 | 可走 |
|---|---|---|
| `.` 草地 `f` 花草 `,` 土路 `=` 石板 `r` 苔石板 `d` 暗石板 `s` 沙 | 平地 | ✔ |
| `w` 木栈道（下面有水） | | ✔ |
| `b` 桥位（河床+可走，配合 `P.bridge`） | | ✔ |
| `~` 水 | | ✘ |
| `#` 矮崖（1.6 高）`^` 高崖（3.4）`W` 遗迹石墙（2.4） | | ✘ |
| `B` 竹林（自动生成竹子） `T` 树（自动生成树，`def.treeKind` 指定 'pine'/'peach'/'willow' 或数组） | | ✘ |
| `X` 草地上的隐形墙 `Y` 石板上的隐形墙 `o` 空 | | ✘ |

### NPC
```js
{ id, look: 'chenbo' | lookKey, x, z, dir: 'down'|'up'|'left'|'right', wander?: 半径, solid?: true,
  scale?: 1, turn?: true, keepFace?: false,
  marker?: (g) => 'main'|'side'|null,   // 头顶「！」(主线) / 「？」(支线)
  async talk(ctx, npcActor) {} }
```
人物外观在 `src/art/characters.js` 的 `LOOKS`：moheng wuyue chenbo laozhou liusao xiaodou azhu huolang villagerA villagerB shishu heipao。
新外观：`import { registerLook } from '../../art/characters.js'; registerLook('laosun', { hair, hairStyle: 'knot'|'long'|'bun'|'twinbun'|'short'|'hood', band?, skin, robe, trim, sash, pants, shoes, hat?: 'douli'|'cap', beard?, long?: bool, child?: bool, extras?: ['backpack','silver','skirt','cape','apron','axe','pack','goggles','mask'], weapon?: 'sword'|'talisman'|'none' })`。
说话人：`game.registerSpeaker('laosun', '老孙', 'laosun')`，然后就能用 `ctx.say('laosun', '...')`（会显示像素头像）。

### 剧情 ctx（所有 talk/onInteract/run/onEnter 都会拿到）
- `await ctx.say(who, text)`：who 为说话人 key（moheng wuyue chenbo laozhou liusao xiaodou azhu huolang shishu heipao villagerA villagerB，或已注册的），或任意名字字符串（无头像）。
- `await ctx.narr(text)` 旁白。`await ctx.ask(who, text, ['选项1','选项2'])` 返回序号。`await ctx.choose([...])`。
- `await ctx.wait(ms)`；`await ctx.walk(id, x, z, speed?)`（id: 'player' / 'wuyue'（跟随中的巫月）/ npc id）；`await ctx.walkPath(id, [[x,z],...])`；`ctx.face(id, 'left' | otherId)`；`await ctx.emote(id, '！'|'？'|'…'|'♪', ms)`。
- `ctx.spawn(npcDef)` 临时生成 NPC，`ctx.remove(id)`，`ctx.actor(id)` 取角色对象（`.visible`、`.x/.z`、`.pose`）。
- 镜头：`await ctx.pan(x, z, 秒)`（剧情镜头移到某处）、`ctx.release()`；`ctx.shake(秒)`；`ctx.flash(color, ms, peak)`；`await ctx.fadeOut()/fadeIn()`；`await ctx.inkOut()/inkIn()`（水墨转场）。
- 战斗：`const r = await ctx.battle(['bamboo','foxfire'], opts)` → 'win' | 'flee'（败北后玩家可在战斗内「再战」）。opts：`{ bg, tutorial: true, noFlee: true, noSeal, boss: true, intro: '文字', music: 'boss', afterMusic, drops: ['herb'], bonusExp, onStart: async (battle)=>{}, onPhase2: async (battle)=>{} }`。
- 物品：`ctx.give(id, n)`（道具或装备 id 自动区分，显示提示）；`ctx.take(id, n)`；`ctx.has(id)`；`ctx.money(n)`。
- 进度：`ctx.flags.xxx = 值`（存档内）；`ctx.objective('目标文字')`；`ctx.banner('地名','副标题')`；`ctx.save()`；`ctx.healAll()`。
- 队伍：`ctx.join('wuyue')`（NPC 变为同伴并跟随）。
- 音频：`ctx.music('tension')`，`ctx.sfx('chime'|'seal'|'roar'|'door'|'gear'|'item'|'heal'|'whoosh'|'fire'|'break'|'levelup'|'encounter'...)`。
- 演出：`await ctx.story(['竖排文字1', '!红色文字'], { hold: 2.2 })` 竖排黑底字幕。
- 商店：`await ctx.shop(['herb','dew','qingfeng',...])`。
- 章节结束：`await ctx.chapterEnd()`（显示结算画面后回到标题）。

### world（build 中使用）
- `world.add(obj, x, z, { solid: [w, d], y, rot, fade: true })`：放置 Object3D；`solid` 为碰撞矩形；`fade` 让它在挡住玩家时网点淡出（高物体建议开）。
- `world.solidRect(x0,z0,x1,z1)` 返回 rect，`world.removeSolid(rect)`。
- `world.onUpdate((t, dt) => {})` 每帧动画。
- `world.scene` 可直接 add 粒子等；`world.setCell(x,z,ch)` 运行时改地形（如打开机关门后把 `W` 改为 `r`；注意视觉需要另外处理）。

### 道具 props（`import * as P from '../../art/props.js'`）
`house({w,d,h,wall,roof,sign,door,doorX,windows,seed,frame})`、`chineseRoof(w,d,h,color)`、`lantern({hang,light,intensity})`、`tree({kind:'pine'|'peach'|'willow',scale,seed})`、`rock({s,seed,mossy})`、`fence(len,'x'|'z')`、`crate(s)`、`jar(s,color)`、`well()`、`stele(text)`、`paifang(text)`、`bridge(len,width)`（沿 z 方向）、`boat()`、`stall({cloth,flag})`、`pier(len,width)`、`dryingRack()`、`gear({r,teeth,thick})`、`ding({s,glow})`、`brazier({light})`、`pillar({h,broken})`、`wallSeg(w,h,d)`、`chest()`、`waterwheel(r)`。
宝箱快捷：`import { chestObj } from './helpers.js'`，在 `objects` 中 `chestObj(game.world, '唯一id', x, z, [['herb',2],['money',50],['qingyu',1]], P)`。
效果（`../effects.js`）：`mistLayer({w,d,y,opacity,speed,seed})`（用 world.add 放置后设置 `rotation.x = -Math.PI/2.6`）、`godRays({count,area:[x0,z0,x1,z1],color,opacity})`、`particles({count,area,y:[y0,y1],color,size,kind:'float'|'fall',additive,speed})`。

## 数据（`src/data/db.js`）
- 妖怪 ENEMIES：bamboo 竹妖、shanxiao 山魈、foxfire 狐火、nigui 溺鬼、bat 蝠妖、puppet 机关傀儡、toad 石蟾、shanxiaowang 山魈王（小头目）、guard 铜甲傀儡（小头目）、ghostfire 鼎魂火、taotie 饕餮之影（Boss）。
- 道具 ITEMS：herb 回春散、dew 清心露、incense 还魂香、firebomb 雷火弹、tea 桂花茶、strength/stoneskin/spirit 符箓、要物 bird 机关鸟 / shard 青铜残片 / letter 师叔的信 / gearkey 机关钥。
- 装备 EQUIP：tieren / xuantie / qingfeng（墨衡剑），tongling / yinyue（巫月杖），buyi / yinsi / pijia / jiguanjia（甲），pinganjie / qingyu / shenxing / shechong / tongjing（饰物）。
- 关键 flags：`gotShard` `chenboBlessing` `townGateOpen` `birdQuest`('active'|'found'|'done') `teaQuest` `sealUnlocked`（战斗中可用「炼妖·摄魂」）。

## 调试
- `npm run dev` 后打开 `http://127.0.0.1:5173/?debug`。
- 控制台：`game.debugStart({ map: 'forest', spawn: 'fromTown', flags: {...}, party: ['moheng','wuyue'], lv: 3 })`；`game.debugBattle(['taotie'], 'boss', { boss: true })`。
- 自动测试：`node tools/play.mjs steps.json 输出目录`，steps 为 `[["wait",ms],["eval","js"],["key","Space",次数],["hold","ArrowUp",ms],["mash",ms,"Space"],["shot","文件名"]]`。

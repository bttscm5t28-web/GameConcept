# 九鼎记 · 项目说明（给 Claude Code）

网页 HD-2D 风格 JRPG：《轩辕剑》式世界观 + 《八方旅人》式视觉。Three.js + Vite，纯前端，没有后端。
**所有美术、音乐、音效都由代码程序化生成**，不引入外部图片或音频素材。第一章（洛水渡 → 竹海古道 → 墨家旧坊）已完成。

## 常用命令
- `npm install`，然后 `npm run dev`（打开 http://localhost:5173），`npm run build` 打包到 `dist/`
- 改了任何游戏文本（台词、道具名等）之后，必须重新生成字体子集：`pip install fonttools brotli` 后运行 `python3 tools/subset_fonts.py`。字体只包含源码中出现过的汉字，新字不跑这一步会回退成系统字体。

## 代码结构
- `docs/ENGINE.md`：地图定义格式、剧情脚本 `ctx` 接口、道具与特效 API。**写新地图或剧情前先读它**。
- `src/core/game.js`：主控、模式切换、剧情 ctx、存档。
- `src/data/db.js`：角色、招式、道具、装备、妖怪、遇敌表、炼妖配方。
- `src/world/`：大地图引擎与地图。每张地图一个文件在 `maps/` 下，旧坊和竹海另有 `*Art.js` 专用模型；`maps/index.js` 负责注册。
- `src/battle/`：战斗逻辑（`battle.js`）、招式演出（`skillfx.js`、`fxart.js`）、布景、粒子。
- `src/art/`：程序化像素贴图、人物、妖怪、低多边形道具。
- `src/ui/`：对话、菜单、商店、样式。

## 约定
- 游戏内文本全部中文，古风但口语自然。人物性格：墨衡温和、书呆子气、有责任感；巫月骄傲嘴硬、心善、对中原人有戒心。
- 剧情进度存在 `state.flags`，一次性剧情必须用 flag 防止重复；重进地图时场景要按 flag 恢复。
- 坐标约定：镜头从南向北俯视（z 小 = 远处）。高大物体放在 `world.add(..., { fade: true })`，挡住玩家时会做网点淡出。
- 地图开 `bake: true` 后，会动或会切换显隐的物件必须标 `{ dynamic: true }`，否则会被合批固定。
- 新人物外观用 `registerLook`，说话人用 `game.registerSpeaker`。

## 测试
- `?debug`：控制台有 `game.debugStart({ map, spawn, flags, party, lv })` 和 `game.debugBattle([...], bg, opts)`。
- `?fast`：快速验证剧情逻辑。对话跳过并打印 `[剧情]` 日志，选项选第 0 项（加 `&pick=1` 选第 1 项），战斗直接判胜，演出瞬间完成。
- 自动化截图与操作：`node tools/play.mjs steps.json 输出目录 [url] [宽] [高]`，步骤格式见 `docs/ENGINE.md`。本地需要先运行 `npx playwright install chromium`，或者设置 `CHROME_PATH` 指向本机的 Chrome。
- 在有显卡的本地浏览器里可以正常 60fps 游玩。之前的云端环境只有软件渲染（约 1fps），所以**真实手感、战斗难度、音乐听感都还没有人工实测过**，值得优先亲自玩一遍。

## 待办 / 方向
- 实机通关一遍，校准战斗难度（尤其山魈王、铜甲傀儡、饕餮之影）和遇敌频率。
- 第二章「南疆蛊月」：巫月的故乡，残片指向的下一块九鼎碎片；反派组织「玄冥」与黑袍人。

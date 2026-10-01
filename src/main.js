import { Game } from './core/game.js';

// 先加载本地书法字体，保证匾额、旗帜等画布文字使用正确字形
const fontsReady = Promise.race([
  Promise.all([document.fonts.load('24px JDKai', '九鼎记洛水渡'), document.fonts.load('16px JDSerif', '墨衡')]),
  new Promise((r) => setTimeout(r, 2500)),
]);
fontsReady.then(() => {
  const game = new Game();
  game.start();
});

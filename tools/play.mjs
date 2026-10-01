// 自动游玩测试：node tools/play.mjs steps.json outdir
import { chromium } from 'playwright';
import fs from 'fs';
const [stepsFile, outDir = '.', url = 'http://127.0.0.1:5173/?debug&dtcap=0.25', vw = '1280', vh = '720'] = process.argv.slice(2);
const steps = JSON.parse(fs.readFileSync(stepsFile, 'utf8'));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: +vw, height: +vh }, ignoreHTTPSErrors: true });
const logs = [];
page.on('console', (m) => { if (m.type() !== 'debug') logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + '\n' + e.stack));
await page.goto(url, { waitUntil: 'domcontentloaded' });
for (const s of steps) {
  const [cmd, a, b] = s;
  if (cmd === 'wait') await page.waitForTimeout(a);
  else if (cmd === 'key') { for (let i = 0; i < (b || 1); i++) { await page.keyboard.press(a); await page.waitForTimeout(120); } }
  else if (cmd === 'hold') { await page.keyboard.down(a); await page.waitForTimeout(b); await page.keyboard.up(a); }
  else if (cmd === 'shot') await page.screenshot({ path: `${outDir}/${a}.png`, timeout: 180000 });
  else if (cmd === 'eval') { try { const r = await page.evaluate(a); if (r !== undefined) console.log('eval:', JSON.stringify(r)); } catch (e) { console.log('evalerr', e.message); } }
  else if (cmd === 'mash') { const end = Date.now() + a; while (Date.now() < end) { await page.keyboard.press(b || 'Space'); await page.waitForTimeout(250); } }
}
console.log(logs.filter((l) => !l.includes('ERR_') && !l.includes('fonts')).slice(0, 30).join('\n'));
await browser.close();

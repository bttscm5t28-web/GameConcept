// 用法: node tools/shot.mjs <url> <out.png> [waitMs] [w] [h] [evalJs]
import { chromium } from 'playwright';
const [url, out, wait = '1500', w = '1280', h = '720', js] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, ignoreHTTPSErrors: true });
const logs = [];
page.on('console', (m) => logs.push(m.type() + ': ' + m.text()));
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(+wait);
if (js) { try { const r = await page.evaluate(js); if (r !== undefined) console.log('eval:', JSON.stringify(r)); } catch (e) { console.log('evalerr', e.message); } await page.waitForTimeout(1500); }
await page.screenshot({ path: out });
console.log(logs.slice(0, 40).join('\n'));
await browser.close();

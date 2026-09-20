// 无头烟测：ZCode 内置浏览器在窗口后台时 rAF 被冻结、引擎起不来（AGENTS.md 已知坑），
// 用系统 Chrome --headless 走 CDP 驱动游戏并截图，不依赖窗口前台。
// 用法：node tools/smoke_headless.mjs <url> <outDir>
//   [steps] 可选，默认 login->home->battle 全流程
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = process.argv[2];
const outDir = resolve(process.argv[3] || 'gen-output/smoke');
if (!url) { console.error('need url'); process.exit(1); }
mkdirSync(outDir, { recursive: true });
const profile = join(outDir, '.chrome-profile');
rmSync(profile, { recursive: true, force: true });

const chrome = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=9333',
  `--user-data-dir=${profile}`,
  '--window-size=540,960',
  '--enable-unsafe-swiftshader',
  '--hide-scrollbars', '--mute-audio', '--no-first-run',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });
chrome.stderr.on('data', d => process.stderr.write(d));

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function findPageWs(tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
      const page = list.find(t => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(500);
  }
  throw new Error('devtools endpoint not up');
}

const wsUrl = await findPageWs();
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let seq = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
};
function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => pending.set(id, (m) => m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result)));
}
async function evalJs(expression, awaitPromise = false) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result?.value;
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(outDir, name + '.png'), Buffer.from(r.data, 'base64'));
  console.log('shot:', name);
}
// 轮询直到谓词为真
async function waitUntil(expression, timeoutMs, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { if (await evalJs(expression)) return true; } catch {}
    await sleep(1000);
  }
  console.log('timeout waiting:', label);
  return false;
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 540, height: 960, deviceScaleFactor: 2, mobile: true });

// 1. 进游戏
await send('Page.navigate', { url });
await waitUntil(`!!document.querySelector('canvas')`, 20000, 'canvas');
await waitUntil(`!!document.querySelector('.lgStart')`, 30000, 'lgStart');
await sleep(1500);
await shot('01-login');

// 2. 点开始 → 等主城
await evalJs(`document.querySelector('.lgStart')?.click(); 1`);
await waitUntil(`!!document.querySelector('.popClose') || !!document.querySelector('[class*=topbar]')`, 30000, 'home popup/topbar');
await sleep(2000);
// 首弹关闭（可能有多层，逐个关到没有）
for (let i = 0; i < 3; i++) {
  const has = await evalJs(`!!document.querySelector('.popClose')`);
  if (!has) break;
  await evalJs(`document.querySelector('.popClose')?.click(); 1`);
  await sleep(1200);
}
await sleep(1500);
await shot('02-home');

// 2b. 开公告弹层验证面板底板/绶带/喇叭图标
await evalJs(`document.querySelector('.homeNoticeBtn')?.click(); 1`);
await sleep(2000);
await shot('02b-notice-pop');
await evalJs(`document.querySelector('.popClose')?.click(); 1`);
await sleep(1200);

// 2c. 二级页签贴图核对（ART-PLAN D20：接线轮必须验贴图真的上了屏，代码接了不算）
//     三条判据一起看：backgroundImage 是 url(...) = 图挂上了；glyph 被摘成空串 = icon() 走过；
//     宽度非零 = CSS 尺寸令牌生效（贴图槽宽度归 CSS，读不到 --pw 时会量出 0）。
const tabProbe = (sel) => evalJs(`JSON.stringify([...document.querySelectorAll('${sel} .ticon')].map(ic => {
  const cs = getComputedStyle(ic);
  return (ic.parentElement.textContent || '').trim() + '|bg=' + (/url\\(/.test(cs.backgroundImage) ? 'Y' : 'N')
    + '|glyph=' + JSON.stringify(ic.textContent) + '|w=' + Math.round(ic.getBoundingClientRect().width);
}))`);
const gotoTab = (name) => evalJs(`(() => {
  const el = [...document.querySelectorAll('#homeUi .tab')].find(e => (e.textContent || '').indexOf('${name}') >= 0);
  if (!el) return 'NOT FOUND';
  el.click(); return (el.textContent || '').trim();
})()`);
console.log('nav ->', await gotoTab('商店'));
await sleep(2500);
console.log('shopTabs:', await tabProbe('.shopTabs'));
await shot('02c-shop-tabs');
console.log('nav ->', await gotoTab('英雄'));
await sleep(2500);
console.log('bagTabs:', await tabProbe('.bagTabs'));
await shot('02d-bag-tabs');

// 3. 找护送入口进玩法页（按文本找：护送）
const navDump = await evalJs(`JSON.stringify([...document.querySelectorAll('button,[class*=btn],[class*=tab],[class*=nav] i, [class*=nav] span')].map(e => (e.className + '|' + (e.textContent || '').trim().slice(0, 10))).slice(0, 60))`);
console.log('nav candidates:', navDump);
const clickedNav = await evalJs(`(() => {
  const els = [...document.querySelectorAll('button,[class*=btn],[class*=tab],[class*=nav] *')];
  const el = els.find(e => /护送/.test((e.textContent || '').trim()) && e.children.length <= 3);
  if (!el) return 'NOT FOUND';
  const t = el.className + '|' + (el.textContent || '').trim().slice(0, 10);
  el.click(); return t;
})()`);
console.log('clicked nav:', clickedNav);
await sleep(2500);
await shot('03-escort-page');

// 4. 点出战进战斗
const clickedStart = await evalJs(`(() => {
  const els = [...document.querySelectorAll('button,[class*=btn],[class*=start],[class*=cta]')];
  const el = els.find(e => /出战|开始|挑战|出击/.test((e.textContent || '').trim()));
  if (!el) return 'NOT FOUND';
  const t = el.className + '|' + (el.textContent || '').trim().slice(0, 10);
  el.click(); return t;
})()`);
console.log('clicked start:', clickedStart);
await sleep(2000);
// 可能有出战确认弹层 → 再点一次出战
await evalJs(`(() => {
  const els = [...document.querySelectorAll('button,[class*=btn]')];
  const el = els.find(e => /出战|开始/.test((e.textContent || '').trim()));
  if (el) el.click();
  return 1;
})()`);
// 等战斗 HUD / 场景
await waitUntil(`!!document.querySelector('[class*=hud]')`, 25000, 'battle hud');
await sleep(6000);
await shot('04-battle');
// 若停在升级选卡（Cocos canvas 渲染，DOM 点不到）→ 直接对画布卡片坐标点击
async function tap(x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}
// 击杀数（DOM HUD）在涨 = 战斗在跑；停了 = 升级选卡又弹了 → 点卡
async function kills() {
  return await evalJs(`(() => { const m = (document.body.innerText || '').match(/击杀[^0-9]*(\\d+)/); return m ? +m[1] : -1; })()`);
}
let lastK = -1, shot1 = false, shot2 = false, t05 = 0;
for (let i = 0; i < 60 && !shot2; i++) {
  await sleep(1200);
  const k = await kills();
  const inc = k > lastK;
  lastK = k;
  if (!inc) { await tap([270, 110, 430][i % 3], 505); continue; }
  // 在跑：第一次涨 → 截 05；再涨一次且离 05 有 4s+ → 截 06
  if (!shot1) { await sleep(1500); await shot('05-battle-later'); shot1 = true; t05 = Date.now(); continue; }
  if (!shot2 && Date.now() - t05 > 4000) { await shot('06-battle-more'); shot2 = true; }
}
if (!shot2) await shot('06-battle-more');

// 7. 伤害统计面板：名次奖牌贴图核对（同 D20）。三档应有图且数字留在环心，第 4 名应保持 CSS 板
await evalJs(`document.querySelector('.statsBtn')?.click(); 1`);
await sleep(2200);
console.log('statRank:', await evalJs(`JSON.stringify([...document.querySelectorAll('#domHud .statRank')].map(e => {
  const cs = getComputedStyle(e);
  return e.textContent.trim() + '|bg=' + (/url\\(/.test(cs.backgroundImage) ? 'Y' : 'N')
    + '|ink=' + cs.color + '|fs=' + cs.fontSize + '|w=' + Math.round(e.getBoundingClientRect().width);
}))`));
await shot('07-stats-medals');

ws.close();
chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
console.log('done');
process.exit(0);

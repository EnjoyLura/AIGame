// 界面表面普查：把主城各页 + 战斗 HUD 里所有「可点/有底」的元素拉一份实况清单。
// 用途：美术进版按类别规划时，先看清哪些面已经有贴图、哪些还是 CSS 渐变或纯色，
// 以及每一面的实际盒子尺寸——尺寸决定一张图该出多大、九宫格该切多厚。
// 用法：node tools/audit_ui_surfaces.mjs <url> [out.json]
//   需要在 127.0.0.1:7456 已起 serve.mjs（node tools/serve.mjs build/web-mobile 7456 127.0.0.1）
import { spawn } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = process.argv[2];
const out = resolve(process.argv[3] || 'gen-output/ui-surfaces.json');
if (!url) { console.error('need url'); process.exit(1); }
const profile = join(process.cwd(), '.audit-profile');
rmSync(profile, { recursive: true, force: true });

const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9334', `--user-data-dir=${profile}`,
  '--window-size=540,960', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio',
  '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function findWs(tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const l = await (await fetch('http://127.0.0.1:9334/json/list')).json();
      const p = l.find(t => t.type === 'page');
      if (p) return p.webSocketDebuggerUrl;
    } catch {}
    await sleep(500);
  }
  throw new Error('devtools endpoint not up');
}
const wsUrl = await findWs();
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0;
const pending = new Map();
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => pending.set(id, m => m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result)));
}
async function evalJs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result?.value;
}
async function until(expr, ms, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evalJs(expr)) return true; } catch {} await sleep(800); }
  console.log('  timeout:', label);
  return false;
}

// 一个元素 = 一条记录：类名、文字、盒子、圆角、有没有贴图背景、有没有九宫格、有没有边框/渐变
const PROBE = `(() => {
  const sel = 'button, [class*=btn], [class*=Btn], .hot, .tab, .gTagTop, .bk, .pt i, .q, .add, .tinyIcon, .gBuy, .popBtn, .side-tools .hot, .hero-quick .btn, .hero-tools .hot';
  const seen = new Set();
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    const cs = getComputedStyle(el);
    const b = el.getBoundingClientRect();
    if (b.width < 6 || b.height < 6) continue;
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;
    const cls = (el.className && typeof el.className === 'string' ? el.className : '').trim();
    const txt = (el.textContent || '').trim().slice(0, 14);
    const id = el.tagName + '|' + cls + '|' + txt;
    if (seen.has(id)) continue;
    seen.add(id);
    const bgImg = cs.backgroundImage || 'none';
    out.push({
      tag: el.tagName, cls, txt,
      w: Math.round(b.width), h: Math.round(b.height),
      radius: cs.borderTopLeftRadius,
      border: cs.borderTopWidth + ' ' + cs.borderTopStyle + ' ' + cs.borderTopColor,
      tex: /url\\(/.test(bgImg) ? 'bg' : (cs.borderImageSource && cs.borderImageSource !== 'none' ? 'nine' : '-'),
      grad: /gradient/.test(bgImg) ? 1 : 0,
      color: cs.color, bg: cs.backgroundColor,
    });
  }
  return JSON.stringify(out);
})()`;

const PAGES = ['商店', '英雄', '护送', '行动', '基地'];
const result = {};
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 540, height: 960, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url });
await until(`!!document.querySelector('.lgStart')`, 30000, 'login');
await sleep(1200);
await evalJs(`document.querySelector('.lgStart')?.click(); 1`);
await until(`!!document.querySelector('#homeUi .tab')`, 30000, 'home nav');
for (let i = 0; i < 3; i++) {
  if (!await evalJs(`!!document.querySelector('.popClose')`)) break;
  await evalJs(`document.querySelector('.popClose')?.click(); 1`);
  await sleep(900);
}
await sleep(1200);
// 按导航按钮的文字点页（原来用类名猜 key，五页都落在同一页上）
for (const label of PAGES) {
  const hit = await evalJs(`(() => {
    const el = [...document.querySelectorAll('#homeUi .tab')].find(e => (e.textContent || '').indexOf('${label}') >= 0);
    if (!el) return 'NOT FOUND';
    el.click(); return (el.textContent || '').trim();
  })()`);
  await sleep(1800);
  const faces = JSON.parse(await evalJs(PROBE));
  result[label] = faces;
  console.log(String(hit).padEnd(8), faces.length, 'faces');
}
// 战斗 HUD：进战后要等升级选卡走完，否则 HUD 被暂停面板盖住、量不到面
await evalJs(`(() => { const el=[...document.querySelectorAll('#homeUi .tab')].find(e=>(e.textContent||'').indexOf('护送')>=0); el&&el.click(); return 1; })()`);
await sleep(1200);
await evalJs(`(() => { const el=[...document.querySelectorAll('button,[class*=btn]')].find(e=>/出战|开始|出击/.test(e.textContent||'')); el&&el.click(); return 1; })()`);
await until(`!!document.querySelector('#domHud .hudBtn')`, 30000, 'battle hud');
await sleep(4000);
// 击杀数在涨才说明真在跑；停了就点一下画布中央区域把升级卡选掉
async function kills() {
  return await evalJs(`(() => { const m = (document.body.innerText || '').match(/击杀[^0-9]*(\\d+)/); return m ? +m[1] : -1; })()`);
}
async function tap(x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}
let lastK = -1;
for (let i = 0; i < 25; i++) {
  await sleep(1200);
  const k = await kills();
  if (k > lastK) break;
  lastK = k;
  await tap([270, 110, 430][i % 3], 505);
}
await sleep(2500);
result['domHud'] = JSON.parse(await evalJs(PROBE));
console.log('domHud  ', result.domHud.length, 'faces');
writeFileSync(out, JSON.stringify(result, null, 1), 'utf-8');
console.log('written:', out);
ws.close();
chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);

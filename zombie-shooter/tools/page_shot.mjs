// 单页取景器：无头进游戏 → 关首弹 → 切到指定主城页签 → 截图，并把该页「贴了图的面」列一份清单。
// 用途：美术按类别进版的自测（ART-PLAN D20：接了代码不算，要验贴图真的上了屏）。
// 用法：node tools/page_shot.mjs <url> <页签名|home> <out.png> [要再点的文案片段]
//   需要 127.0.0.1:7456 已起 serve.mjs（node tools/serve.mjs build/web-mobile 7456 127.0.0.1）
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = process.argv[2];
const page = process.argv[3];
const out = resolve(process.argv[4] || 'gen-output/page.png');
const extra = process.argv[5];
if (!url || !page) { console.error('need url + page'); process.exit(1); }
mkdirSync(dirname(out), { recursive: true });

const profile = join(process.cwd(), '.shot-profile');
rmSync(profile, { recursive: true, force: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9335', `--user-data-dir=${profile}`,
  '--window-size=540,960', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio',
  '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });
chrome.stderr.on('data', d => process.stderr.write(d));

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function findWs(tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const l = await (await fetch('http://127.0.0.1:9335/json/list')).json();
      const p = l.find(t => t.type === 'page');
      if (p) return p.webSocketDebuggerUrl;
    } catch {}
    await sleep(500);
  }
  throw new Error('devtools endpoint not up');
}
const ws = new WebSocket(await findWs());
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
  if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result?.value;
}
async function waitUntil(expr, ms, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (await evalJs(expr)) return true; } catch {}
    await sleep(800);
  }
  console.log('timeout waiting:', label);
  return false;
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 540, height: 960, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url });
await waitUntil(`!!document.querySelector('.lgStart')`, 40000, 'lgStart');
await sleep(1200);
await evalJs(`document.querySelector('.lgStart')?.click(); 1`);
await waitUntil(`!!document.querySelector('[class*=topbar]')`, 30000, 'home');
await sleep(1800);
for (let i = 0; i < 3; i++) {
  if (!await evalJs(`!!document.querySelector('.popClose')`)) break;
  await evalJs(`document.querySelector('.popClose')?.click(); 1`);
  await sleep(1200);
}
if (page !== 'home') {
  const clicked = await evalJs(`(() => {
    const el = [...document.querySelectorAll('#homeUi .tab')].find(e => (e.textContent || '').indexOf('${page}') >= 0);
    if (!el) return 'NOT FOUND';
    el.click(); return (el.textContent || '').trim();
  })()`);
  console.log('nav ->', clicked);
  await sleep(2600);
}
if (extra) {
  const also = await evalJs(`(() => {
    const el = [...document.querySelectorAll('#homeUi button, #homeUi .btn, #homeUi .hot, #homeUi .tab')]
      .find(e => (e.textContent || '').indexOf('${extra}') >= 0);
    if (!el) return 'NOT FOUND';
    el.click(); return (el.textContent || '').trim();
  })()`);
  console.log('click ->', also);
  await sleep(2200);
}
// 该页所有「面」的实况：贴了九宫格板 / 有背景图 / 都没有（还是 CSS 渐变或纯色）
const faces = await evalJs(`JSON.stringify([...document.querySelectorAll('#homeUi *')].map(e => {
  const cs = getComputedStyle(e);
  const b = e.getBoundingClientRect();
  if (b.width < 18 || b.height < 12) return null;
  const nine = /url\\(/.test(cs.borderImageSource);
  const bg = /url\\(/.test(cs.backgroundImage);
  if (!nine && !bg && cs.backgroundColor === 'rgba(0, 0, 0, 0)' && !/gradient/.test(cs.backgroundImage) && !cs.borderColor.startsWith('rgb')) return null;
  return { cls: e.className || '(无类名)', txt: (e.textContent || '').trim().slice(0, 14),
    w: Math.round(b.width), h: Math.round(b.height), nine, bg,
    grad: /gradient/.test(cs.backgroundImage), bw: cs.borderTopWidth, bc: cs.borderTopColor };
}).filter(Boolean))`);
const list = JSON.parse(faces);
console.log(`\n===== ${page} 有底的面 ${list.length} 块：九宫格 ${list.filter(f => f.nine).length} / 背景图 ${list.filter(f => f.bg && !f.nine).length} / 纯色渐变 ${list.filter(f => !f.nine && !f.bg).length}`);
for (const f of list) {
  const tag = f.nine ? '九宫格' : f.bg ? '背景图' : (f.grad ? '渐变' : '纯色');
  console.log(`   ${f.cls}｜${f.txt}  ${f.w}x${f.h} ${tag}${f.bw !== '0px' ? ' bd=' + f.bw + ' ' + f.bc : ''}`);
}
const r = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(out, Buffer.from(r.data, 'base64'));
console.log('written:', out);
chrome.kill();
// Chrome 退出慢半拍，profile 目录会短暂占用；清不掉不影响本次取景，忽略即可
try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);

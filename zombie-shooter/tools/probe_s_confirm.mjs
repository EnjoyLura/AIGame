// S 档确认框探针：登录 → 设置弹层 → 点危险键「重置全部存档」→ 截 _popConfirm 的 S 面板。
// game-ux 稿 §1（S 去底栏、双键并入内容尾 46/54）的实景自测；一次性探针，不进每轮链。
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = process.argv[2];
const outDir = resolve(process.argv[3] || 'gen-output/probe-s');
if (!url) { console.error('need url'); process.exit(1); }
mkdirSync(outDir, { recursive: true });
const profile = join(outDir, '.chrome-profile');
rmSync(profile, { recursive: true, force: true });

const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9334', `--user-data-dir=${profile}`,
  '--window-size=540,960', '--enable-unsafe-swiftshader', '--hide-scrollbars',
  '--mute-audio', '--no-first-run', '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', 'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });
chrome.stderr.on('data', () => {});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function findPageWs(tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:9334/json/list')).json();
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
let seq = 0; const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => pending.set(id, (m) => m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result)));
}
async function evalJs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result?.value;
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(outDir, name + '.png'), Buffer.from(r.data, 'base64'));
  console.log('shot:', name);
}
async function waitUntil(expression, timeoutMs, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { if (await evalJs(expression)) return true; } catch {}
    await sleep(800);
  }
  console.log('timeout waiting:', label);
  return false;
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 540, height: 960, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url });
await waitUntil(`!!document.querySelector('canvas')`, 20000, 'canvas');
await waitUntil(`!!document.querySelector('.lgStart')`, 30000, 'lgStart');
await sleep(1500);
await evalJs(`document.querySelector('.lgStart')?.click(); 1`);
await waitUntil(`!!document.querySelector('#homeUi .topbar')`, 30000, 'home topbar');
await sleep(2000);
for (let i = 0; i < 3; i++) {
  if (!(await evalJs(`!!document.querySelector('#homeUi .popClose')`))) break;
  await evalJs(`document.querySelector('#homeUi .popClose')?.click(); 1`);
  await sleep(1000);
}

// 设置弹层（tinyIcon 第 3 枚）→ 里面找「重置全部存档」危险键点下去 → S 确认框
await evalJs(`[...document.querySelectorAll('#homeUi .tinyIcon')][2]?.click(); 1`);
await sleep(1500);
const clicked = await evalJs(`(() => {
  const btn = [...document.querySelectorAll('#homeUi .pop .popBtn, #homeUi .pop .game-button')]
    .find(b => /重置全部存档/.test(b.textContent));
  if (!btn) return 'no-danger-btn';
  btn.click(); return 'clicked';
})()`);
console.log('danger btn:', clicked);
await sleep(1500);
const info = await evalJs(`(() => {
  const pop = document.querySelector('#homeUi .pop.S');
  if (!pop) return 'no-S-pop';
  const cta = pop.querySelector('.popCTA');
  const row = pop.querySelector('.popCTA .row');
  const scroll = pop.querySelector('.popScroll');
  const btns = [...pop.querySelectorAll('.popCTA .popBtn')].map(b => {
    const r = b.getBoundingClientRect();
    const cs = getComputedStyle(b);
    return { label: b.textContent.trim(), w: Math.round(r.width), right: Math.round(r.right),
      cssWidth: cs.width, flex: cs.flex, inScroll: !!b.closest('.popScroll') };
  });
  return JSON.stringify({
    cls: pop.className, btns,
    popW: pop.clientWidth, scrollW: scroll ? scroll.clientWidth : null,
    scrollPad: scroll ? getComputedStyle(scroll).padding : null,
    ctaW: cta ? cta.offsetWidth : null, rowW: row ? row.offsetWidth : null,
    ctaAlignSelf: cta ? getComputedStyle(cta).alignSelf : null,
    scrollAlign: scroll ? getComputedStyle(scroll).alignItems : null,
  });
})()`);
console.log('S pop:', info);
await shot('s-confirm');
chrome.kill();
process.exit(0);

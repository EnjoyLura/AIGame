// 静止战场自测：进第 1 关战斗，等底图贴上后对战场画面采样两次，比对像素级差异。
// 底图若还在滚动，两次采样必然不同；静止战场应当完全一致（允许飘字/怪物等动态物造成的少量差异，
// 所以同时采样开局前 1.2s：那时敌人还没走到画面里，差异只可能来自底图自身移动）。
// 用法：node tools/static_bg_probe.mjs "http://127.0.0.1:7456/index.html?v=TS"
import { spawn } from 'node:child_process';
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = process.argv[2] || 'http://127.0.0.1:7456/index.html';
const outDir = resolve('gen-output/static-bg-probe');
mkdirSync(outDir, { recursive: true });

const profile = join(outDir, '.chrome-profile');
rmSync(profile, { recursive: true, force: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9337', `--user-data-dir=${profile}`,
  '--window-size=540,960', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio',
  '--no-first-run', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding', 'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function findWs(tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const l = await (await fetch('http://127.0.0.1:9337/json/list')).json();
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
const logs = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method === 'Runtime.consoleAPICalled') {
    const txt = (m.params.args || []).map(a => a.value ?? a.description ?? a.type).join(' ');
    if (/^\[Art\] /.test(txt) && !logs.includes(txt)) { logs.push(txt); console.log('  [page]', txt.slice(0, 200)); }
  } else if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    console.log('  [page] exception:', (d.exception?.description ?? d.text ?? '').slice(0, 260));
  }
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
  console.log('  timeout waiting:', label);
  return false;
}
async function shotBuf() {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  return Buffer.from(r.data, 'base64');
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 540, height: 960, deviceScaleFactor: 2, mobile: true });

await send('Page.navigate', { url });
await waitUntil(`!!document.querySelector('.lgStart')`, 45000, 'lgStart');
await sleep(1000);
await evalJs(`(() => {
  const KEY = 'zombie-shooter-save';
  let d = {};
  try { d = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
  d.stageCleared = Math.max(d.stageCleared || 0, 0);
  d.currentStage = 1;
  d.res = { amounts: { gold: 990000, diamond: 990000, stamina: 990 }, staminaTs: 0 };
  localStorage.setItem(KEY, JSON.stringify(d));
  return 1;
})()`);
await send('Page.reload', {});
await waitUntil(`!!document.querySelector('.lgStart')`, 45000, 'lgStart(reload)');
await sleep(1000);
await evalJs(`document.querySelector('.lgStart')?.click(); 1`);
await waitUntil(`!!document.querySelector('[class*=topbar]')`, 30000, 'home');
await sleep(1500);
for (let i = 0; i < 3; i++) {
  if (!await evalJs(`!!document.querySelector('.popClose')`)) break;
  await evalJs(`document.querySelector('.popClose')?.click(); 1`);
  await sleep(1000);
}
const clicked = await evalJs(`(() => {
  const el = [...document.querySelectorAll('#homeUi .game-button')].find(e => (e.textContent || '').indexOf('开始守卫') >= 0);
  if (!el) return 'NOT FOUND';
  el.click(); return (el.textContent || '').trim();
})()`);
console.log('  出战:', clicked);
await waitUntil(`!!document.querySelector('#domHud')`, 40000, 'battle hud');

// 底图就绪标志打在 console 里；等到它出现再开始采样
await waitUntil(`window.__bgSeen === undefined ? (window.__bgSeen = 0) : window.__bgSeen`, 1, 'noop');
const bgLog = logs.find(l => l.indexOf('战场底图生效') >= 0);
if (!bgLog) {
  console.log('  !! 没等到「[Art] 战场底图生效」诊断行——底图没铺上，静止与否无从谈起');
} else {
  console.log('  底图诊断:', bgLog.slice(0, 120));
}

// 采样对：进战斗后尽早采两张（敌人尚未入画），间隔 1.5s；再间隔 1.5s 采第三张做参照
await sleep(1200);
const a = await shotBuf();
await sleep(1500);
const b = await shotBuf();
await sleep(1500);
const c = await shotBuf();
writeFileSync(join(outDir, 'a.png'), a);
writeFileSync(join(outDir, 'b.png'), b);
writeFileSync(join(outDir, 'c.png'), c);
const bufEq = (x, y) => x.length === y.length && x.equals(y);
console.log('  A==B(整帧字节):', bufEq(a, b), '  A==C:', bufEq(a, c));
// 字节级比较受编码噪声影响时退化为长度+抽样比对
if (!bufEq(a, b)) {
  const diffPairs = (() => {
    let n = 0;
    const L = Math.min(a.length, b.length);
    for (let i = 0; i < L; i += 97) { if (a[i] !== b[i]) n++; }
    return n;
  })();
  console.log('  A vs B 抽样差异字节数(步长97):', diffPairs);
}
chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
console.log('\ndone');
process.exit(0);

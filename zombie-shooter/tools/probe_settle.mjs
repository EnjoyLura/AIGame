// 结算/暂停取景器（game-ux 稿 §5/§6 自测）：真打一场败仗拿真实失败结算，再摆拍通关面板看 chrome。
// 暂停面走真实按钮路径；失败面等据点陷落（不布防、原地看它倒）；通关面板的芯片/掉落是注入的摆拍值，
// 只为判断无背板+暗渐晕的观感，收益逻辑不在此测（check-bite/结算事件链负责）。
// 用法：node tools/probe_settle.mjs <url> <outDir>
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = process.argv[2];
const outDir = resolve(process.argv[3] || 'gen-output/probe-settle');
if (!url) { console.error('need url'); process.exit(1); }
mkdirSync(outDir, { recursive: true });
const profile = join(outDir, '.chrome-profile');
rmSync(profile, { recursive: true, force: true });

const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9335', `--user-data-dir=${profile}`,
  '--window-size=540,960', '--enable-unsafe-swiftshader', '--hide-scrollbars',
  '--mute-audio', '--no-first-run', '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', 'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });
chrome.stderr.on('data', () => {});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function findPageWs(tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const list = await (await fetch('http://127.0.0.1:9335/json/list')).json();
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
    await sleep(1000);
  }
  console.log('timeout waiting:', label);
  return false;
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 540, height: 960, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url });
await waitUntil(`!!document.querySelector('.lgStart')`, 45000, 'lgStart');
await sleep(1000);
// 补丁档：解锁第 1 关 + 体力拉满（进战即开打，不布防等败）
await evalJs(`(() => {
  const KEY = 'zombie-shooter-save';
  let d = {};
  try { d = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
  d.stageCleared = Math.max(d.stageCleared || 0, 4);
  d.currentStage = 5;
  d.res = Object.assign({ amounts: { gold: 0, diamond: 0, stamina: 0 }, staminaTs: 0 }, d.res || {});
  d.res.amounts = Object.assign(d.res.amounts || {}, { gold: 990000, diamond: 990000, stamina: 990 });
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
console.log('出战:', clicked);
await waitUntil(`!!document.querySelector('#domHud')`, 40000, 'battle hud');
await sleep(6000);

// ① 暂停面（真实按钮路径）
await evalJs(`document.querySelector('#domHud .pauseBtn')?.click(); 1`);
await sleep(800);
if (await evalJs(`(() => { const pm=[...document.querySelectorAll('#domHud .menuOverlay')].find(o=>o.querySelector('.pauseChip')); return pm && getComputedStyle(pm).display!=='none'; })()`)) {
  await shot('pause');
}
await evalJs(`document.querySelector('#domHud .pauseBtn')?.click(); 1`);
await sleep(600);

// ② 失败结算：GM 面板「据点打空(陷落)」走真实失败流程（gmVehicleFail → endRun('fail')）
const gmOpened = await evalJs(`(() => {
  const t = [...document.querySelectorAll('button')].find(b => b.textContent === 'GM≡');
  if (!t) return 'no-gm';
  t.click(); return 'ok';
})()`);
await sleep(600);
console.log('gm open:', gmOpened, await evalJs(`(() => {
  const b = [...document.querySelectorAll('button')].find(x => /据点打空/.test(x.textContent));
  if (!b) return 'no-fail-btn';
  b.click(); return 'clicked';
})()`));
await evalJs(`(() => { const t = [...document.querySelectorAll('button')].find(b => b.textContent === 'GM≡'); t?.click(); return 1; })()`);
const failShown = await waitUntil(`(() => {
  const fp = document.querySelector('#domHud .menuOverlay.failOverlay');
  return fp && getComputedStyle(fp).display !== 'none';
})()`, 60000, 'failOverlay');
if (failShown) {
  await sleep(1200);
  await shot('fail');
}

// ③ 通关面板摆拍：无背板 + 暗渐晕 + 金字标题，芯片/掉落是注入的观拍值
await evalJs(`(() => {
  const fp = document.querySelector('#domHud .menuOverlay.failOverlay');
  if (fp) fp.style.display = 'none';
  const cp = document.querySelector('#domHud .menuOverlay.clearOverlay');
  if (!cp) return 'no-clear';
  cp.style.display = 'flex';
  const body = cp.querySelector('.clBody');
  if (body && !body.children.length) {
    body.innerHTML = '<div class="clChips">' +
      '<div class="clChip"><small>击杀</small><b>87</b></div>' +
      '<div class="clChip"><small>波次</small><b>5/5</b></div>' +
      '<div class="clChip"><small>据点血量</small><b>82%</b></div></div>' +
      '<div class="clLoots" style="display:flex;gap:14px">' +
      '<div class="clLoot" style="width:52px;height:52px;border-radius:10px;background:rgba(8,10,16,.55);display:flex;align-items:center;justify-content:center">💰</div>' +
      '<div class="clLoot" style="width:52px;height:52px;border-radius:10px;background:rgba(8,10,16,.55);display:flex;align-items:center;justify-content:center">💎</div>' +
      '<div class="clLoot" style="width:52px;height:52px;border-radius:10px;background:rgba(8,10,16,.55);display:flex;align-items:center;justify-content:center">🀄</div></div>';
  }
  return 'ok';
})()`);
await sleep(1200);
await shot('clear-look');
chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
console.log('done');
process.exit(0);

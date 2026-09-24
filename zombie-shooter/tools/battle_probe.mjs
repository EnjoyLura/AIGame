// 战斗表现件取景器：按指定关卡进战斗、定时截图，并把画布件的「上屏证据」console 行捞出来。
// 为什么需要它：关卡底图、传送门、暴击底纹、光柱这些是**画布节点**，DOM 里量不到（page_shot 那套
// 读 backgroundImage 的普查对它们全废），只能靠 ① 截图 ② 代码自带的一行 [Art] 诊断 两条腿走路。
// 换关走存档：GameManager 的 load() 每个字段都是 `data.X ?? 默认`，所以补丁档可以只写需要的几项；
// 体力必须一起写——新档才送满体力，写了补丁档就等于"老档"，体力 0 会让「开始守卫」点下去没反应。
// 用法：node tools/battle_probe.mjs <url> <outDir> <关卡 csv，如 2,3,4,5> [每关停留秒=6]
//   需要在 127.0.0.1:7456 已起 serve.mjs（node tools/serve.mjs build/web-mobile 7456 127.0.0.1）
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = process.argv[2];
const outDir = resolve(process.argv[3] || 'gen-output/battle-probe');
const stages = (process.argv[4] || '2,3,4,5').split(',').map(s => parseInt(s, 10));
const holdMs = (Number(process.argv[5]) || 6) * 1000;
if (!url) { console.error('need url'); process.exit(1); }
mkdirSync(outDir, { recursive: true });

const profile = join(outDir, '.chrome-profile');
rmSync(profile, { recursive: true, force: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9336', `--user-data-dir=${profile}`,
  '--window-size=540,960', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio',
  '--no-first-run', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding', 'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });
chrome.stderr.on('data', d => process.stderr.write(d));

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function findWs(tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const l = await (await fetch('http://127.0.0.1:9336/json/list')).json();
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
const seen = new Set();
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method === 'Runtime.consoleAPICalled') {
    const t = m.params.type;
    if (t !== 'error' && t !== 'warning' && t !== 'log') return;
    const txt = (m.params.args || []).map(a => a.value ?? a.description ?? a.type).join(' ');
    const pass = /^\[Art\] /.test(txt) || /^DBG-AFFIX/.test(txt);
    if (!pass) return;
    if (seen.has(txt)) return;
    seen.add(txt);
    console.log('  [page]', txt.slice(0, 200));
  } else if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    const txt = 'exception: ' + (d.exception?.description ?? d.text ?? '');
    if (!seen.has(txt)) { seen.add(txt); console.log('  [page]', txt.slice(0, 260)); }
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
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(outDir, name + '.png'), Buffer.from(r.data, 'base64'));
  console.log('  shot:', name);
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 540, height: 960, deviceScaleFactor: 2, mobile: true });

for (const stage of stages) {
  console.log(`\n===== 第 ${stage} 关 =====`);
  await send('Page.navigate', { url });
  await waitUntil(`!!document.querySelector('.lgStart')`, 45000, 'lgStart');
  await sleep(1000);
  // 补丁档：推进解锁到本关、把体力与两种货币填满，其余字段留给 load() 的默认值
  await evalJs(`(() => {
    const KEY = 'zombie-shooter-save';
    let d = {};
    try { d = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
    d.stageCleared = Math.max(d.stageCleared || 0, ${stage} - 1);
    d.currentStage = ${stage};
    d.res = Object.assign({ amounts: { gold: 0, diamond: 0, stamina: 0 }, staminaTs: 0 }, d.res || {});
    d.res.amounts = Object.assign({ gold: 0, diamond: 0, stamina: 0 }, d.res.amounts || {},
      { gold: 990000, diamond: 990000, stamina: 990 });
    localStorage.setItem(KEY, JSON.stringify(d));
    return localStorage.getItem(KEY).length;
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
  await sleep(holdMs);
  await shot(`stage-${stage}`);
}
chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
console.log('\ndone');
process.exit(0);

// 二级弹窗巡检探针：无头 Chrome CDP 逐面打开弹窗，截图 + 输出五段骨架与贴图普查明细。
// 用法：node tools/probe_popups.mjs <url> <outDir>
// 输出 <outDir>/popups.json：每面 { 段位组件有无、组件计数、其中已贴图(.plated/inline borderImage) 计数 }。
// 配合美术轮用：plated 计数 = 0 的组件族就是「还没接美术契约」的候选宿主。
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = process.argv[2];
const outDir = resolve(process.argv[3] || 'gen-output/probe-popups');
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
chrome.stderr.on('data', () => {});

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
async function waitUntil(expression, timeoutMs, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try { if (await evalJs(expression)) return true; } catch {}
    await sleep(800);
  }
  console.log('timeout waiting:', label);
  return false;
}

// 弹层内普查：组件族 → 有几个、其中几个已贴图（.plated 或 inline border-image-source）
const CENSUS = `(() => {
  const pop = document.querySelector('#homeUi .pop');
  if (!pop) return null;
  const fam = {
    banner: '.popBanner', qhead: '.popQ', top: '.popTop', meta: '.popMeta',
    tabs: '.popTabs > div', fixbar: '.popFixBar', scroll: '.popScroll',
    row: '.popRow', grid: '.popGrid > div', gridCellI: '.popGrid > div > i',
    attr: '.popAttr', sec: '.popSec', kv: '.popKV', chip: '.popChip',
    cmp: '.popCmp', cost: '.popCost .c', slots: '.popSlots .sc', slot: '.popSlot',
    cta: '.popCTA .popBtn', cardrow: '.popCardRow > div', show: '.popShow', bar: '.popBar',
  };
  const plated = (el) => el.classList.contains('plated')
    || !!(el.style.borderImageSource) || !!(el.style.backgroundImage && el.style.backgroundImage !== 'none');
  const out = { popClass: pop.className, fams: {} };
  for (const [name, sel] of Object.entries(fam)) {
    const els = [...pop.querySelectorAll(sel)];
    out.fams[name] = { n: els.length, plated: els.filter(plated).length };
  }
  const mask = pop.closest('.protoMask');
  out.tier = mask ? [...mask.classList].find(c => c.startsWith('popL')) : null;
  return JSON.stringify(out);
})()`;

const faces = [
  { name: 'mail', open: `document.querySelector('.homeMailBtn')?.click()` },
  { name: 'notice', open: `document.querySelector('.homeNoticeBtn')?.click()` },
  { name: 'settings', open: `[...document.querySelectorAll('#homeUi .tinyIcon')][2]?.click()` },
  { name: 'profile', open: `document.querySelector('#homeUi .pAvatar')?.click()` },
  { name: 'stamina', open: `document.querySelector('#homeUi .reswrap .res:nth-child(3) .add')?.click()` },
  { name: 'mall-good', pre: `(() => { const t=[...document.querySelectorAll('#homeUi .tabbar .tab')][0]; t?.click(); return 1; })()`,
    open: `document.querySelector('#homeUi .good')?.click()` },
  { name: 'base-building', pre: `(() => { const t=[...document.querySelectorAll('#homeUi .tabbar .tab')][4]; t?.click(); return 1; })()`,
    open: `document.querySelector('#homeUi .building')?.click()` },
  { name: 'heroes-star', pre: `(() => { const t=[...document.querySelectorAll('#homeUi .tabbar .tab')][1]; t?.click(); return 1; })()`,
    open: `document.querySelector('#homeUi .starEntry')?.click()` },
  { name: 'heroes-equip', pre: `(() => { const t=[...document.querySelectorAll('#homeUi .tabbar .tab')][1]; t?.click(); return 1; })()`,
    open: `document.querySelector('#homeUi .eqGrid .slot')?.click()` },
  { name: 'heroes-gems', pre: `(() => { const t=[...document.querySelectorAll('#homeUi .tabbar .tab')][1]; t?.click(); return 1; })()`,
    open: `(() => { document.querySelector('#homeUi .eqGrid .slot')?.click(); return 1; })()`,
    post: `(() => { const tb=[...document.querySelectorAll('#homeUi .popBar .pt > div')].find(x=>/宝石/.test(x.textContent)); tb?.click(); return 1; })()` },
];

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

const report = {};
for (const f of faces) {
  try {
    if (f.pre) { await evalJs(f.pre); await sleep(1200); }
    // 有上一面残留就先关
    while (await evalJs(`!!document.querySelector('#homeUi .popClose')`)) {
      await evalJs(`document.querySelector('#homeUi .popClose')?.click(); 1`);
      await sleep(700);
    }
    await evalJs(f.open);
    await sleep(1400);
    if (f.post) { await evalJs(f.post); await sleep(1400); }
    const data = await evalJs(CENSUS);
    report[f.name] = data ? JSON.parse(data) : { miss: 'no .pop after click' };
    await shot('pop-' + f.name);
  } catch (e) {
    report[f.name] = { error: String(e).slice(0, 200) };
  }
}
writeFileSync(join(outDir, 'popups.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
chrome.kill();
process.exit(0);

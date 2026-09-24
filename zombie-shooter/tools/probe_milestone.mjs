// 一次性探针：把出征页里程碑三格的"到底是谁在画那块深色底"问清楚。
// 用法：node tools/probe_milestone.mjs <url>
// 输出每个 .milestone 的计算样式关键项 + 它自己的伪元素，避免靠截图猜。
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = process.argv[2];
if (!url) { console.error('need url'); process.exit(1); }
const profile = join(process.cwd(), '.probe-profile');
rmSync(profile, { recursive: true, force: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9341', `--user-data-dir=${profile}`,
  '--window-size=540,960', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio', '--no-first-run',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function findWs(tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const l = await (await fetch('http://127.0.0.1:9341/json/list')).json();
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
ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
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
  console.log('  timeout:', label); return false;
}

const PROBE = `(() => {
  const pick = (cs) => ({
    bg: cs.backgroundColor, bgImg: cs.backgroundImage.slice(0, 40),
    borderImg: cs.borderImageSource.slice(0, 40), borderW: cs.borderTopWidth,
    boxShadow: cs.boxShadow.slice(0, 60), outline: cs.outlineWidth + ' ' + cs.outlineColor,
    filter: cs.filter.slice(0, 40), opacity: cs.opacity, cls: (el => el)(0),
  });
  const out = [];
  for (const el of document.querySelectorAll('#homeUi .milestones .milestone')) {
    const b = el.getBoundingClientRect();
    const rec = { cls: el.className, box: Math.round(b.width) + 'x' + Math.round(b.height), self: pick(getComputedStyle(el)) };
    rec.self.cls = undefined;
    for (const pe of ['::before', '::after']) {
      rec[pe] = pick(getComputedStyle(el, pe));
    }
    out.push(rec);
  }
  const row = document.querySelector('#homeUi .milestones');
  const rowRec = { row: pick(getComputedStyle(row)), mile: getComputedStyle(row).getPropertyValue('--mile') };
  for (const pe of ['::before', '::after']) rowRec[pe] = pick(getComputedStyle(row, pe));
  // 命中栈：在中间那格的中心取样，把"这个点上从后到前有哪些节点、各自画了什么"全列出来。
  // 计算样式说 .milestone 是透明的，可截图里明明有一块硬边深色矩形——只有命中栈能指出是谁画的。
  const mid = document.querySelectorAll('#homeUi .milestones .milestone')[1];
  const stack = [];
  if (mid) {
    const b = mid.getBoundingClientRect();
    for (const [dx, dy] of [[0.5, 0.18], [0.5, 0.5], [0.12, 0.5], [0.5, 0.86]]) {
      const pt = { x: b.left + b.width * dx, y: b.top + b.height * dy };
      const hit = document.elementsFromPoint(pt.x, pt.y).slice(0, 7).map(n => {
        const cs = getComputedStyle(n);
        return {
          tag: n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).trim().split(/\\s+/).join('.') : ''),
          w: Math.round(n.getBoundingClientRect().width), h: Math.round(n.getBoundingClientRect().height),
          bg: cs.backgroundColor, bgImg: cs.backgroundImage.slice(0, 34), bImg: cs.borderImageSource.slice(0, 34),
          sh: cs.boxShadow.slice(0, 44), z: cs.zIndex, pos: cs.position,
        };
      });
      stack.push({ at: dx + ',' + dy, hit });
    }
  }
  return JSON.stringify({ row: rowRec, cells: out, stack, painters: (() => {
    // 全量绘制者清单：里程碑矩形区内，凡是"自己会画点东西"（不透明底色 / 背景图 / 九宫格 / 阴影）
    // 的节点全部列出，含伪元素。截图里那块硬边深色矩形不在上面的命中栈里，只能这样反查。
    const m = document.querySelectorAll('#homeUi .milestones .milestone')[1].getBoundingClientRect();
    const paints = (cs) => {
      const t = [];
      if (!/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) t.push('bg ' + cs.backgroundColor);
      if (cs.backgroundImage !== 'none') t.push('bgImg ' + cs.backgroundImage.slice(0, 70));
      if (cs.borderImageSource !== 'none') t.push('bImg ' + cs.borderImageSource.slice(0, 50) + ' w' + cs.borderTopWidth);
      if (cs.boxShadow !== 'none') t.push('sh ' + cs.boxShadow.slice(0, 50));
      return t;
    };
    const list = [];
    for (const el of document.querySelectorAll('#homeUi *')) {
      const b = el.getBoundingClientRect();
      if (b.right < m.left - 4 || b.left > m.right + 4 || b.bottom < m.top - 4 || b.top > m.bottom + 4) continue;
      const cs = getComputedStyle(el);
      const own = paints(cs);
      const pre = paints(getComputedStyle(el, '::before'));
      const post = paints(getComputedStyle(el, '::after'));
      if (!own.length && !pre.length && !post.length) continue;
      list.push({
        id: el.tagName.toLowerCase() + '.' + String(el.className).trim().split(/\\s+/).slice(0, 3).join('.'),
        box: Math.round(b.width) + 'x' + Math.round(b.height), z: cs.zIndex, pos: cs.position,
        own, pre, post,
      });
    }
    return { region: [m.left, m.top, m.right, m.bottom].map(Math.round), list };
  })() }, null, 1);
})()`;

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
await evalJs(`(() => { const el=[...document.querySelectorAll('#homeUi .tab')].find(e=>(e.textContent||'').indexOf('出征')>=0); el&&el.click(); return 1; })()`);
await sleep(2200);
console.log(await evalJs(PROBE));
ws.close();
chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);

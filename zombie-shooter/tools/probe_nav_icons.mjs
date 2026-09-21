// 一次性探针：底部导航五格各自"是什么在画"——贴图 key、还是留在文案里的 emoji 字形。
// 为什么要问这个：图标语言这一轮要重切的对象是"页面上真的那枚图形"，不是清单上写的 key。
// 导航这一族在采购单里是 nav_mall/heroes/battle/core/base 五个 key，而 nav_core 已归档待宿主——
// 所以有一格现在画的不是图。到底是哪一格、画的是图还是字形，得量出来不能猜。
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = process.argv[2];
if (!url) { console.error('need url'); process.exit(1); }
const profile = join(process.cwd(), '.nav-profile');
rmSync(profile, { recursive: true, force: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9344', `--user-data-dir=${profile}`,
  '--window-size=540,960', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio',
  '--no-first-run', '--disable-renderer-backgrounding', 'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function findWs(tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const l = await (await fetch('http://127.0.0.1:9344/json/list')).json();
      const p = l.find(t => t.type === 'page');
      if (p) return p.webSocketDebuggerUrl;
    } catch {}
    await sleep(500);
  }
  throw new Error('devtools endpoint not up');
}
const ws = new WebSocket(await findWs());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let seq = 0; const pending = new Map();
ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
function send(method, params = {}) {
  const id = ++seq; ws.send(JSON.stringify({ id, method, params }));
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
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 540, height: 960, deviceScaleFactor: 1, mobile: true });
await send('Page.navigate', { url });
await until(`!!document.querySelector('.lgStart')`, 45000, 'lgStart');
await sleep(600);
await evalJs(`document.querySelector('.lgStart')?.click(); 1`);
await until(`!!document.querySelector('[class*=topbar]')`, 30000, 'home');
await sleep(4500);
const PROBE = `(() => {
  const out = [];
  for (const t of document.querySelectorAll('#homeUi .tabbar .tab')) {
    const ic = t.querySelector('.ticon, .ic');
    const cs = ic ? getComputedStyle(ic) : null;
    const box = (ic || t).getBoundingClientRect();
    out.push({
      name: (t.textContent || '').trim(),
      on: /\\bon\\b/.test(t.className),
      glyph: ic ? (ic.textContent || '').trim() : '(无 .ic 节点)',
      bg: cs ? (cs.backgroundImage || 'none').replace(/^url\\("?/, '').replace(/"?\\)$/, '').split('/').slice(-2).join('/') : '-',
      icBox: ic ? Math.round(box.width) + 'x' + Math.round(box.height) : '-',
      icSize: cs ? Math.round(parseFloat(cs.fontSize)) : '-',
    });
  }
  return JSON.stringify(out);
})()`;
for (const r of JSON.parse(await evalJs(PROBE))) {
  console.log(`${(r.on ? '●' : '○')} ${r.name.padEnd(4)} 字形「${r.glyph}」  盒 ${r.icBox.padEnd(8)} 字号 ${String(r.icSize).padStart(3)}  贴图 ${r.bg}`);
}
chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}

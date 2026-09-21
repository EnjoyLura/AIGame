// 一次性探针：整页底到底有没有贴到 #homeUi 上（贴了却不显影，要分清是没执行、执行了被覆盖、还是被别的层挡住）。
// 用法：node tools/probe_pagebg.mjs <url>
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = process.argv[2];
if (!url) { console.error('need url'); process.exit(1); }
const profile = join(process.cwd(), '.probe-profile');
rmSync(profile, { recursive: true, force: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9343', `--user-data-dir=${profile}`,
  '--window-size=540,960', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio', '--no-first-run',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function findWs(tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const l = await (await fetch('http://127.0.0.1:9343/json/list')).json();
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
const errs = [];
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') {
    errs.push(m.params.exceptionDetails?.exception?.description?.slice(0, 200) || JSON.stringify(m.params).slice(0, 200));
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    errs.push('console: ' + (m.params.args || []).map(a => a.value ?? a.description ?? '').join(' ').slice(0, 200));
  }
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
  console.log('  timeout:', label); return false;
}

const PROBE = `(() => {
  const h = document.getElementById('homeUi');
  const cs = getComputedStyle(h);
  const who = [];
  // 谁挡在 #homeUi 前面：从顶栏那一点往下命中，列出命中栈（背板是贴图，算不出颜色，只能问是谁）
  for (const el of document.elementsFromPoint(270, 500).slice(0, 8)) {
    const s = getComputedStyle(el);
    who.push(el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).trim().split(/\\s+/)[0] : '')
      + ' bg=' + s.backgroundColor + ' bgImg=' + s.backgroundImage.slice(0, 26)
      + ' z=' + s.zIndex + ' op=' + s.opacity + ' pos=' + s.position);
  }
  return JSON.stringify({
    inline: h.style.backgroundImage.slice(-140),
    inlineSize: h.style.backgroundSize,
    computed: cs.backgroundImage.slice(-140),
    computedSize: cs.backgroundSize,
    color: cs.backgroundColor,
    attach: cs.backgroundAttachment,
    rect: (() => { const b = h.getBoundingClientRect(); return Math.round(b.width) + 'x' + Math.round(b.height); })(),
    who,
  }, null, 1);
})()`;

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 540, height: 960, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url });
await until(`!!document.querySelector('.lgStart')`, 30000, 'login');
await sleep(1200);
await evalJs(`document.querySelector('.lgStart')?.click(); 1`);
await until(`!!document.querySelector('#homeUi .tab')`, 30000, 'home nav');
for (let i = 0; i < 4; i++) {
  if (!await evalJs(`!!document.querySelector('.popClose')`)) break;
  await evalJs(`document.querySelector('.popClose')?.click(); 1`);
  await sleep(900);
}
await sleep(3000);
console.log(await evalJs(PROBE));
console.log('--- runtime errors ---');
console.log(errs.length ? errs.slice(0, 8).join('\n') : '(none)');
ws.close();
chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);

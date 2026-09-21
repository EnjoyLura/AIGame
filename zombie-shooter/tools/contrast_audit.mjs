// 文字可读性审计器：量每一个"有字的元素"的字色与它背后实际颜色的对比度，按 WCAG 比值报不合格清单。
// 为什么需要它：美术进版这几轮反复出现"字压在暗板上读不出来"（上一轮只手工修了 4 处 .plated），
// 靠眼睛一页页翻既慢又漏。这里把六页 + 可选注入一段覆盖样式一起量，直接给出：
//   ① 不合格（比值 < 阈值）的元素、字色、背板色、实测比值
//   ② 整页最低比值与不合格计数——改完再跑一遍，计数必须降，不能升
// 背板色是"往上找第一个不透明 background"近似出来的（CSS 没有读合成背景的 API），
// 渐变/贴图按该元素自己的 background-color 或最近纯色祖先算，够用来定位问题，不当真值。
// 用法：node tools/contrast_audit.mjs <url> <页签名|home> [阈值=4.5] [注入 CSS 的文件路径|plates] [strict]
//   第 4 个参数写 plates：把「压在贴图/九宫格板上、算不出背板色」那一批按字色分组打出来，
//   供肉眼对着截图核对（这一批是审计的盲区，只能靠列字色缩小范围）。
import { spawn } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = process.argv[2];
const page = process.argv[3] || 'home';
const THRESHOLD = Number(process.argv[4]) || 4.5;
const cssFile = process.argv[5];
if (!url) { console.error('need url'); process.exit(1); }
const inject = cssFile && cssFile !== 'plates' ? readFileSync(resolve(cssFile), 'utf8') : '';

const profile = join(process.cwd(), '.audit-profile');
rmSync(profile, { recursive: true, force: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9339', `--user-data-dir=${profile}`,
  '--window-size=540,960', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio',
  '--no-first-run', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding', 'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function findWs(tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const l = await (await fetch('http://127.0.0.1:9339/json/list')).json();
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
    await sleep(700);
  }
  console.log('timeout waiting:', label);
  return false;
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 540, height: 960, deviceScaleFactor: 1, mobile: true });
await send('Page.navigate', { url });
await waitUntil(`!!document.querySelector('.lgStart')`, 45000, 'lgStart');
await sleep(800);
await evalJs(`document.querySelector('.lgStart')?.click(); 1`);
await waitUntil(`!!document.querySelector('[class*=topbar]')`, 30000, 'home');
await sleep(1200);
for (let i = 0; i < 3; i++) {
  if (!await evalJs(`!!document.querySelector('.popClose')`)) break;
  await evalJs(`document.querySelector('.popClose')?.click(); 1`);
  await sleep(900);
}
if (page !== 'home') {
  await evalJs(`(() => {
    const t = [...document.querySelectorAll('#homeUi .tabbar .tab')].find(e => (e.textContent||'').indexOf(${JSON.stringify(page)}) >= 0);
    if (t) t.click(); return !!t;
  })()`);
  await sleep(1200);
}
if (inject) {
  await evalJs(`(() => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(inject)}; document.head.appendChild(s); return 1; })()`);
  await sleep(600);
}

const AUDIT = `(() => {
  const lum = (c) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const parse = (s) => { const m = /rgba?\\(([^)]+)\\)/.exec(s || ''); if (!m) return null;
    const p = m[1].split(',').map(x => parseFloat(x)); return { c: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 }; };
  const over = (fg, bg) => [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };
  const hex = (c) => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  // 背板：自己没底色就一层层往上找第一个 alpha>0 的 background-color。
  // 九宫格板走的是 border-image（UiPlate.nineSlice 会把 background 置成 none），
  // 只认 background-image 会把所有贴了暗板的字误判成"压在页面底色上"——上一版就栽在这里。
  // 贴图/贴板这两种背板颜色算不出来，单独计数交给人肉眼判，不进不合格清单。
  const backOf = (e) => {
    for (let cur = e; cur; cur = cur.parentElement) {
      const cs = getComputedStyle(cur);
      const bi = cs.borderImageSource;
      if (bi && bi !== 'none') return { img: 'plate' };
      const im = cs.backgroundImage;
      if (im && im !== 'none') return { img: 'bg-image' };
      const p = parse(cs.backgroundColor);
      if (p && p.a > 0.02) {
        let acc = p.c.concat([p.a]);
        for (let up = cur.parentElement; up && acc[3] < 0.999; up = up.parentElement) {
          const q = parse(getComputedStyle(up).backgroundColor);
          if (!q || q.a <= 0.02) continue;
          acc = over(acc, q.c.concat([q.a]));
        }
        return { c: acc.slice(0, 3), a: 1, via: cur.className ? String(cur.className).split(' ')[0] : cur.tagName };
      }
    }
    return { c: [255, 255, 255], a: 1, via: 'page' };
  };
  const out = [];
  const off = [];
  const plateList = [];
  let n = 0, worst = 99, onImg = 0;
  // 祖先链上的 opacity 会连乘（CSS 组透明），只看元素自己会把 .dim 包着的字算成满不透明
  const alphaOf = (e) => { let a = 1; for (let cur = e; cur; cur = cur.parentElement) a *= parseFloat(getComputedStyle(cur).opacity) || 1; return a; };
  // 禁用/锁定态的字：WCAG 1.4.3 明确豁免 inactive controls。但不许悄悄不算——单列一组报出来，
  // 让"这一页有多少字是靠透明度活着的"这件事仍然看得见
  const INACTIVE = /(^|[\s._-])(off|dim|lock|locked|disabled)(\b|[\s._-])|\.lock(ed)?\b|\.off\b|\.dim\b/i;
  for (const e of document.querySelectorAll('#homeUi *')) {
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) continue;
    const own = [...e.childNodes].some(x => x.nodeType === 3 && x.textContent.trim().length);
    if (!own) continue;
    const b = e.getBoundingClientRect();
    if (b.width < 4 || b.height < 4) continue;
    n++;
    const fg = parse(cs.color); if (!fg) continue;
    const bg = backOf(e);
    if (bg.img) {
      onImg++;
      // 压在贴图/板上的字算不出背板色，但**字色本身**可以列出来——肉眼对着截图核一遍，
      // 比"另计 37 个需肉眼判"这句话有用。第 5 个参数给 plates 就把这一批打出来
      plateList.push({ sel: e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).trim().split(/\\s+/)[0] : ''),
        txt: (e.textContent || '').trim().slice(0, 10), fg: hex(fg.c), a: Math.round(alphaOf(e) * 100) / 100, via: bg.img });
      continue;
    }
    const fga = fg.c.concat([fg.a * alphaOf(e)]);
    const r = ratio(over(fga, bg.c), bg.c);
    if (r < worst) worst = r;
    const rec = {
      txt: (e.textContent || '').trim().slice(0, 14), fs: Math.round(parseFloat(cs.fontSize)),
      fw: cs.fontWeight, fg: hex(fg.c), bg: hex(bg.c), bgVia: bg.via, r: Math.round(r * 100) / 100,
      sel: e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).trim().split(/\\s+/)[0] : ''),
    };
    if (r >= ${THRESHOLD}) continue;
    const cls = (typeof e.className === 'string' ? e.className : '') + ' ' + (e.getAttribute('disabled') !== null ? 'disabled' : '');
    if (INACTIVE.test(cls) || fga[3] < 0.95) off.push(rec); else out.push(rec);
  }
  return JSON.stringify({ checked: n, onImage: onImg, worst: Math.round(worst * 100) / 100, bad: out, inactive: off, plates: plateList });
})()`;

const res = JSON.parse(await evalJs(AUDIT));
console.log(`\n页签 ${page} · 阈值 ${THRESHOLD}:1 · 量了 ${res.checked} 个有字元素（另有 ${res.onImage} 个压在贴图/九宫格板上，算不出背板色，需肉眼判）· 最低比值 ${res.worst}:1 · 不合格 ${res.bad.length} 个`);
const seen = new Set();
for (const x of res.bad.sort((a, b) => a.r - b.r)) {
  const k = `${x.sel}|${x.fg}|${x.bg}`;
  if (seen.has(k)) continue;
  seen.add(k);
  console.log(`  ${String(x.r).padStart(5)}:1  ${x.sel.padEnd(18)} 字「${x.txt}」 ${x.fs}px/${x.fw}  字色 ${x.fg} on ${x.bg}（来自 .${x.bgVia}）`);
}
if (res.inactive.length) {
  const worstOff = res.inactive.reduce((m, x) => Math.min(m, x.r), 99);
  console.log(`  禁用/半透明态另计 ${res.inactive.length} 个（WCAG 对 inactive controls 豁免，最低 ${worstOff}:1）：`
    + res.inactive.slice(0, 6).map(x => `${x.sel.split('.')[1] || x.sel} ${x.r}:1`).join('、'));
}
const collapsed = res.bad.length;
if (cssFile !== 'plates') { /* 默认不刷这一屏 */ }
else {
  const byColor = new Map();
  for (const p of res.plates) { const k = `${p.fg} @${Math.round(p.a * 100)}%`; byColor.set(k, (byColor.get(k) || []).concat(p)); }
  console.log('  压在贴图/板上的字（背板算不出，按字色分组核对）：');
  for (const [k, list] of [...byColor].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`    ${k.padEnd(16)} ×${String(list.length).padStart(2)}  ${list.slice(0, 9).map(x => x.txt || x.sel).join('、')}`);
  }
}
const dir = resolve('..', 'gen-output');
mkdirSync(dir, { recursive: true });
const outFile = join(dir, `contrast-${page}-${Date.now()}.json`);
writeFileSync(outFile, JSON.stringify(res, null, 1));
console.log(`  明细写入 ${outFile}（同类折叠后 ${seen.size} 组）`);
chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(collapsed > 0 && process.argv[6] === 'strict' ? 1 : 0);

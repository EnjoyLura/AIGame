// 大 emoji 占位普查：列出主城五页里「整个元素就是一个大号 emoji、并且没有贴图」的位置。
// 用途：美术进版「大图标族」开工前先拿清单——哪些 emoji 是**插画位**（该出图），
//       哪些只是文案里的随文小符号（STYLE-SPEC §9 判据①：这类本就不该出图）。
// 判据：叶子元素 + 文本只有一个图形符号 + 计算字号 >= 阈值（默认 18 CSS px）+ 无 background-image。
// 用法：node tools/audit_emoji_slots.mjs <url> [最小字号=18]
//   需要 127.0.0.1:7456 已起 serve.mjs（node tools/serve.mjs build/web-mobile 7456 127.0.0.1）
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = process.argv[2];
const MIN = +(process.argv[3] || 18);
if (!url) { console.error('need url'); process.exit(1); }
const profile = join(process.cwd(), '.emoji-profile');
rmSync(profile, { recursive: true, force: true });

const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9340', `--user-data-dir=${profile}`,
  '--window-size=540,960', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio',
  '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function findWs(tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const l = await (await fetch('http://127.0.0.1:9340/json/list')).json();
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
  if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result?.value;
}
async function until(expr, ms, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evalJs(expr)) return true; } catch {} await sleep(800); }
  console.log('  timeout:', label);
  return false;
}

// 宿主链取最近三层带类名的祖先：够定位到 CSS 选择器，又不至于每条都不一样
const PROBE = `(() => {
  const MIN = ${MIN};
  // 只认图形符号：\p{Emoji_Component} 会把 0-9 与 #/* 也算进去（战力数字 "800" 曾被误报成一格），
  // 所以这里只留 Extended_Pictographic + 变体选择符 + 零宽连接符
  const only = /^[\\p{Extended_Pictographic}\\uFE0F\\u200D]+$/u;
  const out = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('#homeUi *')) {
    if (el.children.length) continue;
    const t = (el.textContent || '').trim();
    if (!t || !only.test(t)) continue;
    const cs = getComputedStyle(el);
    const b = el.getBoundingClientRect();
    if (b.width < 4 || b.height < 4) continue;
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const fs = Math.round(parseFloat(cs.fontSize) || 0);
    if (fs < MIN) continue;
    const bg = cs.backgroundImage || 'none';
    const hasTex = /url\\(/.test(bg) || (cs.borderImageSource && cs.borderImageSource !== 'none');
    const chain = [];
    for (let p = el; p && chain.length < 3 && p.id !== 'homeUi'; p = p.parentElement) {
      const c = (p.className && typeof p.className === 'string') ? p.className.trim().split(/\\s+/).slice(0, 2).join('.') : '';
      chain.unshift(c || p.tagName.toLowerCase());
    }
    const key = chain.join('>') + '|' + t;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ host: chain.join(' > '), glyph: t, fs, w: Math.round(b.width), h: Math.round(b.height),
      tex: hasTex ? 'Y' : '-', cls: (el.className || '').trim(), parentCls: (el.parentElement?.className || '').trim() });
  }
  out.sort((a, b) => (a.tex === b.tex ? b.fs - a.fs : a.tex < b.tex ? -1 : 1));
  return JSON.stringify(out);
})()`;

const PAGES = ['home', '商店', '英雄', '护送', '行动', '基地'];
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
await sleep(1200);

// **已经判过"这一格就该留字形"的位置**——普查必须把它们和"漏接"分开报。
// 为什么要有这张表：这个工具只回答"哪里还是 emoji、没贴图"，不回答"这是漏的还是判过的"。
// 2026-09-22 图标语言那一轮就是被它带偏过一次——照着它报出的 4 处去出图、去接线，
// 结果其中 3 处早有明令：技能键是用户点名「除技能外不换」（`ico_skill` 因此从 MANIFEST 撤掉，
// 见 STYLE-SPEC §9 功能图标行），另外两处是随文小符号（§9 判据①：跟文字色与基线走、
// 还要随布尔值显隐的符号不许换成位图）。判过的位置再出一次图 = 白花一次生图、还得删回来。
// 新增一行必须同时给出判据出处；判据废了就删这一行，不要靠注释留着。
const WAIVED = [
    { host: 'skillEntry', glyph: '⚡', why: '用户明令「除技能外不换」，ico_skill 键已撤（STYLE-SPEC §9）' },
    { host: 'goCost', glyph: '⚡', why: '随文小符号：跟在体力数字后面走基线（§9 判据①）' },
    { host: 'game-button.major', glyph: '⚡', why: '随文小符号：主 CTA「开始护送 ⚡5」里跟在体力数字后面走基线（§9 判据①）' },
    { host: 'giftDot', glyph: '⏰', why: '随文小符号：与「限时特惠」四字同排同色（§9 判据①）' },
];
// 匹配面放宽到父类名：技能那一枚的宿主链是 `fcol.hero-quick > btn.blue > ic`，
// 判据写在**父按钮**的 `hot skillEntry` 上，只看 host/cls 会漏（第一版就漏在这）
const waiveReason = (row) => WAIVED.find(w => (row.glyph === w.glyph || !w.glyph)
    && [row.host, row.cls, row.parentCls].some(s => (s || '').includes(w.host)))?.why;

let totalNoTex = 0;
const waivedRows = [];
for (const label of PAGES) {
  if (label !== 'home') {
    await evalJs(`(() => { const el=[...document.querySelectorAll('#homeUi .tab')].find(e=>(e.textContent||'').indexOf('${label}')>=0); el&&el.click(); return 1; })()`);
    await sleep(1800);
  }
  const rows = JSON.parse(await evalJs(PROBE));
  const noTex = rows.filter(r => r.tex === '-');
  const todo = noTex.filter(r => !waiveReason(r));
  totalNoTex += todo.length;
  for (const r of noTex.filter(r => waiveReason(r))) waivedRows.push({ ...r, page: label, why: waiveReason(r) });
  console.log(`\n=== ${label} · 大号 emoji ${rows.length} 处（无贴图 ${noTex.length} 处，其中判过不该出图 ${noTex.length - todo.length} 处）`);
  for (const r of todo) {
    console.log(`   ${String(r.fs).padStart(3)}px ${r.w}x${r.h}  ${r.glyph}  ${r.host}`
      + (r.cls ? `  [${r.cls}]` : '') + (r.parentCls ? `  in[${r.parentCls}]` : ''));
  }
}
console.log(`\n合计仍无贴图、且**没判过**的大号 emoji 位：${totalNoTex}`);
if (waivedRows.length) {
  console.log(`以下 ${waivedRows.length} 处是**判过该留字形**的，别再去出图（判据见括号）：`);
  for (const r of waivedRows) console.log(`   ${r.page} · ${r.glyph} ${r.host}  →  ${r.why}`);
}
ws.close();
chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);

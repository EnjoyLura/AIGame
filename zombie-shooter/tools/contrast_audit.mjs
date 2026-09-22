// 文字可读性审计器：量每一个"有字的元素"的字色与它**屏幕上实际背后那块颜色**的对比度，按 WCAG 比值报不合格清单。
//
// 为什么不能用 CSS 推背板（旧版的做法，也是这一版存在的理由）：
//   CSS 没有"读合成背景"的 API，旧版只能沿祖先链找第一个不透明 background-color，遇到
//   background-image / border-image 就判"算不出"。于是**贴图、九宫格板、整页底**这三类背板
//   全在盲区里——而这几轮美术恰恰把界面全铺到了这三类东西上。更糟的是它不只是"量不到"，
//   它会**量错**：整页底失效那几轮，祖先链上仍然能找到 #homeUi 那层 --c-scene-1 实色，
//   审计就照着那块假底色算比值、报"不合格 0"，而玩家看到的字压在一张照片上。
//   背景失效那么久、所有工具都说正常，就是这个原因。
//
// 现在的做法：把字**真的藏起来**再截一张图，直接从那张图上取每个字所在区域的平均色当背板。
//   ① 收集所有"有字的元素"（跳过纯 emoji——emoji 自带颜色，WCAG 的字色对比对它没有意义）；
//   ② 注入一条 color:transparent 的覆盖样式，让字形不画、但版面与背板原样保留；
//   ③ Page.captureScreenshot 截屏，把图送回页面里画到 canvas 上；
//   ④ 逐元素按矩形取网格采样的均值（背板）与标准差（背景有多"花"），字色仍取 CSS 的 color；
//   ⑤ 比值在 Node 侧算，阈值/豁免口径与旧版一致。
//
// 附带产出：背板方差高的那一批单独列（第 4 个参数 plates）——均值比值达标但底下是一张照片时，
// 局部笔画可能正压在亮块上，这一批才是真正需要人看一眼的。
//
// 用法：node tools/contrast_audit.mjs <url> <页签名|home> [阈值=4.5] [注入 CSS 的文件路径|plates] [strict]
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

const VW = 540, VH = 960;
const profile = join(process.cwd(), '.audit-profile');
rmSync(profile, { recursive: true, force: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9339', `--user-data-dir=${profile}`,
  `--window-size=${VW},${VH}`, '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio',
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
async function evalJs(expression, awaitPromise = false) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
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
await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: true });
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

// ---- ① 收集"有字的元素"：字色、祖先连乘透明度、矩形、是否禁用/半透明态 ----
const COLLECT = `(() => {
  const parse = (s) => { const m = /rgba?\\(([^)]+)\\)/.exec(s || ''); if (!m) return null;
    const p = m[1].split(',').map(x => parseFloat(x)); return { c: [p[0], p[1], p[2]], a: p.length > 3 ? p[3] : 1 }; };
  const alphaOf = (e) => { let a = 1; for (let cur = e; cur; cur = cur.parentElement) a *= parseFloat(getComputedStyle(cur).opacity) || 1; return a; };
  const hex = (c) => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const INACTIVE = /(^|[\\s._-])(off|dim|lock|locked|disabled)(\\b|[\\s._-])|\\.lock(ed)?\\b|\\.off\\b|\\.dim\\b/i;
  // 只有一个图形符号、没有任何真实文字的元素：emoji 字形自带颜色，CSS 的 color 对它无意义，
  // 拿它算字色对比度必然算错（旧版就把顶栏三枚按钮判成"黑字压暗底 1.17:1"）。单列一组报出来。
  const ONLY_GLYPH = /^[\\p{Extended_Pictographic}\\uFE0F\\u200D\\s]+$/u;
  const list = [];
  const glyphs = [];
  for (const e of document.querySelectorAll('#homeUi *')) {
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) continue;
    const own = [...e.childNodes].some(x => x.nodeType === 3 && x.textContent.trim().length);
    if (!own) continue;
    const b = e.getBoundingClientRect();
    if (b.width < 4 || b.height < 4) continue;
    // ⚠ **取字形的墨盒，不是元素的边框盒**（2026-09-22 三十七轮改口径）。
    //   元素盒在"斜切条"这一族上会明显大于字所在的区域：平行四边形的两个三角角口透过去
    //   露出底下近黑的轨道，一条板本身还带暗底厚边——这些像素**一个都没压在字背后**，
    //   却把均值拖 dark 一大截（实测「普通」那格：墨盒背板 6.4:1，元素盒背板 3.99:1，
    //   而肉眼看着清楚）。WCAG 问的是"这些字压在那块东西上认不认得出"，所以量墨盒才是问对问题。
    //   这不是放宽判据：阈值、4.5、大字号豁免、inactive 另计，一条都没动；
    //   板面花不花仍然照报（背板标准差 >28 进 plates 那组，靠人看一眼的机制不变）。
    let box = b;
    try {
      const rg = document.createRange();
      rg.selectNodeContents(e);
      const ib = rg.getBoundingClientRect();
      if (ib.width >= 4 && ib.height >= 4) box = ib;
    } catch {}
    const txt = (e.textContent || '').trim();
    const sel = e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).trim().split(/\\s+/)[0] : '');
    if (ONLY_GLYPH.test(txt)) { glyphs.push({ sel, txt: txt.slice(0, 8) }); continue; }
    const fg = parse(cs.color); if (!fg) continue;
    const a = alphaOf(e);
    list.push({
      sel, txt: txt.slice(0, 14), fs: Math.round(parseFloat(cs.fontSize)), fw: cs.fontWeight,
      fg: hex(fg.c), fga: Math.round(fg.a * a * 100) / 100,
      x: Math.round(box.left), y: Math.round(box.top), w: Math.round(box.width), h: Math.round(box.height),
      ex: Math.round(b.left), ey: Math.round(b.top), ew: Math.round(b.width), eh: Math.round(b.height),
      inactive: INACTIVE.test((typeof e.className === 'string' ? e.className : '') + ' ' + (e.getAttribute('disabled') !== null ? 'disabled' : '')) || fg.a * a < 0.95,
    });
  }
  return JSON.stringify({ list, glyphs });
})()`;

// 藏字用的覆盖样式：只让字形不画，背板、投影、版面一律原样保留。
// -webkit-text-fill-color 是必须的——emoji/彩色字形不吃 color:transparent，只吃这一个。
const HIDE_TEXT = '#homeUi, #homeUi * { color: transparent !important; -webkit-text-fill-color: transparent !important; }';

// ---- ④ 把截屏画进 canvas，逐元素采样背板均值与方差 ----
function sampler(dataUrl, list) {
  return `(async () => {
    const img = new Image();
    img.src = ${JSON.stringify(dataUrl)};
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const sx = img.naturalWidth / ${VW}, sy = img.naturalHeight / ${VH};
    const out = [];
    for (const it of ${JSON.stringify(list)}) {
      // 矩形可能整条或部分滚出视口：完全在外的记为 null，部分在内的按相交区域采
      const x0 = Math.max(0, it.x), y0 = Math.max(0, it.y);
      const x1 = Math.min(${VW}, it.x + it.w), y1 = Math.min(${VH}, it.y + it.h);
      if (x1 - x0 < 3 || y1 - y0 < 3) { out.push(null); continue; }
      const px = ctx.getImageData(Math.round(x0 * sx), Math.round(y0 * sy),
        Math.max(1, Math.round((x1 - x0) * sx)), Math.max(1, Math.round((y1 - y0) * sy))).data;
      let n = 0, r = 0, g = 0, b = 0, lsum = 0, lsq = 0;
      for (let i = 0; i < px.length; i += 4) {
        const R = px[i], G = px[i + 1], B = px[i + 2];
        r += R; g += G; b += B;
        const L = 0.2126 * R + 0.7152 * G + 0.0722 * B;
        lsum += L; lsq += L * L; n++;
      }
      if (!n) { out.push(null); continue; }
      const mean = [r / n, g / n, b / n];
      const varr = Math.max(0, lsq / n - (lsum / n) * (lsum / n));
      out.push([Math.round(mean[0]), Math.round(mean[1]), Math.round(mean[2]), Math.round(Math.sqrt(varr))]);
    }
    return JSON.stringify(out);
  })()`;
}

const lum = (c) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };
const over = (fg, bg) => [0, 1, 2].map(i => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
const toRgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

// ---- 一轮完整测量：收集 → 藏字截屏 → 采样 → 算比值 ----
async function measure() {
  const { list, glyphs } = JSON.parse(await evalJs(COLLECT));
  await evalJs(`(() => { const s = document.createElement('style'); s.id = 'auditHideText'; s.textContent = ${JSON.stringify(HIDE_TEXT)}; document.head.appendChild(s); return 1; })()`);
  await sleep(120);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await evalJs(`document.getElementById('auditHideText')?.remove(); 1`);
  const dataUrl = 'data:image/png;base64,' + shot.data;
  const samples = JSON.parse(await evalJs(sampler(dataUrl, list), true));
  const bad = [], off = [], busy = [];
  let worst = 99, unsampled = 0;
  list.forEach((it, i) => {
    const s = samples[i];
    if (!s) { unsampled++; return; }
    const bg = [s[0], s[1], s[2]];
    const rec = {
      sel: it.sel, txt: it.txt, fs: it.fs, fw: it.fw, fg: it.fg,
      box: [it.x, it.y, it.w, it.h],
      bg: '#' + bg.map(v => v.toString(16).padStart(2, '0')).join(''),
      sd: s[3], a: it.fga,
      r: Math.round(ratio(over(toRgb(it.fg).concat([it.fga]), bg), bg) * 100) / 100,
    };
    if (rec.r < worst) worst = rec.r;
    // 背板标准差 > 28 = 底下不是平色而是一张图/一片渐变，均值达标也不代表每一笔都达标
    if (rec.sd > 28) busy.push(rec);
    if (rec.r >= THRESHOLD) return;
    if (it.inactive) off.push(rec); else bad.push(rec);
  });
  return { checked: list.length, bad, inactive: off, busy, glyphs, unsampled, worst: Math.round(worst * 100) / 100 };
}

// 等贴图落定再量：`_tex` 是异步排水的（HomeUiCore._pendingTexTimer 每 400ms 重排），
// 一张图从"没有"到"有"会改变背板像素。连量两次直到计数与不合格集合都不动才认。
let res = null;
for (let i = 0; i < 5; i++) {
  const r = await measure();
  if (res && res.checked === r.checked && res.bad.length === r.bad.length) { res = r; break; }
  res = r;
  await sleep(1500);
}

const busyN = res.busy.length;
console.log(`\n页签 ${page} · 阈值 ${THRESHOLD}:1 · 量了 ${res.checked} 个有字元素（背板按截屏像素取样；另有 ${res.glyphs.length} 个纯图形符号不算字色、${res.unsampled} 个滚出视口量不到）· 最低比值 ${res.worst}:1 · 不合格 ${res.bad.length} 个`);
for (const x of res.bad.sort((a, b) => a.r - b.r)) {
  console.log(`  ${String(x.r).padStart(5)}:1  ${x.sel.padEnd(18)} 字「${x.txt}」 ${x.fs}px/${x.fw}  字色 ${x.fg} on 实测背板 ${x.bg}（背板明度标准差 ${x.sd}）  盒 ${x.box.join('×')}`);
}
if (res.inactive.length) {
  const worstOff = res.inactive.reduce((m, x) => Math.min(m, x.r), 99);
  console.log(`  禁用/半透明态另计 ${res.inactive.length} 个（WCAG 对 inactive controls 豁免，最低 ${worstOff}:1）：`
    + res.inactive.slice(0, 6).map(x => `${x.sel.split('.')[1] || x.sel} ${x.r}:1`).join('、'));
}
if (cssFile === 'plates') {
  console.log(`  压在花背景上的字（背板明度标准差 >28，均值达标也要看一眼）共 ${busyN} 个：`);
  const bySd = [...res.busy].sort((a, b) => b.sd - a.sd);
  for (const x of bySd.slice(0, 14)) {
    console.log(`    σ${String(x.sd).padStart(3)}  ${String(x.r).padStart(5)}:1  ${x.sel.padEnd(18)} 字「${x.txt}」 ${x.fg} on ${x.bg}`);
  }
  if (res.glyphs.length) {
    console.log(`  纯图形符号位（emoji 自带颜色，不参与字色对比）${res.glyphs.length} 个：`
      + res.glyphs.slice(0, 12).map(g => `${g.txt}@${g.sel.split('.')[1] || g.sel}`).join('、'));
  }
}
const dir = resolve('..', 'gen-output');
mkdirSync(dir, { recursive: true });
const outFile = join(dir, `contrast-${page}-${Date.now()}.json`);
writeFileSync(outFile, JSON.stringify(res, null, 1));
console.log(`  明细写入 ${outFile}`);
chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(res.bad.length > 0 && process.argv[6] === 'strict' ? 1 : 0);

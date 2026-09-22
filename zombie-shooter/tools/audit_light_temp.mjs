// 光向与色温普查：把屏幕上每一族"会画东西的面"量成一行——它多亮、偏暖还是偏冷、高光在上还是在下。
//
// 为什么要量而不是看：对标《向僵尸开炮》第 4 条说的是"所有高光同一个色温、光源只有一个方向"，
// 而我们这边是冷蓝底 + 金强调 + 灰金属板并存。"并存"是眼睛的结论，改哪几族、改成多少度得靠数。
// 更麻烦的是这批面**一半是贴图、一半是 CSS 渐变**，`getComputedStyle` 读不出贴图实际画成什么色，
// 所以只能回到屏幕上取像素——口径与 contrast_audit.mjs 一致（那轮换眼睛的结论直接复用）。
//
// 三条实测口径：
//   暖度 = R - B（正值偏暖、负值偏冷；同一屏里两族符号相反就是"色温打架"）
//   光向 = 上缘亮度 - 下缘亮度（正值=上面亮=顶光，负值=下面亮=脚底光）
//   来源 = 九宫格板（border-image）/ 贴图（background-image）/ 纯色或渐变（background-color）
// 按"来源"归族（同一张板图铺在 20 个格子上只算一行，带计数），不然满屏都是重复条目。
//
// 用法：node tools/audit_light_temp.mjs <url> [页签名|home]
//   需要 127.0.0.1:7456 已起 serve.mjs（node tools/serve.mjs build/web-mobile 7456 127.0.0.1）
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = process.argv[2];
const page = process.argv[3] || 'home';
if (!url) { console.error('need url'); process.exit(1); }
const VW = 540, VH = 960;
const profile = join(process.cwd(), '.light-profile');
rmSync(profile, { recursive: true, force: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9345', `--user-data-dir=${profile}`,
  `--window-size=${VW},${VH}`, '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio',
  '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function findWs(tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const l = await (await fetch('http://127.0.0.1:9345/json/list')).json();
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
  const id = ++seq; ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => pending.set(id, m => m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result)));
}
async function evalJs(expression, awaitPromise = false) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 400));
  return r.result?.value;
}
async function until(expr, ms, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (await evalJs(expr)) return true; } catch {} await sleep(800); }
  console.log('  timeout:', label); return false;
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: true });
await send('Page.navigate', { url });
await until(`!!document.querySelector('.lgStart')`, 45000, 'login');
await sleep(700);
await evalJs(`document.querySelector('.lgStart')?.click(); 1`);
await until(`!!document.querySelector('#homeUi .tab')`, 30000, 'home');
await sleep(4500);
for (let i = 0; i < 3; i++) {
  if (!await evalJs(`!!document.querySelector('.popClose')`)) break;
  await evalJs(`document.querySelector('.popClose')?.click(); 1`);
  await sleep(900);
}
if (page !== 'home') {
  await evalJs(`(() => { const t=[...document.querySelectorAll('#homeUi .tabbar .tab')].find(e=>(e.textContent||'').indexOf(${JSON.stringify(page)})>=0); if(t)t.click(); return !!t; })()`);
  await sleep(1600);
}

// 收集"会画东西的面"。只要自己就画底（背景色/背景图/九宫格板），不看继承来的透明层。
//
// ⚠ **只量"没有被孩子盖住"的面**（paintedKids === 0）。第一版没这条，读出来的数是错的：
// 截图取的是那一片**实际显示**的像素，容器盒里摆着卡片，量到的就是卡片的内容而不是容器自己那块底。
// 于是 `.dungeons`（一个平涂 `--c-scene-2`）被报成"底光 -49"——那四条副本卡的高光在底部，不是容器的。
// 按这个数去"把容器改成顶光"就是照着假数据动手。
const COLLECT = `(() => {
  const paints = (e) => {
    const cs = getComputedStyle(e);
    const bi = cs.borderImageSource;
    if (bi && bi !== 'none') return true;
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
    const m = /rgba?\\(([^)]+)\\)/.exec(cs.backgroundColor || '');
    return !!(m && (m[1].split(',').length < 4 || parseFloat(m[1].split(',')[3]) > 0.06));
  };
  const out = [];
  for (const e of document.querySelectorAll('#homeUi *')) {
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) continue;
    const b = e.getBoundingClientRect();
    if (b.width < 26 || b.height < 16) continue;
    const bi = cs.borderImageSource;
    const bg = cs.backgroundImage;
    const isPlate = bi && bi !== 'none';
    const isImg = !isPlate && bg && bg !== 'none';
    let kind, src;
    if (isPlate) { kind = '板'; src = bi.replace(/^url\\("?/, '').replace(/"?\\).*$/, '').split('/').slice(-2).join('/'); }
    else if (isImg) { kind = '贴图'; src = bg.replace(/^url\\("?/, '').replace(/"?\\).*$/, '').split('/').slice(-2).join('/'); }
    else {
      const m = /rgba?\\(([^)]+)\\)/.exec(cs.backgroundColor || '');
      if (!m) continue;
      const p = m[1].split(',').map(x => parseFloat(x));
      if ((p.length > 3 ? p[3] : 1) < 0.06) continue;
      kind = 'CSS色'; src = 'rgb(' + Math.round(p[0]) + ',' + Math.round(p[1]) + ',' + Math.round(p[2]) + ')';
    }
    // 孩子里只要有一个画底、而且盒子里装得下它，这一族就交给孩子去报，自己不进样本
    let paintedKids = 0;
    for (const c of e.querySelectorAll('*')) {
      if (c.getBoundingClientRect().width < 6) continue;
      if (paints(c)) paintedKids++;
    }
    if (paintedKids) continue;
    out.push({
      kind, src,
      sel: e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/)[0] : ''),
      x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height),
    });
  }
  return JSON.stringify(out);
})()`;

// 藏字截屏，再逐面取"整块均值 + 上缘 + 下缘"三条亮度
const HIDE_TEXT = '#homeUi, #homeUi * { color: transparent !important; -webkit-text-fill-color: transparent !important; }';

function sampler(dataUrl, list) {
  return `(async () => {
    const img = new Image(); img.src = ${JSON.stringify(dataUrl)}; await img.decode();
    const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
    const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
    const sx = img.naturalWidth / ${VW}, sy = img.naturalHeight / ${VH};
    const band = (x0, y0, x1, y1) => {
      const d = ctx.getImageData(Math.round(x0 * sx), Math.round(y0 * sy),
        Math.max(1, Math.round((x1 - x0) * sx)), Math.max(1, Math.round((y1 - y0) * sy))).data;
      let n = 0, r = 0, g = 0, b = 0, L = 0;
      for (let i = 0; i < d.length; i += 4) {
        r += d[i]; g += d[i + 1]; b += d[i + 2];
        L += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++;
      }
      return n ? [r / n, g / n, b / n, L / n] : null;
    };
    const out = [];
    for (const it of ${JSON.stringify(list)}) {
      const x0 = Math.max(0, it.x), y0 = Math.max(0, it.y);
      const x1 = Math.min(${VW}, it.x + it.w), y1 = Math.min(${VH}, it.y + it.h);
      if (x1 - x0 < 8 || y1 - y0 < 8) { out.push(null); continue; }
      const all = band(x0, y0, x1, y1);
      const strip = Math.max(2, Math.round((y1 - y0) * 0.18));
      const top = band(x0, y0, x1, y0 + strip);
      const bot = band(x0, y1 - strip, x1, y1);
      out.push(all && top && bot ? [all, top, bot] : null);
    }
    return JSON.stringify(out);
  })()`;
}

await evalJs(`(() => { const s = document.createElement('style'); s.id = 'ltHide'; s.textContent = ${JSON.stringify(HIDE_TEXT)}; document.head.appendChild(s); return 1; })()`);
await sleep(140);
const shot = await send('Page.captureScreenshot', { format: 'png' });
await evalJs(`document.getElementById('ltHide')?.remove(); 1`);
const { list } = { list: JSON.parse(await evalJs(COLLECT)) };
const samples = JSON.parse(await evalJs(sampler('data:image/png;base64,' + shot.data, list), true));

// 按"选择器族"归族：同一块板/同一个类铺在 20 个格子上只出一行，带计数。
// 为什么不用图片来源当身份：构建产物里图片文件名是内容哈希 uuid（`68/68901b6d-….png`），
// 读不出对应哪个契约 key，第一版照 src 归族打出来满屏 uuid，等于没量。
const fam = new Map();
list.forEach((it, i) => {
  const s = samples[i];
  if (!s) return;
  const k = it.kind + '|' + it.sel;
  const f = fam.get(k) || { kind: it.kind, sel: it.sel, n: 0, warm: 0, lum: 0, dir: 0, srcs: new Set(), area: 0 };
  const [all, top, bot] = s;
  f.n++;
  f.warm += all[0] - all[2];
  f.lum += all[3];
  f.dir += top[3] - bot[3];
  f.area = Math.max(f.area, it.w * it.h);
  if (f.srcs.size < 2) f.srcs.add(it.src.slice(0, 6));
  fam.set(k, f);
});
const rows = [...fam.values()].map(f => ({
  kind: f.kind, sel: f.sel, n: f.n, src: [...f.srcs].join(','),
  warm: Math.round(f.warm / f.n), lum: Math.round(f.lum / f.n), dir: Math.round(f.dir / f.n),
})).sort((a, b) => a.warm - b.warm);

console.log(`\n页签 ${page} · 会画东西的面 ${rows.length} 族（同一 class 算一族，×N = 这一族有几个格子）`);
console.log('  暖度=R-B（正=偏暖 负=偏冷）   亮度=0~255   光向=上缘-下缘（正=顶光 负=脚底光）');
for (const r of rows) {
  const wl = r.warm > 6 ? '暖' : r.warm < -6 ? '冷' : '中性';
  const dl = r.dir > 8 ? '顶光' : r.dir < -8 ? '底光' : '平';
  console.log(`  ${String(r.warm).padStart(4)} ${wl}  亮${String(r.lum).padStart(3)}  ${dl}${String(r.dir).padStart(4)}  ×${String(r.n).padStart(2)}  ${r.kind.padEnd(4)} ${(r.sel || '').slice(0, 30).padEnd(30)} 图 ${r.src}`);
}
const warmN = rows.filter(r => r.warm > 6).length, coolN = rows.filter(r => r.warm < -6).length;
const topN = rows.filter(r => r.dir > 8).length, botN = rows.filter(r => r.dir < -8).length;
console.log(`  色温：暖 ${warmN} 族 / 冷 ${coolN} 族 / 中性 ${rows.length - warmN - coolN} 族`
  + `   光向：顶光 ${topN} 族 / 底光 ${botN} 族 / 平 ${rows.length - topN - botN} 族`);
chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}

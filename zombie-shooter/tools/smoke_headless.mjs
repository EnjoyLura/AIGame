// 无头烟测：ZCode 内置浏览器在窗口后台时 rAF 被冻结、引擎起不来（AGENTS.md 已知坑），
// 用系统 Chrome --headless 走 CDP 驱动游戏并截图，不依赖窗口前台。
// 用法：node tools/smoke_headless.mjs <url> <outDir>
//   [steps] 可选，默认 login->home->battle 全流程
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = process.argv[2];
const outDir = resolve(process.argv[3] || 'gen-output/smoke');
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
chrome.stderr.on('data', d => process.stderr.write(d));

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
// 页面里的异常与 console.error 不会自己冒到 stdout——接了图却每帧抛错这种坑只能自己捞。
// 去重后限量打印（每帧抛的错一次烟测能刷上千条）。
const pageErrs = [];
const seenErr = new Set();
const dbgSeen = new Set();
let dbgPrinted = 0;
function noteErr(kind, text) {
  if (!text) return;
  if (kind === 'log') {
    // 排障：只放行精英徽标的诊断行，且不去重（w=(波次 ec=精英率) 每波都在变）
    const t = String(text);
    if (!/^DBG-AFFIX/.test(t) || dbgSeen.has(t) || dbgPrinted >= 14) return;
    dbgSeen.add(t); dbgPrinted++;
    console.log('  [page]', t.slice(0, 200));
    return;
  }
  if (seenErr.has(text) || pageErrs.length >= 12) return;
  seenErr.add(text);
  pageErrs.push(kind + ': ' + String(text).slice(0, 300));
  console.log('  [page]', kind, String(text).slice(0, 300));
}
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  else if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    noteErr('exception', d.exception?.description ?? d.text);
  } else if (msg.method === 'Runtime.consoleAPICalled') {
    const t = msg.params.type;
    if (t === 'error' || t === 'warning' || t === 'log') {
      noteErr(t, (msg.params.args || []).map(a => a.value ?? a.description ?? a.type).join(' '));
    }
  }
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
// 轮询直到谓词为真
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

// 1. 进游戏
await send('Page.navigate', { url });
await waitUntil(`!!document.querySelector('canvas')`, 20000, 'canvas');
await waitUntil(`!!document.querySelector('.lgStart')`, 30000, 'lgStart');
await sleep(1500);
await shot('01-login');

// 2. 点开始 → 等主城
await evalJs(`document.querySelector('.lgStart')?.click(); 1`);
await waitUntil(`!!document.querySelector('.popClose') || !!document.querySelector('[class*=topbar]')`, 30000, 'home popup/topbar');
await sleep(2000);
// 首弹关闭（可能有多层，逐个关到没有）
for (let i = 0; i < 3; i++) {
  const has = await evalJs(`!!document.querySelector('.popClose')`);
  if (!has) break;
  await evalJs(`document.querySelector('.popClose')?.click(); 1`);
  await sleep(1200);
}
await sleep(1500);
await shot('02-home');

// 2b. 开公告弹层验证面板底板/绶带/喇叭图标
await evalJs(`document.querySelector('.homeNoticeBtn')?.click(); 1`);
await sleep(2000);
await shot('02b-notice-pop');
await evalJs(`document.querySelector('.popClose')?.click(); 1`);
await sleep(1200);

// 2c. 二级页签贴图核对（ART-PLAN D20：接线轮必须验贴图真的上了屏，代码接了不算）
//     三条判据一起看：backgroundImage 是 url(...) = 图挂上了；glyph 被摘成空串 = icon() 走过；
//     宽度非零 = CSS 尺寸令牌生效（贴图槽宽度归 CSS，读不到 --pw 时会量出 0）。
const tabProbe = (sel) => evalJs(`JSON.stringify([...document.querySelectorAll('${sel} .ticon')].map(ic => {
  const cs = getComputedStyle(ic);
  return (ic.parentElement.textContent || '').trim() + '|bg=' + (/url\\(/.test(cs.backgroundImage) ? 'Y' : 'N')
    + '|glyph=' + JSON.stringify(ic.textContent) + '|w=' + Math.round(ic.getBoundingClientRect().width);
}))`);
const gotoTab = (name) => evalJs(`(() => {
  const el = [...document.querySelectorAll('#homeUi .tab')].find(e => (e.textContent || '').indexOf('${name}') >= 0);
  if (!el) return 'NOT FOUND';
  el.click(); return (el.textContent || '').trim();
})()`);
console.log('nav ->', await gotoTab('商店'));
await sleep(2500);
console.log('shopTabs:', await tabProbe('.shopTabs'));
await shot('02c-shop-tabs');
// 2c-2. 切到「材料」货架，验货卡 .gIc 的材料/宝石贴图真的上了屏（同 D20 判据）
const clickedMat = await evalJs(`(() => {
  const el = [...document.querySelectorAll('.shopTabs button')].find(e => /材料/.test(e.textContent || ''));
  if (!el) return 'NOT FOUND';
  el.click(); return (el.textContent || '').trim();
})()`);
console.log('shop tab ->', clickedMat);
await sleep(2200);
// 货卡在页签条下方、首屏看不到：把第一张滚进画面再截，否则这张图永远验不到材料贴图
await evalJs(`document.querySelector('.gIc')?.scrollIntoView({block:'center'}); 1`);
await sleep(700);
console.log('gIc:', await evalJs(`JSON.stringify([...document.querySelectorAll('.gIc')].slice(0, 8).map(e => {
  const cs = getComputedStyle(e);
  const b = e.getBoundingClientRect();
  return JSON.stringify(e.textContent || '').slice(0, 8) + '|bg=' + (/url\\(/.test(cs.backgroundImage) ? 'Y' : 'N')
    + '|box=' + Math.round(b.width) + 'x' + Math.round(b.height);
}))`));
await shot('02e-shop-mat-goods');
console.log('nav ->', await gotoTab('英雄'));
await sleep(2500);
console.log('bagTabs:', await tabProbe('.bagTabs'));
await shot('02d-bag-tabs');

// 2d-2. Step2 图标类自测（D20）：背包检索框的放大镜真的上图了吗；输入后网格是否真的被筛
console.log('uiSearch:', await evalJs(`(() => {
  const ic = document.querySelector('.uiSearch i');
  if (!ic) return 'NOT FOUND';
  const cs = getComputedStyle(ic);
  return 'bg=' + (/url\\(/.test(cs.backgroundImage) ? 'Y' : 'N') + '|glyph=' + JSON.stringify(ic.textContent)
    + '|w=' + Math.round(ic.getBoundingClientRect().width);
})()`));
await evalJs(`(() => {
  const inp = document.querySelector('.uiSearch input');
  if (!inp) return 'NOT FOUND';
  inp.value = 'zzz无此名';
  inp.dispatchEvent(new Event('input'));
  return 1;
})()`);
await sleep(1500);
console.log('bag tip:', await evalJs(`(document.querySelector('.bagGrid .mSub') || {}).textContent || 'NONE'`));
await shot('02f-bag-search');
await evalJs(`(() => {
  const inp = document.querySelector('.uiSearch input');
  if (!inp) return 'NOT FOUND';
  inp.value = '';
  inp.dispatchEvent(new Event('input'));
  return 1;
})()`);
await sleep(1200);

// 2d-3. 好友入口（本轮新建的功能位）：图标上图 + 点开有弹窗 + 弹窗有出路，不是静默死键
console.log('nav ->', await gotoTab('行动'));
await sleep(2500);
console.log('friendIc:', await evalJs(`(() => {
  const b = [...document.querySelectorAll('.action-footer .hot')].find(e => /好友/.test(e.textContent || ''));
  if (!b) return 'NOT FOUND';
  const ic = b.querySelector('.ic');
  return 'bg=' + (/url\\(/.test(getComputedStyle(ic).backgroundImage) ? 'Y' : 'N') + '|glyph=' + JSON.stringify(ic.textContent);
})()`));
await evalJs(`[...document.querySelectorAll('.action-footer .hot')].find(e => /好友/.test(e.textContent || ''))?.click(); 1`);
await sleep(2000);
console.log('friendPop:', await evalJs(`(() => {
  const rows = [...document.querySelectorAll('.pop .popAttr .at')].map(e => (e.textContent || '').trim().slice(0, 18));
  const cta = [...document.querySelectorAll('.pop .popBtn, .pop .popCTA')].map(e => (e.textContent || '').trim());
  return JSON.stringify({ rows, cta });
})()`));
await shot('02g-friend-pop');
await evalJs(`document.querySelector('.popClose')?.click(); 1`);
await sleep(1200);

// 3. 找护送入口进玩法页（按文本找：护送）
const navDump = await evalJs(`JSON.stringify([...document.querySelectorAll('button,[class*=btn],[class*=tab],[class*=nav] i, [class*=nav] span')].map(e => (e.className + '|' + (e.textContent || '').trim().slice(0, 10))).slice(0, 60))`);
console.log('nav candidates:', navDump);
const clickedNav = await evalJs(`(() => {
  const els = [...document.querySelectorAll('button,[class*=btn],[class*=tab],[class*=nav] *')];
  const el = els.find(e => /护送/.test((e.textContent || '').trim()) && e.children.length <= 3);
  if (!el) return 'NOT FOUND';
  const t = el.className + '|' + (el.textContent || '').trim().slice(0, 10);
  el.click(); return t;
})()`);
console.log('clicked nav:', clickedNav);
await sleep(2500);
await shot('03-escort-page');

// 4. 点出战进战斗
const clickedStart = await evalJs(`(() => {
  const els = [...document.querySelectorAll('button,[class*=btn],[class*=start],[class*=cta]')];
  const el = els.find(e => /出战|开始|挑战|出击/.test((e.textContent || '').trim()));
  if (!el) return 'NOT FOUND';
  const t = el.className + '|' + (el.textContent || '').trim().slice(0, 10);
  el.click(); return t;
})()`);
console.log('clicked start:', clickedStart);
await sleep(2000);
// 可能有出战确认弹层 → 再点一次出战
await evalJs(`(() => {
  const els = [...document.querySelectorAll('button,[class*=btn]')];
  const el = els.find(e => /出战|开始/.test((e.textContent || '').trim()));
  if (el) el.click();
  return 1;
})()`);
// 等战斗 HUD / 场景
await waitUntil(`!!document.querySelector('[class*=hud]')`, 25000, 'battle hud');
await sleep(6000);
await shot('04-battle');
// 若停在升级选卡（Cocos canvas 渲染，DOM 点不到）→ 直接对画布卡片坐标点击
async function tap(x, y) {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}
// 击杀数（DOM HUD）在涨 = 战斗在跑；停了 = 升级选卡又弹了 → 点卡
async function kills() {
  return await evalJs(`(() => { const m = (document.body.innerText || '').match(/击杀[^0-9]*(\\d+)/); return m ? +m[1] : -1; })()`);
}
let lastK = -1, shot1 = false, shot2 = false, t05 = 0;
for (let i = 0; i < 60 && !shot2; i++) {
  await sleep(1200);
  const k = await kills();
  const inc = k > lastK;
  lastK = k;
  if (!inc) { await tap([270, 110, 430][i % 3], 505); continue; }
  // 在跑：第一次涨 → 截 05；再涨一次且离 05 有 4s+ → 截 06
  if (!shot1) { await sleep(1500); await shot('05-battle-later'); shot1 = true; t05 = Date.now(); continue; }
  if (!shot2 && Date.now() - t05 > 4000) { await shot('06-battle-more'); shot2 = true; }
}
if (!shot2) await shot('06-battle-more');

// 6b. 本波精英词缀徽标（Step2 状态图标族的第一个宿主）：有精英时该行应展开且每枚都上了图
console.log('afRow:', await evalJs(`(() => {
  const r = document.querySelector('#domHud .afRow');
  if (!r) return 'NOT FOUND';
  const kids = [...r.children].map(c => {
    const cs = getComputedStyle(c);
    return (c.title || '?') + '|bg=' + (/url\\(/.test(cs.backgroundImage) ? 'Y' : 'N') + '|glyph=' + JSON.stringify(c.textContent);
  });
  return 'display=' + r.style.display + ' n=' + kids.length + ' [' + kids.join(', ') + ']';
})()`));
// 第 1~3 波 eliteChance=0，上面那条只验到「没精英就整行收起」。本关第 4/5 波 ec=0.1，
// 所以**不打断波次**、原地自然推进（GM「下一波」跳出来的那两波实测整波不刷怪，另记一条待查缺陷），
// 期间每 4s 补一次车耐久，否则车被打空后读到的都是死局数据。
const gmClick = (label) => evalJs(`(() => {
  const el = [...document.querySelectorAll('button')].find(e => (e.textContent || '').trim() === '${label}');
  if (el) el.click();
  return !!el;
})()`);
for (let i = 0; i < 240; i++) {
  if (i % 8 === 0) {
    await gmClick('车回满');
  }
  const probe = await evalJs(`(() => {
    const r = document.querySelector('#domHud .afRow');
    const wave = document.querySelector('#domHud .waveChip .chipVal');
    const kill = document.querySelector('#domHud .killChip .chipVal');
    const kids = r ? [...r.children].map(c => {
      const cs = getComputedStyle(c);
      return (c.title || '?') + '|bg=' + (/url\\(/.test(cs.backgroundImage) ? 'Y' : 'N') + '|glyph=' + JSON.stringify(c.textContent);
    }) : [];
    return JSON.stringify({ wave: (wave && wave.textContent) || '?', kill: (kill && kill.textContent) || '?',
      paused: /paused/.test(document.querySelector('#domHud')?.className || '') ? 'Y' : 'N',
      display: r ? r.style.display : 'NO ROW', kids });
  })()`);
  const p = JSON.parse(probe);
  if (p.kids.length) {
    console.log(`afRow@wave${p.wave} 击杀${p.kill}: display=${p.display} n=${p.kids.length} [${p.kids.join(', ')}]`);
    await shot('06b-affix-badges');
    break;
  }
  if (i % 40 === 39) {
    console.log(`  afRow 进度: wave=${p.wave} 击杀=${p.kill} paused=${p.paused} display=${p.display}`);
  }
  if (i === 239) {
    console.log(`afRow@wave${p.wave}: 整轮没有存活精英可读（display=${p.display}）——宿主行本身存在，未见亮灯`);
  }
  // 卡在「团队升级三选一」时整局是暂停的（波次与击杀都不动），点一张卡把它推下去
  if (p.paused === 'Y') {
    await tap([150, 270, 390][i % 3], 470);
  }
  await sleep(500);
}

// 7. 伤害统计面板：名次奖牌贴图核对（同 D20）。三档应有图且数字留在环心，第 4 名应保持 CSS 板
await evalJs(`document.querySelector('.statsBtn')?.click(); 1`);
await sleep(2200);
console.log('statRank:', await evalJs(`JSON.stringify([...document.querySelectorAll('#domHud .statRank')].map(e => {
  const cs = getComputedStyle(e);
  return e.textContent.trim() + '|bg=' + (/url\\(/.test(cs.backgroundImage) ? 'Y' : 'N')
    + '|ink=' + cs.color + '|fs=' + cs.fontSize + '|w=' + Math.round(e.getBoundingClientRect().width);
}))`));
await shot('07-stats-medals');

ws.close();
chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
console.log('page errors:', pageErrs.length ? pageErrs.length + ' 类（详见上面 [page] 行）' : '0');
console.log('done');
process.exit(0);

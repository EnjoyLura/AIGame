// 战斗表现件自测器：一次跑完五件特效，逐个「目击即截图」。
// 为什么不能沿用 battle_probe.mjs：这五件里四件是**画布节点**（DOM 普查读不到），
// 而且各自只活 0.1~0.25 秒，定点截一张几乎必然错过。这里换两条腿：
//  ① 从 SystemJS 把引擎模块取出来（构建产物 src/import-map.json 里 "cc" → cocos-js/cc.js），
//     直接遍历场景图数节点，命中就当场截图——不往游戏代码里加任何调试日志；
//  ② 用游戏自带的 GM 面板驱动流程（升级 / 清屏 / 下一波），不必真打一整局。
// 用法：node tools/fx_probe.mjs <url> <outDir> [关卡=1]
//   需先起静态服务：node tools/serve.mjs build/web-mobile 7456 127.0.0.1
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = process.argv[2];
const outDir = resolve(process.argv[3] || 'gen-output/fx-probe');
const stage = Number(process.argv[4]) || 1;
if (!url) { console.error('need url'); process.exit(1); }
mkdirSync(outDir, { recursive: true });

// 画布件名 → 采购单 key；clBurst 是 DOM 件，单独查
const WATCH = { Portal: 'fx/portal', WordBg: 'fx/dmg_word', Glow: 'fx/levelup_glow', BeamArt: 'weapons/laser_beam' };

const profile = join(outDir, '.chrome-profile');
rmSync(profile, { recursive: true, force: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9337', `--user-data-dir=${profile}`,
  '--window-size=540,960', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio',
  '--no-first-run', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding', 'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });
chrome.stderr.on('data', d => process.stderr.write(d));

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function findWs(tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const l = await (await fetch('http://127.0.0.1:9337/json/list')).json();
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
const errors = new Set();
ws.onmessage = ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    const txt = 'exception: ' + (d.exception?.description ?? d.text ?? '');
    if (!errors.has(txt)) { errors.add(txt); console.log('  [page]', txt.slice(0, 240)); }
  }
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

/** 遍历场景图数节点；顺带把 DOM 那件（金币爆开）一起报，一次轮询覆盖五件 */
const CENSUS = `(async () => {
  const cc = window.__cc || (window.System ? await System.import('cc') : null);
  if (!cc) return JSON.stringify({ err: 'no cc module' });
  window.__cc = cc;
  const scene = cc.director.getScene();
  if (!scene) return JSON.stringify({ err: 'no scene' });
  const out = {};
  const names = {};
  const rects = {};
  const walk = (n) => {
    const kids = n.children || [];
    for (let i = 0; i < kids.length; i++) walk(kids[i]);
    if (!${JSON.stringify(Object.keys(WATCH))}.includes(n.name)) return;
    const sp = n.getComponent(cc.Sprite);
    if (n.activeInHierarchy && sp && sp.enabled && sp.spriteFrame) {
      out[n.name] = (out[n.name] || 0) + 1;
      names[n.name] = sp.spriteFrame.name;
      // 屏幕 CSS 像素矩形：只报第一枚，给取景裁切用（画布件在 DOM 里量不到，位置只能从场景图问）。
      // UI 世界坐标的原点在**屏幕左下角**（Canvas 节点自己在视口中心），不是屏幕中心——按中心算会整体偏半屏
      if (!rects[n.name]) {
        const ut = n.getComponent(cc.UITransform);
        const vs = cc.view.getVisibleSize();
        const wp = n.worldPosition;
        rects[n.name] = {
          cx: wp.x / vs.width * window.innerWidth,
          cy: (1 - wp.y / vs.height) * window.innerHeight,
          w: ut.width / vs.width * window.innerWidth,
          h: ut.height / vs.height * window.innerHeight,
        };
      }
    }
  };
  walk(scene);
  const el = document.querySelector('#domHud .clBurst');
  if (el && el.style.backgroundImage && el.style.backgroundImage !== 'none') {
    out.clBurst = 1;
    const r = el.getBoundingClientRect();
    rects.clBurst = { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height };
  }
  out.__frames = names;
  out.__rects = rects;
  return JSON.stringify(out);
})()`;

async function census() {
  try { return JSON.parse(await evalJs(CENSUS, true)) || {}; }
  catch (e) { console.log('  census error:', String(e.message).slice(0, 160)); return {}; }
}
/** 点 DOM 按钮（GM 面板那些是普通 button，按文案找） */
const clickText = (sel, text) => evalJs(`(() => {
  const el = [...document.querySelectorAll('${sel}')].find(e => (e.textContent || '').trim() === '${text}');
  if (!el) return 'NOT FOUND'; el.click(); return 'ok';
})()`);

const sighted = {};
/** 轮询到某件第一次出现就截图，返回是否目击 */
async function hunt(needles, budgetMs, label) {
  const t0 = Date.now();
  while (Date.now() - t0 < budgetMs) {
    const c = await census();
    for (const k of needles) {
      if (c[k] && !sighted[k]) {
        sighted[k] = c[k];
        await shot(`sight-${k}-${label}`);
        console.log(`  目击 ${k} (${WATCH[k] ?? 'DOM'}) ×${c[k]} frame=${c.__frames?.[k] ?? '-'} rect=${JSON.stringify(c.__rects?.[k])}`);
      }
    }
    if (needles.every(k => sighted[k])) return true;
    await sleep(180);
  }
  return needles.every(k => sighted[k]);
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 540, height: 960, deviceScaleFactor: 2, mobile: true });

console.log(`\n===== 进第 ${stage} 关 =====`);
await send('Page.navigate', { url });
await waitUntil(`!!document.querySelector('.lgStart')`, 45000, 'lgStart');
await sleep(1000);
// 补丁档：解锁到本关 + 填满体力货币 + 四英雄全拥有并上阵（激光英雄是 weapons/laser_beam 的宿主）
await evalJs(`(() => {
  const KEY = 'zombie-shooter-save';
  let d = {};
  try { d = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
  d.stageCleared = Math.max(d.stageCleared || 0, ${stage} - 1);
  d.currentStage = ${stage};
  d.ownedHeroes = ['rifle', 'sniper', 'laser', 'radiation'];
  d.lineup = ['rifle', 'laser'];
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
console.log('  出战:', await evalJs(`(() => {
  const el = [...document.querySelectorAll('#homeUi .game-button')].find(e => (e.textContent || '').indexOf('开始守卫') >= 0);
  if (!el) return 'NOT FOUND';
  el.click(); return (el.textContent || '').trim();
})()`));
await waitUntil(`!!document.querySelector('#domHud')`, 40000, 'battle hud');

console.log('\n----- A 阶段：自然战斗里抓传送门 / 暴击底纹 / 激光束 -----');
await hunt(['Portal', 'WordBg', 'BeamArt'], 40000, 'battle');

console.log('\n----- B 阶段：GM 升级抓光柱，然后替掉选卡面板 -----');
if (!sighted.Glow) {
  // GM 面板的按钮在 body 收起时也在 DOM 里，直接 .click() 就触发，不必展开面板挡镜头
  console.log('  GM 升级:', await clickText('button', '升级'));
  await hunt(['Glow'], 8000, 'levelup');
  // 光柱是"目击即拍"，那一刻三张卡还在错峰滑入（opacity 0→255），判"有没有洗白卡面文字"要等动画跑完再补一张
  await sleep(1100);
  await shot('glow-settled');
  // 光柱面板不选卡就一直暂停战斗，必须把卡点掉才能继续跑结算
  console.log('  选卡:', await evalJs(`(() => {
    const scene = window.__cc.director.getScene();
    let hit = null;
    const walk = (n) => { if (hit) return; for (const k of n.children || []) { if (k.name === 'Card0') { hit = k; return; } walk(k); } };
    walk(scene);
    if (!hit) return 'NO CARD';
    hit.emit(window.__cc.Node.EventType.TOUCH_END);
    return 'emitted';
  })()`));
  await sleep(1200);
}

console.log('\n----- C 阶段：通关结算面的金币爆开 -----');
// 真打一局到通关要几分钟，而 GM「清屏 + 下一波」推不过 BOSS 阶段；这里直接调结算面真正的建体方法
// `_fillClearBody`（与 STAGE_CLEAR 走的是同一个函数），再把浮层 display 打开——
// 验的是「芯片 + 爆开 + CSS 动画 + 贴图 URL」这条链，不是「结算面会不会弹」（那条是旧行为）。
console.log('  建结算体:', await evalJs(`(() => {
  const cc = window.__cc;
  const scene = cc.director.getScene();
  let hud = null;
  const walk = (n) => {
    if (hud) return;
    if (n.getComponent('DomHud')) { hud = n.getComponent('DomHud'); return; }
    for (const k of n.children || []) walk(k);
  };
  walk(scene);
  if (!hud) return 'NO DomHud';
  hud._lastGoldEarned = 1234;
  hud._fillClearBody(500, [], false);
  const p = document.querySelector('#domHud .clearOverlay');
  if (!p) return 'NO clearOverlay';
  p.style.display = 'flex';
  return 'ok';
})()`));
// .clBurst 的动画延迟 0.5s、时长 0.8s，等它跑到中段再拍
await sleep(800);
await hunt(['clBurst'], 4000, 'clear');
await shot('clear-panel');

console.log('\n===== 结果 =====');
for (const [k, key] of Object.entries({ ...WATCH, clBurst: 'fx/coin_burst' })) {
  console.log(`  ${sighted[k] ? '✅ 目击' : '✗ 未目击'}  ${k.padEnd(8)} ${key}`);
}
chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);

// 「斜切与厚度」族的清单器（ART-PLAN §4.9 第 5 条）。
// 为什么不是直接用 audit_ui_surfaces：那一族的主角是**横条**，而横条的底子有两块画在
// 伪元素上（`.res::before` 那条 skewX(-12deg) 的斜带、`.xpRow` 的经验槽），
// querySelectorAll 走 DOM 永远看不见伪元素——看不见就等于以为没活。
// 顺带把 transform / border-radius / 当前背板色一起报出来，因为这一条改的是**外形**：
// 斜度现在在 CSS 的 skewX 里，图进来之后斜度必须改由图带（否则斜上加斜），
// 所以"谁现在持有斜度"是这个族接线前必须先问清的那一件事。
// 用法：node tools/audit_bevel_family.mjs <url> [out.json]
//   需要 127.0.0.1:7456 已起 serve.mjs
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = process.argv[2];
const out = process.argv[3] ? resolve(process.argv[3]) : null;
if (!url) { console.error('need url'); process.exit(1); }

// 页签 → 要量的选择器。sel 用 '#homeUi xxx'，伪元素写 ::before/::after
// ⚠ 页签顺序就是遍历顺序：切换器只在 page 变化时点一次，所以同页的必须连着写。
// ⚠ ART-PLAN §4.9 第 5 条原文点名的"任务横幅"（`.dutyBanner` / `.questRow` / `.qBar`）**没有 DOM 生产者**，
//   三个类名只在 HomeUiStyle.ts 里出现过——那是网页原型带过来的死样式。所以这一族按**真的在屏上的横条**重列，
//   不照着规范文档里的旧名字给死样式出图。
const FAMILIES = [
    // —— 顶栏（每页都在，记在商店页）——
    { page: '商店', sel: '#homeUi .res', note: '资源胶囊（金/钻/体力三枚）' },
    { page: '商店', sel: '#homeUi .res::before', note: '资源胶囊的斜带本体' },
    { page: '商店', sel: '#homeUi .xpRow .expbar', note: '统帅经验槽' },
    // —— 出征页 ——
    { page: '出征', sel: '#homeUi .chapter-head', note: '章节条' },
    { page: '出征', sel: '#homeUi .difficulty', note: '难度段整条' },
    { page: '出征', sel: '#homeUi .difficulty .diffSeg', note: '难度段单格' },
    { page: '出征', sel: '#homeUi .stage-caption', note: '关卡说明条' },
    { page: '出征', sel: '#homeUi .milestones', note: '里程碑条' },
    { page: '出征', sel: '#homeUi .team-strip', note: '编队条' },
    { page: '出征', sel: '#homeUi .battle-bottom', note: '出战底栏' },
    // —— 行动页 ——
    { page: '行动', sel: '#homeUi .action-daily', note: '日常四格条' },
    { page: '行动', sel: '#homeUi .dungeon-row', note: '副本行' },
    { page: '行动', sel: '#homeUi .expedition', note: '远征行' },
    { page: '行动', sel: '#homeUi .entry', note: '玩法入口行' },
    // —— 基地页 ——
    { page: '基地', sel: '#homeUi .building', note: '建筑卡' },
];

const probe = (sel) => {
    const [base, pseudo] = sel.split('::');
    const host = document.querySelector(base) ? [...document.querySelectorAll(base)] : [];
    const rows = host.map(e => {
        const hb = e.getBoundingClientRect();
        const cs = getComputedStyle(e, pseudo ? '::' + pseudo : null);
        // ⚠ 伪元素**没有 getBoundingClientRect**。直接拿宿主的盒子报数会把 18px 的斜带
        //   报成 43px（这一版第一跑就是这么错的），而这一族改的正是"条有多薄"，
        //   拿错的带高去定九宫格档必然把板做厚、压住字。按 inset 从宿主盒里缩出来。
        let b = hb;
        if (pseudo) {
            const px = v => /px$/.test(v) ? parseFloat(v) : (v === 'auto' || v === '' ? NaN : parseFloat(v));
            const t = px(cs.top), r = px(cs.right), bt = px(cs.bottom), l = px(cs.left);
            const w = px(cs.width), h = px(cs.height);
            const x0 = Number.isNaN(l) ? 0 : l, x1 = Number.isNaN(r) ? 0 : r;
            const y0 = Number.isNaN(t) ? 0 : t, y1 = Number.isNaN(bt) ? 0 : bt;
            const bw = Number.isNaN(w) ? hb.width - x0 - x1 : w;
            const bh = Number.isNaN(h) ? hb.height - y0 - y1 : h;
            b = { width: Math.max(0, bw), height: Math.max(0, bh) };
        }
        const nine = /url\(/.test(cs.borderImageSource);
        const bg = /url\(/.test(cs.backgroundImage);
        return {
            w: Math.round(b.width), h: Math.round(b.height),
            radius: cs.borderTopLeftRadius,
            transform: cs.transform === 'none' ? '' : cs.transform,
            paint: nine ? '九宫格' : bg ? '背景图' : /gradient/.test(cs.backgroundImage) ? '渐变'
                : cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? '无' : '纯色',
            color: cs.backgroundColor, biw: nine ? cs.borderTopWidth + '/' + cs.borderImageWidth : '',
            txt: (e.textContent || '').trim().slice(0, 10),
        };
    });
    return rows;
};

const chrome = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=9346', `--user-data-dir=${join(process.cwd(), '.bevel-profile')}`,
    '--window-size=540,960', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio',
    '--no-first-run', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });
chrome.stderr.on('data', d => process.stderr.write(d));
const profile = join(process.cwd(), '.bevel-profile');

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function findWs(tries = 30) {
    for (let i = 0; i < tries; i++) {
        try {
            const l = await (await fetch('http://127.0.0.1:9346/json/list')).json();
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
        await sleep(800);
    }
    console.log('timeout waiting:', label);
    return false;
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 540, height: 960, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url });
await waitUntil(`!!document.querySelector('.lgStart')`, 40000, 'lgStart');
await sleep(1200);
await evalJs(`document.querySelector('.lgStart')?.click(); 1`);
await waitUntil(`!!document.querySelector('[class*=topbar]')`, 30000, 'home');
await sleep(1800);
for (let i = 0; i < 3; i++) {
    if (!await evalJs(`!!document.querySelector('.popClose')`)) break;
    await evalJs(`document.querySelector('.popClose')?.click(); 1`);
    await sleep(1200);
}

const results = [];
let lastPage = '';
for (const f of FAMILIES) {
    if (f.page !== lastPage) {
        if (f.page !== 'home') {
            await evalJs(`(() => { const el=[...document.querySelectorAll('#homeUi .tab')].find(e=>(e.textContent||'').indexOf('${f.page}')>=0); el&&el.click(); return 1 })()`);
            await sleep(2600);
        }
        lastPage = f.page;
    }
    const rows = await evalJs(`(${probe.toString()})(${JSON.stringify(f.sel)})`);
    results.push({ ...f, rows });
    const n = rows.length;
    const sizes = [...new Set(rows.map(r => `${r.w}x${r.h}`))].join(' ');
    console.log(`${f.sel.replace('#homeUi ', '').padEnd(28)} ${f.note.padEnd(24)} 命中 ${String(n).padStart(2)}  ${sizes.padEnd(22)} ${rows[0] ? rows[0].paint : '-'}  圆角=${rows[0]?.radius ?? '-'}  ${rows[0]?.transform ? 'transform=' + rows[0].transform : ''}`);
}
if (out) { mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, JSON.stringify(results, null, 1)); console.log('written:', out); }
chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);

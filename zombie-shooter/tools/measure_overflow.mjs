// 溢出定位器：给一个主城页签 + 一个 CSS 选择器，把"盒宽装不下内容宽"这件事拆到能看懂的粒度。
// 为什么需要它：page_shot 的表面普查只报「盒 140 / 内容 143」这种结果，看不出是字号撑的、
// 内边距挤的、还是 flex/grid 把子项压到最小内容宽以下——而这三者的修法完全不同。
// 这里一次报齐：盒与内容的宽、父级的排布参数（gap / grid-template / flex）、
// 每个子项自己的盒宽与内容宽、以及谁在收缩（box 宽 < 自身内容宽 = 被父级压了）。
// 用法：node tools/measure_overflow.mjs <url> <页签名|home> <CSS 选择器> [再点的文案片段]
//   需要 127.0.0.1:7456 已起 serve.mjs（node tools/serve.mjs build/web-mobile 7456 127.0.0.1）
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const url = process.argv[2];
const page = process.argv[3];
const sel = process.argv[4];
const extra = process.argv[5];
if (!url || !page || !sel) { console.error('need url + page + selector'); process.exit(1); }

const profile = join(process.cwd(), '.measure-profile');
rmSync(profile, { recursive: true, force: true });
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9338', `--user-data-dir=${profile}`,
  '--window-size=540,960', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--mute-audio',
  '--no-first-run', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding', 'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function findWs(tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const l = await (await fetch('http://127.0.0.1:9338/json/list')).json();
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
  const tabText = page === '英雄' ? '英雄' : page;
  await evalJs(`(() => {
    const t = [...document.querySelectorAll('#homeUi .tabbar .tab')].find(e => (e.textContent||'').indexOf('${tabText}') >= 0);
    if (t) t.click(); return !!t;
  })()`);
  await sleep(1200);
}
if (extra && extra !== '-') {
  await evalJs(`(() => {
    const el = [...document.querySelectorAll('#homeUi button, #homeUi .game-button, #homeUi div')]
      .find(e => (e.textContent || '').indexOf('${extra}') >= 0 && e.children.length < 4);
    if (el) el.click(); return !!el;
  })()`);
  await sleep(1000);
}

const REPORT = `(() => {
  const sel = ${JSON.stringify(sel)};
  const nodes = [...document.querySelectorAll(sel)];
  const num = (v) => Math.round(parseFloat(v) * 10) / 10;
  const one = (e) => {
    const cs = getComputedStyle(e);
    const b = e.getBoundingClientRect();
    // DOM 路径：普查里大量元素是「(无类名)」，只报类名根本找不回建它的那行代码，
    // 所以从根往上串 4 层 tag.class
    let path = '';
    for (let cur = e, up = 0; cur && up < 5; cur = cur.parentElement, up++) {
      const cn = cur.className && typeof cur.className === 'string' ? '.' + cur.className.trim().split(/\s+/)[0] : '';
      path = cur.tagName.toLowerCase() + cn + (path ? ' > ' + path : '');
    }
    const kids = [...e.children].map(k => {
      const kb = k.getBoundingClientRect();
      const kcs = getComputedStyle(k);
      return {
        tag: k.tagName.toLowerCase() + (k.className ? '.' + String(k.className).split(' ')[0] : ''),
        txt: (k.textContent || '').trim().slice(0, 12),
        w: Math.round(kb.width * 10) / 10, sw: k.scrollWidth,
        pad: num(kcs.paddingLeft) + '/' + num(kcs.paddingRight),
        shrink: kcs.flexShrink, basis: kcs.flexBasis, minw: kcs.minWidth,
      };
    });
    // 文本真实墨迹矩形：scrollWidth 只告诉我们"内容比盒子宽"，分不清三种完全不同的情况——
    // ① 文本被 overflow:hidden 截断（真缺陷）② emoji 字身比字号宽、居中后左右对称出界（看着没问题）
    // ③ 根本没有文本，溢出量是伪元素画出去的（斜切板那种，不是文字溢出）。
    // 所以这里用 Range 量文本实际占到的左右边界，再算偏心量与两侧出界量。
    let tr = null;
    try {
        const rg = document.createRange();
        rg.selectNodeContents(e);
        const rs = [...rg.getClientRects()].filter(x => x.width > 0.5 && x.height > 0.5);
        if (rs.length) {
            const l = Math.min(...rs.map(x => x.left));
            const rr = Math.max(...rs.map(x => x.right));
            tr = { l: Math.round(l * 10) / 10, r: Math.round(rr * 10) / 10, w: Math.round((rr - l) * 10) / 10 };
        }
    } catch {}
    const boxC = (b.left + b.right) / 2;
    // 注意：本函数整段是模板字面量里的字符串，里面不能再出现反引号
    const verdict = (() => {
      const over = Math.round((e.scrollWidth - e.clientWidth) * 10) / 10;
      if (over <= 1) return '不溢出';
      if (cs.overflowX !== 'visible') return '截断（overflow-x=' + cs.overflowX + '）→ 文字被吃掉';
      if (!tr) return '无文本却量到 ' + over + 'px 出界 → 是伪元素/描边画出去的，不是文字溢出';
      const off = Math.round(((tr.l + tr.r) / 2 - boxC) * 10) / 10;
      const bl = Math.round((b.left - tr.l) * 10) / 10;
      const br = Math.round((tr.r - b.right) * 10) / 10;
      if (bl <= 1 && br <= 1) return '文本整块在盒内（左右各余 ' + Math.min(bl, br) * -1 + 'px）→ 出界量不是文字，是伪元素画出去的';
      if (Math.abs(off) > 1.5) return '偏心 ' + off + 'px（左出界 ' + bl + ' / 右出界 ' + br + '）→ 文本没在盒里摆正';
      return '字形比盒子宽，左右对称出界（左 ' + bl + ' / 右 ' + br + '）→ 视觉居中，看着没问题';
    })();
    return {
      path,
      verdict,
      text: tr,
      txt: (e.textContent || '').trim().slice(0, 16),
      w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10,
      sw: e.scrollWidth, cw: e.clientWidth,
      display: cs.display, gap: num(cs.columnGap), pad: num(cs.paddingLeft) + '/' + num(cs.paddingRight),
      cols: cs.gridTemplateColumns, flex: cs.flex, minw: cs.minWidth, fw: cs.fontWeight,
      fs: num(cs.fontSize), ls: num(cs.letterSpacing), ovf: cs.overflowX, ta: cs.textAlign, kids,
    };
  };
  const parent = nodes.length ? nodes[0].parentElement : null;
  return JSON.stringify({
    count: nodes.length,
    parent: parent ? one(parent) : null,
    // 只报真的装不下的那些：普查给的是"哪几处溢出"，这里要的是"为什么溢出"，
    // 全量列一遍会把人淹在正常项里
    // 默认只报真的装不下的那些（全量列一遍会把人淹在正常项里）；
    // 末位传 all 反过来全量看——量"这一行到底有多少宽"时要用
    // 默认只报"量到出界"的那些（全量列一遍会把人淹在正常项里）；末位传 all 反过来全量看
    items: (${process.argv[6] === 'all' ? 'true' : 'false'} ? nodes.map(one) : nodes.map(one).filter(x => x.verdict !== '不溢出')).slice(0, 14),
    tokens: {
      hs: getComputedStyle(document.documentElement).getPropertyValue('--hs').trim(),
      pw: getComputedStyle(document.documentElement).getPropertyValue('--pw').trim(),
      innerWidth: window.innerWidth,
    },
  }, null, 1);
})()`;

const data = JSON.parse(await evalJs(REPORT));
console.log(`\n选择器 ${sel} 命中 ${data.count} 个 · 视口 ${data.tokens.innerWidth}px（--hs=${data.tokens.hs} --pw=${data.tokens.pw}）`);
const line = (t, i) => {
  const flag = i.sw > i.w + 1 ? `  ← 溢出 ${Math.round((i.sw - i.w) * 10) / 10}px` : '';
  console.log(`\n[${t}] "${i.txt}"  盒 ${i.w}x${i.h}  scrollWidth=${i.sw} clientWidth=${i.cw}${flag}`);
  console.log(`     判定 ${i.verdict}${i.text ? `  文本实测 x=${i.text.l}..${i.text.r}（宽 ${i.text.w}）` : ''}`);
  console.log(`     路径 ${i.path}`);
  console.log(`     ${i.display} gap=${i.gap} pad=${i.pad} cols=${i.cols} flex=${i.flex} min-width=${i.minw} font=${i.fs}/${i.fw} ls=${i.ls} overflow-x=${i.ovf} text-align=${i.ta}`);
  for (const k of i.kids) {
    const kf = k.sw > k.w + 1 ? `  ← 被压：内容要 ${k.sw}` : '';
    console.log(`     · ${k.tag.padEnd(14)} "${k.txt}" 盒宽=${k.w} scrollWidth=${k.sw} pad=${k.pad} shrink=${k.shrink} basis=${k.basis} min-width=${k.minw}${kf}`);
  }
};
if (data.parent) line('父级', data.parent);
if (!data.items.length) console.log('\n命中的 ' + data.count + ' 个里没有一处溢出。');
data.items.forEach((i, n) => line(`溢出项 ${n}`, i));
chrome.kill();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);

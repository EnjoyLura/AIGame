// 二级浮窗（L2–L5）布局与交互断言：对照 ux-layout-review/popups.html 的五段骨架。
// 核心红线：① 每一层都有可见出口（头部关闭/返回，或底部命令），② 没有死键
// （native disabled 或 .off/.disabled 压暗按钮点了没反应）。
const fs = require('fs');
const UI_FILES = ['HomeUi.ts', 'HomeUiCore.ts', 'HomeUiMall.ts', 'HomeUiHeroes.ts', 'HomeUiStage.ts', 'HomeUiPlay.ts', 'HomeUiBase.ts', 'HomeUiStyle.ts'];
const readUi = (f) => fs.readFileSync('assets/scripts/ui/' + f, 'utf8');
const src = UI_FILES.map(readUi).join('\n');
const tsFiles = UI_FILES.filter((f) => f !== 'HomeUiStyle.ts');
const style = readUi('HomeUiStyle.ts');
const core = readUi('HomeUiCore.ts');
let fail = 0;
let checked = 0;
const ok = (name, cond) => {
  checked++;
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name);
  if (!cond) fail++;
};

/* ---------- 1. 五段骨架（固定头 / 固定说明·页签 / 唯一滚动轴 / 固定消耗·槽位 / 固定命令；S 档命令并入内容尾） ---------- */
ok('骨架按 ①头部→②说明·页签→③滚动区→④消耗→⑤命令 顺序渲染',
  /头部区（固定）/.test(core) && /内容滚动区（唯一滚动轴）/.test(core)
  && /CTA 底栏（固定/.test(core)
  && core.indexOf("'popMeta'") < core.indexOf("'popScroll'")
  && core.indexOf("'popScroll'") < core.indexOf("'popCost'"));
/* game-ux 稿 §1：S 确认框去底栏，双键（46/54）并入内容尾——命令段仍是第⑤段，只是 S 档坐进滚动区 */
ok('S 档 CTA 并入内容尾（.popCTA.tail 双键 46/54，M/L/XL 仍固定底栏）',
  /size === 'S' \? ' tail' : ''/.test(core)
  && /\(size === 'S' \? scroll : pop\)\.appendChild\(cta\);/.test(core)
  && /#homeUi \.popCTA\.tail \{ background: none; border-top: 0/.test(style)
  && /#homeUi \.popCTA\.tail \.row:not\(\.justify\) \.popBtn\.wide:first-child \{ width: calc\(46% - 5px\); \}/.test(style)
  && /#homeUi \.popCTA\.tail \.row:not\(\.justify\) \.popBtn\.wide:last-child \{ width: calc\(54% - 5px\); \}/.test(style));
ok('滚动区只有一根（.popScroll 是唯一 overflow-y:auto 的弹层区）',
  /#homeUi \.popScroll \{[^}]*overflow-y: auto/.test(style)
  && !/#homeUi \.pop(Show|Tabs|Meta|Cost|CTA|Slots|Bar) \{[^}]*overflow-y/.test(style));
ok('消耗行与命令区不进滚动（flex:none）',
  /#homeUi \.popCost \{ flex: none/.test(style) && /#homeUi \.popCTA \{ flex: none/.test(style)
  && /#homeUi \.popSlots \{ flex: none/.test(style));
ok('固定筛选条不进滚动（popFixBar flex:none）', /#homeUi \.popFixBar \{ flex: none/.test(style));

/* ---------- 2. 四档尺寸与五级分层 ---------- */
ok('四档尺寸齐备且用视口比例定位（跨长宽比稳）',
  /\.pop\.M \{ position: absolute; left: calc\(23px/.test(style)
  && /\.pop\.L \{ position: absolute; left: calc\(17px/.test(style)
  && /\.pop\.S \{ position: absolute; left: 50%/.test(style)
  && /\.pop\.XL \{ position: absolute; inset: 0/.test(style));
// 高度不能靠 top+bottom 钉死：那样每面高度固定，短内容也硬占满整块并白出滚动条。
ok('M/L 高度按内容自适应 + 本档上限（短内容收窄、长内容封顶滚动，不靠抬高度迁就内容）',
  (style.match(/height: max-content; margin-top: auto; margin-bottom: auto;/g) || []).length >= 2
  && (style.match(/max-height: calc\(64vh - var\(--sat,0px\) - var\(--sab,0px\)\)/g) || []).length >= 1
  && (style.match(/max-height: calc\(73vh - var\(--sat,0px\) - var\(--sab,0px\)\)/g) || []).length >= 1
  && /\.pop\.S \{[^}]*max-height: calc\(68vh/.test(style));
// 面板改内容自适应后，滚动区若还写 flex:1（basis 0）会被压成 0 高，内容整块看不见。
ok('滚动区以内容高为基准（flex:1 1 auto，不被压成 0 高）',
  /#homeUi \.popScroll \{ flex: 1 1 auto; min-height: 0; overflow-y: auto/.test(style));
ok('五级分层 z-index 递增（L2<L3<L4<L5）',
  /popL2 \{ z-index: 210/.test(style) && /popL3 \{ z-index: 220/.test(style)
  && /popL4 \{ z-index: 230/.test(style) && /popL5 \{ z-index: 240/.test(style));
ok('L5 遮罩更暗；引擎默认不点关，结果演出层显式允许收起',
  /popL5 \{ z-index: 240; background: rgba\(4,8,16,\.86\)/.test(style)
  && /opts\.maskClose \?\? \(tier !== 5 && size !== 'XL'\)/.test(core)
  && (src.match(/maskClose: true,/g) || []).length >= 2);

/* ---------- 3. 每一层都有可见出口 ---------- */
// ✕/‹ 只在 banner/quality/title 分支生成：必须有头，否则连关闭键一起丢。
ok('顶部弹层（S/M/L）都有 ①头部（banner/quality/title 三选一）',
  /if \(opts\.banner\) \{/.test(core) && /else if \(opts\.quality\) \{/.test(core)
  && /else if \(opts\.title\) \{/.test(core));
// ✕/‹ 挂在头部块内，靠 position:absolute + top:50% 定位；头部若无 position:relative，
// 就会以整块 .pop 为参照落到面板垂直中心压住正文（交互稿实测 y431）。
// 承接按钮的三个头部块：popBanner / popTop / popQ。popShow 不接按钮（XL 的 ✕ 来自 popTop）。
ok('承接 ✕/‹ 的头部块都带 position:relative（不飘到面板垂直中心）',
  /#homeUi \.popBanner \{[^}]*position: relative/.test(style)
  && /#homeUi \.popTop \{[^}]*position: relative/.test(style)
  && /#homeUi \.popQ \{[^}]*position: relative/.test(style));
ok('返回键优先于关闭键挂在头部内（钻取层有可见回退）',
  /if \(canBack\) \{\s*\n\s*head\.appendChild\(backBtn\(\)\);[\s\S]{0,80}else if \(closable\) \{/.test(core));
ok('遮罩点击在不可关层级也给解释（不再静默）',
  /本层需用底部命令关闭，避免误触中断/.test(core)
  && /if \(maskClose\) \{[\s\S]{0,80}this\._closePop\(\);[\s\S]{0,200}this\._toast\(/.test(core));

/* ---------- 4. 无死键：每个压暗/禁用按钮都要有解释出口 ---------- */
// 结构性检查：逐个 disabled: 找到它所在的按钮对象字面量，必须同时给出 onDisabled/onBlocked。
const files = tsFiles;
const braceMatch = (s, idx) => {
  // 从 idx 向前找最近的未配对 { 或 ( ，再向后配平
  let depth = 0, start = -1;
  for (let i = idx; i >= 0; i--) {
    const c = s[i];
    if (c === '}' || c === ')') depth++;
    else if (c === '{' || c === '(') { if (depth === 0) { start = i; break; } depth--; }
  }
  if (start < 0) return '';
  let d = 0, end = s.length;
  for (let i = start; i < s.length; i++) {
    if (s[i] === '{' || s[i] === '(') d++;
    else if (s[i] === '}' || s[i] === ')') { d--; if (d === 0) { end = i; break; } }
  }
  return s.slice(start, end + 1);
};
const deadKeys = [];
let disabledTotal = 0;
for (const f of files) {
  const s = fs.readFileSync('assets/scripts/ui/' + f, 'utf8');
  const re = /\bdisabled:\s*/g;
  let m;
  while ((m = re.exec(s))) {
    disabledTotal++;
    const obj = braceMatch(s, m.index);
    if (!/onDisabled|onBlocked/.test(obj)) {
      deadKeys.push(f + ':' + (s.slice(0, m.index).split('\n').length));
    }
  }
}
ok(`禁用/压暗按钮全部带解释出口（共 ${disabledTotal} 处，缺 ${deadKeys.length} 处）` +
  (deadKeys.length ? '：' + deadKeys.join(', ') : ''), deadKeys.length === 0);
ok('禁用态仍可点（onDisabled 在点击分支里被调用，而不是原生 disabled 吞掉）',
  /if \(c\.disabled\) \{[\s\S]{0,180}?c\.onDisabled\?\.\(\);/.test(core)
  && /if \(o\.action!\.disabled\) \{[\s\S]{0,80}?o\.action!\.onDisabled\?\.\(\);/.test(core));
ok('压暗样式存在且不用 cursor:not-allowed 以外的封印（可点性可见）',
  /#homeUi \.popBtn\.disabled \{ opacity: \.5/.test(style));

/* ---------- 5. 竞品参考落在游戏里的三条硬规矩 ---------- */
ok('列表行卡带尾部动作位 + 红点（母版 A）', /protected _popRow\(o: PopRowOpts\)/.test(core)
  && /this\._el\('div', `act\$\{kind\}/.test(core) && /this\._el\('i', 'popRed'\)/.test(core));
// q1 就是基础底色（无 .q1 覆写规则），所以断言「基础 + q2/q3/q4 共四级」
ok('详情品质头 4 级灰阶 + 品阶标签（母版 B）',
  /#homeUi \.popQ \{[^}]*background: linear-gradient/.test(style)
  && /\.popQ\.q2 \{/.test(style) && /\.popQ\.q3 \{/.test(style) && /\.popQ\.q4 \{/.test(style)
  && /'qtag'/.test(core));
ok('对比块给出前→后两值（强化/升级，参考强化台截图）',
  /protected _popCmp\(/.test(core) && /'arrow'/.test(core) && /\.popCmp \.cl \.new/.test(style));
ok('消耗行区分足量/缺量（缺量标红不标绿）',
  /\.cv\.lack \{ color: var\(--pred2\)/.test(style) && /\.cv\.ok \{ color: var\(--pgreen\)/.test(style)
  && /const lack = c\.have < c\.need;/.test(core));
ok('挑选格四角角标不参与格高（absolute 定位）',
  /#homeUi \.popGrid i \{ aspect-ratio: 1/.test(style));
ok('进度宝箱行是定列网格（不靠 wrap 折行，避免被命令区压住）',
  /\.popAct \.chs \{ display: flex/.test(style) && /\.popAct \.chs \.ch \{ flex: 1/.test(style));

/* ---------- 6. 与交互稿同口径 ---------- */
ok('组件命名沿用交互稿（popBanner/popQ/popMeta/popTabs/popFixBar/popScroll/popCost/popCTA/popBtn/popSlots/popClose）',
  ['popBanner', 'popQ', 'popMeta', 'popTabs', 'popFixBar', 'popScroll', 'popCost', 'popCTA', 'popBtn', 'popSlots', 'popClose']
    .every((c) => src.includes(c)));
ok('四档定位口径与交互稿一致（M 左右 23 / L 左右 17 / S 287 定宽 / XL 满屏）',
  /left: calc\(23px \* var\(--pu,1\)\)/.test(style) && /left: calc\(17px \* var\(--pu,1\)\)/.test(style)
  && /width: calc\(287px \* var\(--pu,1\)\)/.test(style) && /\.pop\.XL \{ position: absolute; inset: 0/.test(style));

console.log(`\n合计 ${checked} 项断言，失败 ${fail} 项。`);
process.exit(fail ? 1 : 0);

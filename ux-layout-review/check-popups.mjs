// 二级浮窗布局稿断言：目录完整性 / 五段骨架 / 四档尺寸 / 五级分层 / 无死键
// 关键不变式：模板里出现的每个 data-act 都必须在交互 switch 里有 case，
// 否则该按钮点下去没有任何出路（死键）。
import fs from 'node:fs';
import path from 'node:path';

const file = path.join(import.meta.dirname, 'popups.html');
const html = fs.readFileSync(file, 'utf8');
const src = fs.readFileSync(import.meta.filename, 'utf8');

let fail = 0;
const ok = (name, cond) => {
    console.log((cond ? 'PASS' : 'FAIL') + ' ' + name);
    if (!cond) fail++;
};
const grab = (re) => [...html.matchAll(re)].map((m) => m[1]);

/* ---------- 1. 目录与四类母版 ---------- */
// 只在 CATALOG 声明块内取目录 id，避免把代码里其它数组误判成目录项
const catalogBlock = (html.match(/const CATALOG = \[[\s\S]*?\n\];/) || [''])[0];
const catalogIds = [...catalogBlock.matchAll(/\[\s*'([a-z]+)',\s*'[^']+',\s*'[^']*',\s*'/g)].map((m) => m[1]);
// META / NOTE 条目可能与同类写在同一行，故不按行首锚定
const metaBlock = (html.match(/const META = \{[\s\S]*?\n\};/) || [''])[0];
const metaIds = [...metaBlock.matchAll(/([a-z]+):\s*\{\s*size:/g)].map((m) => m[1]);
const noteBlock = (html.match(/const NOTE = \{[\s\S]*?\n\};/) || [''])[0];
const noteIds = [...noteBlock.matchAll(/^\s{2}([a-z]+):\s*\['/gm)].map((m) => m[1]);
ok('目录含 18 面浮窗', catalogIds.length === 18);
ok('四类母版齐备', ['母版 A · 列表领取', '母版 B · 详情强化', '母版 C · 选择确认', '母版 D · 结果演出']
    .every((g) => html.includes(g)));
ok('分层与尺寸分组存在', html.includes("'分层与尺寸'"));
ok('目录每一面都有尺寸/层级定义', catalogIds.every((id) => metaIds.includes(id)));
ok('目录每一面都有评审说明', catalogIds.every((id) => noteIds.includes(id)));
ok('目录、尺寸表、说明表三者一一对应',
    catalogIds.length === metaIds.length && metaIds.length === noteIds.length
    && catalogIds.every((id) => metaIds.includes(id) && noteIds.includes(id)));

/* ---------- 2. 五段式骨架：五个区段都在模板里出现 ---------- */
const segs = grab(/segA\('([^']+)'\)/g);
const uniqSegs = [...new Set(segs)];
ok('五段骨架标注齐备（①头部 ②说明·页签 ③滚动区 ④消耗·槽位 ⑤命令区）',
    ['①头部', '②说明·页签', '③滚动区', '④消耗·槽位', '⑤命令区'].every((s) => uniqSegs.includes(s)));
ok('每段都至少被两面复用（说明是通用骨架而非单面特例）',
    ['①头部', '②说明·页签', '③滚动区', '④消耗·槽位', '⑤命令区'].every((s) => segs.filter((x) => x === s).length >= 2));

/* 每个面自成闭环：必须有 ①头部（含标题位）与一条退出通道（关闭或返回）。
   正式项目的 mail 弹层就是 popBanner + popScroll + popCTA；缺头部会连关闭键一起丢，
   用户只能靠遮罩退，属于断头弹层。 */
const bodyFns = {};
{
  // 花括号配平取函数体：非贪婪到首个 "\n}" 会在函数内部就截断，判定会失真
  const src = (html.match(/<script>([\s\S]*?)<\/script>/) || [''])[1];
  const re = /function\s+(\w+Body)\s*\([^)]*\)\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    let i = re.lastIndex - 1, depth = 0;
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (depth === 0) break; }
    }
    bodyFns[m[1]] = src.slice(re.lastIndex, i);
  }
}
const noHeader = Object.entries(bodyFns).filter(([, s]) => !/class="pop(?:Banner|Top|Q |Show)|banner\(|topbar\(|quality\(/.test(s)).map(([k]) => k);
// 退出通道：关闭/返回键，或 ⑤ 命令区里有一条主命令（L5 结果页用「确认」收尾，本就不可点外部关闭）
const noExit = Object.entries(bodyFns).filter(([, s]) => !/popClose|popBack|banner\(|topbar\(|quality\(|kind: '(?:major|green|danger)[^']*'/.test(s)).map(([k]) => k);
ok('每个面都有 ①头部（标题/品质头）' + (noHeader.length ? ' 缺:' + noHeader.join(',') : ''), noHeader.length === 0);
ok('每个面都有退出通道（关闭或返回，不靠盲点遮罩）' + (noExit.length ? ' 缺:' + noExit.join(',') : ''), noExit.length === 0);

/* ---------- 3. 四档尺寸与五级分层 ---------- */
ok('四档尺寸齐备', ['M', 'L', 'S', 'XL'].every((s) =>
    new RegExp(`\\.pop\\.${s}\\{`).test(html) || new RegExp(`\\.pop\\.${s}[,{]`).test(html)));
ok('尺寸表四档都有定义', ['S', 'M', 'L', 'XL'].every((s) => new RegExp(`size: '${s}',`).test(html)));
ok('五级分层齐备（L2/L3/L4/L5）', ['L2', 'L3', 'L4', 'L5'].every((l) => new RegExp(`layer: '${l}'`).test(html)));
ok('L5 遮罩更暗且不可误触关闭', /\.dim\.l5\{background:rgba\(10,10,10,\.82\)\}/.test(html)
    && /m\.layer === 'L3' \|\| m\.layer === 'L4'/.test(html));
// 断言的是「谁在滚」而非某个 flex 简写：滚动区是唯一 overflow-y 区，命令/消耗区固定。
ok('滚动轴只在 ③ 内容区（命令区/消耗区不进滚动）',
    /\.popScroll\{[^}]*overflow-y:auto/.test(html)
    && /\.popCTA\{flex:none/.test(html) && /\.popCost\{flex:none/.test(html));

/* ---------- 4. 无死键 ---------- */
// data-act 可能是字面量（"pick"）或模板表达式（${o.disabled ? 'why' : 'pick'}）。
// 前者取整值，后者只取其中的单引号字符串——否则会把 o/disabled/q 这类属性名当动作。
const literalActs = [...html.matchAll(/data-act="([^"]*)"/g)].flatMap((m) => {
    const v = m[1];
    if (/^[a-z]+$/.test(v)) return [v];
    return [...v.matchAll(/'([a-z]+)'/g)].map((x) => x[1]);
});
// 走数据字段传入的动作（如 attrRow({act:'unequip'})）同样可达
const dataActs = [...html.matchAll(/act:\s*'([a-z]+)'/g)].map((m) => m[1]);
const usedAll = [...new Set([...literalActs, ...dataActs])];
const cases = [...new Set([...html.matchAll(/case '([a-z]+)':/g)].map((m) => m[1]))];
const missing = usedAll.filter((a) => !cases.includes(a));
ok('模板里每个 data-act 都有交互分支（无哑键）' + (missing.length ? ' 缺:' + missing.join(',') : ''),
    missing.length === 0);
const orphan = cases.filter((c) => !usedAll.includes(c));
ok('交互分支无孤立实现（每个 case 都被模板用到）' + (orphan.length ? ' 孤立:' + orphan.join(',') : ''),
    orphan.length === 0);
ok('不出现原生 disabled（不可用走压暗 + 可点解释）', !/\bdisabled(=|>)/.test(html));
ok('压暗按钮必须带原因（off 与 data-why 成对）',
    /class="popBtn \$\{ok \? cls : 'off'\}"[\s\S]{0,90}data-why="/.test(html)
    && /class="popBtn off wide" data-act="why" data-why="/.test(html));
ok('遮罩点击也有出路（可关档位关闭，XL/L5 给出解释）',
    /feedback\('本层需用底部命令关闭，避免误触中断'\)/.test(html));

/* 组件入参口径：cell 收图标名（内部包一次 art），rowCard/attrRow/costRow 收已构建好的
   art(...) 片段（内部不再包）。costRow 曾内部再包一层，把 <svg> 当图标名，
   画面里露出字面量 "/>"。 */
const fnBody = (name) => {
  const src = (html.match(/<script>([\s\S]*?)<\/script>/) || [''])[1];
  const i = src.indexOf(`function ${name}(`);
  if (i < 0) return '';
  let j = i, depth = 0, started = false;
  for (; j < src.length; j++) {
    if (src[j] === '{') { depth++; started = true; }
    else if (src[j] === '}') { depth--; if (started && depth === 0) break; }
  }
  return src.slice(i, j + 1);
};
const fragmentBuilders = ['costRow', 'rowCard', 'attrRow'].filter((n) => /art\([oc]\.icon\)/.test(fnBody(n)));
ok('片段型组件不重复包 art（costRow/rowCard/attrRow 收 art 片段）' + (fragmentBuilders.length ? ' 违规:' + fragmentBuilders.join(',') : ''),
    fragmentBuilders.length === 0);
ok('cell 仍按图标名入参（内部包一次 art，调用点不传片段）',
    /art\(o\.icon\)/.test(fnBody('cell')) && !/cell\(\{[^}]*icon:\s*art\(/.test(html));
// 进度宝箱行必须是定行高的一行。曾用 .popFixBar（wrap）+ 内容宽度浮动，
// 在 351 宽面板里折成两行，下沿被 ⑤命令区压住。
ok('进度宝箱行是固定 4 列一行（不被 wrap 折行）',
    /\.chestRow\{flex:none;display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/.test(html)
    && /function chestRow/.test(html)
    && !/popFixBar[^>]*>\$\{\[20, 40/.test(html));
// 返回/关闭键必须落在有定位的头部块里。直接作为 .pop 的子节点拼接时，
// .popBack 的 position:absolute + top:50% 会以整块面板为参照，飘到垂直中心压住正文。
ok('返回/关闭键不脱离头部块（不在闭合 header 之后另起一段）',
    !/<\/div>\s*`?\s*\+\s*popBack\(\)/.test(html) && !/<\/div>`\s*\+\s*popBack\(\)/.test(html));

/* ---------- 5. 竞品参考落在稿里的三条硬规矩 ---------- */
ok('列表行卡带尾部动作位 + 右上角标点（母版 A）',
    /\.popRow \.ract\{/.test(html) && /\.popRow \.rdot\{/.test(html)
    && /function rowCard/.test(html));
ok('详情品质头用 4 级灰阶 + 品阶标签，不依赖颜色（母版 B）',
    /\.popQ\.q1\{/.test(html) && /\.popQ\.q4\{/.test(html) && /class="ql">\$\{q\} 级品质/.test(html));
ok('挑选格子是正方形 + 四角角标不参与格高（母版 C）',
    /\.cell\{position:relative;aspect-ratio:1/.test(html)
    && /\.cell \.tier\{position:absolute/.test(html) && /\.cell \.num\{position:absolute/.test(html));
ok('对比块给出前→后两值（强化/升级，参考强化台截图）',
    /\.cmpWrap \.bd\{/.test(html) && /class="arrow">➜</.test(html));
ok('消耗行区分足量/缺量并标差值',
    /\.cv\.lack\{text-decoration:underline/.test(html) && /缺 7/.test(html));
ok('格子角标与槽位条保留在固定区（不进滚动）', /\.popSlots\{flex:none/.test(html));

/* ---------- 6. 与正式项目同口径 ---------- */
ok('组件命名沿用正式项目（popBanner/popQ/popMeta/popTabs/popFixBar/popScroll/popCost/popCTA/popBtn/popSlots/popClose）',
    ['popBanner', 'popQ', 'popMeta', 'popTabs', 'popFixBar', 'popScroll', 'popCost', 'popCTA', 'popBtn', 'popSlots', 'popClose']
        .every((c) => html.includes('.' + c)));
ok('四档定位口径与项目一致（M 左右 23、L 左右 17、S 287 定宽、XL 满屏）',
    /\.pop\.M\{position:absolute;left:23px;right:23px;top:4%;bottom:4%/.test(html)
    && /\.pop\.L\{position:absolute;left:17px;right:17px;top:4%;bottom:4%/.test(html)
    && /\.pop\.S\{position:absolute;left:50%;transform:translateX\(-50%\);top:30%;width:287px/.test(html)
    && /\.pop\.XL\{position:absolute;inset:0;border:0/.test(html));
// 高度必须由内容决定：top/bottom 同时钉死等于把每面高度固定住，短内容也硬占满、白出一条滚动条。
ok('四档高度按内容自适应且带上限（短内容不出滚动条）',
    (html.match(/height:max-content;margin-top:auto;margin-bottom:auto;max-height:92%/g) || []).length >= 2
    && /\.pop\.S\{[^}]*max-height:68%/.test(html)
    && /宽按档位，高按内容/.test(html));
ok('灰阶占位声明：不引入美术方案', /品质用 4 级灰阶代替颜色/.test(html) && /不代表美术方案/.test(html));

/* ---------- 7. 可执行性 ---------- */
const script = (html.match(/<script>([\s\S]*)<\/script>/) || [])[1] || '';
ok('内联脚本存在且语法可解析', script.length > 0 && (() => { try { new Function(script); return true; } catch { return false; } })());
ok('控制器用 onclick 属性挂载（.phone 跨重绘复用，避免监听叠加）',
    /phone\.onclick = e => \{/.test(script) && !/phone\.addEventListener\('click'/.test(script));
ok('状态可重置（领取/选择/页签/滚动位）',
    /const resetState = \(\) => \{ claimed = \{\}; tab = \{\}; picked = \{\}; scrollMem = \{\}; \};/.test(script));
ok('滚动位置按面记忆', /scrollMem\[key\] = sc\.scrollTop/.test(script));
// .phone 的 innerHTML 会被整块重写：任何挂在它里面、却只写在静态标记里的节点首轮就会被清掉。
// 提示条曾因此丢失，feedback() 拿到 null 抛错，导致「先提示后重绘」的命令分支整条失效。
const phoneMarkup = (html.match(/<section class="phone"[\s\S]*?<\/section>/) || [''])[0];
ok('提示条随重绘产出（不被 phone.innerHTML 覆盖清掉）',
    /function feedbackHTML\(\)/.test(script) && /\+ content \+ feedbackHTML\(\);/.test(script)
    && !/class="feedback"/.test(phoneMarkup));
ok('feedback 对缺失节点容错（不因单点丢失中断命令）',
    /const el = \$\('#feedback'\);\s*\n\s*if \(el\)/.test(script));
// 「先提示后重绘」的分支（claim / cta）里，render() 会重建 #feedback 节点。
// 提示文案必须存在变量里由 feedbackHTML() 回填，否则点完按钮提示是空的。
ok('提示文案跨重绘保留（先提示后重绘的分支不丢提示）',
    /fbMsg = text/.test(script) && /id="feedback"[^>]*>\$\{esc\(fbMsg\)\}/.test(script)
    && /let view = [^;]*fbMsg = ''/.test(script));

console.log(`\n合计 ${(src.match(/^ok\(/gm) || []).length} 项断言，失败 ${fail} 项。`);
process.exit(fail ? 1 : 0);

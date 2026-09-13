// 构建产物校验：UX 布局落地（P0/P1/P2）新符号与文案进包
const fs = require('fs');
const s = fs.readFileSync('build/web-mobile/assets/main/index.js', 'utf8');
let fail = 0;
const ok = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name); if (!cond) fail++; };
// bundle 混合编码：部分字面量保留 UTF-8 原文，部分转义为 \uXXXX（大写 hex、含 surrogate pair）——两种任一命中即过
const any = t => s.includes(t) || s.includes([...t].map(c => {
  const h = c.codePointAt(0).toString(16).toUpperCase();
  return h.length > 4
    ? [...c].map(h2 => '\\u' + h2.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join('')
    : '\\u' + h.padStart(4, '0');
}).join(''));

for (const m of ['_refreshBattleChests', '_openSheet', '_openResult', '_baseMapEl', '_baseMetaEl',
  '_openBuildingInfoModal', 'floatRail', 'hudUtil', 'chHead', 'mapNode', 'dutyCard', 'modeRow',
  'rcard', 'eqGrid', 'fcol', 'mmGo', 'dcIc', 'mnIc', 'data-entry', 'sheetGrip']) {
  ok('bundle: ' + m, s.includes(m));
}
for (const t of ['战斗', '玩法大厅', '局外强化', '每日任务', '指挥中心', '繁荣度', '英雄招募', '护送宝箱']) {
  ok('bundle-cjk: ' + t, any(t));
}
process.exit(fail ? 1 : 0);

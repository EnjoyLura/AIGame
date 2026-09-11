// 构建产物校验：新玩法页/奖励弹窗进包，旧技能页文案出包
const fs = require('fs');
const s = fs.readFileSync('build/web-mobile/assets/main/index.js', 'utf8');
let fail = 0;
const ok = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name); if (!cond) fail++; };

for (const m of ['rewardEntry', '_openStageRewardModal', '_buildPlayPage', '_refreshPlayPage', '_renderSkillCards', '_playGridEl', 'dutyBanner', 'data-entry', '_refreshEntryReds']) {
  ok('bundle: ' + m, s.includes(m));
}
// bundle 混合编码：部分字面量保留 UTF-8 原文，部分转义为 \uXXXX（大写 hex、含 surrogate pair）——两种任一命中即过
const any = t => s.includes(t) || s.includes([...t].map(c => {
  const h = c.codePointAt(0).toString(16).toUpperCase();
  return h.length > 4
    ? [...c].map(h2 => '\\u' + h2.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join('')
    : '\\u' + h.padStart(4, '0');
}).join(''));
for (const t of ['玩法大厅', '奖励详情', '每日运营', '爬塔挑战']) {
  ok('bundle-cjk: ' + t, any(t));
}
ok('gone: 战术研究(旧技能页标题)', !any('战术研究'));
process.exit(fail ? 1 : 0);

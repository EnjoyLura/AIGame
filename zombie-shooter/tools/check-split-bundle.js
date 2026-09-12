// 拆分产物校验：各页成员与样式进包（拆分不改行为——锚点沿用各页代表成员）
const fs = require('fs');
const s = fs.readFileSync('build/web-mobile/assets/main/index.js', 'utf8');
let fail = 0;
const ok = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name); if (!cond) fail++; };

// 各文件代表成员（bundle 保留成员名，可作落位证明）
for (const m of [
  '_openStaminaModal', '_buildNoticeBar', '_openNoticeModal', '_buildAdOverlay', // Core
  '_refreshMall', '_openGiftModal', '_buyShopItem', // Mall
  '_renderSkillCards', '_openAbilityModal', '_openForgeModal', // Heroes
  '_buildStagePage', '_startBattle', '_openSquadModal', '_openStageRewardModal', // Stage
  '_buildPlayPage', '_refreshEntryReds', '_openTrialModal', '_openDungeonModal', // Play
  '_openTuningModal', '_openBuildingInfoModal', // Base
]) {
  ok('bundle: ' + m, s.includes(m));
}
// 样式抽离：关键 CSS 类与动画随 HOME_UI_CSS 进包
for (const c of ['noticeScroll', 'dutyBanner', 'rewardEntry', 'staminaBox', 'affixVal']) {
  ok('bundle-css: ' + c, s.includes(c));
}
// 混合编码双模式（原样沿用既有校验策略）
const any = t => s.includes(t) || s.includes([...t].map(c => {
  const h = c.codePointAt(0).toString(16).toUpperCase();
  return h.length > 4
    ? [...c].map(h2 => '\\u' + h2.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join('')
    : '\\u' + h.padStart(4, '0');
}).join(''));
for (const t of ['玩法大厅', '每日运营', '公告', '体力不足']) {
  ok('bundle-cjk: ' + t, any(t));
}

process.exit(fail ? 1 : 0);

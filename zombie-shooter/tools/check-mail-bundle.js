// 邮件功能产物校验：投放器/一键领取/过期提醒/主城入口进包（混合编码双模式校验中文文案）
const fs = require('fs');
const s = fs.readFileSync('build/web-mobile/assets/main/index.js', 'utf8');
let fail = 0;
const ok = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name); if (!cond) fail++; };

// ASCII 标识符锚点
for (const m of [
  '_purgeExpired', 'feedDaily', 'claimAll', 'unreadCount', '_wireFeeders',
  '_openMailModal', 'mailTimeText', 'mailExpiringSoon', 'mail-new',
  'mailListRow', 'mailClaimAll', 'homeMailBtn', 'mailClaimBar', 'm_chapter_',
]) {
  ok('bundle: ' + m, s.includes(m));
}
// 混合编码双模式：部分字面量保留 UTF-8 原文，部分转义为 \uXXXX（大写 hex、含 surrogate pair）
const any = t => s.includes(t) || s.includes([...t].map(c => {
  const h = c.codePointAt(0).toString(16).toUpperCase();
  return h.length > 4
    ? [...c].map(h2 => '\\u' + h2.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join('')
    : '\\u' + h.padStart(4, '0');
}).join(''));
for (const t of ['新邮件：', '一键领取', '护送嘉奖', '纪录战报', '回来啦', '每日补给', '附件将过期']) {
  ok('bundle-cjk: ' + t, any(t));
}

process.exit(fail ? 1 : 0);

// 走马灯产物校验：轮播队列/换条/点击分发/动态消息文案进包（混合编码双模式）
const fs = require('fs');
const s = fs.readFileSync('build/web-mobile/assets/main/index.js', 'utf8');
let fail = 0;
const ok = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name); if (!cond) fail++; };

for (const m of ['_buildTickerQueue', '_advanceTicker', '_tickerTap', 'animationiteration']) {
  ok('bundle: ' + m, s.includes(m));
}
const any = t => s.includes(t) || s.includes([...t].map(c => {
  const h = c.codePointAt(0).toString(16).toUpperCase();
  return h.length > 4
    ? [...c].map(h2 => '\\u' + h2.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join('')
    : '\\u' + h.padStart(4, '0');
}).join(''));
for (const t of ['邮箱有未读邮件', '远征队伍归来', '今日签到奖励待领取', '体力已满，立即出战']) {
  ok('bundle-cjk: ' + t, any(t));
}

process.exit(fail ? 1 : 0);

// 公告功能构建产物校验
const fs = require('fs');
const s = fs.readFileSync('build/web-mobile/assets/main/index.js', 'utf8');
let fail = 0;
const ok = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name); if (!cond) fail++; };
const any = t => s.includes(t) || s.includes([...t].map(c => {
  const h = c.codePointAt(0).toString(16).toUpperCase();
  return h.length > 4
    ? [...c].map(h2 => '\\u' + h2.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join('')
    : '\\u' + h.padStart(4, '0');
}).join(''));

for (const m of ['_buildNoticeBar', '_openNoticeModal', '_refreshNoticeBar', '_autoNoticeShown', 'zombie-shooter-notice', 'noticeScroll', 'noticeBar']) {
  ok('bundle: ' + m, s.includes(m));
}
for (const t of ['游戏公告', '载具改装系统上线', '点击查看全部公告']) {
  ok('bundle-cjk: ' + t, any(t));
}
process.exit(fail ? 1 : 0);

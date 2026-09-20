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

// 公告条跑马灯(_buildNoticeBar/_refreshNoticeBar/noticeScroll/noticeBar)已下线，
// 形态改为顶栏公告按钮 + 分类弹窗；下列是仍存活的弹窗/存档锚点。
for (const m of ['_openNoticeModal', '_autoNoticeShown', 'zombie-shooter-notice']) {
  ok('bundle: ' + m, s.includes(m));
}
// 公告弹窗横幅/条目实际文案；emoji 与中文可能分属原文/转义两种形态，断言用纯中文子串
for (const t of ['游戏公告', '载具改装系统上线']) {
  ok('bundle-cjk: ' + t, any(t));
}
process.exit(fail ? 1 : 0);

// 体力获取闭环构建产物校验
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

for (const m of ['_openStaminaModal', 'staminaNextIn', 'buyStamina', 'STAMINA_BUY_COST', 'staminaBox', 'stRow']) {
  ok('bundle: ' + m, s.includes(m));
}
for (const t of ['体力补给', '看广告领体力', '可超出上限囤积', '下一几点']) {
  ok('bundle-cjk: ' + t, any(t));
}
process.exit(fail ? 1 : 0);

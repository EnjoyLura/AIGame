// 构建产物校验：性能修复进包（旧热点路径出包）
const fs = require('fs');
const s = fs.readFileSync('build/web-mobile/assets/main/index.js', 'utf8');
let fail = 0;
const ok = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name); if (!cond) fail++; };
// bundle 混合编码：中文按原文或大写 \uXXXX 转义任一命中
const any = t => s.includes(t) || s.includes([...t].map(c => {
  const h = c.codePointAt(0).toString(16).toUpperCase();
  return h.length > 4
    ? [...c].map(h2 => '\\u' + h2.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join('')
    : '\\u' + h.padStart(4, '0');
}).join(''));

for (const m of ['_visualReady', 'hasSpawnHit', 'markSpawnHit', '_hitGrid', '_rebuildHitGrid', 'GRID_KEY_MUL', '_updateHitFx', '_reticleKDrawn']) {
  ok('bundle: ' + m, s.includes(m));
}
ok('gone: 旧 markHit 接口', !s.includes('.markHit('));
ok('gone: 旧 vehiclePos getter', !s.includes('get vehiclePos'));
ok('cjk: 受击反馈注释随机文案(受击反馈)', any('受击反馈') || any('网格'));
process.exit(fail ? 1 : 0);

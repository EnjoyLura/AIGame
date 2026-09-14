// HUD 窄条化改动进包校验：新 CSS 关键串 + 旧结构删除 + 安全区令牌
const fs = require('fs');
let pass = 0, fail = 0;
const ok = (name, cond) => { console.log((cond ? 'PASS ' : 'FAIL ') + name); cond ? pass++ : fail++; };
const src = fs.readFileSync('build/web-mobile/assets/main/index.js', 'utf8');

// 1. 窄条顶栏（88px + --sat 避让）
ok('topbar 窄条 88px + safe-area', src.includes('top: var(--sat, 0px)') && /height:\s*calc\(88px \* var\(--s, 1\)\)/.test(src));
// 2. 经验条并入顶栏居中
ok('xpBar 居中叠顶栏', src.includes('.topbar .xpBar') && src.includes('translate(-50%, -50%)'));
// 3. 等级徽章叠轨道左端
ok('levelBadge 叠轨道', src.includes('.levelBadge { position: absolute; left: calc(-8px * var(--s,1))'));
// 4. BOSS 条上移至窄条下方 + 安全区
ok('bossBar 上移+safe-area', src.includes('top: calc(var(--sat, 0px) + 104px * var(--s,1))'));
// 5. 旧 xpRow 结构已删
ok('xpRow 旧层已删', !src.includes("className = 'xpRow'") && !src.includes('.xpRow {'));
// 6. 旧时间 chip 已删（战斗时长只在统计面板）
ok('时间 chip 已删', !src.includes("this._chipLab('时间')"));
// 7. 波次 chip 不再绝对居中（并入右侧组）
ok('waveChip 并入右侧', !src.includes('.waveChip { position: absolute;'));
// 8. 画布版 HUD 兜底未破坏（微信回退）
ok('HUD.ts 画布回退仍在', fs.existsSync('build/web-mobile/assets/main/index.js'));

console.log(`TOTAL pass=${pass} fail=${fail}`);
process.exit(fail > 0 ? 1 : 0);

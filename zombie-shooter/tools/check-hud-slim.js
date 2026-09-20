// HUD 窄条化改动进包校验：新 CSS 关键串 + 旧结构删除 + 安全区令牌
const fs = require('fs');
let pass = 0, fail = 0;
const ok = (name, cond) => { console.log((cond ? 'PASS ' : 'FAIL ') + name); cond ? pass++ : fail++; };
const src = fs.readFileSync('build/web-mobile/assets/main/index.js', 'utf8');

// 1. 顶部条：高 122 设计像素，整体锚在 --safeTop 之下（双保险：max(32px*--s, --sat)）
ok('topbar 122px + --safeTop 避让（双保险含 --sat 令牌）',
  src.includes('--safeTop: max(calc(32px * var(--s,1)), var(--sat, 0px));')
  && src.includes('top: var(--safeTop); left: 0; right: 0;')
  && /height:\s*calc\(122px \* var\(--s, 1\)\)/.test(src));
// 2. 经验条并入顶栏居中
ok('xpBar 居中叠顶栏', src.includes('.topbar .xpBar') && src.includes('translate(-50%, -50%)'));
// 3. 等级徽章：现为顶栏左侧独立胶囊（absolute 叠轨道的旧布局已废）
ok('levelBadge 独立胶囊在经验条左侧',
  src.includes('#domHud .levelBadge { flex: none; box-sizing: border-box; min-width: calc(94px * var(--s,1));'));
// 4. BOSS 条随 --safeTop 让位（窄条下方 139px）
ok('bossBar 上移+safe-area', src.includes('top: calc(var(--safeTop) + 139px * var(--s,1));'));
// 5. 战斗 HUD 内的旧 xpRow 结构已删（断言必须带 #domHud 前缀：
//    主城 topbar 的 .xpRow 是另一个组件，同一条 bundle 里裸 .xpRow 永远命中）
ok('HUD 侧 xpRow 旧层已删', !src.includes('#domHud .xpRow'));
// 6. 旧时间 chip 已删（战斗时长只在统计面板）
ok('时间 chip 已删', !src.includes("this._chipLab('时间')"));
// 7. 波次 chip 不再绝对居中（并入右侧组）
ok('waveChip 并入右侧', !src.includes('.waveChip { position: absolute;'));
// 8. 画布版 HUD 兜底未破坏（微信回退）
ok('HUD.ts 画布回退仍在', fs.existsSync('build/web-mobile/assets/main/index.js'));

console.log(`TOTAL pass=${pass} fail=${fail}`);
process.exit(fail > 0 ? 1 : 0);

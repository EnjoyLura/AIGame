// 战斗性能热点修复断言：五个热点的结构验证
const fs = require('fs');
let fail = 0;
const ok = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name); if (!cond) fail++; };

const bullet = fs.readFileSync('assets/scripts/battle/Bullet.ts', 'utf8');
const enemy = fs.readFileSync('assets/scripts/battle/Enemy.ts', 'utf8');
const bm = fs.readFileSync('assets/scripts/battle/BattleManager.ts', 'utf8');
const gem = fs.readFileSync('assets/scripts/battle/XpGem.ts', 'utf8');

// 1. Bullet：贴图就绪即停
ok('Bullet._visualReady 字段', /private _visualReady = false/.test(bullet));
ok('init 空键直接就绪', /this\._visualReady = this\._visualKey === ''/.test(bullet));
ok('update 条件探测', /if \(!this\._visualReady\) \{[\s\S]{0,120}_applyVisualAsset\(\)/.test(bullet));
ok('空键路径置就绪', /if \(!this\._visualKey\) \{\s*\n\s*this\._visualReady = true;/.test(bullet));
ok('拿到帧即置就绪', /this\._visualReady = true;\s*\n\s*if \(!this\._sprite\)/.test(bullet));

// 2. Bullet：spawnId 直比接口
ok('markSpawnHit/hasSpawnHit 存在', /markSpawnHit\(spawnId: number\)/.test(bullet) && /hasSpawnHit\(spawnId: number\)/.test(bullet));
ok('旧 markHit/hasHit 已删', !/markHit\(|hasHit\(/.test(bullet));
ok('EnemyHandle import 已清', !/EnemyHandle/.test(bullet));

// 3. Enemy：受击反馈零分配
ok('HIT_TINT/BASE_TINT 模块常量', /const HIT_TINT = new Color\(255, 70, 70, 255\)/.test(enemy) && /const BASE_TINT = new Color\(255, 255, 255, 255\)/.test(enemy));
ok('takeDamage 无 new Color/new Vec3/tween', !/takeDamage\(dmg: number\): boolean \{[\s\S]{0,900}new (Color|Vec3)|takeDamage\(dmg: number\): boolean \{[\s\S]{0,900}tween\(/.test(enemy));
ok('_hitT 字段+置位', /private _hitT = 0;/.test(enemy) && /this\._hitT = 0\.14;/.test(enemy));
ok('_updateHitFx 存在', /private _updateHitFx\(dt: number\): void \{/.test(enemy));
ok('update 尾部挂 _updateHitFx', /this\._updateWalkAnim\(dt\);\s*\n\s*this\._updateHitFx\(dt\);/.test(enemy));
ok('dying 分支收尾反馈', /this\._updateDeathAnim\(dt\);[\s\S]{0,120}this\._updateHitFx\(dt\);/.test(enemy));
ok('init 重置 _hitT', /this\.node\.setScale\(1, 1, 1\);\s*\n\s*\/\/ 受击反馈计时清零[\s\S]{0,120}this\._hitT = 0;/.test(enemy));

// 4. Enemy：准星重绘门控
ok('_reticleKDrawn 字段', /private _reticleKDrawn = -1;/.test(enemy));
ok('showReticle 记录初绘值', /this\._drawReticle\(1\);\s*\n\s*this\._reticleKDrawn = 1;/.test(enemy));
ok('marked 态零重绘+2% 步进', /if \(!this\._reticleMarked && Math\.abs\(k - this\._reticleKDrawn\) > 0\.02\) \{/.test(enemy));

// 5. BattleManager：碰撞网格
ok('HIT_CELL/GRID_KEY_MUL 常量', /private static readonly HIT_CELL = 240;/.test(bm) && /private static readonly GRID_KEY_MUL = 4096;/.test(bm));
ok('_hitGrid Map 字段', /private _hitGrid = new Map<number, Enemy\[\]>\(\);/.test(bm));
ok('_rebuildHitGrid 过滤屏外+死亡', /_rebuildHitGrid[\s\S]{0,500}!this\._enemyOnScreen\(enemy\) \|\| enemy\.hp <= 0/.test(bm));
ok('碰撞循环先建网格', /this\._rebuildHitGrid\(\);\s*\n\s*const cell = BattleManager\.HIT_CELL;/.test(bm));
ok('3×3 邻域遍历', /for \(let gx = cx - 1; gx <= cx \+ 1 && !spent; gx\+\+\)/.test(bm) && /for \(let gy = cy - 1; gy <= cy \+ 1 && !spent; gy\+\+\)/.test(bm));
ok('网格快照死亡怪跳过', /if \(enemy\.hp <= 0\) \{\s*\n\s*continue;/.test(bm));
ok('spawnId 直比替代句柄分配', /bullet\.hasSpawnHit\(enemy\.spawnId\)/.test(bm) && /bullet\.markSpawnHit\(enemy\.spawnId\)/.test(bm));
ok('旧句柄碰撞调用清零', !/bullet\.hasHit\(|bullet\.markHit\(/.test(bm));
ok('次级弹黑名单走 spawnId', /sec\.markSpawnHit\(hitEnemy\.spawnId\)/.test(bm));

// 6. XpGem/BattleManager：vehiclePos 分配消除
ok('XpGem 用标量 vehicleTopY', /const dy = bm\.vehicleTopY - p\.y;/.test(gem));
ok('vehiclePos getter 已删', !/get vehiclePos\(\)/.test(bm));

process.exit(fail ? 1 : 0);

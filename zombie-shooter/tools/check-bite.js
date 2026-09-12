// 驻留啃咬断言：怪物到车不再即死，改为驻留按各自间隔持续咬车（向僵尸开炮式）
const fs = require('fs');
let fail = 0;
const ok = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name); if (!cond) fail++; };
const enemy = fs.readFileSync('assets/scripts/battle/Enemy.ts', 'utf8');
const bm = fs.readFileSync('assets/scripts/battle/BattleManager.ts', 'utf8');
const cfg = fs.readFileSync('assets/scripts/config/GameConfig.ts', 'utf8');

// 1. 配置
ok('BITE_GAP/BITE_STARTUP 常量', /BITE_GAP: 1\.6,/.test(cfg) && /BITE_STARTUP: 0\.35,/.test(cfg));

// 2. Enemy 驻留状态机
ok('字段：biteGap/_biting/_biteCd/_biteFxT', /biteGap = 1\.6;/.test(enemy) && /private _biting = false;/.test(enemy) &&
  /private _biteCd = 0;/.test(enemy) && /private _biteFxT = 0;/.test(enemy));
ok('init 复位防串池', /this\.biteGap = BattleConfig\.BITE_GAP \* \(info\.tier === 1 \? 1\.3 : boss \? 2\.2 : 1\);/.test(enemy) &&
  /this\._biting = false;\s*\n\s*this\._biteCd = 0;\s*\n\s*this\._biteFxT = 0;/.test(enemy));
ok('update 先查驻留再查触车', /if \(this\._biting\) \{\s*\n\s*this\._biteTick\(dt, bm\);\s*\n\s*return;\s*\n\s*\}\s*\n\s*if \(p\.y - this\.radius <= bm\.vehicleTopY\) \{\s*\n\s*this\._startBiting\(bm\);/.test(enemy));
ok('驻车钳位=车沿+半径', /setPosition\(p\.x, bm\.vehicleTopY \+ this\.radius, p\.z\);/.test(enemy));
ok('起手延迟+循环咬击', /_biteCd = BattleConfig\.BITE_STARTUP;/.test(enemy) && /_biteCd = this\.biteGap;[\s\S]{0,120}onEnemyBiteVehicle\(this\)/.test(enemy));
ok('咬击循环锁位不位移', /_biteTick\(dt: number, bm: BattleManager\): void \{[\s\S]{0,400}vehicleTopY \+ this\.radius/.test(enemy));
ok('咬击播 attack 动画+前扑脉冲', /_biteFxT = 0\.22;[\s\S]{0,120}this\.playAttack\(\);/.test(enemy));
ok('verticalSpeed 驻留=0(预瞄外推)', /if \(this\._biting\) \{\s*\n\s*return 0;/.test(enemy));
ok('前扑脉冲回弹收尾', /_updateBiteFx\(dt: number\): void \{[\s\S]{0,400}setScale\(1, 1, 1\);/.test(enemy));
ok('旧即死调用已移除', !/onEnemyReachVehicle/.test(enemy + bm));

// 3. BattleManager 咬击语义
ok('onEnemyBiteVehicle 不再回池怪', /onEnemyBiteVehicle\(enemy: Enemy\): void \{[\s\S]{0,700}\}/.test(bm) &&
  !/_enemyPool\.put\(enemy\.node\);[\s\S]{0,200}onEnemyBiteVehicle/.test(bm) &&
  !/onEnemyBiteVehicle[\s\S]{0,600}_enemyPool\.put/.test(bm.split('killEnemy')[0].split('onEnemyBiteVehicle')[1] || ''));
ok('咬伤扣耐久+天赋削减保留', /onEnemyBiteVehicle[\s\S]{0,400}touchDamage \* \(1 - talentBiteReduce\(\)\)/.test(bm));
ok('撞角反伤保留(完整死亡链)', /onEnemyBiteVehicle[\s\S]{0,600}tuneRamReflect\(\)[\s\S]{0,200}applyDamage\(this\._handleOf\(enemy\), thorn, false, undefined\)/.test(bm));
ok('多怪咬车音效节流 220ms', /now - this\._lastBiteSfx >= 220/.test(bm));

// 4. 行为链：驻留怪仍是可击杀目标（碰撞网格/波次推进按 _enemies 计）
ok('波次推进按 _enemies.length===0(贴车怪算存活)', /_waveCleared && this\._enemies\.length === 0/.test(bm));
ok('重开清场遍历 _enemies(含贴车怪回池)', /for \(const e of this\._enemies\) \{\s*\n\s*this\._enemyPool\.put\(e\.node\);/.test(bm));

process.exit(fail ? 1 : 0);

// 体力获取闭环断言：底层口径 + 弹窗双路 + 引导接线 + 两层 CSS
const fs = require('fs');
let fail = 0;
const ok = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name); if (!cond) fail++; };

const res = fs.readFileSync('assets/scripts/core/PlayerResources.ts', 'utf8');
const gm = fs.readFileSync('assets/scripts/core/GameManager.ts', 'utf8');
const ui = fs.readFileSync('assets/scripts/ui/HomeUi.ts', 'utf8');

// 1. 底层口径
ok('staminaNextIn 先结算再读', /staminaNextIn\(now: number, max: number, regenSecs: number\): number \{\s*\n\s*this\._tickStamina/.test(res));
ok('满体力返回 0', /if \(this\._amounts\.stamina >= max\) \{\s*\n\s*return 0;/.test(res));
ok('倒计时=起点+周期-now', /Math\.max\(0, this\._staminaTs \+ regenSecs - now\)/.test(res));
ok('GM.staminaNextIn 走统一口径', /staminaNextIn\(\): number \{\s*\n\s*return this\.res\.staminaNextIn\(Math\.floor\(Date\.now\(\) \/ 1000\), this\.staminaMax\(\),\s*\n\s*BattleConfig\.STAMINA_REGEN_MINUTES \* 60\);/.test(gm));
ok('buyStamina 扣钻失败不发放', /buyStamina\(n: number, diamondCost: number\): boolean \{[\s\S]{0,400}res\.spend\('diamond', diamondCost\)[\s\S]{0,200}res\.add\('stamina', n\)/.test(gm));
ok('buyStamina 非法参数拒绝', /if \(n <= 0 \|\| diamondCost < 0\) \{/.test(gm));

// 2. 弹窗双路与状态区
ok('STAMINA_BUY 常量(1💎=1体力)', /const STAMINA_BUY_N = 20;/.test(ui) && /const STAMINA_BUY_COST = 20;/.test(ui));
ok('弹窗含状态区(当前/上限+速率+倒计时)', /renderState[\s\S]{0,500}gm\.stamina\(\) \} \$\{gm\.staminaMax\(\)\}|staminaNextIn\(\)/.test(ui));
ok('倒计时每秒刷新+关闭即停', /setInterval\(\(\) => \{\s*\n\s*if \(!box\.isConnected\) \{\s*\n\s*clearInterval\(timer\);/.test(ui));
ok('广告条目：+10/剩余次数/满体力禁用', /看广告领体力[\s\S]{0,300}今日剩余 \$\{left\}\/3 次[\s\S]{0,400}left <= 0 \|\| full/.test(ui));
ok('钻石条目：+20/20💎/超上限囤积/余额禁用', /钻石购买[\s\S]{0,200}\+\$\{STAMINA_BUY_N\} 体力[\s\S]{0,100}可超出上限囤积/.test(ui) && /gm\.res\.get\('diamond'\) < STAMINA_BUY_COST/.test(ui));
ok('领奖/购买后就地重绘+顶栏刷新', /claimReward\('stamina'[\s\S]{0,400}render\(\);\s*\n\s*renderState\(\);/.test(ui) && /buyStamina\(STAMINA_BUY_N, STAMINA_BUY_COST\)[\s\S]{0,300}render\(\);\s*\n\s*renderState\(\);/.test(ui));
ok('领奖走 AdService 统一入口', /AdService\.instance\.claimReward\('stamina'/.test(ui));

// 3. 引导接线
ok('顶栏体力「+」直达弹窗', /id === 'stamina'\) \{\s*\n\s*\/\/ 体力直达获取面板[\s\S]{0,80}_openStaminaModal\(\);/.test(ui));
ok('金币钻石「+」仍跳商城', /this\._switchPage\('mall'\);/.test(ui));
ok('出战体力不足守卫引导弹窗', /this\._toast\(`体力不足（需要 \$\{BattleConfig\.RUN_STAMINA_COST\} 点）`\);\s*\n\s*this\._openStaminaModal\(\);/.test(ui));

// 4. 两层 CSS
ok('stState/stRow base 层(--hs)', /#homeUi \.staminaBox \.stState b \{[^}]*--hs,1/.test(ui) && /#homeUi \.stRow \{[^}]*--hs,1/.test(ui));
ok('stState/stRow 青瓷层(--pw)', /#homeUi \.staminaBox \.stState b \{[^}]*--pw,2\.5/.test(ui) && /#homeUi \.stRow \{[^}]*--pw,2\.5/.test(ui));

process.exit(fail ? 1 : 0);

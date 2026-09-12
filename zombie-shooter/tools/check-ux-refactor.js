// 五界面 UX 重构断言：页面归属/入口接线/红点迁移/两层 CSS（HomeUi 拆分后按继承链 8 文件拼接检查）
const fs = require('fs');
const UI_FILES = ['HomeUi.ts', 'HomeUiCore.ts', 'HomeUiMall.ts', 'HomeUiHeroes.ts', 'HomeUiStage.ts', 'HomeUiPlay.ts', 'HomeUiBase.ts', 'HomeUiStyle.ts'];
const readUi = (f) => fs.readFileSync('assets/scripts/ui/' + f, 'utf8');
const src = UI_FILES.map(readUi).join('\n');
let fail = 0;
const ok = (name, cond) => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name);
  if (!cond) fail++;
};

// 1. 导航：第 4 页签改为玩法（key 沿用 core，texKey nav_core 不变 → 不动美术资源）
ok("NAV 'core' 名称=玩法", /key: 'core', icon: '🎮', name: '玩法'/.test(src));
ok("texKey core→nav_core 保留", /item\.key === 'core' \? 'ui\/nav_core'/.test(src));

// 2. 构建与切换接线
ok('_build 构建 _buildPlayPage', /this\._buildPlayPage\(viewport\)/.test(src));
ok('_build 不再构建技能页', !/_buildSkillPage\(viewport\)/.test(src));
ok("_switchPage('core')→_refreshPlayPage", /page === 'core'[\s\S]{0,40}_refreshPlayPage\(\)/.test(src));
ok('_refreshAll 含 _refreshPlayPage', /this\._refreshPlayPage\(\);\s*\n\s*this\._refreshBase\(\)/.test(src));

// 3. 关卡页瘦身：页面无奖励预览/宝箱，收进弹窗
ok('关卡页有 rewardEntry 按钮', /className = 'btn dark sm rewardEntry'/.test(src));
ok('rewardEntry onclick 弹奖励弹窗', /rewardBtn\.onclick[\s\S]{0,120}_openStageRewardModal\(\)/.test(src));
ok('_openStageRewardModal 存在', /protected _openStageRewardModal\(\): void \{/.test(src));
ok('弹窗含金币区间公式(metaGoldMul×depotGoldMul×rewardMul)', /gm\.metaGoldMul\(\) \* gm\.depotGoldMul\(\) \* diffDef\.rewardMul/.test(src));
ok('弹窗含宝箱三档+领取', /_openStageRewardModal[\s\S]{0,4000}claimKey[\s\S]{0,3000}'领 取'/.test(src));
ok('领取后就地重开弹窗', /this\._claimedChests\.add\(claimKey\)[\s\S]{0,400}_openStageRewardModal\(\)/.test(src));
ok('_refreshStagePage 不再查 chests', !/const chests = this\._chestsEl/.test(src));
ok('_refreshStagePage 页面不再构建 lootPrev', !/page\.appendChild\(lootPrev\)/.test(src));

// 4. 英雄页吸收技能
ok('_renderSkillCards 存在', /protected _renderSkillCards\(def: HeroDef\): HTMLDivElement \{/.test(src));
ok('英雄页插入技能区块(secTitle)', /技能养成 · 点击卡片查看升级详情/.test(src));
ok('英雄页技能区块仅 owned 显示', /if \(owned\) \{\s*\n\s*const skillHead/.test(src));
ok('技能升级成功走 _refreshHeroes', /hs\.upgradeAbility\(def\.id, c\.slot\)\)[\s\S]{0,300}this\._refreshHeroes\(\)/.test(src));
ok('技能弹窗升级同步英雄页', /this\._refreshHeroes\(\);\s*\n\s*this\._openAbilityModal\(heroId, slot\)/.test(src));
ok('技能页三方法已删', !/_(build|refresh)SkillPage|_pickSkillHero/.test(src));
ok('技能页三字段已删', !/_skillPickEl|_skillListEl|_skillSelIdx/.test(src));
ok('_chestsEl/_lootPrevEl 字段已删', !/_chestsEl|_lootPrevEl/.test(src));

// 5. 玩法页：任务/签到 + 五大玩法入口
ok('_buildPlayPage 存在', /protected _buildPlayPage\(root: HTMLDivElement\): void \{/.test(src));
ok('玩法页 heading', /玩法大厅/.test(src));
ok('玩法页含任务+签到按钮', /dutyBanner[\s\S]{0,600}questEntry[\s\S]{0,300}signinEntry/.test(src));
ok('玩法页红点接线 _questRedEl', /this\._questRedEl = questBtn\.querySelector/.test(src));
ok('玩法页红点接线 _signinRedEl', /this\._signinRedEl = signinBtn\.querySelector/.test(src));
ok('玩法页 grid 挂 _playGridEl', /this\._playGridEl = grid/.test(src));
ok('玩法卡遍历 BUILDINGS pureEntry', /_refreshPlayPage[\s\S]{0,600}if \(!b\.pureEntry\) \{\s*\n\s*continue;/.test(src));
ok('玩法卡 data-entry 属性', /card\.dataset\.entry = b\.id/.test(src));
ok('玩法卡走 _pureEntryDesc/_pureEntryBtnText/_enterPureEntry',
  /ds\.textContent = unlocked \? this\._pureEntryDesc\(b\.id\)/.test(src) &&
  /btn\.textContent = this\._pureEntryBtnText\(b\.id\)/.test(src) &&
  /this\._enterPureEntry\(b\.id\)/.test(src));
ok('玩法卡红点 _refreshPureEntryRed', /_refreshPureEntryRed\(b\.id, red\)/.test(src));
ok('基地横幅不再含任务/签到按钮', !/questEntry|signinEntry/.test(readUi('HomeUiBase.ts')));

// 6. 红点增量刷新迁移
ok('_refreshEntryReds 查玩法页+dataset', /_refreshEntryReds[\s\S]{0,400}this\._playGridEl[\s\S]{0,300}card\.dataset\.entry/.test(src));
ok('_refreshEntryReds 不再查基地 grid', !/const grid = this\._baseGridEl;\s*\n\s*if \(!grid\) \{\s*\n\s*return;\s*\n\s*\}\s*\n\s*const map/.test(src));

// 7. 基地页只留养成建筑
ok('_refreshBase 跳过 pureEntry', /for \(const b of BUILDINGS\) \{\s*\n\s*if \(b\.pureEntry\) \{\s*\n\s*continue;\s*\n\s*\}/.test(src));

// 8. 两层 CSS
ok('dutyBanner base 层(--hs)', /#homeUi \.dutyBanner \{[^}]*--hs,1/.test(src));
ok('dutyBanner 青瓷层(--pw)', /#homeUi \.dutyBanner \{[^}]*--pw,2\.5/.test(src));
ok('rewardEntry 两层 CSS', (src.match(/#homeUi \.rewardEntry \{[^}]*\}/g) || []).length >= 2);

process.exit(fail ? 1 : 0);

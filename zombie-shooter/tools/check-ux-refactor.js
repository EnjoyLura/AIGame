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

// 3. 战斗页重排：宝箱三档上浮主界面，金币区间/掉率明细收进弹窗
ok('战斗页有宝箱详情按钮', /护送宝箱 · 奖励详情/.test(src));
ok('详情按钮 onclick 弹奖励弹窗', /detailBtn\.onclick[\s\S]{0,120}_openStageRewardModal\(\)/.test(src));
ok('_openStageRewardModal 存在', /protected _openStageRewardModal\(\): void \{/.test(src));
ok('弹窗含金币区间公式(metaGoldMul×depotGoldMul×rewardMul)', /gm\.metaGoldMul\(\) \* gm\.depotGoldMul\(\) \* diffDef\.rewardMul/.test(src));
ok('宝箱三档上浮战斗页 _refreshBattleChests', /protected _refreshBattleChests\(\): void \{/.test(src));
ok('_refreshStagePage 调用宝箱刷新', /this\._refreshBattleChests\(\);/.test(src));
ok('宝箱就地在主界面领取', /_claimedChests\.add\(claimKey\)[\s\S]{0,600}_refreshBattleChests\(\)/.test(src));
ok('弹窗不再含宝箱三档(已上浮)', !/_openStageRewardModal[\s\S]{0,4000}claimKey[\s\S]{0,3000}'领 取'/.test(src));
ok('_refreshStagePage 不再查 chests', !/const chests = this\._chestsEl/.test(src));
ok('_refreshStagePage 页面不再构建 lootPrev', !/page\.appendChild\(lootPrev\)/.test(src));

// 4. 英雄页吸收技能
ok('_renderSkillCards 存在', /protected _renderSkillCards\(def: HeroDef, onUpgraded\?: \(\) => void\): HTMLDivElement \{/.test(src));
ok('技能养成改左功能列按钮入口', /skillEntry/.test(src) && /⚡<span>技能<\/span>/.test(src));
ok('技能弹窗 _openSkillModal 存在', /protected _openSkillModal\(heroId: string\): void/.test(src));
ok('英雄页不再内联技能区块', !/skillHead/.test(src));
ok('技能弹窗升级原位重建', /this\._refreshTop\(\);\s*\n\s*onUpgraded\?\.\(\)/.test(src));
ok('技能升级成功走 _refreshHeroes', /hs\.upgradeAbility\(def\.id, c\.slot\)\)[\s\S]{0,300}this\._refreshHeroes\(\)/.test(src));
ok('技能弹窗升级同步英雄页', /this\._refreshHeroes\(\);\s*\n\s*this\._openAbilityModal\(heroId, slot\)/.test(src));
ok('技能页三方法已删', !/_(build|refresh)SkillPage|_pickSkillHero/.test(src));
ok('技能页三字段已删', !/_skillPickEl|_skillListEl|_skillSelIdx/.test(src));
ok('_chestsEl/_lootPrevEl 字段已删', !/_chestsEl|_lootPrevEl/.test(src));

// 5. 玩法页：日常状态卡（任务/签到）+ 五大玩法入口行
ok('_buildPlayPage 存在', /protected _buildPlayPage\(root: HTMLDivElement\): void \{/.test(src));
ok('玩法页不再有页标题', !/_mkHeading\(/.test(src));
ok('页标题方法已删（CSS 遗留规则无害）', !/protected _mkHeading/.test(src));
ok('玩法页含任务+签到状态卡', /dutyRow[\s\S]{0,600}dutyCard[\s\S]{0,600}questRed/.test(src));
ok('玩法页红点接线 _questRedEl', /this\._questRedEl = questBtn\.querySelector/.test(src));
ok('玩法页红点接线 _signinRedEl', /this\._signinRedEl = signinBtn\.querySelector/.test(src));
ok('玩法行列表挂 _playGridEl', /this\._playGridEl = list/.test(src));
ok('玩法行遍历 BUILDINGS pureEntry', /_refreshPlayPage[\s\S]{0,600}if \(!b\.pureEntry\) \{\s*\n\s*continue;/.test(src));
ok('玩法行 data-entry 属性', /row\.dataset\.entry = b\.id/.test(src));
ok('玩法行走 _pureEntryDesc/_pureEntryBtnText/_enterPureEntry',
  /unlocked \? this\._pureEntryDesc\(b\.id\) :/.test(src) &&
  /btn\.textContent = this\._pureEntryBtnText\(b\.id\)/.test(src) &&
  /this\._enterPureEntry\(b\.id\)/.test(src));
ok('玩法行红点 _refreshPureEntryRed', /_refreshPureEntryRed\(b\.id, red\)/.test(src));
ok('基地横幅不再含任务/签到按钮', !/questEntry|signinEntry/.test(readUi('HomeUiBase.ts')));

// 6. 红点增量刷新迁移
ok('_refreshEntryReds 查玩法页+dataset', /_refreshEntryReds[\s\S]{0,400}this\._playGridEl[\s\S]{0,300}card\.dataset\.entry/.test(src));
ok('_refreshEntryReds 不再查基地 grid', !/const grid = this\._baseGridEl;\s*\n\s*if \(!grid\) \{\s*\n\s*return;\s*\n\s*\}\s*\n\s*const map/.test(src));

// 7. 基地页地图化：只留养成建筑 + META 局外强化卡
ok('_refreshBase 跳过 pureEntry', /for \(const b of BUILDINGS\) \{\s*\n\s*if \(b\.pureEntry\) \{\s*\n\s*continue;\s*\n\s*\}/.test(src));
ok('基地页挂 _baseMapEl 地图', /this\._baseMapEl = map/.test(src));
ok('基地地图节点点击开详情抽屉', /node\.onclick[\s\S]{0,160}_openBuildingInfoModal\(b\.id\)/.test(src));
ok('建筑详情走 _openSheet 抽屉', /_openBuildingInfoModal[\s\S]{0,400}this\._openSheet\(/.test(src));
ok('建筑升级在抽屉内接线', /gm\.upgradeBuilding\(b\.id\)[\s\S]{0,300}this\._refreshBase\(\)/.test(src));
ok('META 局外强化卡挂 _baseMetaEl', /this\._baseMetaEl = meta/.test(src));
ok('_baseRows 累加字段已删', !/_baseRows/.test(src));

// 8. 两层 CSS
ok('dutyCard base 层(--hs)', /#homeUi \.dutyCard \{[^}]*--hs,1/.test(src));
ok('dutyCard 青瓷层(--pw)', /#homeUi \.dutyCard \{[^}]*--pw,2\.5/.test(src));
ok('modeRow 两层 CSS', (src.match(/#homeUi \.modeRow \{[^}]*\}/g) || []).length >= 2);
ok('baseMap/mapNode 两层 CSS', (src.match(/#homeUi \.mapNode \{[^}]*\}/g) || []).length >= 2);
ok('rcard 两层 CSS', (src.match(/#homeUi \.rcard \{[^}]*\}/g) || []).length >= 2);
ok('chestHead 两层 CSS', (src.match(/#homeUi \.chestHead \{[^}]*\}/g) || []).length >= 2);

// 9. P0/P1 壳层关键接线
ok('悬浮栏仅战斗页挂 on', /querySelectorAll\('#homeUi \.floatRail'\)[\s\S]{0,120}page === 'battle'/.test(src));
ok('胶囊禁入区：viewport-fit=cover', /viewport-fit=cover/.test(require('fs').readFileSync('build-templates/web-mobile/index.html', 'utf8')));
ok('胶囊禁入区：_applySafeArea 探针填令牌', /_applySafeArea/.test(src) && /setProperty\('--sat'/.test(src) && /setProperty\('--sab'/.test(src));
ok('胶囊禁入区：CSS 挂令牌（顶栏/CTA/底栏/悬浮栏/toast/弹窗）', (src.match(/var\(--sat,0px\)|var\(--sab,0px\)/g) || []).length >= 10);
ok('底部导航关卡→战斗', /key: 'battle', icon: '🚚', name: '战斗'/.test(src));
ok('编队走 _openSheet 抽屉', /_openSquadModal[\s\S]{0,400}this\._openSheet\(/.test(src));
ok('招募结果走 _openResult 全屏层', /_openRecruitResultModal[\s\S]{0,600}this\._openResult\(/.test(src));
ok('招募单抽/十连进商店 rcard', /doPull = \(count: 1 \| 10, free = false\)/.test(src));
ok('英雄页功能钮双列(左:核心/强化/技能 右:升星/天赋)', /fcolR\.appendChild\(starBtn\)/.test(src) && /main\.appendChild\(fcol\);[\s\S]{0,200}main\.appendChild\(fcolR\);/.test(src) && !/fcol\.appendChild\(talBtn\)/.test(src));
ok('英雄页五钮齐备(核心/强化/技能/升星/天赋)', /fcol[\s\S]{0,400}_openCoreModal[\s\S]{0,400}_openWeaponModal[\s\S]{0,400}_openSkillModal[\s\S]{0,500}_openStarModal[\s\S]{0,400}_openTalentModal/.test(src));
ok('战力徽章挂立绘下方', /fig\.appendChild\(power\)/.test(src) && !/head\.appendChild\(power\)/.test(src));
ok('大升星条已删·改弹窗入口', !/className = 'starBar panel'/.test(src) && /_openStarModal\(heroId: string\): void/.test(src) && /starEntry/.test(src));
ok('战力右侧 ⓘ 详情入口', /pwInfo/.test(src) && /power\.appendChild\(pwInfo\)/.test(src));
ok('属性详情弹窗 _openPowerDetailModal', /protected _openPowerDetailModal\(heroId: string\): void/.test(src));
ok('三维栏已删（statRow 不再构建）', !/className = 'statRow'/.test(src) && !/mkStat\(/.test(src));
ok('装备六槽 eqGrid', /className = 'eqGrid'/.test(src));

process.exit(fail ? 1 : 0);

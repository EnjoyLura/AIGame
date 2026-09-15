// 五界面 UX 重构断言：页面归属/入口接线/红点迁移/两层 CSS（HomeUi 拆分后按继承链 8 文件拼接检查）
const fs = require('fs');
const UI_FILES = ['HomeUi.ts', 'HomeUiCore.ts', 'HomeUiMall.ts', 'HomeUiHeroes.ts', 'HomeUiStage.ts', 'HomeUiPlay.ts', 'HomeUiBase.ts', 'HomeUiStyle.ts'];
const readUi = (f) => fs.readFileSync('assets/scripts/ui/' + f, 'utf8');
const src = UI_FILES.map(readUi).join('\n');
// 仅拼接 TS 类文件（排除样式表）：用于断言"旧 DOM 结构已消失"这类会在 CSS 里留死样式的情况
const clsSrc = UI_FILES.filter((f) => f !== 'HomeUiStyle.ts').map(readUi).join('\n');
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
ok('技能养成已并入英雄养成 XL 页(4-B)', /protected _openHeroGrowModal\(heroId: string, tab = 0\): void/.test(src) && /this\._renderSkillCards\(def, \(\) => this\._popRebuild\(opt\(\)\)\)/.test(src));
ok('英雄页不再内联技能区块', !/skillHead/.test(src));
ok('技能弹窗升级原位重建', /this\._refreshTop\(\);\s*\n\s*onUpgraded\?\.\(\)/.test(src));
ok('技能升级成功走 _refreshHeroes', /hs\.upgradeAbility\(def\.id, c\.slot\)\)[\s\S]{0,300}this\._refreshHeroes\(\)/.test(src));
ok('技能详情升级就地重绘（不再关弹窗重开）', /hs\.upgradeAbility\(heroId, slot\)\)[\s\S]{0,340}?this\._popRebuild\(opt\(\)\);/.test(src));
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
ok('建筑详情升级为 L3·M 弹层', /protected _openBuildingInfoModal\(id: string\): void \{[\s\S]{0,700}?tier: 3,\s*\n\s*size: 'M',/.test(src));
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
ok('编队升级为 L4 半屏抽屉弹层', /protected _openSquadModal\(\): void \{[\s\S]{0,700}?tier: 4,\s*\n\s*size: 'M',/.test(src) && /protected _openSquadModal\(\): void \{[\s\S]{0,8600}?this\._openPop\(opt\(\)\);/.test(src));
ok('招募结果层升级为 L5 结果演出层（不再走旧 _openResult）', /protected _openRecruitResultModal\(results: RecruitResult\[\]\): void \{[\s\S]{0,400}?_openPop\(\{[\s\S]{0,120}?tier: 5/.test(src));
ok('招募单抽/十连进商店 rcard', /doPull = \(count: 1 \| 10, free = false\)/.test(src));
ok('英雄页功能钮双列(左:核心/强化/技能 右:升星/天赋)', /fcolR\.appendChild\(starBtn\)/.test(src) && /main\.appendChild\(fcol\);[\s\S]{0,200}main\.appendChild\(fcolR\);/.test(src) && !/fcol\.appendChild\(talBtn\)/.test(src));
ok('英雄页五钮齐备并汇入养成页(核心1/强化3/技能0/升星/天赋2)', /fcol[\s\S]{0,400}_openHeroGrowModal\(def\.id, 1\)[\s\S]{0,400}_openHeroGrowModal\(def\.id, 3\)[\s\S]{0,400}_openHeroGrowModal\(def\.id, 0\)[\s\S]{0,500}_openStarModal\(def\.id\)[\s\S]{0,400}_openHeroGrowModal\(def\.id, 2\)/.test(src));
ok('战力徽章挂立绘下方', /fig\.appendChild\(power\)/.test(src) && !/head\.appendChild\(power\)/.test(src));
ok('大升星条已删·改弹窗入口', !/className = 'starBar panel'/.test(src) && /_openStarModal\(heroId: string\): void/.test(src) && /starEntry/.test(src));
ok('战力右侧 ⓘ 详情入口', /pwInfo/.test(src) && /power\.appendChild\(pwInfo\)/.test(src));
ok('属性详情弹窗 _openPowerDetailModal', /protected _openPowerDetailModal\(heroId: string\): void/.test(src));
ok('三维栏已删（statRow 不再构建）', !/className = 'statRow'/.test(src) && !/mkStat\(/.test(src));
ok('装备六槽 eqGrid', /className = 'eqGrid'/.test(src));

// 6. 二级弹层系统（UX 布局稿 v1.0 落地）：统一入口 / 五级分层 / 四尺寸档 / 五段式 / 双主题令牌
ok('弹层统一入口 _openPop', /protected _openPop\(opts: PopOpts\): void \{/.test(src) && /_renderPop\(opts: PopOpts, keepScroll = false\)/.test(src));
ok('五级分层 z-index 阶梯(L2/L3/L4/L5)', /\.protoMask\.popL2 \{ z-index: 210/.test(src) && /\.protoMask\.popL3 \{ z-index: 220/.test(src) && /\.protoMask\.popL4 \{ z-index: 230/.test(src) && /\.protoMask\.popL5 \{ z-index: 240/.test(src));
ok('L5 结果层不可遮罩关闭', /opts\.maskClose \?\? \(tier !== 5 && size !== 'XL'\)/.test(src));
ok('尺寸档 S/M/L/XL 几何', /#homeUi \.pop\.M \{ position: absolute/.test(src) && /#homeUi \.pop\.L \{ position: absolute/.test(src) && /#homeUi \.pop\.S \{ position: absolute/.test(src) && /#homeUi \.pop\.XL \{ position: absolute; inset: 0/.test(src));
ok('五段式顺序 头/内容/消耗/CTA/槽位/底栏', /'popScroll'[\s\S]{0,1200}'popCost'[\s\S]{0,800}'popCTA'[\s\S]{0,2000}'popSlots'[\s\S]{0,1200}'popBar'/.test(src));
ok('唯一滚动轴 popScroll + 底部渐隐', /const scroll = this\._el\('div', 'popScroll'\);/.test(src) && /scroll\.appendChild\(this\._el\('div', 'popFade'\)\)/.test(src) && /overflow-y: auto; overscroll-behavior: contain/.test(src));
ok('双主题令牌共用一套几何(--pu)', /--pu: var\(--hs,1\)/.test(src) && /--pu: var\(--pw,2\.5\)/.test(src));
ok('尺寸单位全部走 --pu（无硬编码 --hs/--pw 混用）', !/\.popRow .ic \{ width: calc\([0-9.]+px \* var\(--pw/.test(src));
ok('返回链：push 栈 + onBack 自定义取数', /protected _popStack: PopOpts\[\] = \[\];/.test(src) && /opts\.push && this\._popOpts/.test(src) && /onBack\?: \(\) => void;/.test(src) && /if \(opts\.onBack\)/.test(src));
ok('就地重绘保留滚动位置 _popRebuild', /protected _popRebuild\(next\?: PopOpts\): void \{/.test(src) && /scroll\.scrollTop = prevScroll/.test(src));
ok('S 型二次确认模板 _popConfirm', /_popConfirm\(o: \{[\s\S]{0,600}size: 'S'/.test(src) && /label: o\.cancel \?\? '取消'/.test(src));
ok('组件库：列表行/属性行/对比块/消耗/网格/空态/槽位', /protected _popRow\(o: PopRowOpts\)/.test(src) && /protected _popAttr\(o: PopAttrOpts\)/.test(src) && /protected _popCmp\(title: string/.test(src) && /protected _popKV\(label: string/.test(src) && /protected _popGrid\(/.test(src) && /protected _popEmpty\(/.test(src) && /protected _popSlot\(o: \{/.test(src));

// 7. 二级表面迁移：邮箱/公告/任务 → 新弹层
ok('邮箱迁新弹层(L3·M 横幅头)', /banner: '📬 邮箱'/.test(src) && /size: 'M',[\s\S]{0,200}banner: '📬 邮箱'/.test(src));
ok('邮箱固定一键领取底栏 + 过期注脚', /label: \`一键领取（\$\{claimable\} 封）\`,/.test(src) && /附件 24 小时内过期作废/.test(src));
ok('邮箱详情钻取 + 删除走 S 型确认', /protected _openMailDetail\(openId: string\): void \{/.test(src) && /onBack: \(\) => this\._openMailModal\(\)/.test(src) && /title: '删除邮件'/.test(src));
ok('邮箱行内领取 + 到期标色', /action: canClaim \? \{/.test(src) && /statusKind: canClaim && soon \? 'soon' : undefined/.test(src));
ok('公告分类页签 + 就地展开全文', /banner: '📣 游戏公告'/.test(src) && /const filters: Array<\{ label: string; kind: NoticeKind \| null \}>/.test(src) && /onTab: i => this\._openNoticeModal\(i, -1\)/.test(src));
ok('公告 L 档详情型宽度', /size: 'L',[\s\S]{0,300}游戏公告/.test(src));
ok('任务页活跃度固定块(popAct)', /const box = this\._el\('div', 'popAct'\);/.test(src) && /#homeUi \.popAct \.chs \.ch\.ready/.test(src));
ok('任务双页签 + 一键领取', /tabs: \['每日任务', '成就'\]/.test(src) && /label: \`一键领取（\$\{ready\.length\}）\`,/.test(src));

// 8. 装备/材料/工坊/养成页迁移
ok('装备详情品质头 + 装备/宝石双页签', /protected _openEquipDetail\(heroId: string, it: BagItem, tab = 0\): void \{/.test(src) && /tabs: \['装备属性', '宝石属性'\]/.test(src) && /q: Math\.min\(4, Math\.max\(1, it\.tier\)\)/.test(src));
ok('材料详情 2-B + 使用按钮', /protected _openMiscDetail\(md: MiscItemDef\): void \{/.test(src) && /该材料用于合成\/强化消耗/.test(src));
ok('宝石镶嵌钻取层 + 费用行 + 空态', /banner: '💎 镶嵌宝石'/.test(src) && /onBack: \(\) => this\._openEquipSlotPanel\(heroId, slot\)/.test(src) && /背包中没有宝石/.test(src));
ok('工坊升 L2·XL 二级页：合成/分解双页签 + 展示台 + 底栏返回', /protected _openForgeModal\(tab = 0\): void \{[\s\S]{0,7200}?tier: 2,\n\s+size: 'XL',\n\s+title: '⚒️ 装备工坊',\n\s+barBack: true,/.test(src) && /tabs: \['合成', '分解'\]/.test(src));
ok('工坊品质筛选固定条 + 5 列网格 + 选中态汇总条', /fixed: bar => \{[\s\S]{0,900}?_popChip\(label, qFilter === q,/.test(src) && /_popGrid\(cells, 5, k => \{/.test(src) && /const selLine = g/.test(src) && /const ctas: PopCta\[\] = \[\];/.test(src));
ok('工坊危险操作用确认模板', /title: '分解装备'/.test(src) && /title: '一键分解'/.test(src) && /danger: true/.test(src));
ok('装备养成 XL 页(4-A)：展示台+双CTA+六槽位条+底栏页签', /养成 · \$\{heroName\}`/.test(src) && /label: '一键强化',/.test(src) && /slots: sb => \{[\s\S]{0,200}EQUIP_SLOTS/.test(src) && /barTabs: \[[\s\S]{0,800}label: '穿戴'/.test(src));
ok('一键强化循环到材料耗尽(装备/武器各一处)', /const doUpgrade = \(n: number\): number => \{/.test(src) && /const upWeapon = \(n: number\): number => \{/.test(src));
ok('英雄养成 XL 页(4-B)：四线页签', /protected _openHeroGrowModal\(heroId: string, tab = 0\): void \{/.test(src) && /\{ icon: '🔧', label: '武器', on: tab === 3/.test(src) && /\{ icon: '🌟', label: '天赋', on: tab === 2/.test(src));
ok('英雄养成展示台挂立绘', /querySelector\('\.popPedestal'\)/.test(src) && /_heroPhoto\(HERO_DEFS\.indexOf\(def\), 'figure'\)/.test(src));


// 9. 玩法页四玩法迁移（试炼/副本/远征/图鉴）+ 组件库补件
ok('组件库补件：告警行 _popWarn + 固定条静态胶囊 _popInfo', /protected _popWarn\(text: string\): HTMLElement \{/.test(src) && /protected _popInfo\(text: string, on = false\): HTMLElement \{/.test(src));
ok('槽位条支持字符角标（✅/▶/◻/🔒）', /count\?: number \| string;/.test(src) && /tier: fl \? '✅' : now \? '▶' : open \? '◻' : '🔒',/.test(src));
ok('试炼塔 XL 二级页：层段胶囊固定条 + 层格槽位条点选', /title: '🗼 试炼之塔'/.test(src) && /_popChip\(`\$\{from\}~\$\{to\}\$\{lockedSect \? ' 🔒' : ''\}`/.test(src) && /tier: 2,\s*\n\s*size: 'XL',\s*\n\s*title: '🗼 试炼之塔',/.test(src) && /for \(let f = sectFrom; f <= sectTo; f\+\+\)/.test(src));
ok('试炼塔里程碑层 👑 + 未推进层段折叠成行 + 展示台', /\$\{f\}\$\{f % TRIAL_MILESTONE_EVERY === 0 \? '👑' : ''\}/.test(src) && /通关第 \$\{from - 1\} 层后解锁/.test(src) && /tier: `第 \$\{sel\} 层\$\{def\.milestone \? ' 👑' : ''\}`/.test(src));
ok('试炼塔层详情 KV + 怪物池挂图鉴美术', /icon: bd \? '👾' : '❓',\s*\n\s*iconTex: bd \? bd\.art : undefined,/.test(src));
ok('副本 XL 二级页：三档页签 + 复制卡槽位条选副本', /title: '🏰 资源副本'/.test(src) && /tabs: DUNGEON_TIER_NAMES,/.test(src) && /onTab: t => this\._openDungeonModal\(t\),/.test(src) && /tier: `\$\{rest\}次`,/.test(src));
ok('副本体力消耗行 + 门槛告警行', /cost: \[\{ icon: '⚡', have: gm\.stamina\(\), need: DUNGEON_STAMINA_COST \}\]/.test(src) && /this\._popWarn\(`⚠️ 体力不足，本次需要 \$\{DUNGEON_STAMINA_COST\} 点`\)/.test(src));
ok('副本明细含今日剩余与用完标色', /c\.appendChild\(this\._popKV\('今日剩余', `\$\{left\}\/\$\{DUNGEON_RUNS_PER_DAY\}`/.test(src) && /statusKind: rest <= 0 \|\| !dg\.ok \? 'expire' : undefined,/.test(src));
ok('远征 XL 二级页：任务胶囊固定条 + 队伍槽位条', /title: '🚀 远征派遣'/.test(src) && /const mark = dst === 'ready' \? ' ✨' : dst === 'running' \? ` ⏳\$\{es\.remainText\(d\.id\)\}` : '';/.test(src) && /slots: slotCount > 0 \? sb => \{/.test(src) && /const slotHeroes: string\[\] = run \? run\.heroes\.slice\(\) : picked\.slice\(\);/.test(src));
ok('远征英雄行内选择（上阵/远征禁用）', /status: inLineup \? '上阵中' : busy \? '远征中' : undefined,/.test(src) && /disabled: locked \|\| inLineup \|\| busy,/.test(src) && /on: isPicked/.test(src));
ok('远征三态 CTA：派遣/领取/立即完成+广告', /gate\.ok \? '派 遣' : gate\.reason \?\? '不可派遣'/.test(src) && /label: '领 取 奖 励',\s*\n\s*red: true,/.test(src) && /label: cost > 0 \? `💎\$\{cost\} 立即完成` : '立即完成',/.test(src) && /📺 免费完成 \(\$\{adLeft\}\)/.test(src));
ok('远征秒级倒计时只改固定条胶囊文案', /this\._expTimerEl = this\._popInfo\(runningText\(\)\);/.test(src) && /this\._expTimerEl\.textContent = runningText\(\);/.test(src) && /_expTimerEl: HTMLElement \| null = null;/.test(src));
ok('远征倒计时停摆判定挂在胶囊连通性上（重绘后仍续跑）', /if \(!this\._expTimerEl \|\| !this\._expTimerEl\.isConnected\) \{\s*\n\s*clearInterval\(this\._expTimer\);/.test(src));
ok('远征归零广播一次 EXPEDITION_READY 并就地重绘', /eventCenter\.emit\(GameEvent\.EXPEDITION_READY, d\.id\)/.test(src) && /if \(anyReady && !readyDone\) \{[\s\S]{0,120}this\._popRebuild\(opt\(\)\)/.test(src));
ok('图鉴 L3·L：条目挂美术 + 未解锁剪影', /banner: '📖 怪物图鉴'/.test(src) && /iconTex: unlocked \? def\.art : undefined,/.test(src) && /title: unlocked \? def\.name : '？？？',/.test(src));
ok('图鉴威胁星级 + 精英怪累计', /tag: unlocked \? `\$\{'★'\.repeat\(def\.threat\)\}\$\{'☆'\.repeat\(5 - def\.threat\)\}` : undefined,/.test(src) && /累计击杀', `×\$\{bs\.eliteKills\}`/.test(src));
ok('图鉴详情钻取：push + onBack 回列表 + 展示台立绘', /protected _openBestiaryDetail\(def: BestiaryDef\): void \{/.test(src) && /push: true,\s*\n\s*onBack: \(\) => this\._openBestiaryModal\(\),/.test(src) && /querySelector\('\.popPedestal'\)[\s\S]{0,200}ped\.style\.backgroundImage = u;/.test(src));
ok('图鉴详情未收录态走告警行', /c\.appendChild\(this\._popWarn\('击杀该怪物后解锁完整档案'\)\);/.test(src));
ok('玩法页四玩法已全部改走 _openPop（试炼/副本/远征为 XL 二级页）', /protected _openTrialModal\(\): void \{[\s\S]{0,1400}?size: 'XL',/.test(src) && /protected _openDungeonModal\(tier = 0\): void \{[\s\S]{0,5800}?this\._openPop\(opt\(\)\);/.test(src) && /protected _openExpeditionModal\(\): void \{[\s\S]{0,14000}?this\._openPop\(opt\(\)\);/.test(src));


// 10. 招募 / 礼包迁移（含两处 L5 结果演出层）
ok('招募 L3·M：保底进度固定块 + 概率表 + 碎片库存', /banner: '🎖️ 英雄招募'/.test(src) && /距保底还差 \$\{rs\.pityLeft\} 抽/.test(src) && /c\.appendChild\(this\._popSec\('概率表'\)\);/.test(src) && /c\.appendChild\(this\._popSec\('碎片库存'\)\);/.test(src));
ok('招募单抽/十连双 CTA（钻石不足点击提示差额）', /label: `单 抽（💎 \$\{RECRUIT_PRICE_1\.toLocaleString\(\)\}）`, kind: 'grey'/.test(src) && /钻石不足：还差 💎\$\{\(cost - gm\.res\.get\('diamond'\)\)\.toLocaleString\(\)\}/.test(src));
ok('招募免费次数收进行内动作', /title: '看广告免费招募 1 次',/.test(src) && /AdService\.instance\.claimReward\('recruit', \(\) => \{/.test(src));
ok('招募结果走 L5 结果演出层 + 卡片错峰揭示', /tier: 5,\s*\n\s*size: 'M',\s*\n\s*banner: hasHero \? '🎖️ 招 募 大 成 功'/.test(src) && /style\.animationDelay = `\$\{\(0\.1 \+ i \* 0\.15\)\.toFixed\(2\)\}s`/.test(src) && /弹窗卡片错峰|this\.scheduleOnce\(\(\) => \{/.test(src));
ok('招募结果英雄本体挂立绘 + 再来一次', /this\._heroPhoto\(idx, r\.kind === 'hero' \? 'figure' : 'slot'\)/.test(src) && /再 来 一 次（💎 \$\{cost\.toLocaleString\(\)\}）/.test(src));
ok('礼包 L3·M：逐档行内购买/领取', /banner: '🎁 限时礼包中心'/.test(src) && /label: soldOut \? '今日已购' : free \? '领 取' : `💎\$\{def\.price\.amount\.toLocaleString\(\)\}`/.test(src));
ok('礼包 FREE/折扣角标 + 售罄置灰', /const tag = free\s*\n\s*\? 'FREE'/.test(src) && /statusKind: soldOut \? 'expire' : \(free \? 'soon' : undefined\)/.test(src));
ok('礼包结果走 L5 结果演出层 + 资源合并行', /banner: `🎉 \$\{def\.name\}`/.test(src) && /const resParts = def\.entries\.filter\(e => e\.kind === 'res'\)\.map\(e => e\.label\);/.test(src) && /nameEl\.style\.color = lootDropColor\(drops\[i\]\)/.test(src));
ok('两处 L5 结果层允许点遮罩关闭', /maskClose: true,/.test(src) && /onClose: \(\) => this\._refreshHeroes\(\)/.test(src));
ok('DOM 集合不写 ...spread（ES5 downlevel 会编译成 concat 而静默失效）', !/\[\.\.\.[A-Za-z_$][\w$]*\.(children|childNodes)\]/.test(src) && !/\[\.\.\.[A-Za-z_$][\w$]*\.querySelectorAll\(/.test(src));
ok('L5 卡片错峰揭示改走 querySelectorAll(.popCard)', /row\.querySelectorAll<HTMLElement>\('\.popCard'\)\.forEach/.test(src));


// 11. 关卡奖励详情 / 护送编队迁移
ok('关卡奖励详情 L3·M：金币区间 + 三档掉率', /banner: `🎁 \$\{info\.name\} · 通关奖励`/.test(src) && /金币收益区间 \*\*\$\{Math\.round\(mid \* 0\.85\)\.toLocaleString\(\)\} ~ \$\{Math\.round\(mid \* 1\.15\)\.toLocaleString\(\)\}\*\*/.test(src) && /c\.appendChild\(this\._popAttr\(\{ icon: '🎁', text: `装备掉落率 \*\*\$\{rates\.equip\}\*\*` \}\)\);/.test(src));
ok('关卡奖励详情保留结算公式与难度加成', /const goldMul = gm\.metaGoldMul\(\) \* gm\.depotGoldMul\(\) \* diffDef\.rewardMul;/.test(src) && /c\.appendChild\(this\._popKV\('难度加成', `×\$\{diffDef\.rewardMul\.toFixed\(2\)\}`\)\);/.test(src));
ok('关卡奖励详情不再自建旧面板结构', !/lootPrev/.test(readUi('HomeUiStage.ts')) && !/lpGold/.test(readUi('HomeUiStage.ts')));
ok('编队 L4·M：阵容槽位条固定在弹层底部', /slots: sb => \{/.test(src) && /const cell = this\._popSlot\(\{/.test(src) && /cell\.style\.cssText \+= photo\.css;/.test(src));
ok('编队羁绊按星级门槛实时派生条件文案', /cond = allIn \? `星级合计 \$\{b\.starSumNeed\}★（当前 \$\{sum\}★）` : '全员上阵';/.test(src) && /cond = `\$\{names\.join\(' \+ '\)\} 双双 \$\{need\}★`;/.test(src));
ok('编队候补行内上下阵 + 满编置灰', /label: inLineup \? '下阵' : '上阵',/.test(src) && /disabled: !inLineup && full,/.test(src));
ok('编队改动就地重绘并回写战斗页 CTA 行', /const toggle = \(id: string\): void => \{[\s\S]{0,240}?this\._refreshStagePage\(\);[\s\S]{0,80}?this\._popRebuild\(opt\(\)\);/.test(src));
ok('编队保存走 gm.save + 关闭弹层', /gm\.save\(\);\s*\n\s*SoundFx\.play\('buy'\);\s*\n\s*this\._closePop\(\);/.test(src));
ok('HomeUiStage 旧弹窗入口清零', !/_openStageRewardModal[\s\S]{0,600}this\._openModal\(/.test(src) && !/_openSquadModal[\s\S]{0,600}this\._openSheet\(/.test(src));


// 12. 建筑详情 / 载具改装迁移
ok('建筑详情 L3·M：效果 + 升级 KV + 受限告警', /banner: `\$\{b\.ic\} \$\{b\.name\}`/.test(src) && /text: `升到 LV\.\$\{lv \+ 1\}：\*\*\$\{b\.desc\(lv \+ 1\)\}\*\*`/.test(src) && /c\.appendChild\(this\._popWarn\(`需指挥中心 LV\.\$\{b\.unlockHq\} 解锁（当前 LV\.\$\{gm\.hqLevel\(\)\}）`\)\);/.test(src));
ok('建筑详情升级就地重绘（不再拆弹窗重开）', /_openBuildingInfoModal\(id: string\): void \{[\s\S]{0,4200}?this\._popRebuild\(opt\(\)\);/.test(src) && !/biLvRow/.test(clsSrc));
ok('建筑详情受指挥中心上限约束走告警行', /c\.appendChild\(this\._popWarn\('受指挥中心上限约束 · 先升级指挥中心'\)\);/.test(src));
ok('载具工坊钻取改装 + onBack 回建筑详情', /_openTuningModal\(\(\) => this\._openBuildingInfoModal\(b\.id\)\)/.test(src) && /protected _openTuningModal\(onBack\?: \(\) => void\): void \{/.test(src) && /^\s+onBack,$/m.test(src));
ok('载具改装 XL 二级页：四部位槽位条 + 展示台 + 对比块', /title: '🔧 载具改装'/.test(src) && /tier: maxed \? 'MAX' : `LV\.\$\{lv\}`/.test(src) && /this\._popCmp\('改装预览', \[\{/.test(src) && /for \(let i = 0; i < TUNE_SLOTS\.length; i\+\+\)/.test(src));
ok('载具改装受限/图纸不足走告警行 + 槽位红点', /c\.appendChild\(this\._popWarn\(gate\.reason\)\);/.test(src) && /c\.appendChild\(this\._popWarn\(`图纸不足 · 还差 \$\{cost\.blueprint - bp\} 张`\)\);/.test(src) && /red: !dmax && vt\.canUpgrade\(d\.id\)\.ok,/.test(src));
ok('HomeUiBase 旧弹窗入口清零', !/tuneBox/.test(clsSrc) && !/binfoBox/.test(clsSrc) && !/sq-slot \+ cand/.test(clsSrc));


// 13. 天赋 / 升星 / 属性详情 / 技能 / 体力 / 主页迁移 + 旧弹窗入口总清零
ok('天赋树 L3·M：三分支节点进度格 + 选中节点详情', /banner: '🌟 天赋树'/.test(src) && /c\.appendChild\(this\._popGrid\(nodes\.map\(d => \{/.test(src) && /count: dmax \? '✅' : dOpen \? \(ts\.canUpgrade\(d\.id\) \? '▶' : `\$\{dlv\}\/\$\{d\.maxLevel\}`\) : '🔒',/.test(src));
ok('天赋洗点走 S 型危险确认 + 加点就地重绘', /this\._popConfirm\(\{\s*\n\s*title: '洗点确认',/.test(src) && /danger: true,/.test(src) && /_openTalentModal\(pickId = 'fire_1'\): void \{[\s\S]{0,5200}?this\._popRebuild\(opt\(\)\);/.test(src));
ok('天赋树 onBack 回英雄养成页天赋页签', /onBack: \(\) => \{\s*\n\s*const hid = HERO_DEFS\[this\._heroSelIdx % HERO_DEFS\.length\]\.id;/.test(src) && /this\._openHeroGrowModal\(hid, 2\);/.test(src));
ok('升星 L3·M：星级字幕 + 碎片消耗行 + 升星 CTA', /banner: `⭐ 升星 · \$\{def\.name\}`/.test(src) && /subtitle: `\$\{'★'\.repeat\(st\)\}\$\{'☆'\.repeat\(HERO_STAR_MAX - st\)\}`,/.test(src) && /cost: maxed \? undefined : \[\{ icon: '🔩', have, need: cost \}\]/.test(src));
ok('属性详情 L3·M：攻击/战力/装备加成拆解', /banner: `📊 属性详情 · \$\{def\.name\}`/.test(src) && /c\.appendChild\(this\._popKV\('🛡️ 装备加成', `\+\$\{Math\.round\(\(hs\.equipMulOf\(def\.id\)\.atk - 1\) \* 100\)\}%`\)\);/.test(src));
ok('技能详情 L3·M：当前/下级效果 + 里程碑 + 双消耗', /banner: titles\[slot\]/.test(src) && /c\.appendChild\(this\._popSec\('里程碑解锁'\)\);/.test(src) && /\{ icon: '⚙️', have: coreLeft, need: core \}/.test(src) && /onBack: \(\) => this\._openHeroGrowModal\(heroId, 0\),/.test(src));
ok('体力补给 L3·M：固定条秒级倒计时胶囊 + 两条获取路径行内动作', /banner: '🍖 体力补给'/.test(src) && /this\._stamTimerEl = this\._popInfo\(''\);/.test(src) && /label: '观 看',\s*\n\s*kind: 'green',/.test(src) && /label: `💎 \$\{STAMINA_BUY_COST\}`,/.test(src));
ok('体力倒计时停表判定挂在胶囊连通性上（重绘后仍续跑）', /private _stamTick\(\): void \{\s*\n\s*if \(!this\._stamTimerEl \|\| !this\._stamTimerEl\.isConnected\) \{\s*\n\s*clearInterval\(this\._stamTimer\);/.test(src) && /onClose: \(\) => \{\s*\n\s*clearInterval\(this\._stamTimer\);/.test(src));
ok('个人主页 L3·L：名片 + 战绩/养成/系统/账号四段', /banner: '🎖️ 个人主页'/.test(src) && /iconTex: 'characters\/commander',/.test(src) && /c\.appendChild\(this\._popSec\('📊 战绩统计'\)\);/.test(src) && /c\.appendChild\(this\._popSec\('🎖️ 养成收集'\)\);/.test(src) && /c\.appendChild\(this\._popSec\('🏗️ 系统进度'\)\);/.test(src) && /c\.appendChild\(this\._popSec\('ℹ️ 账号信息'\)\);/.test(src));
ok('全部二级界面已迁新弹层（旧 _openModal/_openSheet/_openResult 调用点清零）', !/this\._openModal\(/.test(clsSrc) && !/this\._openSheet\(/.test(clsSrc) && !/this\._openResult\(/.test(clsSrc));


process.exit(fail ? 1 : 0);

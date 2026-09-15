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
ok('技能养成已并入英雄养成 XL 页(4-B)', /protected _openHeroGrowModal\(heroId: string, tab = 0\): void/.test(src) && /this\._renderSkillCards\(def, \(\) => this\._popRebuild\(opt\(\)\)\)/.test(src));
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
ok('工坊合成/分解双页签', /tabs: \['合成', '分解'\]/.test(src) && /const groups: Array<\{ slot: EquipSlot; tier: EquipTier; n: number; cost: number \}> = \[\]/.test(src));
ok('工坊危险操作用确认模板', /title: '分解装备'/.test(src) && /title: '一键分解'/.test(src) && /danger: true/.test(src));
ok('装备养成 XL 页(4-A)：展示台+双CTA+六槽位条+底栏页签', /养成 · \$\{heroName\}`/.test(src) && /label: '一键强化',/.test(src) && /slots: sb => \{[\s\S]{0,200}EQUIP_SLOTS/.test(src) && /barTabs: \[[\s\S]{0,800}label: '穿戴'/.test(src));
ok('一键强化循环到材料耗尽(装备/武器各一处)', /const doUpgrade = \(n: number\): number => \{/.test(src) && /const upWeapon = \(n: number\): number => \{/.test(src));
ok('英雄养成 XL 页(4-B)：四线页签', /protected _openHeroGrowModal\(heroId: string, tab = 0\): void \{/.test(src) && /\{ icon: '🔧', label: '武器', on: tab === 3/.test(src) && /\{ icon: '🌟', label: '天赋', on: tab === 2/.test(src));
ok('英雄养成展示台挂立绘', /querySelector\('\.popPedestal'\)/.test(src) && /_heroPhoto\(HERO_DEFS\.indexOf\(def\), 'figure'\)/.test(src));


// 9. 玩法页四玩法迁移（试炼/副本/远征/图鉴）+ 组件库补件
ok('组件库补件：告警行 _popWarn + 固定条静态胶囊 _popInfo', /protected _popWarn\(text: string\): HTMLElement \{/.test(src) && /protected _popInfo\(text: string, on = false\): HTMLElement \{/.test(src));
ok('层格网格支持字符角标（✅/▶/◻/🔒）', /count\?: number \| string;/.test(src) && /count: fl \? '✅' : now \? '▶'/.test(src));
ok('试炼塔 L3·L：层段胶囊固定条 + 层格点选', /banner: '🗼 试炼之塔'/.test(src) && /_popChip\(`\$\{from\}~\$\{to\}\$\{lockedSect \? ' 🔒' : ''\}`/.test(src) && /_popGrid\(cells, 5, i => pick\(from \+ i\)\)/.test(src));
ok('试炼塔里程碑层 👑 + 未推进层段折叠成行', /\$\{f\}\$\{mile \? '👑' : ''\}/.test(src) && /通关第 \$\{from - 1\} 层后解锁/.test(src));
ok('试炼塔层详情 KV + 怪物池挂图鉴美术', /icon: bd \? '👾' : '❓',\s*\n\s*iconTex: bd \? bd\.art : undefined,/.test(src));
ok('副本 L3·M：固定三档胶囊就地重开', /banner: '🏰 资源副本'/.test(src) && /_popChip\(nm, t === selTier, \(\) => this\._openDungeonModal\(t\)\)/.test(src));
ok('副本体力消耗行 + 门槛告警行', /cost: \[\{ icon: '⚡', have: gm\.stamina\(\), need: DUNGEON_STAMINA_COST \}\]/.test(src) && /this\._popWarn\(`⚠️ 体力不足，本次需要 \$\{DUNGEON_STAMINA_COST\} 点`\)/.test(src));
ok('副本列表含今日剩余与用完标色', /lines: \[`\$\{DUNGEON_TIER_NAMES\[selTier\]\} · 今日剩余 \$\{rest\}\/\$\{DUNGEON_RUNS_PER_DAY\}`\]/.test(src) && /statusKind: rest <= 0 \? 'expire' : undefined/.test(src));
ok('远征 L3·L：任务胶囊带状态与倒计时', /banner: '🚀 远征派遣'/.test(src) && /const mark = dst === 'ready' \? ' ✨' : dst === 'running' \? ` ⏳\$\{es\.remainText\(d\.id\)\}` : '';/.test(src));
ok('远征英雄行内选择（上阵/远征禁用）', /status: inLineup \? '上阵中' : busy \? '远征中' : undefined,/.test(src) && /disabled: locked \|\| inLineup \|\| busy,/.test(src) && /on: isPicked/.test(src));
ok('远征三态 CTA：派遣/领取/立即完成+广告', /gate\.ok \? '派 遣' : gate\.reason \?\? '不可派遣'/.test(src) && /label: '领 取 奖 励',\s*\n\s*red: true,/.test(src) && /label: cost > 0 \? `💎\$\{cost\} 立即完成` : '立即完成',/.test(src) && /📺 免费完成 \(\$\{adLeft\}\)/.test(src));
ok('远征秒级倒计时只改固定条胶囊文案', /this\._expTimerEl = this\._popInfo\(runningText\(\)\);/.test(src) && /this\._expTimerEl\.textContent = runningText\(\);/.test(src) && /_expTimerEl: HTMLElement \| null = null;/.test(src));
ok('远征倒计时停摆判定挂在胶囊连通性上（重绘后仍续跑）', /if \(!this\._expTimerEl \|\| !this\._expTimerEl\.isConnected\) \{\s*\n\s*clearInterval\(this\._expTimer\);/.test(src));
ok('远征归零广播一次 EXPEDITION_READY 并就地重绘', /eventCenter\.emit\(GameEvent\.EXPEDITION_READY, d\.id\)/.test(src) && /if \(anyReady && !readyDone\) \{[\s\S]{0,120}this\._popRebuild\(opt\(\)\)/.test(src));
ok('图鉴 L3·L：条目挂美术 + 未解锁剪影', /banner: '📖 怪物图鉴'/.test(src) && /iconTex: unlocked \? def\.art : undefined,/.test(src) && /title: unlocked \? def\.name : '？？？',/.test(src));
ok('图鉴威胁星级 + 精英怪累计', /tag: unlocked \? `\$\{'★'\.repeat\(def\.threat\)\}\$\{'☆'\.repeat\(5 - def\.threat\)\}` : undefined,/.test(src) && /累计击杀', `×\$\{bs\.eliteKills\}`/.test(src));
ok('图鉴详情钻取：push + onBack 回列表 + 展示台立绘', /protected _openBestiaryDetail\(def: BestiaryDef\): void \{/.test(src) && /push: true,\s*\n\s*onBack: \(\) => this\._openBestiaryModal\(\),/.test(src) && /querySelector\('\.popPedestal'\)[\s\S]{0,200}ped\.style\.backgroundImage = u;/.test(src));
ok('图鉴详情未收录态走告警行', /c\.appendChild\(this\._popWarn\('击杀该怪物后解锁完整档案'\)\);/.test(src));
ok('玩法页四玩法已全部改走 _openPop', /protected _openTrialModal\(\): void \{[\s\S]{0,6000}?size: 'L',/.test(src) && /protected _openDungeonModal\(tier = 0\): void \{[\s\S]{0,4000}?this\._openPop\(opt\(\)\);/.test(src) && /protected _openExpeditionModal\(\): void \{[\s\S]{0,12000}?this\._openPop\(opt\(\)\);/.test(src));


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


process.exit(fail ? 1 : 0);

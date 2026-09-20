// 五界面 UX 重构断言：页面归属/入口接线/红点迁移/两层 CSS（HomeUi 拆分后按继承链 8 文件拼接检查）
const fs = require('fs');
const UI_FILES = ['HomeUi.ts', 'HomeUiCore.ts', 'HomeUiMall.ts', 'HomeUiHeroes.ts', 'HomeUiStage.ts', 'HomeUiPlay.ts', 'HomeUiBase.ts', 'HomeUiStyle.ts', 'UiPlate.ts'];
const readUi = (f) => fs.readFileSync('assets/scripts/ui/' + f, 'utf8');
const src = UI_FILES.map(readUi).join('\n');
// 仅拼接 TS 类文件（排除样式表）：用于断言"旧 DOM 结构已消失"这类会在 CSS 里留死样式的情况
const clsSrc = UI_FILES.filter((f) => f !== 'HomeUiStyle.ts').map(readUi).join('\n');
// 样式表单独取，供"某条 CSS 必须存在/必须消失"的断言使用
const style = readUi('HomeUiStyle.ts');
// 函数体提取（花括号配平）：签名演进/函数体增长不再破坏断言窗口（取代 [\s\S]{0,N} 定长窗口法）。
// 从 `): void {` 起配平，避开参数对象类型里的 `{`（如 _popIntercept(o: {...})）
const fnBody = (text, sig) => {
    const i = text.indexOf('protected ' + sig);
    if (i < 0) return '';
    const v = text.indexOf('): void {', i);
    if (v < 0) return '';
    let depth = 0;
    for (let k = v + 8; k < text.length; k++) {
        if (text[k] === '{') depth++;
        else if (text[k] === '}' && --depth === 0) return text.slice(i, k + 1);
    }
    return '';
};
// 巡逻系统核心层
const patrolSrc = fs.readFileSync('assets/scripts/core/PatrolSystem.ts', 'utf8');
// 资源与体力时间戳兜底检查需要读核心层
const resSrc = fs.readFileSync('assets/scripts/core/PlayerResources.ts', 'utf8');
// 装备存档校验兜底检查需要读核心层
const gmSrc = fs.readFileSync('assets/scripts/core/GameManager.ts', 'utf8');
let fail = 0;
const ok = (name, cond) => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name);
  if (!cond) fail++;
};

// 1. 导航：第 4 页签改为玩法（key 沿用 core，texKey nav_core 不变 → 不动美术资源）
//    2026-09-21 分类迁移：贴图槽位落到 ui/nav/ 子目录，槽位名仍是 nav_core（判据不变）
ok("NAV 'core' 名称=行动", /key: 'core', icon: '🎮', name: '行动'/.test(src));
ok("texKey core→nav_core 保留（槽位查 UiPlate.NAV_PLATE）", /core: 'ui\/nav\/nav_core'/.test(src));

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

// 3-B. 护送页骨架（布局稿 R2）：章节头 / 居中难度段 / 场景内侧快捷栏 / 里程碑 / 编队条 / 底部 CTA
ok('护送页六段骨架齐备', /'chapter-head'/.test(src) && /'difficulty'/.test(src) && /'stage'/.test(src)
  && /'milestones'/.test(src) && /'team-strip'/.test(src) && /'battle-bottom'/.test(src));
ok('章节头含副标（护送主线 · n/5）', /'chSub'/.test(src) && /护送主线[\s\S]{0,80}\$\{stageId\}\/\$\{FINAL_STAGE_ID\}/.test(src));
// 翻页器从章节头搬进场景内侧左右边缘（垂直居中），章节头只留章节名
ok('翻页器挂场景内侧左右边缘（不再占章节头一行）', /stage\.appendChild\(hl\);[\s\S]{0,80}stage\.appendChild\(hr\);/.test(src)
  && /'arrow ' \+ \(dir < 0 \? 'l' : 'r'\)/.test(src)
  && !/head\.appendChild\(hl\)/.test(src)
  && /#homeUi \.screen\.sStage \.stage > \.arrow\.l \{ left: calc\(60px \* var\(--pw,2\.5\)\)/.test(style)
  && /#homeUi \.screen\.sStage \.stage > \.arrow\.r \{ right: calc\(60px \* var\(--pw,2\.5\)\)/.test(style)
  && /#homeUi \.stage > \.arrow \{ position: absolute; top: 50%; transform: translateY\(-50%\)/.test(style));
ok('翻页边界不留死键（dim 降透明 + 点击说明原因）', /protected _stageStepBlocked\(dir: number\): string \| null \{/.test(src)
  && /classList\.toggle\('dim', whyL !== null\)/.test(src)
  && /const why = this\._stageStepBlocked\(dir\);[\s\S]{0,160}this\._toast\(why\)/.test(src)
  && !/_chArrowL\.disabled/.test(src) && !/_chArrowR\.disabled/.test(src)
  && /#homeUi \.stage > \.arrow\.dim \{ opacity: \.38; \}/.test(style));
ok('难度段三档居中定宽（去掉行头与行尾无尽 chip）', /className = 'diffSeg'/.test(src) && !/diffHead|endChip/.test(src));
ok('难度锁定档不禁用·点击给解锁条件', /未解锁 · \$\{d\.unlockNote\}/.test(src) && !/b\.disabled = true/.test(src));
ok('场景内侧左右快捷栏（左运营带红点 / 右图鉴·排行·试炼）',
  /_buildSideTools\(railL, 'L'\)/.test(src) && /_buildSideTools\(railR, 'R'\)/.test(src)
  && /mkBtn\('📅', '签到', true/.test(src) && /mkBtn\('📋', '任务', true/.test(src) && /mkBtn\('🎁', '礼包', true/.test(src)
  && /mkBtn\('📖', '图鉴', false/.test(src) && /mkBtn\('🏆', '排行', false/.test(src) && /mkBtn\('🗼', '试炼', false/.test(src));
ok('场景底部战力注脚（我方编队战力 vs 推荐战力）', /\.capPow/.test(src) && /\.capRec/.test(src)
  && /gm\.lineup\.reduce\(\(s, id\) => s \+ this\._heroPower\(id\), 0\)/.test(src));
ok('里程碑三档（首次通关/耐久过半/完美护送）', /milestone \$\{st\}/.test(src)
  && /'首次通关'/.test(src) && /'耐久过半'/.test(src) && /'完美护送'/.test(src));
ok('里程碑点击进奖励详情弹窗', /c\.onclick = \(e\) => \{[\s\S]{0,140}_openStageRewardModal\(\)/.test(src));
ok('编队条四席头像 + 空席占位 + 进编队抽屉', /'team-slots'/.test(src) && /'slot-avatar' \+ \(id \? '' : ' empty'\)/.test(src)
  && /'空席'/.test(src) && /'team-slots'[\s\S]{0,2400}_openSquadModal\(\)/.test(src));
ok('底部 CTA 网格 56/1fr/56 + 主钮含体力消耗', /grid-template-columns: calc\(56px \* var\(--pw,2\.5\)\) 1fr calc\(56px \* var\(--pw,2\.5\)\)/.test(src)
  && /\.goCost/.test(src) && /BattleConfig\.RUN_STAMINA_COST/.test(src));
ok('无尽入口移到 CTA 左快捷（锁定只降透明）', /_endlessHot[\s\S]{0,400}classList\.toggle\('off', !endlessOk\)/.test(src) && !/endChip/.test(src));
// 巡逻队：底左槽换巡逻，无尽收进右侧栏；收益随已通关关数增长
ok('战斗底栏左槽改巡逻入口（🛡️ + 可收红点）', /patrol\.className = 'hot patrolHot'/.test(src)
  && /bottom\.appendChild\(patrol\)/.test(src) && /this\._patrolRed = patrol\.querySelector\('\.questRed'\)/.test(src)
  && !/bottom\.appendChild\(endless\)/.test(src));
ok('无尽收进场景右侧栏（与图鉴/排行/试炼同列）', /mkBtn\('♾️', '无尽', false/.test(src)
  && /endlessBtn\.classList\.add\('endlessHot'\)/.test(src) && /this\._endlessHot = endlessBtn/.test(src));
ok('巡逻页 XL 二级页（驻扎选择 + 挂机收取 + 扫荡）', /protected _openPatrolModal\(\): void \{/.test(src)
  && /title: '🛡️ 巡逻队'/.test(src) && /size: 'XL'/.test(src)
  && /ps\.claim\(\)/.test(src) && /ps\.sweep\(sel\)/.test(src) && /ps\.setStage\(sel\)/.test(src));
ok('巡逻收益随已通关关数增长（核心公式在 PatrolSystem）', /PATROL_GOLD_PER_STAGE_HOUR = 400/.test(patrolSrc)
  && /Math\.round\(cleared \* PATROL_GOLD_PER_STAGE_HOUR \* \(1 \+ \(id - 1\) \* PATROL_STAGE_BONUS\)\)/.test(patrolSrc)
  && /PATROL_SWEEP_BASE \+ Math\.floor\(_cleared\(\) \* PATROL_SWEEP_PER_CLEARED\)/.test(patrolSrc)
  && /function isPatrolStage\(stageId: number\): boolean \{[\s\S]{0,200}id <= _cleared\(\)/.test(patrolSrc));
ok('巡逻只服务已通关关卡（未通关不可驻扎/扫荡）', /!isPatrolStage\(stageId\)[\s\S]{0,120}尚未通关，无法扫荡/.test(patrolSrc)
  && /stageId: isPatrolStage\(stageId\) \? stageId : 0/.test(patrolSrc)
  && /disabled: sel > cleared/.test(src));
ok('巡逻持久化 + 每日次数懒重置 + 8 小时封顶', /SAVE_KEY = 'zombie-shooter-patrol'/.test(patrolSrc)
  && /PATROL_MAX_HOURS = 8/.test(patrolSrc) && /Math\.min\(PATROL_MAX_HOURS \* 3600, elapsed\)/.test(patrolSrc)
  && /this\._data\.date !== today/.test(patrolSrc) && /private _sanitize|carry/.test(patrolSrc));
ok('巡逻入口双层红点 CSS', (style.match(/#homeUi \.battle-bottom \.hot \.questRed \{/g) || []).length >= 2
  && /#homeUi \.battle-bottom \.hot \.questRed\.on \{ display: block; \}/.test(style)
  && (style.match(/#homeUi \.side-tools \.hot\.off \{ opacity: \.45; \}/g) || []).length >= 2);

// HUD 排版对齐（宿主页 style.css 的 body{text-align:center} 会被通栏文字继承）
ok('HUD 通栏显式左对齐（昵称不再比经验条多缩进）', (style.match(/#homeUi \.topbar \{[^}]*text-align: left;/g) || []).length >= 2
  && !/#homeUi \.pname \{[^}]*text-align: center/.test(style));
ok('头像美术区取正方（稿 .portrait svg height:43，不再被拉成 43×52）',
  (style.match(/#homeUi \.pAvatar > div \{[^}]*height: calc\(43px \* var\(--(?:hs|pw),/g) || []).length >= 2);
// 商店页签：按钮必须撑满 .flat-tabs 条带（稿里 flex 拉伸；此前 44 会溢出条带下沿，文字看着偏下）
ok('商店页签按钮随条带同高（撑满，不再 44 溢出）',
  (style.match(/#homeUi \.shopTabs button \{[^}]*height: 100%;/g) || []).length >= 2
  && !/#homeUi \.shopTabs button \{[^}]*height: calc\(44px/.test(style)
  && (style.match(/#homeUi \.shopTabs button \{[^}]*display: flex; align-items: center; justify-content: center;/g) || []).length >= 2);
ok('旧关卡信息三格/场景 chip/耐久 chip 已删', !/_siLvlEl|_siPowEl|_siStEl|_siChipEl|_missionTitleEl|_sceneChipEl/.test(src));
ok('护送页骨架两层 CSS 齐备', ['chapter-head', 'difficulty', 'stage', 'stage-scene', 'side-tools', 'stage-caption',
  'milestones', 'team-strip', 'slot-avatar', 'battle-bottom'].every(c =>
  (src.match(new RegExp('#homeUi \\.' + c + ' \\{[^}]*\\}', 'g')) || []).length >= 2));
ok('页面显隐改走 .on 类（护送页 flex 骨架 / 其余四页块级滚动）', /classList\.toggle\('on', key === page\)/.test(src)
  && !/_pages\[key\]\.style\.display/.test(src) && (src.match(/#homeUi \.screen\.sStage\.on \{ display: flex/g) || []).length >= 2);

// 3-C. 英雄页骨架（布局稿 R2）：选择条 / 角色区（两列功能夹立绘 + 六槽）/ 工具行 / 背包四段
ok('英雄页选择条 38px 等分（招募移入工具行）', /pick\.className = 'hero-roster'/.test(src) && !/hpick recruitEntry/.test(clsSrc));
ok('角色区四列网格 44|1fr|44|124（两列功能分立绘两侧）', /grid-template-columns: calc\(44px \* var\(--pw,2\.5\)\) minmax\(0,1fr\) calc\(44px \* var\(--pw,2\.5\)\) calc\(124px \* var\(--pw,2\.5\)\)/.test(src));
// 星级从文本 '★'.repeat() 改成逐颗元素（要贴图就得先有元素），拼串搬进 Mall 的 _starInline：
// 这里盯的仍是同一件事——副标 = 定位 + 星级，且旧的标签行/头牌没被建回来。
ok('角色区名字+星级并入副标（旧头牌/标签行已删）', /className = 'hero-name'/.test(src)
  && /this\._starInline\(sub, def\.role, st\)/.test(src)
  && /_starInline\(host: HTMLElement, prefix: string, n: number\)/.test(src)
  && /\$\{prefix\} · /.test(src)
  && !/tagRow = document/.test(clsSrc) && !/heroHead/.test(clsSrc));
ok('战力行 = 战力 + 右侧 ⓘ 明细', /className = 'powerBadge'/.test(src) && /power\.innerHTML = `战力 <strong>/.test(src) && /power\.appendChild\(pwInfo\)/.test(src));
ok('工具行：编队状态 + 招募/工坊', /className = 'hero-tools'/.test(src) && /className = 'loadouts'/.test(src)
  && /this\._openSquadModal\(\)/.test(src) && />招募/.test(src) && />工坊/.test(src));
ok('背包区四段（头 30 / 滚动网格 / 说明 25 / 页签 34）', /'bagBar bag-section'/.test(src) && /'bag-head'/.test(src)
  && /'bag-scroll'/.test(src) && /'bagGrid bag-grid'/.test(src) && /'bag-detail'/.test(src) && /'bagTabs flat-tabs'/.test(src));
ok('背包部位筛选就地重绘（不重开页面）', /_heroBagFilter/.test(src) && /this\._heroBagFilter = filter\.value as/.test(src));
ok('英雄页骨架两层 CSS 齐备', ['hero-roster', 'hero-body', 'hero-stage', 'hero-quick', 'hero-figure', 'hero-name',
  'powerBadge', 'equipment', 'hero-tools', 'bag-detail', 'flat-tabs'].every(c =>
  (src.match(new RegExp('#homeUi \\.' + c + ' \\{[^}]*\\}', 'g')) || []).length >= 2));
ok('英雄页骨架栅格两层同值（44/1fr/44/124 + 6 列背包）', (src.match(/grid-template-columns: repeat\(6, minmax\(0,1fr\)\)/g) || []).length >= 2
  && (src.match(/height: 38%; max-height: calc\(263px/g) || []).length >= 2);
ok('英雄页页面显隐走 .on 类（flex 满屏骨架）', (src.match(/#homeUi \.screen\.sHeroes\.on \{ display: flex/g) || []).length >= 2);

// 4. 英雄页吸收技能
ok('_renderSkillCards 存在', /protected _renderSkillCards\(def: HeroDef, onUpgraded\?: \(\) => void\): HTMLDivElement \{/.test(src));
ok('技能养成改左功能列按钮入口（emoji 已包进 .ic 图标位，与其余四钮同字号）', /skillEntry/.test(src) && /<span class="ic">⚡<\/span><span>技能<\/span>/.test(src));
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
ok('行动页含日常四快捷（签到/任务/成就/礼包）', /'action-daily'/.test(src) && /mkDaily\('📅', '签到'/.test(src)
  && /mkDaily\('📋', '任务'/.test(src) && /mkDaily\('🎖️', '成就'/.test(src) && /mkDaily\('🎁', '礼包'/.test(src));
ok('行动页红点接线 _questRedEl', /this\._questRedEl = questBtn\.querySelector/.test(src));
ok('行动页红点接线 _signinRedEl', /this\._signinRedEl = signinBtn\.querySelector/.test(src));
ok('行动页入口红点巡检挂整页 _playGridEl', /this\._playGridEl = page/.test(src));
ok('挑战场两席（无尽试炼 / 无尽护送·锁定态）', /'challenge-ground'/.test(src) && /mkEntry\('🗼', '无尽试炼'/.test(src)
  && /mkEntry\('🌀', '无尽护送'/.test(src) && /_startBattle\(true\)/.test(src));
ok('资源副本四联走 DUNGEON_DEFS', /className = 'dungeon-row'/.test(src) && /DUNGEON_DEFS\.forEach\(\(def, i\)/.test(src)
  && /_openDungeonModal\(i\)/.test(src));
ok('远征行（图标 + 进度文案 + 入口）', /className = 'expedition'/.test(src) && /this\._enterPureEntry\('expedition'\)/.test(src));
ok('页脚三快捷（图鉴/排行/载具改装）', /'action-footer'/.test(src) && /mkFoot\('📖', '怪物图鉴'/.test(src)
  && /mkFoot\('🏆', '排行榜'/.test(src) && /mkFoot\('🔧', '载具改装'/.test(src));
ok('行动页仍走 _pureEntryDesc/_enterPureEntry', /this\._pureEntryDesc\('expedition'\)/.test(src)
  && /this\._enterPureEntry\('expedition'\)/.test(src));
ok('行动页红点 _refreshPureEntryRed', /_refreshEntryReds[\s\S]{0,700}_refreshPureEntryRed\(card\.dataset\.entry/.test(src));
ok('行动页骨架两层 CSS 齐备', ['action-title', 'action-daily', 'challenge-ground', 'entry', 'dungeons',
  'section-label', 'dungeon-row', 'expedition', 'expedition-text', 'action-footer'].every(c =>
  (src.match(new RegExp('#homeUi \\.' + c + ' \\{[^}]*\\}', 'g')) || []).length >= 2));
ok('行动页满屏骨架 .on 类（两层）', (src.match(/#homeUi \.screen\.sAction\.on \{ display: flex/g) || []).length >= 2);
ok('基地横幅不再含任务/签到按钮', !/questEntry|signinEntry/.test(readUi('HomeUiBase.ts')));

// 6. 红点增量刷新迁移
ok('_refreshEntryReds 查玩法页+dataset', /_refreshEntryReds[\s\S]{0,400}this\._playGridEl[\s\S]{0,300}card\.dataset\.entry/.test(src));
ok('_refreshEntryReds 不再查基地 grid', !/const grid = this\._baseGridEl;\s*\n\s*if \(!grid\) \{\s*\n\s*return;\s*\n\s*\}\s*\n\s*const map/.test(src));

// 7. 基地页地图化：只留养成建筑 + META 局外强化卡
ok('_refreshBase 跳过 pureEntry', /for \(const b of BUILDINGS\) \{\s*\n\s*if \(b\.pureEntry\) \{\s*\n\s*continue;\s*\n\s*\}/.test(src));
ok('基地页挂 _baseMapEl 地图', /this\._baseMapEl = map/.test(src));
ok('基地地图节点点击开详情抽屉', /node\.onclick[\s\S]{0,160}_openBuildingInfoModal\(b\.id\)/.test(src));
ok('建筑详情为 L3·L 弹层（含关联功能区，M 装不下按内容量升档）', /protected _openBuildingInfoModal\(id: string\): void \{[\s\S]{0,1200}?size: 'L',/.test(src));
ok('建筑升级在抽屉内接线', /gm\.upgradeBuilding\(b\.id\)[\s\S]{0,300}this\._refreshBase\(\)/.test(src));
ok('META 局外强化升为 L2·XL 二级页（不再占基地页中段）', !/className = 'base-meta'/.test(src)
  && /protected _openMetaUpgradeModal\(onBack\?: \(\) => void\): void \{/.test(src)
  && /this\._openMetaUpgradeModal\(\(\) => this\._openBuildingInfoModal\(b\.id\)\)/.test(src)
  && /META_UPGRADES\[sel\]/.test(src));
ok('_baseRows 累加字段已删', !/_baseRows/.test(src));

// 7-B. 商店页骨架（布局稿 R2）：货架头 / 滚动货架（主推 offer + 分区标签 + 三列货架）/ 底部页签
ok('商店页货架头（页名 + 每日免费补给）', /'shop-mast'/.test(src) && /giftDot/.test(src) && /_mastTitleEl/.test(src));
ok('主推一：招募 offer（保底条 + 免费/单抽/十连）', /'shop-offer rcard'/.test(src) && /offer-buttons/.test(src)
  && /rcOne/.test(src) && /rcTen/.test(src) && /rcAd/.test(src));
ok('主推二：礼包 offer（escort 立绘收进 offer-art）', /'shop-offer giftOffer'/.test(src) && /offer-art/.test(src)
  && /scenes\/escort/.test(src));
ok('货架分区标签 + 三列货架', /'section-label'/.test(src) && /'goods shopGrid'/.test(src));
ok('商店页签收到底部 flat-tabs', /'flat-tabs shopTabs'/.test(src));
ok('商店页骨架两层 CSS 齐备', ['shop-mast', 'shop-scroll', 'shop-offer', 'offer-art', 'offer-copy', 'offer-buttons',
  'goods', 'good'].every(c => (src.match(new RegExp('#homeUi \\.' + c + ' \\{[^}]*\\}', 'g')) || []).length >= 2)
  && (src.match(/#homeUi \.screen\.sShop\.on \{ display: flex/g) || []).length >= 2);
ok('商店旧 banner 类已退出构建（shopBanner/sbTxt 不再出现）', !/shopBanner/.test(clsSrc) && !/sbTxt/.test(clsSrc));

// 7-C. 基地页骨架（布局稿 R2）：头行 / 营地地图（路面 + 2×4 建筑格）/ 局外强化条 / 底行
ok('基地页头行（基地名 + 全队加成）', /'base-head'/.test(src) && /_baseHeadSubEl/.test(src));
ok('营地地图：路面底纹 + 2×4 建筑格', /'base-map'/.test(src) && /'map-roads'/.test(src) && /'base-buildings'/.test(src)
  && /this\._baseBuildingsEl = buildings/.test(src));
ok('建筑格 8 座（跳过 pureEntry）+ 红点/锁定态', /node\.dataset\.building = b\.id/.test(src)
  && /b\.pureEntry[\s\S]{0,60}continue/.test(src) && /building' \+ \(unlocked \? '' : ' locked'\)/.test(src));
ok('基地底行（下一级营地 / 已开放设施数）', /'base-bottom'/.test(src) && /下一级营地：解锁/.test(src) && /已开放 \$\{opened\}/.test(src));
ok('基地页骨架两层 CSS 齐备', ['base-head', 'base-map', 'map-roads', 'base-buildings', 'building', 'base-bottom']
  .every(c => (src.match(new RegExp('#homeUi \\.' + c + ' \\{[^}]*\\}', 'g')) || []).length >= 2)
  && (src.match(/#homeUi \.screen\.sBase\.on \{ display: flex/g) || []).length >= 2);
ok('基地旧横幅/节点类已退出构建（baseBanner/mapNode 不再出现）', !/baseBanner/.test(clsSrc) && !/mapNode/.test(clsSrc));

// 8. 两层 CSS
ok('dutyCard base 层(--hs)', /#homeUi \.dutyCard \{[^}]*--hs,1/.test(src));
ok('dutyCard 青瓷层(--pw)', /#homeUi \.dutyCard \{[^}]*--pw,2\.5/.test(src));
ok('modeRow 两层 CSS', (src.match(/#homeUi \.modeRow \{[^}]*\}/g) || []).length >= 2);
ok('baseMap/mapNode 两层 CSS', (src.match(/#homeUi \.mapNode \{[^}]*\}/g) || []).length >= 2);
ok('rcard 两层 CSS', (src.match(/#homeUi \.rcard \{[^}]*\}/g) || []).length >= 2);
ok('milestones 两层 CSS', (src.match(/#homeUi \.milestones \{[^}]*\}/g) || []).length >= 2);

// 9. P0/P1 壳层关键接线
ok('运营/快捷栏收进护送页场景内侧（不再挂 viewport 悬浮）', /'side-tools left'/.test(src) && /'side-tools right'/.test(src) && !/floatRail|frBtn/.test(src));
ok('胶囊禁入区：viewport-fit=cover', /viewport-fit=cover/.test(require('fs').readFileSync('build-templates/web-mobile/index.html', 'utf8')));
ok('胶囊禁入区：_applySafeArea 探针填令牌', /_applySafeArea/.test(src) && /setProperty\('--sat'/.test(src) && /setProperty\('--sab'/.test(src));
ok('胶囊禁入区：CSS 挂令牌（顶栏/CTA/底栏/悬浮栏/toast/弹窗）', (src.match(/var\(--sat,0px\)|var\(--sab,0px\)/g) || []).length >= 10);
// 稿 .safe 32（手机版 30 + 状态栏安全区）= 顶部刘海/胶囊留白条；壳层首位，信息栏不再自加上边距
ok('顶部刘海/胶囊安全区条（稿 .safe，壳层首位）', /protected _buildSafeBand\(root: HTMLDivElement\): void \{[\s\S]{0,200}className = 'safeBand'/.test(src)
  && /_buildSafeBand\(root\);[\s\S]{0,120}_buildTopbar\(root\);/.test(src)
  && /#homeUi \.safeBand \{[^}]*height: max\(calc\(32px \* var\(--pw,2\.5\)\), calc\(30px \* var\(--pw,2\.5\) \+ var\(--sat,0px\)\)\)/.test(style));
ok('公告走马灯已下线（无残留字段/构建/队列）', !/_noticeBarEl|_noticeTextEl|_noticeRedEl|_tickerIdx|_tickerTap|_buildTickerQueue|_advanceTicker|_refreshNoticeBar|_buildNoticeBar|noticeScroll/.test(clsSrc)
  && /#homeUi \.noticeBar/.test(style) === false);
ok('公告入口收进信息栏 📣（删除走马灯后仍可达）', /noticeBtn\.className = 'tinyIcon homeNoticeBtn'/.test(src) && /this\._openNoticeModal\(\);/.test(src));
ok('底部导航关卡→护送', /key: 'battle', icon: '🚚', name: '护送'/.test(src));
ok('五签等分（布局稿 R2 去掉居中凸起主钮）', /grid-template-columns: repeat\(5, 1fr\)/.test(src) && !/\.tab\.main \{/.test(src));
ok('编队升级为 L4 半屏抽屉弹层', /protected _openSquadModal\(\): void \{[\s\S]{0,1600}?tier: 4,\s*\n\s*size: 'M',/.test(src) && /protected _openSquadModal\(\): void \{[\s\S]{0,8600}?this\._openPop\(opt\(\)\);/.test(src));
ok('招募结果层升级为 L5 结果演出层（不再走旧 _openResult）', /protected _openRecruitResultModal\(results: RecruitResult\[\]\): void \{[\s\S]{0,400}?_openPop\(\{[\s\S]{0,120}?tier: 5/.test(src));
ok('招募单抽/十连进商店 rcard', /doPull = \(count: 1 \| 10, free = false\)/.test(src));
ok('英雄页功能钮双列(左:技能/天赋/升星 右:武器/核心)', /fcol\.appendChild\(skBtn\);[\s\S]{0,200}fcol\.appendChild\(talBtn\);[\s\S]{0,200}fcol\.appendChild\(starBtn\)/.test(src)
  && /fcolR\.appendChild\(wpnBtn\);[\s\S]{0,200}fcolR\.appendChild\(coreBtn\)/.test(src)
  && /stage\.appendChild\(fcol\);[\s\S]{0,200}stage\.appendChild\(fcolR\);/.test(src));
// 五钮齐备：逐个存在性断言，不用 [s\S]{0,N} 定长窗口（接线加几行就假 FAIL，见 AGENTS.md 工具坑）
ok('英雄页五钮齐备并汇入养成页(核心1/强化3/技能0/升星/天赋2)', ['_openHeroGrowModal(def.id, 1)',
  '_openHeroGrowModal(def.id, 3)', '_openHeroGrowModal(def.id, 0)', '_openStarModal(def.id)',
  '_openHeroGrowModal(def.id, 2)'].every((s) => src.includes(s)));
ok('战力徽章挂立绘下方', /fig\.appendChild\(power\)/.test(src) && !/head\.appendChild\(power\)/.test(src));
ok('大升星条已删·改弹窗入口', !/className = 'starBar panel'/.test(src) && /_openStarModal\(heroId: string\): void/.test(src) && /starEntry/.test(src));
ok('战力右侧 ⓘ 详情入口', /pwInfo/.test(src) && /power\.appendChild\(pwInfo\)/.test(src));
ok('属性详情弹窗 _openPowerDetailModal', /protected _openPowerDetailModal\(heroId: string\): void/.test(src));
ok('三维栏已删（statRow 不再构建）', !/className = 'statRow'/.test(src) && !/mkStat\(/.test(src));
ok('装备六槽 eqGrid equipment', /className = 'eqGrid equipment'/.test(src));

// 6. 二级弹层系统（UX 布局稿 v1.0 落地）：统一入口 / 五级分层 / 四尺寸档 / 五段式 / 双主题令牌
ok('弹层统一入口 _openPop', /protected _openPop\(opts: PopOpts\): void \{/.test(src) && /_renderPop\(opts: PopOpts, keepScroll = false\)/.test(src));
ok('五级分层 z-index 阶梯(L2/L3/L4/L5)', /\.protoMask\.popL2 \{ z-index: 210/.test(src) && /\.protoMask\.popL3 \{ z-index: 220/.test(src) && /\.protoMask\.popL4 \{ z-index: 230/.test(src) && /\.protoMask\.popL5 \{ z-index: 240/.test(src));
ok('L5 结果层不可遮罩关闭', /opts\.maskClose \?\? \(tier !== 5 && size !== 'XL'\)/.test(src));
ok('尺寸档 S/M/L/XL 几何', /#homeUi \.pop\.M \{ position: absolute/.test(src) && /#homeUi \.pop\.L \{ position: absolute/.test(src) && /#homeUi \.pop\.S \{ position: absolute/.test(src) && /#homeUi \.pop\.XL \{ position: absolute; inset: 0/.test(src));
ok('五段式顺序 头/内容/消耗/CTA/槽位/底栏', /'popScroll'[\s\S]{0,1200}'popCost'[\s\S]{0,800}'popCTA'[\s\S]{0,2600}'popSlots'[\s\S]{0,1200}'popBar'/.test(src));
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
// 取方法体（花括号配平）再断言：写死字符数窗口会随方法内新增行而失效，
// 断言的是结构，不应被无关编辑挤破。
const methodBody = (text, sig) => {
  const i = text.indexOf(sig);
  if (i < 0) return '';
  let j = text.indexOf('{', i + sig.length - 1), depth = 0;
  for (let k = j; k < text.length; k++) {
    if (text[k] === '{') depth++;
    else if (text[k] === '}') { depth--; if (depth === 0) return text.slice(j, k + 1); }
  }
  return '';
};
const forgeBody = methodBody(clsSrc, 'protected _openForgeModal(');
ok('工坊升 L2·XL 二级页：合成/分解双页签 + 展示台 + 底栏返回',
  /tier: 2,\s*\n\s+size: 'XL',\s*\n\s+title: '⚒️ 装备工坊',\s*\n\s+barBack: true,/.test(forgeBody)
  && /tabs: \['合成', '分解'\]/.test(forgeBody));
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
ok('副本 XL 二级页：三档页签 + 复制卡槽位条选副本', /title: '🏰 资源副本'/.test(src) && /tabs: DUNGEON_TIER_NAMES,/.test(src) && /onTab: t => \{[\s\S]{0,80}?selTier = t;[\s\S]{0,80}?this\._popRebuild\(opt\(\)\);/.test(src) && /tier: `\$\{rest\}次`,/.test(src));
ok('切页签就地重绘（保留滚动位）：工坊/副本两处', /onTab: i => \{[\s\S]{0,160}?this\._forgeTab = i;[\s\S]{0,60}?this\._popRebuild\(opt\(\)\);/.test(src) && /protected _forgeFilter: \[number, number\] = \[0, 0\];/.test(src) && /protected _forgeSel: \[number, number\] = \[-1, -1\];/.test(src));
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
{
    const trial = fnBody(src, '_openTrialModal'), dungeon = fnBody(src, '_openDungeonModal'), expedition = fnBody(src, '_openExpeditionModal');
    ok('玩法页四玩法已全部改走 _openPop（试炼/副本/远征为 XL 二级页）',
        /size: 'XL'/.test(trial) && /this\._openPop\(opt\(\)\)/.test(trial)
        && /size: 'XL'/.test(dungeon) && /this\._openPop\(opt\(\)\)/.test(dungeon)
        && /size: 'XL'/.test(expedition) && /this\._openPop\(opt\(\)\)/.test(expedition));
}


// 10. 招募 / 礼包迁移（含两处 L5 结果演出层）
ok('招募 L3·L：保底进度固定块 + 概率一行摘要 + 碎片库存（列表型按内容量升档）', /banner: '🎖️ 英雄招募'/.test(src) && /距保底还差 \$\{rs\.pityLeft\} 抽/.test(src) && /_popKV\('概率：英雄 6% · 传说碎片 14%'/.test(src) && /c\.appendChild\(this\._popSec\('碎片库存'\)\);/.test(src));
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
ok('编队改动就地重绘并回写战斗页 CTA 行', /const applyToggle = \(id: string\): void => \{[\s\S]{0,260}?this\._refreshStagePage\(\);/.test(src) && /const toggle = \(id: string\): void => \{[\s\S]{0,120}?this\._popRebuild\(opt\(\)\);/.test(src));

// 14. 3-C 拦截层 + S 档确认模板统一（UX 3-3/3-4）
const interceptBody = fnBody(src, '_popIntercept');
const unlockGateBody = fnBody(src, '_openUnlockGate');
ok('3-C 拦截型 S 弹窗：体力不足/未解锁两条出路，不出现「取消」',
    /o: \{/.test(interceptBody)
    && /need: number/.test(fnBody(src, '_openStaminaGate'))
    && /goLabel = '前 往 关 卡'/.test(unlockGateBody) && /解锁进度随主线推进自动刷新/.test(unlockGateBody)
    && interceptBody.indexOf('取消') < 0 && /再 等 等/.test(interceptBody) && /o\.ok\.label/.test(interceptBody));
ok('体力不足不再 toast 混杂：出战与副本各一处走拦截弹窗', /this\._openStaminaGate\(BattleConfig\.RUN_STAMINA_COST\);/.test(clsSrc) && /this\._openStaminaGate\(DUNGEON_STAMINA_COST/.test(clsSrc));
ok('禁用键不是死键：PopCta/PopRow/商城键各有 onDisabled 通道', /onDisabled\?: \(\) => void;/.test(src) && /c\.onDisabled\?\.\(\);/.test(src) && /o\.action!\.onDisabled\?\.\(\);/.test(src) && /opt\.onBlocked\?\.\(\);/.test(src));
ok('交互入口不用 HTML disabled（会吞掉 click，缺口提示无法触达）', !/buy\.disabled = !!opt\.disabled/.test(src) && !/endChip\.disabled = !endlessOk/.test(src) && !/this\._endlessHot\.disabled = !endlessOk/.test(src) && /'btn gold gBuy' \+ \(opt\.disabled \? ' off' : ''\)/.test(src));
ok('下阵走 S 型双按钮模板（确认后才移出编队）', /title: '下阵确认'/.test(src) && /ok: '确 认 下 阵'/.test(src) && /cancel: '再 想 想'/.test(src) && /confirmOff\(def\.id\)/.test(src));
ok('钻石购买走双按钮确认，金币购买保持即点即得', /protected _tapBuy\(item: ShopItem, buy: \(\) => void\): void \{/.test(src) && /item\.price\.res !== 'diamond'/.test(src) && /title: '购买确认'/.test(src));
ok('资源不足拦截（3-C 资源变体）给差额与获取去向', /protected _openResGate\(res: string, need: number, itemName: string\): void \{/.test(src) && /还差 \*\*/.test(src) && /this\._openGiftModal\(\);/.test(src) && /protected _openGiftModal\(\): void \{/.test(src));
ok('编队保存走 gm.save + 关闭弹层', /gm\.save\(\);\s*\n\s*SoundFx\.play\('buy'\);\s*\n\s*this\._closePop\(\);/.test(src));
ok('HomeUiStage 旧弹窗入口清零', !/_openStageRewardModal[\s\S]{0,600}this\._openModal\(/.test(src) && !/_openSquadModal[\s\S]{0,600}this\._openSheet\(/.test(src));


// 12. 建筑详情 / 载具改装迁移
ok('建筑详情 L3·M：效果 + 升级 KV + 受限告警', /banner: `\$\{b\.ic\} \$\{b\.name\}`/.test(src) && /text: `升到 LV\.\$\{lv \+ 1\}：\*\*\$\{b\.desc\(lv \+ 1\)\}\*\*`/.test(src) && /c\.appendChild\(this\._popWarn\(`需指挥中心 LV\.\$\{b\.unlockHq\} 解锁（当前 LV\.\$\{gm\.hqLevel\(\)\}）`\)\);/.test(src));
ok('建筑详情升级就地重绘（不再拆弹窗重开）', /_openBuildingInfoModal\(id: string\): void \{[\s\S]{0,6400}?this\._popRebuild\(opt\(\)\);/.test(src) && !/biLvRow/.test(clsSrc));
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


// 14. 大额购买确认统一 + 禁用态补全覆盖 + 体力时间戳兜底
ok('商城大额购买统一确认模板（_confirmSpend 承载金币英雄/装备/核心）', /protected _confirmSpend\(o: \{[\s\S]{0,400}?res: 'gold' \| 'diamond';[\s\S]{0,900}?this\._popConfirm\(\{/.test(src) && /onTap: \(\) => this\._confirmSpend\(\{\s*\n\s*name: def\.name,\s*\n\s*desc: `解锁英雄/.test(src) && /onTap: \(\) => this\._confirmSpend\(\{\s*\n\s*name: def\.name,\s*\n\s*desc: `装备入包/.test(src) && /onTap: \(\) => this\._confirmSpend\(\{\s*\n\s*name: core\.name,/.test(src));
ok('材料/道具等廉价金币购买不经确认（保持即点即得）', /protected _tapBuy\(item: ShopItem, buy: \(\) => void\): void \{\s*\n\s*if \(item\.price\.res !== 'diamond'\) \{\s*\n\s*buy\(\);/.test(src) && /this\._confirmSpend\(\{\s*\n\s*name: item\.name,\s*\n\s*desc: item\.desc,\s*\n\s*res: 'diamond',/.test(src));
ok('建筑升级禁用态三通道（未达标转指挥中心 / 满级 / 金币差额）', /const can = [\s\S]{0,120}?;/.test(src) && /onDisabled: \(\) => \{[\s\S]{0,700}?this\._openUnlockGate\([\s\S]{0,240}?'前 往 指 挥 中 心'/.test(src) && /this\._toast\('该建筑已满级'\)/.test(src) && /this\._toast\(`金币不足 · 还差 🪙 \$\{\(cost - gm\.gold\)\.toLocaleString\(\)\}`\)/.test(src));
ok('试炼/远征禁用态补拦截（不再静默置灰）', /this\._openUnlockGate\('试炼未解锁', '🗼'/.test(src) && /this\._openUnlockGate\('暂不可派遣', '🚀'/.test(src) && /this\._openResGate\('diamond', cost, '立即完成'\)/.test(src));
ok('体力时间戳兜底：毫秒值降级为秒 + 未来时间钳回当前', /const asSecs = Math\.floor\(ts \/ 1000\);\s*\n\s*ts = asSecs > 0 && asSecs <= now \? asSecs : now;/.test(resSrc) && /this\._staminaTs = ts > 0 \? ts : now;/.test(resSrc));
ok('体力倒计时上界不超过一个恢复周期', /return Math\.min\(regenSecs, Math\.max\(0, this\._staminaTs \+ regenSecs - now\)\);/.test(resSrc));


// 15. 本轮补漏：试炼锁定层段可解释、远征标签与拦截同源、英雄卡金币门槛、倒计时文案
ok('试炼锁定层段/层位给 3-C 拦截（不再是裸 toast）', /if \(lockedSect\) \{\s*\n\s*this\._openUnlockGate\('试炼未解锁', '🗼', `需先通关第 \$\{from - 1\} 层`\);/.test(src) && /if \(!ts\.isFloorUnlocked\(f\)\) \{\s*\n\s*this\._openUnlockGate\('试炼未解锁', '🗼', `需先通关第 \$\{Math\.max\(0, f - 1\)\} 层`\);/.test(src) && !/this\._toast\(`第 \$\{f\} 层尚未解锁`\)/.test(src) && !/this\._toast\(`第 \$\{from\} 层尚未解锁`\)/.test(src));
ok('远征派遣标签与拦截弹窗同源（不出现两套说辞）', /label: gate\.ok \? '派 遣' : gate\.reason \?\? '不可派遣',/.test(src) && !/`请选择 \$\{def\.slots - picked\.length\} 名英雄`/.test(src));
ok('商城英雄卡受金币门槛约束（不再出现注定失败的购买确认）', /const poor = !owned && gm\.gold < price;/.test(src) && /disabled: owned \|\| poor,/.test(src) && /this\._openResGate\('gold', price, def\.name\);/.test(src) && /this\._toast\('金币不足 · 未能解锁'\);/.test(src));
ok('体力倒计时文案无错字（下一点）', /⏳ 下一点 \$\{Math\.floor\(nextIn \/ 60\)\}/.test(src) && !/下一几点/.test(src));


// 16. 英雄页 背包→装备槽 拖拽穿戴（全新交互：全工程此前无指针事件/长按/拖拽）
ok('拖拽会话三态 pending→scroll|drag', /mode: 'pending' \| 'scroll' \| 'drag'/.test(src));
ok('触摸长按 220ms 才进拖拽（提前移动＝滑背包）', /s\.timer = setTimeout\(\(\) => \{[\s\S]{0,180}?\}, 220\);/.test(src) && /s\.mode = 'scroll';/.test(src));
ok('指针事件接线：down/move/up/cancel + 指针捕获', /addEventListener\('pointerdown'/.test(src) && /addEventListener\('pointermove'/.test(src)
  && /addEventListener\('pointerup'/.test(src) && /addEventListener\('pointercancel'/.test(src) && /setPointerCapture/.test(src));
ok('不支持 PointerEvent 时降级为纯点击（不接线拖拽）', /protected _pointerReady\(\): boolean \{[\s\S]{0,140}?!!window\.PointerEvent/.test(src) && /if \(!this\._pointerReady\(\)\) \{[\s\S]{0,40}?return;/.test(src));
ok('装备槽挂 data-slot 作为落点标识', /el\.dataset\.slot = slot;/.test(src));
ok('同部位槽位高亮可落 / 异部位压暗', /classList\.toggle\('dropOk', match\)/.test(src) && /classList\.toggle\('dropBad', !match\)/.test(src));
ok('落点部位不符不换装并解释原因', /slot !== s\.item\.slot[\s\S]{0,160}?部位不匹配/.test(src));
ok('拖影挂 pointer-events:none（否则 elementFromPoint 永远命中拖影）', /#homeUi \.dragGhost \{ position: fixed;[\s\S]{0,120}?pointer-events: none;/.test(src));
ok('落地按件身份复核背包下标（防刷新后错位穿错件）', /protected _findBagIndex\(s: EquipDragSession\): number \{/.test(src) && /if \(at && same\(at, s\.item\)\) \{/.test(src) && /背包已变化 · 请重新拖拽/.test(src));
ok('穿戴走 equipFromBag（旧件回背包由核心层保证）', /hs\.equipFromBag\(def\.id, idx\)/.test(src) && /hs\.equipped\(def\.id, s\.item\.slot\)/.test(src));
ok('拖拽结束吞掉同一次手势合成的 click（吞且仅吞一个）', /protected _consumeDragClick\(\): boolean \{/.test(src)
  && /this\._swallowClick = true;/.test(src) && /this\._swallowClick = false;\s*\n\s*const touch/.test(src)
  && /cell\.onclick = \(e\) => \{[\s\S]{0,120}?this\._consumeDragClick\(\)/.test(src) && /el\.onclick = \(e\) => \{[\s\S]{0,120}?this\._consumeDragClick\(\)/.test(src));
ok('吞 click 标记在根层按下复位（落地重绘后合成 click 打在脱离节点上，不冒泡到格子）', /protected _armDragClickGuard\(\): void \{/.test(src)
  && /this\._root\.addEventListener\('pointerdown', \(\) => \{ this\._swallowClick = false; \}, true\)/.test(src)
  && /this\._equipDragAbort\(\);\s*\n\s*this\._armDragClickGuard\(\);/.test(src));
ok('整块重建前先收拖拽（捕获元素会被拆掉）', /protected _refreshHeroes\(\): void \{\s*\n\s*\/\/[^\n]*\n\s*this\._equipDragAbort\(\);/.test(src));
ok('只有装备页签接线拖拽（其它页签保持点击开详情）', (src.match(/_wireBagDrag\(/g) || []).length === 2);
ok('背包滚动改手动驱动（格子 touch-action:none，两层各一份）', (src.match(/#homeUi \.bagBar \.bcell \{ touch-action: none;/g) || []).length >= 2);
ok('拖拽态两层 CSS（拖影/可落/悬停）', (src.match(/#homeUi \.dragGhost \{/g) || []).length >= 2
  && (src.match(/#homeUi \.slot\.dropOk \{/g) || []).length >= 2 && (src.match(/#homeUi \.slot\.over \{/g) || []).length >= 2);
ok('长按手势有入口说明（新交互可发现性）', /longPress|长按装备拖到左侧槽位即可穿戴/.test(src) && /bagHint/.test(src));
ok('背包件穿戴后能过存档校验（虚拟 id bag:slot:tier 不再被当坏档丢掉）',
  /private _equipIdOk\(id: string, slot: EquipSlot\): boolean \{/.test(gmSrc)
  && /if \(!id\.startsWith\('bag:'\)\) \{/.test(gmSrc) && /isEquipTier\(Number\(parts\[2\]\)\)/.test(gmSrc)
  && /this\._equipIdOk\(st\.id, slot\)/.test(gmSrc));

// ================= 16. 战斗局内布局（对照 ux-layout-review/battle.html，除车尾区外） =================
const domHudSrc = fs.readFileSync('assets/scripts/ui/DomHud.ts', 'utf8');
const luSrc = fs.readFileSync('assets/scripts/ui/LevelUpPanel.ts', 'utf8');
const battleMgrSrc = fs.readFileSync('assets/scripts/battle/BattleManager.ts', 'utf8');
// ⓪ 顶部留白间距：--safeTop = max(32 设计像素, --sat)，顶栏整体下移、间距透明露画面（不做遮盖）
ok('战斗顶栏下移留空顶部间距（交互稿 .safe 32px，刘海设备吃 --sat）',
  /--safeTop: max\(calc\(32px \* var\(--s,1\)\), var\(--sat, 0px\)\)/.test(domHudSrc)
  && /#domHud \.topbar \{ position: absolute; top: var\(--safeTop\); left: 0; right: 0;\s*\n\s*height: calc\(122px \* var\(--s, 1\)\);/.test(domHudSrc)
  && !/padding: var\(--safeTop\)/.test(domHudSrc));
// ① 顶栏：122 设计像素高 + 大触点按钮 + 菜单宽按钮压制基类 + chip 上下两行 + 经验区入流
ok('顶栏高 122 设计像素（交互稿 ①，390 屏显示 44px）', /height: calc\(122px \* var\(--s, 1\)\)/.test(domHudSrc));
ok('顶栏按钮 105×94 大触点（62×62 旧尺寸已弃用）', /width: calc\(105px \* var\(--s,1\)\); height: calc\(94px \* var\(--s,1\)\)/.test(domHudSrc));
ok('顶栏菜单宽按钮压制 .menuBtn 基类（基类 min-width:440 会把经验区挤成 0 宽）',
  /#domHud \.hudBtn\.menuBtn \{ position: relative; width: calc\(127px \* var\(--s,1\)\); min-width: 0; padding: 0;/.test(domHudSrc));
ok('波次/击杀 chip 上下两行 + border-box（页面无全局盒模型重置，div 定尺寸必须显式声明）',
  /#domHud \.chip \{ box-sizing: border-box; display: flex; flex-direction: column;/.test(domHudSrc)
  && /min-width: calc\(122px \* var\(--s,1\)\)/.test(domHudSrc));
ok('经验区入流：xpWrap flex:1 + 等级徽章在左（不再绝对居中叠轨道）',
  /#domHud \.topbar \.xpWrap \{ flex: 1 1 auto; min-width: 0;/.test(domHudSrc)
  && /#domHud \.levelBadge \{ flex: none; box-sizing: border-box;/.test(domHudSrc));
// ② BOSS 条与波次弹报
ok('BOSS 条贴顶栏下沿 + 加宽（安全带下 139 设计像素 + 692 宽）',
  /top: calc\(var\(--safeTop\) \+ 139px \* var\(--s,1\)\)/.test(domHudSrc)
  && /width: calc\(692px \* var\(--s,1\)\)/.test(domHudSrc));
ok('波次弹报 = 主行 + 副行结构（popupMain/popupSub，居中 44%）',
  /#domHud \.popup \{ position: absolute; top: 44%;/.test(domHudSrc)
  && /#domHud \.popupMain \{/.test(domHudSrc) && /#domHud \.popupSub \{/.test(domHudSrc)
  && /popMain\.className = 'popupMain'/.test(domHudSrc) && /popSub\.className = 'popupSub'/.test(domHudSrc));
ok('弹报副行 = 本波数量（WAVE_START 第三参带上行总量）',
  /_flashPopup\(`第 \$\{wave\} 波`, count \? `本波 \$\{count\} 只` : ''\)/.test(domHudSrc)
  && /eventCenter\.emit\(GameEvent\.WAVE_START, waveNumber, table\.length, this\._currentWave\.count\)/.test(battleMgrSrc));
// H2 打断层：暂停 chip + 互斥说明 + 大标题按 --s 缩放
ok('暂停层顶部状态 chip + 三出路互斥说明（交互稿 H2 暂停面）',
  /pauseChip\.textContent = '时间轴已冻结 · 延时回调全部挂起'/.test(domHudSrc)
  && /pauseNote\.textContent = '升级三选一期间，暂停键不响应'/.test(domHudSrc)
  && /_bigLabel\('已 暂 停', 66\)/.test(domHudSrc));
ok('结算大标题按设计像素随 --s 缩放（旧实现写死 raw px，390 屏上放大近 3 倍）',
  /el\.style\.fontSize = `calc\(\$\{size\.toFixed\(0\)\}px \* var\(--s,1\)\)`/.test(domHudSrc)
  && /_bigLabel\('护 送 失 败', 84\)/.test(domHudSrc));
ok('失败标题按模式变体（副本局「副本失败」补齐）',
  /trialFloor > 0 \? '试 炼 失 败' : dungeon \? '副 本 失 败' : '护 送 失 败'/.test(domHudSrc));
ok('结算双倍广告按钮文案 = 收益金额（通关/失败分口径，交互稿口径）',
  /掉落双倍（\+\$\{amt\} 金币）/.test(domHudSrc) && /金币翻倍（\+\$\{amt\}）/.test(domHudSrc)
  && !/今日 \$\{3 - left\}\/3/.test(domHudSrc));
// H2 升级三选一：横幅两行 + 暂停 chip 锚可视区顶部（写死画布 y 在横屏裁切时飘出屏外）
ok('升级面 = 横幅「团队升级」+ 副题「点卡即选，无撤销」',
  /_makeLabel\('团 队 升 级', 0, 42\)/.test(luSrc)
  && /_makeLabel\('选择一项强化（点卡即选，无撤销）', 0, 28/.test(luSrc));
ok('升级面暂停 chip 锚可视区顶部（visH/2 - 194 设计像素）',
  /view\.getVisibleSize\(\)\.height \/ 2 - 194/.test(luSrc));

process.exit(fail ? 1 : 0);

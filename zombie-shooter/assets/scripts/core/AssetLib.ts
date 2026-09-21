import { Rect, resources, Size, SpriteFrame, Vec2 } from 'cc';

/**
 * 美术资源库：启动时按清单异步预载 resources/textures 下的图，
 * 实体按 key 取 SpriteFrame；清单里没有（图还没出）返回 null，
 * 由调用方回退 Graphics 占位——美术可以逐张补齐，随时都能进游戏。
 */

/** 已就绪的美术清单（key 相对 textures/，如 'monsters/boar'、'ui/button/btn_play'；
 *  ui 族自 2026-09-21 起一律带类别段，见 art-spec/STYLE-SPEC.md §5 命名） */
const MANIFEST = [
    'fx/mortar',
    'fx/rifle_muzzle_flash', 'fx/rifle_grenade_explosion', 'fx/rifle_grenade_ring',
    'weapons/rifle_bullet', 'weapons/rifle_grenade',
    'weapons/sniper_bullet', 'weapons/laser_beam', 'weapons/radiation_bullet',
    'scenes/road',
    // 战斗内升级面（LevelUpPanel 用画布 Sprite 直接取帧）仍在服役的两件旧板：
    // 归档时被 check-art-manifest 的「代码引用未登记」当场拦下。要换新族得单开战斗面一轮。
    'ui/banner/banner', 'ui/panel/panel_card',
    // 主城 UI 贴图套件（页签/资源图标/宝箱沿用；r1/r2 的板类件已归档，见下方注）
    'ui/shop/chest',
    'ui/nav/nav_mall', 'ui/nav/nav_heroes', 'ui/nav/nav_battle', 'ui/nav/nav_core', 'ui/nav/nav_base',
    'ui/res/res_gold', 'ui/res/res_diamond', 'ui/res/res_stamina',
    'scenes/vehicle_tail', 'scenes/escort', 'scenes/recruit',
    // 主城五页共用的页面底（DOM `.viewport` 的 background-image，不是画布件）。
    // 一张场景图吃五个页签是刻意的：用户点第 5 条「通用性很低、页页像半成品」的解法
    // 不是给每页画一张，而是让五页站在同一个世界里（口径见 STYLE-SPEC §7.1）
    'scenes/hub_camp',
    // 旧版 UI 素材（2026-09-20 拍板弃用）已移出契约位 → art-spec/reference/legacy-keep/：
    // panel_card/banner/btn_primary/card_frame/icon_frame/panel_frame/panel_metal/banner_orange/
    // btn_gold/btn_cyan/chip_dark。不进包、不登记 MANIFEST；要用回某张就拷回本清单里同 key 的
    // 路径（ui/ 下带类别段，如 textures/ui/button/btn_play.png）再登记。
    // 2026-09-21 分类迁移：ui/ 下的件按类别落到子目录（button/panel/banner/nav/res/ico/frame/shop，
    // 另有 progress/badge 两类：进度条族 r12 已落盘三件，badge 仍只有预留 key、无在库图——
    // 名次奖牌/战力徽章自成一族，不与标题条 banner / 框件 frame 混目录），
    // ui/ 顶层不再放散图；另有 12 件「在库无宿主」的图移出包 → art-spec/reference/stock/（见其 README）。
    // 四轮素材表批量件（r4_icons 一次成型）：按钮系/头像框/标题绶带 + 商城货架/功能图标
    'ui/button/btn_play', 'ui/button/btn_confirm', 'ui/button/btn_cancel', 'ui/button/btn_close',
    'ui/frame/avatar_frame', 'ui/banner/ribbon_title',
    // 六轮素材（r6_panels）：弹层面板底板/横标题绶带/标题条
    'ui/panel/panel_main', 'ui/panel/panel_sub', 'ui/banner/ribbon_banner', 'ui/banner/bar_title',
    // 六轮素材（r6_btns）：警示/奖励 CTA 板 + 圆形小钮×2
    'ui/button/btn_danger', 'ui/button/btn_video', 'ui/button/btn_round', 'ui/button/btn_round2',
    // 六轮素材（r6_icons）：公告喇叭/奖杯
    // （同批 ico_lock 无独立图形位、同批 r6_frames/r6_badges 的铜银金头像框与七段位徽章在库无宿主，
    //  2026-09-21 分类迁移时整批移出包 → art-spec/reference/stock/，理由见 STYLE-SPEC §9 归档表）
    'ui/ico/ico_notice', 'ui/ico/ico_trophy',
    // 六轮素材（r6_frames）：白绿蓝紫品质框四档
    'ui/frame/frame_q0', 'ui/frame/frame_q1', 'ui/frame/frame_q2', 'ui/frame/frame_q3',
    'ui/shop/shop_gift', 'ui/shop/shop_chest', 'ui/shop/shop_scroll', 'ui/shop/shop_letter',
    // 功能图标（ico_achieve 同批移出包：主城无成就入口，见上）
    'ui/ico/ico_task', 'ui/ico/ico_mail', 'ui/ico/ico_setting', 'ui/ico/ico_rank',
    'characters/hero_rifle', 'characters/hero_sniper', 'characters/hero_laser', 'characters/hero_radiation',
    'characters/commander', 'characters/specialists',
    'monsters/stoneape', 'monsters/dog', 'monsters/boar', 'monsters/bear', 'monsters/eagle',
    // 怪物行走序列帧（AI 视频抽帧打包，见 tools/video_to_sheet.py；缺图回退整图/占位）
    'monsters/boar_walk', 'monsters/bear_walk', 'monsters/eagle_walk', 'monsters/stoneape_walk',
    'icons/rifle_basic', 'icons/rifle_skill', 'icons/rifle_ultimate',
    'icons/sniper_basic', 'icons/sniper_skill', 'icons/sniper_ultimate',
    'icons/laser_basic', 'icons/laser_skill', 'icons/laser_ultimate',
    'icons/radiation_basic', 'icons/radiation_skill', 'icons/radiation_ultimate',
    // ===== 美术进版采购单登记段：以下 key 全部已进 MANIFEST（图到位即预载）。
    // 还没到位的那些在下方 RESERVED_SLOTS 里有逐条判决，预载会跳过它们；
    // 本段里已经落地的行不再单独标注——对账由 tools/check-art-manifest.mjs 盯，不靠注释。
    // 战斗件与场景主题
    'monsters/dog_walk', 'scenes/vehicle_tail_damaged',
    'scenes/bg_bridge', 'scenes/bg_ruins', 'scenes/bg_steel', 'scenes/bg_gorge',
    'fx/coin_burst', 'fx/levelup_glow', 'fx/portal', 'fx/dmg_word',
    'ui/plate_wave', 'ui/skill_slot', 'ui/boss_crown',
    // 按钮系补件：特殊(紫)板 + 小圆钮族 + 主城按钮族三档（r24 表，按类别一次出齐）
    'ui/button/btn_purple', 'ui/button/btn_home', 'ui/button/btn_help', 'ui/button/btn_refresh',
    'ui/button/btn_small', 'ui/button/btn_side', 'ui/button/btn_row',
    // 容器底板族（r31 表，一张 3列2行出 7 件）：底部主导航两态 / 二级分类页签 / 战斗 HUD 功能钮 /
    // 装备六槽 / 基地建筑卡 / 行动模式入口卡。这一族补的是表面普查里最后几块「整页零九宫格」的面。
    'ui/nav/tab_plate', 'ui/nav/tab_plate_on', 'ui/tab/seg_plate', 'ui/button/btn_hud',
    'ui/panel/eq_slot', 'ui/panel/building_card', 'ui/panel/entry_card',
    // 二级页签族（商城货架 4 签 / 背包分类 4 签共用；tab_core 至今没有宿主，理由见 RESERVED_SLOTS 注）
    'ui/ico/tab_hero', 'ui/ico/tab_equip', 'ui/ico/tab_gem', 'ui/ico/tab_mat', 'ui/ico/tab_core', 'ui/ico/tab_potion',
    // 功能入口图标族（主城侧栏 + 英雄养成 + 商城 + HUD + 设置/登录）
    // ico_skill 已撤键：技能这一族按用户明令「除技能外不换」保留 emoji，键留着就是永远填不满的洞
    'ui/ico/ico_add', 'ui/ico/ico_signin', 'ui/ico/ico_trial', 'ui/ico/ico_endless',
    'ui/ico/ico_core', 'ui/ico/ico_weapon', 'ui/ico/ico_starup', 'ui/ico/ico_talent',
    'ui/ico/ico_recruit', 'ui/ico/ico_forge', 'ui/ico/ico_ad',
    'ui/ico/ico_pause', 'ui/ico/ico_stats', 'ui/ico/ico_undo', 'ui/ico/ico_del',
    'ui/ico/ico_empty', 'ui/ico/ico_sound', 'ui/ico/ico_mute', 'ui/ico/ico_info',
    'ui/ico/ico_warn', 'ui/ico/ico_slider', 'ui/ico/ico_friend', 'ui/ico/ico_search',
    // 状态与属性图标族（精英词缀 + 装备词缀共用，见 UiPlate.STATUS_TEX）
    // status_ice / status_poison 留单：图合格但全工程没有冰冻/中毒机制（无 DoT 系统），切片件在 stock/ico/
    'icons/status_shield', 'icons/status_sword', 'icons/status_heart', 'icons/status_skull',
    'icons/status_fire', 'icons/status_bolt', 'icons/status_lock', 'icons/status_search',
    'icons/status_ice', 'icons/status_poison',
    // 材料与宝石图标族（商城货柜 / 背包装备）
    'icons/mat_stone', 'icons/mat_alloy', 'icons/mat_core',
    'icons/gem_fire', 'icons/gem_wind', 'icons/gem_ice', 'icons/gem_thunder',
    // 扩展资源与进度件
    'ui/res/res_frag', 'ui/res/res_medal', 'ui/res/res_energy', 'ui/res/res_ticket',
    'ui/progress/bar_track', 'ui/progress/bar_fill_green', 'ui/progress/bar_fill_yellow', 'ui/progress/bar_fill_blue', 'ui/progress/bar_fill_red',
    // 框徽角标补件（升星/等级/折扣/节点/战力/名次奖牌）
    'ui/star_on', 'ui/star_off', 'ui/lvtag', 'ui/tag_free', 'ui/tag_sale', 'ui/tag_hot',
    'ui/node_done', 'ui/node_next', 'ui/node_lock', 'ui/badge/power_badge',
    'ui/badge/medal1', 'ui/badge/medal2', 'ui/badge/medal3', 'ui/panel/row_card', 'ui/panel/panel_mini',
    // 护送关卡卡载具
    'icons/vehicle_truck', 'icons/vehicle_ship', 'icons/vehicle_hauler',
];

/**
 * 预留槽位：MANIFEST 已登记、文件未到位（缺图自动回退 emoji/占位，图到位即生效）。
 * 这一份就是「美术进版采购单」的机器可读形态：登记即有宿主与用途说明，
 * 图落地后必须把该 key 从本表删除（`tools/check-art-manifest.mjs` 会盯过时声明）。
 * 预载阶段跳过本表 key，避免为不存在的图白发请求。
 *
 * ⚠ 2026-09-21 全量核实 + 之后按类别整批进版：**本表剩下的键里，多数写的「宿主」其实不存在**
 * （只有一条 CSS 规则、没有任何一行代码建这个元素，与 `.chTabs`/`.lbRank` 同一失效模式）。
 * 条数不写在这里（写死必过期，本表实测即真源）。
 * 逐条判决（谁能出图、谁要先改 DOM、谁该撤键）见 `art-spec/STYLE-SPEC.md` §9
 * 「采购单宿主全量核实」。**出图前先查那张表，别照本行的描述施工。**
 */
export const RESERVED_SLOTS: Record<string, string> = {
    // —— 弹道与战斗件 ——（sniper_bullet / radiation_bullet / dog_walk / vehicle_tail_damaged
    // 2026-09-21 已出图并接线，声明移出本表：两枚弹体由 `HeroCombat` 的 visualKey 取用（缺图时回退
    // `Graphics` 画的程序化弹体）；丧犬走帧由 `Enemy._tryApplyArt` 优先取序列帧、**零代码改动**
    // （walk 默认就是 6 帧，其余四怪在 `ANIM_FRAME_COUNT` 里显式记 12——将来重出 12 帧要记得补那一行）；
    // 车尾受损态由 `Vehicle._syncDamageArt` 在耐久进 0.25 档时与完好态互换（与 HUD 条的 .danger 同门槛）。
    // 下面这 5 件曾经**不是缺图，是缺表现代码**（全工程 grep 连拼 key 的地方都没有），
    // 2026-09-21 逐条把表现代码建起来后移出本表，判决与落点见 STYLE-SPEC §9「战斗表现件」：
    // laser_beam → `HeroCombat._drawBeamArt` 叠在程序化三层束之上；coin_burst → DomHud 通关结算
    // 金币芯片后的 `.clBurst`；levelup_glow → `LevelUpPanel` 选卡三张背后的光柱；
    // dmg_word → `DamageNumber._syncBackdrop` 暴击底纹；portal → `BattleManager._spawnPortal`
    // 侧翼切入点的门（顶部下压那 70% 不放门）。
    // （关卡主题背景 4 件已于 2026-09-21 结清：`StageInfo.backdrop` 按关登记 + `_applyRoadArt` 按本关取图，
    //  键同时从 forest/beach/snow/cave 改名为 bridge/ruins/steel/gorge——旧名对不上任何一关的真名，
    //  那两张对不上的图永远没人读；这四个键从来没有文件也从来没有引用，改名零代价。）
    // —— 战斗 UI 件 ——（plate_wave 波次牌底 / skill_slot 技能槽底托 / boss_crown 首领徽
    // 2026-09-21 已出图并接线，声明移出本表：前两件一个贴 HUD 的 .waveChip、一个垫画布层技能图标，
    // 第三件是 .bossName 前面那枚从随文 emoji 拆出来的皇冠。r27 表一次出齐。）
    // —— 按钮系 ——（btn_purple 与小按钮 / 侧栏入口 / 列表行三档 2026-09-21 已出图，
    // 由 UiPlate.CITY_BUTTON_PLATE 整族铺板，声明移出本表）
    // 三枚小圆钮仍留单：主页与刷新这两个动作在界面上还没有落点（要建功能才有位置），
    // 而「帮助 ?」同位已经由 btn_round2 接在 .popMeta .q 上，属于同位重复。
    'ui/button/btn_home': '小圆钮·主页（还没有主页键落点）', 'ui/button/btn_help': '小圆钮·帮助 ?（同位已有 btn_round2）', 'ui/button/btn_refresh': '小圆钮·刷新 ↻（还没有刷新动作落点）',
    // —— 二级页签 ——（tab_hero/equip/gem/mat/potion 五件 2026-09-20 已出图并接线，声明移出本表）
    // tab_core：图 2026-09-20 已出且合格（r13 表第 5 格，反应堆芯），但**这个页签还没有**——
    // 规范原先写的宿主 `.chTabs` 是死样式（护送页早已改成「章节头 + 左右翻页箭头」，全工程无一处建 DOM），
    // 背包第四签的真实分类是「道具」而非「核心」。同轮用户拍板「核心页签功能我后面做」，所以本行与
    // MANIFEST 那行都保留；切片件存在 `art-spec/reference/stock/ico/tab_core.png`（gen-output 被 gitignore
    // 且定期可清，不能当长期存放处）。界面建好当天把 png 拷回 `assets/resources/textures/ui/ico/` 并删掉本行。
    'ui/ico/tab_core': '页签·核心（图已出并归档 stock/ico/，等核心分类页签建起来）',
    // —— 功能入口图标 ——（图标三批共 19 件已出图并接线，预留声明已移出本表：
    // 第一批 ico_add / ico_signin / ico_trial / ico_endless / ico_core / ico_weapon / ico_starup /
    // ico_talent / ico_recruit / ico_forge / ico_del / ico_warn；第二批 ico_ad / ico_slider /
    // ico_pause / ico_stats；第三批（拆行接线轮）ico_sound / ico_mute / ico_info）
    // 另有 7 个键撤掉（图出了，但没有该上图的位置，逐条见 STYLE-SPEC §9）：
    // ico_more（详情 › 链尾）与 ico_check（勾选/选中态）是随文变色、随文基线的小状态符，该留作字符
    // ——128px 位图缩到 10~14px 只会更糊；ico_calendar 与 ico_signin 是同一个键、ico_shop 的底部商店
    // 页签已由 nav_mall 上图、ico_inbox 的邮箱入口已由 ico_mail 上图，都是同位重复；ico_codex（图鉴）
    // 与 ico_loot（补给箱）经拍板保留当代在库件 shop_scroll / chest / shop_chest，不换。
    // 2026-09-21 图标类整批进版：ico_empty / ico_friend / ico_search 三件出图并接线，声明移出本表——
    // empty 改成 `_popEmpty` 的默认件（原来 15 个调用点全部显式传图，默认分支没人走），
    // friend 是这一轮新建的行动页页脚入口（功能未开放但弹窗有说明有出路），
    // search 是这一轮新建的背包检索框。只有 ico_undo 仍留单：全工程没有可撤销的动作，
    // 造一个「撤销」键点下去无事发生就是死键，方案与判据见 STYLE-SPEC §9。
    'ui/ico/ico_undo': '撤销 ↩（现有 ↩ 是返回键；全工程暂无可撤销操作）',
    // —— 状态与属性 ——（精英词缀 + 装备词缀共用 UiPlate.STATUS_TEX 一张表，八件 2026-09-21 已出图接线）
    // 这两件图合格但没有对应的游戏机制：战斗里没有冰冻/中毒这类持续伤害，挂上去就是假宿主。
    // 切片件在 art-spec/reference/stock/ico/，等异常状态机制上线拷回 textures/icons/ 并删掉本两行。
    'icons/status_ice': '状态·冰冻（无冰冻机制，图在 stock/ico/）',
    'icons/status_poison': '状态·中毒（无中毒机制，图在 stock/ico/）',
    // —— 材料与宝石 ——（mat_stone/alloy/core + gem_fire/wind/ice/thunder 七件 2026-09-21 已出图并
    // 接背包格 .bcell 与商城货卡 .gIc，声明移出本表；同批 r19 表多画的第 8 格（琥珀雷宝石）是模型
    // 自己填的，不在采购单上，丢弃。注意这七件必须用 `--tol 95` 切：绿宝石的亮绿漩涡撞上默认 tol=60
    // 会被当背景抠穿，见 STYLE-SPEC §8 坑。同族的 mat_blueprint（图纸）没有对应槽位，继续走 emoji——
    // 挂图前由 AssetLib.hasArt 挡掉，不会进预载清单。）
    // —— 扩展资源与进度条 ——
    // res_frag（英雄碎片）2026-09-21 已出图并接升星弹窗的碎片说明行（_popAttr.iconTex），声明移出本表。
    // 下面三件**不出图**：本作资源表只有 gold/diamond/stamina + 四英雄 shard_*，
    // 勋章没有成就/军团玩法，能量与体力是同一个东西（同位重复），招募券的「每日免费一次」是额度不是库存
    // ——凭空挂进顶栏就是三个永远为 0 的假数字，按「无死键」红线整批不排产（判据见 STYLE-SPEC §9）。
    'ui/res/res_medal': '资源·勋章（无勋章玩法，挂上去就是恒为 0 的假数字）',
    'ui/res/res_energy': '资源·能量（与体力同位重复，顶栏已有 res_stamina）', 'ui/res/res_ticket': '资源·招募券（免费招募是每日额度不是库存）',
    // 进度条一族已整套出采购单：r12 表的底槽 + 绿/黄/蓝/红四色填充全部落盘接线
    // （HUD 三条底槽与蓝/红填充；主城四条加粗到 12px 后接绿/黄/蓝，见 STYLE-SPEC §9）。
    // 另 bar_cap / bar_node 两个键随批撤掉：底槽件自带圆头端点，节点另有 node_done/next/lock 三件。
    // —— 框徽角标 ——
    // 评价星两件（star_on/off）与天赋节点三态（node_done/next/lock）2026-09-21 已出图并接线：
    // 星走 HomeUiMall._starRow（原来是一串 '★'.repeat() 文本，文本星贴不了图），
    // 节点走 _popGrid 新增的 tex 槽（未解锁=锁、点满=绿、可点=蓝）。逐条判据见 STYLE-SPEC §9。
    // 下面这五件 r25 表已出且合格（平整牌面、无镂空），但**宿主形状对不上**：出图前只核了「宿主在不在」，
    // 没核「宿主是什么轮廓」——五件都是方形/六角/星芒的**徽章**，而宿主是 21~34×13~18 的**扁角标**
    // 与 27px 高的整宽胶囊。硬贴要么把徽章压成饼、要么盖住文字。切片件全部归档
    // `art-spec/reference/stock/badge/`，等宿主改尺寸/改形状那天拷回即生效。
    'ui/lvtag': '等级角标（.lvtag 实测 21~34×13~18px，徽章形状放不下）', 'ui/tag_free': '角标·免费（.gTagTop 死样式，无建点）',
    'ui/tag_sale': '角标·折扣（.gTagTop 死样式，无建点）', 'ui/tag_hot': '角标·HOT（.gHot 是 99px 圆角胶囊，非徽章形）',
    // 名次奖牌三件（medal1/2/3）2026-09-20 已出图并接 HUD 伤害统计 `.statRank`，声明移出本表；
    // 排行榜弹窗那处按「随文小符号不出图」判死，理由见 STYLE-SPEC §9 名次奖牌行。
    'ui/badge/power_badge': '战力徽章底（宿主 .powerBadge 是 27px 高整宽胶囊，徽章形塞不进；要接得先在胶囊左端开一个 27px 方图位）',
    // row_card（列表行卡底板）2026-09-21 已出图并接商城货卡 `.good.panel`（两处）与 HUD 邮件行
    // `.mailRow.panel`，声明移出本表。
    // panel_mini（模块小框底板）：图合格（r16 表，金属包边 + 四角铆钉 + 平整内芯），**但没有活宿主**——
    // `.mbox` 全工程只有两个建点（HomeUiCore 的 `_openSheet` / `_openResult`），而这两个方法**零调用点**：
    // 它们是「全部二级界面已迁新弹层」那条迁移棘轮的桩子（`check-ux-refactor` 断言调用点必须为 0、
    // `check-ux-layout-bundle` 断言方法还在包里），删不得也用不上。整条 `.mbox/mHead/mClose/mSub/mRow`
    // 样式族同属那一代遗留。切片件归档 `art-spec/reference/stock/panel/`，键留本表。
    // ⚠ 教训：**死方法里的引用不算宿主**——`check-art-manifest` 的「在库件必须有归宿」只扫代码引用，
    // 在这两处加一行就会绿灯，图却永远上不了屏。核宿主要核「谁调用这个建点」，不是「哪里提到这个 key」。
    'ui/panel/panel_mini': '模块小框底板（唯一建点 _openSheet/_openResult 零调用，是迁移棘轮的桩子）',
    // —— 护送关卡载具 ——（三件 2026-09-21 已出图并接章节头载具牌，声明移出本表）
    // 宿主是 HomeUiStage 章节头左端那一枚（CHAPTER_THEMES[].veh → UiPlate.VEHICLE_TEX 字形对 key）；
    // 选这里而不是场景里那块 .veh，是因为浅色（手机）主题把 .veh 连同 road/dash/mobs 一起 display:none，
    // 手机上原本根本看不见本章护送什么车。
};

export class AssetLib {
    private static _frames = new Map<string, SpriteFrame>();
    private static _started = false;
    private static _mortar: SpriteFrame[] | null = null;
    /** 动作序列帧缓存（key = '<id>:<action>'） */
    private static _animSheets = new Map<string, SpriteFrame[]>();

    /** 各怪各动作的帧数（打包脚本产出；缺省：walk 6 / attack、die 8） */
    private static readonly ANIM_FRAME_COUNT: Record<string, number> = {
        'boar:walk': 12, 'bear:walk': 12, 'eagle:walk': 12, 'stoneape:walk': 12,
    };

    /** 怪物动作序列帧：monsters/<id>_<action> 横向等分切片（video_to_sheet.py / slice_walk_sheet.py 打包）。
     *  未就绪返回 null（调用方逐帧轮询，就绪后缓存切片） */
    static monsterFrames(id: string, action: 'walk' | 'attack' | 'die'): SpriteFrame[] | null {
        const key = `${id}:${action}`;
        const cached = this._animSheets.get(key);
        if (cached) {
            return cached;
        }
        const sheet = this.frame(`monsters/${id}_${action}`);
        if (!sheet?.texture) {
            return null;
        }
        const n = this.ANIM_FRAME_COUNT[key] ?? (action === 'walk' ? 6 : 8);
        const base = sheet.rect;
        const cw = base.width / n;
        const out: SpriteFrame[] = [];
        for (let i = 0; i < n; i++) {
            const f = new SpriteFrame();
            f.texture = sheet.texture;
            f.rect = new Rect(base.x + i * cw, base.y, cw, base.height);
            f.originalSize = new Size(cw, base.height);
            f.offset = new Vec2(0, 0);
            f.packable = false;
            out.push(f);
        }
        this._animSheets.set(key, out);
        return out;
    }

    /** 怪物行走序列帧（兼容旧调用） */
    static monsterWalkFrames(id: string): SpriteFrame[] | null {
        return this.monsterFrames(id, 'walk');
    }

    /** Shared untrimmed atlas slices; retained with the application-wide resource cache. */
    static mortarFrames(): SpriteFrame[] | null {
        if (this._mortar) return this._mortar;
        const atlas = this.frame('fx/mortar');
        if (!atlas?.texture || atlas.texture.width !== 512 || atlas.texture.height !== 512) return null;
        this._mortar = [];
        for (let i = 0; i < 16; i++) {
            const frame = new SpriteFrame();
            frame.texture = atlas.texture;
            frame.rect = new Rect((i % 4) * 128, Math.floor(i / 4) * 128, 128, 128);
            frame.originalSize = new Size(128, 128);
            frame.offset = new Vec2(0, 0);
            frame.packable = false;
            this._mortar.push(frame);
        }
        return this._mortar;
    }

    /** 启动时调用一次；加载失败/缺图只跳过，不阻断游戏启动 */
    static preload(): void {
        if (this._started) {
            return;
        }
        this._started = true;
        for (const key of MANIFEST) {
            // 预留槽位（图还没出）不白发请求；图落地并从 RESERVED_SLOTS 删除后自动进预载
            if (RESERVED_SLOTS[key]) {
                continue;
            }
            resources.load(`textures/${key}/spriteFrame`, SpriteFrame, (err, frame) => {
                if (!err && frame) {
                    this._frames.set(key, frame);
                }
            });
        }
    }

    /** 取已预载的 SpriteFrame；未就绪/清单没有则 null */
    static frame(key: string): SpriteFrame | null {
        return this._frames.get(key) ?? null;
    }
}

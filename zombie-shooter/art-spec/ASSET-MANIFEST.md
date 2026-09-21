# 资源槽位清单（ASSET-MANIFEST）

**契约**：key = 相对 `assets/resources/textures/` 的路径（不含扩展名）。**换图不换 key**——同名覆盖即全游戏生效。三个入口必须一致，`node tools/check-art-manifest.mjs` 负责对账：

1. 磁盘文件 `assets/resources/textures/<key>.png`；
2. 预载清单 `assets/scripts/core/AssetLib.ts` 的 `MANIFEST`；
3. 代码引用 `AssetLib.frame('<key>')` / `_tex('<key>')` 字面量。

清单里暂无文件的 key 属「预留槽位」（缺图回退占位，图到位即生效）——这正是逐张补图、随时可进的机制。风格与尺寸要求见 [STYLE-SPEC.md](./STYLE-SPEC.md)。

## A. 在库槽位（107 张图，png/jpg；r1/r2 旧版 9 件 + 2026-09-21 无宿主的 12 件已归档，均见 §E）

| key | 用途 | 现尺寸 | 状态 |
|---|---|---|---|
| characters/hero_rifle · hero_sniper · hero_laser · hero_radiation | 四英雄立绘 | 225~321×512~640 | 已有 |
| characters/commander / specialists | 指挥官头像 / 特遣队 | 848×1264 / 1264×848 | 已有 |
| monsters/boar · dog · bear · eagle · stoneape | 怪物单图 | 152~384 见方 | 已有 |
| monsters/boar_walk · bear_walk · eagle_walk · stoneape_walk | 行走序列（12 帧横排×256） | 2916~3156×256 | 已有 |
| icons/{rifle,sniper,laser,radiation}_{basic,skill,ultimate} | 技能三连图标 | 512×512 | 已有（风格待换肤） |
| weapons/rifle_bullet / rifle_grenade | 步枪子弹 / 榴弹 | 23×128 / 52×128 | 已有 |
| fx/mortar | 迫击炮 16 格序列 | 512×512 | 已有 |
| fx/rifle_muzzle_flash · rifle_grenade_explosion · rifle_grenade_ring | 枪口焰/爆爆/冲击环 | 198~512 | 已有 |
| fx/levelup_glow · fx/dmg_word · fx/portal · fx/coin_burst + weapons/laser_beam | 战斗表现件五件：升级光柱 / 暴击飘字底纹 / 侧翼切入传送门 / 通关结算金币爆开 / 激光英雄光束 | 133×912 ~ 1058×153 | 已有（r34 表 + r34b 补光柱。这五件缺的一直不是图而是**表现代码**，代码 2026-09-21 逐条建起来：光柱在选卡三张背后、底纹是飘字的前一个兄弟节点、门只给侧翼切入那 30%、爆开垫在结算「+N」后面且中心钉在芯片 26% 高、光束叠在程序化三层束之上。逐件的落点、尺寸算法与"为什么这个位置不放"见 §9 与 ART-PLAN §2.1 二十七轮） |
| scenes/vehicle_tail | 车尾（战斗下半屏） | 2160×540 | 已有 |
| scenes/road | 战斗路面底图 | 720×1280 | 已有 |
| scenes/escort | 护送页/商城场景图 | 848×1264 | 已有（本轮修复：曾被代码引用但未登记，静默占位） |
| scenes/recruit | 商城「英雄招募」主推卡立绘位（`HomeUiMall` 的 `.offer-art`，与旁边礼包卡同一骨架） | 1024×1536 | 已有（r32 表：图生图自 `scenes/escort` 定实拍质感，prompt 里点名"构图重心偏右、左侧留暗呼吸区"，因为那一侧要叠标题；emoji 只在照片到位那一刻摘除，缺图回退照旧） |
| scenes/bg_bridge · bg_ruins · bg_steel · bg_gorge | 战斗底图按章切换（第 2/3/4/5 关；第 1 关「末日公路」仍用 `scenes/road`，不重复登记）。登记处是 `StageInfo.backdrop`，消费在 `BattleManager._applyRoadArt` | 720×1280（与 road 同比） | 已有（r33 表：四张各自以 `scenes/road.jpg` 图生图锁机位；出图口径=正俯视、道路纵向居中占宽六成、上下两端不得有横向通栏特征，因为要上下镜像循环滚动；`tools/land_bg.py` 裁对齐并压 JPG 对齐 road 的体积口径） |
| ui/shop/chest | 宝箱 | 256 见方 | 已有 |
| ui/nav/nav_mall · nav_heroes · nav_battle · nav_core · nav_base | 底部导航 5 键（r3 素材表） | 128×128 | 已有 |
| ui/res/res_gold · res_diamond · res_stamina | 资源图标 3 枚（r3 素材表） | 128×128 | 已有 |
| ui/panel/panel_main · panel_sub | 弹层九宫格底板两档（M/L 与 S） | 512×512 | 已有，已上屏 |
| ui/banner/ribbon_banner · bar_title · ribbon_title | 横幅绶带 / 细标题条 / 备用绶带 | 512 级 | 前两件已上屏，`ribbon_title` 待宿主 |
| ui/button/btn_play · btn_confirm · btn_cancel · btn_close · btn_danger · btn_video · btn_round · btn_round2 | 按钮板八件（弹层 CTA / 主城键 + 小圆钮） | 256~384 | 已上屏（purple/薄板档见 §9） |
| ui/frame/avatar_frame · frame_q0 · frame_q1 · frame_q2 · frame_q3 | 头像框 + 品质框四档 | 256~512 | 已上屏（名片行 / `.popQ .qi`） |
| ui/ico/ico_trophy | 奖杯（侧栏排行 + 玩法页排行榜） | 128 | 已上屏 |
| ~~ui/frame_bronze · frame_silver · frame_gold · rank1~rank7 · ico_lock · ico_achieve~~ | 三档头像框 + 段位徽章七档 + 两件功能图标（共 12 件） | 128~512 | **2026-09-21 移出包** → `art-spec/reference/stock/`（在库无宿主的件不占包体，见 §E） |
| ui/ico/ico_mail · ico_notice · ico_setting · ico_task · ico_rank | 功能图标 5 枚 | 128 | 已上屏（rank 作 popEmpty 空态图） |
| ui/ico/ 图标三批共 19 件：第一批 ico_add · signin · trial · endless · core · weapon · starup · talent · recruit · forge · del · warn<br>第二批 ico_ad · slider · pause · stats<br>拆行轮 ico_sound · mute · info | 主城功能入口图标（顶栏加号 / 侧栏三键 / 英雄页四键 / 确认弹窗两键 / 商城看广告键 / 设置音量与音效 / HUD 暂停、伤害统计与设置浮窗三个小节头） | 128 | 已上屏，宿主与切片口径见 §9；同批出图又撤键的 7 件（more · check · calendar · shop · inbox · codex · loot）与仍留采购单的 3 件（friend · undo · search，缺的是功能位不是图）见 ART-PLAN §2.1 |
| ui/shop/shop_gift · shop_chest · shop_scroll · shop_letter | 礼盒 / 宝箱 / 卷轴 / 信件 | 256 | 前三已上屏，letter 作空态图 |
| ui/progress/bar_track · bar_fill_blue · bar_fill_green · bar_fill_yellow · bar_fill_red | 进度条底槽（内凹暗槽带圆头）+ 蓝/绿/黄/红四档填充色带 | 512×64 | 五件整套已上屏：底槽贴 HUD 四条（`.xpBar/.vehTrack/.bossTrack/.statBar` 走 `bar` 档）与主城三条（`.expbar` 10px、`.pbar` 与 `.popAct .bar` 12px，走 `barThin` 档）；填充蓝＝顶栏经验与 HUD 经验、绿＝弹层行进度、黄＝弹层活跃/保底、红＝boss 血条。载具条与伤害占比条按拍板只贴底槽，抽卡保底条退回 6px 不贴，理由见 §9 |
| ui/ico/tab_hero · tab_equip · tab_gem · tab_mat · tab_potion | 二级页签图标（r13 素材表）：英雄半身 / 步枪 / 蓝钻 / 铝锭木料石 / 医疗包 | 128×128 | 五件已上屏，吃下 7 个位置——商城 `.shopTabs` 四签 + 背包 `.bagTabs` 四签，装备/宝石/材料三签两处共用同件；图标位是 `span.ticon`，20px ×层缩放归 CSS。**同批出的 `tab_core`（反应堆芯）没落盘**：规范里那个「章节 `.chTabs`」宿主是死样式、背包第四签真名是「道具」，键留在采购单，判决见 §9 与 ART-PLAN §2.1 |
| ui/badge/medal1 · medal2 · medal3 | 名次奖牌金/银/铜（r14 素材表）：骷髅双翼环，环心留空 | 192×192 | 三件已上屏，宿主只有一处＝战斗 HUD 伤害统计 `.statRank.rank1/2/3`；环心留给名次数字，数字墨色跟着金属档走。排行榜弹窗那格（`.popRow .tag`）实测只有 10~26px、属随文小符号，判死不贴图；`.lbRank` 一族是死样式。见 §9 |

> **r1/r2 旧版 UI 板类件 11 件已归档**到 `art-spec/reference/legacy-keep/`（2026-09-20 拍板弃用，
> 清单与「拷回即复活」的做法见该目录 README.md），不再登记在 MANIFEST、不进包。

> **接线状态不在本表维护**：A 表按轮次增量记录「key ↔ 用途 ↔ 尺寸」；某件是否已上屏、宿主是哪个
> CSS class、切片参数是多少，一律看 [STYLE-SPEC.md §9 通用件契约表](./STYLE-SPEC.md)
> （与 `assets/scripts/ui/UiPlate.ts` 逐 key 相互断言）。r5/r6 批次件（panel_main/panel_sub、
> ribbon_banner、bar_title、btn_play/confirm/cancel/close/danger/video/round、ico_notice/trophy、
> avatar_frame、ribbon_title、frame_q0-q3）已在库并按类别归位，按 §9 取用；同批的
> ico_lock、frame_bronze/silver/gold、rank1-7 因无宿主已于 2026-09-21 移出包（见 §E）。

## B. 预留槽位 = 机器可读采购单（条数以 `AssetLib.RESERVED_SLOTS` 实测为准）

**唯一真源在代码**：`assets/scripts/core/AssetLib.ts` 的 `RESERVED_SLOTS`（key → 用途与宿主注记）。
登记进 `MANIFEST` 且写进 `RESERVED_SLOTS` 即为合法预留：预载阶段跳过（不白发请求）、
UI 走 glyph/CSS 回退、图落地后**必须从 `RESERVED_SLOTS` 删掉该行**，checker 会盯过时声明。

分类计数（**本表只做导航，件数以 `node tools/check-art-manifest.mjs` 报的 RESERVED_SLOTS 实测为准**；
2026-09-21 收过一次表：此前每轮落盘只删 `RESERVED_SLOTS` 那行、忘了同步这里，导致整表普遍虚高）：

| 族 | 还差几件 | 具体是哪几个 key、为什么还挂着 | 对应 ART-PLAN 批次 |
|---|---|---|---|
| `ui/ico/ico_*` | 1 | `ico_undo`——全工程没有任何可撤销的动作，造一个「撤销」键点下去无事发生就是死键 | 批3 |
| `icons/status_*` | 2 | `status_ice` `status_poison`——图合格，但本作没有冰冻/中毒机制（无 DoT 系统），切片件在 `stock/ico/` | 批4 |
| `ui/ico/tab_*` | 1 | `tab_core`——图合格，缺的是「核心」这个分类页签本身（用户拍板后面做），件归档 `stock/ico/` | 批1 追加 |
| `ui/button/btn_*` | 1 | `btn_home`——主页与刷新两个动作在界面上还没有落点（`btn_help` 同位已有 `btn_round2`、`btn_refresh` 无动作，两键已撤） | 批2 |
| `ui/res/res_*` | 2 | `res_medal` `res_energy`——本作资源表只有 gold/diamond/stamina + shard_*，勋章没有成就/军团玩法，能量与体力同位重复，挂上顶栏就是恒为 0 的假数字 | 批5 |
| `ui/tag_*` + `ui/lvtag` + `ui/badge/power_badge` | 3 | `lvtag` `tag_sale` `power_badge`——图合格但**宿主形状放不下**（宿主是又扁又窄的角标与整宽胶囊，出的是方形/六角/星徽章），件归档 `stock/badge/`，判据见 §9 | 批0 追加 |
| `ui/panel/panel_mini` | 1 | 图合格但不落盘：唯一建它的两个方法是零调用点的迁移桩子（死方法里的引用不算宿主），判据见 §9 | 批1 |

> **已经清零的族不再列行**（进度条族、天赋节点三态、名次奖牌、评价星、材料与宝石图标、章节载具、
> 关卡主题背景 + 车尾受损态、特效与战斗 UI 件、三英雄弹道 + 丧犬走帧、导航格 / 二级页签 / HUD 功能钮 /
> 装备槽 / 建筑卡 / 入口卡 / 行卡底板）——它们的落点、尺寸口径与判决全部在 §A 与 §9，
> 批次史在 ART-PLAN §2.1。留 0 件的行只会让下一轮误判「这族还没做」。

> **2026-09-21 分类迁移**：`ui/` 的预留 key 已按在库件同一套类别加上中间一段（`ui/ico/`、`ui/button/`、
> `ui/banner/`、`ui/frame/`、`ui/res/`、`ui/nav/`、`ui/panel/`、`ui/progress/`、`ui/badge/`），将来切片落盘才落对位置
> （进度条族独立成 `ui/progress/`、奖牌与战力徽章独立成 `ui/badge/`，不与标题条/框件混目录）。
> 表里 `ui/tag_*` / `ui/lvtag` / `ui/node_*` / `ui/star_on|off` / `ui/plate_wave` / `ui/skill_slot` /
> `ui/boss_crown` 仍留 `ui/` 顶层——这一轮给的类别表没覆盖这几族，**归属待拍板**（ART-PLAN 待办）。

## C. 进版分类清单（按 UI 分类，一次一表）

> 顺序 = 建议开工顺序：先接线（零生图），再补弹道（代码已就绪），最后按族生图。

1. **导航与页签**：主导航 5 签 ✅；二级页签 6 件（英雄/装备/宝石/材料/核心/耗材）✗。
2. **功能入口图标**：✅ 已上屏 ico_mail/notice/setting + **P0 接线轮新接：ico_task（侧栏任务）、
   ico_trophy（侧栏排行 + 玩法页排行榜）、shop_scroll（图鉴 + 怪物图鉴）、shop_gift（侧栏礼包）、
   shop_chest（商城每日免费补给）**；ico_rank/shop_letter 只作 popEmpty 空态图；
   原「在库无归宿」的 ico_achieve/ico_lock 已于 2026-09-21 移出包（无图形位，见 §E）；
   待生图：加号、签到、试炼、无尽、核心、武器、技能、升星、天赋、招募、锻造、广告▶、详情›、
   暂停、统计、撤销、补给、删除、收件、空态、音量、静音、关于、警告、滑杆、勾选、好友、日历、商店、放大镜 ✗。
3. **状态与属性图标**：盾/剑/心/骷髅/火/冰/电/毒/锁/侦查 + 天赋节点三态 ✗（批4）。
4. **内容与资源图标**：材料 3 + 宝石 4 + 扩展资源 4 + 载具 3 + 评价星 2 + 名次奖牌 3 ✗。
5. **按钮**：六色语义板 5 色已接 ✅（紫板 ✗）；小圆钮 close/round ✅、**round2 ✅（P0 接帮助 ? 钮）**、
   home/help/refresh ✗；主城键只允许 `.btn.big` 走 `CITY_PLATE`（解锁大键已接），`.hero-quick` 五入与
   `.gBuy` 小胶囊实测贴 `plate` 会压字，已撤板等 `bar` 薄板档（见 STYLE-SPEC §9 薄板档）。
6. **面板与底板**：pop 底板两档 ✅、标题条/绶带 ✅、ribbon_title 📦（待宿主）；行卡底板、模块小框 ✗；
   小尺寸键（`.gBuy` 一类的薄板档）待 §9 定 `bar` 档后才能贴。
7. **框·徽·角标**：品质框 frame_q0-q3 ✅（接 `.popQ .qi`）；**头像框 avatar_frame ✅（P0 接 `.popRow .ic`
   名片行，走 `UiPlate.frame()` 无 fill 变体）**；顶栏 43px 位仍不接（`.pAvatar > div` 有 clip-path 多边形，
   框图被裁，需先定框与切角的关系）；段位徽章 rank1-7 与铜银金头像框 frame_bronze/silver/gold 因无宿主
   （当前无段位 UI、无分档数据源）已于 2026-09-21 移出包，见 §E；等级角标/免费/折扣/HOT/战力徽章 ✗。
8. **进度条族**：底槽 + 绿/黄/蓝/红填充 + 端头 + 关卡节点，全 CSS 待贴图 ✗（批5）。
9. **战斗内容**：三英雄弹道（sniper/laser/radiation）+ 丧犬走帧 + 车尾受损态 + 主题背景 ×4 +
   飘字底/波次牌/技能槽/boss 徽 + 金币爆/升级光/传送门 ✗（批7~9）。
10. **技能图标 ×12**：一轮版在库，STYLE-SPEC 标「待换肤」，2026-09-20 用户豁免本轮不换。

## E. 归档位（弃用但不删除）

归档分两处，规矩相同（png 与 .meta 成对存放、不在 `MANIFEST`/`RESERVED_SLOTS` 里、不进包）：

### E1. `art-spec/reference/legacy-keep/` —— 风格作废的旧版板件

UI 规范与生图规范固化之前零散产出的 **9 件旧版 UI 板类件**
（panel_metal / panel_frame / card_frame / icon_frame / btn_primary / btn_gold / btn_cyan /
chip_dark / banner_orange）。

原本列入弃用清单的 `ui/banner/banner` 与 `ui/panel/panel_card` **放回在库**：战斗内升级面 `LevelUpPanel.ts:81,102`
用 `AssetLib.frame()` 直接取它们的画布帧，移出契约位后被 `check-art-manifest` 的「代码引用未登记」
当场拦下。换成现行 `ribbon_banner`/`panel_main` 族属战斗面改动，要单开一轮。

- 移出原因：2026-09-20 拍板「旧版美术不再使用」，但**不静默删除**——满意哪张随时按原名拷回
  `assets/resources/textures/<key>.png`（key 里带类别，如 `ui/button/btn_play`）
  + 在 MANIFEST 登记该行，构建后即全游戏生效（详见该目录 README.md）。

### E2. `art-spec/reference/stock/` —— 在库但无宿主的件（2026-09-21 分类迁移）

`resources/` 下的东西**整个打进包**，所以「有图但没有任何界面用它」= 白占包体。分类迁移这一轮把
12 件无宿主的图移出包，按族分子目录（原 key 一律 `ui/<名>`）：

| 子目录 | 件数 | 成员（原 key 去 `ui/` 前缀） | 为什么没宿主 |
|---|---|---|---|
| `stock/rank/` | 7 | rank1 ~ rank7 | 游戏里没有段位字段与展示位（ART-PLAN D4） |
| `stock/frame/` | 3 | frame_bronze / frame_silver / frame_gold | 分档需要段位或段位化等级数据源，现在只有单档 `ui/frame/avatar_frame` 有宿主 |
| `stock/ico/` | 2 | ico_achieve / ico_lock | 主城无成就入口；🔒 全是文案内嵌 emoji，没有独立图形位 |

与 E1 的区别：这些件**风格没问题**，缺的是要用它的界面。段位玩法、成就页、节点图形化任一开出来，
按 `stock/README.md` 的说法拷回对应类别目录并在 MANIFEST 登记即可复活。

- 归档件**不在** `MANIFEST`/`RESERVED_SLOTS` 里，也**不受** `check-art-manifest` 扫描（该检查只认
  `assets/resources/textures/` 下的文件），因此不会报孤儿、不进构建包。
- 内容件（技能图标 12 / 怪物走帧 4 / 步枪弹道与 fx / road 路面）与上面两件旧板**留用不弃**，仍按 A 表在库管理。

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
    'scenes/vehicle_tail', 'scenes/escort',
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
    // ===== 进版采购单：已登记、文件未到位的预留槽位（详见下方 RESERVED_SLOTS 与 art-spec/ASSET-MANIFEST.md §D）=====
    // 战斗件与场景主题
    'monsters/dog_walk', 'scenes/vehicle_tail_damaged',
    'scenes/bg_forest', 'scenes/bg_beach', 'scenes/bg_snow', 'scenes/bg_cave',
    'fx/coin_burst', 'fx/levelup_glow', 'fx/portal', 'fx/dmg_word',
    'ui/plate_wave', 'ui/skill_slot', 'ui/boss_crown',
    // 按钮系补件：特殊(紫)板 + 小圆钮族
    'ui/button/btn_purple', 'ui/button/btn_home', 'ui/button/btn_help', 'ui/button/btn_refresh',
    // 二级页签族（商城货架 4 签 / 背包分类 4 签共用；tab_core 至今没有宿主，理由见 RESERVED_SLOTS 注）
    'ui/ico/tab_hero', 'ui/ico/tab_equip', 'ui/ico/tab_gem', 'ui/ico/tab_mat', 'ui/ico/tab_core', 'ui/ico/tab_potion',
    // 功能入口图标族（主城侧栏 + 英雄养成 + 商城 + HUD + 设置/登录）
    'ui/ico/ico_add', 'ui/ico/ico_signin', 'ui/ico/ico_trial', 'ui/ico/ico_endless',
    'ui/ico/ico_core', 'ui/ico/ico_weapon', 'ui/ico/ico_skill', 'ui/ico/ico_starup', 'ui/ico/ico_talent',
    'ui/ico/ico_recruit', 'ui/ico/ico_forge', 'ui/ico/ico_ad',
    'ui/ico/ico_pause', 'ui/ico/ico_stats', 'ui/ico/ico_undo', 'ui/ico/ico_del',
    'ui/ico/ico_empty', 'ui/ico/ico_sound', 'ui/ico/ico_mute', 'ui/ico/ico_info',
    'ui/ico/ico_warn', 'ui/ico/ico_slider', 'ui/ico/ico_friend', 'ui/ico/ico_search',
    // 状态与属性图标族
    'icons/status_shield', 'icons/status_sword', 'icons/status_heart', 'icons/status_skull',
    'icons/status_fire', 'icons/status_ice', 'icons/status_bolt', 'icons/status_poison',
    'icons/status_lock', 'icons/status_search',
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
 * ⚠ 2026-09-21 全量核实：**本表剩下的 43 个键里有 31 个下面写的「宿主」其实不存在**
 * （只有一条 CSS 规则、没有任何一行代码建这个元素，与 `.chTabs`/`.lbRank` 同一失效模式）。
 * 逐条判决（谁能出图、谁要先改 DOM、谁该撤键）见 `art-spec/STYLE-SPEC.md` §9
 * 「采购单宿主全量核实」。**出图前先查那张表，别照本行的描述施工。**
 */
export const RESERVED_SLOTS: Record<string, string> = {
    // —— 弹道与战斗件 ——
    'weapons/sniper_bullet': '狙击弹道贴图，待弹道美术',
    'weapons/laser_beam': '激光束贴图，待弹道美术',
    'weapons/radiation_bullet': '辐射弹贴图，待弹道美术',
    'monsters/dog_walk': '丧犬 12 帧行走序列（其余四怪已到位）',
    'scenes/vehicle_tail_damaged': '车尾受损态（与 vehicle_tail 成套第二态）',
    'scenes/bg_forest': '关卡主题背景·森林', 'scenes/bg_beach': '关卡主题背景·海滩',
    'scenes/bg_snow': '关卡主题背景·雪地', 'scenes/bg_cave': '关卡主题背景·洞穴',
    'fx/coin_burst': '结算金币爆开特效', 'fx/levelup_glow': '升级光柱', 'fx/portal': '传送门',
    'fx/dmg_word': '伤害飘字底纹（3 色共用）',
    'ui/plate_wave': '战斗波次牌底', 'ui/skill_slot': '战斗技能槽底托', 'ui/boss_crown': 'boss 预警徽',
    // —— 按钮系 ——
    'ui/button/btn_purple': '特殊/紫色大按钮去字底板（UiPlate.PLATE.purple）',
    'ui/button/btn_home': '小圆钮·主页', 'ui/button/btn_help': '小圆钮·帮助 ?', 'ui/button/btn_refresh': '小圆钮·刷新 ↻',
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
    // 下面仍缺图：empty 是「14 个调用点全部显式传图，默认 📭 分支挂上去也是假宿主」，
    // friend/undo/search 是「全工程还没有对应的功能位」——逐条理由见 STYLE-SPEC §9。
    'ui/ico/ico_skill': '英雄页·技能', 'ui/ico/ico_empty': '空态图标（替 popEmpty 的 📭）',
    'ui/ico/ico_friend': '好友（全工程还没有好友位）', 'ui/ico/ico_undo': '撤销 ↩（现有 ↩ 是返回键）',
    'ui/ico/ico_search': '放大镜',
    // —— 状态与属性 ——
    'icons/status_shield': '状态·盾/护甲', 'icons/status_sword': '状态·剑/攻击',
    'icons/status_heart': '状态·心/生命', 'icons/status_skull': '状态·骷髅/致死',
    'icons/status_fire': '状态·灼烧', 'icons/status_ice': '状态·冰冻',
    'icons/status_bolt': '状态·感电', 'icons/status_poison': '状态·中毒',
    'icons/status_lock': '状态·锁定', 'icons/status_search': '状态·侦查',
    // —— 材料与宝石 ——（mat_stone/alloy/core + gem_fire/wind/ice/thunder 七件 2026-09-21 已出图并
    // 接背包格 .bcell 与商城货卡 .gIc，声明移出本表；同批 r19 表多画的第 8 格（琥珀雷宝石）是模型
    // 自己填的，不在采购单上，丢弃。注意这七件必须用 `--tol 95` 切：绿宝石的亮绿漩涡撞上默认 tol=60
    // 会被当背景抠穿，见 STYLE-SPEC §8 坑。同族的 mat_blueprint（图纸）没有对应槽位，继续走 emoji——
    // 挂图前由 AssetLib.hasArt 挡掉，不会进预载清单。）
    // —— 扩展资源与进度条 ——
    'ui/res/res_frag': '资源·英雄碎片', 'ui/res/res_medal': '资源·勋章',
    'ui/res/res_energy': '资源·能量', 'ui/res/res_ticket': '资源·招募券',
    // 进度条一族已整套出采购单：r12 表的底槽 + 绿/黄/蓝/红四色填充全部落盘接线
    // （HUD 三条底槽与蓝/红填充；主城四条加粗到 12px 后接绿/黄/蓝，见 STYLE-SPEC §9）。
    // 另 bar_cap / bar_node 两个键随批撤掉：底槽件自带圆头端点，节点另有 node_done/next/lock 三件。
    // —— 框徽角标 ——
    'ui/star_on': '评价星·亮', 'ui/star_off': '评价星·空',
    'ui/lvtag': '等级角标（替 .lvtag CSS）', 'ui/tag_free': '角标·免费',
    'ui/tag_sale': '角标·折扣', 'ui/tag_hot': '角标·HOT',
    'ui/node_done': '天赋节点·已点', 'ui/node_next': '天赋节点·可点', 'ui/node_lock': '天赋节点·锁定',
    // 名次奖牌三件（medal1/2/3）2026-09-20 已出图并接 HUD 伤害统计 `.statRank`，声明移出本表；
    // 排行榜弹窗那处按「随文小符号不出图」判死，理由见 STYLE-SPEC §9 名次奖牌行。
    'ui/badge/power_badge': '战力徽章底',
    // row_card（列表行卡底板）2026-09-21 已出图并接商城货卡 `.good.panel`（两处）与 HUD 邮件行
    // `.mailRow.panel`，声明移出本表。
    // panel_mini 留单：图出了也合格，但 `.mbox` 这两个容器（HomeUiCore.ts:394/435）带 `frame` 类，
    // 而 `.frame` 有 ::before/::after 装饰伪元素与自己的边框，九宫格板贴上去会跟它们打架。
    // 要么先给 `.mbox.frame` 定一个「板 + 装饰」的先后口径，要么等一个不带 frame 的小框宿主。
    'ui/panel/panel_mini': '模块小框底板（.mbox 带 frame 类与装饰伪元素，口径未定，暂不贴）',
    // —— 护送关卡卡载具 ——
    'icons/vehicle_truck': '关卡载具·卡车', 'icons/vehicle_ship': '关卡载具·运输船',
    'icons/vehicle_hauler': '关卡载具·重卡',
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

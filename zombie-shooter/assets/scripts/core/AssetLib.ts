import { Rect, resources, Size, SpriteFrame, Vec2 } from 'cc';

/**
 * 美术资源库：启动时按清单异步预载 resources/textures 下的图，
 * 实体按 key 取 SpriteFrame；清单里没有（图还没出）返回 null，
 * 由调用方回退 Graphics 占位——美术可以逐张补齐，随时都能进游戏。
 */

/** 已就绪的美术清单（key 相对 textures/，如 'monsters/boar'） */
const MANIFEST = [
    'fx/mortar',
    'fx/rifle_muzzle_flash', 'fx/rifle_grenade_explosion', 'fx/rifle_grenade_ring',
    'weapons/rifle_bullet', 'weapons/rifle_grenade',
    'weapons/sniper_bullet', 'weapons/laser_beam', 'weapons/radiation_bullet',
    'monsters/boar',
    'scenes/road',
    'ui/panel_card',
    'ui/banner',
    // 主城 UI 贴图套件（九宫格面板/按钮/横幅/图标，video_to_sheet 同源管线产出）
    'ui/panel_metal', 'ui/banner_orange', 'ui/btn_gold', 'ui/btn_cyan', 'ui/chip_dark', 'ui/chest',
    'ui/nav_mall', 'ui/nav_heroes', 'ui/nav_battle', 'ui/nav_core', 'ui/nav_base',
    'ui/res_gold', 'ui/res_diamond', 'ui/res_stamina',
    'scenes/vehicle_tail', 'scenes/escort',
    // 在库备用件（代码暂未引用，登记以保持清单↔磁盘一致；下一轮美术可直接取用）
    'ui/btn_primary', 'ui/card_frame', 'ui/icon_frame', 'ui/panel_frame',
    // 四轮素材表批量件（r4_icons 一次成型，未接线备用）：按钮系/头像框/标题绶带 + 商城货架/功能图标
    'ui/btn_play', 'ui/btn_confirm', 'ui/btn_cancel', 'ui/btn_close',
    'ui/avatar_frame', 'ui/ribbon_title',
    // 六轮素材（r6_panels）：弹层面板底板/横标题绶带/标题条
    'ui/panel_main', 'ui/panel_sub', 'ui/ribbon_banner', 'ui/bar_title',
    // 六轮素材（r6_btns）：警示/奖励 CTA 板 + 圆形小钮×2
    'ui/btn_danger', 'ui/btn_video', 'ui/btn_round', 'ui/btn_round2',
    // 六轮素材（r6_icons）：公告喇叭/奖杯/锁
    'ui/ico_notice', 'ui/ico_trophy', 'ui/ico_lock',
    // 六轮素材（r6_frames/r6_badges）：铜银金头像框 + 白绿蓝紫品质框 + 七段位徽章（在库备用）
    'ui/frame_bronze', 'ui/frame_silver', 'ui/frame_gold',
    'ui/frame_q0', 'ui/frame_q1', 'ui/frame_q2', 'ui/frame_q3',
    'ui/rank1', 'ui/rank2', 'ui/rank3', 'ui/rank4', 'ui/rank5', 'ui/rank6', 'ui/rank7',
    'ui/shop_gift', 'ui/shop_chest', 'ui/shop_scroll', 'ui/shop_letter',
    'ui/ico_task', 'ui/ico_mail', 'ui/ico_setting', 'ui/ico_rank', 'ui/ico_achieve',
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
    'ui/btn_purple', 'ui/btn_home', 'ui/btn_help', 'ui/btn_refresh',
    // 二级页签族（商城货架 / 背包分类共用）
    'ui/tab_hero', 'ui/tab_equip', 'ui/tab_gem', 'ui/tab_mat', 'ui/tab_core', 'ui/tab_potion',
    // 功能入口图标族（主城侧栏 + 英雄养成 + 商城 + HUD + 设置/登录）
    'ui/ico_add', 'ui/ico_signin', 'ui/ico_codex', 'ui/ico_trial', 'ui/ico_endless',
    'ui/ico_core', 'ui/ico_weapon', 'ui/ico_skill', 'ui/ico_starup', 'ui/ico_talent',
    'ui/ico_recruit', 'ui/ico_forge', 'ui/ico_ad', 'ui/ico_more',
    'ui/ico_pause', 'ui/ico_stats', 'ui/ico_undo', 'ui/ico_loot', 'ui/ico_del',
    'ui/ico_inbox', 'ui/ico_empty', 'ui/ico_sound', 'ui/ico_mute', 'ui/ico_info',
    'ui/ico_warn', 'ui/ico_slider', 'ui/ico_check', 'ui/ico_friend', 'ui/ico_calendar',
    'ui/ico_shop', 'ui/ico_search',
    // 状态与属性图标族
    'icons/status_shield', 'icons/status_sword', 'icons/status_heart', 'icons/status_skull',
    'icons/status_fire', 'icons/status_ice', 'icons/status_bolt', 'icons/status_poison',
    'icons/status_lock', 'icons/status_search',
    // 材料与宝石图标族（商城货柜 / 背包装备）
    'icons/mat_stone', 'icons/mat_alloy', 'icons/mat_core',
    'icons/gem_fire', 'icons/gem_wind', 'icons/gem_ice', 'icons/gem_thunder',
    // 扩展资源与进度件
    'ui/res_frag', 'ui/res_medal', 'ui/res_energy', 'ui/res_ticket',
    'ui/bar_track', 'ui/bar_fill_green', 'ui/bar_fill_yellow', 'ui/bar_fill_blue', 'ui/bar_fill_red',
    'ui/bar_cap', 'ui/bar_node',
    // 框徽角标补件（升星/等级/折扣/节点/战力/名次奖牌）
    'ui/star_on', 'ui/star_off', 'ui/lvtag', 'ui/tag_free', 'ui/tag_sale', 'ui/tag_hot',
    'ui/node_done', 'ui/node_next', 'ui/node_lock', 'ui/power_badge',
    'ui/medal1', 'ui/medal2', 'ui/medal3', 'ui/row_card', 'ui/panel_mini',
    // 护送关卡卡载具
    'icons/vehicle_truck', 'icons/vehicle_ship', 'icons/vehicle_hauler',
];

/**
 * 预留槽位：MANIFEST 已登记、文件未到位（缺图自动回退 emoji/占位，图到位即生效）。
 * 这一份就是「美术进版采购单」的机器可读形态：登记即有宿主与用途说明，
 * 图落地后必须把该 key 从本表删除（`tools/check-art-manifest.mjs` 会盯过时声明）。
 * 预载阶段跳过本表 key，避免为不存在的图白发请求。
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
    'ui/btn_purple': '特殊/紫色大按钮去字底板（UiPlate.PLATE.purple）',
    'ui/btn_home': '小圆钮·主页', 'ui/btn_help': '小圆钮·帮助 ?', 'ui/btn_refresh': '小圆钮·刷新 ↻',
    // —— 二级页签 ——
    'ui/tab_hero': '页签·英雄（商城货架头）', 'ui/tab_equip': '页签·装备（商城/背包共用）',
    'ui/tab_gem': '页签·宝石（商城/背包共用）', 'ui/tab_mat': '页签·材料',
    'ui/tab_core': '页签·核心（背包）', 'ui/tab_potion': '页签·耗材（背包）',
    // —— 功能入口图标 ——
    'ui/ico_add': '顶栏资源 + 加号钮', 'ui/ico_signin': '侧栏·签到', 'ui/ico_codex': '侧栏·图鉴',
    'ui/ico_trial': '侧栏·试炼塔', 'ui/ico_endless': '侧栏·无尽',
    'ui/ico_core': '英雄页·核心养成', 'ui/ico_weapon': '英雄页·武器强化', 'ui/ico_skill': '英雄页·技能',
    'ui/ico_starup': '英雄页·升星', 'ui/ico_talent': '英雄页·天赋',
    'ui/ico_recruit': '入口·招募', 'ui/ico_forge': '入口·锻造', 'ui/ico_ad': '广告 ▶ 前缀',
    'ui/ico_more': '详情 › 链尾',
    'ui/ico_pause': 'HUD·暂停 ❚❚', 'ui/ico_stats': 'HUD·伤害统计', 'ui/ico_undo': '撤销 ↩',
    'ui/ico_loot': '补给箱 📦', 'ui/ico_del': '删除 🗑', 'ui/ico_inbox': '收件 📭/📧',
    'ui/ico_empty': '空态图标（替 popEmpty 的 📭）', 'ui/ico_sound': '设置·音量',
    'ui/ico_mute': '设置·静音', 'ui/ico_info': '设置·关于 ℹ️', 'ui/ico_warn': '设置·警告 ⚠️',
    'ui/ico_slider': '设置·音量滑杆', 'ui/ico_check': '登录·协议勾选 ✓',
    'ui/ico_friend': '好友', 'ui/ico_calendar': '日历', 'ui/ico_shop': '商店帐篷', 'ui/ico_search': '放大镜',
    // —— 状态与属性 ——
    'icons/status_shield': '状态·盾/护甲', 'icons/status_sword': '状态·剑/攻击',
    'icons/status_heart': '状态·心/生命', 'icons/status_skull': '状态·骷髅/致死',
    'icons/status_fire': '状态·灼烧', 'icons/status_ice': '状态·冰冻',
    'icons/status_bolt': '状态·感电', 'icons/status_poison': '状态·中毒',
    'icons/status_lock': '状态·锁定', 'icons/status_search': '状态·侦查',
    // —— 材料与宝石 ——
    'icons/mat_stone': '材料·石料', 'icons/mat_alloy': '材料·合金', 'icons/mat_core': '材料·核心',
    'icons/gem_fire': '宝石·火', 'icons/gem_wind': '宝石·风', 'icons/gem_ice': '宝石·冰',
    'icons/gem_thunder': '宝石·雷',
    // —— 扩展资源与进度条 ——
    'ui/res_frag': '资源·英雄碎片', 'ui/res_medal': '资源·勋章',
    'ui/res_energy': '资源·能量', 'ui/res_ticket': '资源·招募券',
    'ui/bar_track': '进度条底槽（九宫格横件）', 'ui/bar_fill_green': '进度填充·绿（经验/通用）',
    'ui/bar_fill_yellow': '进度填充·黄（体力/活跃度）', 'ui/bar_fill_blue': '进度填充·蓝（科技/冷却）',
    'ui/bar_fill_red': '进度填充·红（boss 血条/危险）', 'ui/bar_cap': '进度条端头',
    'ui/bar_node': '关卡进度宝箱节点',
    // —— 框徽角标 ——
    'ui/star_on': '评价星·亮', 'ui/star_off': '评价星·空',
    'ui/lvtag': '等级角标（替 .lvtag CSS）', 'ui/tag_free': '角标·免费',
    'ui/tag_sale': '角标·折扣', 'ui/tag_hot': '角标·HOT',
    'ui/node_done': '天赋节点·已点', 'ui/node_next': '天赋节点·可点', 'ui/node_lock': '天赋节点·锁定',
    'ui/power_badge': '战力徽章底', 'ui/medal1': '排行榜名次奖牌·第 1（替 🥇）',
    'ui/medal2': '排行榜名次奖牌·第 2（替 🥈）', 'ui/medal3': '排行榜名次奖牌·第 3（替 🥉）',
    'ui/row_card': '列表行卡底板（任务/邮件/货架条目）', 'ui/panel_mini': '模块小框底板（.mbox）',
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

import { AssetLib } from '../core/AssetLib';
import type { EquipSlot } from '../core/HeroSystem';

/**
 * 通用件贴图契约层：美术槽位 ↔ DOM 组件的唯一映射真源。
 *
 * 四条硬规矩（对账 art-spec/STYLE-SPEC.md §9，`tools/check-art-manifest.mjs` 逐条断言）：
 *  1. 页面里不再手写 `style.borderImage*` / 背景适配四件套，一律走本文件工厂；
 *  2. 组件显示尺寸只归 CSS（分层覆盖在 CSS 里），JS 只挂图——内联尺寸会压掉覆盖规则；
 *  3. 贴图到位即清掉同位 glyph，缺图保留 glyph 回退（同族不混排，也不空槽）；
 *  4. 按钮一律「去字底板 + 代码叠字」，语义 → 板只查 PLATE，禁止按文案正则猜板。
 */

/** AssetLib 资源 → CSS url；未就绪（图还没到位/异步未到）返回 null */
export function frameUrl(key: string): string | null {
    const frame = AssetLib.frame(key);
    const tex = (frame ? frame.texture : null) as
        (import('cc').Texture2D & { image?: { data?: unknown; width?: number; height?: number } }) | null;
    const asset = tex ? tex.image : null;
    const img = asset ? asset.data : null;
    if (!img) {
        return null;
    }
    if (typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement && img.src) {
        return `url(${img.src})`;
    }
    if (typeof HTMLCanvasElement !== 'undefined' && img instanceof HTMLCanvasElement) {
        return `url(${img.toDataURL('image/png')})`;
    }
    if (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap && typeof document !== 'undefined') {
        try {
            const cv = document.createElement('canvas');
            cv.width = asset!.width ?? img.width;
            cv.height = asset!.height ?? img.height;
            cv.getContext('2d')!.drawImage(img, 0, 0);
            return `url(${cv.toDataURL('image/png')})`;
        } catch {
            return null;
        }
    }
    return null;
}

/** 摘除贴图位上的 glyph：只吃短文本节点（emoji/单字符），带 <span> 文案的按钮只去前导图标 */
export function dropGlyph(el: HTMLElement): void {
    for (const node of Array.from(el.childNodes)) {
        if (node.nodeType === 3) {
            const t = node.textContent ?? '';
            if (t.trim().length > 0 && t.trim().length <= 4) {
                node.textContent = '';
            }
        }
    }
}

/** 九宫格参数：slice 决定「只切到哪为止」，width 决定四角按多大显示 */
export interface NineSpec {
    slice: string;
    width: string;
}

/**
 * 九宫格件的参数档（改动必须与 STYLE-SPEC §9 同步，否则美术按文档出图会切坏）：
 *  - panel：弹层底板，源 512 方图四角约 61px（=12%），显示 16px；
 *  - plate：大按钮去字底板，切片按百分比包住包边与铆钉（详见下面 plate 行的注释），显示 11px；
 *  - frame：框件（头像框等），**不带 fill** —— 只画四边、中心留空，
 *    宿主自己的底色/立绘 background 才不会被框图盖掉；
 *  - bar：进度条底槽。**四边切片值不同**——`tools/measure_nine.py` 量 r12 表切出的 `bar_track`（512×64）
 *    得「上下描边含软边各 10px、左右圆头各 17px」，故 slice 写 `10 17 10 17 fill`；
 *    width 按宿主条高 20~28px 折算取 4px / 7px（×--pu）。
 *    **只给条高 ≥10px 的宿主用**——再薄的条，上下两条描边就把内腔吃光了（STYLE-SPEC §9 薄板档）。
 *    旧口径 `8 fill` / 2px 是照基准图量出来的，对不上这批生成件（8px 只够盖住软边、圆头会被拉进中段），
 *    2026-09-20 按实测改档。
 *  - barThin：同一张底槽件给 10~16px 的薄宿主用。描边与圆头的**显示宽度要随宿主条高等比缩**，
 *    12px 的条配 4px 板边只剩 4px 内腔，等于把一根细线糊成一坨；切片值不变，显示宽度按
 *    12÷52（源件条高）≈0.23 折算成 2px / 4px。
 */
export const NINE: Record<'panel' | 'plate' | 'platePw' | 'frame' | 'bar' | 'barThin' | 'card' | 'btn' | 'btnSm' | 'chip'
    | 'navTab' | 'seg' | 'sq' | 'bigCard', NineSpec> = {
    panel: { slice: '12% fill', width: 'calc(16px * var(--pu,1))' },
    // 按钮板族（plate / platePw / btn / btnSm 共用同一批 r24 去字板）：切片一律**按百分比**。
    // 两件事都是实测出来的，改之前先读：
    //  ① 像素档（旧 `16 fill` / `24 fill`）在横长板件上会把包边划进中段拉 smear——同 chip 那条理由；
    //  ② 更致命的是切片值必须**大于源件的透明边**、并且**包住铆钉**。`tools/slice_sheet.py` 旧版把每件
    //    方化成正方形画布，横长板件上下各带 22% 的 alpha=0 空边；16px 只够切进空边里，透明行被划进
    //    可拉伸的中段 → 板面只渲染出宿主盒子高的 55%，字从板的上下沿溢出去（2026-09-21 弹层 CTA 实测）。
    //    现在板件已按 alpha 包围盒裁紧（`tools/trim_alpha.py`），32% 22% 是把四角铆钉整块留在角区量的：
    //    btn_play 364×210 的铆钉占 x≤23%、y≤32%，取 32%×22% 让铆钉进角区、中段只剩平整牌面。
    plate: { slice: '32% 22% fill', width: 'calc(11px * var(--pu,1))' },
    platePw: { slice: '32% 22% fill', width: 'calc(11px * var(--pw,2.5))' },
    frame: { slice: '16%', width: 'calc(5px * var(--pu,1))' },
    bar: { slice: '10 17 10 17 fill', width: 'calc(4px * var(--pu,1)) calc(7px * var(--pu,1))' },
    barThin: { slice: '10 17 10 17 fill', width: 'calc(2px * var(--pu,1)) calc(4px * var(--pu,1))' },
    // 列表行卡 / 模块小框（r16 表两件）：源件 640×384 与 512×512 的钢框都是 ~20px 厚，
    // 切片取 24 宁可多切一点进到平整牌面里，也不能少切——少切会把框边像素划进中段拉 smear。
    // 显示宽度 12px 是按卡片最小高 115px×--pu 折算的（同 D21：切片不变、显示宽度跟着宿主尺寸走）。
    card: { slice: '24 fill', width: 'calc(12px * var(--pu,1))' },
    // 主城按钮族（r24 表）：切片与 plate 同档（同一批去字板，见上面 plate 的注释），
    // 显示宽度按宿主高度分两档——主 CTA / 侧栏入口 / 编队行都是 47~83px 高用 12px；商城购买小键只有 37px，
    // 12px 上下就吃掉 24px 剩 13px 压字，所以单独一档 8px（上一轮「板压字撤板」就是这么撤的）。
    btn: { slice: '32% 22% fill', width: 'calc(12px * var(--pu,1))' },
    btnSm: { slice: '32% 22% fill', width: 'calc(8px * var(--pu,1))' },
    // 战斗 HUD 的波次牌（r27 表）：源件 512×256，四角包边铆钉约占 18% 高、12% 宽，
    // 所以切片按**百分比**给（像素档在横长件上会把包边划进中段拉 smear）。
    // 显示宽度按 chip 实测高 ~100 CSS px 折算（18% × 100 ≈ 18px，同 D21 口径）。
    chip: { slice: '18% 12% fill', width: 'calc(14px * var(--pu,1))' },
    // ===== 容器底板族（r31 表 7 件，2026-09-21）=====
    // 这一族补的是表面普查里最后几块「整页零九宫格」的面：底部主导航 5 格（每页都在屏）、
    // 二级分类页签 4 签、战斗 HUD 三枚功能钮、英雄页装备六槽、基地页 8 张建筑卡、行动页 2 张模式入口卡。
    // 切片一律百分比（同 plate 的理由：同族源件比例从 6:1 的薄条到 1.2:1 的方卡都有），
    // 且**源件都不许带透明边**——r31 这批用 `slice_sheet.py --tight` 切、`trim_alpha.py --check` 过关（≤6%）。
    // 底部主导航格：源 674×273、宿主实测 106×93。格子里那枚图标就有 102 见方，板只能露出四边一圈，
    // 所以显示宽度取 10px——再厚就把图标压进包边里了。
    navTab: { slice: '26% 12% fill', width: 'calc(10px * var(--pu,1))' },
    // 二级分类页签（装备/宝石/材料/道具）：源 639×107 是这一族最薄的条，宿主 135×47。
    // 上下切片给到 30% 才包得住两头的角码，左右 10% 就够——再宽会把中段那点平牌面切没。
    seg: { slice: '30% 10% fill', width: 'calc(9px * var(--pu,1))' },
    // 近方小件：战斗 HUD 功能钮（源 281×274 / 宿主 53~64×47）与英雄页装备六槽（宿主 82×83）共用一档。
    sq: { slice: '26% 22% fill', width: 'calc(12px * var(--pu,1))' },
    // 大卡：基地建筑卡（源 674×272 / 宿主 251×150）与行动模式入口卡（源 526×441 / 宿主 240×235）。
    // 两张卡宿主都 ≥150 高，板给到 15px 才压得住这么大的面。
    bigCard: { slice: '26% 12% fill', width: 'calc(15px * var(--pu,1))' },
};

/**
 * 主城按钮族：CSS 选择器 → [贴图 key, 切片档]，**顺序即优先级，取第一个命中的**。
 *
 * 由 `HomeUiCore._plateCityButtons()` 在每次切页后整族扫一遍铺板——原来全工程只有 1 个手工
 * 铺板调用点（解锁大键），其余 `.game-button` / `.hot` / `.hpick` / `.gBuy` 全是 CSS 渐变，
 * 这就是"按钮类没成套"的根因。按类别一条规则，而不是十几处各写一遍。
 *
 * `key: null` 是**显式跳过**：这一档宿主太小，贴任何板都会糊住字（判据见下面 `.game-button.sm` 那行）。
 * 选中/未选中这类派生态不出二态图（STYLE-SPEC §10），但同族两档选择器可以分别指到已有语义板上，
 * 于是「选中=金、未选=蓝」——色语义仍由贴图承担，不必为每个态画一张。
 */
export const CITY_BUTTON_PLATE: Array<{ sel: string; key: string | null; spec: 'btn' | 'btnSm' }> = [
    // 难度小键只有 46×22：板厚四倍都不到，贴上去整块糊掉（无头普查实测），显式跳过
    { sel: '.game-button.sm', key: null, spec: 'btnSm' },
    // 英雄养成五入（技能/天赋/升星/武器/核心）：这一档原来被显式跳过，理由是「板只盖住中段一条，
    // ⚡ 与「技能」两行露在板外」。2026-09-21 查明那条理由是**透明边 bug 的副作用**——板件上下各垫了
    // 22% 的 alpha=0 空边，板面只渲染出宿主盒高的 55%，看着就像"板比键短"。裁紧 + 改档后重测：
    // 61px 盒高配 btnSm 档（11px 边框）剩 39px 平牌面，两行内容放得下，于是接回蓝板。
    { sel: '.btn.blue.hot', key: 'ui/button/btn_cancel', spec: 'btnSm' },
    { sel: '.diffSeg.on', key: 'ui/button/btn_play', spec: 'btnSm' },
    { sel: '.diffSeg', key: 'ui/button/btn_cancel', spec: 'btnSm' },
    // 护送页那个「👥编队」大入口也带 squadEntry，但它属于侧栏一族（btn_side 木箱板），
    // 英雄/护送页顶部的 4 个号位才是这里要管的方形小键
    { sel: '.squadEntry.on:not(.hot)', key: 'ui/button/btn_confirm', spec: 'btnSm' },
    { sel: '.squadEntry:not(.hot)', key: 'ui/button/btn_cancel', spec: 'btnSm' },
    // 章节左右翻页箭头不贴：它压在关卡实景照片上，而照片本身是深色金属调——板子上去等于把箭头
    // 融进背景（实测第 1 章那对 dim 箭头直接看不见）。这一族要的是「与照片拉开对比」，属 CSS 活。
    { sel: '.arrow', key: null, spec: 'btnSm' },
    { sel: '.game-button.purple', key: 'ui/button/btn_purple', spec: 'btn' },
    { sel: '.game-button.major', key: 'ui/button/btn_play', spec: 'btn' },
    { sel: '.game-button', key: 'ui/button/btn_cancel', spec: 'btn' },
    { sel: '.gBuy', key: 'ui/button/btn_small', spec: 'btnSm' },
    { sel: '.hpick', key: 'ui/button/btn_row', spec: 'btn' },
    // 2026-09-21 用户点名撤板的三处：侧栏一列、护送页脚两枚、里程碑三档——这些位置现在自带真图，
    // 不再需要板子托着（当初保留板的理由是"撤了会露出裸 emoji 夹杂"，图补齐之后这条理由已经不成立）。
    // 必须排在 `.hot` 之前：表是顺序优先，第一个命中的生效。
    { sel: '.side-tools .hot', key: null, spec: 'btn' },
    { sel: '.battle-bottom .hot', key: null, spec: 'btn' },
    { sel: '.milestones .milestone', key: null, spec: 'btn' },
    { sel: '.hot', key: 'ui/button/btn_side', spec: 'btn' },
];

/**
 * 容器底板族：CSS 选择器 → [贴图 key, 切片档]，口径与 `CITY_BUTTON_PLATE` 一致（顺序即优先级）。
 *
 * 这一族补的是表面普查（`tools/audit_ui_surfaces.mjs`）里最后几块「整页零九宫格」的面。
 * 与按钮族**分成两张表**是因为扫描范围不同：按钮族只扫 `.viewport`（弹层 CTA 归 `_openPop` 路由，
 * 两套规则不许互相覆盖），而导航格在 `.viewport` 之外的 `.tabbar` 里，必须扫整个 `#homeUi`。
 * 所以这里的选择器一律**自带容器前缀**，别写裸类名去够弹层里的同名元素。
 */
export const SURFACE_PLATE: Array<{ sel: string; key: string | null; spec: keyof typeof NINE }> = [
    // 底部主导航：五格连成**一块**板（2026-09-21 用户点名"去掉页签间隔、五格放进一个背板"）。
    // 原来每格一块 tab_plate，五块板之间必然留缝，读成五个独立按钮浮在一条带上——正是"方块感"。
    // 整条 .tabbar 贴一块、复用同一张图的 navTab 档：中间区横向拉长就是连续板面，铆钉只落在整条两端。
    // 选中态不能再靠换板表达（一块板上没有"哪一格换了板"这回事），改由 CSS 的凹下底色 + 顶部金槽承担。
    { sel: '.tabbar', key: 'ui/nav/tab_plate', spec: 'navTab' },
    // 二级分类页签（商城 4 签 + 背包 4 签共用同一件；选中色仍由 CSS 高亮，不出二态板）
    { sel: '.flat-tabs > button', key: 'ui/tab/seg_plate', spec: 'seg' },
    // 英雄页装备六槽（头盔/护甲/腕甲/护腿/手套/战靴）——基地页之外最大的一片纯色方格
    { sel: '.eqGrid .slot', key: 'ui/panel/eq_slot', spec: 'sq' },
    // 基地页 8 张建筑卡（这一页原先九宫格数为 0）
    { sel: '.building', key: 'ui/panel/building_card', spec: 'bigCard' },
    // 行动页「无尽试炼 / 无尽护送」两张入口卡
    { sel: '.challenge-ground .entry', key: 'ui/panel/entry_card', spec: 'bigCard' },
];

/**
 * 装备**空槽**底纹族（r35b 表 6 件）：槽空着的时候垫这一位的暗色剪影。
 *
 * 与上面 `.eqGrid .slot` 那块金属板是配套的，所以刻意出成**单色低对比剪影、不带外框**——
 * 槽自己已经是框，图再带框就是框套框（第一版 r35 整表因此作废重出，见 STYLE-SPEC §8）。
 * 已装备那一支仍走 `SLOT_EMOJI`：ghost=虚、emoji=实，正好是"有没有东西"的对照。
 */
export const SLOT_GHOST_TEX: Record<EquipSlot, string> = {
    head: 'ui/ico/ico_slot_helm', body: 'ui/ico/ico_slot_vest', wrist: 'ui/ico/ico_slot_bracer',
    legs: 'ui/ico/ico_slot_legs', gloves: 'ui/ico/ico_slot_glove', shoes: 'ui/ico/ico_slot_boot',
};

/**
 * 基地建筑插画（r36 表前 8 格）：`BUILDINGS[].id` → 贴图 key，接基地页那一枚 `.ic`。
 *
 * 宿主 187×104 的建筑卡自带 `ui/panel/building_card` 底板，所以出图禁框（同 `SLOT_GHOST_TEX` 那条理由）。
 * 表里只列**已落盘**的 id：`trial`/`dungeon` 两个伪建筑（挑战场、资源副本的解锁卡）没有对应格子，
 * 查不到就走 emoji——`AssetLib.hasArt` 会挡住没登记的 key，不会白发预载请求。
 */
export const BUILDING_TEX: Record<string, string> = {
    hq: 'ui/build/build_hq', camp: 'ui/build/build_camp', armory: 'ui/build/build_armory',
    lab: 'ui/build/build_lab', workshop: 'ui/build/build_workshop', depot: 'ui/build/build_depot',
    station: 'ui/build/build_station', radar: 'ui/build/build_radar',
};

/**
 * 玩法入口插画（r36 表后 8 格 + r37/r38 补出 4 格）：入口 id → 贴图 key，
 * 吃行动页四种宿主（资源副本行 55px、挑战场入口卡 205×151、远征行与页脚 42~47px）、
 * 护送页页脚两枚，以及商城那张「招募英雄」货卡的 61px 图位。
 *
 * `dungeon_stone` 是补出来的：r36 那一格画成蓝色水晶矿洞，与同排 `dungeon_gem`（紫水晶）
 * 在 55px 里读成同一个东西，而这一排给玩家做的选择正是"打哪个副本"——撞形就是功能缺陷。
 * 补出时把槽位名从「强化石」改成「砖石堆场」才拿对，理由记在 STYLE-SPEC §8。
 */
export const MODE_TEX: Record<string, string> = {
    dungeon_gold: 'ui/act/dungeon_gold', dungeon_stone: 'ui/act/dungeon_stone',
    dungeon_alloy: 'ui/act/dungeon_alloy', dungeon_gem: 'ui/act/dungeon_gem',
    trial: 'ui/act/trial_endless', endless: 'ui/act/escort_endless',
    expedition: 'ui/act/expedition', patrol: 'ui/act/patrol',
    recruit_hero: 'ui/act/recruit_hero', vehicle_tuning: 'ui/act/vehicle_tuning',
    squad: 'ui/act/squad', achievement: 'ui/act/achievement',
};

/** 九宫格底板回填器（面板 / 大按钮 / 框件同一条管线） */
export function nineSlice(el: HTMLElement, spec: keyof typeof NINE, opts?: { keepBackground?: boolean }): (url: string) => void {
    const n = NINE[spec];
    return (url: string) => {
        el.style.borderImageSource = url;
        el.style.borderImageSlice = n.slice;
        el.style.borderImageWidth = n.width;
        el.style.borderImageRepeat = 'stretch';
        el.style.borderColor = 'transparent';
        if (!opts?.keepBackground) {
            el.style.background = 'none';
        }
        // 打上「这块板真的贴上了」的标记：板子把浅底换成深色金属板之后，原先按浅底写的字色要翻亮，
        // 而那件事只在图到位时成立（缺图回退 CSS 底色时旧配色才是对的）。CSS 靠这个类分岔。
        el.classList.add('plated');
    };
}

/** 框件回填器：保留宿主背景（立绘/底色在框内），CSS 描边退为缺图回退 */
export function frame(el: HTMLElement): (url: string) => void {
    return nineSlice(el, 'frame', { keepBackground: true });
}

export interface IconOpts {
    /** 图自带边框/底托时隐去 CSS 边框 */
    hideBorder?: boolean;
    /** 同位字符是功能符号而非占位（框件压在 glyph 外圈、‹ 这类符号压在板面上）：不清除 */
    keepGlyph?: boolean;
    /** 适配方式，默认 contain；立绘/照片类用 cover 或自定义 */
    size?: string;
    position?: string;
    /** 贴图自带配色时改写文字色 */
    color?: string;
}

/** 方形图标 / 框件回填器：CSS 管尺寸，这里只管图与 glyph */
export function icon(el: HTMLElement, opts?: IconOpts): (url: string) => void {
    return (url: string) => {
        el.style.backgroundImage = url;
        el.style.backgroundSize = opts?.size ?? 'contain';
        el.style.backgroundPosition = opts?.position ?? 'center';
        el.style.backgroundRepeat = 'no-repeat';
        if (opts?.hideBorder) {
            el.style.borderColor = 'transparent';
        }
        if (opts?.color) {
            el.style.color = opts.color;
        }
        if (!opts?.keepGlyph) {
            dropGlyph(el);
        }
    };
}

/** 横条件回填器（标题条 / 绶带）：整图拉伸铺满，长宽比由宿主 CSS 决定 */
export function strip(el: HTMLElement): (url: string) => void {
    return (url: string) => {
        el.style.backgroundImage = url;
        el.style.backgroundSize = '100% 100%';
        el.style.backgroundPosition = 'center';
        el.style.backgroundRepeat = 'no-repeat';
        el.style.borderBottomColor = 'transparent';
    };
}

/** 按钮语义（图内无字；置灰/高亮等派生态见 STYLE-SPEC §10，不给每态出图） */
export type PlateKind = 'gold' | 'green' | 'blue' | 'danger' | 'ad' | 'grey' | 'purple';

/**
 * 语义 → 去字底板槽位。唯一映射表，取代旧「按中文文案正则猜板」（会随文案漂移掉板）。
 * grey 沿用蓝板（现状），置灰本身由 §10 态策略的 CSS filter 派生，不出独立灰板；
 * purple 为待美术的预留位（ui/button/btn_purple），缺图时回退 CSS 底色。
 */
export const PLATE: Record<PlateKind, string> = {
    gold: 'ui/button/btn_play',
    green: 'ui/button/btn_confirm',
    blue: 'ui/button/btn_cancel',
    danger: 'ui/button/btn_danger',
    ad: 'ui/button/btn_video',
    grey: 'ui/button/btn_cancel',
    purple: 'ui/button/btn_purple',
};

/** 未声明 kind 即主按钮（金色）；未知语义不猜板，交回 CSS 底色 */
export function plateOf(kind?: string): string | null {
    if (!kind || kind === 'gold') {
        return PLATE.gold;
    }
    return PLATE[kind as PlateKind] ?? null;
}

/** 底部主导航：页 key → 页签图标槽位（取代散在渲染里的三元链） */
export const NAV_PLATE: Record<string, string> = {
    mall: 'ui/nav/nav_mall', heroes: 'ui/nav/nav_heroes', battle: 'ui/nav/nav_battle',
    core: 'ui/nav/nav_core', base: 'ui/nav/nav_base',
};

/** 详情品质头 .qi 的品质框：下标 = 品质档 - 1（q1~q4 → 白绿蓝紫） */
export const QUALITY_FRAME: string[] = ['ui/frame/frame_q0', 'ui/frame/frame_q1', 'ui/frame/frame_q2', 'ui/frame/frame_q3'];

/**
 * 材料与宝石：`MISC_ITEM_DEFS` 的 id → 贴图 key（背包格 `.bcell i` 与商城货卡 `.gIc` 共用）。
 *
 * 表里只列**已出图**的 id，没出图的（`mat_blueprint`）查不到就走 emoji——这不只是回退好看：
 * 贴图挂起队列只排得空已登记的 key，把没图的 id 也塞进去会留下一条每 400ms 自续重试的空转定时器。
 * 而 key 必须整串字面量写在这里，`'icons/' + id` 那种拼法 `check-art-manifest` 不认，
 * 会把已落盘的图判成「在库无归宿」。
 */
export const MISC_TEX: Record<string, string> = {
    mat_stone: 'icons/mat_stone', mat_alloy: 'icons/mat_alloy', mat_core: 'icons/mat_core',
    gem_fire: 'icons/gem_fire', gem_wind: 'icons/gem_wind', gem_ice: 'icons/gem_ice',
    gem_thunder: 'icons/gem_thunder',
};

/** 顶栏资源胶囊：资源 id → 图标槽位 */
export const RES_ICON: Record<string, string> = {
    gold: 'ui/res/res_gold', diamond: 'ui/res/res_diamond', stamina: 'ui/res/res_stamina',
};

/**
 * 章节载具：`HomeUiStage` 的 `CHAPTER_THEMES[].veh` 字形 → 图标槽位。
 *
 * 键用字形而不是章节序号：章节→载具的对应关系只写在那份主题表里，这里再抄一份序号表
 * 就会有两处真源。整串 key 字面量列出（`'icons/vehicle_' + x` 那种拼法 `check-art-manifest`
 * 不认，会把已落盘的图判成「在库无归宿」）。
 * 浅色（手机）主题把场景里的 `.veh` 整块隐藏，章节头这一枚是手机上唯一看得见载具的地方。
 */
export const VEHICLE_TEX: Record<string, string> = {
    '🚚': 'icons/vehicle_truck', '🚢': 'icons/vehicle_ship', '🚛': 'icons/vehicle_hauler',
};

/**
 * 状态与属性图标族：词缀 id → 贴图 key。精英词缀（`battle/MonsterAffix`）与装备词缀
 * （`core/EquipmentAffix`）共用这一张表，两边 id 不撞（前者裸名、后者带 `af_` 前缀）。
 *
 * 只列**已出图且有对得上语义**的 id：`status_ice` / `status_poison` 两件图出了也合格，
 * 但全工程没有冰冻/中毒机制（无 DoT 系统），硬找位置挂就是假宿主——切片件归档在
 * `art-spec/reference/stock/ico/`，键留在 `RESERVED_SLOTS`（同 `tab_core` 口径）。
 * 表里查不到的词缀（压制/分裂以外的几档）继续走 emoji，`_popAttr` 与 HUD 徽标都按缺图回退。
 */
export const STATUS_TEX: Record<string, string> = {
    // 精英词缀：迅捷=闪电、坚甲=胸甲、治疗=心、分裂=骷髅、狂暴=火焰
    swift: 'icons/status_bolt', armor: 'icons/status_shield', heal: 'icons/status_heart',
    split: 'icons/status_skull', frenzy: 'icons/status_fire',
    // 装备词缀：狂暴=火、精准=分划板、迅捷=闪电、鹰眼=望远镜、穿甲=弹头、铁壁=胸甲
    af_rage: 'icons/status_fire', af_precise: 'icons/status_lock', af_swift: 'icons/status_bolt',
    af_eagle: 'icons/status_search', af_pierce: 'icons/status_sword', af_bulwark: 'icons/status_shield',
};

/**
 * 主城按钮 CSS 变体 → 去字底板（与 `.btn.gold/.blue/.adBtn/.dark` 同名，出图即按板走）。
 * 主城键的墨色仍由 CSS 决定（板子只给底），所以此处不配 color；缺图保留 CSS 渐变。
 */
export const CITY_PLATE: Record<string, string> = {
    gold: 'ui/button/btn_play', blue: 'ui/button/btn_cancel', adBtn: 'ui/button/btn_video', dark: 'ui/button/btn_cancel',
};

/** 按 class 取主城按钮语义档（多档并存时取第一个命中的色语义，sm/big 只是尺寸修饰不参与） */
export function cityKind(el: HTMLElement): string | null {
    for (const kind of ['gold', 'blue', 'adBtn', 'dark']) {
        if (el.classList.contains(kind)) {
            return kind;
        }
    }
    return null;
}

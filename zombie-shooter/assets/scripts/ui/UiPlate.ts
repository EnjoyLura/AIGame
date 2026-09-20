import { AssetLib } from '../core/AssetLib';

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
 *  - plate：大按钮去字底板，源件圆角斜面在 16px 内（slice 取像素值），显示 10px——
 *    slice 用百分比会把板面划进边区、板厚被压扁（四轮实测口径）；
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
export const NINE: Record<'panel' | 'plate' | 'platePw' | 'frame' | 'bar' | 'barThin' | 'card' | 'btn' | 'btnSm', NineSpec> = {
    panel: { slice: '12% fill', width: 'calc(16px * var(--pu,1))' },
    plate: { slice: '16 fill', width: 'calc(10px * var(--pu,1))' },
    platePw: { slice: '16 fill', width: 'calc(10px * var(--pw,2.5))' },
    frame: { slice: '16%', width: 'calc(5px * var(--pu,1))' },
    bar: { slice: '10 17 10 17 fill', width: 'calc(4px * var(--pu,1)) calc(7px * var(--pu,1))' },
    barThin: { slice: '10 17 10 17 fill', width: 'calc(2px * var(--pu,1)) calc(4px * var(--pu,1))' },
    // 列表行卡 / 模块小框（r16 表两件）：源件 640×384 与 512×512 的钢框都是 ~20px 厚，
    // 切片取 24 宁可多切一点进到平整牌面里，也不能少切——少切会把框边像素划进中段拉 smear。
    // 显示宽度 12px 是按卡片最小高 115px×--pu 折算的（同 D21：切片不变、显示宽度跟着宿主尺寸走）。
    card: { slice: '24 fill', width: 'calc(12px * var(--pu,1))' },
    // 主城按钮族（r24 表）：切片同 card（源件倒角+铆钉约 20px），显示宽度按宿主高度分两档——
    // 主 CTA / 侧栏入口 / 编队行都是 47~83px 高用 12px；商城购买小键只有 37px，
    // 12px 上下就吃掉 24px 剩 13px 压字，所以单独一档 7px（上一轮「板压字撤板」就是这么撤的）。
    btn: { slice: '24 fill', width: 'calc(12px * var(--pu,1))' },
    btnSm: { slice: '24 fill', width: 'calc(7px * var(--pu,1))' },
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
    // 英雄养成五入（技能/天赋/升星/武器/核心）：实测贴任何一档板都会「板短字长」——
    // 这五键的图标行高 + 文案比 61px 盒高还高，板只盖住中段一条，⚡ 与「技能」两行露在板外。
    // 先改 CSS（把键加高或压行高）再接图，口径见 STYLE-SPEC §9 主城按钮族行。
    { sel: '.btn.blue.hot', key: null, spec: 'btnSm' },
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
    { sel: '.hot', key: 'ui/button/btn_side', spec: 'btn' },
];

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

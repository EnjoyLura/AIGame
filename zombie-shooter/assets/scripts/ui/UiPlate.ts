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
 * 三类九宫格件的参数（改动必须与 STYLE-SPEC §9 同步，否则美术按文档出图会切坏）：
 *  - panel：弹层底板，源 512 方图四角约 61px（=12%），显示 16px；
 *  - plate：大按钮去字底板，源件圆角斜面在 16px 内（slice 取像素值），显示 10px——
 *    slice 用百分比会把板面划进边区、板厚被压扁（四轮实测口径）。
 */
export const NINE: Record<'panel' | 'plate' | 'platePw', NineSpec> = {
    panel: { slice: '12% fill', width: 'calc(16px * var(--pu,1))' },
    plate: { slice: '16 fill', width: 'calc(10px * var(--pu,1))' },
    platePw: { slice: '16 fill', width: 'calc(10px * var(--pw,2.5))' },
};

/** 九宫格底板回填器（面板 / 大按钮共用一条管线） */
export function nineSlice(el: HTMLElement, spec: keyof typeof NINE): (url: string) => void {
    const n = NINE[spec];
    return (url: string) => {
        el.style.borderImageSource = url;
        el.style.borderImageSlice = n.slice;
        el.style.borderImageWidth = n.width;
        el.style.borderImageRepeat = 'stretch';
        el.style.borderColor = 'transparent';
        el.style.background = 'none';
    };
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
 * purple 为待美术的预留位（ui/btn_purple），缺图时回退 CSS 底色。
 */
export const PLATE: Record<PlateKind, string> = {
    gold: 'ui/btn_play',
    green: 'ui/btn_confirm',
    blue: 'ui/btn_cancel',
    danger: 'ui/btn_danger',
    ad: 'ui/btn_video',
    grey: 'ui/btn_cancel',
    purple: 'ui/btn_purple',
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
    mall: 'ui/nav_mall', heroes: 'ui/nav_heroes', battle: 'ui/nav_battle',
    core: 'ui/nav_core', base: 'ui/nav_base',
};

/** 详情品质头 .qi 的品质框：下标 = 品质档 - 1（q1~q4 → 白绿蓝紫） */
export const QUALITY_FRAME: string[] = ['ui/frame_q0', 'ui/frame_q1', 'ui/frame_q2', 'ui/frame_q3'];

/** 顶栏资源胶囊：资源 id → 图标槽位 */
export const RES_ICON: Record<string, string> = {
    gold: 'ui/res_gold', diamond: 'ui/res_diamond', stamina: 'ui/res_stamina',
};

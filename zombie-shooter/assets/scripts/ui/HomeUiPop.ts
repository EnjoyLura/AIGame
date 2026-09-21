/**
 * 二级弹层的入参契约：档位、尺寸档、五段式骨架的字段定义。
 *
 * 从 `HomeUiCore` 拆出来只因为一件事——Core 是六页共用的基类，已经背着拆分欠账，
 * 而这一百行是**纯类型**：没有一行运行时代码，谁都要引（五页 + Core 自己），
 * 却没有一处改它需要动 Core。拆出去之后 Core 只剩「怎么画」，这里只管「能传什么」。
 *
 * 字段的渲染口径在 `HomeUiCore._renderPop`，视觉红线在 `tools/check-popup-ux.js`，
 * 布局依据在 ux-layout-review 的弹层交互稿（§0 五段式骨架）。
 */

/** 弹层档位：L2 全屏二级页 / L3 二级弹窗 / L4 半屏抽屉 / L5 结果演出层 */
export type PopTier = 2 | 3 | 4 | 5;

/** 弹层尺寸档：S 确认型 / M 列表型 / L 详情型 / XL 全屏页 */
export type PopSize = 'S' | 'M' | 'L' | 'XL';

/** 文本片段：字符串为普通说明，对象可指定强调样式（d 胶囊 / exp 过期 / soon 即将到期） */
export type PopText = string | { text: string; kind?: 'd' | 'exp' | 'soon' };

/** 弹层底部按钮（kind 是贴图语义，取值域与 UiPlate.PLATE 同步） */
export interface PopCta {
    label: string;
    kind?: 'gold' | 'green' | 'danger' | 'grey' | 'ad';
    disabled?: boolean;
    /** 禁用态下点击的去向：缺口 toast 或 3-C 拦截弹窗（禁用不是死键） */
    onDisabled?: () => void;
    red?: boolean;
    onClick: () => void;
}

/** 列表行：图标 + 两行文本（可带标签/进度条）+ 状态列 + 行内动作 */
export interface PopRowOpts {
    icon?: string;
    iconTex?: string;
    /** 行图标外框槽位（头像框/品质框）：走 border-image 无 fill，与 iconTex 的 background 共存 */
    frameTex?: string;
    title: string;
    tag?: string;
    lines?: PopText[];
    progress?: number;
    status?: string;
    statusKind?: 'expire' | 'soon';
    action?: { label: string; kind?: 'green' | 'gold' | 'grey'; disabled?: boolean; onDisabled?: () => void; onClick: () => void };
    red?: boolean;
    expired?: boolean;
    /** 高亮当前行（如排行榜里的「我」） */
    on?: boolean;
    onClick?: () => void;
}

/** 属性行：图标 + 说明（**xx** 高亮）+ 行尾动作按钮 / 空插槽 */
export interface PopAttrOpts {
    icon?: string;
    /** 同位贴图槽：glyph 先占位，图到位由 `UiPlate.icon()` 摘掉（缺图不空槽） */
    iconTex?: string;
    text: string;
    action?: { label: string; kind?: 'gold' | 'info'; onClick: () => void };
    slot?: boolean;
    empty?: boolean;
}

/** 弹层统一入参（UX 布局稿 §0 五段式骨架） */
export interface PopOpts {
    /** 层级，默认 L3 */
    tier?: PopTier;
    /** 尺寸档，默认 M */
    size?: PopSize;
    /** 细标题条文案（与 banner/quality 二选一） */
    title?: string;
    /** 横幅标题（列表型头部） */
    banner?: string;
    /** 横幅右侧美术位占位说明 */
    art?: string;
    /** 品质头（详情型头部） */
    quality?: { q: 1 | 2 | 3 | 4; name: string; icon: string; tier?: string; stats?: string[] };
    /** 展示台（XL 全屏页头部） */
    show?: { icon: string; tier?: string; name?: string; sub?: string };
    /** 说明行（居中副标题 + 可选问号） */
    subtitle?: string;
    help?: () => void;
    /** 顶部页签 */
    tabs?: string[];
    tab?: number;
    onTab?: (i: number) => void;
    /** 固定筛选条（不随内容滚动） */
    fixed?: (bar: HTMLElement) => void;
    /** 内容滚动区（唯一滚动轴） */
    build: (content: HTMLElement) => void;
    /** 槽位条（固定） */
    slots?: (bar: HTMLElement) => void;
    /** 消耗行（固定，不足自动标红） */
    cost?: Array<{ icon: string; have: number; need: number }>;
    /** CTA 底栏（固定） */
    ctas?: PopCta[];
    note?: string;
    /** 底部操作栏：左侧返回 + 右侧页签（XL 二级页） */
    barBack?: boolean;
    barTabs?: Array<{ icon: string; label: string; on?: boolean; red?: boolean; onClick: () => void }>;
    /** 右上关闭，默认 true */
    closable?: boolean;
    /** 点遮罩关闭，默认 L3/L4 可关、L5 与 XL 不可关 */
    maskClose?: boolean;
    /** 钻取：保留返回栈（左上出现返回），关闭时逐级回退 */
    push?: boolean;
    /** 自定义返回（左上返回键 / barBack 触发）：用于返回时重新取数的层级（如列表→详情） */
    onBack?: () => void;
    onClose?: () => void;
}

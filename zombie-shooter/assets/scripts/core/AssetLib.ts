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
    'scenes/vehicle_tail',
    'characters/hero_rifle', 'characters/hero_sniper', 'characters/hero_laser', 'characters/hero_radiation',
    'monsters/crawler', 'monsters/dog', 'monsters/boar', 'monsters/bear', 'monsters/eagle',
    // 怪物行走序列帧（AI 视频抽帧打包，见 tools/gen_walk_sheet.py；缺图回退整图/占位）
    'monsters/crawler_walk', 'monsters/dog_walk', 'monsters/boar_walk', 'monsters/bear_walk', 'monsters/eagle_walk',
    'icons/rifle_basic', 'icons/rifle_skill', 'icons/rifle_ultimate',
    'icons/sniper_basic', 'icons/sniper_skill', 'icons/sniper_ultimate',
    'icons/laser_basic', 'icons/laser_skill', 'icons/laser_ultimate',
    'icons/radiation_basic', 'icons/radiation_skill', 'icons/radiation_ultimate',
    // 后续逐张加：'monsters/dog', 'monsters/bear', 'monsters/eagle', 'monsters/crawler',
    // 'characters/hero_rifle', ... 'scenes/vehicle_tail', 'ui/panel', 'ui/button', 'icons/...'
];

export class AssetLib {
    private static _frames = new Map<string, SpriteFrame>();
    private static _started = false;
    private static _mortar: SpriteFrame[] | null = null;
    private static _walkSheets = new Map<string, SpriteFrame[]>();

    /** 各怪行走序列帧数（tools/slice_walk_sheet.py / video_to_sheet.py 打包时的帧数；缺省 6） */
    private static readonly WALK_FRAME_COUNT: Record<string, number> = { boar: 12 };

    /** 怪物行走序列帧：monsters/<id>_walk 横向等分切片（帧数见 WALK_FRAME_COUNT）。
     *  未就绪返回 null（调用方逐帧轮询，就绪后缓存切片） */
    static monsterWalkFrames(id: string): SpriteFrame[] | null {
        const cached = this._walkSheets.get(id);
        if (cached) {
            return cached;
        }
        const sheet = this.frame(`monsters/${id}_walk`);
        if (!sheet?.texture) {
            return null;
        }
        const n = this.WALK_FRAME_COUNT[id] ?? 6;
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
        this._walkSheets.set(id, out);
        return out;
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

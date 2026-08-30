import { resources, SpriteFrame } from 'cc';

/**
 * 美术资源库：启动时按清单异步预载 resources/textures 下的图，
 * 实体按 key 取 SpriteFrame；清单里没有（图还没出）返回 null，
 * 由调用方回退 Graphics 占位——美术可以逐张补齐，随时都能进游戏。
 */

/** 已就绪的美术清单（key 相对 textures/，如 'monsters/boar'） */
const MANIFEST = [
    'monsters/boar',
    'scenes/road',
    'ui/panel_card',
    'ui/banner',
    'scenes/vehicle_tail',
    'characters/hero_rifle', 'characters/hero_sniper', 'characters/hero_laser', 'characters/hero_radiation',
    'monsters/crawler', 'monsters/dog', 'monsters/boar', 'monsters/bear', 'monsters/eagle',
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

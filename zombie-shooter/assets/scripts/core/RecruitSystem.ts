import { sys } from 'cc';
import { HERO_DEFS } from '../battle/HeroDef';
import { GameManager } from './GameManager';
import { ResourceId } from './PlayerResources';

/**
 * 英雄招募（抽卡）与升星系统（英雄页入口）：
 * - 双轨获取：商城金币买断（GameManager.unlockHero）拿英雄本体；招募用钻石抽取，
 *   抽到未拥有英雄 = 直接解锁，抽到已拥有英雄 = 转化为该英雄碎片。
 * - 碎片是「每英雄一个资源键」（PlayerResources.ResourceId 的 shard_*），升星消耗碎片。
 * - 星星 0~6 星，每星该英雄攻击 +8%、射速 +3%（乘区接入 HeroSystem.atkMulOf / equipMulOf）。
 * - 钻石消耗：单抽 / 十连（十连保底至少一件稀有以上）；另有每日一次看广告免费招募。
 * - 保底：连续 RECRUIT_PITY 抽未出英雄本体 → 下一抽必出本体。
 * - 持久化在独立 localStorage 键（与广告/礼包/任务/签到/邮件/图鉴/试炼同口径）；
 *   碎片数量随主存档的 res 字段持久化。
 */

/** 星级上限 */
export const HERO_STAR_MAX = 6;
/** 每星攻击加成 */
export const STAR_ATK_STEP = 0.08;
/** 每星射速加成（独立乘区，走 HeroSystem.equipMulOf 的 rate 通道） */
export const STAR_RATE_STEP = 0.03;
/** 升星碎片消耗表（索引 = 当前星级，值 = 升到下一星所需碎片） */
export const STAR_COST: number[] = [20, 40, 70, 110, 160, 220];

/** 单抽钻石价 */
export const RECRUIT_PRICE_1 = 200;
/** 十连钻石价（比单抽便宜 10%） */
export const RECRUIT_PRICE_10 = 1800;
/** 保底抽数：连续这么多抽没出英雄本体，下一抽必出 */
export const RECRUIT_PITY = 30;

/** 招募档位（决定品质色与卡片样式） */
export type RecruitTier = 'hero' | 'legend' | 'rare' | 'common';

/** 档位基础概率（英雄本体；其余为碎片包档位） */
const TIER_RATES = { hero: 0.06, legend: 0.14, rare: 0.4 };
/** 各碎片包档位对应的碎片数量 */
const SHARD_PACK = { legend: 10, rare: 5, common: 2 };

/** 单次招募结果（UI 展示 + 落袋凭据共用，照 LootDrop 的用法） */
export interface RecruitResult {
    /** hero = 英雄本体；shard = 该英雄碎片 */
    kind: 'hero' | 'shard';
    /** kind==='hero'：解锁/转化的英雄 id；kind==='shard'：碎片归属英雄 id */
    heroId: string;
    /** kind==='hero' 且该英雄已拥有（本次转化为碎片）时为 true */
    duplicate?: boolean;
    /** 转化得到的碎片数（duplicate 时有效） */
    shardN?: number;
    tier: RecruitTier;
    /** 展示名 */
    name: string;
    /** 展示图标 */
    ic: string;
    /** 品质档 1~6（卡片描边色，照 tierRank 口径） */
    tierRank: number;
}

/** 碎片资源 id（未收录英雄回退步枪手碎片，保证调用方永远拿到合法键） */
export function shardResId(heroId: string): ResourceId {
    const id = 'shard_' + heroId;
    return (id === 'shard_rifle' || id === 'shard_sniper' || id === 'shard_laser'
        || id === 'shard_radiation') ? (id as ResourceId) : 'shard_rifle';
}

function heroName(heroId: string): string {
    const d = HERO_DEFS.find(h => h.id === heroId);
    return d ? d.name : heroId;
}

/** 未拥有英雄池（招募优先补全图鉴）；空池表示已集齐 */
function unownedPool(owned: string[]): string[] {
    const pool: string[] = [];
    for (const d of HERO_DEFS) {
        if (owned.indexOf(d.id) < 0) {
            pool.push(d.id);
        }
    }
    return pool;
}

/** 随机取一个已拥有英雄（重复转化碎片时的归属） */
function pickOwned(owned: string[]): string {
    return owned.length > 0 ? owned[Math.floor(Math.random() * owned.length)] : 'rifle';
}

/** 组一张碎片包结果 */
function shardResult(tier: 'legend' | 'rare' | 'common', heroId: string): RecruitResult {
    const n = SHARD_PACK[tier];
    return {
        kind: 'shard', heroId, shardN: n, tier,
        name: `${heroName(heroId)}碎片 ×${n}`,
        ic: '🔩',
        tierRank: tier === 'legend' ? 5 : tier === 'rare' ? 3 : 2,
    };
}

/** 组一张英雄本体结果 */
function heroResult(heroId: string, duplicate: boolean): RecruitResult {
    const n = SHARD_PACK.legend;
    return {
        kind: duplicate ? 'shard' : 'hero', heroId,
        duplicate: duplicate || undefined,
        shardN: duplicate ? n : undefined,
        tier: 'hero',
        name: duplicate ? `${heroName(heroId)} ×1 转化为碎片 ×${n}` : heroName(heroId),
        ic: duplicate ? '🔩' : '🎖️',
        tierRank: duplicate ? 5 : 6,
    };
}

/**
 * 掷一次招募（纯函数：UI 预览与落袋共用同一口径，照 trialFloorReward 的做法）。
 * pity = 当前已连续未出本体的抽数；forceHero = 十连保底强制出本体。
 */
export function rollRecruit(pity: number, owned: string[], forceHero = false): RecruitResult {
    const pool = unownedPool(owned);
    // 保底命中或强制：必出英雄本体（池空时转化为随机已拥有英雄的碎片）
    if (forceHero || pity >= RECRUIT_PITY) {
        if (pool.length > 0) {
            return heroResult(pool[Math.floor(Math.random() * pool.length)], false);
        }
        return heroResult(pickOwned(owned), true);
    }
    const r = Math.random();
    if (r < TIER_RATES.hero) {
        if (pool.length > 0) {
            return heroResult(pool[Math.floor(Math.random() * pool.length)], false);
        }
        // 图鉴已集齐：本体档位转为传说碎片包
        return shardResult('legend', pickOwned(owned));
    }
    if (r < TIER_RATES.hero + TIER_RATES.legend) {
        return shardResult('legend', pickOwned(owned));
    }
    if (r < TIER_RATES.hero + TIER_RATES.legend + TIER_RATES.rare) {
        return shardResult('rare', pickOwned(owned));
    }
    return shardResult('common', pickOwned(owned));
}

/**
 * 十连：10 次 rollRecruit；若前 9 抽无英雄本体，第 10 抽强制出本体（十连保底）。
 * 传入的 pity 为起始保底计数，内部逐抽推进（与落袋后的最终 pity 一致）。
 */
export function rollRecruit10(pity: number, owned: string[]): RecruitResult[] {
    const out: RecruitResult[] = [];
    let p = pity;
    // 已拥有池会随本次抽出的英雄增长（同一次十连不重复解锁同一个英雄）
    const ownedNow = owned.slice();
    for (let i = 0; i < 10; i++) {
        const isLast = i === 9;
        const noHeroYet = out.every(x => x.kind !== 'hero');
        const force = isLast && noHeroYet;
        const res = rollRecruit(p, ownedNow, force);
        if (res.kind === 'hero') {
            p = 0;
            ownedNow.push(res.heroId);
        } else {
            p++;
        }
        out.push(res);
    }
    return out;
}

interface RecruitSave {
    /** 累计招募次数（成就/排行榜口径） */
    totalRecruits: number;
    /** 连续未出英雄本体的抽数（保底计数） */
    pity: number;
    /** 各英雄星级（heroId → 0~6） */
    stars: Record<string, number>;
}

export class RecruitSystem {
    private static _inst: RecruitSystem | null = null;
    static get instance(): RecruitSystem {
        if (!this._inst) {
            this._inst = new RecruitSystem();
        }
        return this._inst;
    }

    private static readonly SAVE_KEY = 'zombie-shooter-recruit';

    private _data: RecruitSave = { totalRecruits: 0, pity: 0, stars: {} };

    private constructor() {
        this._load();
    }

    // ================= 查询 =================

    /** 累计招募次数（含十连的每一抽） */
    get totalRecruits(): number {
        return this._data.totalRecruits;
    }

    /** 当前已连续未出英雄本体的抽数 */
    get pity(): number {
        return this._data.pity;
    }

    /** 距保底还差几抽 */
    get pityLeft(): number {
        return Math.max(0, RECRUIT_PITY - this._data.pity);
    }

    /** 某英雄当前星级 0~HERO_STAR_MAX */
    stars(heroId: string): number {
        return Math.min(HERO_STAR_MAX, Math.max(0, this._data.stars[heroId] ?? 0));
    }

    /** 全部已拥有英雄的星级总和（成就/排行口径） */
    get starSum(): number {
        let sum = 0;
        for (const d of HERO_DEFS) {
            sum += this.stars(d.id);
        }
        return sum;
    }

    /** 某英雄碎片数量（碎片存 PlayerResources 的 shard_* 键） */
    shards(heroId: string): number {
        return GameManager.instance.res.get(shardResId(heroId));
    }

    /** 升到下一星所需碎片；已满星返回 0 */
    starCost(heroId: string): number {
        const st = this.stars(heroId);
        return st >= HERO_STAR_MAX ? 0 : STAR_COST[Math.min(STAR_COST.length - 1, st)];
    }

    /** 是否可升星（未满星且碎片充足） */
    canStarUp(heroId: string): boolean {
        const cost = this.starCost(heroId);
        return cost > 0 && this.shards(heroId) >= cost && GameManager.instance.isHeroOwned(heroId);
    }

    // ================= 操作 =================

    /**
     * 升星：扣碎片 + 星级 +1 并落盘；返回新星级（失败返回 null）。
     * 扣碎片走 res.spend（优先落地主存档），再记星级，最后各自落盘。
     */
    starUp(heroId: string): number | null {
        const gm = GameManager.instance;
        if (!gm.isHeroOwned(heroId)) {
            return null;
        }
        const cost = this.starCost(heroId);
        if (cost <= 0 || !gm.res.spend(shardResId(heroId), cost)) {
            return null;
        }
        const next = Math.min(HERO_STAR_MAX, this.stars(heroId) + 1);
        this._data.stars[heroId] = next;
        gm.save();
        this._save();
        return next;
    }

    /**
     * 执行招募：扣钻石（useAd 时改扣广告次数，由调用方在广告回调里调）→ 掷点 → 落袋。
     * count=1 单抽 / count=10 十连（十连保底至少一件稀有以上）。
     * 钻石不足返回 null（useAd 时跳过扣费，由 AdService 计次）。
     */
    recruit(count: 1 | 10, useAd = false): RecruitResult[] | null {
        const gm = GameManager.instance;
        if (!useAd) {
            const price = count === 10 ? RECRUIT_PRICE_10 : RECRUIT_PRICE_1;
            if (!gm.res.spend('diamond', price)) {
                return null;
            }
        }
        const owned = gm.ownedHeroes.slice();
        const results = count === 10
            ? rollRecruit10(this._data.pity, owned)
            : [rollRecruit(this._data.pity, owned)];
        // 落袋：未拥有的英雄进 ownedHeroes，其余转碎片；保底计数按是否出本体推进
        for (const r of results) {
            if (r.kind === 'hero') {
                if (gm.ownedHeroes.indexOf(r.heroId) < 0) {
                    gm.ownedHeroes.push(r.heroId);
                }
                this._data.pity = 0;
            } else {
                if (r.shardN) {
                    gm.res.add(shardResId(r.heroId), r.shardN);
                }
                this._data.pity++;
            }
        }
        this._data.totalRecruits += results.length;
        // 主存档先落（英雄/碎片），再落系统存档，顺序与签到/邮件一致
        gm.save();
        this._save();
        return results;
    }

    // ================= 内部 =================

    private _load(): void {
        if (typeof sys === 'undefined') {
            return;
        }
        try {
            const raw = sys.localStorage.getItem(RecruitSystem.SAVE_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                if (d && typeof d === 'object') {
                    const stars: Record<string, number> = {};
                    if (d.stars && typeof d.stars === 'object') {
                        for (const def of HERO_DEFS) {
                            const v = Math.floor(d.stars[def.id] ?? 0);
                            if (v >= 1 && v <= HERO_STAR_MAX) {
                                stars[def.id] = v;
                            }
                        }
                    }
                    this._data = {
                        totalRecruits: Math.max(0, Math.floor(d.totalRecruits ?? 0)),
                        pity: Math.min(RECRUIT_PITY, Math.max(0, Math.floor(d.pity ?? 0))),
                        stars,
                    };
                }
            }
        } catch {
            // 坏档回默认
        }
    }

    private _save(): void {
        if (typeof sys === 'undefined') {
            return;
        }
        sys.localStorage.setItem(RecruitSystem.SAVE_KEY, JSON.stringify(this._data));
    }
}

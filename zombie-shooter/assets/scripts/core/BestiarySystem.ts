import { sys } from 'cc';

/**
 * 怪物图鉴系统（基地页入口）：
 * - 五种基础怪型（巨石猿/疯狗/獠牙野猪/双足熊/疯鹰）+ 精英变异条目。
 * - 击杀对应怪型自动解锁并累计击杀数；精英怪单独计数（tier=1）。
 * - 未解锁显示剪影 + 「???」，解锁后展示立绘/习性/威胁数值。
 * - 持久化在独立 localStorage 键（与广告/礼包/任务/签到/邮件同口径）。
 */

/** 图鉴条目（数值口径与 WaveData.MOB 工厂一致，静态展示用） */
export interface BestiaryDef {
    id: string;
    name: string;
    /** 立绘资源 key（textures/ 下，MONSTER_ART 同源） */
    art: string;
    /** 行为习性一句话 */
    behavior: string;
    /** 图鉴 flavor 文案 */
    desc: string;
    /** 威胁评级 1~5 星 */
    threat: number;
    /** 首次出现关卡（波次表出处） */
    debut: string;
    /** 基准数值（首次出场水准，与 MONSTERS 基表一致） */
    stats: { hp: number; speed: number; touchDamage: number };
}

export const BESTIARY_DEFS: BestiaryDef[] = [
    {
        id: 'stoneape', name: '巨石猿', art: 'monsters/stoneape', threat: 1, debut: '第 1 关',
        behavior: '直线追车 · 普通型',
        desc: '岩石与苔藓构成的巨猿，尸潮里最常见的先锋。单体威胁不大，但成群涌来时会撕开车阵的每一条缝。',
        stats: { hp: 100, speed: 135, touchDamage: 10 },
    },
    {
        id: 'dog', name: '疯犬群', art: 'monsters/dog', threat: 2, debut: '第 3 关',
        behavior: '成群冲刺 · 群体型',
        desc: '四只一组的变异疯狗，低血高速贴地狂奔。移动速度极快，技能清场慢一拍就会咬穿防线。',
        stats: { hp: 60, speed: 248, touchDamage: 6 },
    },
    {
        id: 'boar', name: '獠牙野猪', art: 'monsters/boar', threat: 3, debut: '第 4 关',
        behavior: '蓄力冲刺 · 爆发型',
        desc: '贴近后会前蹄刨地蓄力定身（集火窗口！），随后以极高速度撞向车尾。单次啃咬伤害全图最高，优先击杀。',
        stats: { hp: 300, speed: 120, touchDamage: 32 },
    },
    {
        id: 'bear', name: '双足熊', art: 'monsters/bear', threat: 4, debut: '第 6 关',
        behavior: '高血肉盾 · 坦克型',
        desc: '直立行走的变异巨熊，血量是普通怪的十倍以上、步伐极慢。检验队伍持续输出能力，集火磨血是唯一解。',
        stats: { hp: 1200, speed: 63, touchDamage: 26 },
    },
    {
        id: 'eagle', name: '疯鹰', art: 'monsters/eagle', threat: 3, debut: '第 5 关',
        behavior: '侧翼俯冲 · 空袭型',
        desc: '从战场的左右两侧斜线俯冲直扑车尾，无视正面车道。飞行单位移速极快，需要留意两侧盲区。',
        stats: { hp: 90, speed: 293, touchDamage: 8 },
    },
];

export function bestiaryDef(id: string): BestiaryDef | undefined {
    return BESTIARY_DEFS.find(b => b.id === id);
}

interface BestiarySave {
    kills: Record<string, number>;
    eliteKills: number;
}

export class BestiarySystem {
    private static _inst: BestiarySystem | null = null;
    static get instance(): BestiarySystem {
        if (!this._inst) {
            this._inst = new BestiarySystem();
        }
        return this._inst;
    }

    private static readonly SAVE_KEY = 'zombie-shooter-bestiary';

    private _kills: Record<string, number> = {};
    private _eliteKills = 0;

    private constructor() {
        this._load();
    }

    // ================= 查询 =================

    /** 某怪型累计击杀数 */
    kills(id: string): number {
        return this._kills[id] ?? 0;
    }

    /** 精英怪累计击杀数 */
    get eliteKills(): number {
        return this._eliteKills;
    }

    /** 是否已解锁（击杀过至少一只） */
    unlocked(id: string): boolean {
        return (this._kills[id] ?? 0) > 0;
    }

    /** 图鉴完成度：已解锁条目 / 总条目 */
    completion(): { done: number; total: number } {
        let done = 0;
        for (const d of BESTIARY_DEFS) {
            if (this.unlocked(d.id)) {
                done++;
            }
        }
        return { done, total: BESTIARY_DEFS.length };
    }

    // ================= 打点 =================

    /** 击杀打点：普通怪按怪型计数；精英怪另计入 eliteKills（同型也计） */
    trackKill(monsterId: string, elite: boolean): void {
        if (!bestiaryDef(monsterId)) {
            return;
        }
        let changed = false;
        if (!this._kills[monsterId]) {
            // 解锁瞬间（首杀）
            this._kills[monsterId] = 1;
            changed = true;
        } else {
            this._kills[monsterId]++;
        }
        if (elite) {
            this._eliteKills++;
            changed = true;
        }
        if (changed) {
            this._save();
        }
    }

    private _load(): void {
        if (typeof sys === 'undefined') {
            return;
        }
        try {
            const raw = sys.localStorage.getItem(BestiarySystem.SAVE_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                if (d && typeof d === 'object') {
                    this._kills = d.kills ?? {};
                    this._eliteKills = Math.max(0, Math.floor(d.eliteKills ?? 0));
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
        sys.localStorage.setItem(BestiarySystem.SAVE_KEY, JSON.stringify({
            kills: this._kills,
            eliteKills: this._eliteKills,
        }));
    }
}

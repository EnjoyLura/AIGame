import { sys } from 'cc';

/**
 * 全局数据单例：一局战斗的运行时数据 + 账号持久化数据。
 * 纯数据类不挂节点；后续金币、装备、关卡解锁等持久化字段都加在这里。
 */
export class GameManager {
    private static _inst: GameManager | null = null;
    static get instance(): GameManager {
        if (!this._inst) {
            this._inst = new GameManager();
        }
        return this._inst;
    }

    private static readonly SAVE_KEY = 'zombie-shooter-save';

    // ---- 运行时数据（每局重置） ----
    wave = 0;
    kills = 0;
    /** 团队经验与等级（局内升级三选一驱动） */
    xp = 0;
    level = 1;

    // ---- 持久化数据 ----
    bestWave = 0;
    totalKills = 0;

    /** 升到下一级所需经验：L1→5，L2→9，L3→13……线性递增 */
    xpToNext(level: number): number {
        return 5 + (level - 1) * 4;
    }

    /** 累加经验；返回是否发生了升级（可连升，调用方逐次处理） */
    addXp(value: number): boolean {
        this.xp += value;
        let leveled = false;
        while (this.xp >= this.xpToNext(this.level)) {
            this.xp -= this.xpToNext(this.level);
            this.level++;
            leveled = true;
        }
        return leveled;
    }

    resetRun(): void {
        this.wave = 0;
        this.kills = 0;
        this.xp = 0;
        this.level = 1;
    }

    save(): void {
        const data = {
            bestWave: this.bestWave,
            totalKills: this.totalKills,
        };
        sys.localStorage.setItem(GameManager.SAVE_KEY, JSON.stringify(data));
    }

    load(): void {
        const raw = sys.localStorage.getItem(GameManager.SAVE_KEY);
        if (!raw) {
            return;
        }
        try {
            const data = JSON.parse(raw);
            this.bestWave = data.bestWave ?? 0;
            this.totalKills = data.totalKills ?? 0;
        } catch {
            // 存档损坏时静默重置
        }
    }
}

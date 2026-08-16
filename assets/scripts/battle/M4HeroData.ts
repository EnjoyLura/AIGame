export type HeroId = 'ranger' | 'wind' | 'pulse' | 'frost';

export interface HeroDefinition {
    id: HeroId;
    name: string;
    role: string;
    origin: '武装干员' | '进化者';
    color: readonly [number, number, number];
    normalDamage: number;
    normalInterval: number;
    normalProjectiles: number;
    skillDamage: number;
    skillCooldown: number;
    skillTargets: number;
    ultimateDamage: number;
    ultimateChargePerKill: number;
    ultimateChargePerSecond: number;
    controlDuration: number;
    repairOnSkill: number;
}

export const M4_HERO_ROSTER = [
    {
        id: 'ranger',
        name: '巡航者',
        role: '单体爆发',
        origin: '武装干员',
        color: [239, 122, 61],
        normalDamage: 28,
        normalInterval: 0.36,
        normalProjectiles: 1,
        skillDamage: 64,
        skillCooldown: 7,
        skillTargets: 4,
        ultimateDamage: 105,
        ultimateChargePerKill: 12,
        ultimateChargePerSecond: 2.5,
        controlDuration: 1.4,
        repairOnSkill: 0,
    },
    {
        id: 'wind',
        name: '风岚',
        role: '群攻控制',
        origin: '进化者',
        color: [107, 191, 117],
        normalDamage: 18,
        normalInterval: 0.42,
        normalProjectiles: 2,
        skillDamage: 48,
        skillCooldown: 8,
        skillTargets: 6,
        ultimateDamage: 82,
        ultimateChargePerKill: 11,
        ultimateChargePerSecond: 2.8,
        controlDuration: 2.1,
        repairOnSkill: 0,
    },
    {
        id: 'pulse',
        name: '脉冲者',
        role: '链式爆发',
        origin: '武装干员',
        color: [67, 177, 205],
        normalDamage: 22,
        normalInterval: 0.4,
        normalProjectiles: 2,
        skillDamage: 72,
        skillCooldown: 9,
        skillTargets: 5,
        ultimateDamage: 122,
        ultimateChargePerKill: 13,
        ultimateChargePerSecond: 2.2,
        controlDuration: 1.2,
        repairOnSkill: 0,
    },
    {
        id: 'frost',
        name: '霜翎',
        role: '减速辅助',
        origin: '进化者',
        color: [125, 184, 225],
        normalDamage: 15,
        normalInterval: 0.46,
        normalProjectiles: 1,
        skillDamage: 38,
        skillCooldown: 8,
        skillTargets: 99,
        ultimateDamage: 74,
        ultimateChargePerKill: 10,
        ultimateChargePerSecond: 3.1,
        controlDuration: 3.2,
        repairOnSkill: 14,
    },
] satisfies readonly HeroDefinition[];

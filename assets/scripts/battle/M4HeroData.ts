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
        normalDamage: 32,
        normalInterval: 0.4,
        normalProjectiles: 1,
        skillDamage: 86,
        skillCooldown: 7.5,
        skillTargets: 3,
        ultimateDamage: 150,
        ultimateChargePerKill: 14,
        ultimateChargePerSecond: 2.2,
        controlDuration: 1.5,
        repairOnSkill: 0,
    },
    {
        id: 'wind',
        name: '风岚',
        role: '群攻控制',
        origin: '进化者',
        color: [107, 191, 117],
        normalDamage: 17,
        normalInterval: 0.42,
        normalProjectiles: 2,
        skillDamage: 44,
        skillCooldown: 7.5,
        skillTargets: 8,
        ultimateDamage: 92,
        ultimateChargePerKill: 10,
        ultimateChargePerSecond: 2.8,
        controlDuration: 2.4,
        repairOnSkill: 0,
    },
    {
        id: 'pulse',
        name: '脉冲者',
        role: '链式爆发',
        origin: '武装干员',
        color: [67, 177, 205],
        normalDamage: 20,
        normalInterval: 0.42,
        normalProjectiles: 2,
        skillDamage: 76,
        skillCooldown: 8.5,
        skillTargets: 5,
        ultimateDamage: 128,
        ultimateChargePerKill: 13,
        ultimateChargePerSecond: 2.3,
        controlDuration: 1.3,
        repairOnSkill: 0,
    },
    {
        id: 'frost',
        name: '霜翎',
        role: '减速辅助',
        origin: '进化者',
        color: [125, 184, 225],
        normalDamage: 16,
        normalInterval: 0.45,
        normalProjectiles: 1,
        skillDamage: 26,
        skillCooldown: 8.5,
        skillTargets: 99,
        ultimateDamage: 72,
        ultimateChargePerKill: 10,
        ultimateChargePerSecond: 3,
        controlDuration: 3.4,
        repairOnSkill: 18,
    },
] satisfies readonly HeroDefinition[];

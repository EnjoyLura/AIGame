export type M5UpgradeId = 'hero' | 'equipment' | 'vehicle';

export interface M5Profile {
    version: 1;
    supplies: number;
    samples: number;
    heroTrainingLevel: number;
    equipmentLevel: number;
    vehicleLevel: number;
    completedMissions: number;
    bestKills: number;
    lastClaimedAt: number;
}

export interface M5CombatModifiers {
    damageMultiplier: number;
    vehicleHpBonus: number;
}

export interface M5IdleReward {
    supplies: number;
    elapsedMinutes: number;
}

const IDLE_SUPPLIES_PER_MINUTE = 2;
const IDLE_REWARD_CAP = 120;
const UPGRADE_COSTS: Record<M5UpgradeId, number> = {
    hero: 30,
    equipment: 45,
    vehicle: 40,
};

export function createDefaultProfile(now: number): M5Profile {
    return {
        version: 1,
        supplies: 70,
        samples: 55,
        heroTrainingLevel: 1,
        equipmentLevel: 1,
        vehicleLevel: 1,
        completedMissions: 0,
        bestKills: 0,
        lastClaimedAt: now - 20 * 60 * 1000,
    };
}

export function sanitizeProfile(value: Partial<M5Profile> | null | undefined, now: number): M5Profile {
    const fallback = createDefaultProfile(now);
    if (!value || value.version !== 1) {
        return fallback;
    }
    return {
        version: 1,
        supplies: Math.max(0, Math.floor(value.supplies ?? fallback.supplies)),
        samples: Math.max(0, Math.floor(value.samples ?? fallback.samples)),
        heroTrainingLevel: Math.max(1, Math.floor(value.heroTrainingLevel ?? 1)),
        equipmentLevel: Math.max(1, Math.floor(value.equipmentLevel ?? 1)),
        vehicleLevel: Math.max(1, Math.floor(value.vehicleLevel ?? 1)),
        completedMissions: Math.max(0, Math.floor(value.completedMissions ?? 0)),
        bestKills: Math.max(0, Math.floor(value.bestKills ?? 0)),
        lastClaimedAt: Math.min(now, Math.max(0, Math.floor(value.lastClaimedAt ?? now))),
    };
}

export function calculateIdleReward(profile: M5Profile, now: number): M5IdleReward {
    const elapsedMinutes = Math.min(IDLE_REWARD_CAP / IDLE_SUPPLIES_PER_MINUTE, Math.floor(Math.max(0, now - profile.lastClaimedAt) / 60000));
    return {
        supplies: elapsedMinutes * IDLE_SUPPLIES_PER_MINUTE,
        elapsedMinutes,
    };
}

export function claimIdleReward(profile: M5Profile, now: number): { profile: M5Profile; reward: M5IdleReward } {
    const reward = calculateIdleReward(profile, now);
    return {
        profile: { ...profile, supplies: profile.supplies + reward.supplies, lastClaimedAt: now },
        reward,
    };
}

export function upgradeProfile(profile: M5Profile, upgradeId: M5UpgradeId): M5Profile | null {
    const cost = UPGRADE_COSTS[upgradeId];
    if (upgradeId === 'hero' || upgradeId === 'equipment') {
        if (profile.samples < cost) {
            return null;
        }
        return {
            ...profile,
            samples: profile.samples - cost,
            heroTrainingLevel: profile.heroTrainingLevel + (upgradeId === 'hero' ? 1 : 0),
            equipmentLevel: profile.equipmentLevel + (upgradeId === 'equipment' ? 1 : 0),
        };
    }
    if (profile.supplies < cost) {
        return null;
    }
    return { ...profile, supplies: profile.supplies - cost, vehicleLevel: profile.vehicleLevel + 1 };
}

export function completeMission(profile: M5Profile, won: boolean, kills: number): { profile: M5Profile; supplies: number; samples: number } {
    const supplies = won ? 42 : 8;
    const samples = won ? 24 : 0;
    return {
        profile: {
            ...profile,
            supplies: profile.supplies + supplies,
            samples: profile.samples + samples,
            completedMissions: profile.completedMissions + (won ? 1 : 0),
            bestKills: Math.max(profile.bestKills, kills),
        },
        supplies,
        samples,
    };
}

export function getCombatModifiers(profile: M5Profile): M5CombatModifiers {
    return {
        damageMultiplier: 1 + (profile.heroTrainingLevel - 1) * 0.08 + (profile.equipmentLevel - 1) * 0.05,
        vehicleHpBonus: (profile.vehicleLevel - 1) * 24,
    };
}

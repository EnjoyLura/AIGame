import { sys } from 'cc';
import { M5Profile, createDefaultProfile, sanitizeProfile } from './M5Profile';

const PROFILE_KEY = 'arid-convoy.m5.profile.v1';

export class M5ProfileStore {
    public load(now: number): M5Profile {
        try {
            const raw = sys.localStorage.getItem(PROFILE_KEY);
            return raw ? sanitizeProfile(JSON.parse(raw) as Partial<M5Profile>, now) : createDefaultProfile(now);
        } catch {
            return createDefaultProfile(now);
        }
    }

    public save(profile: M5Profile): void {
        sys.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    }
}

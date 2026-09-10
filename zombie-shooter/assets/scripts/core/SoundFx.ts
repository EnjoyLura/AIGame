/**
 * 程序合成音效（WebAudio，零素材）：《末日航线》风格重设计——
 * 短促、低沉、偏"打击感"的合成声。微信小游戏无 WebAudio 时自动静音。
 * 所有发声走统一入口并做 45ms 节流，避免同帧大量重复音爆音。
 */
import { sys } from 'cc';

type FxName = 'shoot' | 'laser' | 'hit' | 'kill' | 'bigkill' | 'vehicleHit' | 'ready' | 'ui' | 'boom' | 'ult' | 'coin' | 'buy';

export class SoundFx {
    private static _ctx: AudioContext | null = null;
    private static _muted = false;
    private static _last: Record<string, number> = {};
    /** 主音量 0~1（设置界面可调，持久化） */
    private static _volume = 1;
    private static _ready = false;
    private static readonly SET_KEY = 'zombie-shooter-sound';

    /** 首次用户交互后调用（浏览器自动播放策略） */
    static unlock(): void {
        if (this._ctx) {
            return;
        }
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AC) {
            return;
        }
        this._ctx = new AC() as AudioContext;
    }

    /** 从 localStorage 恢复音量/静音设置（启动时调用一次） */
    static init(): void {
        if (SoundFx._ready || typeof sys === 'undefined') {
            return;
        }
        try {
            const raw = sys.localStorage.getItem(SoundFx.SET_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                SoundFx._muted = !!d.muted;
                SoundFx._volume = typeof d.volume === 'number' ? Math.min(1, Math.max(0, d.volume)) : 1;
            }
        } catch {
            // 坏档用默认值
        }
        SoundFx._ready = true;
    }

    static setMuted(m: boolean): void {
        this._muted = m;
        SoundFx._persist();
    }

    static get muted(): boolean {
        return this._muted;
    }

    static setVolume(v: number): void {
        this._volume = Math.min(1, Math.max(0, v));
        SoundFx._persist();
    }

    static get volume(): number {
        return this._volume;
    }

    private static _persist(): void {
        if (!SoundFx._ready || typeof sys === 'undefined') {
            return;
        }
        try {
            sys.localStorage.setItem(SoundFx.SET_KEY, JSON.stringify({ muted: SoundFx._muted, volume: SoundFx._volume }));
        } catch {
            // 音效设置非关键数据，写入失败静默
        }
    }

    private static _tone(f1: number, f2: number, dur: number, vol: number, type: OscillatorType): void {
        const ctx = this._ctx;
        if (!ctx || this._muted) {
            return;
        }
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        const t = ctx.currentTime;
        o.frequency.setValueAtTime(f1, t);
        o.frequency.exponentialRampToValueAtTime(Math.max(f2, 20), t + dur);
        g.gain.setValueAtTime(vol * this._volume, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t);
        o.stop(t + dur + 0.02);
    }

    private static _noise(dur: number, vol: number, freq: number, type: BiquadFilterType = 'lowpass'): void {
        const ctx = this._ctx;
        if (!ctx || this._muted) {
            return;
        }
        const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) {
            d[i] = Math.random() * 2 - 1;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const f = ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        const g = ctx.createGain();
        const t = ctx.currentTime;
        g.gain.setValueAtTime(vol * this._volume, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(f);
        f.connect(g);
        g.connect(ctx.destination);
        src.start(t);
        src.stop(t + dur + 0.02);
    }

    /** 播放一个音效（45ms 同名节流） */
    static play(name: FxName): void {
        if (!this._ctx || this._muted) {
            return;
        }
        const now = performance.now();
        if (this._last[name] && now - this._last[name] < 45) {
            return;
        }
        this._last[name] = now;
        switch (name) {
            case 'shoot':
                // 步枪：高频短噪（清脆的"哒"）
                this._noise(0.05, 0.05, 2600, 'highpass');
                break;
            case 'laser':
                // 激光：短促方波下扫
                this._tone(960, 720, 0.05, 0.025, 'square');
                break;
            case 'hit':
                // 命中：中频短噪
                this._noise(0.03, 0.035, 1500, 'highpass');
                break;
            case 'kill':
                // 击杀：中低频噪声 + 短促下滑（"噗"）
                this._noise(0.12, 0.09, 700);
                this._tone(260, 120, 0.1, 0.05, 'triangle');
                break;
            case 'bigkill':
                // 击杀大型怪：低频轰鸣
                this._noise(0.4, 0.16, 300);
                this._tone(120, 45, 0.35, 0.12, 'sine');
                break;
            case 'vehicleHit':
                // 载具被咬：低频锯齿（沉闷撞击）
                this._tone(140, 70, 0.1, 0.09, 'sawtooth');
                this._noise(0.08, 0.06, 500);
                break;
            case 'ready':
                // 大招就绪：上行双音
                this._tone(520, 1040, 0.16, 0.07, 'square');
                break;
            case 'ui':
                this._tone(660, 880, 0.07, 0.08, 'square');
                break;
            case 'boom':
                // 子弹爆炸：短促低频闷响（比击杀更沉、更快收尾）
                this._noise(0.14, 0.1, 420);
                this._tone(200, 70, 0.14, 0.08, 'sine');
                break;
            case 'ult':
                // 技能/大招施法：上扫锯齿波 + 低频冲击（施法"释放感"）
                this._tone(160, 950, 0.45, 0.13, 'sawtooth');
                this._noise(0.3, 0.12, 320);
                break;
            case 'coin':
                // 金币到账：清脆上行双叮
                this._tone(880, 880, 0.06, 0.07, 'square');
                setTimeout(() => this._tone(1320, 1320, 0.09, 0.07, 'square'), 60);
                break;
            case 'buy':
                // 购买确认：中频确认音
                this._tone(520, 780, 0.12, 0.08, 'triangle');
                break;
        }
    }
}

/**
 * 程序合成音效（WebAudio，零素材）：《末日航线》风格重设计——
 * 短促、低沉、偏"打击感"的合成声。微信小游戏无 WebAudio 时自动静音。
 * 所有发声走统一入口并做 45ms 节流，避免同帧大量重复音爆音。
 */
type FxName = 'shoot' | 'laser' | 'hit' | 'kill' | 'bigkill' | 'vehicleHit' | 'ready' | 'ui';

export class SoundFx {
    private static _ctx: AudioContext | null = null;
    private static _muted = false;
    private static _last: Record<string, number> = {};

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

    static setMuted(m: boolean): void {
        this._muted = m;
    }

    static get muted(): boolean {
        return this._muted;
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
        g.gain.setValueAtTime(vol, t);
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
        g.gain.setValueAtTime(vol, t);
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
        }
    }
}

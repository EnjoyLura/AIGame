#!/usr/bin/env python3
"""AI 行走视频 → 精灵图：
ffmpeg 解码 → 64px 灰度帧差自相关检测步态周期 → 均匀取 N 帧 →
绿幕色键（绿优势通道）→ 水印区擦除 → 帧间颜色匹配（抑制 AI 亮度漂移）→
内容裁剪 → 帧格高度上限缩放 → 底对齐统一帧格横向打包。

用法：
  python tools/video_to_sheet.py <in.mp4> <out.png> [帧数=6] [绿优势阈值=30] [帧格高上限=256]
依赖：ffmpeg 在 PATH；PIL。
"""
import math
import subprocess
import sys
from PIL import Image, ImageFilter

TARGET = 64  # 周期检测用的降采样尺寸


def read_frames(path: str):
    """ffmpeg 解码为 rgb24 原始帧流，逐帧产出 PIL Image。"""
    probe = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0',
         '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path],
        capture_output=True, text=True, check=True).stdout.strip()
    w, h = (int(v) for v in probe.split(','))
    proc = subprocess.Popen(
        ['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
        stdout=subprocess.PIPE, bufsize=w * h * 3 * 4)
    frame_bytes = w * h * 3
    while True:
        raw = proc.stdout.read(frame_bytes)
        if len(raw) < frame_bytes:
            break
        yield Image.frombytes('RGB', (w, h), raw)
    proc.stdout.close()
    proc.wait()


def cycle_length(smalls: list[Image.Image]) -> int:
    """帧差信号的自相关峰 = 一个步态周期的帧数。"""
    n = len(smalls)
    if n < 8:
        return n
    px = [list(im.convert('L').getdata()) for im in smalls]
    diff = [sum(abs(a - b) for a, b in zip(px[i], px[i + 1])) / len(px[i]) for i in range(n - 1)]
    best_lag, best_score = n // 3, -1.0
    for lag in range(4, max(5, n // 2)):
        m = min(len(diff) - lag, n - lag)
        if m < 4:
            break
        score = sum(diff[i] * diff[i + lag] for i in range(m)) / m
        if score > best_score:
            best_score, best_lag = score, lag
    return best_lag


def detect_bg(frame: Image.Image) -> tuple[int, int, int]:
    """四角 7x7 邻域中位色 = 背景底色（绿幕/品红幕/任意纯色幕）。"""
    w, h = frame.size
    corners = []
    for cx, cy in ((4, 4), (w - 5, 4), (4, h - 5), (w - 5, h - 5)):
        vals = []
        for dx in range(-3, 4):
            for dy in range(-3, 4):
                x = min(w - 1, max(0, cx + dx))
                y = min(h - 1, max(0, cy + dy))
                vals.append(frame.getpixel((x, y))[:3])
        vals.sort(key=lambda c: c[0] + c[1] + c[2])
        corners.append(vals[len(vals) // 2])
    n = len(corners)
    return (sum(p[0] for p in corners) // n,
            sum(p[1] for p in corners) // n,
            sum(p[2] for p in corners) // n)


def key_bg(frame: Image.Image, bg: tuple[int, int, int], thresh: int) -> Image.Image:
    """背景色键：按检测到的幕色分派——
    绿幕：绿优势（g - max(r,b) > 阈值）；品红幕：min(r,b) - g > 阈值；
    其余纯色幕：到背景色的曼哈顿距离兜底。右下角水印区直接清零。"""
    r0, g0, b0 = bg
    if g0 - max(r0, b0) > 25:
        mode = 'green'
    elif min(r0, b0) - g0 > 25:
        mode = 'magenta'
    else:
        mode = 'chroma'
    rgba = frame.convert('RGBA')
    w, h = rgba.size
    px = rgba.load()
    dist_limit = thresh * 3
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            hit = False
            if mode == 'green':
                hit = g - max(r, b) > thresh and g > 60
            elif mode == 'magenta':
                hit = min(r, b) - g > thresh and r > 60 and b > 60
            else:
                hit = abs(r - r0) + abs(g - g0) + abs(b - b0) < dist_limit
            if hit:
                px[x, y] = (0, 0, 0, 0)
    # 生成工具水印（右下角）
    for y in range(int(h * 0.86), h):
        for x in range(int(w * 0.74), w):
            px[x, y] = (0, 0, 0, 0)
    alpha = rgba.getchannel('A').filter(ImageFilter.GaussianBlur(0.7))
    rgba.putalpha(alpha)
    return rgba


def match_colors(frames: list[Image.Image]) -> None:
    """帧间颜色匹配：AI 视频存在全局亮度/色度漂移（某帧明显偏暗）。
    以全部帧主体区域（alpha>128）平均色为基准，对每帧做逐通道增益（限幅 0.82~1.22）。"""
    means: list[tuple[float, float, float]] = []
    for f in frames:
        px = f.load()
        w, h = f.size
        rs = gs = bs = cnt = 0
        for y in range(0, h, 2):
            for x in range(0, w, 2):
                r, g, b, a = px[x, y]
                if a > 128:
                    rs += r; gs += g; bs += b; cnt += 1
        means.append((rs / cnt, gs / cnt, bs / cnt) if cnt else (255.0, 255.0, 255.0))
    ref = tuple(sum(m[c] for m in means) / len(means) for c in range(3))
    for f, m in zip(frames, means):
        gains = []
        for c in range(3):
            g = ref[c] / max(1.0, m[c])
            g = max(0.75, min(1.35, g))
            gains.append(g)
        px = f.load()
        w, h = f.size
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a == 0:
                    continue
                px[x, y] = (min(255, round(r * gains[0])),
                            min(255, round(g * gains[1])),
                            min(255, round(b * gains[2])), a)


def refine_cycle(smalls: list[Image.Image], lag: int) -> int:
    """半周期校验：交替步态（左/右脚）的自相关常锁在真实周期的一半，
    接环时姿态镜像错开产生跳帧。直接比较 帧[i] 与 帧[i+L] 的灰度平均绝对差，
    若 2 倍/3 倍周期显著（>15%）更相似则翻倍。"""
    def sim(L: int) -> float:
        n = len(smalls)
        m = n - L
        if m < 4:
            return 1e9
        step = max(1, m // 24)
        tot = cnt = 0
        for i in range(0, m, step):
            a = list(smalls[i].convert('L').getdata())
            b = list(smalls[i + L].convert('L').getdata())
            tot += sum(abs(x - y) for x, y in zip(a, b)) / len(a)
            cnt += 1
        return tot / max(1, cnt)

    best, best_s = lag, sim(lag)
    for k in (2, 3):
        L2 = lag * k
        if L2 >= len(smalls) - 4:
            break
        s = sim(L2)
        if s < best_s * 0.85:
            best, best_s = L2, s
    return best


def main() -> None:
    src, dst = sys.argv[1], sys.argv[2]
    n_frames = int(sys.argv[3]) if len(sys.argv) > 3 else 6
    thresh = int(sys.argv[4]) if len(sys.argv) > 4 else 30
    cell_cap = int(sys.argv[5]) if len(sys.argv) > 5 else 256

    frames = list(read_frames(src))
    print(f'decoded {len(frames)} frames')
    # 掐头去尾：AI 视频首尾常带过渡帧（从参考图渐入、光照漂移），首帧色差的根源
    trim = max(2, round(len(frames) * 0.05))
    if len(frames) > trim * 3:
        frames = frames[trim:len(frames) - trim]
    bg = detect_bg(frames[0])
    print(f'bg color = {bg}')
    smalls = [f.resize((TARGET, TARGET)) for f in frames]
    cycle = cycle_length(smalls)
    cycle = refine_cycle(smalls, cycle)
    print(f'walk cycle ≈ {cycle} frames')
    # 一个周期内均匀取 n_frames 帧（从周期起点开始，覆盖完整循环）
    idxs = [round(i * cycle / n_frames) % len(frames) for i in range(n_frames)]
    keyed = [key_bg(frames[i], bg, thresh) for i in idxs]
    # 出画检测：采样帧的主体 bbox 触到视频边缘 = 源视频把角色裁掉了（翅膀/肢体缺失）
    for k, f in zip(idxs, keyed):
        b = f.getbbox()
        if b and (b[0] <= 2 or b[1] <= 2 or b[2] >= f.width - 2 or b[3] >= f.height - 2):
            print(f'警告: 帧 {k} 主体触到画面边缘（bbox={b}），源视频可能把肢体裁掉了——'
                  f'建议重新生成视频：角色缩小、四周留白')
    cropped = []
    for f in keyed:
        bbox = f.getbbox()
        if bbox:
            f = f.crop(bbox)
        cropped.append(f)
    match_colors(cropped)
    # 帧格高度上限：视频分辨率远高于游戏内显示尺寸，按上限等比缩小省内存
    cell_h = max(f.height for f in cropped)
    if cell_cap > 0 and cell_h > cell_cap:
        k = cell_cap / cell_h
        cropped = [f.resize((max(1, round(f.width * k)), cell_cap), Image.LANCZOS) for f in cropped]
    cell_w = max(f.width for f in cropped)
    cell_h = max(f.height for f in cropped)
    sheet = Image.new('RGBA', (cell_w * len(cropped), cell_h), (0, 0, 0, 0))
    for i, f in enumerate(cropped):
        sheet.paste(f, (i * cell_w + (cell_w - f.width) // 2, cell_h - f.height), f)
    sheet.save(dst, optimize=True)
    print(f'ok: {dst} {len(cropped)}帧 cell={cell_w}x{cell_h} (取帧索引 {idxs})')


if __name__ == '__main__':
    main()

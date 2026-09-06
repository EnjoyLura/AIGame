#!/usr/bin/env python3
"""AI 行走视频 → 精灵图：
ffmpeg 解码 → 64px 灰度帧差自相关检测步态周期 → 均匀取 N 帧 →
绿幕色键（绿优势通道）→ 水印区擦除 → 内容裁剪 → 底对齐统一帧格横向打包。

用法：
  python tools/video_to_sheet.py <in.mp4> <out.png> [帧数=6] [绿优势阈值=30]
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


def key_green(frame: Image.Image, thresh: int) -> Image.Image:
    """绿优势色键：g 明显高于 r/b 的像素判为背景；右下角水印区直接清零。"""
    rgba = frame.convert('RGBA')
    w, h = rgba.size
    px = rgba.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if g - max(r, b) > thresh and g > 60:
                px[x, y] = (0, 0, 0, 0)
    # 豆包水印（右下角）
    for y in range(int(h * 0.86), h):
        for x in range(int(w * 0.74), w):
            px[x, y] = (0, 0, 0, 0)
    alpha = rgba.getchannel('A').filter(ImageFilter.GaussianBlur(0.7))
    rgba.putalpha(alpha)
    return rgba


def main() -> None:
    src, dst = sys.argv[1], sys.argv[2]
    n_frames = int(sys.argv[3]) if len(sys.argv) > 3 else 6
    thresh = int(sys.argv[4]) if len(sys.argv) > 4 else 30

    frames = list(read_frames(src))
    print(f'decoded {len(frames)} frames')
    smalls = [f.resize((TARGET, TARGET)) for f in frames]
    cycle = cycle_length(smalls)
    print(f'walk cycle ≈ {cycle} frames')
    # 一个周期内均匀取 n_frames 帧（从周期起点开始，覆盖完整循环）
    idxs = [round(i * cycle / n_frames) % len(frames) for i in range(n_frames)]
    keyed = [key_green(frames[i], thresh) for i in idxs]
    cropped = []
    for f in keyed:
        bbox = f.getbbox()
        if bbox:
            f = f.crop(bbox)
        cropped.append(f)
    cell_w = max(f.width for f in cropped)
    cell_h = max(f.height for f in cropped)
    sheet = Image.new('RGBA', (cell_w * len(cropped), cell_h), (0, 0, 0, 0))
    for i, f in enumerate(cropped):
        sheet.paste(f, (i * cell_w + (cell_w - f.width) // 2, cell_h - f.height), f)
    sheet.save(dst, optimize=True)
    print(f'ok: {dst} {len(cropped)}帧 cell={cell_w}x{cell_h} (取帧索引 {idxs})')


if __name__ == '__main__':
    main()

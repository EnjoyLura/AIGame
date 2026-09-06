#!/usr/bin/env python3
"""AI 生成行走序列图条 → 可播放的精灵图：
品红抠底 → 按 alpha 列间隙自动切帧 → 统一帧格（底对齐，脚踩同一条地平线）→ 横向打包固定帧数。

用法：
  python tools/slice_walk_sheet.py <输入.png> <输出.png> [目标帧数=6] [容差=40]
"""
import sys
from PIL import Image

TARGET_ALPHA = 20  # 高于此值视为内容像素


def remove_all_magenta(img: Image.Image, tol: int) -> Image.Image:
    img = img.convert('RGBA')
    w, h = img.size
    px = img.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if r >= 255 - tol * 2 and b >= 255 - tol * 2 and g <= tol * 2:
                px[x, y] = (0, 0, 0, 0)
    return img


def split_frames(img: Image.Image, target_n: int) -> list[Image.Image]:
    """按透明列间隙切分；间隙不足时回退等宽切分。"""
    w, h = img.size
    alpha = img.getchannel('A')
    px = alpha.load()
    col_has = [any(px[x, y] > TARGET_ALPHA for y in range(0, h, 2)) for x in range(w)]
    # 连续内容列段
    runs: list[tuple[int, int]] = []
    start = None
    for x, has in enumerate(col_has):
        if has and start is None:
            start = x
        elif not has and start is not None:
            runs.append((start, x))
            start = None
    if start is not None:
        runs.append((start, w))
    # 过滤噪点段（宽度 < 图宽 4%）
    runs = [(a, b) for a, b in runs if b - a >= w * 0.04]
    frames: list[Image.Image] = []
    if len(runs) == target_n:
        frames = [img.crop((a, 0, b, h)) for a, b in runs]
    elif len(runs) > target_n:
        # 取最宽的 n 段（按左边界排序）
        runs = sorted(sorted(runs, key=lambda r: r[1] - r[0], reverse=True)[:target_n])
        frames = [img.crop((a, 0, b, h)) for a, b in runs]
    else:
        # 间隙检测失败：对整条内容区等分
        if runs:
            a, b = runs[0][0], runs[-1][1]
        else:
            a, b = 0, w
        step = (b - a) / target_n
        frames = [img.crop((round(a + i * step), 0, round(a + (i + 1) * step), h)) for i in range(target_n)]
    # 单帧内容裁剪
    out = []
    for f in frames:
        bbox = f.getbbox()
        if bbox:
            f = f.crop(bbox)
        out.append(f)
    return out


def main() -> None:
    src, dst = sys.argv[1], sys.argv[2]
    target_n = int(sys.argv[3]) if len(sys.argv) > 3 else 6
    tol = int(sys.argv[4]) if len(sys.argv) > 4 else 40

    img = remove_all_magenta(Image.open(src), tol)
    frames = split_frames(img, target_n)
    # 帧数补齐/截断到目标值（重复末帧补齐，循环仍顺滑）
    while len(frames) < target_n:
        frames.append(frames[-1])
    frames = frames[:target_n]

    cell_w = max(f.width for f in frames)
    cell_h = max(f.height for f in frames)
    sheet = Image.new('RGBA', (cell_w * len(frames), cell_h), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        # 底对齐 + 水平居中：脚踩同一地平线，行走不上下漂
        sheet.paste(f, (i * cell_w + (cell_w - f.width) // 2, cell_h - f.height), f)
    sheet.save(dst, optimize=True)
    print(f'ok: {dst} {len(frames)}帧 cell={cell_w}x{cell_h}')


if __name__ == '__main__':
    main()

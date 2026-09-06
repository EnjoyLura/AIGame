#!/usr/bin/env python3
"""一行多个图标 → 逐个切出独立 PNG：品红抠底 → alpha 列间隙切分 → 内容裁剪 → 等比缩放。

用法：
  python tools/slice_row.py <输入.png> <输出前缀> <数量> [边长=128] [容差=40]
"""
import sys
from PIL import Image
from process_icon import remove_all_magenta


def main() -> None:
    src, dst_prefix = sys.argv[1], sys.argv[2]
    count = int(sys.argv[3])
    size = int(sys.argv[4]) if len(sys.argv) > 4 else 128
    tol = int(sys.argv[5]) if len(sys.argv) > 5 else 40

    img = remove_all_magenta(Image.open(src), tol)
    w, h = img.size
    px = img.getchannel('A').load()
    col_has = [any(px[x, y] > 20 for y in range(0, h, 2)) for x in range(w)]
    runs = []
    start = None
    for x, has in enumerate(col_has):
        if has and start is None:
            start = x
        elif not has and start is not None:
            runs.append((start, x))
            start = None
    if start is not None:
        runs.append((start, w))
    runs = [(a, b) for a, b in runs if b - a >= w * 0.03]
    print(f'detected {len(runs)} runs (want {count})')
    if len(runs) < count:
        print('ERROR: 帧间间隙不足，无法切分')
        return
    runs = sorted(sorted(runs, key=lambda r: r[1] - r[0], reverse=True)[:count])
    for i, (a, b) in enumerate(sorted(runs)):
        f = img.crop((a, 0, b, h))
        bbox = f.getbbox()
        if bbox:
            f = f.crop(bbox)
        k = size / max(f.width, f.height)
        if k < 1:
            f = f.resize((max(1, round(f.width * k)), max(1, round(f.height * k))), Image.LANCZOS)
        canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        canvas.paste(f, ((size - f.width) // 2, (size - f.height) // 2), f)
        canvas.save(f'{dst_prefix}_{i}.png', optimize=True)
        print(f'ok: {dst_prefix}_{i}.png')


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
绿幕抠像：把 gen-output 里的纯绿底生图转成透明底 RGBA，可选缩放。
配合 tools/gen_image.py（绿幕 prompt 出图）→ 本工具 → assets/resources/textures/。

用法：
  python tools/chroma_key.py <in.png> <out.png> [--size 128] [--tol 60] [--margin 4]

参数：
  --size N    等比缩放到最大边 N 像素（LANCZOS），0 = 不缩放
  --tol N     绿色判定容差（G 显著高于 R/B 的阈值，默认 60）
  --margin N  抠像后按非透明像素包围盒裁切并留 N% 边距（默认 4，出 128 图标不顶边）
"""
import argparse
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from png_out import save_png, QUANT_NOTE  # noqa: E402


def key_green(im: Image.Image, tol: int) -> Image.Image:
    im = im.convert('RGBA')
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            # 绿幕：G 分量显著高于 R 与 B
            if g > tol and g - r > tol and g - b > tol:
                px[x, y] = (r, g, b, 0)
            elif g - r > tol // 2 and g - b > tol // 2:
                # 边缘半绿：去绿染（despill），保留形状
                px[x, y] = (min(r, (r + b) // 2), min(g, (r + g + b) // 3), b, a)
    return im


def crop_margin(im: Image.Image, margin_pct: int) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    bw, bh = r - l, b - t
    mx, my = bw * margin_pct // 100, bh * margin_pct // 100
    side = max(bw + 2 * mx, bh + 2 * my)
    cx, cy = (l + r) // 2, (t + b) // 2
    box = (max(0, cx - side // 2), max(0, cy - side // 2),
           min(im.width, cx + side // 2), min(im.height, cy + side // 2))
    return im.crop(box)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('src', type=Path)
    ap.add_argument('dst', type=Path)
    ap.add_argument('--size', type=int, default=0)
    ap.add_argument('--tol', type=int, default=60)
    ap.add_argument('--margin', type=int, default=4)
    ap.add_argument('--colors', type=int, default=256,
                    help='落盘前压到几色索引（0=不压）。省 76~90%，而 optimize 只省 0.2%。'
                         + QUANT_NOTE)
    args = ap.parse_args()

    im = Image.open(args.src)
    im = key_green(im, args.tol)
    im = crop_margin(im, args.margin)
    if args.size > 0:
        side = max(im.size)
        if side != args.size:
            im = im.resize((args.size, args.size), Image.Resampling.LANCZOS)
    args.dst.parent.mkdir(parents=True, exist_ok=True)
    raw, new = save_png(im, args.dst, args.colors)
    print(f'{args.src.name} -> {args.dst} {im.size[0]}x{im.size[1]} alpha={im.mode}'
          f'  {raw/1024:.0f}KB→{new/1024:.0f}KB（省 {(1-new/raw)*100:.0f}%）')
    return 0


if __name__ == '__main__':
    sys.exit(main())

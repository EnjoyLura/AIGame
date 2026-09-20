#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""量九宫格件的「四角该切到哪」：读一张切片件，报出圆头/描边的实际占位。

用法：python tools/measure_nine.py <piece.png> [--alpha 24]
输出：
  - 条高、上下描边厚（取水平中点处，从边缘向内找到第一个「突变」行）
  - 左/右圆头宽度（逐列取最上不透明行，找到该值收敛到平台的位置）
  - 建议 border-image-slice（T R B L）与按宿主高度换算的 border-image-width
"""
import argparse
import sys
from pathlib import Path

from PIL import Image


def profile(im: Image.Image, alpha: int):
    w, h = im.size
    px = im.load()
    top = []      # 每列最上的不透明行
    left = []     # 每行最左的不透明列
    for x in range(w):
        t = next((y for y in range(h) if px[x, y][3] > alpha), h)
        b = next((y for y in range(h) if px[x, h - 1 - y][3] > alpha), h)
        top.append((t, b))
    for y in range(h):
        l = next((x for x in range(w) if px[x, y][3] > alpha), w)
        r = next((x for x in range(w) if px[w - 1 - x, y][3] > alpha), w)
        left.append((l, r))
    return top, left


def cap_width(colh: list) -> int:
    """圆头宽度：柱高从边缘爬到「满高的 98%」所用的列数（胶囊/圆头件的几何就是这条曲线）。"""
    full = max(colh)
    for x, v in enumerate(colh):
        if v >= full * 0.98:
            return x
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('piece')
    ap.add_argument('--alpha', type=int, default=24)
    ap.add_argument('--hosts', default='20,25,28', help='宿主条高设计像素，逗号分隔')
    args = ap.parse_args()

    im = Image.open(args.piece).convert('RGBA')
    w, h = im.size
    top, left = profile(im, args.alpha)
    colh = [h - t - b for t, b in top]
    roww = [w - l - r for l, r in left]
    t_mid, b_mid = top[w // 2]
    l_mid, r_mid = left[h // 2]
    cap_l, cap_r = cap_width(colh), cap_width(list(reversed(colh)))
    print(f'源件 {w}x{h}  不透明体最高 {max(colh)}px  最宽 {max(roww)}px')
    print(f'  中点处：上留白 {t_mid}px  下留白 {b_mid}px  左留白 {l_mid}px  右留白 {r_mid}px')
    print(f'  左圆头宽 {cap_l}px  右圆头宽 {cap_r}px（柱高爬到满高 98% 所需列数）')
    tb = max(t_mid, b_mid)
    lr = max(cap_l, cap_r)
    print(f'  => 建议 border-image-slice: {tb} {lr} {tb} {lr} fill')
    for hs in [int(x) for x in args.hosts.split(',')]:
        s = hs / max(colh)
        print(f'  宿主条高 {hs}px → border-image-width: calc({round(tb * s, 1)}px * var(--pu,1)) '
              f'calc({round(lr * s, 1)}px * var(--pu,1))')
    return 0


if __name__ == '__main__':
    sys.exit(main())

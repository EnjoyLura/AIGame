#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把若干贴图拼成一张带格线的对照表，便于一次目检多件（棋盘底以暴露抠穿的洞）。"""
import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw

CELL = 160
BG_A = (46, 46, 46)
BG_B = (70, 70, 70)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out')
    ap.add_argument('imgs', nargs='+')
    ap.add_argument('--cols', type=int, default=4)
    args = ap.parse_args()

    rows = (len(args.imgs) + args.cols - 1) // args.cols
    sheet = Image.new('RGB', (args.cols * CELL, rows * (CELL + 18)), (28, 28, 28))
    dr = ImageDraw.Draw(sheet)
    for i, p in enumerate(args.imgs):
        x = (i % args.cols) * CELL
        y = (i // args.cols) * (CELL + 18)
        for cy in range(y, y + CELL, 16):
            for cx in range(x, x + CELL, 16):
                idx = ((cx - x) // 16 + (cy - y) // 16) % 2
                dr.rectangle([cx, cy, cx + 15, cy + 15], fill=BG_A if idx else BG_B)
        im = Image.open(p).convert('RGBA')
        im.thumbnail((CELL - 8, CELL - 8))
        sheet.paste(im, (x + 4, y + 4), im)
        dr.text((x + 4, y + CELL - 2), Path(p).stem[:22], fill=(230, 230, 230))
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.out)
    print(f'OK {args.out}  {sheet.size[0]}x{sheet.size[1]}  {len(args.imgs)} 件')
    return 0


if __name__ == '__main__':
    sys.exit(main())

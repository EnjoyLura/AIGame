#!/usr/bin/env python3
"""按内容外接框裁掉等比缩放留下的黑边，再按目标宽高比居中裁一次。
用途：生图接口不接受 4:1 这类超宽比例（上限 3:1），先让它出 2:1、画面居中带黑边，
再裁回原资产的宽高比，保证与同 key 的另一态**比例一致**（换图不换观感）。

用法：python tools/crop_letterbox.py <in.png> <out.png> <宽:高，如 4:1> [--pad 0]
"""
import argparse
import sys

from PIL import Image


def content_box(img: Image.Image, thresh: int = 12):
    g = img.convert('L')
    w, h = g.size
    px = g.load()
    minx, miny, maxx, maxy = w, h, 0, 0
    found = False
    for y in range(h):
        row = False
        for x in range(0, w, 2):
            if px[x, y] > thresh:
                row = True
                break
        if row:
            found = True
            if y < miny:
                miny = y
            if y > maxy:
                maxy = y
    for x in range(w):
        col = False
        for y in range(miny, maxy + 1, 2):
            if px[x, y] > thresh:
                col = True
                break
        if col:
            if x < minx:
                minx = x
            if x > maxx:
                maxx = x
    if not found:
        raise SystemExit('整张图都是黑的，裁不了')
    return minx, miny, maxx + 1, maxy + 1


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('dst')
    ap.add_argument('aspect', help='目标宽高比，如 4:1')
    ap.add_argument('--pad', type=int, default=0, help='内容框四周再留这么多像素')
    a = ap.parse_args()
    aw, ah = [float(v) for v in a.aspect.replace('：', ':').split(':')]
    img = Image.open(a.src).convert('RGBA')
    x0, y0, x1, y1 = content_box(img)
    print(f'内容外接框 = ({x0},{y0})-({x1},{y1})  {x1 - x0}x{y1 - y0}  原图 {img.size}')
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    # 以内容框为准，取能装下它的最贴近目标比例的窗口（只裁不补，避免把黑边带进去）
    cw, ch = x1 - x0 + a.pad * 2, y1 - y0 + a.pad * 2
    if cw / ch > aw / ah:
        cw = int(ch * aw / ah)
    else:
        ch = int(cw * ah / aw)
    left, top = int(cx - cw / 2), int(cy - ch / 2)
    out = img.crop((left, top, left + cw, top + ch))
    out.save(a.dst, optimize=True)
    print(f'ok: {a.dst} {out.size}  比例 {out.size[0] / out.size[1]:.3f}（目标 {aw / ah:.3f}）')
    return 0


if __name__ == '__main__':
    sys.exit(main())

#!/usr/bin/env python3
"""把一张件的不透明区降采样成 ASCII 图，用眼睛定「四角要包到哪为止」。

九宫格切片的取值要靠看出来：斜角、铆钉、包边这些**不能被拉伸**的东西必须整块留在角区里，
中段只留平整牌面。ASCII 图上一眼能看见铆钉占第几格，比读数字快。
"""
import sys
from PIL import Image

RAMP = ' .:-=+*#%@'

for p in sys.argv[1:]:
    im = Image.open(p).convert('RGBA')
    w, h = im.size
    a = im.getchannel('A').resize((64, 32), Image.BILINEAR)
    px = a.load()
    print(f'\n{p}  源 {w}x{h}   每格 = {w/64:.0f}x{h/32:.0f} 源像素')
    for y in range(32):
        row = ''.join(RAMP[min(9, px[x, y] * 10 // 256)] for x in range(64))
        print(f'  {y:>2}|{row}|')

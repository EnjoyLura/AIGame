#!/usr/bin/env python3
"""看一张件的不透明包围盒随阈值怎么变——判断透明边里到底是阴影、绿底残留还是真空。

用途：九宫格板渲染出来「板比盒子矮一截」时，先确认源件是不是带了一大圈 alpha=0 的透明边
（切片脚本按全通道取 bbox，抠绿后残留的 RGB 会让包围盒虚胖到整格）。
"""
import sys
from PIL import Image

for p in sys.argv[1:]:
    im = Image.open(p).convert('RGBA')
    w, h = im.size
    print(p, f'{w}x{h}')
    a = im.getchannel('A')
    for th in (0, 8, 40, 128, 220):
        b = a.point(lambda v, t=th: 255 if v > t else 0).getbbox()
        print(f'   alpha>{th:>3}: {b}  ({b[2] - b[0]}x{b[3] - b[1]})' if b else f'   alpha>{th:>3}: 空')
    bgraw = im.getbbox()
    print(f'   全通道 getbbox（切片脚本用的）: {bgraw}  ({bgraw[2] - bgraw[0]}x{bgraw[3] - bgraw[1]})')
    px = im.load()
    print('   采样 上边中', px[w // 2, 20], ' 左边中', px[20, h // 2], ' 中心', px[w // 2, h // 2])

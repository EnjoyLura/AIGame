#!/usr/bin/env python3
"""量一张去字底板：不透明包围盒 + 每条边上的「平直段」，给出 border-image-slice 建议。

slice 的正确取法：四角必须整块落在**有画的东西**里（切到透明边=板端透明=字溢出板面），
中段必须是平整可拉伸的牌面。
用法：python tools/measure_plate.py a.png b.png ...
"""
import sys
from PIL import Image


def analyze(path):
    im = Image.open(path).convert('RGBA')
    w, h = im.size
    a = im.getchannel('A')
    px = a.load()
    # 不透明包围盒（>8 抗锯齿软边不算内容）
    xs = [x for x in range(w) if any(px[x, y] > 8 for y in range(0, h, 2))]
    ys = [y for y in range(h) if any(px[x, y] > 8 for x in range(0, w, 2))]
    l, r, t, b = xs[0], xs[-1], ys[0], ys[-1]
    # 角区：从包围盒角往里走，找「四边都还满着」的最大正方形边长
    #   左列 l..l+k 的每一行都要有像素覆盖到中线 → 简化：取包围盒高度里，最左列的连续不透明段
    def col_span(x):
        run, best, best_s = 0, 0, h // 2
        for y in range(h):
            if px[x, y] > 8:
                run += 1
                if run > best:
                    best, best_s = run, y - run + 1
            else:
                run = 0
        return best, best_s
    # 板端（包围盒左右各 1/8 宽）的不透明高度 vs 中线不透明高度
    mid_h, _ = col_span(w // 2)
    l_h, _ = col_span(l + 2)
    r_h, _ = col_span(r - 2)
    # 建议 slice：左右取「包围盒外透明 + 斜角」的总和，上下取中线高度的一半往里收
    slice_lr = max(l, 0) + int((r - l) * 0.10)   # 透明边 + 斜角区
    slice_tb = max(t, 0) + int((b - t) * 0.30)
    print(f'{path}\n  源 {w}x{h}  内容包围盒 L{l} R{r} T{t} B{b}  '
          f'({r-l+1}x{b-t+1}，占宽 {(r-l+1)/w:.0%} 占高 {(b-t+1)/h:.0%})')
    print(f'  不透明高：左端 {l_h}px  中线 {mid_h}px  右端 {r_h}px  → 板端比板身矮 {mid_h-min(l_h,r_h)}px（斜角/透明边）')
    print(f'  现档 slice 16 会切到：左 {l}px 右 {w-1-r}px 上 {t}px 下 {h-1-b}px 的**透明区**'
          f'{"  ← 板端透明" if l > 16 or t > 16 else ""}')
    print(f'  建议 slice ≈ \'{slice_tb} {slice_lr} {slice_tb} {slice_lr} fill\'（透明边+斜角进角区）\n')


for p in sys.argv[1:]:
    analyze(p)

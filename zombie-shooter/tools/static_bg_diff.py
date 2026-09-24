# 静止战场差异定位：对 static_bg_probe 采的 a/b/c 三帧做逐行差异分析。
# 判读口径：底图若以 ~195px/s 滚动，1.5s 间隔 = 全帧竖移 ~292 设备像素，
# 除大片纯色天空带外每一行都会大幅失配；静止底图则差异只集中在怪物/HUD/飘字所在的少数行。
import sys
from PIL import Image, ImageChops

base = 'gen-output/static-bg-probe'
a = Image.open(f'{base}/a.png').convert('RGB')
b = Image.open(f'{base}/b.png').convert('RGB')
c = Image.open(f'{base}/c.png').convert('RGB')

def row_profile(x, y):
    d = ImageChops.difference(x, y)
    g = d.convert('L')
    w, h = g.size
    px = g.load()
    rows = []
    for ry in range(h):
        s = 0
        for rx in range(0, w, 4):
            s += px[rx, ry]
        rows.append(s / (w // 4))
    return rows

def report(tag, rows):
    h = len(rows)
    hot = sum(1 for v in rows if v > 12)
    mild = sum(1 for v in rows if v > 4)
    print(f'{tag}: 行均差>12 的行占比 {hot/h*100:.1f}%  >4 的行占比 {mild/h*100:.1f}%  全帧均值 {sum(rows)/h:.2f}')
    # 差异热点行段（连续 >12 的段，最多列 8 段）
    segs = []
    y0 = None
    for i, v in enumerate(rows):
        if v > 12 and y0 is None:
            y0 = i
        elif v <= 12 and y0 is not None:
            segs.append((y0, i, max(rows[y0:i])))
            y0 = None
    if y0 is not None:
        segs.append((y0, h, max(rows[y0:h])))
    segs.sort(key=lambda s: -s[2])
    for y0, y1, peak in segs[:8]:
        print(f'   热点行段 y {y0}-{y1} (高{y1-y0}) 峰值 {peak:.0f}')

report('A vs B', row_profile(a, b))
report('A vs C', row_profile(a, c))
report('B vs C', row_profile(b, c))

#!/usr/bin/env python3
"""把几张等比图并排拼一张评审图（竖构图用，指定输出高度）。

contact_sheet.py 是给"棋盘底看抠像损伤"用的，格子小；这里要的是能看清构图与色调的大图。
用法：python tools/montage.py out.png --height 900 a.png b.png ...
"""
import sys
from PIL import Image

out = sys.argv[1]
h = int(sys.argv[sys.argv.index('--height') + 1])
files = [a for a in sys.argv[2:] if not a.startswith('--') and a != str(h)]

ims = []
for f in files:
    im = Image.open(f).convert('RGB')
    w = round(im.width * h / im.height)
    ims.append(im.resize((w, h), Image.LANCZOS))
tot = sum(i.width for i in ims) + 8 * (len(ims) - 1)
canvas = Image.new('RGB', (tot, h), (24, 24, 24))
x = 0
for i in ims:
    canvas.paste(i, (x, 0))
    x += i.width + 8
canvas.save(out)
print(f'wrote {out}  {canvas.size}  ({len(ims)} 格，每格 {h} 高)')

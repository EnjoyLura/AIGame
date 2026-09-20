#!/usr/bin/env python3
"""Region crop + upscale for eyeballing a screenshot. Usage: crop_at.py in.png x y w h out.png [scale]"""
import sys
from PIL import Image

src, x, y, w, h, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), sys.argv[6]
scale = int(sys.argv[7]) if len(sys.argv) > 7 else 3
im = Image.open(src).convert('RGB')
print('source size', im.size)
box = (max(0, x), max(0, y), min(im.width, x + w), min(im.height, y + h))
c = im.crop(box)
c = c.resize((c.width * scale, c.height * scale), Image.NEAREST)
c.save(out)
print('wrote', out, c.size, 'from', box)

"""取景图裁一块并放大——斜切条族这种 18~29px 高的薄条，在 1080×1920 整页图里根本看不出斜度。

用法：python tools/crop_png.py <in.png> <out.png> <x> <y> <w> <h> [放大倍数=2]
      坐标取的是**整页截图的像素**（page_shot 用 deviceScaleFactor=2，所以 CSS 坐标 ×2）。
"""
import sys

from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')
src, dst = sys.argv[1], sys.argv[2]
x, y, w, h = (int(v) for v in sys.argv[3:7])
k = float(sys.argv[7]) if len(sys.argv) > 7 else 2

im = Image.open(src).convert('RGBA')
x, y = max(0, x), max(0, y)
w, h = min(w, im.width - x), min(h, im.height - y)
piece = im.crop((x, y, x + w, y + h))
if k != 1:
    piece = piece.resize((int(w * k), int(h * k)), Image.NEAREST)
piece.save(dst)
print(f'{src.split("/")[-1]} 裁 ({x},{y}) {w}x{h} ×{k} -> {dst}')

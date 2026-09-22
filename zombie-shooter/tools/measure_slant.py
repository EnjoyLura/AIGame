"""量斜切条族：每张切片件的斜度、斜边水平位移占宽度的百分比，以及厚底边占高度的百分比。

为什么要有它：这一族的九宫格档**不能靠估**。border-image 的左右角区必须整块包住斜边
（斜边一旦被划进可拉伸的中段，拉长后两端斜度会被拉平，条子读成"斜了一下又直了"），
所以横向切片值必须 ≥ 斜边水平位移；而上下切片值必须 ≥ 顶高光 + 底厚边那两条，
否则拉伸时最先被吃掉的就是"厚度"。这两个数只能量出来，猜不出来。

用法：python tools/measure_slant.py <png ...>
"""
import sys
from pathlib import Path

from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')


def opaque_cols(row):
    return [x for x, a in enumerate(row) if a > 16]


def measure(path: Path):
    with Image.open(path) as im:
        rgba = im.convert('RGBA')
        a = rgba.getchannel('A')
        w, h = a.size
        px = a.load()
        # 第一条/最后一条**有内容**的行（透明边可能让最上/最下整行 alpha=0）
        rows = [y for y in range(h) if any(px[x, y] > 16 for x in range(w))]
        if len(rows) < 4:
            return None
        top, bot = rows[0], rows[-1]
        tc = opaque_cols([px[x, top] for x in range(w)])
        bc = opaque_cols([px[x, bot] for x in range(w)])
        run = abs(tc[0] - bc[0])                      # 斜边水平位移（左端：顶行最左 vs 底行最左）
        # 底厚边：从下往上数，连续比顶边暗的那一截
        rgb = rgba.convert('RGB')
        def band_luma(y):
            vals = [rgb.getpixel((x, y)) for x in range(tc[0], tc[-1], max(1, (tc[-1] - tc[0]) // 120))]
            return sum(0.299 * r + 0.587 * g + 0.114 * b for r, g, b in vals) / len(vals)
        luma_top = band_luma(top + 1)
        edge = 0
        for y in range(bot, bot - h // 3, -1):
            if band_luma(y) < luma_top * 0.72:
                edge = bot - y + 1
            else:
                break
        return dict(size=(w, h), run=run, run_pct=run / w * 100, height=h,
                    thick=edge, thick_pct=edge / h * 100)


for p in sys.argv[1:]:
    r = measure(Path(p))
    name = Path(p).as_posix().split('textures/')[-1].split('r44_probe/')[-1]
    if not r:
        print(f'{name:<34} 太小，量不出')
        continue
    print(f'{name:<34} {r["size"][0]}x{r["size"][1]:<5} 斜边位移={r["run"]:>3}px ({r["run_pct"]:>4.1f}% 宽)  '
          f'底厚={r["thick"]:>3}px ({r["thick_pct"]:>4.1f}% 高)  '
          f'→ 横向切片至少 {max(r["run_pct"] * 1.25, 3):.0f}%  纵向至少 {max(r["thick_pct"] * 1.4, 8):.0f}%')

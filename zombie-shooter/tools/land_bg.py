#!/usr/bin/env python3
"""把生成的背景图裁到目标比例、缩到目标尺寸、存 JPG。

为什么必须转：road 是 720×1280 的 JPG、266KB；生图原片是 1024×1792 的 PNG、单张约 3MB，
四张直接进包会让主包凭空多出十几 MB，而同批进来的件全是 JPG。`_applyRoadArt` 按 frame.rect
的宽高比算铺法，所以比例对齐 road 之后滚动与镜像拼接的算法不用改一行。

默认口径 = 战斗底图（对齐 `scenes/road.jpg`）。主城页面底不走画布 Sprite 而是 DOM
`background-size: cover`，屏上一直显示、真机 DPR 2~3，所以另给一档尺寸（见下方 hub 用法）。
用法：python tools/land_bg.py <src.png> <dst.jpg> [quality=82] [宽 高]
  战斗底图：python tools/land_bg.py gen.png assets/resources/textures/scenes/bg_x.jpg
  主城页面底：python tools/land_bg.py gen.png .../hub_camp.jpg 78 1080 1920
"""
import sys
from pathlib import Path

from PIL import Image

REF_W, REF_H = 720, 1280  # scenes/road.jpg 的实测尺寸：底图的口径以它为准


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    q = int(sys.argv[3]) if len(sys.argv) > 3 else 82
    # 第 4/5 个参数覆盖目标尺寸；不给就沿用战斗底图口径（REF_W×REF_H）
    w_dst, h_dst = (int(sys.argv[4]), int(sys.argv[5])) if len(sys.argv) > 5 else (REF_W, REF_H)
    im = Image.open(src).convert('RGB')
    target = w_dst / h_dst
    cur = im.width / im.height
    if cur > target:                      # 太宽 → 左右各裁一点（保住中央车道）
        w = round(im.height * target)
        x0 = (im.width - w) // 2
        im = im.crop((x0, 0, x0 + w, im.height))
    elif cur < target:                    # 太高 → 上下各裁一点（上下本就要求无通栏特征）
        h = round(im.width / target)
        y0 = (im.height - h) // 2
        im = im.crop((0, y0, im.width, y0 + h))
    im = im.resize((w_dst, h_dst), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, 'JPEG', quality=q, optimize=True)
    print(f'OK {dst.name}  {w_dst}x{h_dst}  {dst.stat().st_size // 1024}KB  (源 {src.name})')
    return 0


if __name__ == '__main__':
    sys.exit(main())

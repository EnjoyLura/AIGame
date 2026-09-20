#!/usr/bin/env python3
"""九宫格板件的透明边体检 / 裁切。

为什么需要它：`tools/slice_sheet.py` 的 extract() 把每件**方化**成「最长边 × (1+margin)」的正方形
画布再居中贴回。方形图标这么干没问题，横长的板件（按钮底板 / 弹层板 / 行卡）因此上下各带一大圈
alpha=0 的透明边。九宫格的切片档（16/24px）小于这圈透明边时，透明行被划进**可拉伸的中段**，
板面就只渲染出宿主盒子高的百分之几十——文字从板的上下沿溢出去，看着像"板太短"。

用法：
    python tools/trim_alpha.py --check 文件...      # 只报告，不动图
    python tools/trim_alpha.py --apply 文件...      # 按 alpha 包围盒裁掉透明边（原地覆盖）

判据：透明边占该轴源尺寸 > --limit（默认 6%）才报/才裁——几像素的抗锯齿软边留着，不是问题。
"""
import argparse
import sys
from pathlib import Path

from PIL import Image

ALPHA_MIN = 8  # 低于此 alpha 视为透明（软阴影在 8 以上，保留）


def margins(im: Image.Image):
    a = im.getchannel('A').point(lambda v: 255 if v > ALPHA_MIN else 0)
    b = a.getbbox()
    if not b:
        raise ValueError('整张全透明')
    w, h = im.size
    return b, (b[0], w - b[2], b[1], h - b[3])  # 左 右 上 下


def main() -> int:
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--check', action='store_true')
    g.add_argument('--apply', action='store_true')
    ap.add_argument('--limit', type=float, default=6.0, help='透明边占该轴百分比阈值')
    ap.add_argument('files', nargs='+')
    args = ap.parse_args()

    bad = 0
    for p in args.files:
        path = Path(p)
        im = Image.open(path).convert('RGBA')
        w, h = im.size
        bbox, (ml, mr, mt, mb) = margins(im)
        pl, pr = ml / w * 100, mr / w * 100
        pt, pb = mt / h * 100, mb / h * 100
        worst = max(pl, pr, pt, pb)
        flag = '超' if worst > args.limit else ' ok'
        print(f'[{flag}] {path}  源 {w}x{h}  内容 {bbox[2]-bbox[0]}x{bbox[3]-bbox[1]}  '
              f'透明边 左{ml}({pl:.0f}%) 右{mr}({pr:.0f}%) 上{mt}({pt:.0f}%) 下{mb}({pb:.0f}%)')
        if worst <= args.limit:
            continue
        bad += 1
        if args.apply:
            out = im.crop(bbox)
            out.save(path)
            print(f'      → 裁到 {out.width}x{out.height}')
    print(f'\n{"APPLY" if args.apply else "CHECK"} 完成：{len(args.files)} 件，'
          f'透明边超 {args.limit:.0f}% 的 {bad} 件')
    return 0 if args.check else (1 if bad and args.check else 0)


if __name__ == '__main__':
    sys.exit(main())

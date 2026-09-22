"""把板件的**牌面**提亮/压暗，但**不动暗边**——九宫格板那圈"厚底边"和描边是它 2.5D 的全部信息量，
整体乘一个 brightness 会连暗边一起提亮，厚度就读没了（这一条是本轮踩出来的）。

为什么需要它：斜切条族的金板（ui/strip/diff_on）实测牌面均值 #976d25，
落字无论用亮奶油色（4.37:1）还是暗藏青色（3.28:1）都够不到 4.5:1 —— 中间调是"没有好字色"的那一档。
正确解法是把**牌面本身**推到亮金那一侧，让暗字重新成立（暗字压亮金才是这款商业游戏里"选中"的读法），
而不是继续挪字色。

按亮度**分位线性分配增益**（默认 10% 分位以下不动、80% 分位以上吃满 gain，中间线性过渡）：
越暗的像素提得越少，所以底厚边与描边基本原样、牌面与高光抬起来，明暗相对关系不被压平。
⚠ 第一版这里写的是"亮度 ≥ max*0.55 才叫牌面"，结果**只碰到 8% 的像素**（max 是最亮那颗高光点，
拿它当基准等于把整片牌面都当成暗边保护起来了），数值几乎不动却报"✅ 过 4.5"——
一个改了没反应的参数比没有参数更危险。二值门限的另一头同样错：门槛放低就会连底厚边一起提亮，
厚度读没了。所以换成按分位过渡。

用法：
  python tools/tune_plate_face.py <png> --gain 1.45 --text '#16263f'          # 只报数，不落盘
  python tools/tune_plate_face.py <png> --gain 1.45 --text '#16263f' --apply  # 落盘（原件同目录留 .bak）
"""
import argparse
import sys
from pathlib import Path

from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')


def srgb2lin(v):
    v /= 255.0
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def lin2srgb(l):
    v = l * 12.92 if l <= 0.0031308 else 1.055 * (l ** (1 / 2.4)) - 0.055
    return max(0, min(255, round(v * 255)))


def rel_lum(rgb):
    r, g, b = (srgb2lin(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = rel_lum(a), rel_lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def hexrgb(s):
    s = s.lstrip('#')
    return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('png')
    ap.add_argument('--gain', type=float, required=True)
    ap.add_argument('--text', default=None, help='要压在这块板上的字色，如 #16263f')
    ap.add_argument('--lo', type=float, default=0.10, help='亮度分位：比它更暗的像素一律不动（描边/底厚边/投影）')
    ap.add_argument('--hi', type=float, default=0.80, help='亮度分位：比它更亮的像素吃满 gain，中间线性过渡')
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()

    im = Image.open(args.png).convert('RGBA')
    px = im.load()
    w, h = im.size
    coords = [(x, y) for y in range(h) for x in range(w) if px[x, y][3] > 200]
    srt = sorted(rel_lum(px[x, y][:3]) for x, y in coords)
    lo = srt[int(len(srt) * args.lo)]
    hi = srt[min(len(srt) - 1, int(len(srt) * args.hi))]
    hit = 0
    out = Image.new('RGBA', (w, h))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            op[x, y] = (r, g, b, a)
            if a <= 200:
                continue
            # **按亮度线性分配增益**，不是"够亮就整片乘、够暗就不碰"：
            # 二值门限要么把底厚边一起提亮（厚度读没了），要么只碰到一小撮像素（改了等于没改）。
            # 分位区间从 lo 到 hi，暗端增益=1（不动）、亮端吃满 gain，中间过渡——相对明暗关系原样保留。
            t = max(0.0, min(1.0, (rel_lum((r, g, b)) - lo) / max(1e-6, hi - lo)))
            k = 1 + (args.gain - 1) * t
            if abs(k - 1) < 0.01:
                continue
            op[x, y] = (lin2srgb(min(1.0, srgb2lin(r) * k)),
                        lin2srgb(min(1.0, srgb2lin(g) * k)),
                        lin2srgb(min(1.0, srgb2lin(b) * k)), a)
            hit += 1
    newpx = [c for c in out.getdata() if c[3] > 200]
    newlum = [rel_lum(c[:3]) for c in newpx]
    print(f'{Path(args.png).name}  改动 {hit}/{len(coords)} 不透明像素（分位 lo={lo:.4f} hi={hi:.4f}）  '
          f'均值亮度 {sum(sorted(rel_lum(px[x, y][:3]) for x, y in coords)) / len(coords):.4f} -> '
          f'{sum(newlum) / len(newlum):.4f}')
    if args.text:
        t = hexrgb(args.text)
        fb = tuple(round(sum(px[x, y][i] for x, y in coords) / len(coords)) for i in range(3))
        fa = tuple(round(sum(c[i] for c in newpx) / len(newpx)) for i in range(3))
        ca = contrast(fa, t)
        print(f'  字色 {args.text}：原板面 {contrast(fb, t):.2f}:1  {fb}  ->  新板面 {ca:.2f}:1  {fa}  '
              + ('✅ 过 4.5' if ca >= 4.5 else '❌ 仍不够'))
    if args.apply:
        bak = Path(args.png).with_suffix('.png.bak')
        if not bak.exists():
            im.save(bak, 'PNG')
            print(f'  原件留档 {bak.name}')
        out.save(args.png)
        print(f'  已落盘 {args.png}')
    else:
        print('  （试算，未落盘；加 --apply 才写）')


main()

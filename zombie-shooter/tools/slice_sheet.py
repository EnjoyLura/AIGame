#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
素材表切片：一次性生成的一整张图标素材图（同风格同光源）→ 整表抠绿 →
连通域识别逐件提取 → 裁切/方化/缩放 → 直接落盘到 textures 槽位（换图不换 key）。

配合 tools/gen_image.py（素材表 prompt + 纯绿底）使用：
  python tools/gen_image.py --image art-spec/game_art_benchmark2.png \
    --prompt "一张…图标素材图，3×3 网格…，纯绿色背景" --size 2048x2048 --basename r3_sheet
  python tools/slice_sheet.py ../gen-output/r3_sheet_XXXX.png \
    --slots ui/res_gold:128,ui/res_diamond:128,...   # 顺序 = 图内行优先（从左到右、从上到下）

原理：绿→alpha 后对不透明区域做连通域标记（先膨胀把图标散件并成一件），
按行聚类、行内按 x 排序，与 --slots 一一对应；小噪点剔除，--expect 校验件数。
"""
import argparse
import sys
from pathlib import Path

from PIL import Image, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from chroma_key import key_green  # noqa: E402


def mask_label_blobs(mask_img: Image.Image, dilate: int = 6):
    """二值掩码 → 膨胀合并散件 → 连通域标记（下行采样加速）→ 返回全分辨率包围盒列表。"""
    small = mask_img.resize((mask_img.width // 4, mask_img.height // 4), Image.BILINEAR)
    if dilate:
        small = small.filter(ImageFilter.MaxFilter(dilate * 2 + 1))
    w, h = small.size
    px = small.load()
    seen = [[False] * w for _ in range(h)]
    blobs = []
    for sy in range(h):
        for sx in range(w):
            if not px[sx, sy] or seen[sy][sx]:
                continue
            # BFS
            stack = [(sx, sy)]
            seen[sy][sx] = True
            minx = maxx = sx
            miny = maxy = sy
            n = 0
            while stack:
                x, y = stack.pop()
                n += 1
                minx, maxx = min(minx, x), max(maxx, x)
                miny, maxy = min(miny, y), max(maxy, y)
                for nx, ny in ((x+1,y),(x-1,y),(x,y+1),(x,y-1),(x+1,y+1),(x-1,y-1),(x+1,y-1),(x-1,y+1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and px[nx, ny]:
                        seen[ny][nx] = True
                        stack.append((nx, ny))
            if n < 40:  # 噪点（下行采样 16× 面积 < 640px²）
                continue
            blobs.append([minx*4, miny*4, (maxx+1)*4, (maxy+1)*4, n*16])
    return blobs


def merge_close(blobs, bridge: int = 30, ratio: float = 0.3, rounds: int = 6):
    """卫星件归并：两件包围盒外扩 bridge px 后相交，且小件面积 < 大件 ratio 倍时并入主体。
    （碎钻/旗子/沙袋等小卫星并回主体；勋章与卡车这类平级主体即使靠近也不融合。）"""
    for _ in range(rounds):
        changed = False
        out = []
        while blobs:
            cur = blobs.pop()
            i = 0
            while i < len(blobs):
                b = blobs[i]
                near = (cur[0] - bridge < b[2] and b[0] - bridge < cur[2]
                        and cur[1] - bridge < b[3] and b[1] - bridge < cur[3])
                small = min(cur[4], b[4]) < max(cur[4], b[4]) * ratio
                if near and small:
                    cur = [min(cur[0], b[0]), min(cur[1], b[1]),
                           max(cur[2], b[2]), max(cur[3], b[3]), cur[4] + b[4]]
                    blobs.pop(i)
                    changed = True
                else:
                    i += 1
            out.append(cur)
        blobs = out
        if not changed:
            break
    return blobs


def sort_row_major(blobs, sheet_h):
    """按行聚类（y 中心差 < 表高 12% 视为同行），行内按 x 排序。"""
    blobs = sorted(blobs, key=lambda b: (b[1] + b[3]) / 2)
    rows = []
    for b in blobs:
        cy = (b[1] + b[3]) / 2
        if rows and abs(cy - (rows[-1][0][1] + rows[-1][0][3]) / 2) < sheet_h * 0.12:
            rows[-1].append(b)
        else:
            rows.append([b])
    out = []
    for row in rows:
        out.extend(sorted(row, key=lambda b: b[0]))
    return out


def extract(im: Image.Image, box, size, margin_pct: int) -> Image.Image:
    """单件：裁切 → 内容包围盒 → 留边画布 → LANCZOS 缩放。
    size 为 int 时方化画布；为 'WxH' 时按目标比例画布、内容等比 fit 不拉伸（绶带/横幅/场景件用）。"""
    cell = im.crop(box[:4])
    bbox = cell.getbbox()
    if not bbox:
        raise ValueError('empty cell')
    cell = cell.crop(bbox)
    if isinstance(size, str) and 'x' in size:
        tw, th = (int(v) for v in size.split('x'))
        m = 1 + margin_pct / 100
        scale = min(tw * m / cell.width, th * m / cell.height)
        cell = cell.resize((max(1, round(cell.width * scale)), max(1, round(cell.height * scale))), Image.LANCZOS)
        canvas = Image.new('RGBA', (tw, th), (0, 0, 0, 0))
        canvas.paste(cell, ((tw - cell.width) // 2, (th - cell.height) // 2))
        return canvas
    # 方化画布：最长边 + margin%
    side = int(max(cell.size) * (1 + margin_pct / 100))
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    canvas.paste(cell, ((side - cell.width) // 2, (side - cell.height) // 2))
    if size and size != side:
        canvas = canvas.resize((size, size), Image.LANCZOS)
    return canvas


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('sheet', help='素材表 PNG（纯绿底）')
    ap.add_argument('--slots', required=True,
                    help='槽位:尺寸 逗号分隔，如 ui/res_gold:128,ui/nav_mall:128（顺序=图内行优先）')
    ap.add_argument('--root', default='assets/resources/textures', help='textures 根目录')
    ap.add_argument('--tol', type=int, default=60, help='绿幕容差')
    ap.add_argument('--dilate', type=int, default=6,
                    help='掩膜膨胀半径（÷4 尺度像素，默认 6≈24px 全分辨率）；相邻件粘连时调小')
    ap.add_argument('--margin', type=int, default=6, help='单件留边 %%')
    ap.add_argument('--expect', type=int, default=0, help='期望件数（0=不校验）')
    args = ap.parse_args()

    im = key_green(Image.open(args.sheet), args.tol)
    mask = im.split()[3].point(lambda a: 255 if a > 24 else 0)
    blobs = merge_close(mask_label_blobs(mask, args.dilate))

    slots = [s.split(':') for s in args.slots.split(',')]
    if args.expect and len(blobs) != args.expect:
        print(f'FAIL 识别到 {len(blobs)} 件（期望 {args.expect}）——检查素材表网格/绿底，'
              f'boxes={[(b[0],b[1],b[2],b[3]) for b in blobs]}')
        return 1
    if len(blobs) < len(slots):
        print(f'FAIL 识别到 {len(blobs)} 件 < 槽位 {len(slots)} 个')
        return 1
    if args.expect == 0 and len(blobs) != len(slots):
        # 不强制相等时取前 N 大（按面积）
        blobs = sorted(blobs, key=lambda b: -b[4])[:len(slots)]
        blobs = sort_row_major(blobs, im.height)

    ordered = sort_row_major(blobs, im.height)
    root = Path(args.root)
    for (name, sz), box in zip(slots, ordered):
        out = root / f'{name}.png'
        out.parent.mkdir(parents=True, exist_ok=True)
        piece = extract(im, box, sz if 'x' in sz else int(sz), args.margin)
        piece.save(out)
        print(f'OK   {name}.png  <- box{tuple(box[:4])}  {piece.size[0]}x{piece.size[1]}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

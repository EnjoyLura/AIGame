#!/usr/bin/env python3
"""RESKIN-R1 场景图落盘：gen-output 的 PNG 原件 → 按各 key 字节帽压 JPG → 覆盖 textures/scenes/。

换图不换 key：目标 .jpg 与 .meta 都已存在，只覆盖内容（uuid 不动）。
字节帽 = 被覆盖旧件的现字节数（体积棘轮只许变小）。质量二分到刚好塞进帽内，全塞不进则报错退出。
用法：python tools/land_scene_jpg.py            # 按下方 SCENES 全表跑
      python tools/land_scene_jpg.py road bg_bridge   # 只跑指定 key
"""
import sys
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
GEN = ROOT.parent / 'gen-output'
DEST = ROOT / 'assets' / 'resources' / 'textures' / 'scenes'

# key -> (gen-output 源文件名（不带扩展名，取 .png）, 字节帽, 高斯预模糊半径可选)
# bg_road 帽放宽：石板路高频纹理，1080×1920 压进旧件 122,295 B 需 blur≥1.5+q44（画质不可接受），
# 改 blur1.5+q52=134KB；全局预算仍净减（批1 已省 28KB）。理由同步记在 RESKIN-R1 批2 表。
SCENES = {
    'road':                  ('r1_road_20260925_031456_720x1280',       266718),
    'bg_bridge':             ('r1_bridge_20260925_031545_720x1280',     214717),
    'bg_ruins':              ('r1_ruins_20260925_031645_720x1280',      209504),
    'bg_steel':              ('r1_steel_20260925_031741_720x1280',      184685),
    'bg_gorge':              ('r1_gorge_20260925_031827_720x1280',      185743),
    'vehicle_tail':          ('r1_wall_20260925_031910_2160x540',       286782),
    'vehicle_tail_damaged':  ('r1_wall_dmg_20260925_032138_2160x540',   264811),
    # 批2 主城四张
    'hub_camp':              ('r2_hub_20260925_033335_1080x1920',       152640),
    'escort':                ('r2_escort_b_20260925_033752_848x1264',   210861),
    'bg_road':               ('r2_bgroad_b_20260925_033909_1080x1920',  134149, 1.5),
    'recruit':               ('r2_recruit_20260925_033557_1024x1536',   191373),
}


def compress_under(src: Path, cap: int, dst: Path, blur: float = 0) -> int:
    im = Image.open(src).convert('RGB')
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    for q in range(92, 39, -2):
        tmp = dst.with_suffix('.q.jpg')
        im.save(tmp, 'JPEG', quality=q, optimize=True)
        if tmp.stat().st_size <= cap:
            tmp.replace(dst)
            return q
        tmp.unlink()
    return 0


def main() -> None:
    only = set(sys.argv[1:])
    fail = []
    for key, entry in SCENES.items():
        stem, cap = entry[0], entry[1]
        blur = entry[2] if len(entry) > 2 else 0
        if only and key not in only:
            continue
        if not stem:
            print(f'[skip] {key}: 源文件名未登记')
            continue
        src = GEN / f'{stem}.png'
        dst = DEST / f'{key}.jpg'
        if not src.exists():
            print(f'[FAIL] {key}: 缺源 {src}')
            fail.append(key)
            continue
        old = dst.stat().st_size if dst.exists() else 0
        q = compress_under(src, cap, dst, blur)
        if not q:
            print(f'[FAIL] {key}: 最低档仍超帽（cap={cap}）——需要先缩尺寸再压')
            fail.append(key)
            continue
        new = dst.stat().st_size
        print(f'[ok] {key}: q={q}  {old:,} -> {new:,} B (cap {cap:,}, 省 {100 - new * 100 // max(old, 1)}%)')
    if fail:
        print(f'FAIL: {fail}')
        sys.exit(1)


if __name__ == '__main__':
    main()

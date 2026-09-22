# 把"不透明的大 PNG"转成同 key 的 JPG，并当体积闸门用。
#
# 为什么值得做：`assets/resources/textures/` 34.9 MB 里 95.6% 是 PNG，而其中五张**整幅不透明**的
# 立绘/场景底图占了 9.5 MB。JPG 没有 alpha 通道，所以只有"真的不透明"的件能转——
# 判据不是看 mode 字符串（切片工具输出的方化画布常常是 RGBA 但 alpha 全 255），
# 是把 alpha 通道读出来取极值。
#
# 为什么转格式不破「换图不换 key」：全工程取图一律走 `resources.load('textures/<key>/spriteFrame')`，
# key 是**去掉扩展名**的路径，扩展名由 Cocos 的 asset db 解析；`scenes/hub_camp.jpg` 与
# `scenes/bg_road.jpg` 早就按这条路子在跑，画面上屏已验证。所以同名换扩展 = 同一个 key。
# 唯一要确认的是没有 .prefab/.scene 按 uuid 引这些件（有 scene 引用就会断），本工具会先查再动。
#
# 用法：
#   python tools/shrink_opaque_pngs.py            # 只报告，不动文件
#   python tools/shrink_opaque_pngs.py --apply    # 真的转（转完删 PNG 与它的 .meta，交给 Cocos 重导）
#   python tools/shrink_opaque_pngs.py --check    # 闸门模式：还有可转的就 exit 1（进收尾链用）
import argparse
import glob
import json
import os
import sys

from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

ROOT = 'assets/resources/textures'
JPG_Q = 82          # 与 tools/land_bg.py 出底图同一档，两处口径不要各说各话
MIN_BYTES = 60 * 1024
# 转完反而变大或省得太少的不值得动（JPG 对小尺寸平滑图可能不占优）
MIN_GAIN = 20 * 1024


def opaque(path):
    try:
        with Image.open(path) as im:
            return im.convert('RGBA').getchannel('A').getextrema() == (255, 255)
    except Exception:
        return False


def uuid_referenced(path):
    """这个件的 uuid 有没有被 .prefab/.scene 按 id 引走——被引走就不能换扩展名"""
    meta = path + '.meta'
    if not os.path.exists(meta):
        return False
    try:
        u = json.load(open(meta, encoding='utf-8'))['uuid']
    except Exception:
        return False
    for f in glob.glob('assets/**/*.prefab', recursive=True) + glob.glob('assets/**/*.scene', recursive=True):
        try:
            if u in open(f, encoding='utf-8').read():
                return True
        except Exception:
            continue
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--min', type=int, default=MIN_BYTES)
    args = ap.parse_args()

    cands = []
    for root, _d, files in os.walk(ROOT):
        for f in files:
            if not f.lower().endswith('.png'):
                continue
            p = os.path.join(root, f).replace('\\', '/')
            sz = os.path.getsize(p)
            if sz < args.min or not opaque(p):
                continue
            with Image.open(p) as im:
                buf = im.copy()
            out = os.path.splitext(p)[0] + '.jpg'
            import io
            b = io.BytesIO()
            buf.convert('RGB').save(b, 'JPEG', quality=JPG_Q, optimize=True, progressive=True)
            new = len(b.getvalue())
            if sz - new >= MIN_GAIN:
                cands.append((p, out, sz, new, b.getvalue()))

    if not cands:
        print(f'PASS 没有可转 JPG 的不透明大 PNG（门槛 {args.min//1024}KB / 至少省 {MIN_GAIN//1024}KB）')
        return 0

    tot_old = sum(c[2] for c in cands)
    tot_new = sum(c[3] for c in cands)
    print(f'\n发现 {len(cands)} 张不透明 PNG 可转 JPG：{tot_old/1048576:.2f} MB → {tot_new/1048576:.2f} MB'
          f'   省 {(tot_old-tot_new)/1048576:.2f} MB')
    blocked = []
    for p, out, o, n, blob in sorted(cands, key=lambda c: -(c[2] - c[3])):
        rel = p.replace(ROOT + '/', '')
        if uuid_referenced(p):
            blocked.append(rel)
            print(f'   跳过（uuid 被 prefab/scene 引用）  {rel}')
            continue
        print(f'   {o/1024:7.0f} KB → {n/1024:6.0f} KB  {rel}')
        if args.apply:
            with open(out, 'wb') as fh:
                fh.write(blob)
            os.remove(p)
            if os.path.exists(p + '.meta'):
                os.remove(p + '.meta')
            print(f'       已写 {out.replace(ROOT + "/", "")}，删掉 PNG 与其 .meta（下次构建 Cocos 重导）')

    if blocked:
        print(f'   ⚠ {len(blocked)} 张不能动，因为按 uuid 被引用：先改引用方')
    if args.check:
        print('CHECK FAIL 仍有可转的不透明 PNG（跑 python tools/shrink_opaque_pngs.py --apply）')
        return 1
    if not args.apply:
        print('（只报告。真转加 --apply）')
    return 0


if __name__ == '__main__':
    sys.exit(main())

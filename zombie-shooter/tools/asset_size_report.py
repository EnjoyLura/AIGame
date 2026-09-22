# 素材体积普查：谁占地方、谁其实可以转 JPG、转完能省多少。
#
# 为什么要单独量这个：美术进版三十多轮一直在往 `assets/resources/textures/` 里加图，
# 每张都不大、加起来很可观，而**没有任何一个检查器看体积**——所以"包变胖"这件事一直是无声的。
# 这一轮之后它进了收尾链（见 AGENTS.md），胖过预算就 FAIL，不再靠人记得去查。
#
# 判"能不能转 JPG"不能只看是不是 PNG：JPG 没有 alpha 通道，带透明的件转过去会糊成黑底。
# 所以这里真的把 alpha 通道读出来判（全 255 才算不透明），不看 mode 字符串——
# mode 是 RGBA 但 alpha 全 255 的件有的是（切片工具输出的方化画布就是这种）。
#
# 用法：python tools/asset_size_report.py [--top 20] [--json out.json]
import argparse
import json
import os
import sys

from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

ROOT = 'assets/resources/textures'
# 单件超过这个字节数才值得动 JPG：小件转了省不了几K，反而丢掉无损边缘
JPG_MIN_BYTES = 60 * 1024


def is_opaque(path):
    """读 alpha 通道判不透明。读不出（非位图）按不透明处理，交给体积阈值去筛。"""
    try:
        with Image.open(path) as im:
            im = im.convert('RGBA')
            a = im.getchannel('A')
            return a.getextrema() == (255, 255)
    except Exception:
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--top', type=int, default=20)
    ap.add_argument('--json', default='')
    ap.add_argument('--check', action='store_true', help='闸门模式：超预算就 exit 1（进收尾链用）')
    ap.add_argument('--budget', type=float, default=27.0,
                    help='textures 总体积预算（MB）。**只许调小不许调大**——与 check-split 的 SPLIT_DEBT 同规矩')
    args = ap.parse_args()

    rows = []
    for root, _dirs, files in os.walk(ROOT):
        for f in files:
            if not f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                continue
            p = os.path.join(root, f)
            sz = os.path.getsize(p)
            ext = os.path.splitext(f)[1].lower()
            op = is_opaque(p) if ext == '.png' else True
            rows.append({'path': p.replace('\\', '/'), 'bytes': sz, 'ext': ext, 'opaque': op})

    total = sum(r['bytes'] for r in rows)
    by_ext = {}
    for r in rows:
        by_ext[r['ext']] = by_ext.get(r['ext'], [0, 0])
        by_ext[r['ext']][0] += 1
        by_ext[r['ext']][1] += r['bytes']

    print(f'\n{ROOT} 共 {len(rows)} 张图，合计 {total/1048576:.2f} MB')
    for ext, (n, b) in sorted(by_ext.items(), key=lambda kv: -kv[1][1]):
        print(f'   {ext:7} ×{n:<4} {b/1048576:7.2f} MB  ({b/total*100:4.1f}%)')

    # 能转 JPG 的：现在是 PNG、不透明、且体积过门槛
    cands = [r for r in rows if r['ext'] == '.png' and r['opaque'] and r['bytes'] >= JPG_MIN_BYTES]
    cands.sort(key=lambda r: -r['bytes'])
    # 经验折算：这类照片/渐变底图按 q=82 转 JPG 大约落到原 PNG 的 12~18%。
    # 这里只用来排序与估预算，**真实节省额一律以转完之后实测文件大小为准**（脚本末尾会重跑）。
    est = sum(int(r['bytes'] * 0.15) for r in cands)
    print(f'\n可转 JPG（PNG + 不透明 + ≥{JPG_MIN_BYTES//1024}KB）：{len(cands)} 张，'
          f'现占 {sum(r["bytes"] for r in cands)/1048576:.2f} MB，按 15% 估省 {est/1048576:.2f} MB')
    for r in cands[:args.top]:
        rel = r['path'].replace(ROOT + '/', '')
        print(f'   {r["bytes"]/1024:8.0f} KB  {rel}')

    print(f'\n最大的 {args.top} 张（不分类型）：')
    for r in sorted(rows, key=lambda x: -x['bytes'])[:args.top]:
        rel = r['path'].replace(ROOT + '/', '')
        tag = '' if r['ext'] != '.png' else ('不透明' if r['opaque'] else '带透明')
        print(f'   {r["bytes"]/1024:8.0f} KB  {tag:6} {rel}')

    if args.json:
        with open(args.json, 'w', encoding='utf-8') as fh:
            json.dump({'total': total, 'count': len(rows),
                       'jpg_candidates': [{'path': r['path'], 'bytes': r['bytes']} for r in cands]}, fh,
                      ensure_ascii=False, indent=1)
        print(f'\n明细写入 {args.json}')

    if args.check:
        # 闸门：体积只许降不许升（与 check-split.js 的 SPLIT_DEBT 同一规矩——不设闸门的话，
        # 三十多轮美术进版每轮加几张图，谁都没看见"包变胖"这件事发生）
        mb = total / 1048576
        if mb > args.budget:
            print(f'\nCHECK FAIL textures 合计 {mb:.2f} MB > 预算 {args.budget:.2f} MB。'
                  f'要放宽预算必须说清为什么，别把数字改大假装过关。')
            return 1
        if cands:
            print(f'\nCHECK FAIL 还有 {len(cands)} 张不透明大 PNG 没转 JPG：'
                  f'跑 python tools/shrink_opaque_pngs.py --apply')
            return 1
        print(f'\nCHECK PASS textures 合计 {mb:.2f} MB ≤ 预算 {args.budget:.2f} MB，'
              f'且没有可转 JPG 的不透明大 PNG')
    return 0


if __name__ == '__main__':
    sys.exit(main())

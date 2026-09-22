# 算"给整页底加一层暖主光"会把你看到的画面改成什么样，先算再改。
#
# 为什么要算：这一层是盖在**照片**上的，改的是玩家第一眼的世界色温；手改一版、构建一次、
# 再取景一次，一轮试不了三档。而 CSS 的混合模式是逐通道闭式公式，在源图上直接算就行。
#
# 三条口径与 tools/audit_light_temp.mjs 对齐：暖度 = R - B，亮度 = 0.2126R+0.7152G+0.0722B。
# 目标不是"把世界调成金色"，是把世界从实测的 -9~+25 抬到界面件那一档（+19~+44），
# 让金牌/棕板落进同一片光里——反过来把控件拉灰去迁就底图，实测否决（见 preview_plate_filter.py）。
import os
import sys

from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

LUMW = (0.2126, 0.7152, 0.0722)


def lum(c):
    return sum(w * v for w, v in zip(LUMW, c))


def blend(mode, b, s):
    """b=底色 0~255，s=上层色 0~255，返回混合后的 0~255（不含 alpha 合成）"""
    B, S = b / 255, s / 255
    if mode == 'soft-light':
        v = B - (1 - 2 * S) * B * (1 - B) if S <= .5 else B + (2 * S - 1) * (B ** .5 - B)
    elif mode == 'overlay':
        v = 2 * B * S if B <= .5 else 1 - 2 * (1 - B) * (1 - S)
    elif mode == 'multiply':
        v = B * S
    else:
        v = S
    return max(0, min(255, v * 255))


def composite(src, dst, mode, alpha):
    return [dst[i] * (1 - alpha) + alpha * blend(mode, dst[i], src[i]) for i in range(3)]


# 现有的顶/底压暗遮罩（HomeUiCore._applyPageBackdrop 第一层），要一起算，
# 因为暖层是叠在它上面的，遮罩已经把上下两头压冷了
VIGN = [((11, 18, 26), .86, 0.00), ((11, 18, 26), .44, 0.34),
        ((10, 16, 24), .34, 0.60), ((8, 13, 20), .86, 1.00)]


def vignette_at(y):
    """按 CSS linear-gradient 的 stop 位置插值出该纵向位置的遮罩色与 alpha"""
    for i in range(len(VIGN) - 1):
        c0, a0, p0 = VIGN[i]
        c1, a1, p1 = VIGN[i + 1]
        if p0 <= y <= p1:
            t = 0 if p1 == p0 else (y - p0) / (p1 - p0)
            return [c0[k] + (c1[k] - c0[k]) * t for k in range(3)], a0 + (a1 - a0) * t
    return VIGN[-1][0], VIGN[-1][1]


CANDS = [
    ('不动（现状）', None),
    ('soft-light 琥珀 .30', ('soft-light', (255, 158, 58), .30)),
    ('soft-light 琥珀 .45', ('soft-light', (255, 158, 58), .45)),
    ('overlay 琥珀 .22', ('overlay', (255, 158, 58), .22)),
    ('overlay 琥珀 .32', ('overlay', (255, 158, 58), .32)),
    ('平涂 琥珀 a=.10', ('plain', (255, 158, 58), .10)),
    ('平涂 琥珀 a=.16', ('plain', (255, 158, 58), .16)),
]

T = 'assets/resources/textures/'
for key in ['scenes/hub_camp', 'scenes/bg_road']:
    ext = '.jpg' if os.path.exists(T + key + '.jpg') else '.png'
    im = Image.open(T + key + ext).convert('RGB')
    w, h = im.size
    samp = [im.getpixel((x, y)) for y in range(0, h, 7) for x in range(0, w, 7)]
    print(f'\n=== {key}（{w}x{h}）—— 现状整张暖度 '
          + str(round(sum(p[0] - p[2] for p in samp) / len(samp))))
    for name, spec in CANDS:
        rows = []
        for band, y0, y1 in [('上1/4', .04, .22), ('中带', .38, .62), ('下1/4', .76, .94)]:
            acc = [0.0, 0.0, 0.0]
            n = 0
            for yy in range(int(y0 * h), int(y1 * h), max(1, h // 60)):
                for xx in range(0, w, max(1, w // 40)):
                    r, g, b = im.getpixel((xx, yy))
                    vc, va = vignette_at(yy / h)
                    c = composite(vc, (r, g, b), 'plain', va)      # 先过现有遮罩
                    if spec:
                        mode, col, a = spec
                        c = composite(col, c, 'source-over' if mode == 'plain' else mode, a)
                    acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]; n += 1
            rows.append((band, round(acc[0] / n - acc[2] / n), round(lum([acc[i] / n for i in range(3)]))))
        allw = sum(r[1] for r in rows) / 3
        alll = sum(r[2] for r in rows) / 3
        ok = '✓ 进界面件带宽' if 12 <= allw <= 52 else ('（仍偏冷）' if allw < 12 else '（过头，世界变金）')
        print(f'   {name:22} ' + '  '.join(f'{b} {wv:>+4}/亮{lv:>3}' for b, wv, lv in rows)
              + f'   均值 {allw:>+5} 亮{alll:>4} {ok}')

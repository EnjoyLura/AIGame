# 一次性算 CSS filter：把板件 PNG 按候选滤镜算出"改完之后普查会读到什么数"，再决定用哪一档。
# 为什么要算而不是试：普查读的是屏幕上这块面的实际像素，而 filter 是逐通道矩阵运算——
# 手调一版、构建一次、再量一次，一轮只能试三档；先在源件上算出来，构建就只跑一次。
# 口径对齐 tools/audit_light_temp.mjs：暖度 = R - B，亮度 = 0.2126R+0.7152G+0.0722B，
# 只统计不透明像素（alpha > 8），因为板件四周是透明的，把透明边算进去会把均值拉低。
import sys
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

LUM = (0.213, 0.715, 0.072)          # CSS saturate 用的亮度权重
SEPIA = ((0.393, 0.769, 0.189), (0.349, 0.686, 0.168), (0.272, 0.534, 0.131))


def saturate(c, s):
    L = sum(w * v for w, v in zip(LUM, c))
    return tuple((1 - s) * L + s * v for v in c)


def bright(c, b):
    return tuple(v * b for v in c)


def sepia(c, a):
    out = []
    for i in range(3):
        t = sum(SEPIA[i][j] * c[j] for j in range(3))
        out.append(c[i] + (t - c[i]) * a)
    return tuple(out)


def measure(path, ops):
    im = Image.open(path).convert('RGBA')
    px = im.getdata()
    n = sr = sg = sb = sL = 0
    for r, g, b, a in px:
        if a <= 8:
            continue
        c = (float(r), float(g), float(b))
        for kind, k in ops:
            c = {'sat': saturate, 'bri': bright, 'sep': sepia}[kind](c, k)
        sr += c[0]; sg += c[1]; sb += c[2]
        sL += 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
        n += 1
    if not n:
        return None
    return round(sr / n - sb / n), round(sL / n), n


CANDS = [
    ('原样', []),
    ('sat.85', [('sat', .85)]),
    ('sat.70', [('sat', .70)]),
    ('bri.88', [('bri', .88)]),
    ('bri.82', [('bri', .82)]),
    ('sat.85+bri.86', [('sat', .85), ('bri', .86)]),
    ('sat.70+bri.88', [('sat', .70), ('bri', .88)]),
    ('sat.60+bri.86', [('sat', .60), ('bri', .86)]),
    ('sep.15+sat.85', [('sep', .15), ('sat', .85)]),
    ('sep.20+sat.80', [('sep', .20), ('sat', .80)]),
    ('sep.30+sat.75+bri.90', [('sep', .30), ('sat', .75), ('bri', .90)]),
    ('sep.40+sat.70+bri.88', [('sep', .40), ('sat', .70), ('bri', .88)]),
    ('sep.55+sat.70+bri.88', [('sep', .55), ('sat', .70), ('bri', .88)]),
]

T = 'assets/resources/textures/'
print('=== 世界自己是什么色温（底图整张均值 + 上/中/下三带）===')
print('    界面件要"被同一个光照亮"，参照系就是这几张底图，不是另一个界面件')
for k in ['scenes/hub_camp', 'scenes/bg_road', 'scenes/escort', 'scenes/hub_market', 'scenes/hub_hero',
          'scenes/hub_action', 'scenes/hub_base']:
    for ext in ('.jpg', '.png'):
        import os
        p = T + k + ext
        if not os.path.exists(p):
            continue
        im = Image.open(p).convert('RGB')
        w, h = im.size
        bands = []
        for name, box in [('上1/4', (0, 0, w, h // 4)), ('中带', (0, h // 3, w, 2 * h // 3)),
                          ('下1/4', (0, 3 * h // 4, w, h))]:
            px = list(im.crop(box).getdata())
            n = len(px)
            r = sum(x[0] for x in px) / n; g = sum(x[1] for x in px) / n; b = sum(x[2] for x in px) / n
            bands.append((name, round(r - b), round(0.2126 * r + 0.7152 * g + 0.0722 * b)))
        allpx = list(im.getdata())
        n = len(allpx)
        r = sum(x[0] for x in allpx) / n; b = sum(x[2] for x in allpx) / n
        print(f'   {k:22} 整张 暖度 {round(r - b):>4}   ' + '   '.join(f'{nm} {wv:>+4}/亮{lv}' for nm, wv, lv in bands))
    else:
        pass

print()
for label, path in [('金牌 btn_play（护送主 CTA）', T + 'ui/button/btn_play.png'),
                    ('蓝板 btn_cancel（英雄养成五入）', T + 'ui/button/btn_cancel.png'),
                    ('HUD 板 btn_hud（战斗钮/装备槽）', T + 'ui/button/btn_hud.png'),
                    ('导航板 tab_plate（底部整条）', T + 'ui/nav/tab_plate.png'),
                    ('入口板 entry_card（行动两张大卡）', T + 'ui/panel/entry_card.png')]:
    print(f'\n{label}   —— 世界其余面实测 -22~+43 暖 / 亮度 45~82')
    for name, ops in CANDS:
        m = measure(path, ops)
        if not m:
            continue
        warm, lum, n = m
        flag = ''
        if warm > 60:
            flag = '← 仍在带宽之上'
        elif warm < -25:
            flag = '← 仍在带宽之下（冷光不存在于这个世界）'
        print(f'   {name:24} 暖度 {warm:>5}  亮度 {lum:>4}  不透明像素 {n:>8}  {flag}')

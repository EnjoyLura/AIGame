# 把候选 CSS 滤镜真的画到板件上出一张预览图，用眼睛过一遍再决定。
# 为什么光看数不够：暖度从 -58 走到 -14 是"进了世界带宽"，但 sepia 是把蓝往橄榄方向推的，
# 数值合格、看起来发脏是完全可能的。数值负责选档，眼睛负责否决。
# 滤镜矩阵与 tools/calc_plate_filter.py 同一套（也是 CSS 规范那套），预览与实机不会两回事。
import sys
from PIL import Image, ImageDraw

sys.stdout.reconfigure(encoding='utf-8')

LUM = (0.213, 0.715, 0.072)
SEPIA = ((0.393, 0.769, 0.189), (0.349, 0.686, 0.168), (0.272, 0.534, 0.131))


def saturate(c, s):
    L = sum(w * v for w, v in zip(LUM, c))
    return tuple((1 - s) * L + s * v for v in c)


def bright(c, b):
    return tuple(v * b for v in c)


def sepia(c, a):
    return tuple(c[i] + (sum(SEPIA[i][j] * c[j] for j in range(3)) - c[i]) * a for i in range(3))


OPS = {'sat': saturate, 'bri': bright, 'sep': sepia}


def apply(im, ops):
    out = im.copy()
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a <= 8:
                continue
            c = (float(r), float(g), float(b))
            for kind, k in ops:
                c = OPS[kind](c, k)
            px[x, y] = (tuple(max(0, min(255, round(v))) for v in c) + (a,))
    return out


T = 'assets/resources/textures/'
# 底图取营地照片的一小条垫在板件后面：板子单独看永远"挺好看"，压在世界上才看得出是不是一个光照的
BG = Image.open(T + 'scenes/hub_camp.jpg').convert('RGB').resize((360, 200))

# 蓝板这一轮只试**轻档**。上一轮 sepia(.40) 把暖度从 -58 拉到 -14、数值上"进了带宽"，
# 但预览里板子变成灰绿、"蓝=取消/次要"这个功能色没了——数值合格、画面更坏，已否决。
# 所以这次的目标不是把它拉进带宽（拉不进去，拉进去就不是蓝了），而是**只去掉"自发光"那一截**：
# 压一点饱和与亮度，让它读成"暖光下的一块蓝"，而不是"屏幕里另一盏冷灯"。
CASES = [
    ('ui/button/btn_cancel.png', 'btn_cancel 蓝板', [[], [('sat', .82), ('bri', .90)], [('sep', .14), ('sat', .86), ('bri', .92)]]),
]
labels = ['原样', '轻档 A 压饱和', '轻档 B 微暖']

CELL = 170
sheet = Image.new('RGB', (CELL * 3 + 40, len(CASES) * (CELL + 46) + 20), (24, 24, 28))
d = ImageDraw.Draw(sheet)
for ci, (path, title, variants) in enumerate(CASES):
    im = Image.open(T + path).convert('RGBA').resize((CELL, CELL))
    for vi, ops in enumerate(variants):
        piece = apply(im, ops)
        x = 10 + vi * (CELL + 10)
        y = 10 + ci * (CELL + 46)
        back = BG.crop((int(x / (CELL * 3 + 40) * 360), int(ci * 0.5 * 200),
                        int(x / (CELL * 3 + 40) * 360) + 180, int(ci * 0.5 * 200) + 100)).resize((CELL, CELL))
        sheet.paste(back, (x, y))
        sheet.paste(piece, (x, y), piece)
        d.text((x + 2, y + CELL + 4), f'{title} · {labels[vi]}', fill=(230, 230, 230))
sheet.save('../gen-output/r49_filter_preview.png')
print('OK ../gen-output/r49_filter_preview.png')

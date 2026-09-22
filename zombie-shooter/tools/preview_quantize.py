# 量化到 256 色到底会不会把画看坏——出对比图，眼睛来判，不要拿"省了 80%"当理由。
#
# 为什么必须看图：`optimize=True` 重存 PNG 实测只省 0.2%（8.40→8.38 MB），等于没做；
# 真正能省的是把 24/32 位色深压到 256 色索引（省 76~90%）。但**平滑渐变在 256 色下会起色带**，
# 而这一库里最要命的恰恰是那些带渐变的件：怪物走帧、船坞金属板、九宫格板。
# 色带是"看着廉价"的头号来源，比包体大更伤。所以这一步只能看图决定，不能看数决定。
#
# 用法：python tools/preview_quantize.py
import os
import sys

from PIL import Image, ImageDraw

sys.stdout.reconfigure(encoding='utf-8')

ROOT = 'assets/resources/textures/'
# 三类都要覆盖：照片级渐变（最容易起带）、金属板（中）、平涂图标（最不容易）
CASES = ['monsters/dog_walk.png', 'stage/dock_bay.png', 'ui/panel/panel_card.png',
         'ui/ico/ico_weapon.png', 'ui/button/btn_play.png', 'monsters/boar_walk.png']


def quant(im, colors):
    if im.mode == 'RGBA':
        return im.quantize(colors=colors, method=Image.Quantize.FASTOCTREE).convert('RGBA')
    return im.quantize(colors=colors, method=Image.Quantize.MEDIANCUT).convert('RGB')


CELL = 300
cols = 3
sheet = Image.new('RGB', (CELL * cols + 40, len(CASES) * (CELL + 40) + 20), (26, 26, 30))
d = ImageDraw.Draw(sheet)
titles = ['原图', '256 色', '128 色']
for ri, k in enumerate(CASES):
    p = ROOT + k
    if not os.path.exists(p):
        continue
    im = Image.open(p).convert('RGBA')
    im.thumbnail((CELL, CELL))
    for ci, t in enumerate([None, 256, 128]):
        x, y = 10 + ci * (CELL + 10), 10 + ri * (CELL + 40)
        back = Image.new('RGB', im.size, (60, 60, 66))
        v = im if t is None else quant(im, t)
        back.paste(v, (0, 0), v)
        sheet.paste(back, (x, y))
        d.text((x + 2, y + CELL + 20 - 34), f'{k.split("/")[-1]} · {titles[ci]}', fill=(235, 235, 235))
out = '../gen-output/r50_quant_preview.png'
sheet.save(out)
print('OK', out)

"""Deterministic original mortar atlas. Pillow only; no network or external art.
4x4 cells, 128px each, transparent gutters; runtime uses untrimmed cell rects.
"""
from pathlib import Path
import json
import math
import random
import uuid
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/resources/textures/fx'
CELL = 128


def cloud(seed, hot=False, phase=0):
    rng = random.Random(seed)
    blobs = [(rng.uniform(-.4, .4), rng.uniform(-.4, .4), rng.uniform(.18, .36)) for _ in range(12)]
    im = Image.new('RGBA', (CELL, CELL))
    px = im.load()
    for y in range(CELL):
        for x in range(CELL):
            nx, ny = (x-63.5)/58, (y-63.5)/58
            density = max(math.exp(-((nx-a)**2+(ny-b)**2)/(r*r)*2) for a,b,r in blobs)
            envelope = max(0, min(1, (1-math.hypot(nx,ny))*5))
            noise = .88 + .12*math.sin(nx*37+math.sin(ny*19))*math.sin(ny*31)
            a = int(230*density**.65*envelope*noise)
            if hot:
                heat = max(0, min(1, density*(1-phase*.65)))
                rgb = (255-int(85*phase), int(65+170*heat), int(18+170*heat**3))
            else:
                light = int(88+65*density+12*(-ny))
                rgb = (light+9, light+5, light)
            px[x,y] = (*rgb,a)
    return im.filter(ImageFilter.GaussianBlur(.7))


def generate():
    OUT.mkdir(parents=True, exist_ok=True)
    atlas = Image.new('RGBA',(512,512))
    cells = []
    for kind in ('glow','ring'):
        im = Image.new('RGBA',(CELL,CELL)); px=im.load()
        for y in range(CELL):
            for x in range(CELL):
                r=math.hypot(x-63.5,y-63.5)/58
                alpha = math.exp(-r*r*7)*max(0,1-r)**.6 if kind=='glow' else math.exp(-((r-.88)/.035)**2)
                px[x,y]=(255,239,204,int(255*alpha))
        cells.append(im)
    shell=Image.new('RGBA',(CELL,CELL)); d=ImageDraw.Draw(shell)
    d.rounded_rectangle((45,26,82,96),radius=16,fill=(65,72,62,255),outline=(197,183,109,255),width=3)
    d.rectangle((46,64,81,75),fill=(232,168,62,255))
    d.line((54,36,54,58),fill=(229,231,190,255),width=4)
    d.polygon([(46,85),(36,105),(62,97),(90,105),(81,85)],fill=(113,118,91,255))
    cells.append(shell.filter(ImageFilter.GaussianBlur(.5)))
    shard=Image.new('RGBA',(CELL,CELL)); d=ImageDraw.Draw(shard)
    d.polygon([(39,54),(82,45),(91,64),(49,77)],fill=(187,128,61,255))
    d.line((39,54,82,45,91,64),fill=(255,214,130,255),width=3)
    cells.append(shard.filter(ImageFilter.GaussianBlur(.5)))
    cells.extend(cloud(20+i) for i in range(3))
    cells.append(Image.new('RGBA',(CELL,CELL)))
    # Same seeded lobes keep the short sequence coherent; cooling changes over time.
    cells.extend(cloud(7,True,i/7) for i in range(8))
    for i,im in enumerate(cells):
        atlas.paste(im,((i%4)*CELL,(i//4)*CELL))
    path=OUT/'mortar.png'; atlas.save(path,optimize=True)
    # Mirror project importer schema, but disable trimming/packing for runtime slices.
    template=json.loads((ROOT/'assets/resources/textures/ui/btn_primary.png.meta').read_text())
    uid=str(uuid.uuid5(uuid.NAMESPACE_URL,'doomsday-route/fx/mortar-v1'))
    old=template['uuid']; template=json.loads(json.dumps(template).replace(old,uid).replace('btn_primary','mortar'))
    sf=template['subMetas']['f9941']['userData']
    sf.update(width=512,height=512,rawWidth=512,rawHeight=512,trimX=0,trimY=0,offsetX=0,offsetY=0,trimType='none',packable=False)
    sf.pop('vertices',None)
    path.with_suffix('.png.meta').write_text(json.dumps(template,indent=2)+'\n')
    folder=OUT.with_suffix('.meta')
    if not folder.exists():
        folder.write_text(json.dumps(dict(ver='1.2.0',importer='directory',imported=True,uuid=str(uuid.uuid5(uuid.NAMESPACE_URL,'doomsday-route/fx')),files=[],subMetas={},userData={}),indent=2)+'\n')
    print(f'{path}: {path.stat().st_size} bytes, 512x512 RGBA, 16 cells')

if __name__ == '__main__':
    generate()

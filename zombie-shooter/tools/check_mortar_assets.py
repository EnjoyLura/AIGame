"""Static atlas and full diagnostic comparison; no diagnostic-code filtering."""
from pathlib import Path
import collections
import json
import re
from PIL import Image

root = Path(__file__).resolve().parents[1]
image = Image.open(root/'assets/resources/textures/fx/mortar.png')
assert image.mode == 'RGBA' and image.size == (512,512)
alpha = image.getchannel('A')
for cell in range(16):
    x,y = cell%4*128,cell//4*128
    for n in range(128):
        assert all(alpha.getpixel(p)==0 for p in ((x+n,y),(x+n,y+127),(x,y+n),(x+127,y+n)))
meta = json.loads((root/'assets/resources/textures/fx/mortar.png.meta').read_text())
sf = meta['subMetas']['f9941']['userData']
assert sf['trimType']=='none' and not sf['packable']
assert sf['width']==sf['height']==512
print('PASS atlas: RGBA dimensions, all four transparent cell borders, untrimmed/unpacked meta')
before = (root/'temp/stage2-tsc-before.log').read_text()
after = (root/'temp/stage2-tsc-after.log').read_text()
# Normalize locations only, preserving every diagnostic, message, and multiplicity.
def diagnostics(text):
    return collections.Counter(re.sub(r'\(\d+,\d+\)(?=:)', '(LINE,COL)', line) for line in text.splitlines())
a,b = diagnostics(before),diagnostics(after)
print('Before diagnostic lines:',len(before.splitlines()),'After:',len(after.splitlines()))
print('Added:',dict(b-a),'Removed:',dict(a-b))
assert a==b, 'Full diagnostic sets differ'
print('PASS complete tsc comparison: only source locations may differ')

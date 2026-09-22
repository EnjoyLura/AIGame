# 切片/抠像输出的 PNG 统一从这里落盘：顺手过一道 256 色索引。
#
# 为什么要单独一个模块：这条优化要同时给 `slice_sheet.py`（一次出一表）和 `chroma_key.py`
# （单件补图）用，抄两遍必然一份跑在前面一份留在后面。
#
# 为什么是量化而不是 optimize：实测把带透明的件用 `save(..., optimize=True)` 重存，
# 12 张 8.40 MB 只降到 8.38 MB——**省 0.2%，等于没做**（`tools/../gen-output` 里那次量测）。
# 真正的省法是把 32 位色高压成 256 色索引，同批实测 8.40 MB → 1.54 MB（省 76~90%）。
#
# 代价要写清楚，别当免费午餐：**平滑渐变在 256 色以下会起色带**。
# 对比图 `tools/preview_quantize.py` 跑出来的那张判过：图标、金属板、怪物走帧在 256 下与原件
# 看不出差别；`ui/panel/panel_card.png` 那张米纸的细碎斑驳会被压平。所以：
#   - 默认 256（图标/板件/走帧这一族安全，也是每轮出图的大头）
#   - **带纸质/柔和斑驳纹理的整幅面板**要保真，传 `--colors 0` 关掉
#   - 128 一律不许用（金板渐变已经能看出台阶）
import sys

from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

DEFAULT_COLORS = 256

# 两个切片工具的帮助文本共用一句，别各写一份然后一份过期
QUANT_NOTE = ('256 色对图标/金属板/走帧实测与原件看不出差别；'
              '带纸质柔和斑驳纹理的整幅面板要保真就传 0 关掉（对比图见 preview_quantize.py）')


def quantize(im, colors=DEFAULT_COLORS):
    """压到 colors 色索引。RGBA 必须走 FASTOCTREE——另外两种量化方法会把 alpha 通道吃掉，
    板件四周那条半透明羽化边一没就会在暗底上留一圈白边。"""
    if not colors or colors < 2:
        return im
    if im.mode == 'RGBA':
        return im.quantize(colors=colors, method=Image.Quantize.FASTOCTREE)
    return im.quantize(colors=min(colors, 256), method=Image.Quantize.MEDIANCUT)


def save_png(im, path, colors=DEFAULT_COLORS, label=''):
    """返回 (原字节, 新字节)。调用方把节省额打出来，让优化是看得见的而不是暗改。"""
    import io
    b = io.BytesIO()
    im.save(b, 'PNG', optimize=True)
    raw = len(b.getvalue())
    out = b.getvalue()
    if colors:
        b2 = io.BytesIO()
        quantize(im, colors).save(b2, 'PNG', optimize=True)
        if len(b2.getvalue()) < raw:          # 量化后反而更大（本来就色少的件）就退回原样
            out = b2.getvalue()
    with open(path, 'wb') as fh:
        fh.write(out)
    return raw, len(out)

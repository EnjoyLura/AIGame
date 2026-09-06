#!/usr/bin/env python3
"""技能图标接入预处理：抠品红底 -> 羽化 -> 裁剪 -> 统一等比缩放 -> 方形画布居中。

所有图标统一内容区尺寸，保证在技能栏圆形底上的视觉重量一致。
用法：
  python tools/process_icon.py <输入.png> <输出.png> [画布边长=512] [内容区=460] [容差=40]
"""
import sys
from PIL import Image, ImageFilter


def remove_all_magenta(img: Image.Image, tol: int) -> Image.Image:
    """全图移除接近品红（#FF00FF）的像素——含被图案包围的封闭背景区（flood 抠不到），
    品红与图标配色（红/橙/黄/青/绿）通道差异大，不会误伤内容。"""
    img = img.convert('RGBA')
    w, h = img.size
    px = img.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if r >= 255 - tol * 2 and b >= 255 - tol * 2 and g <= tol * 2:
                px[x, y] = (0, 0, 0, 0)
    return img


def main() -> None:
    src, dst = sys.argv[1], sys.argv[2]
    max_dim = int(sys.argv[3]) if len(sys.argv) > 3 else 512
    content = int(sys.argv[4]) if len(sys.argv) > 4 else 460
    tol = int(sys.argv[5]) if len(sys.argv) > 5 else 40

    img = remove_all_magenta(Image.open(src), tol)
    # 羽化 alpha 边缘，弱化品红/白边
    alpha = img.getchannel('A').filter(ImageFilter.GaussianBlur(1.0))
    img.putalpha(alpha)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    w, h = img.size
    # 统一内容区：最长边缩放到 content（只缩小不放大）
    scale = min(content / max(w, h), 1.0)
    if scale < 1.0:
        img = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    canvas = Image.new('RGBA', (max_dim, max_dim), (0, 0, 0, 0))
    canvas.paste(img, ((max_dim - img.width) // 2, (max_dim - img.height) // 2), img)
    canvas.save(dst, optimize=True)
    print(f'ok: {dst} {img.width}x{img.height} on {max_dim}x{max_dim}')


if __name__ == '__main__':
    main()

"""AI 生成美术的接入预处理：抠白底 -> 裁剪 -> 缩放 -> 输出到工程资源目录。

用法：
  python tools/process_art.py <输入.png> <输出.png> [最大边长，默认 288] [容差，默认 32] [模式]

模式：
  flood（默认）  从四边向内洪水填充移除背景（适合背景连通的立绘）
  allwhite      全图移除接近白色的像素（适合环形/框类贴图，中心镂空也要透）
"""
import sys
from collections import deque
from PIL import Image, ImageFilter


def remove_background(img: Image.Image, tolerance: int) -> Image.Image:
    img = img.convert('RGBA')
    w, h = img.size
    px = img.load()

    def is_bg(x: int, y: int, base) -> bool:
        r, g, b, _ = px[x, y]
        return abs(r - base[0]) <= tolerance and abs(g - base[1]) <= tolerance and abs(b - base[2]) <= tolerance

    # 以四角/四边中点的常见底色为基准，逐个基准色做洪水填充
    seeds_colors = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1], px[w // 2, 0], px[w // 2, h - 1]]
    visited = [[False] * w for _ in range(h)]

    for base in dict.fromkeys(seeds_colors):  # 去重保序
        queue = deque()
        for x in range(w):
            for y in (0, h - 1):
                if not visited[y][x] and is_bg(x, y, base):
                    queue.append((x, y))
                    visited[y][x] = True
        for y in range(h):
            for x in (0, w - 1):
                if not visited[y][x] and is_bg(x, y, base):
                    queue.append((x, y))
                    visited[y][x] = True
        while queue:
            x, y = queue.popleft()
            px[x, y] = (0, 0, 0, 0)
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx] and is_bg(nx, ny, base):
                    visited[ny][nx] = True
                    queue.append((nx, ny))
    return img


def remove_all_green(img: Image.Image, tolerance: int) -> Image.Image:
    """全图移除接近纯绿（#00FF00）的像素——生图提示词改用绿幕背景时的抠底模式，
    与图标内容颜色差距大，不会误伤内部浅色/白色内容。"""
    img = img.convert('RGBA')
    w, h = img.size
    px = img.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if g >= 255 - tolerance and r <= tolerance * 2 and b <= tolerance * 2:
                px[x, y] = (0, 0, 0, 0)
    return img


def remove_all_white(img: Image.Image, tolerance: int) -> Image.Image:
    """全图移除接近纯白的像素（含被前景包围的封闭区域，如环形框的中心）。"""
    img = img.convert('RGBA')
    w, h = img.size
    px = img.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if r >= 255 - tolerance and g >= 255 - tolerance and b >= 255 - tolerance:
                px[x, y] = (0, 0, 0, 0)
    return img


def main() -> None:
    src, dst = sys.argv[1], sys.argv[2]
    max_dim = int(sys.argv[3]) if len(sys.argv) > 3 else 288
    tolerance = int(sys.argv[4]) if len(sys.argv) > 4 else 32
    mode = sys.argv[5] if len(sys.argv) > 5 else 'flood'

    img = Image.open(src)
    if mode == 'allwhite':
        img = remove_all_white(img, tolerance)
    elif mode == 'allgreen':
        img = remove_all_green(img, tolerance)
    else:
        img = remove_background(img, tolerance)

    # 轻微羽化 alpha 边缘，弱化白边
    alpha = img.getchannel('A').filter(ImageFilter.GaussianBlur(0.8))
    img.putalpha(alpha)

    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    w, h = img.size
    scale = max_dim / max(w, h)
    if scale < 1:
        img = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)

    img.save(dst, optimize=True)
    print(f'ok: {dst} {img.size[0]}x{img.size[1]}')


if __name__ == '__main__':
    main()

"""资源格式对账：一个 key 只准有一种扩展名，且构建包里真的带着它。

为什么需要它（2026-09-22 三十六轮）：加载走 `resources.load('textures/<key>/spriteFrame')`，
**扩展名不在契约里**，所以把 `xxx.png` 换成 `xxx.jpg` 是零代码改动的纯资源动作。
这个便利性同时带来一个没人管的坑——如果哪天有人把 `xxx.png` 又丢回同一个目录，
而 `xxx.jpg` 还在，磁盘上就有了**两个同名 key**。Cocos 会给它们各自一个 uuid，
`resources.load` 命中哪一个取决于配置里的登记顺序，而源侧的 `check-art-manifest`
只看"这个 key 有没有图"，两边都有图时它照样绿。所以这条只能自己查。

第二件事同样只在产物层才看得见：转换过的 key 在**构建包**里到底带的是哪个扩展名。
磁盘上删干净了、`library/` 缓存里没删，构建照样能把旧 PNG 打进包（反之亦然），
源侧对账查不到这一层。所以断言取的是产物目录里那个**真实文件名**
（`build/web-mobile/assets/resources/native/<前两位>/<uuid>.<ext>`），不是配置里的某个字段。

用法：
    python tools/check_asset_formats.py            # 全量报告
    python tools/check_asset_formats.py --check    # 收尾链用的闸：有问题退出码 1
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent.parent
TEX = ROOT / 'assets' / 'resources' / 'textures'
CONFIG = ROOT / 'build' / 'web-mobile' / 'assets' / 'resources' / 'config.json'

# 本轮从 PNG 转成 JPG 的五件：它们最容易被"顺手把旧图拖回来"搞出双 key
CONVERTED = [
    'textures/characters/commander',
    'textures/characters/specialists',
    'textures/scenes/escort',
    'textures/scenes/recruit',
    'textures/scenes/vehicle_tail_damaged',
]


def scan_duplicates():
    """key（去扩展名的相对路径）→ 磁盘上占这个 key 的所有扩展名。"""
    by_key = defaultdict(list)
    for p in sorted(TEX.rglob('*')):
        if not p.is_file() or p.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
            continue
        rel = p.relative_to(TEX).with_suffix('')
        by_key[str(rel).replace('\\', '/')].append(p.suffix.lower().lstrip('.'))
    return by_key


def main():
    check = '--check' in sys.argv
    fails = []

    by_key = scan_duplicates()
    dupes = {k: v for k, v in by_key.items() if len(v) > 1}
    if dupes:
        for k, exts in dupes.items():
            print(f'FAIL 双 key：textures/{k} 同时存在 {exts}——加载按去后缀的 key 走，命中哪个看登记顺序')
            fails.append(k)
    else:
        print(f'PASS 磁盘 {len(by_key)} 个 key，没有一个 key 挂着两种扩展名')

    if not CONFIG.exists():
        print(f'{"FAIL" if check else "SKIP"} 构建产物配置不在位：{CONFIG.relative_to(ROOT)}（先构建再跑 --check）')
        if check:
            fails.append('no-config')
    else:
        cfg = json.loads(CONFIG.read_text(encoding='utf-8'))
        # 扩展名的**唯一实况来源**是产物目录里的文件名：`native/<前两位>/<uuid>.<ext>`。
        # 不去猜 config.json 的 schema——这个版本的 `extensionMap` 就是空的，
        # 照着"应该有"写会读出一串假 PASS（工具报绿而什么都没证明，是最坏的一种工具）。
        native = ROOT / 'build' / 'web-mobile' / 'assets' / 'resources' / 'native'
        ext_by_uuid = {}
        for f in native.rglob('*'):
            if f.is_file() and f.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp'):
                ext_by_uuid[f.stem] = f.suffix.lower().lstrip('.')
        hist = defaultdict(int)
        for e in ext_by_uuid.values():
            hist[e] += 1
        print(f'PASS 包内贴图文件 {len(ext_by_uuid)} 个：' + '  '.join(f'.{e}×{n}' for e, n in sorted(hist.items())))

        paths = cfg.get('paths') or {}
        uuid_by_key = {}
        for uuid, entry in paths.items():
            if isinstance(entry, list) and len(entry) >= 2 and entry[1] == 'cc.ImageAsset' and '@' not in uuid:
                uuid_by_key[entry[0]] = uuid
        for key in CONVERTED:
            uuid = uuid_by_key.get(key)
            if uuid is None:
                print(f'FAIL 转过的 key 没进包配置：{key}')
                fails.append(key)
                continue
            ext = ext_by_uuid.get(uuid)
            if ext != 'jpg':
                print(f'FAIL {key} 包内实际是 .{ext}（期望 .jpg）——缓存里还留着旧 PNG')
                fails.append(key)
            else:
                print(f'PASS 包内 {key} -> .jpg（uuid {uuid[:8]}…）')

    if check:
        print('\nCHECK ' + ('PASS 扩展名与包内格式一致' if not fails else f'FAIL {len(fails)} 项：{fails}'))
        sys.exit(1 if fails else 0)


main()

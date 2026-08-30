#!/usr/bin/env python3
"""生图包装：读取本地密钥配置（tools/imagegen.local.json，不入库），
把第三方 gpt-image2 skill 指向用户自建网关后调用其生成脚本。

用法：
  python tools/gen_image.py <generate_image2.py 原始参数...>
示例：
  python tools/gen_image.py --prompt "..." --size 1024x1024 --basename hud_icon
"""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILL_SCRIPT = ROOT.parent / 'gpt-image2-skill' / 'skills' / 'gpt-image2' / 'scripts' / 'generate_image2.py'
LOCAL_CONFIG = Path(__file__).resolve().parent / 'imagegen.local.json'


def main() -> int:
    if not LOCAL_CONFIG.exists():
        print(f'missing local config: {LOCAL_CONFIG}（含 baseUrl/apiKey，不入库）')
        return 2
    cfg = json.loads(LOCAL_CONFIG.read_text(encoding='utf-8'))
    base = str(cfg['baseUrl']).rstrip('/')
    if not base.endswith('/v1'):
        base += '/v1'
    os.environ['NEW_image2_API_KEY'] = cfg['apiKey']

    sys.path.insert(0, str(SKILL_SCRIPT.parent))
    import generate_image2 as mod  # noqa: E402

    mod.BASE_URL = base
    mod.GENERATIONS_ENDPOINT = base + '/images/generations'
    mod.EDITS_ENDPOINT = base + '/images/edits'

    out_dir = ROOT.parent / 'gen-output'
    out_dir.mkdir(exist_ok=True)
    sys.argv = ['gen_image.py', '--output-dir', str(out_dir)] + sys.argv[1:]
    return mod.main()


if __name__ == '__main__':
    raise SystemExit(main())

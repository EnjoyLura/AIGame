#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
把 assets/scripts 下 TS 模板字符串里散落的 6 位 hex 替换为 var(--c-*) token。

映射表单一来源 = assets/scripts/ui/UiTheme.ts（--c-name: #rrggbb;）。
规则：
  - 只替换「不带引号」的 hex（CSS 模板串）；引号内的 '#xxxxxx' 是 canvas
    Color(...) / 颜色数学函数入参，不能换成 var()，跳过并打印为未迁移清单。
  - 不在映射表里的 hex 原样保留，同样打印出来（下一轮换肤的补表清单）。
用法：
  python tools/tokenize_colors.py          # 试运行，只打印报告
  python tools/tokenize_colors.py --apply  # 实际写回
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
THEME = ROOT / 'assets/scripts/ui/UiTheme.ts'
SCAN_DIR = ROOT / 'assets/scripts'

# hex token：前面不是引号/单词字符，后面紧跟边界且不是引号
HEX_RE = re.compile(r"(?<![\w'\"])(#[0-9a-fA-F]{6})\b(?!['\"])")
TOKEN_RE = re.compile(r"--c-([\w-]+):\s*#([0-9a-fA-F]{6})\s*;")


def load_mapping() -> dict:
    m = {}
    for name, hexv in TOKEN_RE.findall(THEME.read_text(encoding='utf-8')):
        m['#' + hexv.lower()] = f'var(--c-{name})'
    return m


def main() -> None:
    apply = '--apply' in sys.argv
    mapping = load_mapping()
    print(f'映射表 {len(mapping)} 个 token（来自 {THEME.name}）')

    total = 0
    changed_files = []
    leftovers = {}   # file -> {hex: count} 映射表里没有的（引号内 + 未建 token）
    for path in sorted(SCAN_DIR.rglob('*.ts')):
        if path.resolve() == THEME.resolve():
            continue
        src = path.read_text(encoding='utf-8')
        n, local_left = 0, {}

        def sub(mo: re.Match) -> str:
            nonlocal n
            raw = mo.group(1)
            rep = mapping.get(raw.lower())
            if rep is None:
                local_left[raw.lower()] = local_left.get(raw.lower(), 0) + 1
                return raw
            n += 1
            return rep

        out = HEX_RE.sub(sub, src)
        if local_left:
            leftovers[str(path.relative_to(ROOT))] = local_left
        if n and apply:
            path.write_text(out, encoding='utf-8')
            changed_files.append((str(path.relative_to(ROOT)), n))
        elif n:
            changed_files.append((str(path.relative_to(ROOT)), n))
        total += n

    print(f'\n{"已写回" if apply else "试运行（加 --apply 写回）"}：可迁移 {total} 处')
    for f, n in changed_files:
        print(f'  {n:5d}  {f}')

    if leftovers:
        print('\n未迁移（映射表没有/引号内，换肤时需人工同步）：')
        for f, hexes in leftovers.items():
            detail = ', '.join(f'{h}×{c}' for h, c in sorted(hexes.items()))
            print(f'  {f}: {detail}')


if __name__ == '__main__':
    main()

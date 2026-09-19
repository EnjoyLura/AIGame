#!/usr/bin/env node
/**
 * 美术契约对账：磁盘文件 ↔ AssetLib MANIFEST ↔ 代码引用 三方一致。
 *  - MANIFEST 里的 key 必须有 textures/<key>.png（预留槽位须在下方 RESERVED 说明）；
 *  - 磁盘上的图必须在 MANIFEST（孤儿 = 上一轮没登记就删/换了）；
 *  - 代码里 AssetLib.frame('…') / _tex('…') 字面量引用的 key 必须已登记
 *    （防「引用了但预载清单没有 → 永远静默占位」的 escort 类 bug）。
 * 用法：node tools/check-art-manifest.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEXTURES = path.join(ROOT, 'assets/resources/textures');
const SCRIPTS = path.join(ROOT, 'assets/scripts');
const ART_SPEC = path.join(ROOT, 'art-spec');

/** 预留槽位：清单已登记、文件未到位（缺图回退占位，图到位即生效） */
const RESERVED = {
    'weapons/sniper_bullet': '狙击弹道贴图，待弹道美术',
    'weapons/laser_beam': '激光束贴图，待弹道美术',
    'weapons/radiation_bullet': '辐射弹贴图，待弹道美术',
};

let fail = 0;
const ok = (cond, label) => {
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
    if (!cond) fail++;
};

// ---- 1. 解析 MANIFEST（剔除注释行后取引号 key）----
const libSrc = fs.readFileSync(path.join(SCRIPTS, 'core/AssetLib.ts'), 'utf-8');
const manifestBlock = libSrc.split('const MANIFEST = [')[1].split(']')[0]
    .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
const manifestKeys = [...manifestBlock.matchAll(/'([\w/]+)'/g)].map(m => m[1]);
ok(manifestKeys.length > 0, `MANIFEST 解析到 ${manifestKeys.length} 个 key`);

// ---- 2. 磁盘清单（png/jpg/webp 都算）----
const diskKeys = fs.readdirSync(TEXTURES, { recursive: true })
    .map(f => f.toString().replace(/\\/g, '/'))
    .filter(f => /\.(png|jpg|webp)$/.test(f))
    .map(f => f.slice(0, f.lastIndexOf('.')));
ok(diskKeys.length > 0, `磁盘 textures 下 ${diskKeys.length} 张图（png/jpg/webp）`);

// ---- 3. MANIFEST key 必须有文件（预留除外）----
const missing = manifestKeys.filter(k => !diskKeys.includes(k));
const badReserve = missing.filter(k => !RESERVED[k]);
ok(badReserve.length === 0,
    `MANIFEST 缺文件且未声明预留：${badReserve.length ? badReserve.join(', ') : '无'}`);
const staleReserve = Object.keys(RESERVED).filter(k => !missing.includes(k));
ok(staleReserve.length === 0,
    `预留声明已过时（图已到位，请从 RESERVED 删除）：${staleReserve.length ? staleReserve.join(', ') : '无'}`);

// ---- 4. 磁盘孤儿 ----
const orphans = diskKeys.filter(k => !manifestKeys.includes(k));
ok(orphans.length === 0,
    `磁盘孤儿（在库未登记，登记进 MANIFEST 或删除）：${orphans.length ? orphans.join(', ') : '无'}`);

// ---- 5. 代码引用必须已登记 ----
const codeRefs = new Set();
for (const p of fs.readdirSync(SCRIPTS, { recursive: true })) {
    if (!p.toString().endsWith('.ts')) continue;
    const src = fs.readFileSync(path.join(SCRIPTS, p), 'utf-8');
    for (const m of src.matchAll(/(?:AssetLib\.frame|_tex)\(\s*'([\w/]+)'\s*[,)]/g)) {
        codeRefs.add(m[1]);
    }
}
const unregistered = [...codeRefs].filter(k => !manifestKeys.includes(k));
ok(unregistered.length === 0,
    `代码引用未登记（会永远静默占位）：${unregistered.length ? unregistered.join(', ') : '无'}`);

// ---- 5.5 挂起纹理自续排水（换图冷加载必踩的竞态：图晚于首次排水到达则永不显示）----
const homeCoreSrc = fs.readFileSync(path.join(SCRIPTS, 'ui/HomeUiCore.ts'), 'utf-8');
ok(/_pendingTexTimer/.test(homeCoreSrc) && /this\._applyPendingTex\(\);\s*\n\s*\},\s*400\)/.test(homeCoreSrc),
    'HomeUiCore 挂起纹理自续排水（_pendingTexTimer 400ms 重排）');

// ---- 6. art-spec 规范文件在位 ----
for (const f of ['game_art_benchmark.png', 'STYLE-SPEC.md', 'ASSET-MANIFEST.md']) {
    ok(fs.existsSync(path.join(ART_SPEC, f)), `art-spec/${f} 在位`);
}

console.log(`\n共 ${5 + 3 + Object.keys(RESERVED).length * 0} 组断言，失败 ${fail} 项`);
process.exit(fail ? 1 : 0);

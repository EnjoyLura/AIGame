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

/** 预留槽位：从 AssetLib 的 RESERVED_SLOTS 解析（单源，登记即说明），不再在本文件硬编码 */
const libSrc = fs.readFileSync(path.join(SCRIPTS, 'core/AssetLib.ts'), 'utf-8');

function parseReserved(src) {
    const block = src.split('export const RESERVED_SLOTS')[1];
    if (!block) {
        return {};
    }
    const body = block.slice(block.indexOf('{'), block.indexOf('};'));
    const out = {};
    for (const m of body.matchAll(/'([\w/]+)':\s*'([^']*)'/g)) {
        out[m[1]] = m[2];
    }
    return out;
}
const RESERVED = parseReserved(libSrc);
const TEX_CATS = 'ui|icons|monsters|characters|scenes|weapons|fx';

let fail = 0;
let checked = 0;
const ok = (cond, label) => {
    checked++;
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
    if (!cond) fail++;
};

// ---- 1. 解析 MANIFEST（剔除注释行后取引号 key）----
const manifestBlock = libSrc.split('const MANIFEST = [')[1].split(']')[0]
    .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
const manifestKeys = [...manifestBlock.matchAll(/'([\w/]+)'/g)].map(m => m[1]);
ok(manifestKeys.length > 0, `MANIFEST 解析到 ${manifestKeys.length} 个 key`);
ok(Object.keys(RESERVED).length > 0, `RESERVED_SLOTS 解析到 ${Object.keys(RESERVED).length} 个预留槽位`);

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

// ---- 5. 代码引用必须已登记（含契约表 UiPlate 与 iconTex/贴图槽的字面量）----
const codeRefs = new Set();
for (const p of fs.readdirSync(SCRIPTS, { recursive: true })) {
    if (!p.toString().endsWith('.ts')) continue;
    const src = fs.readFileSync(path.join(SCRIPTS, p), 'utf-8')
        .split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    for (const m of src.matchAll(/'(?:AssetLib\.frame|_tex)\(\s*'([\w/]+)'\s*[,)]/g)) {
        codeRefs.add(m[1]);
    }
    // 覆盖面从「只有 _tex(...) 调用」扩到所有形如 '<分类>/<名>' 的字符串字面量：
    // 契约表（UiPlate.PLATE/NAV_PLATE/QUALITY_FRAME）与 iconTex/RES_ICON 之类的槽位同样必须登记，
    // 否则引用一个没登记的 key 会永远静默占位（escort 类 bug）。
    for (const m of src.matchAll(new RegExp(`'(${TEX_CATS})/[A-Za-z0-9_]+'`, 'g'))) {
        codeRefs.add(m[0].slice(1, -1));
    }
}
const unregistered = [...codeRefs].filter(k => !manifestKeys.includes(k));
ok(unregistered.length === 0,
    `代码引用未登记（会永远静默占位）：${unregistered.length ? unregistered.join(', ') : '无'}`);

// ---- 5.4 预留槽位必须同时登记进 MANIFEST（清单是权威，说明表只是注记）----
const reserveNotListed = Object.keys(RESERVED).filter(k => !manifestKeys.includes(k));
ok(reserveNotListed.length === 0,
    `RESERVED_SLOTS 有 key 未进 MANIFEST：${reserveNotListed.length ? reserveNotListed.join(', ') : '无'}`);

// ---- 5.5 挂起纹理自续排水（换图冷加载必踩的竞态：图晚于首次排水到达则永不显示）----
const homeCoreSrc = fs.readFileSync(path.join(SCRIPTS, 'ui/HomeUiCore.ts'), 'utf-8');
ok(/_pendingTexTimer/.test(homeCoreSrc) && /this\._applyPendingTex\(\);\s*\n\s*\},\s*400\)/.test(homeCoreSrc),
    'HomeUiCore 挂起纹理自续排水（_pendingTexTimer 400ms 重排）');

// ---- 5.6 通用件契约层 ↔ 规范文档对账（一类通用件一条，文档漏了就报）----
const plateSrc = fs.readFileSync(path.join(SCRIPTS, 'ui/UiPlate.ts'), 'utf-8');
const specSrc = fs.readFileSync(path.join(ART_SPEC, 'STYLE-SPEC.md'), 'utf-8');
const plateKeys = [...new Set([...plateSrc.matchAll(new RegExp(`'(${TEX_CATS})/[A-Za-z0-9_]+'`, 'g'))]
    .map(m => m[0].slice(1, -1)))];
ok(plateKeys.length >= 15, `UiPlate 契约表解析到 ${plateKeys.length} 个通用件槽位`);
const specMissing = plateKeys.filter(k => !specSrc.includes(k));
ok(specMissing.length === 0,
    `UiPlate 槽位未登记进 STYLE-SPEC 契约表：${specMissing.length ? specMissing.join(', ') : '无'}`);

// ---- 5.7 九宫格参数单源：页面里不再手写 borderImage*（切坏角 = 美术白出图）----
const handWritten = [];
for (const p of fs.readdirSync(path.join(SCRIPTS, 'ui'), { recursive: true })) {
    const f = p.toString();
    if (!f.endsWith('.ts') || f === 'UiPlate.ts') continue;
    const src = fs.readFileSync(path.join(SCRIPTS, 'ui', f), 'utf-8');
    if (/style\.borderImage(Source|Slice|Width|Repeat)/.test(src)) handWritten.push(f);
}
ok(handWritten.length === 0,
    `手写 borderImage 的文件（应改走 UiPlate.nineSlice）：${handWritten.length ? handWritten.join(', ') : '无'}`);

// ---- 6. art-spec 规范文件在位 ----
for (const f of ['game_art_benchmark.png', 'STYLE-SPEC.md', 'ASSET-MANIFEST.md', 'ART-PLAN.md']) {
    ok(fs.existsSync(path.join(ART_SPEC, f)), `art-spec/${f} 在位`);
}

console.log(`\n共 ${checked} 组断言，失败 ${fail} 项`);
process.exit(fail ? 1 : 0);

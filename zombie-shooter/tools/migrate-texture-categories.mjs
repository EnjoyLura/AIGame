#!/usr/bin/env node
/**
 * 一次性迁移脚本（2026-09-21）：把 assets/resources/textures/ui/ 下的在库图按类别移进子目录，
 * 把「在库但无宿主」的 12 件移出工程资源目录到 art-spec/reference/stock/。
 *
 *   node tools/migrate-texture-categories.mjs          # 干跑：只打计划、覆盖度自检与命中数
 *   node tools/migrate-texture-categories.mjs --apply  # 真做：git mv（png + .png.meta 成对）+ 全量 key 改写
 *
 * 契约：key = 去掉扩展名的相对路径。移动后 key 从 `ui/X` 变成 `ui/<类别>/X`，
 * 所以文件移动与字符串改写必须同一轮完成，否则 check-art-manifest 会报孤儿 + 未登记。
 * 脚本自带覆盖度自检：磁盘上每张 ui/*.png 与 AssetLib 里每个 ui/ key 都必须被下面三张表之一
 * 覆盖，漏一个就直接报错退出（防「静默少迁一张」）。
 *
 * 幂等性：改写正则在 key 后加了 `(?![A-Za-z0-9_/])` 否定前瞻，重复跑不会把
 * `ui/banner/banner` 再吃成 `ui/banner/banner/banner`。
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APPLY = process.argv.includes('--apply');

/** 在库件按类别归位（成员 = textures/ui/ 下真实存在的 png 主名） */
const MOVE_IN = {
    'ui/button': ['btn_play', 'btn_confirm', 'btn_cancel', 'btn_close', 'btn_danger', 'btn_video', 'btn_round', 'btn_round2'],
    'ui/panel': ['panel_main', 'panel_sub', 'panel_card'],
    'ui/banner': ['banner', 'ribbon_banner', 'ribbon_title', 'bar_title'],
    'ui/nav': ['nav_mall', 'nav_heroes', 'nav_battle', 'nav_core', 'nav_base'],
    'ui/res': ['res_gold', 'res_diamond', 'res_stamina'],
    'ui/ico': ['ico_task', 'ico_mail', 'ico_setting', 'ico_rank', 'ico_notice', 'ico_trophy', 'ico_signin',
        'ico_core', 'ico_weapon', 'ico_recruit', 'ico_forge', 'ico_del', 'ico_add', 'ico_trial',
        'ico_endless', 'ico_starup', 'ico_talent', 'ico_warn'],
    'ui/frame': ['frame_q0', 'frame_q1', 'frame_q2', 'frame_q3', 'avatar_frame'],
    'ui/shop': ['shop_gift', 'shop_chest', 'shop_scroll', 'shop_letter', 'chest'],
};

/** 无宿主件移出包：目标相对工程根（png 与 .png.meta 成对移，保住 uuid 以便复活） */
const MOVE_OUT = {
    'art-spec/reference/stock/rank': ['rank1', 'rank2', 'rank3', 'rank4', 'rank5', 'rank6', 'rank7'],
    'art-spec/reference/stock/frame': ['frame_bronze', 'frame_silver', 'frame_gold'],
    'art-spec/reference/stock/ico': ['ico_achieve', 'ico_lock'],
};

/**
 * 预留槽位（磁盘还没有图）按同一套类别归位，否则将来切片落盘会落到旧位置。
 * 规则来自用户 2026-09-21 拍的表，逐条照抄，不自行扩展。
 */
const RESERVED_IN = {
    'ui/button': ['btn_purple', 'btn_home', 'btn_help', 'btn_refresh'],
    // tab 族按用户的表归到 ui/ico/（不是 ui/nav/）
    'ui/ico': ['tab_hero', 'tab_equip', 'tab_gem', 'tab_mat', 'tab_core', 'tab_potion',
        'ico_codex', 'ico_skill', 'ico_ad', 'ico_more', 'ico_pause', 'ico_stats', 'ico_undo', 'ico_loot',
        'ico_inbox', 'ico_empty', 'ico_sound', 'ico_mute', 'ico_info', 'ico_slider', 'ico_check',
        'ico_friend', 'ico_calendar', 'ico_shop', 'ico_search'],
    // bar 族按用户的表归到 ui/banner/（bar_title 在库件也在那一挡）
    'ui/banner': ['bar_track', 'bar_fill_green', 'bar_fill_yellow', 'bar_fill_blue', 'bar_fill_red',
        'bar_cap', 'bar_node'],
    'ui/res': ['res_frag', 'res_medal', 'res_energy', 'res_ticket'],
    // medal / rank / frame / power_badge 归 ui/frame/
    'ui/frame': ['medal1', 'medal2', 'medal3', 'power_badge'],
    'ui/panel': ['row_card', 'panel_mini'],
};

/** 用户的表里没有给这一族规则 → 原样留在 ui/ 顶层，交人工拍板（脚本不动，只报出来） */
const UNRULED = ['plate_wave', 'skill_slot', 'boss_crown', 'star_on', 'star_off', 'lvtag',
    'tag_free', 'tag_sale', 'tag_hot', 'node_done', 'node_next', 'node_lock'];

// ---- 组装 oldKey -> newKey ----
const KEY_MAP = new Map();
const FILE_MOVES = [];   // { from, to, key, newKey } 在库件
const PACK_OUT = [];     // { from, to }  移出包
for (const [dir, names] of Object.entries(MOVE_IN)) {
    for (const n of names) {
        KEY_MAP.set(`ui/${n}`, `${dir}/${n}`);
        FILE_MOVES.push({ from: `assets/resources/textures/ui/${n}.png`, to: `assets/resources/textures/${dir}/${n}.png`, key: `ui/${n}`, newKey: `${dir}/${n}` });
    }
}
for (const [dir, names] of Object.entries(RESERVED_IN)) {
    for (const n of names) {
        KEY_MAP.set(`ui/${n}`, `${dir}/${n}`);
    }
}
for (const [dir, names] of Object.entries(MOVE_OUT)) {
    for (const n of names) {
        PACK_OUT.push({ png: `assets/resources/textures/ui/${n}.png`, meta: `assets/resources/textures/ui/${n}.png.meta`, to: path.posix.join(dir, `${n}.png`) });
    }
}

// ---- 覆盖度自检 1：磁盘 ui/*.png 必须被 MOVE_IN ∪ MOVE_OUT 完全覆盖，且文件成对存在 ----
const DISK_UI = 'assets/resources/textures/ui';
const diskPng = fs.readdirSync(path.join(ROOT, DISK_UI))
    .filter(f => f.endsWith('.png')).map(f => f.slice(0, -4)).sort();
const planned = [...Object.values(MOVE_IN).flat(), ...Object.values(MOVE_OUT).flat()].sort();
const notPlanned = diskPng.filter(n => !planned.includes(n));
const notOnDisk = planned.filter(n => !diskPng.includes(n));
if (notPlanned.length || notOnDisk.length) {
    console.error('!! 覆盖度自检失败：磁盘 ui/*.png 与分类表不一致');
    if (notPlanned.length) console.error('   表里没归属：', notPlanned.join(', '));
    if (notOnDisk.length) console.error('   磁盘上没有：', notOnDisk.join(', '));
    process.exit(2);
}
const missingMeta = diskPng.filter(n => !fs.existsSync(path.join(ROOT, DISK_UI, `${n}.png.meta`)));
if (missingMeta.length) {
    console.error('!! 缺 .png.meta，移动会丢 uuid：', missingMeta.join(', '));
    process.exit(2);
}
console.log(`覆盖度自检 1 OK：磁盘 ui/ 下 ${diskPng.length} 张 png = 归位 ${Object.values(MOVE_IN).flat().length} + 移出包 ${Object.values(MOVE_OUT).flat().length}，meta 全部成对在位`);

// ---- 覆盖度自检 2：AssetLib 里每个 ui/ key 必须被 KEY_MAP ∪ UNRULED ∪ 已删的出包 key 覆盖 ----
const libSrc = fs.readFileSync(path.join(ROOT, 'assets/scripts/core/AssetLib.ts'), 'utf-8');
const libUiKeys = [...new Set([...libSrc.matchAll(/'ui\/([A-Za-z0-9_]+)'/g)].map(m => m[1]))];
const outNames = Object.values(MOVE_OUT).flat();
const uncovered = libUiKeys.filter(n => !KEY_MAP.has(`ui/${n}`) && !UNRULED.includes(n) && !outNames.includes(n));
const stalePlan = [...KEY_MAP.keys()].filter(k => !libUiKeys.includes(k.slice(3)) && !outNames.includes(k.slice(3)));
if (uncovered.length) {
    console.error('!! AssetLib 有 ui/ key 不在任何表里（会漏改）：', uncovered.join(', '));
    process.exit(2);
}
console.log(`覆盖度自检 2 OK：AssetLib 解析到 ${libUiKeys.length} 个 ui/ key，全部有归属`
    + `（改 key ${KEY_MAP.size} / 留顶层 ${UNRULED.length} / 已移出包 ${outNames.length}）`
    + (stalePlan.length ? `；表内 AssetLib 未登记的预留 key：${stalePlan.map(k => k.slice(3)).join(', ')}` : ''));

// ---- 文本改写目标：assets/scripts/**/*.ts + art-spec 三份文档 ----
const TEXT_TARGETS = [];
for (const p of fs.readdirSync(path.join(ROOT, 'assets/scripts'), { recursive: true })) {
    const rel = p.toString().replace(/\\/g, '/');
    if (rel.endsWith('.ts')) TEXT_TARGETS.push(`assets/scripts/${rel}`);
}
for (const f of ['STYLE-SPEC.md', 'ASSET-MANIFEST.md', 'ART-PLAN.md']) TEXT_TARGETS.push(`art-spec/${f}`);

// 长 key 先匹配，配合否定前瞻，杜绝 ui/btn_round 吃掉 ui/btn_round2
const OLD_KEYS = [...KEY_MAP.keys()].sort((a, b) => b.length - a.length);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PATTERN = new RegExp(`(${OLD_KEYS.map(esc).join('|')})(?![A-Za-z0-9_/])`, 'g');

// 按新类别归组统计：`ui/<类别>` -> 该类别下命中的替换次数
function runTextPass() {
    const byCat = new Map();
    const byFile = new Map();
    let total = 0;
    for (const rel of TEXT_TARGETS) {
        const abs = path.join(ROOT, rel);
        const src = fs.readFileSync(abs, 'utf-8');
        const hits = new Map();
        const out = src.replace(PATTERN, m => {
            const nk = KEY_MAP.get(m);
            const cat = nk.slice(0, nk.lastIndexOf('/'));
            hits.set(m, (hits.get(m) || 0) + 1);
            byCat.set(cat, (byCat.get(cat) || 0) + 1);
            total++;
            return nk;
        });
        const n = [...hits.values()].reduce((a, b) => a + b, 0);
        if (n) {
            byFile.set(rel, { n, keys: hits.size, residual: (out.match(PATTERN) || []).length });
            if (APPLY && out !== src) fs.writeFileSync(abs, out);
        }
    }
    return { byCat, byFile, total };
}

console.log(`\n计划：git mv ${FILE_MOVES.length} 张在库图 + ${PACK_OUT.length} 张出包图（各带 .png.meta），改写 ${TEXT_TARGETS.length} 个文件里的 key 字面量`);
console.log(`模式：${APPLY ? 'APPLY（真做）' : 'DRY-RUN（只报告）'}\n`);

if (APPLY) {
    for (const d of Object.keys(MOVE_IN)) fs.mkdirSync(path.join(ROOT, 'assets/resources/textures', d), { recursive: true });
    for (const d of Object.keys(MOVE_OUT)) fs.mkdirSync(path.join(ROOT, d), { recursive: true });
}
// 工程根即 git 仓库内的一个子目录，所有路径都相对 ROOT，git 的 cwd 也必须用 ROOT
function mv(from, to) {
    execFileSync('git', ['mv', from, to], { cwd: ROOT, stdio: 'pipe' });
}
if (APPLY) {
    for (const m of FILE_MOVES) { mv(m.from, m.to); mv(m.from + '.meta', m.to + '.meta'); }
    for (const m of PACK_OUT) { mv(m.png, m.to); mv(m.meta, m.to + '.meta'); }
    console.log(`git mv 完成：${FILE_MOVES.length + PACK_OUT.length} 张 png + 同数 .png.meta`);
} else {
    console.log('(干跑：未执行 git mv)');
}

const r = runTextPass();
console.log('\n替换命中数（按新类别）：');
for (const [cat, n] of [...r.byCat.entries()].sort()) console.log(`  ${cat.padEnd(12)} ${n}`);
console.log(`  ${'合计'.padEnd(10)} ${r.total}`);
console.log('\n替换命中数（按文件）：');
for (const [f, v] of [...r.byFile.entries()].sort()) {
    console.log(`  ${f.padEnd(46)} ${String(v.n).padStart(3)} 处 / ${v.keys} 个不同 key`
        + (APPLY ? ` ；残留旧 key ${v.residual}` : ''));
}
if (!APPLY) {
    console.log('\n（干跑：文件未改。加 --apply 执行）');
    console.log('\n未归类、按表保持 ui/ 顶层原样的预留 key（交人工判断）：');
    console.log('  ' + UNRULED.map(n => `ui/${n}`).join(', '));
}

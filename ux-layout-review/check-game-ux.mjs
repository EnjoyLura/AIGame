#!/usr/bin/env node
/**
 * check-game-ux.mjs — game-ux.html 游戏化交互稿断言（配 AGENTS「设计稿约定」）：
 * 灰阶声明、六档归类齐全、无死键（可点元素必带 data-route）、唯一滚动轴、
 * 高度上限（S68/M64/L73/XL78）、半透无背板档（结算/暂停/演出）不得出现面板底、演出必留跳过出路。
 * 用法：node check-game-ux.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(root, 'game-ux.html'), 'utf8');

let fail = 0;
const ok = (name, cond, extra = '') => {
  if (!cond) fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${cond || !extra ? '' : ' —— ' + extra}`);
};

// 1. 灰阶声明（设计稿约定：稿内一律灰阶占位并显式声明）
ok('灰阶声明在稿首', /灰阶声明：<\/b>本稿只定义布局/.test(html));

// 2. 六档归类齐全
for (const t of ['S 确认框', 'M 表单/详情', 'L 列表/页签', 'XL 二级页', 'L4 结算/暂停', 'L5 演出']) {
  ok(`§0 归类含「${t}」`, html.includes(t));
}

// 3. 无死键：所有可点元素必须带 data-route（button/a/带 click 语义的标注）
const clickables = [...html.matchAll(/<(button|a)\b[^>]*>/g)].map(m => m[0]);
const naked = clickables.filter(tag => !/data-route=/.test(tag));
ok(`可点元素 ${clickables.length} 个全部带 data-route`, naked.length === 0,
  naked.slice(0, 3).join(' | '));
ok('跳过演出有出路（data-route=点击跳过演出）', html.includes('data-route="点击跳过演出"'));

// 4. 唯一滚动轴：可滚动的 overflow（auto/scroll）只允许出现在 .gscroll 一族；
//    overflow:hidden 是裁切（手机框/行卡文字截断），不算滚动轴
const overflowLines = html.split('\n').filter(l => {
  const m = l.match(/overflow(-y|-x)?\s*:\s*(hidden|auto|scroll|clip)/);
  return m && m[2] !== 'hidden' && m[2] !== 'clip';
});
ok('滚动轴只定义在 .gscroll', overflowLines.every(l => l.includes('.gscroll') || l.trim().startsWith('/*')),
  overflowLines.filter(l => !l.includes('.gscroll')).slice(0, 2).join(' / '));

// 5. 高度上限：稿内 vh 字面值不得超过档位上限（S68 / M64 / L73 / XL78）
const vh = [...html.matchAll(/(\d+)vh/g)].map(m => +m[1]);
ok('vh 数值全部在档位上限内（≤78）', vh.every(v => v <= 78), `出现 ${[...new Set(vh)].join(',')}`);

// 6. 半透无背板：§5 结算 / §6 暂停 / §7 演出三个 overlay 内不得出现 .gpanel 面板底
const phones = html.split('<div class="phone">').slice(1);
const sectionOf = p => (p.match(/ph-label">([^<]*)</) || [])[1] || '';
const overlayNoPlate = ['§5', '§6', '§7'].map(sec => {
  const p = phones.find(x => sectionOf(x).startsWith(sec));
  if (!p) return [sec, false, '缺面板'];
  const ov = p.slice(p.indexOf('class="overlay"'));
  return [sec, !ov.includes('gpanel'), ''];
});
for (const [sec, pass, why] of overlayNoPlate) {
  ok(`${sec} 半透无背板（overlay 内无 gpanel）`, pass, why);
}

// 7. L4 结算的关键组件：大字锚 + 统计芯片 + 双 CTA 次行
const p5 = phones.find(x => sectionOf(x).startsWith('§5'));
ok('结算含大字/芯片行/loot 格', !!p5 && p5.includes('bigword') && p5.includes('chips') && p5.includes('loots'));

// 8. 每个面板都有规格标注（ph-label）
const unlabeled = phones.filter(p => !sectionOf(p)).length;
ok(`面板 ${phones.length} 个均有规格标注`, unlabeled === 0, `${unlabeled} 个缺 ph-label`);

// 9. XL 双区工作台口径：§4 有左右分栏（立绘区 + 货架区）
const p4 = phones.find(x => sectionOf(x).startsWith('§4'));
ok('XL 为双区工作台（立绘+货架）', !!p4 && /英雄立绘|槽位/.test(p4) && /背包|仓库/.test(p4));

console.log(fail ? `FAIL ${fail} 项` : 'PASS 全部断言');
process.exit(fail ? 1 : 0);

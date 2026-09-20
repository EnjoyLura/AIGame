// 一次性汇总：把 ui-surfaces.json 里的面按「有没有贴图」归类，按尺寸排序，供美术按类别规划用
import { readFileSync } from 'node:fs';
const data = JSON.parse(readFileSync(process.argv[2] || '../gen-output/ui-surfaces.json', 'utf-8'));
for (const [page, faces] of Object.entries(data)) {
  const nine = faces.filter(f => f.tex === 'nine');
  const bg = faces.filter(f => f.tex === 'bg');
  const bare = faces.filter(f => f.tex === '-');
  console.log(`\n===== ${page}  共 ${faces.length} 面：九宫格 ${nine.length} / 贴图 ${bg.length} / 无图 ${bare.length}`);
  const key = f => `${f.cls || '(无类名)'}｜${f.txt}`;
  console.log('-- 已有贴图：');
  for (const f of [...nine, ...bg]) console.log(`   ${key(f)}  ${f.w}x${f.h} ${f.tex === 'nine' ? '九宫格' : '背景图'} r=${f.radius}`);
  console.log('-- 还是纯色/渐变（按面积从大到小，前 22）：');
  for (const f of bare.sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 22)) {
    console.log(`   ${key(f)}  ${f.w}x${f.h} r=${f.radius} ${f.grad ? '渐变' : '纯色'} bd=${f.border}`);
  }
}

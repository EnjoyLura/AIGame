/* 战斗局内布局交互稿 静态断言（与 check-popups.mjs 同风格）
   用法：node check-battle.mjs —— 全部通过输出「合计 N 项断言，失败 0 项」并以 0 退出。 */
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('./battle.html', import.meta.url), 'utf8');
let checked = 0, fail = 0;
const ok = (name, cond) => {
  checked++;
  console.log((cond ? 'PASS ' : 'FAIL ') + name);
  if (!cond) fail++;
};

/* ---------- 1. 可执行性 ---------- */
const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);
const script = scriptMatch ? scriptMatch[1] : '';
ok('内联脚本存在且语法可解析', script.length > 0 && (() => { try { new Function(script); return true; } catch { return false; } })());
ok('控制器用 onclick 属性挂载（.phone 跨重绘复用，避免监听叠加）',
  /phone\.onclick = e => \{/.test(script) && !/phone\.addEventListener\('click'/.test(script));
ok('提示条随重绘产出（不被 phone.innerHTML 覆盖清掉）',
  /function feedbackHTML\(\)/.test(script) && /html \+= feedbackHTML\(\);/.test(script));
ok('状态可重置（倍速/选卡/红点）', /const resetState = \(\) => \{/.test(script));

/* ---------- 2. 母版与目录 ---------- */
ok('四母版齐备（H1 常驻 / H2 打断 / H3 浮窗 / H4 结算）',
  /\['H1 · 常驻层（不暂停）'/.test(script) && /\['H2 · 打断层（暂停战斗）'/.test(script)
  && /\['H3 · 浮窗（不暂停）'/.test(script) && /\['H4 · 结算层'/.test(script));
ok('九面齐备（hud/boss/endless/levelup/pause/stats/menu/clear/fail）',
  ['hud', 'boss', 'endless', 'levelup', 'pause', 'stats', 'menu', 'clear', 'fail']
    .every(k => new RegExp(`^  ${k}: \\[`, 'm').test(script) || new RegExp(`^  ${k}: `, 'm').test(script)));
ok('每面都有右栏说明（NOTE 覆盖全部面）',
  ['hud', 'boss', 'endless', 'levelup', 'pause', 'stats', 'menu', 'clear', 'fail']
    .every(k => new RegExp(`^  ${k}: \\[`, 'm').test(script)));

/* ---------- 3. H1 常驻层 ---------- */
ok('顶栏四件套：暂停 / 统计 / 菜单(含邮件红点) / 经验条+等级徽章',
  /data-act="bPause"/.test(html) && /data-act="bStats"/.test(html) && /data-act="bMenu"/.test(html)
  && /class="xpTrack"/.test(html) && /class="lvBadge"/.test(html));
ok('波次 / 击杀 chip（波次文案按模式变化：3 / 10 ↔ 无尽）',
  /chipLab">波次</.test(html) && /chipLab">击杀</.test(html) && /view === 'endless' \? '无尽' : '3 \/ 10'/.test(script));
ok('技能列双列贴边（1/2 靠左、3/4 靠右）', /COLS = \[\s*\{ side: 'l'/.test(script) && /\{ side: 'r'/.test(script));
ok('每英雄三槽（普攻/技能/大招 自上而下），槽位带等级角标',
  /slot\(hs\[0\], 'basic', 205/.test(script) && /slot\(hs\[0\], 'skill', 241/.test(script)
  && /slot\(hs\[0\], 'ult', 277/.test(script) && /class="lv"/.test(html));
ok('x2 倍速在左列顶部（1 号位普攻上方），点击切换 1x/2x',
  /if \(side === 'l'\) inner来得及?/.test('') || (/side === 'l'\) inner \+= `<button class="x2/.test(script) && /speed = speed === 1 \? 2 : 1/.test(script)));
ok('冷却扇形遮罩 + 秒数；大招击杀充能自底灌满、充满亮环',
  /class="cd"/.test(html) && /class="cdTxt"/.test(html) && /class="chg"/.test(html)
  && /kind === 'ult' && chg >= 100 \? ' full'/.test(script));
ok('点按技能图标弹数值浮窗（真实技能名/描述/冷却）',
  /data-act="abTip"/.test(html) && /ab\.name/.test(script) && /ab\.desc/.test(script) && /冷却 \$\{ab\.cd\}s/.test(script));
ok('载具耐久条贴车顶 + 低耐久红晕（vignette）',
  /class="vehBody"/.test(html) && /class="vig"/.test(html) && /warn\/danger 两档/.test(html));
ok('战斗数据来自真实英雄定义（四英雄 / 技能名与冷却）',
  /步枪手·凯/.test(script) && /穿透齐射/.test(script) && /猎杀锁定/.test(script) && /过载光束/.test(script));

/* ---------- 4. H2 打断层（一律暂停） ---------- */
ok('升级三选一：三张卡 + 点卡即选 + 选后恢复战斗',
  (script.match(/\{ hero: '/g) || []).length === 3 && (html.match(/data-act="luPick"/g) || []).length >= 1
  && /战斗已暂停 · 选卡后恢复/.test(html)
  && /已选「\$\{c\.hero\} · \$\{c\.type\}」· 战斗恢复/.test(script));
ok('选卡内容为真实升级卡文案（连射/齐射/攻击强化）',
  /普攻·连射/.test(script) && /普攻·齐射/.test(script) && /攻击强化/.test(script) && /伤害 -20%/.test(script));
ok('三选一期间不可点遮罩关闭（战斗已暂停，防误触）', /case 'luDim': feedback\('选卡期间不可关闭（战斗已暂停）/.test(script));
ok('暂停菜单三条出路：继续 / 重试 / 退出（互斥说明在卡上）',
  /data-act="pResume"/.test(html) && /data-act="pRetry"/.test(html) && /data-act="pExit"/.test(html)
  && /升级三选一期间，暂停键不响应/.test(html));

/* ---------- 5. H3 浮窗（不暂停） ---------- */
ok('伤害统计：三芯片（总伤害/DPS/时长）+ 每英雄行（排名/头像/伤害/占比/占比条/三槽分账）',
  /团队总伤害/.test(html) && /团队 DPS/.test(html) && /战斗时长/.test(html)
  && /class="statRank"/.test(html) && /class="statSlots"/.test(html) && /普攻', '技能', '大招'/.test(script));
ok('战斗菜单：邮箱（红点同源）/ 设置 / 返回战斗，浮窗复用二级浮窗稿',
  /data-act="mMail"/.test(html) && /data-act="mSetting"/.test(html) && /复用二级浮窗稿（popups\.html）/.test(html));

/* ---------- 6. H4 结算层 ---------- */
ok('通关结算：三芯片 + 掉落网格（逐项错峰翻转）+ 双倍广告（文案=收益金额）',
  /击杀怪物/.test(html) && /团队等级/.test(html) && /金币收益（含首通）/.test(html)
  && /class="clLootGrid"/.test(html) && /错峰 0\.28s/.test(html) && /data-act="cAd"/.test(html));
ok('失败卡：标题按模式变体 + 数据行 + 重试/广告翻倍/返回主城',
  /护 送 失 败/.test(html) && /试炼局「试炼失败」/.test(html) && /副本局标题变「副本失败」/.test(html)
  && /data-act="fRetry"/.test(html) && /data-act="fAd"/.test(html) && /data-act="fHome"/.test(html));

/* ---------- 7. 无死键（data-act 全部有分支） ---------- */
const acts = new Set();
for (const m of script.matchAll(/case '([a-zA-Z0-9]+)'/g)) acts.add(m[1]);
const domActs = [...html.matchAll(/data-act="([a-zA-Z0-9]+)"/g)].map(m => m[1]);
ok('无死键：页面所有 data-act 在控制器里都有分支（含 x2 这类带数字的）',
  domActs.length > 0 && domActs.every(a => acts.has(a)));
ok('遮罩点击也有出路：打断层提示防误触，浮窗直接关闭',
  /case 'luDim'/.test(script) && /case 'pDim'/.test(script)
  && /case 'sDim'/.test(script) && /case 'mDim'/.test(script));

/* ---------- 8. 布局红线 ---------- */
ok('局内零滚动：样式表不出现 overflow-y 滚动容器（统计 4 英雄行以内即一屏）',
  !/overflow-y:\s*(auto|scroll)/.test(html));
ok('灰阶占位声明：不引入美术方案', /灰阶体块占位，不代表美术方案/.test(html) && /元素属性（火\/雷\/水\/毒）以文字占位/.test(html));
ok('视口三档（390×844 / 360×640 / 430×932）',
  /value="390,844"/.test(html) && /value="360,640"/.test(html) && /value="430,932"/.test(html));
ok('模式对照说明（普通/无尽/试炼/副本）',
  /普通关卡/.test(html) && /无尽/.test(html) && /试炼/.test(html) && /副本/.test(html));
ok('定位数值标注与设计分辨率换算说明（图标 Ø33px = 设计 92）',
  /Ø33px（设计 92）/.test(html) && /车辆均为灰阶体块占位/.test(html));

console.log(`\n合计 ${checked} 项断言，失败 ${fail} 项。`);
process.exit(fail ? 1 : 0);

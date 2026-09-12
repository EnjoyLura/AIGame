// HomeUi 拆分断言：继承链/壳文件/protected 化/abstract 声明/CSS 抽离
const fs = require('fs');
let fail = 0;
const ok = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name); if (!cond) fail++; };
const read = (f) => fs.readFileSync('assets/scripts/ui/' + f, 'utf8');
const FILES = ['HomeUi.ts', 'HomeUiCore.ts', 'HomeUiMall.ts', 'HomeUiHeroes.ts', 'HomeUiStage.ts', 'HomeUiPlay.ts', 'HomeUiBase.ts', 'HomeUiStyle.ts'];
const src = {};
for (const f of FILES) src[f] = read(f);
const all = FILES.map((f) => src[f]).join('\n');

// 1. 继承链
ok('HomeUi 终类壳 extends HomeUiBase', /export class HomeUi extends HomeUiBase \{\}/.test(src['HomeUi.ts']));
ok('HomeUiCore abstract extends Component', /export abstract class HomeUiCore extends Component \{/.test(src['HomeUiCore.ts']));
ok('HomeUiMall extends HomeUiCore', /export abstract class HomeUiMall extends HomeUiCore \{/.test(src['HomeUiMall.ts']));
ok('HomeUiHeroes extends HomeUiMall', /export abstract class HomeUiHeroes extends HomeUiMall \{/.test(src['HomeUiHeroes.ts']));
ok('HomeUiStage extends HomeUiHeroes', /export abstract class HomeUiStage extends HomeUiHeroes \{/.test(src['HomeUiStage.ts']));
ok('HomeUiPlay extends HomeUiStage', /export abstract class HomeUiPlay extends HomeUiStage \{/.test(src['HomeUiPlay.ts']));
ok('HomeUiBase extends HomeUiPlay', /export abstract class HomeUiBase extends HomeUiPlay \{/.test(src['HomeUiBase.ts']));

// 2. 拆分粒度：不再有 6000 行巨石文件（样式文件除外）
for (const f of ['HomeUi.ts', 'HomeUiCore.ts', 'HomeUiMall.ts', 'HomeUiHeroes.ts', 'HomeUiStage.ts', 'HomeUiPlay.ts', 'HomeUiBase.ts']) {
  const lines = src[f].split('\n').length;
  ok(`${f} <= 1800 行（当前 ${lines}）`, lines <= 1800);
}
ok('HomeUi.ts 壳文件 <= 30 行', src['HomeUi.ts'].split('\n').length <= 30);

// 3. 可见性：业务文件 private 清零（protected 化支撑继承链跨文件访问）
for (const f of ['HomeUiCore.ts', 'HomeUiMall.ts', 'HomeUiHeroes.ts', 'HomeUiStage.ts', 'HomeUiPlay.ts', 'HomeUiBase.ts']) {
  ok(`${f} 无 private 成员`, !/^    private /.test(src[f]));
}
ok('全部文件无 HomeUi._styleInjected 旧引用', !/HomeUi\._styleInjected/.test(all));

// 4. Core 的 abstract 声明（父调子必须声明）
ok('abstract 五页 build', (src['HomeUiCore.ts'].match(/protected abstract _build(Mall|Heroes|Stage|Play|Base)Page\(/g) || []).length === 5);
ok('abstract 五页 refresh', (src['HomeUiCore.ts'].match(/protected abstract _refresh(Mall|Heroes|StagePage|PlayPage|Base)\(\)/g) || []).length === 5);
ok('abstract _refreshTalentRed/_refreshEntryReds',
  /protected abstract _refreshTalentRed\(\): void;/.test(src['HomeUiCore.ts']) &&
  /protected abstract _refreshEntryReds\(\): void;/.test(src['HomeUiCore.ts']));
ok('abstract _heroSelIdx 属性', /protected abstract _heroSelIdx: number;/.test(src['HomeUiCore.ts']));

// 5. 各页文件落位抽查（一个锚点方法/字段）
ok('Core: _openStaminaModal', /protected _openStaminaModal\(\): void \{/.test(src['HomeUiCore.ts']));
ok('Core: _buildNoticeBar', /_buildNoticeBar\(root: HTMLDivElement\)/.test(src['HomeUiCore.ts']));
ok('Mall: _refreshMall', /protected _refreshMall\(\)/.test(src['HomeUiMall.ts']));
ok('Heroes: _renderSkillCards', /protected _renderSkillCards\(def: HeroDef\)/.test(src['HomeUiHeroes.ts']));
ok('Stage: _buildStagePage + _startBattle', /protected _buildStagePage\(root: HTMLDivElement\)/.test(src['HomeUiStage.ts']) && /protected _startBattle\(/.test(src['HomeUiStage.ts']));
ok('Play: _refreshEntryReds 实现', /protected _refreshEntryReds\(\): void \{/.test(src['HomeUiPlay.ts']));
ok('Base: _openTuningModal', /protected _openTuningModal\(\): void \{/.test(src['HomeUiBase.ts']));

// 6. 样式抽离与注入
ok('HomeUiStyle 导出 HOME_UI_CSS', /export const HOME_UI_CSS = `/.test(src['HomeUiStyle.ts']));
ok('Core import HOME_UI_CSS', /import \{ HOME_UI_CSS \} from '\.\/HomeUiStyle';/.test(src['HomeUiCore.ts']));
ok('_injectStyle 引用 HOME_UI_CSS', /style\.textContent = HOME_UI_CSS;/.test(src['HomeUiCore.ts']));
ok('CSS 体量搬移（Style 文件 > 1500 行）', src['HomeUiStyle.ts'].split('\n').length > 1500);

// 7. 跨文件常量共享
ok('Core export MALL_AD_STAMINA', /export const MALL_AD_STAMINA = 10;/.test(src['HomeUiCore.ts']));
ok('Mall import 常量自 Core', /import \{ MALL_AD_STAMINA, SLOT_EMOJI \} from '\.\/HomeUiCore';/.test(src['HomeUiMall.ts']));
ok('Stage 持有 CHAPTER_THEMES', /const CHAPTER_THEMES/.test(src['HomeUiStage.ts']));

// 8. 无循环依赖：子文件仅单向 import 直接父类
const chain = ['HomeUiMall', 'HomeUiHeroes', 'HomeUiStage', 'HomeUiPlay', 'HomeUiBase'];
for (const f of chain) {
  const imported = (src[f + '.ts'].match(/from '\.\/(HomeUi\w+)';/g) || []).map((s) => s.match(/HomeUi\w+/)[0]);
  ok(`${f} 仅 import 链上直接父类`, imported.every((x) => x === 'HomeUiCore' || chain.indexOf(x) < chain.indexOf(f)) && imported.length >= 1);
}

process.exit(fail ? 1 : 0);

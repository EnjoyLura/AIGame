# -*- coding: utf-8 -*-
# HomeUi.ts 按继承链拆分：Core(壳) -> Mall -> Heroes -> Stage -> Play -> Base -> HomeUi
# CSS 抽离到 HomeUiStyle.ts；private 全部改 protected；Core 加 abstract 声明
import io, re, sys

SRC = 'assets/scripts/ui/HomeUi.ts'
lines = io.open(SRC, encoding='utf-8').read().split('\n')
n = len(lines)

def find(pred, start=0):
    for i in range(start, n):
        if pred(lines[i]):
            return i
    raise SystemExit('not found')

# ---- 定位关键行 ----
imp_end = find(lambda l: l.startswith('/** 看广告单次发放体力'))          # import 块结束（常量区开始）
class_start = find(lambda l: l.startswith('@ccclass'))
style_mark = find(lambda l, s=class_start: '==== 样式' in l and s < n)
# CSS 字符串范围
css_begin = find(lambda l: 'style.textContent = `' in l, style_mark)
css_end = find(lambda l: l.strip() == '`;', css_begin)
class_end = n - 1
while lines[class_end].strip() == '':
    class_end -= 1
assert lines[class_end] == '}', lines[class_end]

import_block = '\n'.join(lines[0:imp_end]).rstrip()

# ---- 常量块切割（注释跟随）----
const_text = '\n'.join(lines[imp_end:class_start]).strip('\n')
const_chunks = []  # (name, text)
cur = []
for l in const_text.split('\n'):
    if re.match(r'^const ([A-Za-z_]+)', l):
        # 起新块：把 cur 中属于本块的注释留在 cur 尾部一起搬
        name = re.match(r'^const ([A-Za-z_]+)', l).group(1)
        cur.append(l)
        const_chunks.append([name, cur])
        cur = []
    else:
        if const_chunks:
            const_chunks[-1][1].append(l)
        else:
            const_chunks.append(['__lead', [l]])
CONST = {name: '\n'.join(buf).strip('\n') for name, buf in const_chunks}

# ---- CSS 抽离 ----
css = '\n'.join(lines[css_begin + 1:css_end])
io.open('assets/scripts/ui/HomeUiStyle.ts', 'w', encoding='utf-8', newline='\n').write(
    '/**\n'
    ' * 主城 HomeUi 全量样式（base 深色层 + 青瓷浅色覆盖层，一比一复刻原型图 token）。\n'
    ' * 自 HomeUi.ts 抽离：纯字符串模板，无逻辑；注意浅色层跑马灯等动画声明\n'
    ' * 必须保持在 animation:none 白名单之后。\n'
    ' */\n'
    "export const HOME_UI_CSS = `\n" + css + '`;\n')

# ---- 类体成员切割 ----
MEMBER_START = re.compile(r'^    (?:private |protected |get )')
def lift(s):
    # 成员起点向上吞并紧邻的空行/注释行（文档注释跟随成员）
    e = s
    while e - 1 > class_start:
        p = lines[e - 1]
        if p.strip() == '' or p.lstrip().startswith(('//', '/*', '*')):
            e -= 1
        else:
            break
    return e

members = []  # (name, [text])
i = class_start + 1
starts = []
for j in range(class_start + 1, style_mark):
    if MEMBER_START.match(lines[j]):
        starts.append(j)
if not starts:
    raise SystemExit('no members')
bounds = [lift(s) for s in starts]
bounds.append(style_mark)
for k in range(len(starts)):
    body = lines[bounds[k]:bounds[k + 1]]
    m = MEMBER_START.match(lines[starts[k]])
    name = re.match(r'^    (?:private |protected |get )([A-Za-z_]+)', lines[starts[k]]).group(1)
    members.append([name, body])

# ---- 分发表 ----
GROUP = {}
for names, g in [
    ('_mallResEls _mallTabsEl _mallGridEl _mallTab _mallAdBtn _mallAdLab _giftBannerEl _giftSvc '
     '_buildMallPage _setMallTab _refreshMall _buyShopItem _buyMaterialItem _refreshGiftDot _openGiftModal _openGiftResultModal', 'mall'),
    ('_heroPickEl _heroBodyEl _heroSelIdx _heroBagTab _talentRedEl _refreshTalentRed '
     '_buildHeroesPage _refreshHeroes _pickHero _renderSkillCards _abilityEffectText _abilityMilestones _openAbilityModal '
     '_openTalentModal _openRecruitModal _openRecruitResultModal _openForgeModal _affixBadge _affixBlock '
     '_openBagItemTip _openGemPickPanel _openCoreModal _openWeaponModal _openEquipSlotPanel', 'heroes'),
    ('_stageTabsEl _sceneEl _sceneChipEl _vehEl _mobsEl _missionTitleEl _claimedChests _siLvlEl _siPowEl _siStEl '
     '_arrowL _arrowR _squadBtn _stageDiffSel _diffRowEl '
     '_switchStage _buildStagePage _refreshStagePage _openStageRewardModal _openSquadModal', 'stage'),
    ('_playGridEl _questRedEl _signinRedEl _expSel _expPicked _refreshEntryReds '
     '_buildPlayPage _refreshPlayPage _pureEntryDesc _pureEntryBtnText _enterPureEntry _refreshPureEntryRed '
     '_dungeonSel _openDungeonModal _startDungeon _openExpeditionModal _openBestiaryModal _openBestiaryDetail '
     '_openLeaderboardModal _openSigninModal _openQuestModal _openTrialModal _trialSelFloor _startTrial', 'play'),
    ('_baseRows _baseGridEl _baseBannerEls _buildBasePage _refreshBase _openBuildingInfoModal _openTuningModal', 'base'),
    # 出击入口只在关卡页（出击/无尽按钮），留在 core 会反向引用关卡页的难度选择字段
    ('_startBattle', 'stage'),
]:
    for name in names.split():
        GROUP[name] = g

groups = {'core': [], 'mall': [], 'heroes': [], 'stage': [], 'play': [], 'base': []}
unassigned = []
for name, body in members:
    g = GROUP.get(name, 'core')
    if name not in GROUP:
        unassigned.append(name)
    groups[g].append('\n'.join(body).rstrip('\n'))
    groups[g].append('')

CONST_GROUP = {
    'MALL_AD_STAMINA': 'core', 'STAMINA_BUY_N': 'core', 'STAMINA_BUY_COST': 'core',
    'SLOT_EMOJI': 'core', 'CHAPTER_THEMES': 'stage', 'WAVES_PER_STAGE': 'stage',
}
# 跨文件共享的常量：core export，使用方 import（SLOT_EMOJI 被 mall/heroes 用、MALL_AD_STAMINA 被 mall 用）
CORE_EXPORT_CONSTS = {'MALL_AD_STAMINA', 'STAMINA_BUY_N', 'STAMINA_BUY_COST', 'SLOT_EMOJI'}
CONST_IMPORT = {
    'mall': ['MALL_AD_STAMINA', 'SLOT_EMOJI'],
    'heroes': ['SLOT_EMOJI'],
}
CONST_TEXT = {}
for cname, text in CONST.items():
    if cname == '__lead':
        continue
    g = CONST_GROUP[cname]
    if cname in CORE_EXPORT_CONSTS:
        text = re.sub(r'^const ', 'export const ', text)
    CONST_TEXT.setdefault(g, []).append(text)

# ---- Core：abstract 声明 + _injectStyle 重写 ----
ABSTRACT = '''
    // ---- 跨组共享的实例状态（构建/使用在链上子类） ----
    protected abstract _heroSelIdx: number;

    // ---- 五页构建/刷新与全局红点（实现在各页文件，链上子类） ----
    protected abstract _buildMallPage(root: HTMLDivElement): void;
    protected abstract _refreshMall(): void;
    protected abstract _buildHeroesPage(root: HTMLDivElement): void;
    protected abstract _refreshHeroes(): void;
    protected abstract _refreshTalentRed(): void;
    protected abstract _buildStagePage(root: HTMLDivElement): void;
    protected abstract _refreshStagePage(): void;
    protected abstract _buildPlayPage(root: HTMLDivElement): void;
    protected abstract _refreshPlayPage(): void;
    protected abstract _refreshEntryReds(): void;
    protected abstract _buildBasePage(root: HTMLDivElement): void;
    protected abstract _refreshBase(): void;

    /** 样式注入（全量 CSS 见 HomeUiStyle.ts；仅注入一次） */
    protected _injectStyle(): void {
        if (HomeUiCore._styleInjected) {
            return;
        }
        HomeUiCore._styleInjected = true;
        const style = document.createElement('style');
        style.textContent = HOME_UI_CSS;
        document.head.appendChild(style);
    }
'''

DECL = {
    'core': 'export abstract class HomeUiCore extends Component {',
    'mall': 'export abstract class HomeUiMall extends HomeUiCore {',
    'heroes': 'export abstract class HomeUiHeroes extends HomeUiMall {',
    'stage': 'export abstract class HomeUiStage extends HomeUiHeroes {',
    'play': 'export abstract class HomeUiPlay extends HomeUiStage {',
    'base': 'export abstract class HomeUiBase extends HomeUiPlay {',
}
PARENT = {
    'core': None, 'mall': 'HomeUiCore', 'heroes': 'HomeUiMall',
    'stage': 'HomeUiHeroes', 'play': 'HomeUiStage', 'base': 'HomeUiPlay',
}
HEAD_COMMENT = {
    'core': 'HomeUi 壳：组件生命周期/事件接线、共享工具（弹窗骨架/toast/贴图挂载）、\n * 顶栏资源与体力补给、底部导航与页面切换、公告条、模拟广告层。',
    'mall': '商店页：礼包 banner + 四页签商品网格 + 广告补给卡 + 礼包弹窗。',
    'heroes': '英雄页：横滑选择条 + 英雄详情（三维/装备/背包/技能养成）\n * + 英雄域弹窗群（招募/天赋/工坊/宝石/核心/武器/装备面板/个人主页域）。',
    'stage': '关卡页（主界面）：章节页签 + 护送场景 + 难度 + 出击按钮，\n * 奖励详情弹窗与护送编队弹窗。',
    'play': '玩法大厅：每日任务/签到横幅 + 试炼/副本/远征/图鉴/排行入口卡\n * + 对应玩法弹窗（含入口红点调度）。',
    'base': '基地页：建筑养成（升级建筑 + 局外强化）+ 建筑详情/载具改装弹窗。',
}

def fix_priv(text):
    return re.sub(r'^    private ', '    protected ', text, flags=re.M)

for g in ['core', 'mall', 'heroes', 'stage', 'play', 'base']:
    body = [fix_priv(b) for b in groups[g]]
    if g == 'core':
        body.append(ABSTRACT)
        body.append('}\n')
    else:
        body.append('}\n')
    head = import_block + '\n'
    if g in CONST_IMPORT:
        head += "import { %s } from './HomeUiCore';\n" % ', '.join(CONST_IMPORT[g])
    if g == 'core':
        head += "import { HOME_UI_CSS } from './HomeUiStyle';\n"
    if PARENT[g]:
        head += "import { %s } from './%s';\n" % (PARENT[g], PARENT[g])
    head += '\n'
    for ct in CONST_TEXT.get(g, []):
        head += ct + '\n\n'
    head += '/**\n * %s\n */\n' % HEAD_COMMENT[g]
    head += DECL[g] + '\n'
    out = head + '\n'.join(body).rstrip('\n') + '\n'
    fname = 'assets/scripts/ui/HomeUiCore.ts' if g == 'core' else 'assets/scripts/ui/HomeUi%s.ts' % g.capitalize()
    io.open(fname, 'w', encoding='utf-8', newline='\n').write(out)
    print('wrote', fname, out.count('\n'), 'lines')

# ---- HomeUi.ts 终类 ----
final = """import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;
import { HomeUiBase } from './HomeUiBase';

/**
 * 主城界面（战斗外玩法入口，DOM 渲染）——一比一复刻《末日航线》原型图。
 * 实现按域拆分（继承链）：
 * HomeUiCore（壳/顶栏/导航/公告/体力/广告）→ Mall（商店/礼包）
 * → Heroes（英雄页与养成弹窗）→ Stage（关卡/编队）→ Play（玩法大厅/玩法弹窗）
 * → Base（基地建筑/改装）；全量样式见 HomeUiStyle.ts。
 * 界面显隐由 GameFlow 状态机驱动。
 */
@ccclass('HomeUi')
export class HomeUi extends HomeUiBase {}
"""
io.open(SRC, 'w', encoding='utf-8', newline='\n').write(final)
print('wrote', SRC, final.count('\n'), 'lines')
print('unassigned -> core:', unassigned)

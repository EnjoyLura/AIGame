import { _decorator, Component, SpriteFrame, sys } from 'cc';
const { ccclass } = _decorator;
import { BattleConfig, BUILD_STAMP, GameEvent } from '../config/GameConfig';
import { eventCenter } from '../core/EventCenter';
import { GameManager, META_UPGRADES, BUILDINGS } from '../core/GameManager';
import { AssetLib } from '../core/AssetLib';
import { GameFlow } from '../core/GameFlow';
import { AdService } from '../core/AdService';
import { ShopData, ShopItem, ShopQuota } from '../core/ShopData';
import { GIFT_PACKS, GiftService, GiftPackDef } from '../core/GiftPackData';
import { QUEST_DEFS, QuestSystem, QuestDef, ACTIVITY_CHESTS, ACTIVITY_MAX, rewardText } from '../core/QuestSystem';
import { loadBoard, myScore, boardNote } from '../core/LeaderboardSystem';
import { SigninSystem, SIGNIN_REWARDS, SigninReward } from '../core/SigninSystem';
import { BestiarySystem, BESTIARY_DEFS, BestiaryDef } from '../core/BestiarySystem';
import { MailSystem } from '../core/MailSystem';
import { SoundFx } from '../core/SoundFx';
import { HeroSystem, EquipSlot, EQUIP_SLOTS, EQUIP_SLOT_NAMES, EQUIP_TIER_NAMES, EQUIP_TIER_COLORS, WEAPON_CORE_DEFS, WEAPON_ATK_STEP, WEAPON_LEVEL_MAX, EQUIPMENT_DEFS, bagItemName, bagItemValue, AbilitySlot, BagItem, MiscItemDef, MISC_ITEM_DEFS, miscDef, lootRateText, tierRank, EquipTier, LootDrop, lootDropColor, GEM_EFFECTS, gemSlots, gemSocketCost, combineGroupCount, salvageStoneYield, salvageAlloyYield } from '../core/HeroSystem';
import { HERO_DEFS, ABILITY_LEVEL_DMG_BONUS, HeroDef } from '../battle/HeroDef';
import { STAGES, FINAL_STAGE_ID, stageInfo, stageWaves, STAGE_DIFFS, stageDiffDef, StageDifficulty } from '../battle/StageData';
import { TrialSystem, trialFloorDef, trialFloorReward, TRIAL_MAX_FLOOR, TRIAL_MILESTONE_EVERY } from '../core/TrialSystem';
import { RecruitSystem, rollRecruit, HERO_STAR_MAX, RECRUIT_PRICE_1, RECRUIT_PRICE_10, RECRUIT_PITY, RecruitResult } from '../core/RecruitSystem';
import { TalentSystem, TALENT_NODES, TALENT_BRANCHES, TALENT_BRANCH_NAMES, branchNodes, branchPointTotal, talentNode, TalentNodeDef, TalentBranch } from '../core/TalentSystem';
import { affixName, affixValueText, affixColor, AFFIX_MAX } from '../core/EquipmentAffix';
import { DungeonSystem, DungeonId, DUNGEON_DEFS, DUNGEON_TIER_NAMES, DUNGEON_RUNS_PER_DAY, DUNGEON_STAMINA_COST, DUNGEON_WAVES, dungeonDef, dungeonYieldRange, encodeDungeon } from '../core/DungeonSystem';
import { ExpeditionSystem, ExpeditionId, EXPEDITION_DEFS, EXPEDITION_RUNS_PER_DAY, HERO_ATTR_NAMES, HERO_ATTR_IC, EXP_MULT_MIN, EXP_MULT_MAX, expeditionDef, matchMultiplier, expeditionYieldRange, heroAttrValue } from '../core/ExpeditionSystem';
import { VehicleTuningSystem, TUNE_SLOTS, TUNE_MAX_LEVEL } from '../core/VehicleTuningSystem';
import { BOND_DEFS, activeBonds } from '../core/HeroBond';
import { NoticeSystem, NOTICE_DEFS, NOTICE_KIND_NAMES } from '../core/NoticeData';
import { SLOT_EMOJI } from './HomeUiCore';
import type { PopCta, PopOpts } from './HomeUiCore';
import { HomeUiMall } from './HomeUiMall';

/**
 * 背包→装备槽拖拽会话：一次按下到抬起的完整手势。
 * pending 待判定 → 触摸长按 220ms 进 drag，或提前移动进 scroll（背包仍要能滑）。
 */
interface EquipDragSession {
    pointerId: number;
    /** 触摸来源：长按才进拖拽；鼠标移动过死区即启拖 */
    touch: boolean;
    mode: 'pending' | 'scroll' | 'drag';
    /** 按下时的背包下标；落地前按件身份复核，背包变动则作废（下标会失效） */
    bagIndex: number;
    item: BagItem;
    startX: number;
    startY: number;
    src: HTMLElement;
    /** 滚动容器与按下时的滚动位置：手动驱动滚动，才能和长按拖拽共存 */
    scrollEl: HTMLElement | null;
    startTop: number;
    ghost: HTMLElement | null;
    over: HTMLElement | null;
    timer: ReturnType<typeof setTimeout> | 0;
}

/**
 * 英雄页：横滑选择条 + 英雄详情（三维/装备/背包/技能养成）
 * + 英雄域弹窗群（招募/天赋/工坊/宝石/核心/武器/装备面板/个人主页域）。
 */
export abstract class HomeUiHeroes extends HomeUiMall {
    /** 英雄页 */
    protected _heroPickEl: HTMLDivElement | null = null;

    protected _heroBodyEl: HTMLDivElement | null = null;

    protected _heroSelIdx = 0;

    /** 英雄页内嵌物品栏当前页签（equip/gem/mat/item） */
    protected _heroBagTab: 'equip' | 'gem' | 'mat' | 'item' = 'equip';

    /** 天赋入口红点（有未分配点数时点亮） */
    protected _talentRedEl: HTMLElement | null = null;

    /** 拖拽穿戴会话（同一时刻只允许一个） */
    protected _equipDrag: EquipDragSession | null = null;

    /** 拖拽落地时刻：抑制同一次手势合成出的 click（否则会顺带弹出物品详情/装备面板） */
    protected _swallowClick = false;

    /** 根层按下复位监听是否已挂（只挂一次，避免每次重绘叠监听） */
    protected _dragGuardBound = false;

    /** 工坊当前页签（0 合成 / 1 分解）：切页签与重开都回到原页签 */
    protected _forgeTab = 0;

    /** 工坊品质筛选（0 全部 / 1-6 品质）：按页签各记一份，来回切不丢挑选 */
    protected _forgeFilter: [number, number] = [0, 0];

    /** 工坊网格选中下标（-1 未选）：同上按页签各记一份 */
    protected _forgeSel: [number, number] = [-1, -1];

    /** 背包部位筛选（'all' 全部）：与页签同级的就地筛选，不重开弹窗 */
    protected _heroBagFilter: 'all' | EquipSlot = 'all';

    /** 护送编队抽屉（实现在 HomeUiStage；英雄页工具行复用同一入口） */
    protected abstract _openSquadModal(): void;


    /** 天赋入口红点：有未分配的可用天赋点时点亮（英雄页选择条入口） */
    protected _refreshTalentRed(): void {
        if (this._talentRedEl) {
            this._talentRedEl.classList.toggle('on', TalentSystem.instance.available > 0);
        }
    }


    /**
     * 天赋树（UX 布局稿：L3·M）：三分支各一行 5 节点进度格（✅满级 / ▶可加 / 🔒未解锁 / 等级）
     * + 选中节点详情与加减点。点数为进度派生（累计等级/通关/爬塔/招募），洗点走二次确认。
     */
    protected _openTalentModal(pickId = 'fire_1'): void {
        const ts = TalentSystem.instance;
        let selId = pickId;
        const opt = (): PopOpts => {
            const sel = talentNode(selId) || TALENT_NODES[0];
            const lv = ts.level(sel.id);
            const maxed = ts.isMaxed(sel.id);
            const unlocked = ts.isUnlocked(sel.id);
            let hint = '';
            if (maxed) {
                hint = '✅ 已满级';
            } else if (!unlocked) {
                const prev = branchNodes(sel.branch)[sel.idx - 1];
                hint = `🔒 需先将「${prev ? prev.name : '前置节点'}」点满`;
            } else if (ts.available < sel.pointCost) {
                hint = `⚠️ 天赋点不足，还差 ${sel.pointCost - ts.available} 点`;
            }
            const can = ts.canUpgrade(sel.id);
            return {
                tier: 3,
                size: 'M',
                banner: '🌟 天赋树',
                art: `可用 ${ts.available} 点`,
                subtitle: '天赋点来源：累计等级每 5 级 +1 · 通关每关 +1 · 爬塔每 5 层 +1 · 招募每 10 抽 +1',
                build: c => {
                    c.appendChild(this._popSec('点数进度'));
                    c.appendChild(this._popKV('可用 / 已投 / 总点', `${ts.available} / ${ts.spent} / ${ts.total}`, 'total'));
                    c.appendChild(this._popKV('洗点', '免费无限次', 'free'));
                    for (const br of TALENT_BRANCHES) {
                        c.appendChild(this._popSec(`${TALENT_BRANCH_NAMES[br]} · 已投 ${ts.spentIn(br)}/${branchPointTotal(br)} 点`));
                        const nodes = branchNodes(br);
                        c.appendChild(this._popGrid(nodes.map(d => {
                            const dlv = ts.level(d.id);
                            const dmax = ts.isMaxed(d.id);
                            const dOpen = ts.isUnlocked(d.id);
                            return {
                                icon: `${d.ic}${d.id === sel.id ? '👑' : ''}`,
                                count: dmax ? '✅' : dOpen ? (ts.canUpgrade(d.id) ? '▶' : `${dlv}/${d.maxLevel}`) : '🔒',
                                sel: d.id === sel.id,
                                title: `${d.name} Lv.${dlv}/${d.maxLevel} · ${d.desc(dlv)}`
                            };
                        }), 5, i => {
                            selId = nodes[i].id;
                            this._popRebuild(opt());
                        }));
                    }
                    c.appendChild(this._popSec(`节点详情 · ${sel.name}`));
                    c.appendChild(this._popAttr({ icon: sel.ic, text: sel.desc(lv) }));
                    c.appendChild(this._popKV('等级', `Lv.${lv} / ${sel.maxLevel}`));
                    c.appendChild(this._popKV('位置', `${TALENT_BRANCH_NAMES[sel.branch]}线第 ${sel.idx + 1} 层`));
                    c.appendChild(this._popKV('单点消耗', `${sel.pointCost} 点天赋点`, maxed ? undefined : 'free'));
                    if (hint) {
                        c.appendChild(this._popWarn(hint));
                    }
                },
                ctas: [
                    {
                        label: maxed ? '已 满 级' : `🌟 加 点（${sel.pointCost} 点）`,
                        kind: 'gold',
                        disabled: !can,
                        onDisabled: () => this._toast(hint || '当前不可加点'),
                        onClick: () => {
                            SoundFx.unlock();
                            const lvNow = ts.upgrade(sel.id);
                            if (lvNow === null) {
                                SoundFx.play('ui');
                                this._toast('加点失败 · 检查前置节点与点数');
                                return;
                            }
                            SoundFx.play('coin');
                            this._toast(`${sel.name} 升至 Lv.${lvNow}`);
                            this._refreshTop();
                            this._refreshTalentRed();
                            this._popRebuild(opt());
                        }
                    },
                    {
                        label: '🔄 洗 点',
                        kind: 'grey',
                        disabled: ts.spent <= 0,
                        onDisabled: () => this._toast('还没有投入任何天赋点'),
                        onClick: () => this._popConfirm({
                            title: '洗点确认',
                            icon: '🔄',
                            desc: `退还已投入的 ${ts.spent} 点天赋点，全部节点回到未激活状态。`,
                            ok: '确 认 洗 点',
                            danger: true,
                            cancel: '再 想 想',
                            onOk: () => {
                                const back = ts.reset();
                                SoundFx.play('bigkill');
                                this._toast(`洗点完成，退还 ${back} 点天赋点`);
                                this._refreshTop();
                                this._refreshTalentRed();
                                this._popRebuild(opt());
                            }
                        })
                    }
                ],
                onBack: () => {
                    const hid = HERO_DEFS[this._heroSelIdx % HERO_DEFS.length].id;
                    if (GameManager.instance.isHeroOwned(hid)) {
                        this._openHeroGrowModal(hid, 2);
                    } else {
                        this._closePop();
                    }
                },
                note: '天赋为账号级养成 · 换英雄不改变已投点数'
            };
        };
        this._openPop(opt());
    }


    /**
     * 英雄招募（UX 布局稿：L3·M 列表型）：固定保底进度条 + 概率表与碎片库存 + 单抽/十连 CTA，
     * 免费招募作为行内动作；结果交给 L5 结果演出层揭示。
     */
    protected _openRecruitModal(): void {
        const rs = RecruitSystem.instance;
        const gm = GameManager.instance;
        const opt = (): PopOpts => {
            const diam = gm.res.get('diamond');
            const pull = (count: 1 | 10): void => {
                SoundFx.unlock();
                const cost = count === 10 ? RECRUIT_PRICE_10 : RECRUIT_PRICE_1;
                // 钻石不足：按钮不置灰，点击时明确提示还差多少
                if (gm.res.get('diamond') < cost) {
                    SoundFx.play('ui');
                    this._toast(`钻石不足：还差 💎${(cost - gm.res.get('diamond')).toLocaleString()}`);
                    return;
                }
                const got = rs.recruit(count);
                if (!got) {
                    SoundFx.play('ui');
                    this._toast('钻石不足');
                    return;
                }
                SoundFx.play(got.some(x => x.kind === 'hero') ? 'bigkill' : 'coin');
                this._refreshTop();
                this._openRecruitResultModal(got);
            };
            const adLeft = AdService.instance.remaining('recruit');
            return {
                tier: 3,
                // 档位由内容量决定（列表用到 L）：保底进度 + 概率 + 库存列表 + 免费招募
                // 在 M 档装不下（实测溢出 ~85px），升 L 档。
                size: 'L',
                banner: '🎖️ 英雄招募',
                art: `💎 ${diam.toLocaleString()}`,
                subtitle: `${RECRUIT_PITY} 抽内必出英雄本体 · 十连必出稀有以上`,
                fixed: bar => {
                    const box = this._el('div', 'popAct');
                    const hd = this._el('div', 'hd');
                    const lbl = this._el('span');
                    lbl.innerHTML = `🎖️ 已招募 <b>${rs.totalRecruits}</b> 次`;
                    hd.appendChild(lbl);
                    hd.appendChild(this._el('span', undefined, `距保底还差 ${rs.pityLeft} 抽`));
                    box.appendChild(hd);
                    const pbar = this._el('div', 'bar');
                    const fill = this._el('i');
                    fill.style.width = `${Math.round((RECRUIT_PITY - rs.pityLeft) / RECRUIT_PITY * 100)}%`;
                    pbar.appendChild(fill);
                    box.appendChild(pbar);
                    bar.appendChild(box);
                },
                build: c => {
                    // 概率是查询信息不是操作对象，压成一行摘要；小节头省掉——KV 行自说明，
                    // 碎片库存与免费招募才是本面的主体。
                    c.appendChild(this._popKV('概率：英雄 6% · 传说碎片 14%', '稀有 40% · 普通 40%', 'free'));
                    c.appendChild(this._popSec('碎片库存'));
                    HERO_DEFS.forEach((d, i) => {
                        const own = gm.isHeroOwned(d.id);
                        c.appendChild(this._popRow({
                            icon: '🎖',
                            iconTex: this._heroPhoto(i, 'slot').key,
                            title: d.name,
                            lines: [`${rs.stars(d.id)}★ · 🔩 碎片 ${rs.shards(d.id)}`],
                            status: own ? '已拥有' : '未拥有',
                            statusKind: own ? undefined : 'soon'
                        }));
                    });
                    c.appendChild(this._popSec('免费招募'));
                    c.appendChild(this._popRow({
                        icon: '📺',
                        title: '看广告免费招募 1 次',
                        lines: [`今日剩余 ${adLeft}/1 次`],
                        action: {
                            label: adLeft > 0 ? '免费' : '已用完',
                            kind: 'green',
                            disabled: adLeft <= 0,
                            onDisabled: () => this._toast('今日免费招募额度已用完 · 隔日重置'),
                            onClick: () => {
                                SoundFx.unlock();
                                AdService.instance.claimReward('recruit', () => {
                                    const got = rs.recruit(1, true);
                                    if (!got) {
                                        return;
                                    }
                                    SoundFx.play(got.some(x => x.kind === 'hero') ? 'bigkill' : 'coin');
                                    this._refreshTop();
                                    this._openRecruitResultModal(got);
                                });
                            }
                        }
                    }));
                },
                ctas: [
                    { label: `单 抽（💎 ${RECRUIT_PRICE_1.toLocaleString()}）`, kind: 'grey', onClick: () => pull(1) },
                    { label: `十 连（💎 ${RECRUIT_PRICE_10.toLocaleString()}）`, onClick: () => pull(10) }
                ],
                note: '抽到已拥有的英雄会转化为该英雄碎片，碎片用于升星'
            };
        };
        this._openPop(opt());
    }

    /**
     * 招募结果（UX 布局稿 L5 结果演出层）：卡片错峰揭示 + 汇总行 + 再来一次/关闭。
     * 英雄本体挂立绘，碎片走图标；点遮罩可关（结果层不阻塞主流程）。
     */
    protected _openRecruitResultModal(results: RecruitResult[]): void {
        const hasHero = results.some(r => r.kind === 'hero');
        const shardTotal = results.reduce((n, r) => n + (r.shardN ?? 0), 0);
        const heroCount = results.filter(r => r.kind === 'hero').length;
        const many = results.length > 1;
        const cost = many ? RECRUIT_PRICE_10 : RECRUIT_PRICE_1;
        this._openPop({
            tier: 5,
            size: 'M',
            banner: hasHero ? '🎖️ 招 募 大 成 功' : '🎖️ 招 募 结 果',
            art: many ? `十连 · ${results.length} 项` : '单抽',
            // 招募已结算，演出只是回顾：允许点遮罩快速收起（关闭同样走 onClose 刷新英雄）
            maskClose: true,
            build: c => {
                const row = this._popCardRow(results.map(r => ({
                    icon: r.ic,
                    name: r.name,
                    badge: r.kind === 'hero' ? 'NEW!' : r.duplicate ? '转化为碎片' : undefined,
                    dup: r.duplicate
                })));
                // 错峰揭示：逐卡延迟入场 + 逐卡音效
                row.querySelectorAll<HTMLElement>('.popCard').forEach((el, i) => {
                    const r = results[i];
                    el.style.animationDelay = `${(0.1 + i * 0.15).toFixed(2)}s`;
                    this.scheduleOnce(() => {
                        SoundFx.play(r.kind === 'hero' ? 'bigkill' : r.tier === 'legend' ? 'buy' : 'ui');
                    }, 0.15 + i * 0.15);
                });
                c.appendChild(row);
                if (many) {
                    c.appendChild(this._popKV('本次获得', `英雄 ×${heroCount} · 碎片 ×${shardTotal}`, 'total'));
                }
            },
            ctas: [
                {
                    label: `再 来 一 次（💎 ${cost.toLocaleString()}）`,
                    onClick: () => {
                        SoundFx.unlock();
                        const diamNow = GameManager.instance.res.get('diamond');
                        if (diamNow < cost) {
                            SoundFx.play('ui');
                            this._toast(`钻石不足：还差 💎${(cost - diamNow).toLocaleString()}`);
                            return;
                        }
                        const got = RecruitSystem.instance.recruit(many ? 10 : 1);
                        if (!got) {
                            SoundFx.play('ui');
                            this._toast('钻石不足');
                            return;
                        }
                        SoundFx.play(got.some(x => x.kind === 'hero') ? 'bigkill' : 'coin');
                        this._refreshTop();
                        this._openRecruitResultModal(got);
                    }
                },
                {
                    label: '收 下 关 闭',
                    kind: 'grey',
                    onClick: () => {
                        this._closePop();
                        this._refreshHeroes();
                    }
                }
            ],
            note: '碎片与英雄已入账 · 碎片可在英雄页升星消耗',
            onClose: () => this._refreshHeroes()
        });
        // 卡片就位后异步贴图：本体用立绘，碎片用头像格
        this._popMask?.querySelectorAll('.popCardRow .popCard').forEach((card, i) => {
            const r = results[i];
            const idx = HERO_DEFS.findIndex(d => d.id === r.heroId);
            if (idx < 0) {
                return;
            }
            const gi = card.querySelector('.gi') as HTMLElement | null;
            if (!gi) {
                return;
            }
            const photo = this._heroPhoto(idx, r.kind === 'hero' ? 'figure' : 'slot');
            this._tex(photo.key, u => {
                gi.textContent = '';
                gi.style.backgroundImage = u;
                gi.style.backgroundRepeat = 'no-repeat';
                gi.style.cssText += photo.css;
            });
        });
    }


    // ================= 英雄页 =================

    /** 英雄页：英雄选择条 + 角色区（两列功能夹立绘 + 六装备槽）+ 工具行 + 背包（整块由 _refreshHeroes 重建） */
    protected _buildHeroesPage(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'screen sHeroes';
        this._pages.heroes = page;
        const pick = document.createElement('div');
        pick.className = 'hero-roster';
        page.appendChild(pick);
        this._heroPickEl = pick;
        const body = document.createElement('div');
        body.className = 'hero-body';
        page.appendChild(body);
        this._heroBodyEl = body;
        root.appendChild(page);
    }


    protected _pickHero(i: number): void {
        const gm = GameManager.instance;
        const def = HERO_DEFS[i % HERO_DEFS.length];
        if (!gm.isHeroOwned(def.id)) {
            this._toast(`「${def.name}」尚未获得 · 可在商店解锁`);
            return;
        }
        this._heroSelIdx = i;
        this._refreshHeroes();
    }


    /** 英雄页刷新：横滑选择条 + 头牌/战力 + 左右三槽夹立绘 + 三维 + 升级/核心/武器/背包 */
    protected _refreshHeroes(): void {
        // 整块重建会拆掉指针捕获的元素，先收掉可能进行中的拖拽
        this._equipDragAbort();
        this._armDragClickGuard();
        const gm = GameManager.instance;
        const hs = HeroSystem.instance;
        const rs = RecruitSystem.instance;
        const pick = this._heroPickEl;
        const body = this._heroBodyEl;
        if (!pick || !body) {
            return;
        }
        // 选择条：只放英雄卡（招募/工坊入口收进下方工具行），等分横排
        pick.innerHTML = '';
        HERO_DEFS.forEach((d, i) => {
            const owned = gm.isHeroOwned(d.id);
            const b = document.createElement('button');
            b.className = 'hpick' + (i === this._heroSelIdx ? ' on' : '') + (owned ? '' : ' lock');
            const pic = document.createElement('span');
            pic.className = 'pic';
            pic.dataset.hero = String(i);
            const photo = this._heroPhoto(i, 'pick');
            this._tex(photo.key, u => {
                pic.style.backgroundImage = u;
                pic.style.backgroundRepeat = 'no-repeat';
                pic.style.cssText += photo.css;
            });
            const nm = document.createElement('i');
            nm.textContent = d.name;
            b.appendChild(pic);
            b.appendChild(nm);
            b.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._pickHero(i);
            };
            pick.appendChild(b);
        });

        // 详情区整块重建
        body.innerHTML = '';
        const def = HERO_DEFS[this._heroSelIdx % HERO_DEFS.length];
        const owned = gm.isHeroOwned(def.id);
        const inLineup = gm.isInLineup(def.id);
        const idx = this._heroSelIdx % HERO_DEFS.length;

        // 角色区：左功能列（技能/天赋/升星）+ 立绘（左上名字、左下战力）+ 右功能列（武器/核心）+ 六槽装备栏
        const stage = document.createElement('div');
        stage.className = 'hero-stage';
        /** 单个装备槽：空槽显示部位名，已装备显示部位图标 + 强化等级（品质描边） */
        const mkSlot = (slot: EquipSlot) => {
            const cur = owned ? hs.equipped(def.id, slot) : null;
            const el = document.createElement('div');
            el.className = 'slot' + (cur ? ' filled' : ' empty');
            el.dataset.slot = slot;
            const sname = document.createElement('span');
            sname.className = 'sname';
            sname.textContent = EQUIP_SLOT_NAMES[slot];
            el.appendChild(sname);
            if (cur) {
                let tier: EquipTier = 1;
                if (cur.id.startsWith('bag:')) {
                    tier = Number(cur.id.split(':')[2]) as EquipTier;
                } else {
                    const d = hs.equipDef(cur.id);
                    tier = d ? d.tier : 1;
                }
                const ic = document.createElement('span');
                ic.textContent = SLOT_EMOJI[slot];
                el.appendChild(ic);
                const slv = document.createElement('span');
                slv.className = 'slv';
                slv.textContent = `Lv.${cur.lv}`;
                slv.style.borderColor = EQUIP_TIER_COLORS[tier - 1];
                el.appendChild(slv);
                // 品阶贴左下角（布局稿 .equip-slot .tier：◆ 数量即品阶），强化级贴右下角 Lv.N
                const tierEl = document.createElement('span');
                tierEl.className = 'tier';
                tierEl.textContent = '◆'.repeat(Math.max(1, Math.min(6, tier)));
                el.appendChild(tierEl);
                el.title = `${bagItemName({ slot, tier, lv: cur.lv })}`;
            } else {
                el.title = `${EQUIP_SLOT_NAMES[slot]} · 空槽位`;
            }
            el.onclick = (e) => {
                e.stopPropagation();
                if (this._consumeDragClick()) {
                    return;
                }
                if (!owned) {
                    this._toast('先解锁英雄');
                    return;
                }
                SoundFx.play('ui');
                this._openEquipSlotPanel(def.id, slot);
            };
            return el;
        };
        const fig = document.createElement('div');
        fig.className = 'hero-figure';
        const halo = document.createElement('div');
        halo.className = 'halo';
        const halo2 = document.createElement('div');
        halo2.className = 'halo2';
        const emoji = document.createElement('div');
        emoji.className = 'heroEmoji' + (owned ? '' : ' lock');
        emoji.dataset.hero = String(idx);
        const heroPhoto = this._heroPhoto(idx, 'figure');
        this._tex(heroPhoto.key, u => {
            emoji.style.backgroundImage = u;
            emoji.style.backgroundRepeat = 'no-repeat';
            emoji.style.backgroundSize = 'contain';
            emoji.style.backgroundPosition = 'center';
        });
        emoji.title = owned ? def.name : '未获得';
        // 名字压立绘左上角，星级/定位并进副标（布局稿 .hero-name small）
        const hName = document.createElement('div');
        hName.className = 'hero-name';
        if (owned) {
            const st = rs.stars(def.id);
            hName.appendChild(document.createTextNode(def.name));
            const sub = document.createElement('small');
            // 星级用实心星（稿 .hero-name small = ★★）；0 阶不挂空星，避免出现悬空的“· ”
            sub.textContent = st > 0 ? `${def.role} · ${'★'.repeat(st)}` : def.role;
            sub.title = st >= HERO_STAR_MAX
                ? '已满星'
                : `升星进度 ${rs.shards(def.id)} / ${rs.starCost(def.id)} 碎片`;
            hName.appendChild(sub);
        } else {
            hName.textContent = def.name + '（未获得）';
        }
        // 战力挂在立绘正下方，右侧 ⓘ 进属性明细弹窗
        const power = document.createElement('div');
        power.className = 'powerBadge';
        power.innerHTML = `战力 <strong>${owned ? this._heroPower(def.id).toLocaleString() : '---'}</strong>`;
        const pwInfo = document.createElement('button');
        pwInfo.className = 'pwInfo';
        pwInfo.textContent = 'ⓘ';
        pwInfo.title = '属性详情';
        pwInfo.disabled = !owned;
        pwInfo.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openPowerDetailModal(def.id);
        };
        power.appendChild(pwInfo);
        fig.appendChild(halo);
        fig.appendChild(halo2);
        fig.appendChild(emoji);
        fig.appendChild(hName);
        fig.appendChild(power);
        const colR = document.createElement('div');
        colR.className = 'eqGrid equipment';
        colR.appendChild(mkSlot('head'));
        colR.appendChild(mkSlot('body'));
        colR.appendChild(mkSlot('wrist'));
        colR.appendChild(mkSlot('legs'));
        colR.appendChild(mkSlot('gloves'));
        colR.appendChild(mkSlot('shoes'));
        // 功能入口拆双列分立绘两侧：左列 技能/天赋/升星，右列 武器/核心（未获得英雄时养成入口置灰，天赋全局可用）
        const fcol = document.createElement('div');
        fcol.className = 'fcol hero-quick left';
        const fcolR = document.createElement('div');
        fcolR.className = 'fcol hero-quick right';
        const coreBtn = document.createElement('button');
        coreBtn.className = 'btn blue hot';
        coreBtn.innerHTML = '🧬<span>核心</span>';
        coreBtn.title = '英雄核心';
        coreBtn.disabled = !owned;
        coreBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openHeroGrowModal(def.id, 1);
        };
        const wpnBtn = document.createElement('button');
        wpnBtn.className = 'btn blue hot';
        wpnBtn.innerHTML = '🔧<span>武器</span>';
        wpnBtn.title = '武器强化';
        wpnBtn.disabled = !owned;
        wpnBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openHeroGrowModal(def.id, 3);
        };
        const skBtn = document.createElement('button');
        skBtn.className = 'btn blue hot skillEntry';
        skBtn.innerHTML = '⚡<span>技能</span>';
        skBtn.title = '技能养成（普攻/技能/大招升级）';
        skBtn.disabled = !owned;
        skBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openHeroGrowModal(def.id, 0);
        };
        // 升星入口（参考主流卡牌「1阶」角标）：碎片进度与升星操作收进弹窗；未升过星时回落成稿的「升星」
        const starBtn = document.createElement('button');
        starBtn.className = 'btn blue hot starEntry';
        starBtn.innerHTML = `⭐<span>${owned && rs.stars(def.id) > 0 ? rs.stars(def.id) + '阶' : '升星'}</span>`;
        starBtn.title = '升星（碎片进度与升星操作）';
        starBtn.disabled = !owned;
        starBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openStarModal(def.id);
        };
        const talBtn = document.createElement('button');
        talBtn.className = 'btn blue hot talentEntry2';
        talBtn.innerHTML = '🌟<span>天赋<span class="questRed"></span></span>';
        talBtn.title = '天赋树（可用点数分配）';
        talBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openHeroGrowModal(def.id, 2);
        };
        fcol.appendChild(skBtn);
        fcol.appendChild(talBtn);
        fcol.appendChild(starBtn);
        fcolR.appendChild(wpnBtn);
        fcolR.appendChild(coreBtn);
        this._talentRedEl = talBtn.querySelector('.questRed') as HTMLElement;
        this._refreshTalentRed();
        stage.appendChild(fcol);
        stage.appendChild(fig);
        stage.appendChild(fcolR);
        stage.appendChild(colR);
        body.appendChild(stage);

        // 工具行：编队四席 + 招募 / 工坊两个快捷（稿 .loadouts = 标签 + 一排小方块）
        const tools = document.createElement('div');
        tools.className = 'hero-tools';
        const loadouts = document.createElement('div');
        loadouts.className = 'loadouts';
        const loLabel = document.createElement('b');
        loLabel.textContent = '编队';
        const loNum = document.createElement('small');
        loNum.textContent = `${gm.lineup.length}/${GameManager.LINEUP_MAX}`;
        loLabel.appendChild(loNum);
        loadouts.appendChild(loLabel);
        for (let i = 0; i < GameManager.LINEUP_MAX; i++) {
            const heroId = gm.lineup[i];
            const slotDef = heroId ? HERO_DEFS.find(h => h.id === heroId) : undefined;
            const chip = document.createElement('button');
            chip.className = 'squadEntry' + (slotDef ? ' on' : '') + (heroId && heroId === def.id && inLineup ? ' active' : '');
            chip.textContent = String(i + 1);
            chip.title = slotDef ? `编队 ${i + 1} 号位 · ${slotDef.name}` : `编队 ${i + 1} 号位 · 空位，点击编队`;
            chip.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._openSquadModal();
            };
            loadouts.appendChild(chip);
        }
        tools.appendChild(loadouts);
        const recruitHot = document.createElement('button');
        recruitHot.className = 'hot';
        recruitHot.innerHTML = '<span class="ic">🎖️</span>招募';
        recruitHot.title = '招募英雄（抽卡）';
        recruitHot.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openRecruitModal();
        };
        const forgeEntry = document.createElement('button');
        forgeEntry.className = 'hot forgeEntry';
        forgeEntry.innerHTML = '<span class="ic">⚒️</span>工坊';
        forgeEntry.title = '装备工坊（合成 / 分解）';
        forgeEntry.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openForgeModal();
        };
        tools.appendChild(recruitHot);
        tools.appendChild(forgeEntry);
        body.appendChild(tools);

        // 三维面板已移除：攻击/战力/装备加成明细走战力右侧 ⓘ 详情弹窗
        if (!owned) {
            const unlock = document.createElement('button');
            unlock.className = 'btn gold big';
            this._plateCityBtn(unlock);
            unlock.textContent = `🔓 前往商店解锁（🪙 ${(HeroSystem.HERO_PRICES[def.id] ?? 0).toLocaleString()}）`;
            unlock.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._switchPage('mall');
            };
            body.appendChild(unlock);
            this._applyPendingTex();
            return;
        }

        // 大按钮（上阵/下阵）已按需求移除：编队切换统一走关卡页护送编队弹窗

        // 背包区（布局稿）：头行（件数 + 部位筛选 + 合成）→ 滚动网格 → 底部说明行 → 页签
        const bar = document.createElement('div');
        bar.className = 'bagBar bag-section';
        const head = document.createElement('div');
        head.className = 'bag-head';
        const headTitle = document.createElement('b');
        headTitle.textContent = '我的背包 ';
        const headNum = document.createElement('small');
        headNum.textContent = this._heroBagTab === 'equip' ? `${gm.bag.length} 件` : '';
        headTitle.appendChild(headNum);
        head.appendChild(headTitle);
        const headRight = document.createElement('div');
        headRight.className = 'bag-head-right';
        if (this._heroBagTab === 'equip') {
            // 部位筛选：就地重绘网格，不重开页面
            const filter = document.createElement('select');
            filter.title = '按部位筛选';
            const opts: Array<'all' | EquipSlot> = ['all' as 'all' | EquipSlot].concat(EQUIP_SLOTS);
            for (const val of opts) {
                const o = document.createElement('option');
                o.value = val;
                o.textContent = val === 'all' ? '全部' : EQUIP_SLOT_NAMES[val];
                if (this._heroBagFilter === val) {
                    o.selected = true;
                }
                filter.appendChild(o);
            }
            filter.onchange = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._heroBagFilter = filter.value as 'all' | EquipSlot;
                this._refreshHeroes();
            };
            headRight.appendChild(filter);
        }
        const forgeHot = document.createElement('button');
        forgeHot.className = 'hot forgeBtn';
        forgeHot.innerHTML = '<span class="ic">⚒️</span>合成';
        forgeHot.title = '装备工坊（合成 / 分解）';
        forgeHot.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openForgeModal();
        };
        headRight.appendChild(forgeHot);
        head.appendChild(headRight);
        bar.appendChild(head);
        const scroll = document.createElement('div');
        scroll.className = 'bag-scroll';
        const grid = document.createElement('div');
        grid.className = 'bagGrid bag-grid';
        if (this._heroBagTab === 'equip') {
            const items = gm.bag
                .map((it, i) => ({ it, i }))
                .filter(x => this._heroBagFilter === 'all' || x.it.slot === this._heroBagFilter);
            if (items.length === 0) {
                const tip = document.createElement('p');
                tip.className = 'mSub';
                tip.textContent = this._heroBagFilter === 'all'
                    ? '装备背包空空如也 · 去商店购买装备部件'
                    : `没有${EQUIP_SLOT_NAMES[this._heroBagFilter as EquipSlot]} · 换个部位看看`;
                grid.appendChild(tip);
            }
            for (const { it, i } of items) {
                const cell = document.createElement('div');
                cell.className = `bcell r${tierRank(it.tier)}`;
                cell.innerHTML = `${SLOT_EMOJI[it.slot]}<em>+${it.lv}</em>`
                    + (this._affixBadge(it.affixes) ? `<span class="bcellAffix">${this._affixBadge(it.affixes)}</span>` : '');
                cell.onclick = (e) => {
                    e.stopPropagation();
                    if (this._consumeDragClick()) {
                        return;
                    }
                    SoundFx.play('ui');
                    this._openBagItemTip(def.id, { slot: it.slot, tier: it.tier, lv: it.lv, affixes: it.affixes });
                };
                this._wireBagDrag(cell, i, it);
                grid.appendChild(cell);
            }
        } else {
            for (const md of MISC_ITEM_DEFS) {
                const n = hs.miscCount(md.id);
                if (n <= 0) {
                    continue;
                }
                const cell = document.createElement('div');
                cell.className = `bcell r${md.tier}`;
                cell.innerHTML = `${md.ic}<em>×${n}</em>`;
                cell.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.play('ui');
                    this._openBagItemTip(def.id, md);
                };
                grid.appendChild(cell);
            }
            if (grid.children.length === 0) {
                const tip = document.createElement('p');
                tip.className = 'mSub';
                tip.textContent = this._heroBagTab === 'gem' ? '暂无宝石 · 商店后续开放'
                    : this._heroBagTab === 'mat' ? '暂无材料 · 关卡与商店产出'
                        : '暂无道具 · 商城与活动产出';
                grid.appendChild(tip);
            }
        }
        scroll.appendChild(grid);
        bar.appendChild(scroll);
        // 底部说明行：装备页签给出手势提示（新交互可发现性），其余页签给出分类口径
        const detail = document.createElement('div');
        detail.className = 'bag-detail';
        const hint = document.createElement('b');
        hint.className = 'bagHint';
        hint.textContent = this._heroBagTab === 'equip'
            ? '装备 · 未选择物品　长按装备拖到左侧槽位即可穿戴'
            : `${this._heroBagTab === 'gem' ? '宝石' : this._heroBagTab === 'mat' ? '材料' : '道具'} · 物品已按分类展示`;
        detail.appendChild(hint);
        bar.appendChild(detail);
        const tabs = document.createElement('div');
        tabs.className = 'bagTabs flat-tabs';
        const mkTab = (key: 'equip' | 'gem' | 'mat' | 'item', label: string) => {
            const b = document.createElement('button');
            if (this._heroBagTab === key) {
                b.className = 'on active';
            }
            b.textContent = label;
            b.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._heroBagTab = key;
                this._refreshHeroes();
            };
            tabs.appendChild(b);
        };
        mkTab('equip', '🛡️ 装备');
        mkTab('gem', '💎 宝石');
        mkTab('mat', '⚙️ 材料');
        mkTab('item', '🧪 道具');
        bar.appendChild(tabs);
        body.appendChild(bar);
        this._applyPendingTex();
    }


    // ================= 背包 → 装备槽 拖拽穿戴 =================
    // 手势模型：按下进 pending；触摸按住不动 220ms 进拖拽、提前移动算滑背包（鼠标过 8px 死区即拖）。
    // 背包格子 touch-action:none 交出滚动控制权，滚动改由 pointermove 手动驱动 ——
    // 否则长按后一移动就会被系统滚动接管并抽掉指针（pointercancel），拖拽必断。
    /** 运行环境是否支持指针事件：不支持时只保留点击路径（不接线拖拽，不做假手势） */
    protected _pointerReady(): boolean {
        return typeof window !== 'undefined' && !!window.PointerEvent;
    }

    /**
     * 拖拽落地后吞掉同一次手势合成出的 click：吞且仅吞一个。
     * 复位点挂在根层按下（捕获相），不能只挂在背包格子 ——
     * 落地重绘会把来源格子摘出文档，合成 click 打在已脱离的节点上、事件根本不冒泡，
     * 只靠格子复位会让标记一直挂着，把用户下一次真实点击一起吞掉。
     */
    protected _consumeDragClick(): boolean {
        if (!this._swallowClick) {
            return false;
        }
        this._swallowClick = false;
        return true;
    }

    /** 挂一次性根层按下复位（幂等）：任何一次真实按下都清掉上一轮残留的吞 click 标记 */
    protected _armDragClickGuard(): void {
        if (this._dragGuardBound || !this._root) {
            return;
        }
        this._dragGuardBound = true;
        this._root.addEventListener('pointerdown', () => { this._swallowClick = false; }, true);
    }

    /** 装备六槽（落点集）：只收 .eqGrid 里的槽位，避免误判到其它页面的同名元素 */
    protected _eqSlotEls(): HTMLElement[] {
        const out: HTMLElement[] = [];
        if (!this._heroBodyEl) {
            return out;
        }
        this._heroBodyEl.querySelectorAll('.eqGrid .slot').forEach(el => out.push(el as HTMLElement));
        return out;
    }

    /** 命中测试：拖影挂 pointer-events:none，所以指针下方就是真实落点 */
    protected _slotAt(x: number, y: number): HTMLElement | null {
        let cur = document.elementFromPoint(x, y) as HTMLElement | null;
        while (cur) {
            if (cur.classList && cur.classList.contains('slot')) {
                return cur;
            }
            cur = cur.parentElement;
        }
        return null;
    }

    /** 按下：记录候选件，触摸挂长按定时器；指针捕获保证移出格子仍收得到 move/up */
    protected _equipDragDown(e: Event, bagIndex: number, item: BagItem, src: HTMLElement): void {
        const pe = e as PointerEvent;
        if (typeof pe.pointerId !== 'number' || (pe.pointerType === 'mouse' && pe.button !== 0)) {
            return;
        }
        this._equipDragAbort();
        // 新手势开始：复位吞 click 标记（根层捕获复位是主路径，这里兜底）
        this._swallowClick = false;
        const touch = pe.pointerType !== 'mouse';
        const scroll = src.parentElement;
        const s: EquipDragSession = {
            pointerId: pe.pointerId, touch, mode: 'pending', bagIndex, item,
            startX: pe.clientX, startY: pe.clientY, src,
            scrollEl: scroll, startTop: scroll ? scroll.scrollTop : 0,
            ghost: null, over: null, timer: 0,
        };
        this._equipDrag = s;
        if (touch) {
            s.timer = setTimeout(() => {
                if (this._equipDrag === s && s.mode === 'pending') {
                    this._equipDragBegin(s, s.startX, s.startY);
                }
            }, 220);
        }
        try {
            src.setPointerCapture(pe.pointerId);
        } catch (err) {
            // 无捕获权限时退回元素自身事件：拖出格子会提前结束，但不影响点击路径
        }
    }

    /** 进拖拽：起拖影、同部位槽位高亮，异部位压暗（减少试错） */
    protected _equipDragBegin(s: EquipDragSession, x: number, y: number): void {
        s.mode = 'drag';
        s.src.classList.add('dragSrc');
        const ghost = document.createElement('div');
        ghost.className = `dragGhost r${tierRank(s.item.tier)}`;
        ghost.innerHTML = `${SLOT_EMOJI[s.item.slot]}<em>+${s.item.lv}</em>`;
        s.ghost = ghost;
        if (this._root) {
            this._root.appendChild(ghost);
        }
        this._eqSlotEls().forEach(el => {
            const match = el.dataset.slot === s.item.slot;
            el.classList.toggle('dropOk', match);
            el.classList.toggle('dropBad', !match);
        });
        SoundFx.play('ui');
        this._equipDragMove(s, x, y);
    }

    /** 拖拽中：拖影跟手（触摸抬起一截，避免被手指盖住）+ 换落点高亮 */
    protected _equipDragMove(s: EquipDragSession, x: number, y: number): void {
        if (s.ghost) {
            s.ghost.style.left = `${x}px`;
            s.ghost.style.top = `${y - (s.touch ? 72 : 0)}px`;
        }
        const hit = this._slotAt(x, y);
        if (hit === s.over) {
            return;
        }
        if (s.over) {
            s.over.classList.remove('over');
        }
        s.over = hit;
        if (hit) {
            hit.classList.add('over');
        }
    }

    protected _equipDragMoveEvt(e: Event): void {
        const s = this._equipDrag;
        if (!s) {
            return;
        }
        const pe = e as PointerEvent;
        if (pe.pointerId !== s.pointerId) {
            return;
        }
        const dx = pe.clientX - s.startX;
        const dy = pe.clientY - s.startY;
        if (s.mode === 'pending') {
            if (dx * dx + dy * dy <= 64) {
                return;
            }
            if (s.timer) {
                clearTimeout(s.timer);
                s.timer = 0;
            }
            if (s.touch) {
                // 触摸提前移动＝用户在滑背包，不是拖装备
                s.mode = 'scroll';
                return;
            }
            this._equipDragBegin(s, pe.clientX, pe.clientY);
            if (typeof pe.preventDefault === 'function') {
                pe.preventDefault();
            }
            return;
        }
        if (s.mode === 'scroll') {
            if (s.scrollEl) {
                s.scrollEl.scrollTop = s.startTop - dy;
            }
        } else {
            this._equipDragMove(s, pe.clientX, pe.clientY);
        }
        if (typeof pe.preventDefault === 'function') {
            pe.preventDefault();
        }
    }

    protected _equipDragUpEvt(e: Event): void {
        const s = this._equipDrag;
        if (!s) {
            return;
        }
        const pe = e as PointerEvent;
        if (pe.pointerId !== s.pointerId) {
            return;
        }
        if (s.mode !== 'drag') {
            // 未成拖拽＝点击路径：交给 cell.onclick 开详情
            this._equipDragAbort();
            return;
        }
        this._swallowClick = true;
        const hit = this._slotAt(pe.clientX, pe.clientY);
        const slot = hit ? hit.dataset.slot as EquipSlot : undefined;
        this._equipDragAbort();
        if (!slot) {
            this._toast('拖到右侧装备槽完成穿戴');
            return;
        }
        if (slot !== s.item.slot) {
            this._toast(`部位不匹配 · 这件是${EQUIP_SLOT_NAMES[s.item.slot]}`);
            return;
        }
        this._equipDrop(s);
    }

    /** 落地：按件身份复核下标后穿戴（背包中途变动则作废，不穿错件） */
    protected _findBagIndex(s: EquipDragSession): number {
        const bag = GameManager.instance.bag;
        const same = (a: BagItem, b: BagItem): boolean =>
            a.slot === b.slot && a.tier === b.tier && a.lv === b.lv
            && JSON.stringify(a.affixes ?? null) === JSON.stringify(b.affixes ?? null);
        const at = bag[s.bagIndex];
        if (at && same(at, s.item)) {
            return s.bagIndex;
        }
        let found = -1;
        for (let i = 0; i < bag.length; i++) {
            if (!same(bag[i], s.item)) {
                continue;
            }
            if (found >= 0) {
                return -1;
            }
            found = i;
        }
        return found;
    }

    protected _equipDrop(s: EquipDragSession): void {
        const def = HERO_DEFS[this._heroSelIdx % HERO_DEFS.length];
        const idx = this._findBagIndex(s);
        if (idx < 0) {
            this._toast('背包已变化 · 请重新拖拽');
            this._refreshHeroes();
            return;
        }
        const hs = HeroSystem.instance;
        const had = !!hs.equipped(def.id, s.item.slot);
        if (!hs.equipFromBag(def.id, idx)) {
            this._toast('穿戴失败 · 请重试');
            return;
        }
        SoundFx.play('coin');
        this._toast(`${EQUIP_SLOT_NAMES[s.item.slot]} 已穿戴${had ? ' · 旧装备已回背包' : ''}`);
        this._refreshHeroes();
    }

    /** 收尾：定时器/拖影/高亮/捕获全部清掉（幂等，可重复调用） */
    protected _equipDragAbort(): void {
        const s = this._equipDrag;
        if (!s) {
            return;
        }
        this._equipDrag = null;
        if (s.timer) {
            clearTimeout(s.timer);
        }
        if (s.ghost && s.ghost.parentElement) {
            s.ghost.parentElement.removeChild(s.ghost);
        }
        s.src.classList.remove('dragSrc');
        this._eqSlotEls().forEach(el => {
            el.classList.remove('dropOk');
            el.classList.remove('dropBad');
            el.classList.remove('over');
        });
        try {
            s.src.releasePointerCapture(s.pointerId);
        } catch (err) {
            // 元素已随重绘卸载时释放捕获会抛错，忽略
        }
    }

    /** 背包格子接线（装备页签）：只有装备能拖到槽上，其它页签保持点击开详情 */
    protected _wireBagDrag(cell: HTMLElement, bagIndex: number, item: BagItem): void {
        if (!this._pointerReady()) {
            return;
        }
        cell.addEventListener('pointerdown', (e: Event) => this._equipDragDown(e, bagIndex, item, cell));
        cell.addEventListener('pointermove', (e: Event) => this._equipDragMoveEvt(e));
        cell.addEventListener('pointerup', (e: Event) => this._equipDragUpEvt(e));
        cell.addEventListener('pointercancel', () => this._equipDragAbort());
        cell.addEventListener('lostpointercapture', () => this._equipDragAbort());
    }


    // ================= 背包工坊（合成/分解） =================

    /**
     * 装备工坊（UX 布局稿 4-C · L2·XL 二级页）：合成/分解双页签 + 品质筛选固定条 +
     * 按品质分段的 5 列网格挑选 + 底部「已选/产出」汇总条；合成与分解均不可逆，
     * 执行前统一走 S 型确认模板（3-A / 3-B）。
     */
    protected _openForgeModal(tab = 0): void {
        const hs = HeroSystem.instance;
        const gm = GameManager.instance;
        // 页签/品质筛选/网格选中都寄在实例字段：切页签或事后重开都回到原样（UX 0-7 状态保持）
        this._forgeTab = tab;
        const opt = (): PopOpts => {
            const tab = this._forgeTab;
            /** 品质筛选：0 = 全部，1..6 = 仅该品质（合成按材料品质 / 分解按装备品质） */
            const qFilter = this._forgeFilter[tab];
            /** 网格选中下标（-1 = 未选）；底部汇总条与 CTA 随选中态重算 */
            let sel = this._forgeSel[tab];
            const bag = gm.bag;
            const lowCount = bag.filter(x => x.tier <= 2).length;
            // 合成候选按品质由低到高归组，同品质内按部位顺序 → 便于分段铺 5 列网格
            const groups: Array<{ slot: EquipSlot; tier: EquipTier; n: number; cost: number }> = [];
            // 顶档（★6）没有更高品质可合，故合成只遍历到末档之前
            for (let tier = 1; tier < EQUIP_TIER_NAMES.length; tier++) {
                for (const slot of EQUIP_SLOTS) {
                    const n = combineGroupCount(slot, tier as EquipTier);
                    if (n > 0 && (qFilter === 0 || qFilter === tier)) {
                        groups.push({ slot, tier: tier as EquipTier, n, cost: hs.combineCost((tier + 1) as EquipTier) });
                    }
                }
            }
            const bagList = bag.filter(x => qFilter === 0 || x.tier === qFilter).sort((a, b) => a.tier - b.tier);
            const total = tab === 0 ? groups.length : bagList.length;
            if (sel >= total) {
                sel = -1;
                this._forgeSel[tab] = -1;
            }
            const g = tab === 0 && sel >= 0 ? groups[sel] : null;
            const it = tab === 1 && sel >= 0 ? bagList[sel] : null;
            const tierOf = (i: number): EquipTier => (tab === 0 ? groups[i].tier : bagList[i].tier);
            const nameOf = (slot: EquipSlot, tier: EquipTier): string => `${EQUIP_TIER_NAMES[tier - 1]}${EQUIP_SLOT_NAMES[slot]}`;
            const yieldText = (t: EquipTier): string => {
                const alloy = salvageAlloyYield(t);
                return `🧱 ${salvageStoneYield(t)}${alloy > 0 ? ` · 🔩 ${alloy}` : ''}`;
            };
            const selLine = g
                ? `已选：${nameOf(g.slot, g.tier)} ×3 → ${nameOf(g.slot, (g.tier + 1) as EquipTier)} ×1（保留最高强化级）`
                : it
                    ? `已选：${bagItemName(it)} +${it.lv} → ${yieldText(it.tier)}`
                    : tab === 0 ? '点选网格中的一组，查看消耗与产出' : '点选网格中的装备，查看分解产出';

            const ctas: PopCta[] = [];
            if (tab === 0) {
                const enough = !!g && gm.gold >= g.cost;
                ctas.push({
                    label: g ? `🔮 合 成（🪙 ${g.cost}）` : '请 先 选 择 一 组',
                    kind: 'gold',
                    disabled: !enough,
                    onDisabled: () => this._toast(!g ? '请先在上方点选一组装备' : `金币不足 · 还差 🪙 ${(g.cost - gm.gold).toLocaleString()}`),
                    onClick: () => {
                        if (!g) {
                            return;
                        }
                        const nameA = nameOf(g.slot, g.tier);
                        const nameB = nameOf(g.slot, (g.tier + 1) as EquipTier);
                        const pickSlot = g.slot;
                        const pickTier = g.tier;
                        const pickCost = g.cost;
                        this._popConfirm({
                            title: '合成装备',
                            icon: '🔮',
                            desc: `${nameA} ×3 合成 ${nameB} ×1（保留最高强化级）`,
                            preview: this._popGrid([
                                { icon: SLOT_EMOJI[pickSlot], count: 3, title: '消耗 3 件' },
                                { icon: '✨', title: '合成' },
                                { icon: SLOT_EMOJI[pickSlot], count: 1, title: '产出 1 件' }
                            ], 3),
                            cost: [{ icon: '🪙', have: gm.gold, need: pickCost }],
                            ok: '确认合成',
                            onOk: () => {
                                if (hs.combine(null, pickSlot, pickTier)) {
                                    SoundFx.play('buy');
                                    this._toast(`合成成功：${nameB}`);
                                    this._refreshTop();
                                }
                                this._popBack();
                                this._popRebuild(opt());
                            }
                        });
                    }
                });
            } else {
                if (it) {
                    ctas.push({
                        label: '♻️ 分 解',
                        kind: 'danger',
                        onClick: () => {
                            if (!it) {
                                return;
                            }
                            const target = it;
                            this._popConfirm({
                                title: '分解装备',
                                icon: '♻️',
                                desc: `${bagItemName(target)} +${target.lv} 分解为 ${yieldText(target.tier)}`,
                                danger: true,
                                ok: '确认分解',
                                onOk: () => {
                                    const idx = gm.bag.indexOf(target);
                                    if (idx >= 0 && hs.salvage(idx)) {
                                        SoundFx.play('ui');
                                        this._toast('分解完成，材料入包');
                                        this._refreshTop();
                                    }
                                    this._popBack();
                                    this._popRebuild(opt());
                                }
                            });
                        }
                    });
                } else {
                    ctas.push({
                        label: '请 先 选 择 装 备',
                        kind: 'grey',
                        disabled: true,
                        onDisabled: () => this._toast('请先在上方点选一件装备'),
                        onClick: () => undefined
                    });
                }
                if (lowCount > 0) {
                    ctas.push({
                        label: `⚠️ 一键分解白绿（${lowCount} 件）`,
                        kind: 'grey',
                        onClick: () => this._popConfirm({
                            title: '一键分解',
                            icon: '♻️',
                            desc: `分解背包中全部白绿（★1-★2）装备，共 ${lowCount} 件，不可恢复`,
                            danger: true,
                            ok: '确认分解',
                            onOk: () => {
                                for (let i = gm.bag.length - 1; i >= 0; i--) {
                                    if (gm.bag[i].tier <= 2) {
                                        hs.salvage(i);
                                    }
                                }
                                SoundFx.play('coin');
                                this._toast(`已分解 ${lowCount} 件，强化石/合金入包`);
                                this._refreshTop();
                                this._popBack();
                                this._popRebuild(opt());
                            }
                        })
                    });
                }
            }

            return {
                tier: 2,
                size: 'XL',
                title: '⚒️ 装备工坊',
                barBack: true,
                show: {
                    icon: tab === 0 ? '🔮' : '♻️',
                    tier: tab === 0 ? `${total} 组` : `${total} 件`,
                    name: tab === 0 ? '合成台' : '分解台',
                    sub: tab === 0
                        ? '3 件同部位同品质 → 1 件更高品质（保留最高强化级）'
                        : '装备拆解为强化石与精炼合金 · 不可恢复'
                },
                tabs: ['合成', '分解'],
                tab,
                onTab: i => {
                    // 切页签就地重绘：保留滚动位，另一个页签的筛选/选中各自记忆（UX 0-7）
                    this._forgeTab = i;
                    this._popRebuild(opt());
                },
                // 说明·页签区：品质筛选固定条（全部/★1-★5）
                fixed: bar => {
                    const chips: Array<[string, number]> = [['全部', 0]];
                    // 合成只吃 ★1-★5，故合成页签不列末档筛选（列了必是空段）
                    const last = tab === 0 ? EQUIP_TIER_NAMES.length - 1 : EQUIP_TIER_NAMES.length;
                    for (let t = 1; t <= last; t++) {
                        chips.push([EQUIP_TIER_NAMES[t - 1], t]);
                    }
                    for (let i = 0; i < chips.length; i++) {
                        const label = chips[i][0];
                        const q = chips[i][1];
                        bar.appendChild(this._popChip(label, qFilter === q, () => {
                            // 筛选与选中一起记忆：换品质后回到「未选」，底线是另一个筛选的旧选中不漏过来
                            this._forgeFilter[tab] = q;
                            this._forgeSel[tab] = -1;
                            this._popRebuild(opt());
                        }));
                    }
                },
                build: c => {
                    if (!total) {
                        c.appendChild(this._popEmpty(
                            tab === 0 ? '暂无可合成组合' : '没有可分解的装备',
                            tab === 0
                                ? (qFilter ? '该品质下凑不齐 3 件同部位装备，换个品质看看' : '凑齐 3 件同部位同品质装备即可合成')
                                : (qFilter ? '该品质下背包里没有装备，换个品质看看' : '关卡掉落与商店购买会进入背包'),
                            tab === 0 ? '🔮' : '♻️'));
                        return;
                    }
                    // 内容区：每个品质一段（品质小标题 + 该品质的 5 列网格）
                    let i = 0;
                    while (i < total) {
                        const tk = tierOf(i);
                        const start = i;
                        while (i < total && tierOf(i) === tk) {
                            i++;
                        }
                        c.appendChild(this._popSec(`★${tk} ${EQUIP_TIER_NAMES[tk - 1]}`));
                        const cells: Array<{ icon: string; count?: number | string; sel?: boolean; title?: string }> = [];
                        for (let k = start; k < i; k++) {
                            if (tab === 0) {
                                const gg = groups[k];
                                cells.push({
                                    icon: SLOT_EMOJI[gg.slot],
                                    count: gg.n,
                                    sel: k === sel,
                                    title: `${nameOf(gg.slot, gg.tier)} ×3 → ${nameOf(gg.slot, (gg.tier + 1) as EquipTier)} ×1`
                                        + ` · 可合 ${gg.n} 组 · 🪙 ${gg.cost}/组`
                                });
                            } else {
                                const bb = bagList[k];
                                cells.push({
                                    icon: SLOT_EMOJI[bb.slot],
                                    count: bb.lv > 0 ? `+${bb.lv}` : undefined,
                                    sel: k === sel,
                                    title: `${bagItemName(bb)} +${bb.lv} → ${yieldText(bb.tier)}`
                                });
                            }
                        }
                        c.appendChild(this._popGrid(cells, 5, k => {
                            this._forgeSel[tab] = start + k;
                            this._popRebuild(opt());
                        }));
                    }
                },
                cost: g ? [{ icon: '🪙', have: gm.gold, need: g.cost }] : undefined,
                ctas,
                note: `${selLine}｜强化石→武器强化 · 精炼合金→装备强化`
            };
        };
        this._openPop(opt());
    }



    /** 背包格词缀角标文案（✦ 数量；无词缀返回空串） */
    protected _affixBadge(affixes: string[] | undefined): string {
        if (!affixes || affixes.length === 0) {
            return '';
        }
        return affixes.length > 1 ? `✦${affixes.length}` : '✦';
    }


    /** 词缀区块（详情弹窗/穿戴面板共用）；无词缀返回 null 不占位 */
    protected _affixBlock(affixes: string[] | undefined, tier: EquipTier): HTMLDivElement | null {
        if (!affixes || affixes.length === 0) {
            return null;
        }
        const wrap = document.createElement('div');
        wrap.className = 'affixBox';
        const head = document.createElement('div');
        head.className = 'affixHead';
        head.textContent = `✦ 词缀（${affixes.length}）`;
        wrap.appendChild(head);
        for (const id of affixes) {
            const row = document.createElement('div');
            row.className = 'affixRow';
            row.innerHTML = `<span class="affixName" style="color:${affixColor(id)}">${affixName(id)}</span>`
                + `<span class="affixVal">${affixValueText(id, tier)}</span>`;
            wrap.appendChild(row);
        }
        return wrap;
    }


    /** 内嵌物品栏物品详情：装备走 2-A（品质头 + 双页签），材料/道具走 2-B（材料详情 + 使用） */
    protected _openBagItemTip(heroId: string, src: BagItem | MiscItemDef, tab = 0): void {
        if ((src as BagItem).slot !== undefined) {
            this._openEquipDetail(heroId, src as BagItem, tab);
            return;
        }
        this._openMiscDetail(src as MiscItemDef);
    }

    /**
     * 装备详情（UX 布局稿 2-A · L3·L）：品质头 → 「装备属性 / 宝石属性」页签 → 装备动作。
     * 宝石插槽按品质给数，实际镶嵌在「穿戴」面板中对已装备物品进行（页签内明确指路）。
     */
    protected _openEquipDetail(heroId: string, it: BagItem, tab = 0): void {
        const statOf = (key: 'atkPct' | 'ratePct' | 'rangePct'): number => Math.round(bagItemValue(it, key) * 100);
        const label = (key: 'atkPct' | 'ratePct' | 'rangePct'): string =>
            key === 'atkPct' ? '攻击加成' : key === 'ratePct' ? '射速加成' : '射程加成';
        const ico = (key: 'atkPct' | 'ratePct' | 'rangePct'): string =>
            key === 'atkPct' ? '⚔' : key === 'ratePct' ? '⏱' : '🎯';
        const opt = (): PopOpts => ({
            tier: 3,
            size: 'L',
            quality: {
                q: Math.min(4, Math.max(1, it.tier)) as 1 | 2 | 3 | 4,
                name: bagItemName(it),
                icon: SLOT_EMOJI[it.slot],
                tier: `+${it.lv}`,
                stats: [EQUIP_TIER_NAMES[it.tier - 1], `强化 +${it.lv}`, `${EQUIP_SLOT_NAMES[it.slot]}位`]
            },
            tabs: ['装备属性', '宝石属性'],
            tab,
            onTab: i => this._openEquipDetail(heroId, it, i),
            build: c => {
                if (tab === 1) {
                    const n = gemSlots(it.tier);
                    c.appendChild(this._popSec(`宝石插槽（${n}）`));
                    for (let i = 0; i < n; i++) {
                        c.appendChild(this._popAttr({
                            icon: '💠',
                            text: `插槽 ${i + 1} · 空（装备后可镶嵌）`,
                            empty: true,
                            slot: true
                        }));
                    }
                    c.appendChild(this._popKV('镶嵌费用', `🪙 ${gemSocketCost(it.tier)} / 次`, 'total'));
                    c.appendChild(this._el('div', 'popWarn', '⚠ 宝石镶嵌在「穿戴」面板中对已装备物品操作，拆卸免费返还'));
                    return;
                }
                c.appendChild(this._popSec('基础属性'));
                for (const key of ['atkPct', 'ratePct', 'rangePct'] as const) {
                    const v = statOf(key);
                    c.appendChild(this._popAttr({
                        icon: ico(key),
                        text: `${label(key)} **+${v}%**`,
                        empty: v <= 0
                    }));
                }
                c.appendChild(this._popSec(`词缀（${it.affixes?.length ?? 0}）`));
                if (it.affixes?.length) {
                    for (const id of it.affixes) {
                        c.appendChild(this._popAttr({
                            icon: '✦',
                            text: `**${affixName(id)}** ${affixValueText(id, it.tier)}`
                        }));
                    }
                } else {
                    c.appendChild(this._popAttr({ icon: '✦', text: '暂无词缀（高品质装备自带词条）', empty: true }));
                }
                c.appendChild(this._popKV('强化等级', `+${it.lv}`, 'free'));
            },
            ctas: [{
                label: '装 备',
                onClick: () => {
                    this._closePop();
                    this._openEquipSlotPanel(heroId, it.slot);
                }
            }],
            note: '装备后属性立即生效 · 替换同部位自动回收旧件'
        });
        this._openPop(opt());
    }

    /** 材料/道具详情（UX 布局稿 2-B · L3·M）：品质头 + 说明 + 持有/来源 + 使用 */
    protected _openMiscDetail(md: MiscItemDef): void {
        const hs = HeroSystem.instance;
        const opt = (): PopOpts => {
            const cur = hs.miscCount(md.id);
            const usable = !!md.use && cur > 0;
            return {
                tier: 3,
                size: 'M',
                quality: {
                    q: Math.min(4, Math.max(1, md.tier)) as 1 | 2 | 3 | 4,
                    name: md.name,
                    icon: md.ic,
                    tier: '材料',
                    stats: [`持有 ×${cur}`]
                },
                build: c => {
                    c.appendChild(this._popSec('说明'));
                    const body = this._el('div', 'popBody');
                    body.appendChild(this._el('p', undefined, md.desc));
                    c.appendChild(body);
                    c.appendChild(this._popKV('持有数量', `×${cur}`));
                    c.appendChild(this._popKV('主要来源', '关卡掉落 / 商店 / 邮件附件', 'free'));
                },
                ctas: md.use ? [{
                    label: usable ? '使 用' : '数量不足',
                    disabled: !usable,
                    onDisabled: () => this._toast(`「${md.name}」数量为 0，无法使用`),
                    onClick: () => {
                        if (hs.useMisc(md.id)) {
                            SoundFx.play('buy');
                            this._toast('使用成功');
                            this._refreshHeroes();
                            this._popRebuild(opt());
                        }
                    }
                }] : undefined,
                note: md.use ? '使用后立即生效' : '该材料用于合成/强化消耗'
            };
        };
        this._openPop(opt());
    }


    /**
     * 宝石镶嵌（UX 布局稿 2-A 的钻取层 · L3·M）：持有宝石列表（行内镶嵌）+ 固定费用行 + 空态。
     * 费用不足或无可镶嵌宝石时就地置灰，避免点了才报错。
     */
    protected _openGemPickPanel(heroId: string, slot: EquipSlot): void {
        const hs = HeroSystem.instance;
        const gm = GameManager.instance;
        const opt = (): PopOpts => {
            const state = hs.equipped(heroId, slot);
            const def = state ? hs.equipDef(state.id) : null;
            const tier = def?.tier ?? (state && state.id.startsWith('bag:') ? Number(state.id.split(':')[2]) as EquipTier : 1);
            const cost = gemSocketCost(tier);
            const gems = hs.equippedGems(heroId, slot);
            const owned = GEM_EFFECTS.filter(g => hs.miscCount(g.miscId) > 0);
            const enough = gm.gold >= cost;
            return {
                tier: 3,
                size: 'M',
                banner: '💎 镶嵌宝石',
                art: `${EQUIP_SLOT_NAMES[slot]} ${gems.length}/${gemSlots(tier)}`,
                onBack: () => this._openEquipSlotPanel(heroId, slot),
                cost: [{ icon: '🪙', have: gm.gold, need: cost }],
                build: c => {
                    if (!owned.length) {
                        c.appendChild(this._popEmpty('背包中没有宝石', '通关掉落 / 商店 / 邮件附件获取', '💎'));
                        return;
                    }
                    for (const g of owned) {
                        const gd = miscDef(g.miscId)!;
                        const keyName = g.key === 'atkPct' ? '攻击' : g.key === 'ratePct' ? '射速' : g.key === 'rangePct' ? '射程' : '暴击';
                        c.appendChild(this._popRow({
                            icon: gd.ic,
                            title: gd.name,
                            tag: EQUIP_TIER_NAMES[gd.tier - 1],
                            lines: [`${keyName} +${Math.round(g.value * 100)}%`, `持有 ×${hs.miscCount(g.miscId)}`],
                            status: enough ? undefined : '金币不足',
                            statusKind: enough ? undefined : 'expire',
                            action: {
                                label: '镶 嵌',
                                disabled: !enough,
                                onDisabled: () => this._toast(`金币不足 · 镶嵌需 🪙 ${cost.toLocaleString()}，还差 ${(cost - gm.gold).toLocaleString()}`),
                                onClick: () => {
                                    if (hs.socketGem(heroId, slot, g.miscId)) {
                                        SoundFx.play('buy');
                                        this._refreshHeroes();
                                        this._openEquipSlotPanel(heroId, slot);
                                    }
                                }
                            }
                        }));
                    }
                },
                ctas: [{ label: '返回穿戴', kind: 'grey', onClick: () => this._openEquipSlotPanel(heroId, slot) }],
                note: '镶嵌消耗金币 · 拆卸免费返还宝石'
            };
        };
        this._openPop(opt());
    }


    /** 弹窗：英雄核心（武器核心嵌入/拆除，口径同旧 gem 钮） */


    /** 弹窗：武器强化 */

    /**
     * 英雄养成二级页（UX 布局稿 4-B · L2·XL 全屏页）：四条养成线收进一页，页签直达。
     * 展示台[固定] → 线内容[滚动] → 消耗行[固定] → CTA[固定] → 装备六槽[固定] → 底栏(返回+四线页签)。
     * 天赋树本体仍是独立大图，页签内以分支摘要 + 前往入口衔接（避免此处复制一套树）。
     */
    protected _openHeroGrowModal(heroId: string, tab = 0): void {
        const hs = HeroSystem.instance;
        const gm = GameManager.instance;
        const def = HERO_DEFS.find(d => d.id === heroId);
        if (!def || !gm.isHeroOwned(heroId)) {
            return;
        }
        const ts = TalentSystem.instance;
        const opt = (): PopOpts => {
            const wlv = hs.weaponLevel(heroId);
            const wMax = hs.isWeaponMaxLevel(heroId);
            const wCost = hs.weaponUpgradeCost(heroId);
            const wStone = hs.weaponUpgradeStone(heroId);
            const stoneLeft = hs.miscCount('mat_stone');
            const core = hs.weaponCore(heroId);
            const wEnough = !wMax && gm.gold >= wCost && stoneLeft >= wStone;
            /** 强化不可用时的原因（两个按钮共用，避免各自复制判断） */
            const wWhy = (): string => stoneLeft < wStone
                ? `强化石不足 · 需要 🧱 ${wStone}，还差 ${wStone - stoneLeft}`
                : `金币不足 · 需要 🪙 ${wCost.toLocaleString()}，还差 ${(wCost - gm.gold).toLocaleString()}`;
            const upWeapon = (n: number): number => {
                let done = 0;
                while (done < n) {
                    if (hs.isWeaponMaxLevel(heroId)
                        || gm.gold < hs.weaponUpgradeCost(heroId)
                        || hs.miscCount('mat_stone') < hs.weaponUpgradeStone(heroId)) {
                        break;
                    }
                    if (!hs.upgradeWeapon(heroId)) {
                        break;
                    }
                    done++;
                }
                return done;
            };
            return {
                tier: 2,
                size: 'XL',
                title: `英雄养成 · ${def.name}`,
                onBack: () => this._closePop(),
                show: {
                    icon: '🎖',
                    tier: `Lv.${gm.heroLevels[heroId] ?? 1}`,
                    name: def.name,
                    sub: `战力 ${this._heroPower(heroId).toLocaleString()} · ${def.role}`
                },
                cost: tab === 3 && !wMax ? [
                    { icon: '🪙', have: gm.gold, need: wCost },
                    { icon: '🧱', have: stoneLeft, need: wStone }
                ] : undefined,
                build: c => {
                    if (tab === 0) {
                        c.appendChild(this._popSec('技能与大招 · 升级卡提升等级'));
                        c.appendChild(this._renderSkillCards(def, () => this._popRebuild(opt())));
                        return;
                    }
                    if (tab === 1) {
                        c.appendChild(this._popSec('武器核心'));
                        if (core) {
                            c.appendChild(this._popAttr({
                                icon: '🧬',
                                text: `**${core.name}** · ${core.desc}`,
                                action: {
                                    label: '拆 除',
                                    onClick: () => {
                                        if (hs.removeCore(heroId)) {
                                            SoundFx.play('ui');
                                            this._toast('核心已拆除');
                                            this._refreshHeroes();
                                            this._popRebuild(opt());
                                        }
                                    }
                                }
                            }));
                        } else {
                            c.appendChild(this._popAttr({
                                icon: '🧬',
                                text: '未嵌入核心 · 核心为武器提供额外特效',
                                empty: true
                            }));
                        }
                        c.appendChild(this._popSec('可选核心（嵌入即生效）'));
                        for (const cd of WEAPON_CORE_DEFS) {
                            const afford = gm.gold >= cd.baseCost;
                            c.appendChild(this._popRow({
                                icon: '🧬',
                                title: cd.name,
                                tag: EQUIP_TIER_NAMES[cd.tier - 1],
                                lines: [cd.desc],
                                status: afford ? undefined : '金币不足',
                                statusKind: afford ? undefined : 'expire',
                                action: {
                                    label: `🪙 ${cd.baseCost}`,
                                    disabled: !afford,
                                    onDisabled: () => this._toast(`金币不足 · 还差 🪙 ${(cd.baseCost - gm.gold).toLocaleString()}`),
                                    onClick: () => {
                                        if (hs.buyCore(heroId, cd.id)) {
                                            SoundFx.play('buy');
                                            this._toast(`${cd.name} 嵌入成功`);
                                            this._refreshHeroes();
                                            this._popRebuild(opt());
                                        }
                                    }
                                }
                            }));
                        }
                        return;
                    }
                    if (tab === 2) {
                        c.appendChild(this._popSec('天赋总览'));
                        c.appendChild(this._popKV('可用天赋点', String(ts.available)));
                        c.appendChild(this._popKV('已投 / 总点', `${ts.spent} / ${ts.total}`));
                        c.appendChild(this._popSec('三分支'));
                        for (const br of TALENT_BRANCHES) {
                            const nodes = branchNodes(br);
                            c.appendChild(this._popRow({
                                icon: '🌟',
                                title: TALENT_BRANCH_NAMES[br],
                                lines: [`已投 ${ts.spentIn(br)} / ${branchPointTotal(br)} 点`],
                                progress: branchPointTotal(br) > 0 ? ts.spentIn(br) / branchPointTotal(br) : 0,
                                status: ts.available > 0 ? '可加点' : '无点数',
                                statusKind: ts.available > 0 ? 'soon' : undefined,
                                red: ts.available > 0,
                                action: {
                                    label: '前往天赋图',
                                    kind: 'gold',
                                    onClick: () => this._openTalentModal(nodes[0]?.id ?? 'fire_1')
                                }
                            }));
                        }
                        c.appendChild(this._el('div', 'popWarn', '天赋点来源：累计等级每 5 级 +1 · 通关每关 +1 · 爬塔每 5 层 +1 · 招募每 10 抽 +1'));
                        return;
                    }
                    // 页签 3：武器强化
                    c.appendChild(this._popSec('武器强化 · 每级提升普攻基础伤害'));
                    if (wMax) {
                        c.appendChild(this._el('div', 'popWarn', `✨ 武器已强化至上限 +${wlv}`));
                    } else {
                        c.appendChild(this._popCmp('强化预览', [{
                            label: '武器等级',
                            old: `+${wlv}`,
                            now: `+${wlv + 1}`
                        }, {
                            label: '攻击加成',
                            old: `+${Math.round((hs.weaponAtkMul(heroId) - 1) * 100)}%`,
                            now: `+${Math.round((1 + WEAPON_ATK_STEP * wlv - 1) * 100)}%`
                        }]));
                    }
                    c.appendChild(this._popKV('当前武器等级', `+${wlv} / +${WEAPON_LEVEL_MAX}`, 'total'));
                    c.appendChild(this._popKV('强化石持有', `🧱 ×${stoneLeft}`));
                    c.appendChild(this._popKV('金币持有', `🪙 ${gm.gold.toLocaleString()}`, 'free'));
                },
                ctas: tab === 3 && !wMax ? [{
                    label: '强 化',
                    disabled: !wEnough,
                    onDisabled: () => this._toast(wWhy()),
                    onClick: () => {
                        if (upWeapon(1) > 0) {
                            SoundFx.play('buy');
                            this._refreshTop();
                            this._refreshHeroes();
                        } else {
                            this._toast('材料不足：分解装备或通关掉落获取强化石');
                        }
                        this._popRebuild(opt());
                    }
                }, {
                    label: '一键强化',
                    kind: 'green',
                    disabled: !wEnough,
                    onDisabled: () => this._toast(wWhy()),
                    onClick: () => {
                        const n = upWeapon(20);
                        if (n > 0) {
                            SoundFx.play('coin');
                            this._toast(`一键强化武器 +${n} 级`);
                            this._refreshTop();
                            this._refreshHeroes();
                        } else {
                            this._toast('材料不足：无法继续强化');
                        }
                        this._popRebuild(opt());
                    }
                }] : undefined,
                note: tab === 3 ? '强化石来自分解装备与关卡掉落' : '四条养成线共用英雄等级：技能 / 核心 / 天赋 / 武器',
                slots: sb => {
                    for (const s of EQUIP_SLOTS) {
                        const st = hs.equipped(heroId, s);
                        sb.appendChild(this._popSlot({
                            icon: SLOT_EMOJI[s],
                            tier: st ? `+${st.lv}` : undefined,
                            red: hs.gemSlotCount(heroId, s) > hs.equippedGems(heroId, s).length,
                            onClick: () => this._openEquipSlotPanel(heroId, s, 0)
                        }));
                    }
                },
                barBack: true,
                barTabs: [
                    { icon: '⚡', label: '技能', on: tab === 0, onClick: () => this._openHeroGrowModal(heroId, 0) },
                    { icon: '🧬', label: '核心', on: tab === 1, red: !core, onClick: () => this._openHeroGrowModal(heroId, 1) },
                    { icon: '🌟', label: '天赋', on: tab === 2, red: ts.available > 0, onClick: () => this._openHeroGrowModal(heroId, 2) },
                    { icon: '🔧', label: '武器', on: tab === 3, red: wEnough, onClick: () => this._openHeroGrowModal(heroId, 3) }
                ]
            };
        };
        this._openPop(opt());
        // 展示台挂英雄立绘（资源就绪后替换占位）
        const ph = this._heroPhoto(HERO_DEFS.indexOf(def), 'figure');
        this._tex(ph.key, u => {
            const ped = this._root?.querySelector('.popPedestal') as HTMLElement | null;
            if (ped) {
                ped.textContent = '';
                ped.style.backgroundImage = u;
                ped.style.backgroundSize = 'cover';
                ped.style.backgroundPosition = 'center 12%';
            }
        });
    }
    /**
     * 装备养成二级页（UX 布局稿 4-A · L2·XL 全屏页）：
     * 展示台[固定] → 强化预览/词缀[滚动] → 消耗行[固定] → 强化·一键强化[固定] → 六槽位条[固定] → 底栏(返回+页签)。
     * 页签：强化（升级/重铸/卸下）· 宝石（镶嵌/拆卸）· 穿戴（背包件换上）。
     */
    protected _openEquipSlotPanel(heroId: string, slot: EquipSlot, tab = 0): void {
        const hs = HeroSystem.instance;
        const gm = GameManager.instance;
        if (!gm.isHeroOwned(heroId)) {
            return;
        }
        const heroName = HERO_DEFS.find(d => d.id === heroId)?.name ?? heroId;
        const keyName = (key: 'atkPct' | 'ratePct' | 'rangePct'): string =>
            key === 'atkPct' ? '攻击加成' : key === 'ratePct' ? '射速加成' : '射程加成';
        const opt = (): PopOpts => {
            const cur = hs.equipped(heroId, slot);
            const def = cur ? hs.equipDef(cur.id) : null;
            const tier: EquipTier = def?.tier
                ?? (cur && cur.id.startsWith('bag:') ? (Number(cur.id.split(':')[2]) || 1) as EquipTier : 1);
            const name = cur
                ? (def ? def.name : bagItemName({ slot, tier, lv: cur.lv }))
                : `${EQUIP_SLOT_NAMES[slot]}（空）`;
            const maxed = !!cur && hs.isEquipMaxLevel(cur);
            const cost = cur ? hs.equipUpgradeCost(cur) : 0;
            const alloy = cur ? hs.equipUpgradeAlloy(cur) : 0;
            const alloyLeft = hs.miscCount('mat_alloy');
            const enough = !!cur && !maxed && gm.gold >= cost && alloyLeft >= alloy;
            /** 强化不可用时的原因（两个按钮共用） */
            const upWhy = (): string => !cur
                ? '该槽位还没有装备'
                : maxed
                    ? '该装备已满级'
                    : alloyLeft < alloy
                        ? `精炼合金不足 · 需要 🔩 ${alloy}，还差 ${alloy - alloyLeft}`
                        : `金币不足 · 需要 🪙 ${cost.toLocaleString()}，还差 ${(cost - gm.gold).toLocaleString()}`;
            const bar = tab === 0 ? '强化' : tab === 1 ? '宝石' : '穿戴';
            const doUpgrade = (n: number): number => {
                let done = 0;
                while (done < n) {
                    const st = hs.equipped(heroId, slot);
                    if (!st || hs.isEquipMaxLevel(st)
                        || gm.gold < hs.equipUpgradeCost(st)
                        || hs.miscCount('mat_alloy') < hs.equipUpgradeAlloy(st)) {
                        break;
                    }
                    if (!hs.upgradeEquip(heroId, slot)) {
                        break;
                    }
                    done++;
                }
                return done;
            };
            return {
                tier: 2,
                size: 'XL',
                title: `${EQUIP_SLOT_NAMES[slot]}养成 · ${heroName}`,
                onBack: () => this._closePop(),
                show: {
                    icon: SLOT_EMOJI[slot],
                    tier: cur ? `+${cur.lv}` : '空',
                    name,
                    sub: `${heroName} · ${EQUIP_TIER_NAMES[tier - 1]}${EQUIP_SLOT_NAMES[slot]}`
                },
                cost: cur && !maxed ? [
                    { icon: '🪙', have: gm.gold, need: cost },
                    { icon: '🔩', have: alloyLeft, need: alloy }
                ] : undefined,
                build: c => {
                    if (!cur) {
                        c.appendChild(this._popEmpty('该部位尚未装备', '在下方「穿戴」页签选择背包中的装备', SLOT_EMOJI[slot]));
                        for (const { index, item } of hs.bagItemsOf(slot)) {
                            c.appendChild(this._popRow({
                                icon: SLOT_EMOJI[slot],
                                title: bagItemName(item),
                                tag: EQUIP_TIER_NAMES[item.tier - 1],
                                lines: [`强化 +${item.lv}`, this._affixBadge(item.affixes) || '无词缀'],
                                action: {
                                    label: '穿 戴',
                                    onClick: () => {
                                        if (hs.equipFromBag(heroId, index)) {
                                            SoundFx.play('buy');
                                            this._refreshHeroes();
                                            this._openEquipSlotPanel(heroId, slot, tab);
                                        }
                                    }
                                }
                            }));
                        }
                        return;
                    }
                    if (tab === 1) {
                        const holes = hs.gemSlotCount(heroId, slot);
                        const gems = hs.equippedGems(heroId, slot);
                        c.appendChild(this._popSec(`宝石插槽（${gems.length}/${holes}）`));
                        if (holes === 0) {
                            c.appendChild(this._popEmpty('该装备没有宝石插槽', '品质 ★2 起开放镶嵌孔', '💠'));
                        }
                        for (let hi = 0; hi < holes; hi++) {
                            const gid = gems[hi];
                            if (gid) {
                                const gd = miscDef(gid)!;
                                const eff = GEM_EFFECTS.find(g => g.miscId === gid);
                                const effTxt = eff
                                    ? `${keyName(eff.key === 'critPct' ? 'atkPct' : eff.key).replace('加成', '')}+${Math.round(eff.value * 100)}%`
                                    : '';
                                c.appendChild(this._popAttr({
                                    icon: gd.ic,
                                    text: `插槽 ${hi + 1} · **${gd.name}** ${effTxt}`,
                                    action: {
                                        label: '拆 卸',
                                        onClick: () => {
                                            if (hs.unsocketGem(heroId, slot, hi)) {
                                                SoundFx.play('ui');
                                                this._toast('宝石已返还背包');
                                                this._refreshHeroes();
                                                this._openEquipSlotPanel(heroId, slot, 1);
                                            }
                                        }
                                    }
                                }));
                            } else {
                                c.appendChild(this._popAttr({
                                    icon: '◇',
                                    text: `插槽 ${hi + 1} · 空孔位`,
                                    empty: true,
                                    action: {
                                        label: '镶 嵌',
                                        kind: 'info',
                                        onClick: () => {
                                            this._refreshHeroes();
                                            this._openGemPickPanel(heroId, slot);
                                        }
                                    }
                                }));
                            }
                        }
                        c.appendChild(this._popKV('镶嵌费用', `🪙 ${gemSocketCost(tier)} / 次 · 拆卸免费返还`, 'total'));
                        return;
                    }
                    if (tab === 2) {
                        const items = hs.bagItemsOf(slot);
                        c.appendChild(this._popSec('当前穿戴'));
                        c.appendChild(this._popAttr({
                            icon: SLOT_EMOJI[slot],
                            text: `**${name}** 强化 +${cur.lv} · 孔位 ${hs.equippedGems(heroId, slot).length}/${hs.gemSlotCount(heroId, slot)}`
                        }));
                        c.appendChild(this._popSec('卸下与替换'));
                        c.appendChild(this._popAttr({
                            icon: '📤',
                            text: '卸下到背包（不消耗材料，属性立即失效）',
                            action: {
                                label: '卸 下',
                                kind: 'info',
                                onClick: () => {
                                    if (hs.unequipToBag(heroId, slot)) {
                                        SoundFx.play('ui');
                                        this._refreshHeroes();
                                        this._openEquipSlotPanel(heroId, slot, 0);
                                    }
                                }
                            }
                        }));
                        if (!items.length) {
                            c.appendChild(this._popEmpty('背包中该部位没有其他件', '去商店购买或关卡掉落', '🎒'));
                        }
                        for (const { index, item } of items) {
                            c.appendChild(this._popRow({
                                icon: SLOT_EMOJI[slot],
                                title: bagItemName(item),
                                tag: EQUIP_TIER_NAMES[item.tier - 1],
                                lines: [`强化 +${item.lv}`, this._affixBadge(item.affixes) || '无词缀'],
                                action: {
                                    label: '穿 戴',
                                    onClick: () => {
                                        if (hs.equipFromBag(heroId, index)) {
                                            SoundFx.play('buy');
                                            this._refreshHeroes();
                                            this._openEquipSlotPanel(heroId, slot, 0);
                                        }
                                    }
                                }
                            }));
                        }
                        return;
                    }
                    // 页签 0：强化
                    if (maxed) {
                        c.appendChild(this._el('div', 'popWarn', `✨ 已强化至上限 +${cur.lv}`));
                    } else {
                        const clean = { ...cur, gems: [] as string[], affixes: [] as string[] };
                        const lines: Array<{ label: string; old: string; now: string }> = [{
                            label: '强化等级',
                            old: `+${cur.lv}`,
                            now: `+${cur.lv + 1}`
                        }];
                        for (const key of ['atkPct', 'ratePct', 'rangePct'] as const) {
                            const o = Math.round(hs.equipSlotValue({ ...clean, lv: cur.lv }, key) * 100);
                            const n = Math.round(hs.equipSlotValue({ ...clean, lv: cur.lv + 1 }, key) * 100);
                            if (o > 0 || n > 0) {
                                lines.push({ label: keyName(key), old: `+${o}%`, now: `+${n}%` });
                            }
                        }
                        c.appendChild(this._popCmp('强化预览', lines));
                    }
                    const tot: string[] = [];
                    for (const key of ['atkPct', 'ratePct', 'rangePct'] as const) {
                        const v = Math.round(hs.equipSlotValue(cur, key) * 100);
                        if (v > 0) {
                            tot.push(`${keyName(key).replace('加成', '')} +${v}%`);
                        }
                    }
                    c.appendChild(this._popKV('当前总属性（含宝石/词缀）', tot.join(' · ') || '无', 'total'));
                    c.appendChild(this._popSec(`词缀（${cur.affixes?.length ?? 0}）`));
                    if (cur.affixes?.length) {
                        for (const id of cur.affixes) {
                            c.appendChild(this._popAttr({
                                icon: '✦',
                                text: `**${affixName(id)}** ${affixValueText(id, tier)}`
                            }));
                        }
                    } else {
                        c.appendChild(this._popAttr({ icon: '✦', text: '暂无词缀（重铸可为该件生成）', empty: true }));
                    }
                    const rfAlloy = hs.reforgeAlloyCost(cur);
                    const rfGem = hs.reforgeGemCost(cur);
                    const rfOk = alloyLeft >= rfAlloy && gm.res.get('diamond') >= rfGem;
                    c.appendChild(this._popAttr({
                        icon: '🎲',
                        text: `重铸词缀（保底满条 · 强化与宝石不变）需 🔩 ${rfAlloy}（余 ${alloyLeft}）· 💎 ${rfGem}`,
                        empty: !rfOk,
                        action: {
                            label: '重 铸',
                            kind: rfOk ? 'gold' : 'info',
                            onClick: () => {
                                if (!rfOk) {
                                    this._toast('材料不足：重铸需精炼合金与钻石');
                                    return;
                                }
                                if (hs.reforgeAffixes(heroId, slot)) {
                                    SoundFx.play('buy');
                                    this._toast('词缀已重铸');
                                    this._refreshHeroes();
                                    this._openEquipSlotPanel(heroId, slot, 0);
                                }
                            }
                        }
                    }));
                },
                ctas: cur && tab === 0 ? [
                    {
                        label: maxed ? '已满级' : '强 化',
                        disabled: !enough,
                        onDisabled: () => this._toast(upWhy()),
                        onClick: () => {
                            const n = doUpgrade(1);
                            if (n > 0) {
                                SoundFx.play('buy');
                                this._refreshTop();
                                this._refreshHeroes();
                            } else {
                                this._toast('材料不足：分解紫装以上或礼包获取精炼合金');
                            }
                            this._openEquipSlotPanel(heroId, slot, 0);
                        }
                    },
                    {
                        label: '一键强化',
                        kind: 'green',
                        disabled: !enough,
                        onDisabled: () => this._toast(upWhy()),
                        onClick: () => {
                            const n = doUpgrade(20);
                            if (n > 0) {
                                SoundFx.play('coin');
                                this._toast(`一键强化 +${n} 级`);
                                this._refreshTop();
                                this._refreshHeroes();
                            } else {
                                this._toast('材料不足：无法继续强化');
                            }
                            this._openEquipSlotPanel(heroId, slot, 0);
                        }
                    }
                ] : undefined,
                note: maxed ? '已达当前工坊等级上限' : '强化消耗金币与精炼合金 · 换装继承强化等级',
                slots: sb => {
                    for (const s of EQUIP_SLOTS) {
                        const st = hs.equipped(heroId, s);
                        const d = st ? hs.equipDef(st.id) : null;
                        const t = d?.tier ?? (st && st.id.startsWith('bag:') ? (Number(st.id.split(':')[2]) || 1) as EquipTier : 1);
                        const empty = hs.gemSlotCount(heroId, s) > hs.equippedGems(heroId, s).length;
                        sb.appendChild(this._popSlot({
                            icon: SLOT_EMOJI[s],
                            tier: st ? `+${st.lv}` : undefined,
                            on: s === slot,
                            red: !!st && empty,
                            onClick: () => this._openEquipSlotPanel(heroId, s, 0)
                        }));
                    }
                },
                barBack: true,
                barTabs: [
                    {
                        icon: '⚒',
                        label: '强化',
                        on: tab === 0,
                        red: enough,
                        onClick: () => this._openEquipSlotPanel(heroId, slot, 0)
                    },
                    {
                        icon: '💠',
                        label: '宝石',
                        on: tab === 1,
                        red: cur ? hs.gemSlotCount(heroId, slot) > hs.equippedGems(heroId, slot).length : false,
                        onClick: () => this._openEquipSlotPanel(heroId, slot, 1)
                    },
                    {
                        icon: '🎒',
                        label: '穿戴',
                        on: tab === 2,
                        onClick: () => this._openEquipSlotPanel(heroId, slot, 2)
                    }
                ]
            };
        };
        this._openPop(opt());
    }


    /** 技能养成弹窗（英雄页左功能列「技能」入口）：三线技能卡，就地升级后原位重建 */


    /**
     * 属性详情（UX 布局稿：L3·M）：战力数值拆解——攻击 / 战力 / 装备加成 + 口径说明。
     */
    protected _openPowerDetailModal(heroId: string): void {
        const hs = HeroSystem.instance;
        const def = HERO_DEFS.find(d => d.id === heroId);
        if (!def) {
            return;
        }
        this._openPop({
            tier: 3,
            size: 'M',
            banner: `📊 属性详情 · ${def.name}`,
            art: `战力 ${this._heroPower(def.id).toLocaleString()}`,
            subtitle: '基础攻击 × 全部局外加成',
            build: c => {
                c.appendChild(this._popSec('数值拆解'));
                c.appendChild(this._popKV('⚔️ 攻击', String(Math.round(def.atk * hs.atkMulOf(def.id)))));
                c.appendChild(this._popKV('⚡ 战力', this._heroPower(def.id).toLocaleString(), 'total'));
                c.appendChild(this._popKV('🛡️ 装备加成', `+${Math.round((hs.equipMulOf(def.id).atk - 1) * 100)}%`));
                c.appendChild(this._popAttr({ icon: 'ℹ️', text: '装备加成含 **装备 + 宝石 + 核心**，不含星级' }));
            },
            note: '星级加成单独体现在升星面板 · 生命/防御为局内口径，不在此展示'
        });
    }


    /**
     * 升星（UX 布局稿：L3·M）：当前星级 + 碎片进度（固定消耗行）+ 升星 CTA，升级后就地重绘。
     */
    protected _openStarModal(heroId: string): void {
        const rs = RecruitSystem.instance;
        const def = HERO_DEFS.find(d => d.id === heroId);
        if (!def) {
            return;
        }
        const opt = (): PopOpts => {
            const st = rs.stars(def.id);
            const maxed = st >= HERO_STAR_MAX;
            const cost = rs.starCost(def.id);
            const have = rs.shards(def.id);
            const can = rs.canStarUp(def.id);
            return {
                tier: 3,
                size: 'M',
                banner: `⭐ 升星 · ${def.name}`,
                art: maxed ? 'MAX' : `${st} / ${HERO_STAR_MAX} 阶`,
                subtitle: `${'★'.repeat(st)}${'☆'.repeat(HERO_STAR_MAX - st)}`,
                build: c => {
                    c.appendChild(this._popSec('升星进度'));
                    c.appendChild(this._popKV('当前星级', `${st} / ${HERO_STAR_MAX} 阶`, maxed ? 'total' : undefined));
                    if (!maxed) {
                        c.appendChild(this._popKV('所需碎片', `${have} / ${cost}`, 'total'));
                        c.appendChild(this._popAttr({ icon: '🔩', text: '招募重复获得可转为该英雄碎片' }));
                        c.appendChild(this._popAttr({ icon: '⬆️', text: `升至 ★${st + 1} 提升英雄**星级加成**与羁绊门槛` }));
                    } else {
                        c.appendChild(this._popAttr({ icon: '🏁', text: '该英雄已无升星空间' }));
                    }
                },
                cost: maxed ? undefined : [{ icon: '🔩', have, need: cost }],
                ctas: [{
                    label: maxed ? '已 满 星' : can ? `⭐ 升 星（−${cost} 碎片）` : `还差 ${cost - have} 片`,
                    disabled: !can,
                    onDisabled: () => this._toast(maxed ? '该英雄已满星' : `碎片不足 · 还差 ${cost - have} 片`),
                    onClick: () => {
                        SoundFx.unlock();
                        const next = rs.starUp(def.id);
                        if (next !== null) {
                            SoundFx.play('buy');
                            this._toast(`${def.name} 升至 ★${next}`);
                            this._refreshTop();
                            this._refreshHeroes();
                            this._popRebuild(opt());
                        } else {
                            SoundFx.play('ui');
                        }
                    }
                }],
                note: '碎片不足时可在招募重复抽到该英雄或使用通用碎片'
            };
        };
        this._openPop(opt());
    }


    /** 技能养成三线卡（普攻/技能/大招）——英雄页左功能列「技能」入口的弹窗主体 */
    protected _renderSkillCards(def: HeroDef, onUpgraded?: () => void): HTMLDivElement {
        const gm = GameManager.instance;
        const hs = HeroSystem.instance;
        const list = document.createElement('div');
        list.style.marginTop = 'calc(16px * var(--hs,1))';
        const basicDesc = def.weapon === 'rifle' ? '自动锁定最近目标，稳定单发射击，可触发暴击。'
            : def.weapon === 'sniper' ? '超远射程锁定高威胁目标，高伤慢速单体狙击。'
                : def.weapon === 'laser' ? '持续锁定跟踪光束，附加灼烧持续伤害。'
                    : '弹速极快的辐射弹，穿透直线上多个敌人。';
        const cards: Array<{ t: string; ic: string; iconKey: string; n: string; d: string; slot: AbilitySlot; ult: boolean }> = [
            { t: '普攻', ic: '🔫', iconKey: `icons/${def.id}_basic`, n: '基础射击', d: basicDesc, slot: 'basic', ult: false },
            { t: '技能', ic: '💫', iconKey: `icons/${def.id}_skill`, n: def.skill.name, d: def.skill.desc, slot: 'skill', ult: false },
            { t: '大招', ic: '☄️', iconKey: `icons/${def.id}_ultimate`, n: def.ultimate.name, d: def.ultimate.desc, slot: 'ultimate', ult: true },
        ];
        for (const c of cards) {
            const lv = hs.abilityLevel(def.id, c.slot);
            const maxed = hs.isAbilityMaxLevel(def.id, c.slot);
            const locked = lv <= 0;
            const card = document.createElement('div');
            card.className = 'skillCard panel' + (c.ult ? ' frame' : '');
            card.title = '点击查看技能详情';
            card.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._openAbilityModal(def.id, c.slot);
            };
            const icon = document.createElement('div');
            icon.className = 'sIcon' + (c.ult ? ' ult' : c.t === '技能' ? ' s2' : '');
            icon.textContent = c.ic;
            this._tex(c.iconKey, u => {
                icon.style.backgroundImage = u;
                icon.style.backgroundSize = 'contain';
                icon.style.backgroundRepeat = 'no-repeat';
                icon.style.backgroundPosition = 'center';
                icon.textContent = '';
            });
            const info = document.createElement('div');
            info.className = 'sInfo';
            const nm = document.createElement('div');
            nm.className = 'sName';
            nm.innerHTML = `${c.n}<span class="tag ${c.ult ? 'g' : c.t === '技能' ? 'p' : 'b'}">${c.t}</span>`;
            const desc = document.createElement('div');
            desc.className = 'sDesc';
            desc.textContent = `${c.d}（每级伤害 +${Math.round(ABILITY_LEVEL_DMG_BONUS * 100)}%）`;
            info.appendChild(nm);
            info.appendChild(desc);
            const act = document.createElement('div');
            act.className = 'sAct';
            const lvEl = document.createElement('div');
            lvEl.className = 'sLv';
            lvEl.textContent = maxed ? 'MAX' : locked ? '未解锁' : `Lv.${lv}`;
            const btn = document.createElement('button');
            btn.className = `btn ${c.ult ? 'gold' : 'blue'} sm`;
            if (locked) {
                // 技能/大招不卖解锁：只能局内升级三选一随机刷出解锁卡
                btn.textContent = '局内解锁';
                btn.disabled = true;
            } else if (maxed) {
                btn.textContent = '已满级';
                btn.disabled = true;
            } else {
                const cost = hs.abilityUpgradeCost(def.id, c.slot);
                btn.textContent = `🪙 ${cost.toLocaleString()}`;
                btn.disabled = gm.gold < cost;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    if (hs.upgradeAbility(def.id, c.slot)) {
                        SoundFx.play('buy');
                        this._toast(`${c.n} 升至 Lv.${lv + 1}`);
                        // 英雄页整页重建同步等级与金币态；弹窗内则原位重建技能卡
                        this._refreshHeroes();
                        this._refreshTop();
                        onUpgraded?.();
                    }
                };
            }
            btn.style.opacity = btn.disabled ? '0.5' : '1';
            act.appendChild(lvEl);
            act.appendChild(btn);
            card.appendChild(icon);
            card.appendChild(info);
            card.appendChild(act);
            list.appendChild(card);
        }
        return list;
    }


    /** 技能升级效果文案：当前等级伤害倍率描述 */
    protected _abilityEffectText(def: HeroDef, slot: AbilitySlot, lv: number): string {
        if (slot === 'basic') {
            return `基础射击伤害 ×${(1 + ABILITY_LEVEL_DMG_BONUS * Math.max(0, lv - 1)).toFixed(2)}`;
        }
        const ab = slot === 'ultimate' ? def.ultimate : def.skill;
        const mul = ab.damageScale * (1 + ABILITY_LEVEL_DMG_BONUS * Math.max(0, lv - 1));
        return `${ab.desc} · 伤害倍率 ×${mul.toFixed(2)}`;
    }


    /** 里程碑等级效果文案（技能浮窗展示；文案与数值设计约定，非运行时强绑定） */
    protected _abilityMilestones(slot: AbilitySlot): Array<{ lv: number; text: string }> {
        if (slot === 'basic') {
            return [{ lv: 2, text: '射击节奏微调，体感更顺滑' }, { lv: 3, text: '暴击伤害显著提升' }];
        }
        if (slot === 'ultimate') {
            return [{ lv: 2, text: '效果范围/目标数 +30%' }, { lv: 3, text: '伤害倍率大幅提升，冷却小幅缩短' }];
        }
        return [{ lv: 2, text: '技能持续时间 +25%' }, { lv: 3, text: '伤害倍率大幅提升，冷却小幅缩短' }];
    }


    /**
     * 技能详情（UX 布局稿：L3·M）：当前/下一级效果 + 里程碑解锁 + 消耗（金币+英雄核心）+ 升级。
     * 由英雄养成页的技能卡钻取，onBack 回养成页技能页签；升级后就地重绘。
     */
    protected _openAbilityModal(heroId: string, slot: AbilitySlot): void {
        const gm = GameManager.instance;
        const hs = HeroSystem.instance;
        const def = HERO_DEFS.find(d => d.id === heroId);
        if (!def || !gm.isHeroOwned(heroId)) {
            return;
        }
        const titles: Record<AbilitySlot, string> = { basic: '🔫 基础射击', skill: '💫 技能', ultimate: '☄️ 大招' };
        const an = slot === 'ultimate' ? def.ultimate.name : slot === 'skill' ? def.skill.name : '基础射击';
        const opt = (): PopOpts => {
            const lv = hs.abilityLevel(heroId, slot);
            const maxed = hs.isAbilityMaxLevel(heroId, slot);
            const locked = lv <= 0;
            const cost = locked || maxed ? 0 : hs.abilityUpgradeCost(heroId, slot);
            const core = locked || maxed ? 0 : hs.abilityUpgradeCore(heroId, slot);
            const coreLeft = hs.miscCount('mat_core');
            const can = !locked && !maxed && gm.gold >= cost && coreLeft >= core;
            return {
                tier: 3,
                size: 'M',
                banner: titles[slot],
                art: maxed ? 'MAX' : locked ? '未解锁' : `Lv.${lv}`,
                subtitle: `${def.name} · ${an} · 每级伤害 +${Math.round(ABILITY_LEVEL_DMG_BONUS * 100)}%`,
                onBack: () => this._openHeroGrowModal(heroId, 0),
                build: c => {
                    c.appendChild(this._popSec('升级效果'));
                    c.appendChild(this._popAttr({
                        icon: '✅',
                        text: `当前（Lv.${Math.max(1, lv)}）**${this._abilityEffectText(def, slot, Math.max(1, lv))}**`
                    }));
                    if (!maxed && !locked) {
                        c.appendChild(this._popAttr({
                            icon: '⬆️',
                            text: `升到 Lv.${lv + 1} **${this._abilityEffectText(def, slot, lv + 1)}**`
                        }));
                    }
                    c.appendChild(this._popSec('里程碑解锁'));
                    for (const m of this._abilityMilestones(slot)) {
                        const reach = lv >= m.lv;
                        c.appendChild(this._popRow({
                            icon: '🏆',
                            title: `Lv.${m.lv}`,
                            lines: [m.text],
                            status: reach ? '✅ 已达成' : undefined,
                            statusKind: reach ? 'soon' : undefined,
                            on: reach
                        }));
                    }
                    c.appendChild(this._popSec('升级条件'));
                    c.appendChild(this._popKV('当前等级', `Lv.${lv} / ${gm.abilityLevelCap()}`, 'total'));
                    if (locked) {
                        c.appendChild(this._popWarn('出战时升级三选一随机刷出「解锁卡」后获得'));
                    } else if (maxed) {
                        c.appendChild(this._popAttr({ icon: '🏁', text: '技能已达当前上限 · 研究所可提升上限' }));
                    }
                },
                cost: locked || maxed ? undefined : [
                    { icon: '🪙', have: gm.gold, need: cost },
                    { icon: '⚙️', have: coreLeft, need: core }
                ],
                ctas: [{
                    label: locked ? '局 内 解 锁' : maxed ? '已 满 级' : '升 级',
                    disabled: !can,
                    onDisabled: () => this._toast(locked
                        ? '该技能尚未解锁 · 出战时升级三选一随机刷出「解锁卡」'
                        : maxed
                            ? '技能已达当前上限 · 研究所可提升上限'
                            : coreLeft < core
                                ? `英雄核心不足 · 需要 ${core}，还差 ${core - coreLeft}`
                                : `金币不足 · 需要 🪙 ${cost.toLocaleString()}，还差 ${(cost - gm.gold).toLocaleString()}`),
                    onClick: () => {
                        SoundFx.unlock();
                        if (hs.upgradeAbility(heroId, slot)) {
                            SoundFx.play('buy');
                            this._toast(`${an} 升至 Lv.${lv + 1}`);
                            this._refreshTop();
                            this._refreshHeroes();
                            this._popRebuild(opt());
                        } else {
                            this._toast('金币或英雄核心不足');
                        }
                    }
                }],
                note: '英雄核心由关卡掉落与商店获取 · 技能卡在英雄养成页可直达本层'
            };
        };
        this._openPop(opt());
    }


}

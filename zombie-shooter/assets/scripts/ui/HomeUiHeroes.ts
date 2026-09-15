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
import type { PopOpts } from './HomeUiCore';
import { HomeUiMall } from './HomeUiMall';

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

    /** 英雄页天赋入口红点（有未分配点数时点亮） */
    protected _talentRedEl: HTMLElement | null = null;


    /** 天赋入口红点：有未分配的可用天赋点时点亮（英雄页选择条入口） */
    protected _refreshTalentRed(): void {
        if (this._talentRedEl) {
            this._talentRedEl.classList.toggle('on', TalentSystem.instance.available > 0);
        }
    }


    /**
     * 天赋树弹窗：三分支并排 × 每支 5 节点竖排（节点间连线表示解锁先后）。
     * 点数为进度派生（累计等级/通关/爬塔/招募），洗点免费无限次。
     * 选中的节点在下方详情区就地更新，加点/洗点后重开本弹窗刷新整棵树。
     */
    protected _openTalentModal(selId = 'fire_1'): void {
        const ts = TalentSystem.instance;
        this._openModal('🌟 天赋树', (box) => {
            box.classList.add('talentBox');

            // ---- 头部：可用点数 + 总进度 ----
            const head = document.createElement('div');
            head.className = 'talentHead';
            head.innerHTML = `<div class="talentHeadTop"><b>可用天赋点 <i>${ts.available}</i></b>`
                + `<span>已投 ${ts.spent} / 共 ${ts.total}</span></div>`;
            const barWrap = document.createElement('div');
            barWrap.className = 'talentBar';
            const barIn = document.createElement('i');
            barIn.style.width = `${ts.total > 0 ? Math.round(ts.spent / ts.total * 100) : 0}%`;
            barWrap.appendChild(barIn);
            head.appendChild(barWrap);
            const src = document.createElement('div');
            src.className = 'talentSrc';
            src.textContent = '天赋点来源：累计等级每 5 级 +1 · 通关每关 +1 · 爬塔每 5 层 +1 · 招募每 10 抽 +1';
            head.appendChild(src);
            box.appendChild(head);

            // ---- 三分支并排 ----
            const row = document.createElement('div');
            row.className = 'talentBranchRow';
            for (const br of TALENT_BRANCHES) {
                const col = document.createElement('div');
                col.className = 'talentBranch';
                const title = document.createElement('div');
                title.className = 'tbTitle';
                title.innerHTML = `<b>${TALENT_BRANCH_NAMES[br]}</b><i>${ts.spentIn(br)}/${branchPointTotal(br)} 点</i>`;
                col.appendChild(title);
                const nodes = document.createElement('div');
                nodes.className = 'tbNodes';
                for (const def of branchNodes(br)) {
                    const lv = ts.level(def.id);
                    const maxed = ts.isMaxed(def.id);
                    const unlocked = ts.isUnlocked(def.id);
                    const node = document.createElement('div');
                    node.className = 'talentNode';
                    if (maxed) {
                        node.classList.add('maxed');
                    } else if (!unlocked) {
                        node.classList.add('lock');
                    } else if (ts.canUpgrade(def.id)) {
                        node.classList.add('can');
                    }
                    if (def.id === selId) {
                        node.classList.add('sel');
                    }
                    node.innerHTML = `<span class="tnIc">${def.ic}</span>`
                        + `<span class="tnLv">${def.maxLevel > 1 ? `${lv}/${def.maxLevel}` : (lv > 0 ? '已激活' : '未激活')}</span>`;
                    node.onclick = (e) => {
                        e.stopPropagation();
                        SoundFx.play('ui');
                        this._closeTopMask();
                        this._openTalentModal(def.id);
                    };
                    nodes.appendChild(node);
                }
                col.appendChild(nodes);
                row.appendChild(col);
            }
            box.appendChild(row);

            // ---- 详情区（就地更新，不重开弹窗） ----
            const def = talentNode(selId) || TALENT_NODES[0];
            const lv = ts.level(def.id);
            const maxed = ts.isMaxed(def.id);
            const unlocked = ts.isUnlocked(def.id);
            const detail = document.createElement('div');
            detail.className = 'talentDetail panel';
            const nameLine = document.createElement('div');
            nameLine.className = 'tdName';
            nameLine.innerHTML = `<b>${def.ic} ${def.name}</b>`
                + `<i>Lv.${lv}/${def.maxLevel} · ${TALENT_BRANCH_NAMES[def.branch]}线第 ${def.idx + 1} 层</i>`;
            detail.appendChild(nameLine);
            const descLine = document.createElement('div');
            descLine.className = 'tdDesc';
            descLine.textContent = def.desc(lv);
            detail.appendChild(descLine);
            const hint = document.createElement('div');
            hint.className = 'tdHint';
            if (maxed) {
                hint.textContent = '✅ 已满级';
            } else if (!unlocked) {
                const prev = branchNodes(def.branch)[def.idx - 1];
                hint.textContent = `🔒 需先将「${prev ? prev.name : '前置节点'}」点满`;
            } else if (ts.available < def.pointCost) {
                hint.textContent = `⚠️ 天赋点不足，还差 ${def.pointCost - ts.available} 点`;
            } else {
                hint.textContent = `消耗 ${def.pointCost} 点天赋点`;
            }
            detail.appendChild(hint);

            const btns = document.createElement('div');
            btns.className = 'tdBtns';
            const up = document.createElement('button');
            up.className = 'btn big gold';
            up.textContent = maxed ? '✅ 已满级' : `🌟 加点（${def.pointCost} 点）`;
            up.disabled = !ts.canUpgrade(def.id);
            up.onclick = (e) => {
                e.stopPropagation();
                SoundFx.unlock();
                const lvNow = ts.upgrade(def.id);
                if (lvNow === null) {
                    SoundFx.play('ui');
                    this._toast('加点失败');
                    return;
                }
                SoundFx.play('coin');
                this._toast(`${def.name} 升至 Lv.${lvNow}`);
                this._refreshTop();
                this._refreshTalentRed();
                this._closeTopMask();
                this._openTalentModal(def.id);
            };
            btns.appendChild(up);

            const reset = document.createElement('button');
            reset.className = 'btn big';
            reset.textContent = '🔄 洗点';
            reset.disabled = ts.spent <= 0;
            // 二次确认：沿用设置页重置存档的两次点击模式，防误触
            let confirm = false;
            reset.onclick = (e) => {
                e.stopPropagation();
                SoundFx.unlock();
                if (!confirm) {
                    confirm = true;
                    reset.textContent = `⚠️ 再点一次确认洗点（退 ${ts.spent} 点）`;
                    return;
                }
                const back = ts.reset();
                SoundFx.play('bigkill');
                this._toast(`洗点完成，退还 ${back} 点天赋点`);
                this._refreshTop();
                this._refreshTalentRed();
                this._closeTopMask();
                this._openTalentModal(def.id);
            };
            btns.appendChild(reset);
            detail.appendChild(btns);
            box.appendChild(detail);
        });
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
                size: 'M',
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
                    c.appendChild(this._popSec('概率表'));
                    c.appendChild(this._popAttr({ icon: '🎖️', text: '英雄本体（未获得优先） **6%**' }));
                    c.appendChild(this._popAttr({ icon: '⭐', text: '传说碎片 **×10** · 14%' }));
                    c.appendChild(this._popAttr({ icon: '🔷', text: '稀有碎片 **×5** · 40%' }));
                    c.appendChild(this._popAttr({ icon: '🔹', text: '普通碎片 **×2** · 40%' }));
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

    /** 英雄页：英雄横滑选择条 + 详情（由 _refreshHeroes 整块重建） */
    protected _buildHeroesPage(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'screen';
        this._pages.heroes = page;
        const pick = document.createElement('div');
        pick.className = 'heroPick';
        page.appendChild(pick);
        this._heroPickEl = pick;
        const body = document.createElement('div');
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
        const gm = GameManager.instance;
        const hs = HeroSystem.instance;
        const rs = RecruitSystem.instance;
        const pick = this._heroPickEl;
        const body = this._heroBodyEl;
        if (!pick || !body) {
            return;
        }
        // 横滑选择条：招募入口（跳商店主卡）+ 英雄卡（天赋入口移至左功能列）
        pick.innerHTML = '';
        const recruitBtn = document.createElement('button');
        recruitBtn.className = 'hpick recruitEntry';
        recruitBtn.innerHTML = '<span class="pic rcIc">🎖️</span><i>招募</i>';
        recruitBtn.title = '前往商店招募主卡（抽卡）';
        recruitBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._switchPage('mall');
        };
        pick.appendChild(recruitBtn);
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

        // 头牌：名字+星级 / 定位标签 / 战力徽章
        const head = document.createElement('div');
        head.className = 'heroHead';
        const hLeft = document.createElement('div');
        const hName = document.createElement('div');
        hName.className = 'heroName';
        if (owned) {
            // 星级 = 招募升星真实等级（0~6 星），不再是固定标签
            const st = rs.stars(def.id);
            const stars = document.createElement('span');
            stars.className = 'star';
            stars.textContent = '★'.repeat(st) + '☆'.repeat(HERO_STAR_MAX - st);
            stars.title = st >= HERO_STAR_MAX
                ? '已满星'
                : `升星进度 ${rs.shards(def.id)} / ${rs.starCost(def.id)} 碎片`;
            hName.appendChild(document.createTextNode(def.name));
            hName.appendChild(stars);
        } else {
            hName.textContent = def.name + '（未获得）';
        }
        const tagRow = document.createElement('div');
        tagRow.className = 'tagRow';
        tagRow.innerHTML = `<span class="tag b">人类·${this._heroWeaponName(def.id)}</span>` +
            `<span class="tag g">${def.role}</span>` +
            `<span class="tag">${inLineup ? '已上阵' : '未上阵'} ${gm.lineup.length}/${GameManager.LINEUP_MAX}</span>`;
        hLeft.appendChild(hName);
        hLeft.appendChild(tagRow);
        head.appendChild(hLeft);
        body.appendChild(head);

        // 中部：左功能列（核心/强化/天赋）+ 立绘 + 右装备格（2×3 六槽）
        const main = document.createElement('div');
        main.className = 'heroMain';
        const mkSlot = (slot: EquipSlot) => {
            const cur = owned ? hs.equipped(def.id, slot) : null;
            const el = document.createElement('div');
            el.className = 'slot' + (cur ? ' filled' : ' empty');
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
                slv.textContent = `+${cur.lv}`;
                slv.style.borderColor = EQUIP_TIER_COLORS[tier - 1];
                el.appendChild(slv);
                el.title = `${bagItemName({ slot, tier, lv: cur.lv })}`;
            } else {
                el.title = `${EQUIP_SLOT_NAMES[slot]} · 空槽位`;
            }
            el.onclick = (e) => {
                e.stopPropagation();
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
        fig.className = 'heroFigure';
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
        // 战力徽章挂在立绘正下方（火焰+数字，参考主流卡牌页），不再占头牌右侧
        const heroLv = document.createElement('div');
        heroLv.className = 'heroLv';
        heroLv.textContent = owned ? def.role : '未获得';
        const power = document.createElement('div');
        power.className = 'powerBadge';
        power.innerHTML = `🔥 <span>${owned ? this._heroPower(def.id).toLocaleString() : '---'}</span>`;
        // 战力右侧 ⓘ 详情：攻击/战力/装备加成明细收进弹窗（三维栏已从主页面移除）
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
        fig.appendChild(heroLv);
        fig.appendChild(power);
        const colR = document.createElement('div');
        colR.className = 'eqGrid';
        colR.appendChild(mkSlot('head'));
        colR.appendChild(mkSlot('body'));
        colR.appendChild(mkSlot('wrist'));
        colR.appendChild(mkSlot('legs'));
        colR.appendChild(mkSlot('gloves'));
        colR.appendChild(mkSlot('shoes'));
        // 功能入口拆双列分立绘两侧：左列 核心/强化/技能，右列 升星/天赋（未获得英雄时养成入口置灰，天赋全局可用）
        const fcol = document.createElement('div');
        fcol.className = 'fcol';
        const fcolR = document.createElement('div');
        fcolR.className = 'fcol';
        const coreBtn = document.createElement('button');
        coreBtn.className = 'btn blue';
        coreBtn.innerHTML = '🧬<span>核心</span>';
        coreBtn.title = '英雄核心';
        coreBtn.disabled = !owned;
        coreBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openHeroGrowModal(def.id, 1);
        };
        const wpnBtn = document.createElement('button');
        wpnBtn.className = 'btn blue';
        wpnBtn.innerHTML = '🔧<span>强化</span>';
        wpnBtn.title = '武器强化';
        wpnBtn.disabled = !owned;
        wpnBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openHeroGrowModal(def.id, 3);
        };
        const skBtn = document.createElement('button');
        skBtn.className = 'btn blue skillEntry';
        skBtn.innerHTML = '⚡<span>技能</span>';
        skBtn.title = '技能养成（普攻/技能/大招升级）';
        skBtn.disabled = !owned;
        skBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openHeroGrowModal(def.id, 0);
        };
        // 升星入口（参考主流卡牌「1阶」角标）：碎片进度与升星操作收进弹窗
        const starBtn = document.createElement('button');
        starBtn.className = 'btn blue starEntry';
        starBtn.innerHTML = `⭐<span>${owned ? rs.stars(def.id) + '阶' : '升星'}</span>`;
        starBtn.title = '升星（碎片进度与升星操作）';
        starBtn.disabled = !owned;
        starBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openStarModal(def.id);
        };
        const talBtn = document.createElement('button');
        talBtn.className = 'btn blue talentEntry2';
        talBtn.innerHTML = '🌟<span>天赋<span class="questRed"></span></span>';
        talBtn.title = '天赋树（可用点数分配）';
        talBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openHeroGrowModal(def.id, 2);
        };
        fcol.appendChild(coreBtn);
        fcol.appendChild(wpnBtn);
        fcol.appendChild(skBtn);
        fcolR.appendChild(starBtn);
        fcolR.appendChild(talBtn);
        this._talentRedEl = talBtn.querySelector('.questRed') as HTMLElement;
        this._refreshTalentRed();
        main.appendChild(fcol);
        main.appendChild(fig);
        main.appendChild(fcolR);
        main.appendChild(colR);
        body.appendChild(main);

        // 三维面板已移除：攻击/战力/装备加成明细走战力右侧 ⓘ 详情弹窗
        if (!owned) {
            const unlock = document.createElement('button');
            unlock.className = 'btn gold big';
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

        // 底部内嵌物品栏：四页签（装备/宝石/材料/道具），点击物品弹详情
        const bar = document.createElement('div');
        bar.className = 'bagBar';
        const tabs = document.createElement('div');
        tabs.className = 'bagTabs';
        const mkTab = (key: 'equip' | 'gem' | 'mat' | 'item', label: string) => {
            const b = document.createElement('button');
            if (this._heroBagTab === key) {
                b.className = 'on';
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
        // 装备页签右上角挂「工坊」入口（合成/分解）
        if (this._heroBagTab === 'equip') {
            const forgeBtn = document.createElement('button');
            forgeBtn.className = 'btn dark sm forgeBtn';
            forgeBtn.textContent = '⚒️ 工坊';
            forgeBtn.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._openForgeModal();
            };
            tabs.appendChild(forgeBtn);
        }
        const grid = document.createElement('div');
        grid.className = 'bagGrid';
        if (this._heroBagTab === 'equip') {
            const items = gm.bag;
            if (items.length === 0) {
                const tip = document.createElement('p');
                tip.className = 'mSub';
                tip.textContent = '装备背包空空如也 · 去商店购买装备部件';
                grid.appendChild(tip);
            }
            for (const it of items) {
                const cell = document.createElement('div');
                cell.className = `bcell r${tierRank(it.tier)}`;
                cell.innerHTML = `${SLOT_EMOJI[it.slot]}<em>+${it.lv}</em>`
                    + (this._affixBadge(it.affixes) ? `<span class="bcellAffix">${this._affixBadge(it.affixes)}</span>` : '');
                cell.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.play('ui');
                    this._openBagItemTip(def.id, { slot: it.slot, tier: it.tier, lv: it.lv, affixes: it.affixes });
                };
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
        bar.appendChild(grid);
        body.appendChild(bar);
        this._applyPendingTex();
    }


    // ================= 背包工坊（合成/分解） =================

    /**
     * 工坊（UX 布局稿 4-C · L3·L）：合成/分解双页签，行内动作 + 底部一键分解；
     * 合成与分解均为危险/不可逆操作，统一走 S 型确认模板（3-A / 3-B）后再执行。
     */
    protected _openForgeModal(tab = 0): void {
        const hs = HeroSystem.instance;
        const gm = GameManager.instance;
        const opt = (): PopOpts => {
            const bag = gm.bag;
            const lowCount = bag.filter(x => x.tier <= 2).length;
            const groups: Array<{ slot: EquipSlot; tier: EquipTier; n: number; cost: number }> = [];
            for (const slot of EQUIP_SLOTS) {
                for (let tier = 1; tier <= 5; tier++) {
                    const n = combineGroupCount(slot, tier as EquipTier);
                    if (n > 0) {
                        groups.push({ slot, tier: tier as EquipTier, n, cost: hs.combineCost((tier + 1) as EquipTier) });
                    }
                }
            }
            return {
                tier: 3,
                size: 'L',
                banner: '⚒️ 装备工坊',
                art: tab === 0 ? `${groups.length} 组可合成` : `${bag.length} 件在包`,
                tabs: ['合成', '分解'],
                tab,
                onTab: i => this._openForgeModal(i),
                build: c => {
                    if (tab === 0) {
                        if (!groups.length) {
                            c.appendChild(this._popEmpty('暂无可合成组合', '凑齐 3 件同部位同品质装备即可合成', '🔮'));
                            return;
                        }
                        for (const g of groups) {
                            const enough = gm.gold >= g.cost;
                            const nameA = `${EQUIP_TIER_NAMES[g.tier - 1]}${EQUIP_SLOT_NAMES[g.slot]}`;
                            const nameB = `${EQUIP_TIER_NAMES[g.tier]}${EQUIP_SLOT_NAMES[g.slot]}`;
                            c.appendChild(this._popRow({
                                icon: SLOT_EMOJI[g.slot],
                                title: `${nameA} ×3`,
                                tag: `可合 ${g.n} 组`,
                                lines: [`→ ${nameB} ×1`, `🪙 ${g.cost} / 组`],
                                status: enough ? undefined : '金币不足',
                                statusKind: enough ? undefined : 'expire',
                                action: {
                                    label: '合 成',
                                    disabled: !enough,
                                    onClick: () => this._popConfirm({
                                        title: '合成装备',
                                        icon: '🔮',
                                        desc: `${nameA} ×3 合成 ${nameB} ×1（保留最高强化级）`,
                                        preview: this._popGrid([
                                            { icon: SLOT_EMOJI[g.slot], count: 3, title: '消耗 3 件' },
                                            { icon: '✨', title: '合成' },
                                            { icon: SLOT_EMOJI[g.slot], count: 1, title: '产出 1 件' }
                                        ], 3),
                                        cost: [{ icon: '🪙', have: gm.gold, need: g.cost }],
                                        ok: '确认合成',
                                        onOk: () => {
                                            if (hs.combine(null, g.slot, g.tier)) {
                                                SoundFx.play('buy');
                                                this._toast(`合成成功：${nameB}`);
                                                this._refreshTop();
                                            }
                                            this._openForgeModal(0);
                                        },
                                        onCancel: () => this._openForgeModal(0)
                                    })
                                }
                            }));
                        }
                        return;
                    }
                    if (!bag.length) {
                        c.appendChild(this._popEmpty('背包中没有可分解的装备', '关卡掉落与商店购买会进入背包', '♻️'));
                        return;
                    }
                    for (const it of bag) {
                        const alloy = salvageAlloyYield(it.tier);
                        const stone = salvageStoneYield(it.tier);
                        c.appendChild(this._popRow({
                            icon: SLOT_EMOJI[it.slot],
                            title: `${bagItemName(it)} +${it.lv}`,
                            tag: EQUIP_TIER_NAMES[it.tier - 1],
                            lines: [`→ 🧱 ${stone}${alloy > 0 ? ` · 🔩 ${alloy}` : ''}`],
                            action: {
                                label: '分解',
                                kind: 'grey',
                                onClick: () => this._popConfirm({
                                    title: '分解装备',
                                    icon: '♻️',
                                    desc: `${bagItemName(it)} +${it.lv} 分解为 🧱 ${stone}${alloy > 0 ? ` · 🔩 ${alloy}` : ''}`,
                                    danger: true,
                                    ok: '确认分解',
                                    onOk: () => {
                                        const idx = gm.bag.indexOf(it);
                                        if (idx >= 0 && hs.salvage(idx)) {
                                            SoundFx.play('ui');
                                            this._toast('分解完成，材料入包');
                                            this._refreshTop();
                                        }
                                        this._openForgeModal(1);
                                    },
                                    onCancel: () => this._openForgeModal(1)
                                })
                            }
                        }));
                    }
                },
                ctas: tab === 1 && lowCount > 0 ? [{
                    label: `一键分解白绿（${lowCount} 件）`,
                    kind: 'danger',
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
                            this._openForgeModal(1);
                        },
                        onCancel: () => this._openForgeModal(1)
                    })
                }] : undefined,
                note: '强化石用于武器强化 · 精炼合金用于装备强化（材料消耗口已打通）'
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


    /** 属性详情弹窗（战力右侧 ⓘ 入口）：攻击/战力/装备加成明细 */
    protected _openPowerDetailModal(heroId: string): void {
        const hs = HeroSystem.instance;
        const def = HERO_DEFS.find(d => d.id === heroId);
        if (!def) {
            return;
        }
        this._openModal(`📊 属性详情 · ${def.name}`, (box) => {
            box.classList.add('pwBox');
            const mkRow = (lab: string, val: string, note: string) => {
                const row = document.createElement('div');
                row.className = 'mRow pwRow';
                row.innerHTML = `<span>${lab}</span><b>${val}</b><i>${note}</i>`;
                box.appendChild(row);
            };
            mkRow('⚔️ 攻击', String(Math.round(def.atk * hs.atkMulOf(def.id))), '基础攻击 × 全部加成');
            mkRow('⚡ 战力', this._heroPower(def.id).toLocaleString(), '综合养成评价');
            mkRow('🛡️ 装备加成', `+${Math.round((hs.equipMulOf(def.id).atk - 1) * 100)}%`, '装备+宝石+核心（不含星级）');
            const note = document.createElement('p');
            note.className = 'mSub';
            note.textContent = '星级加成单独体现在升星面板；生命/防御为局内口径，不在此展示';
            box.appendChild(note);
        });
    }


    /** 升星弹窗（英雄页左功能列「N阶」入口）：当前星级 + 碎片进度 + 升星操作，成功后原位重建 */
    protected _openStarModal(heroId: string): void {
        const rs = RecruitSystem.instance;
        const def = HERO_DEFS.find(d => d.id === heroId);
        if (!def) {
            return;
        }
        this._openModal(`⭐ 升星 · ${def.name}`, (box) => {
            box.classList.add('starBox');
            const wrap = document.createElement('div');
            const rebuild = () => {
                wrap.innerHTML = '';
                const st = rs.stars(def.id);
                const cost = rs.starCost(def.id);
                const have = rs.shards(def.id);
                const line = document.createElement('div');
                line.className = 'sbLine';
                line.innerHTML = `<b class="sbStars">${'★'.repeat(st)}${'☆'.repeat(HERO_STAR_MAX - st)}</b>`
                    + `<span class="sbLv">${st} / ${HERO_STAR_MAX} 阶</span>`;
                wrap.appendChild(line);
                const prog = document.createElement('div');
                prog.className = 'sbProg';
                if (st >= HERO_STAR_MAX) {
                    prog.innerHTML = '<span class="sbDone">★ 已 满 星 ★ 该英雄已无升星空间</span>';
                } else {
                    prog.innerHTML = `<span class="sbNum">碎片 <b>${have}</b> / ${cost}</span>`
                        + `<span class="sbAdd">（招募重复获得可转碎片）</span>`;
                }
                wrap.appendChild(prog);
                const btn = document.createElement('button');
                btn.className = 'btn gold sm sbBtn';
                if (st >= HERO_STAR_MAX) {
                    btn.textContent = '已满星';
                    btn.disabled = true;
                } else if (rs.canStarUp(def.id)) {
                    btn.textContent = `⚡ 升 星（−${cost} 碎片）`;
                    btn.onclick = () => {
                        SoundFx.unlock();
                        const next = rs.starUp(def.id);
                        if (next !== null) {
                            SoundFx.play('buy');
                            this._toast(`${def.name} 升至 ★${next}`);
                            this._refreshTop();
                            this._refreshHeroes();
                            rebuild();
                        } else {
                            SoundFx.play('ui');
                        }
                    };
                } else {
                    btn.textContent = `还差 ${cost - have} 片`;
                    btn.disabled = true;
                }
                wrap.appendChild(btn);
            };
            rebuild();
            box.appendChild(wrap);
        });
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
     * 技能详情浮窗（技能卡点击触发）：
     * 升级效果对比 + 里程碑等级解锁 + 消耗物（金币+英雄核心）+ 升级按钮。
     */
    protected _openAbilityModal(heroId: string, slot: AbilitySlot): void {
        const gm = GameManager.instance;
        const hs = HeroSystem.instance;
        const def = HERO_DEFS.find(d => d.id === heroId);
        if (!def || !gm.isHeroOwned(heroId)) {
            return;
        }
        const titles: Record<AbilitySlot, string> = { basic: '🔫 基础射击', skill: '💫 技能', ultimate: '☄️ 大招' };
        this._openModal(titles[slot], (box) => {
            box.classList.add('abBox');
            const lv = hs.abilityLevel(heroId, slot);
            const maxed = hs.isAbilityMaxLevel(heroId, slot);
            const locked = lv <= 0;
            const cap = gm.abilityLevelCap();

            const nm = document.createElement('div');
            nm.className = 'abName';
            const an = slot === 'ultimate' ? def.ultimate.name : slot === 'skill' ? def.skill.name : '基础射击';
            nm.innerHTML = `<b>${an}</b><span class="lvtag">Lv.${lv}${maxed ? ' · MAX' : ''}</span>`;
            box.appendChild(nm);

            // 升级效果对比（当前 → 下一级）
            const effCur = document.createElement('div');
            effCur.className = 'abEff';
            effCur.innerHTML = `<em>当前（Lv.${Math.max(1, lv)}）</em><span>${this._abilityEffectText(def, slot, Math.max(1, lv))}</span>`;
            box.appendChild(effCur);
            if (!maxed) {
                const effNext = document.createElement('div');
                effNext.className = 'abEff next';
                effNext.innerHTML = `<em>升到 Lv.${lv + 1}</em><span>${this._abilityEffectText(def, slot, lv + 1)}</span>`;
                box.appendChild(effNext);
            }

            // 里程碑等级效果
            const msSec = document.createElement('div');
            msSec.className = 'abMs';
            msSec.innerHTML = '<div class="abMsHead">🏆 里程碑解锁</div>';
            for (const m of this._abilityMilestones(slot)) {
                const reach = lv >= m.lv;
                const row = document.createElement('div');
                row.className = 'abMsRow' + (reach ? ' reach' : '');
                row.innerHTML = `<span class="abMsLv">Lv.${m.lv}</span><span>${m.text}${reach ? ' · ✅' : ''}</span>`;
                msSec.appendChild(row);
            }
            box.appendChild(msSec);

            // 消耗 + 升级按钮
            const costRow = document.createElement('div');
            costRow.className = 'abCost';
            const btn = document.createElement('button');
            btn.className = 'btn gold';
            if (locked) {
                // 技能/大招不卖解锁：只能局内升级三选一随机刷出解锁卡
                costRow.innerHTML = '<span>未解锁 · 出战时升级三选一随机刷出「解锁卡」后获得</span>';
                btn.textContent = '局内解锁';
                btn.disabled = true;
            } else if (maxed) {
                costRow.innerHTML = '<span>技能已达当前上限（研究所可提升上限）</span>';
                btn.textContent = '已满级';
                btn.disabled = true;
            } else {
                const cost = hs.abilityUpgradeCost(heroId, slot);
                const core = hs.abilityUpgradeCore(heroId, slot);
                const coreLeft = hs.miscCount('mat_core');
                costRow.innerHTML = `<span>消耗：🪙 ${cost.toLocaleString()} · ⚙️ 英雄核心 ×${core}（余 ${coreLeft}）</span>`;
                btn.textContent = '升 级';
                btn.disabled = gm.gold < cost || coreLeft < core;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    if (hs.upgradeAbility(heroId, slot)) {
                        SoundFx.play('buy');
                        this._toast(`${an} 升至 Lv.${lv + 1}`);
                        this._refreshTop();
                        this._closeTopMask();
                        // 技能卡已并入英雄详情页，升级后同步英雄页内嵌技能卡再重开弹窗
                        this._refreshHeroes();
                        this._openAbilityModal(heroId, slot);
                    }
                };
            }
            costRow.appendChild(btn);
            box.appendChild(costRow);
        });
    }

}

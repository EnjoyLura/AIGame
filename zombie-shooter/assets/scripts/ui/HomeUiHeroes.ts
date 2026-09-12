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
import { HeroSystem, EquipSlot, EQUIP_SLOTS, EQUIP_SLOT_NAMES, EQUIP_TIER_NAMES, EQUIP_TIER_COLORS, WEAPON_CORE_DEFS, EQUIPMENT_DEFS, bagItemName, bagItemValue, AbilitySlot, BagItem, MiscItemDef, MISC_ITEM_DEFS, miscDef, lootRateText, tierRank, EquipTier, LootDrop, lootDropColor, GEM_EFFECTS, gemSlots, gemSocketCost, combineGroupCount, salvageStoneYield, salvageAlloyYield } from '../core/HeroSystem';
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
                        document.querySelector('#homeUi .protoMask')?.remove();
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
                document.querySelector('#homeUi .protoMask')?.remove();
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
                document.querySelector('#homeUi .protoMask')?.remove();
                this._openTalentModal(def.id);
            };
            btns.appendChild(reset);
            detail.appendChild(btns);
            box.appendChild(detail);
        });
    }


    /**
     * 英雄招募弹窗：保底进度 + 概率表 + 四英雄碎片库存 + 单抽/十连/看广告免费招募。
     * 结果不在此展示，交由 _openRecruitResultModal 做揭示动画。
     */
    protected _openRecruitModal(): void {
        const rs = RecruitSystem.instance;
        const gm = GameManager.instance;
        const diam = gm.res.get('diamond');
        this._openModal('🎖️ 英雄招募', (box) => {
            box.classList.add('recruitBox');
            // 头部：累计抽数 + 保底进度条
            const head = document.createElement('div');
            head.className = 'rcHead';
            head.innerHTML = `<div class="rcHeadTop"><b>已招募 <i>${rs.totalRecruits}</i> 次</b>`
                + `<span>💎 ${diam.toLocaleString()} · 距保底还差 ${rs.pityLeft} 抽</span></div>`;
            const barWrap = document.createElement('div');
            barWrap.className = 'rcBar';
            const barIn = document.createElement('i');
            barIn.style.width = `${Math.round((RECRUIT_PITY - rs.pityLeft) / RECRUIT_PITY * 100)}%`;
            barWrap.appendChild(barIn);
            head.appendChild(barWrap);
            box.appendChild(head);

            // 概率表
            const rate = document.createElement('div');
            rate.className = 'rcRate panel';
            rate.innerHTML =
                `<div class="rcRateRow hero"><span>🎖️ 英雄本体（未获得优先）</span><b>6%</b></div>` +
                `<div class="rcRateRow r5"><span>⭐ 传说碎片 ×10</span><b>14%</b></div>` +
                `<div class="rcRateRow r3"><span>🔷 稀有碎片 ×5</span><b>40%</b></div>` +
                `<div class="rcRateRow r2"><span>🔹 普通碎片 ×2</span><b>40%</b></div>` +
                `<div class="rcRateNote">🛡️ 十连必出稀有以上 · ${RECRUIT_PITY} 抽内必出英雄本体</div>`;
            box.appendChild(rate);

            // 四英雄碎片库存
            const shardBox = document.createElement('div');
            shardBox.className = 'rcShards';
            const shardHead = document.createElement('div');
            shardHead.className = 'rcShardsHead';
            shardHead.textContent = '碎 片 库 存';
            shardBox.appendChild(shardHead);
            const shardGrid = document.createElement('div');
            shardGrid.className = 'rcShardGrid';
            HERO_DEFS.forEach((d, i) => {
                const cell = document.createElement('div');
                cell.className = 'rcShard';
                const pic = document.createElement('span');
                pic.className = 'rcShardPic';
                const photo = this._heroPhoto(i, 'slot');
                this._tex(photo.key, u => {
                    pic.style.backgroundImage = u;
                    pic.style.backgroundRepeat = 'no-repeat';
                    pic.style.cssText += photo.css;
                });
                const info = document.createElement('span');
                info.className = 'rcShardInfo';
                const own = gm.isHeroOwned(d.id);
                info.innerHTML = `<b>${d.name}</b><i>${rs.stars(d.id)}★ · 🔩${rs.shards(d.id)}</i>`;
                if (!own) {
                    cell.classList.add('lock');
                }
                cell.appendChild(pic);
                cell.appendChild(info);
                shardGrid.appendChild(cell);
            });
            shardBox.appendChild(shardGrid);
            box.appendChild(shardBox);

            // 抽卡按钮组
            const btns = document.createElement('div');
            btns.className = 'rcBtns';
            const mkPull = (label: string, cost: number, count: 1 | 10) => {
                const b = document.createElement('button');
                b.className = 'btn big rcBtn' + (count === 10 ? ' gold' : '');
                b.textContent = `${label}（💎 ${cost.toLocaleString()}）`;
                b.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    // 钻石不足：按钮不再置灰，改为点击时明确提示还差多少
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
                    document.querySelector('#homeUi .protoMask')?.remove();
                    this._openRecruitResultModal(got);
                };
                btns.appendChild(b);
            };
            mkPull('单 抽', RECRUIT_PRICE_1, 1);
            mkPull('十 连', RECRUIT_PRICE_10, 10);
            box.appendChild(btns);

            // 看广告免费招募（每日 1 次）
            const left = AdService.instance.remaining('recruit');
            const ad = document.createElement('button');
            ad.className = 'btn big rcAdBtn';
            ad.textContent = left > 0 ? `▶ 看广告免费招募（今日 ${left}/1）` : '▶ 今日免费招募已用完';
            ad.disabled = left <= 0;
            ad.onclick = (e) => {
                e.stopPropagation();
                SoundFx.unlock();
                AdService.instance.claimReward('recruit', () => {
                    const got = rs.recruit(1, true);
                    if (!got) {
                        return;
                    }
                    SoundFx.play(got.some(x => x.kind === 'hero') ? 'bigkill' : 'coin');
                    this._refreshTop();
                    document.querySelector('#homeUi .protoMask')?.remove();
                    this._openRecruitResultModal(got);
                });
            };
            box.appendChild(ad);
            const note = document.createElement('p');
            note.className = 'giftNote';
            note.textContent = '抽到已拥有的英雄会转化为该英雄碎片，碎片用于升星';
            box.appendChild(note);
            this._applyPendingTex();
        });
    }


    /** 招募结果浮窗：卡片错峰揭示（复用 giftDropIn 动画），十连带汇总行 */
    protected _openRecruitResultModal(results: RecruitResult[]): void {
        const hasHero = results.some(r => r.kind === 'hero');
        const shardTotal = results.reduce((n, r) => n + (r.shardN ?? 0), 0);
        const heroCount = results.filter(r => r.kind === 'hero').length;
        this._openModal(hasHero ? '🎖️ 招 募 大 成 功' : '🎖️ 招 募 结 果', (box) => {
            box.classList.add('recruitResBox');
            const grid = document.createElement('div');
            grid.className = 'recruitResGrid' + (results.length > 1 ? ' many' : '');
            results.forEach((r, i) => {
                const idx = HERO_DEFS.findIndex(d => d.id === r.heroId);
                const cell = document.createElement('div');
                cell.className = `rcCard r${r.tierRank}` + (r.kind === 'hero' ? ' hero' : '');
                cell.style.animationDelay = `${(0.1 + i * 0.15).toFixed(2)}s`;
                // 英雄本体用立绘，碎片用 emoji
                if (r.kind === 'hero' && idx >= 0) {
                    const pic = document.createElement('span');
                    pic.className = 'rcCardPic';
                    const photo = this._heroPhoto(idx, 'figure');
                    this._tex(photo.key, u => {
                        pic.style.backgroundImage = u;
                        pic.style.backgroundRepeat = 'no-repeat';
                        pic.style.cssText += photo.css;
                    });
                    cell.appendChild(pic);
                } else if (idx >= 0) {
                    const pic = document.createElement('span');
                    pic.className = 'rcCardPic';
                    const photo = this._heroPhoto(idx, 'slot');
                    this._tex(photo.key, u => {
                        pic.style.backgroundImage = u;
                        pic.style.backgroundRepeat = 'no-repeat';
                        pic.style.cssText += photo.css;
                    });
                    cell.appendChild(pic);
                } else {
                    const ic = document.createElement('span');
                    ic.className = 'rcCardIc';
                    ic.textContent = r.ic;
                    cell.appendChild(ic);
                }
                if (r.kind === 'hero') {
                    const flag = document.createElement('span');
                    flag.className = 'rcNew';
                    flag.textContent = 'NEW!';
                    cell.appendChild(flag);
                } else if (r.duplicate) {
                    const flag = document.createElement('span');
                    flag.className = 'rcDup';
                    flag.textContent = '转化为碎片';
                    cell.appendChild(flag);
                }
                const nm = document.createElement('span');
                nm.className = 'rcCardNm';
                nm.textContent = r.kind === 'hero' ? r.name : `${r.name}`;
                cell.appendChild(nm);
                grid.appendChild(cell);
                this.scheduleOnce(() => {
                    SoundFx.play(r.kind === 'hero' ? 'bigkill' : r.tier === 'legend' ? 'buy' : 'ui');
                }, 0.15 + i * 0.15);
            });
            box.appendChild(grid);
            if (results.length > 1) {
                const sum = document.createElement('div');
                sum.className = 'rcSum';
                sum.textContent = `本次获得：英雄 ×${heroCount} · 碎片 ×${shardTotal}`;
                box.appendChild(sum);
            }
            // 再来一次（钻石够时显示）+ 关闭
            const again = document.createElement('button');
            again.className = 'btn gold big rcAgain';
            again.textContent = results.length > 1
                ? `再 来 一 次（💎 ${RECRUIT_PRICE_10.toLocaleString()}）`
                : `再 来 一 次（💎 ${RECRUIT_PRICE_1.toLocaleString()}）`;
            const cost = results.length > 1 ? RECRUIT_PRICE_10 : RECRUIT_PRICE_1;
            again.onclick = (e) => {
                e.stopPropagation();
                SoundFx.unlock();
                const diamNow = GameManager.instance.res.get('diamond');
                if (diamNow < cost) {
                    SoundFx.play('ui');
                    this._toast(`钻石不足：还差 💎${(cost - diamNow).toLocaleString()}`);
                    return;
                }
                const got = RecruitSystem.instance.recruit(results.length > 1 ? 10 : 1);
                if (!got) {
                    SoundFx.play('ui');
                    this._toast('钻石不足');
                    return;
                }
                SoundFx.play(got.some(x => x.kind === 'hero') ? 'bigkill' : 'coin');
                this._refreshTop();
                document.querySelector('#homeUi .protoMask')?.remove();
                this._openRecruitResultModal(got);
            };
            box.appendChild(again);
            const ok = document.createElement('button');
            ok.className = 'btn big rcClose';
            ok.textContent = '关 闭';
            ok.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                document.querySelector('#homeUi .protoMask')?.remove();
                this._refreshHeroes();
            };
            box.appendChild(ok);
            this._applyPendingTex();
        });
    }


    // ================= 英雄页 =================

    /** 英雄页：英雄横滑选择条 + 详情（由 _refreshHeroes 整块重建） */
    protected _buildHeroesPage(root: HTMLDivElement): void {
        const page = document.createElement('div');
        page.className = 'screen';
        this._pages.heroes = page;
        page.appendChild(this._mkHeading('英雄档案', '护卫队 / 04'));
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
        // 横滑选择条 + 招募入口 + 天赋入口
        pick.innerHTML = '';
        const recruitBtn = document.createElement('button');
        recruitBtn.className = 'hpick recruitEntry';
        recruitBtn.innerHTML = '<span class="pic rcIc">🎖️</span><i>招募</i>';
        recruitBtn.title = '英雄招募（抽卡）';
        recruitBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openRecruitModal();
        };
        pick.appendChild(recruitBtn);
        const talentBtn = document.createElement('button');
        talentBtn.className = 'hpick talentEntry2';
        talentBtn.innerHTML = '<span class="pic rcIc">🌟</span><i>天赋<span class="questRed"></span></i>';
        talentBtn.title = '天赋树（可用点数分配）';
        talentBtn.onclick = (e) => {
            e.stopPropagation();
            SoundFx.play('ui');
            this._openTalentModal();
        };
        pick.appendChild(talentBtn);
        this._talentRedEl = talentBtn.querySelector('.questRed') as HTMLElement;
        this._refreshTalentRed();
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
        const power = document.createElement('div');
        power.className = 'powerBadge';
        power.innerHTML = `⚡ <span>${owned ? this._heroPower(def.id).toLocaleString() : '---'}</span>`;
        head.appendChild(hLeft);
        head.appendChild(power);
        body.appendChild(head);

        // 中部：左槽列（头/身/臂）+ 立绘 + 右槽列（手/腿/脚）
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
        const colL = document.createElement('div');
        colL.className = 'slotCol';
        colL.appendChild(mkSlot('head'));
        colL.appendChild(mkSlot('body'));
        colL.appendChild(mkSlot('gloves'));
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
        const heroLv = document.createElement('div');
        heroLv.className = 'heroLv';
        heroLv.textContent = owned ? def.role : '未获得';
        fig.appendChild(halo);
        fig.appendChild(halo2);
        fig.appendChild(emoji);
        fig.appendChild(heroLv);
        const colR = document.createElement('div');
        colR.className = 'slotCol';
        colR.appendChild(mkSlot('wrist'));
        colR.appendChild(mkSlot('legs'));
        colR.appendChild(mkSlot('shoes'));
        // 右缘纵向按钮列：英雄核心 / 武器强化（英雄立绘与左槽列之间，用户指定落点）
        const side = document.createElement('div');
        side.className = 'sideActions';
        if (owned) {
            const coreBtn = document.createElement('button');
            coreBtn.className = 'btn blue';
            coreBtn.textContent = '🧬 核心';
            coreBtn.title = '英雄核心';
            coreBtn.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._openCoreModal(def.id);
            };
            const wpnBtn = document.createElement('button');
            wpnBtn.className = 'btn blue';
            wpnBtn.textContent = '🔧 强化';
            wpnBtn.title = '武器强化';
            wpnBtn.onclick = (e) => {
                e.stopPropagation();
                SoundFx.play('ui');
                this._openWeaponModal(def.id);
            };
            side.appendChild(coreBtn);
            side.appendChild(wpnBtn);
        }
        main.appendChild(colL);
        main.appendChild(side);
        main.appendChild(fig);
        main.appendChild(colR);
        body.appendChild(main);

        // 三维面板（攻击/战力口径真实；生命/防御占位推算）
        const stats = document.createElement('div');
        stats.className = 'statRow';
        const mkStat = (lab: string, val: string) => {
            const s = document.createElement('div');
            s.className = 'stat panel';
            s.innerHTML = `${lab}<b>${val}</b>`;
            stats.appendChild(s);
        };
        if (owned) {
            mkStat('⚔️ 攻击', String(Math.round(def.atk * hs.atkMulOf(def.id))));
            mkStat('⚡ 战力', this._heroPower(def.id).toLocaleString());
            // 加成口径 = 装备+宝石+核心（不含星级，星级单独在升星条展示）
            mkStat('🛡️ 装备加成', `+${Math.round((hs.equipMulOf(def.id).atk - 1) * 100)}%`);
        } else {
            mkStat('⚔️ 攻击', '---');
            mkStat('⚡ 战力', '---');
            mkStat('🛡️ 装备加成', '---');
        }
        body.appendChild(stats);

        // 升星条（仅已拥有英雄）：星级 + 碎片进度 + 升星按钮
        if (owned) {
            const st = rs.stars(def.id);
            const cost = rs.starCost(def.id);
            const have = rs.shards(def.id);
            const bar = document.createElement('div');
            bar.className = 'starBar panel' + (st >= HERO_STAR_MAX ? ' max' : '');
            const line = document.createElement('div');
            line.className = 'sbLine';
            line.innerHTML = `<b class="sbStars">${'★'.repeat(st)}${'☆'.repeat(HERO_STAR_MAX - st)}</b>`
                + `<span class="sbLv">${st} / ${HERO_STAR_MAX} 星</span>`;
            bar.appendChild(line);
            const prog = document.createElement('div');
            prog.className = 'sbProg';
            if (st >= HERO_STAR_MAX) {
                prog.innerHTML = '<span class="sbDone">★ 已 满 星 ★ 该英雄已无升星空间</span>';
            } else {
                prog.innerHTML = `<span class="sbNum">碎片 <b>${have}</b> / ${cost}</span>`
                    + `<span class="sbAdd">（招募重复获得可转碎片）</span>`;
            }
            bar.appendChild(prog);
            const btn = document.createElement('button');
            btn.className = 'btn gold sm sbBtn';
            if (st >= HERO_STAR_MAX) {
                btn.textContent = '已满星';
                btn.disabled = true;
            } else if (rs.canStarUp(def.id)) {
                btn.textContent = `⚡ 升 星（−${cost} 碎片）`;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    SoundFx.unlock();
                    const next = rs.starUp(def.id);
                    if (next !== null) {
                        SoundFx.play('buy');
                        this._toast(`${def.name} 升至 ★${next}`);
                        this._refreshTop();
                        this._refreshHeroes();
                    } else {
                        SoundFx.play('ui');
                    }
                };
            } else {
                btn.textContent = `还差 ${cost - have} 片`;
                btn.disabled = true;
            }
            bar.appendChild(btn);
            body.appendChild(bar);
        }

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

        // 技能养成区块（原独立技能页并入英雄详情：选人即看技能，省一次切页）
        if (owned) {
            const skillHead = document.createElement('div');
            skillHead.className = 'secTitle';
            skillHead.textContent = '⚡ 技能养成 · 点击卡片查看升级详情';
            body.appendChild(skillHead);
            body.appendChild(this._renderSkillCards(def));
        }

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

    /** 工坊弹窗：合成区（同槽同品质 3→1）+ 分解区（单件产出材料 + 一键分解白绿） */
    protected _openForgeModal(): void {
        const hs = HeroSystem.instance;
        const gm = GameManager.instance;
        this._openModal('⚒️ 装备工坊', (box) => {
            box.classList.add('forgeBox');
            const rebuild = () => {
                box.querySelectorAll('.fSec,.fNote').forEach(el => el.remove());
                // ---- 合成区 ----
                const secC = document.createElement('div');
                secC.className = 'fSec';
                secC.innerHTML = `<div class="fHead"><b>🔮 合成</b><span>同部位同品质 ×3 → 高一品质（保留最高强化级）</span></div>`;
                let hasGroup = false;
                for (const slot of EQUIP_SLOTS) {
                    for (let tier = 1; tier <= 5; tier++) {
                        const groups = combineGroupCount(slot, tier as EquipTier);
                        if (groups <= 0) {
                            continue;
                        }
                        hasGroup = true;
                        const row = document.createElement('div');
                        row.className = 'fRow';
                        const cost = hs.combineCost((tier + 1) as EquipTier);
                        const info = document.createElement('div');
                        info.className = 'fInfo';
                        info.innerHTML =
                            `<b style="color:${EQUIP_TIER_COLORS[tier - 1]}">${SLOT_EMOJI[slot]} ${EQUIP_TIER_NAMES[tier - 1]}${EQUIP_SLOT_NAMES[slot]} ×3</b>` +
                            `<span>→ <i style="color:${EQUIP_TIER_COLORS[tier]}">${EQUIP_TIER_NAMES[tier]}${EQUIP_SLOT_NAMES[slot]} ×1</i> · 🪙 ${cost}/组</span>`;
                        row.appendChild(info);
                        const btn = document.createElement('button');
                        btn.className = 'btn gold sm';
                        btn.textContent = `合成 ×${groups}`;
                        btn.disabled = gm.gold < cost;
                        btn.onclick = () => {
                            if (hs.combine(null, slot, tier as EquipTier)) {
                                SoundFx.play('buy');
                                this._toast(`合成成功：${EQUIP_TIER_NAMES[tier]}${EQUIP_SLOT_NAMES[slot]}`);
                                this._refreshTop();
                                rebuild();
                            } else {
                                SoundFx.play('ui');
                            }
                        };
                        row.appendChild(btn);
                        secC.appendChild(row);
                    }
                }
                if (!hasGroup) {
                    const empty = document.createElement('p');
                    empty.className = 'mSub';
                    empty.textContent = '凑齐 3 件同部位同品质装备即可合成';
                    secC.appendChild(empty);
                }
                box.appendChild(secC);
                // ---- 分解区 ----
                const secS = document.createElement('div');
                secS.className = 'fSec';
                secS.innerHTML = `<div class="fHead"><b>♻️ 分解</b><span>装备→强化石（紫+额外返还精炼合金）</span></div>`;
                const bag = gm.bag;
                if (bag.length === 0) {
                    const empty = document.createElement('p');
                    empty.className = 'mSub';
                    empty.textContent = '背包中没有可分解的装备';
                    secS.appendChild(empty);
                }
                bag.forEach((it, index) => {
                    const row = document.createElement('div');
                    row.className = 'fRow';
                    const info = document.createElement('div');
                    info.className = 'fInfo';
                    const alloy = salvageAlloyYield(it.tier);
                    info.innerHTML =
                        `<b style="color:${EQUIP_TIER_COLORS[it.tier - 1]}">${SLOT_EMOJI[it.slot]} ${bagItemName(it)} +${it.lv}</b>` +
                        `<span>→ 🧱 ${salvageStoneYield(it.tier)}${alloy > 0 ? ` · 🔩 ${alloy}` : ''}</span>`;
                    row.appendChild(info);
                    const btn = document.createElement('button');
                    btn.className = 'btn dark sm';
                    btn.textContent = '分解';
                    btn.onclick = () => {
                        if (hs.salvage(index)) {
                            SoundFx.play('ui');
                            this._toast('分解完成，材料入包');
                            this._refreshTop();
                            rebuild();
                        }
                    };
                    row.appendChild(btn);
                    secS.appendChild(row);
                });
                // 一键分解白绿（保留蓝+）
                const lowCount = bag.filter(it => it.tier <= 2).length;
                if (lowCount > 0) {
                    const quick = document.createElement('button');
                    quick.className = 'btn dark big fQuick';
                    quick.textContent = `一键分解白绿装备（${lowCount} 件）`;
                    quick.onclick = () => {
                        // 索引降序分解防串位
                        for (let i = bag.length - 1; i >= 0; i--) {
                            if (bag[i].tier <= 2) {
                                hs.salvage(i);
                            }
                        }
                        SoundFx.play('coin');
                        this._toast(`已分解 ${lowCount} 件，强化石/合金入包`);
                        this._refreshTop();
                        rebuild();
                    };
                    secS.appendChild(quick);
                }
                box.appendChild(secS);
                const note = document.createElement('p');
                note.className = 'fNote giftNote';
                note.textContent = '强化石用于武器强化 · 精炼合金用于装备强化（材料消耗口已打通）';
                box.appendChild(note);
            };
            rebuild();
        });
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


    /** 内嵌物品栏物品详情弹窗：装备可穿戴（走穿戴面板），道具可用则显示使用按钮 */
    protected _openBagItemTip(heroId: string, src: BagItem | MiscItemDef): void {
        const hs = HeroSystem.instance;
        const isEquip = (src as BagItem).slot !== undefined;
        const title = isEquip
            ? `${bagItemName(src as BagItem)} · +${(src as BagItem).lv}`
            : `${(src as MiscItemDef).ic} ${(src as MiscItemDef).name}`;
        this._openModal(title, (box, close) => {
            const info = document.createElement('p');
            info.className = 'mSub';
            if (isEquip) {
                const it = src as BagItem;
                const parts: string[] = [];
                for (const key of ['atkPct', 'ratePct', 'rangePct'] as const) {
                    const v = Math.round(bagItemValue(it, key) * 100);
                    if (v > 0) {
                        parts.push((key === 'atkPct' ? '攻击+' : key === 'ratePct' ? '射速+' : '射程+') + v + '%');
                    }
                }
                info.innerHTML = `<b style="color:${EQUIP_TIER_COLORS[it.tier - 1]}">${EQUIP_TIER_NAMES[it.tier - 1]}${EQUIP_SLOT_NAMES[it.slot]}</b>` +
                    ` · 强化 +${it.lv}<br>${parts.join(' ') || '无属性'}`;
                box.appendChild(info);
                const affixBox = this._affixBlock(it.affixes, it.tier);
                if (affixBox) {
                    box.appendChild(affixBox);
                }
            } else {
                const md = src as MiscItemDef;
                const n = hs.miscCount(md.id);
                info.innerHTML = `<b style="color:${EQUIP_TIER_COLORS[md.tier - 1]}">${md.name}</b> · 持有 ×${n}<br>${md.desc}`;
            }
            box.appendChild(info);
            if (isEquip) {
                const btn = document.createElement('button');
                btn.className = 'btn gold big';
                btn.textContent = '装 备';
                btn.onclick = () => {
                    close();
                    document.querySelector('#homeUi .protoMask')?.remove();
                    this._openEquipSlotPanel(heroId, (src as BagItem).slot);
                };
                box.appendChild(btn);
            } else if (miscDef((src as MiscItemDef).id)?.use) {
                const btn = document.createElement('button');
                btn.className = 'btn gold big';
                btn.textContent = '使 用';
                btn.onclick = () => {
                    if (hs.useMisc((src as MiscItemDef).id)) {
                        SoundFx.play('buy');
                        this._toast('使用成功');
                        close();
                        this._refreshHeroes();
                    }
                };
                box.appendChild(btn);
            }
            const closeBar = document.createElement('button');
            closeBar.className = 'btn dark sm';
            closeBar.textContent = '关 闭';
            closeBar.onclick = (e) => {
                e.stopPropagation();
                close();
            };
            box.appendChild(closeBar);
        });
    }


    /** 宝石镶嵌选择面板：列出库存中的宝石（含效果与镶嵌费），点击镶嵌到空孔 */
    protected _openGemPickPanel(heroId: string, slot: EquipSlot): void {
        const hs = HeroSystem.instance;
        const gm = GameManager.instance;
        this._openModal('💎 选择宝石镶嵌', (box, close) => {
            const state = hs.equipped(heroId, slot);
            const def = state ? hs.equipDef(state.id) : null;
            const tier = def?.tier ?? (state && state.id.startsWith('bag:') ? Number(state.id.split(':')[2]) as EquipTier : 1);
            const cost = gemSocketCost(tier);
            const tip = document.createElement('p');
            tip.className = 'mSub';
            tip.textContent = `镶嵌费用：🪙 ${cost}（拆卸免费返还）`;
            box.appendChild(tip);
            const ownedGems = GEM_EFFECTS.filter(g => HeroSystem.instance.miscCount(g.miscId) > 0);
            if (ownedGems.length === 0) {
                const empty = document.createElement('p');
                empty.className = 'mSub';
                empty.textContent = '背包中没有宝石 · 通关掉落/商店获取';
                box.appendChild(empty);
            }
            for (const g of ownedGems) {
                const gd = miscDef(g.miscId)!;
                const effTxt = (g.key === 'atkPct' ? '攻击' : g.key === 'ratePct' ? '射速' : g.key === 'rangePct' ? '射程' : '暴击')
                    + `+${Math.round(g.value * 100)}%`;
                const row = document.createElement('div');
                row.className = 'equipRow';
                row.innerHTML =
                    `<div class="equipInfo"><div class="equipName" style="color:${EQUIP_TIER_COLORS[gd.tier - 1]}">${gd.ic} ${gd.name} ×${HeroSystem.instance.miscCount(g.miscId)}</div>` +
                    `<div class="equipStat">${effTxt}</div></div>`;
                const btn = document.createElement('button');
                btn.className = 'btn gold sm';
                btn.textContent = '镶 嵌';
                btn.disabled = gm.gold < cost;
                btn.onclick = () => {
                    if (hs.socketGem(heroId, slot, g.miscId)) {
                        SoundFx.play('buy');
                        document.querySelector('#homeUi .protoMask')?.remove();
                        this._refreshHeroes();
                        this._openEquipSlotPanel(heroId, slot);
                    }
                };
                row.appendChild(btn);
                box.appendChild(row);
            }
            const back = document.createElement('button');
            back.className = 'btn dark big';
            back.style.marginTop = 'calc(12px * var(--hs,1))';
            back.textContent = '返 回';
            back.onclick = (e) => {
                e.stopPropagation();
                close();
                this._openEquipSlotPanel(heroId, slot);
            };
            box.appendChild(back);
        });
    }


    /** 弹窗：英雄核心（武器核心嵌入/拆除，口径同旧 gem 钮） */
    protected _openCoreModal(heroId: string): void {
        const hs = HeroSystem.instance;
        const def = HERO_DEFS.find(d => d.id === heroId);
        const core = hs.weaponCore(heroId);
        this._openModal('🧬 英雄核心', (box, close) => {
            const sub = document.createElement('p');
            sub.className = 'mSub';
            sub.textContent = `核心为 ${def?.name ?? ''} 提供武器特效加成（暴击/攻击等）`;
            box.appendChild(sub);
            if (core) {
                const row = document.createElement('div');
                row.className = 'mRow';
                row.innerHTML = `<span>当前核心 <b class="goldT" style="color:${EQUIP_TIER_COLORS[core.tier - 1]}">${core.name}</b> · ${core.desc}</span>`;
                const off = document.createElement('button');
                off.className = 'btn dark sm';
                off.textContent = '拆 除';
                off.onclick = () => {
                    if (hs.removeCore(heroId)) {
                        SoundFx.play('ui');
                        this._toast('核心已拆除');
                        close();
                        this._refreshHeroes();
                    }
                };
                row.appendChild(off);
                box.appendChild(row);
            } else {
                const rec = WEAPON_CORE_DEFS.slice()
                    .sort((a, b) => (a.tier - b.tier) || (a.baseCost - b.baseCost))[0] ?? null;
                if (rec) {
                    const row = document.createElement('div');
                    row.className = 'mRow';
                    row.innerHTML = `<span>未嵌入核心 · 推荐 <b class="goldT">${rec.name}</b>（${rec.desc}）</span>`;
                    const buy = document.createElement('button');
                    buy.className = 'btn gold sm';
                    buy.textContent = `🪙 ${rec.baseCost} 嵌入`;
                    buy.disabled = GameManager.instance.gold < rec.baseCost;
                    buy.onclick = () => {
                        if (hs.buyCore(heroId, rec.id)) {
                            SoundFx.play('buy');
                            this._toast(`${rec.name} 嵌入成功`);
                            close();
                            this._refreshHeroes();
                        }
                    };
                    row.appendChild(buy);
                    box.appendChild(row);
                }
                // 全核心列表（供选择）
                for (const c of WEAPON_CORE_DEFS) {
                    const row = document.createElement('div');
                    row.className = 'mRow';
                    row.innerHTML = `<span><b style="color:${EQUIP_TIER_COLORS[c.tier - 1]}">${c.name}</b> · ${c.desc}</span>`;
                    const b2 = document.createElement('button');
                    b2.className = 'btn blue sm';
                    b2.textContent = `🪙 ${c.baseCost}`;
                    b2.disabled = GameManager.instance.gold < c.baseCost;
                    b2.onclick = () => {
                        if (hs.buyCore(heroId, c.id)) {
                            SoundFx.play('buy');
                            this._toast(`${c.name} 嵌入成功`);
                            close();
                            this._refreshHeroes();
                        }
                    };
                    row.appendChild(b2);
                    box.appendChild(row);
                }
            }
        });
    }


    /** 弹窗：武器强化 */
    protected _openWeaponModal(heroId: string): void {
        const hs = HeroSystem.instance;
        const def = HERO_DEFS.find(d => d.id === heroId);
        this._openModal(`🔧 武器强化 · ${def?.name ?? ''}`, (box, close) => {
            const lv = hs.weaponLevel(heroId);
            const sub = document.createElement('p');
            sub.className = 'mSub';
            sub.textContent = '武器强化提升普攻基础伤害（每级攻击加成叠加）';
            box.appendChild(sub);
            const cur = document.createElement('div');
            cur.className = 'mRow';
            cur.innerHTML = `<span>当前武器 <b class="goldT">+${lv}</b> · 攻击加成 +${Math.round((hs.weaponAtkMul(heroId) - 1) * 100)}%</span>`;
            box.appendChild(cur);
            const row = document.createElement('div');
            row.className = 'mRow';
            if (hs.isWeaponMaxLevel(heroId)) {
                row.innerHTML = '<span>武器已满级</span>';
                const b = document.createElement('button');
                b.className = 'btn dark sm';
                b.disabled = true;
                b.textContent = '已满级';
                row.appendChild(b);
            } else {
                const cost = hs.weaponUpgradeCost(heroId);
                const stone = hs.weaponUpgradeStone(heroId);
                const stoneLeft = hs.miscCount('mat_stone');
                row.innerHTML = `<span>强化至 +${lv + 1}（攻击加成 +${Math.round((Math.pow(1 + 0.05, lv + 1) - 1) * 100)}%）</span>` +
                    `<span class="matNeed">🪙 ${cost} · 🧱 强化石 ×${stone}（余 ${stoneLeft}）</span>`;
                const b = document.createElement('button');
                b.className = 'btn gold sm';
                b.textContent = '强 化';
                b.disabled = GameManager.instance.gold < cost || stoneLeft < stone;
                b.onclick = () => {
                    if (hs.upgradeWeapon(heroId)) {
                        SoundFx.play('buy');
                        this._toast(`武器强化至 +${lv + 1}`);
                        close();
                        this._refreshHeroes();
                    } else {
                        this._toast('材料不足：分解装备或通关掉落获取强化石');
                    }
                };
                row.appendChild(b);
            }
            box.appendChild(row);
        });
    }


    /** 穿戴面板（对齐原型 mbox 风格）：已穿件（强化/卸下）+ 背包件（穿戴） */
    protected _openEquipSlotPanel(heroId: string, slot: EquipSlot): void {
        const hs = HeroSystem.instance;
        const gm = GameManager.instance;
        if (!gm.isHeroOwned(heroId)) {
            return;
        }
        this._openModal(`${EQUIP_SLOT_NAMES[slot]} · 穿戴`, (box, close) => {
            const list = document.createElement('div');
            list.className = 'equipSlots wide';
            box.appendChild(list);
            const cur = hs.equipped(heroId, slot);
            if (cur) {
                const row = document.createElement('div');
                row.className = 'equipRow';
                const info = document.createElement('div');
                info.className = 'equipInfo';
                let tier: EquipTier = 1;
                let name = '';
                if (cur.id.startsWith('bag:')) {
                    tier = Number(cur.id.split(':')[2]) as EquipTier;
                    name = bagItemName({ slot, tier, lv: cur.lv });
                } else {
                    const d = hs.equipDef(cur.id);
                    if (d) {
                        tier = d.tier;
                        name = d.name;
                    }
                }
                const parts: string[] = [];
                for (const key of ['atkPct', 'ratePct', 'rangePct'] as const) {
                    const v = Math.round(hs.equipSlotValue(cur, key) * 100);
                    if (v > 0) {
                        parts.push((key === 'atkPct' ? '攻击+' : key === 'ratePct' ? '射速+' : '射程+') + v + '%');
                    }
                }
                info.innerHTML =
                    `<div class="equipName" style="color:${EQUIP_TIER_COLORS[tier - 1]}">当前：${name}</div>` +
                    `<div class="equipStat">强化 +${cur.lv} · ${parts.join(' ') || '无属性'}</div>`;
                const btn = document.createElement('button');
                btn.className = 'btn gold sm';
                if (!hs.isEquipMaxLevel(cur)) {
                    const cost = hs.equipUpgradeCost(cur);
                    const alloy = hs.equipUpgradeAlloy(cur);
                    const alloyLeft = hs.miscCount('mat_alloy');
                    info.innerHTML =
                        `<div class="equipName" style="color:${EQUIP_TIER_COLORS[tier - 1]}">当前：${name}</div>` +
                        `<div class="equipStat">强化 +${cur.lv} · ${parts.join(' ') || '无属性'}</div>` +
                        `<div class="equipStat matNeed">强化需 🪙 ${cost} · 🔩 精炼合金 ×${alloy}（余 ${alloyLeft}）</div>`;
                    btn.textContent = '强 化';
                    btn.disabled = gm.gold < cost || alloyLeft < alloy;
                    btn.onclick = () => {
                        if (hs.upgradeEquip(heroId, slot)) {
                            SoundFx.play('buy');
                            document.querySelector('#homeUi .protoMask')?.remove();
                            this._refreshHeroes();
                        } else {
                            this._toast('材料不足：分解紫装以上或礼包获取精炼合金');
                        }
                    };
                } else {
                    btn.textContent = '已满级';
                    btn.disabled = true;
                }
                // 词缀重铸：重新随机词缀（满条保底），只动词缀不动强化/宝石
                const rfBtn = document.createElement('button');
                rfBtn.className = 'btn blue sm';
                const rfAlloy = hs.reforgeAlloyCost(cur);
                const rfGem = hs.reforgeGemCost(cur);
                const rfAlloyLeft = hs.miscCount('mat_alloy');
                info.innerHTML +=
                    `<div class="equipStat matNeed">重铸需 🔩 ${rfAlloy}（余 ${rfAlloyLeft}）· 💎 ${rfGem}</div>`;
                rfBtn.textContent = '✦ 重铸';
                rfBtn.disabled = rfAlloyLeft < rfAlloy || gm.res.get('diamond') < rfGem;
                rfBtn.title = '重新随机词缀（保底满条）；强化等级与宝石不变';
                rfBtn.onclick = () => {
                    if (hs.reforgeAffixes(heroId, slot)) {
                        SoundFx.play('buy');
                        this._toast('词缀已重铸');
                        document.querySelector('#homeUi .protoMask')?.remove();
                        this._refreshHeroes();
                        this._openEquipSlotPanel(heroId, slot);
                    } else {
                        this._toast('材料不足：重铸需精炼合金与钻石');
                    }
                };
                const offBtn = document.createElement('button');
                offBtn.className = 'btn dark sm';
                offBtn.textContent = '卸 下';
                offBtn.onclick = () => {
                    if (hs.unequipToBag(heroId, slot)) {
                        SoundFx.play('ui');
                        document.querySelector('#homeUi .protoMask')?.remove();
                        this._refreshHeroes();
                    }
                };
                const wrap = document.createElement('div');
                wrap.style.display = 'flex';
                wrap.style.gap = 'calc(8px * var(--hs,1))';
                wrap.style.flexWrap = 'wrap';
                wrap.appendChild(btn);
                wrap.appendChild(rfBtn);
                wrap.appendChild(offBtn);
                row.appendChild(info);
                row.appendChild(wrap);
                list.appendChild(row);
                // 已穿件的词缀明细（数值已计入上面的「含词缀」总属性）
                const curAffix = this._affixBlock(cur.affixes, tier);
                if (curAffix) {
                    list.appendChild(curAffix);
                }

                // ---- 宝石孔区：已镶宝石可拆卸，空孔选择库存宝石镶嵌 ----
                const holes = hs.gemSlotCount(heroId, slot);
                if (holes > 0) {
                    const gemBox = document.createElement('div');
                    gemBox.className = 'gemBox';
                    const gems = hs.equippedGems(heroId, slot);
                    for (let hi = 0; hi < holes; hi++) {
                        const hole = document.createElement('div');
                        hole.className = 'gemHole';
                        const gid = gems[hi];
                        if (gid) {
                            const gd = miscDef(gid)!;
                            const eff = GEM_EFFECTS.find(g => g.miscId === gid);
                            const effTxt = eff ? (eff.key === 'atkPct' ? '攻击' : eff.key === 'ratePct' ? '射速' : eff.key === 'rangePct' ? '射程' : '暴击')
                                + `+${Math.round(eff.value * 100)}%` : '';
                            hole.innerHTML = `<span class="ghIc">${gd.ic}</span><span class="ghNm" style="color:${EQUIP_TIER_COLORS[gd.tier - 1]}">${gd.name}</span><span class="ghEff">${effTxt}</span>`;
                            hole.title = '点击拆卸（宝石返还背包）';
                            hole.onclick = () => {
                                if (hs.unsocketGem(heroId, slot, hi)) {
                                    SoundFx.play('ui');
                                    document.querySelector('#homeUi .protoMask')?.remove();
                                    this._refreshHeroes();
                                    this._openEquipSlotPanel(heroId, slot);
                                }
                            };
                        } else {
                            hole.innerHTML = `<span class="ghIc dim">◇</span><span class="ghNm dim">空孔位</span><span class="ghEff">点击镶嵌</span>`;
                            hole.onclick = () => {
                                document.querySelector('#homeUi .protoMask')?.remove();
                                this._openGemPickPanel(heroId, slot);
                            };
                        }
                        gemBox.appendChild(hole);
                    }
                    list.appendChild(gemBox);
                }
            }
            const items = hs.bagItemsOf(slot);
            if (items.length === 0) {
                const empty = document.createElement('p');
                empty.className = 'mSub';
                empty.textContent = cur ? '背包中该部位没有其他件' : '背包中该部位没有装备 · 去商店购买';
                list.appendChild(empty);
            }
            for (const { index, item } of items) {
                const row = document.createElement('div');
                row.className = 'equipRow';
                const info = document.createElement('div');
                info.className = 'equipInfo';
                const parts: string[] = [];
                for (const key of ['atkPct', 'ratePct', 'rangePct'] as const) {
                    const v = Math.round(bagItemValue(item, key) * 100);
                    if (v > 0) {
                        parts.push((key === 'atkPct' ? '攻击+' : key === 'ratePct' ? '射速+' : '射程+') + v + '%');
                    }
                }
                info.innerHTML =
                    `<div class="equipName" style="color:${EQUIP_TIER_COLORS[item.tier - 1]}">${bagItemName(item)}`
                    + `${this._affixBadge(item.affixes) ? ` <span class="affixMark">${this._affixBadge(item.affixes)}</span>` : ''}</div>` +
                    `<div class="equipStat">${parts.join(' ') || '无属性'}</div>`;
                const btn = document.createElement('button');
                btn.className = 'btn gold sm';
                btn.textContent = '穿 戴';
                btn.onclick = () => {
                    if (hs.equipFromBag(heroId, index)) {
                        SoundFx.play('buy');
                        document.querySelector('#homeUi .protoMask')?.remove();
                        this._refreshHeroes();
                    }
                };
                row.appendChild(info);
                row.appendChild(btn);
                list.appendChild(row);
                const bagAffix = this._affixBlock(item.affixes, item.tier);
                if (bagAffix) {
                    list.appendChild(bagAffix);
                }
            }
            const closeBar = document.createElement('button');
            closeBar.className = 'btn dark big';
            closeBar.style.marginTop = 'calc(12px * var(--hs,1))';
            closeBar.textContent = '关 闭';
            closeBar.onclick = (e) => {
                e.stopPropagation();
                close();
            };
            box.appendChild(closeBar);
        });
    }


    /** 技能养成三线卡（普攻/技能/大招）——原技能页主体并入英雄详情页，选人即看技能 */
    protected _renderSkillCards(def: HeroDef): HTMLDivElement {
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
                        // 技能卡内嵌英雄详情页，升级后整页重建同步等级与金币态
                        this._refreshHeroes();
                        this._refreshTop();
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
                        document.querySelector('#homeUi .protoMask')?.remove();
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

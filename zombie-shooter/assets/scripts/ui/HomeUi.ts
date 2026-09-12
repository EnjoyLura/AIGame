import { _decorator, Component } from 'cc';
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

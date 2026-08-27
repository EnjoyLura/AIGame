import { EventTarget } from 'cc';

/**
 * 全局事件中心：系统间解耦通信的唯一通道。
 * 禁止业务系统之间直接相互引用，一律走事件（事件名统一定义在 GameEvent）。
 */
export const eventCenter = new EventTarget();

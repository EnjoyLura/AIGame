import { Node, Tween } from 'cc';

/**
 * 通用节点对象池。
 * 战斗中的子弹/怪物/飘字必须全部走池，避免频繁创建销毁造成微信端卡顿与 GC 抖动。
 */
export class NodePool {
    private _pool: Node[] = [];

    constructor(
        /** 池空时的创建逻辑 */
        private _factory: () => Node,
        /** 回池前的清理逻辑（清引用、还原状态） */
        private _onRecycle?: (node: Node) => void,
    ) {
    }

    /** 取出一个节点（未挂到场景树，由使用方 addChild 并定位） */
    get(): Node {
        const node = this._pool.pop() ?? this._factory();
        node.active = true;
        return node;
    }

    /** 回收：清理 → 停 tween → 摘树 → 隐藏 → 入池 */
    put(node: Node): void {
        this._onRecycle?.(node);
        Tween.stopAllByTarget(node);
        node.removeFromParent();
        node.active = false;
        this._pool.push(node);
    }

    /** 销毁池中所有缓存节点（切场景/游戏结束时调用） */
    clear(): void {
        for (const node of this._pool) {
            node.destroy();
        }
        this._pool.length = 0;
    }

    get storedCount(): number {
        return this._pool.length;
    }
}

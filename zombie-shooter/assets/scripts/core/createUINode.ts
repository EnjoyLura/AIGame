import { Layers, Node } from 'cc';

/**
 * 创建 UI_2D 层节点。
 * `new Node()` 默认在 DEFAULT 层，而 2D 相机的可见掩码只含 UI_2D/UI_3D，
 * 动态创建的节点若不显式设层将完全不可渲染（黑屏且无报错），务必统一走这里。
 */
export function createUINode(name: string = 'node'): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    return node;
}

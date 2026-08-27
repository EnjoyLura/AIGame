import { director, Director, ResolutionPolicy, UITransform, view } from 'cc';
import { Design } from '../config/GameConfig';
import { createUINode } from './createUINode';
import { BattleManager } from '../battle/BattleManager';

/**
 * 启动引导。
 * 场景文件只保留纯引擎节点（Canvas/Camera），不引用任何自定义脚本；
 * 场景加载完成后在这里动态挂载战斗根节点，全部游戏逻辑由 BattleManager 展开。
 * 这样做的好处：脚本重构不会破坏场景文件，代码与场景零耦合。
 */
director.once(Director.EVENT_AFTER_SCENE_LAUNCH, () => {
    // 强制竖屏设计分辨率：宽度固定 720，高度按屏幕比例自适应（fitWidth）
    view.setDesignResolutionSize(Design.WIDTH, Design.HEIGHT, ResolutionPolicy.FIXED_WIDTH);

    const scene = director.getScene();
    const canvas = scene && scene.getChildByName('Canvas');
    if (!canvas || canvas.getChildByName('BattleRoot')) {
        return;
    }

    const root = createUINode('BattleRoot');
    const transform = root.addComponent(UITransform);
    transform.setContentSize(Design.WIDTH, Design.HEIGHT);
    canvas.addChild(root);
    root.addComponent(BattleManager);
});

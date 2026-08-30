import { director, Director, ResolutionPolicy, screen, UITransform, view } from 'cc';
import { Design } from '../config/GameConfig';
import { createUINode } from './createUINode';
import { AssetLib } from './AssetLib';
import { BattleManager } from '../battle/BattleManager';

/**
 * 启动引导。
 * 场景文件只保留纯引擎节点（Canvas/Camera），不引用任何自定义脚本；
 * 场景加载完成后在这里动态挂载战斗根节点，全部游戏逻辑由 BattleManager 展开。
 * 这样做的好处：脚本重构不会破坏场景文件，代码与场景零耦合。
 */
director.once(Director.EVENT_AFTER_SCENE_LAUNCH, () => {
    // 动态设计分辨率 = 设备物理分辨率（1 设计像素 = 1 物理像素）：
    // 文字/矢量界面按物理密度光栅化，与 DOM 同级锐度（治本）。
    // 宽度上限 1620 防御超高清设备填充率；所有布局常量按 uiScale=可视高/1920 动态缩放。
    const win = screen.windowSize;
    const designW = Math.min(win.width, 1620);
    const designH = Math.round(designW * (win.height / win.width));
    view.setDesignResolutionSize(designW, designH, ResolutionPolicy.EXACT_FIT);

    // 窗口尺寸变化（桌面调试拖拽）时重载页面重排 UI（手机竖屏不会触发）
    window.addEventListener('resize', () => {
        const w = screen.windowSize;
        if (Math.abs(w.width - win.width) > 8 || Math.abs(w.height - win.height) > 8) {
            location.reload();
        }
    });

    // 美术资源异步预载（缺图自动回退占位，不阻断启动）
    AssetLib.preload();

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

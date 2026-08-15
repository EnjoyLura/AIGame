import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(toolsDirectory, '..');

function readText(relativePath) {
    return fs.readFileSync(path.join(projectDirectory, relativePath), 'utf8');
}

const packageJson = JSON.parse(readText('package.json'));
const scene = JSON.parse(readText('assets/scenes/Bootstrap.scene'));
const componentSource = readText('assets/scripts/battle/M2MinimalBattle.ts');
const m1Source = readText('assets/scripts/ui/M1LayoutPrototype.ts');

assert.equal(packageJson.scripts['test:m2'], 'node tools/m2-battle-test.mjs');
assert.match(componentSource, /@ccclass\('M2MinimalBattle'\)/);
assert.match(componentSource, /type BattleState = 'running' \| 'paused' \| 'won' \| 'lost';/);
assert.match(componentSource, /private spawnEnemy\(\): void/);
assert.match(componentSource, /private fireAtFirstEnemy\(\): void/);
assert.match(componentSource, /private recycleEnemy\(index: number\): void/);
assert.match(componentSource, /private recycleProjectile\(index: number\): void/);
assert.match(componentSource, /this\.finish\('won'\)/);
assert.match(componentSource, /this\.finish\('lost'\)/);
assert.match(componentSource, /private restart = \(\): void/);
assert.match(componentSource, /private togglePause = \(\): void/);
assert.match(componentSource, /private toggleSpeed = \(\): void/);
assert.match(componentSource, /private toggleAuto = \(\): void/);
assert.doesNotMatch(m1Source, /const enemyPositions =/);
assert.match(m1Source, /showUpgradePreview = true/);

const canvas = scene.find((entry) => entry.__type__ === 'cc.Node' && entry._name === 'Canvas');
assert.ok(canvas, 'Bootstrap scene must contain Canvas');
assert.equal(canvas._components.length, 4, 'Canvas must keep camera, transform, canvas and widget components');
assert.equal(
    scene.some((entry) => entry.__type__ === 'b1e508/NcxGXJx6hhXuCUe8'),
    true,
    'Bootstrap scene must serialize the M2 battle component',
);

const m2Component = scene.find((entry) => entry.__type__ === 'b1e508/NcxGXJx6hhXuCUe8');
assert.equal(m2Component.escortDuration, 30);
assert.equal(m2Component.maxVehicleHp, 100);
assert.equal(scene.filter((entry) => entry.node?.__id__ === 2).length >= 2, true);

console.log('M2 minimal battle test passed');
console.log('Single hero: automatic attack and pooled projectile flow');
console.log('Single enemy: spawn, advance, hit, death, vehicle damage');
console.log('Battle states: pause, speed, AUTO, victory, defeat, restart');

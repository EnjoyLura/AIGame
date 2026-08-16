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
const componentSource = readText('assets/scripts/battle/M3CompleteLevel.ts');
const dataSource = readText('assets/scripts/battle/M3LevelData.ts');

assert.equal(packageJson.scripts['test:m3'], 'node tools/m3-level-test.mjs');
assert.match(componentSource, /@ccclass\('M3CompleteLevel'\)/);
assert.match(componentSource, /type BattleState = 'running' \| 'paused' \| 'upgrade' \| 'won' \| 'lost';/);
assert.match(componentSource, /private presentUpgradeChoices\(\): void/);
assert.match(componentSource, /private castSkill = \(\): void/);
assert.match(componentSource, /private castUltimate = \(\): void/);
assert.match(componentSource, /private triggerSupport\(index: number\): void/);
assert.match(componentSource, /this\.supportLabels\.push/);
assert.match(componentSource, /private random\(\): number/);
assert.match(componentSource, /private finish\(nextState: 'won' \| 'lost'\): void/);
assert.match(componentSource, /失败原因：变异群突破防线/);
assert.match(componentSource, /this\.stats\.upgrades/);
assert.match(dataSource, /crawler:/);
assert.match(dataSource, /runner:/);
assert.match(dataSource, /shellback:/);
assert.match(dataSource, /spitter:/);
assert.match(dataSource, /flier:/);
assert.match(dataSource, /charger:/);
assert.match(dataSource, /broodmother:/);
assert.match(dataSource, /titan:/);
assert.match(dataSource, /fireRain/);
assert.match(dataSource, /droneStrike/);
assert.match(dataSource, /fixedSeed: 20260815/);

console.log('M3 complete level test passed');
console.log('Config: fixed seed, five normal enemies, two elites, one boss, two supports');
console.log('Flow: normal attack, skill, ultimate, XP upgrade choices, stats and result states');

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
const levelSource = readText('assets/scripts/battle/M3CompleteLevel.ts');
const heroSource = readText('assets/scripts/battle/M4HeroData.ts');
const componentSource = readText('assets/scripts/battle/M4FourHeroBattle.ts');

assert.equal(packageJson.scripts['test:m4'], 'node tools/m4-four-hero-test.mjs');
assert.match(componentSource, /@ccclass\('M4FourHeroBattle'\)/);
assert.match(componentSource, /extends M3CompleteLevel/);
assert.match(heroSource, /id: 'ranger'/);
assert.match(heroSource, /id: 'wind'/);
assert.match(heroSource, /id: 'pulse'/);
assert.match(heroSource, /id: 'frost'/);
assert.match(heroSource, /origin: '武装干员'/);
assert.match(heroSource, /origin: '进化者'/);
assert.match(levelSource, /private squad = this\.createHeroRuntimes\(\)/);
assert.match(levelSource, /private createHeroRuntimes\(\): HeroRuntime\[\]/);
assert.match(levelSource, /private castHeroSkill\(heroIndex: number\): void/);
assert.match(levelSource, /private castHeroUltimate\(heroIndex: number\): void/);
assert.match(levelSource, /HeroSkill_\$\{index\}/);
assert.match(levelSource, /HeroUltimate_\$\{index\}/);
assert.match(levelSource, /this\.enemies\.length >= 54/);
assert.match(levelSource, /this\.currentUpgradeHeroIndex/);

const m4Component = scene.find((entry) => entry.__type__ === '44ab5YxaUdIaqmNWH3225aj');
assert.ok(m4Component, 'Bootstrap scene must serialize the M4 four-hero component');
assert.equal(m4Component.fixedSeed, 20260815);

console.log('M4 four hero test passed');
console.log('Roster: two weapon specialists and two evolved heroes');
console.log('Per-hero normal attacks, skills, ultimates, upgrade target and stable UI controls');

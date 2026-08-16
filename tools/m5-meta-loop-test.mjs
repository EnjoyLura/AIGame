import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const toolsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(toolsDirectory, '..');
const require = createRequire(import.meta.url);
const typescript = require('C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/typescript.js');

function readText(relativePath) {
    return fs.readFileSync(path.join(projectDirectory, relativePath), 'utf8');
}

function loadProfileModule() {
    const source = readText('assets/scripts/meta/M5Profile.ts');
    const compiled = typescript.transpileModule(source, {
        compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2020 },
    }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(compiled, { module, exports: module.exports });
    return module.exports;
}

const packageJson = JSON.parse(readText('package.json'));
const scene = JSON.parse(readText('assets/scenes/Bootstrap.scene'));
const levelSource = readText('assets/scripts/battle/M3CompleteLevel.ts');
const flowSource = readText('assets/scripts/meta/M5MetaLoop.ts');
const storeSource = readText('assets/scripts/meta/M5ProfileStore.ts');
const profileModule = loadProfileModule();
const now = 1_800_000;

assert.equal(packageJson.scripts['test:m5'], 'node tools/m5-meta-loop-test.mjs');
assert.match(levelSource, /startOnLoad = true/);
assert.match(levelSource, /public configureMetaLoop\(/);
assert.match(levelSource, /public configureExternalModifiers\(/);
assert.match(levelSource, /public startBattle\(\): void/);
assert.match(levelSource, /this\.onReturnToHub\(\)/);
assert.match(flowSource, /@ccclass\('M5MetaLoop'\)/);
assert.match(flowSource, /private startMission/);
assert.match(flowSource, /private handleBattleFinished/);
assert.match(flowSource, /claimIdleReward/);
assert.match(flowSource, /upgradeProfile/);
assert.match(storeSource, /sys\.localStorage/);

const m4Component = scene.find((entry) => entry.__type__ === '44ab5YxaUdIaqmNWH3225aj');
const m5Component = scene.find((entry) => entry.__type__ === 'bc5adjNL5FKU7TRfdP5Bhx1');
assert.equal(m4Component.startOnLoad, false);
assert.ok(m5Component, 'Bootstrap scene must serialize the M5 meta loop component');

const profile = profileModule.createDefaultProfile(now);
assert.equal(profile.supplies, 70);
assert.equal(profileModule.calculateIdleReward(profile, now).supplies, 40);
const claimed = profileModule.claimIdleReward(profile, now);
assert.equal(claimed.profile.supplies, 110);
assert.equal(profileModule.calculateIdleReward(claimed.profile, now).supplies, 0);
const heroUpgrade = profileModule.upgradeProfile(claimed.profile, 'hero');
assert.equal(heroUpgrade.heroTrainingLevel, 2);
assert.equal(heroUpgrade.samples, 25);
assert.equal(profileModule.upgradeProfile({ ...heroUpgrade, samples: 0 }, 'equipment'), null);
const cleared = profileModule.completeMission(heroUpgrade, true, 66);
assert.equal(cleared.supplies, 42);
assert.equal(cleared.samples, 24);
assert.equal(cleared.profile.completedMissions, 1);
assert.equal(cleared.profile.bestKills, 66);
const modifiers = profileModule.getCombatModifiers({ ...cleared.profile, equipmentLevel: 2, vehicleLevel: 3 });
assert.ok(Math.abs(modifiers.damageMultiplier - 1.13) < 0.000001);
assert.equal(modifiers.vehicleHpBonus, 48);

console.log('M5 meta loop test passed');
console.log('Flow: home, resource claim, three basic upgrades, mission selection, battle return and local profile');

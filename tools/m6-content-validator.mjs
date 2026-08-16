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

function loadTypeScriptModule(relativePath, dependencies = {}) {
    const source = readText(relativePath);
    const compiled = typescript.transpileModule(source, {
        compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2020 },
    }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(compiled, {
        module,
        exports: module.exports,
        require: (request) => dependencies[request] ?? require(request),
    });
    return module.exports;
}

function validateLevel(level) {
    assert.equal(typeof level.id, 'string');
    assert.ok(level.name.length > 0, `${level.id} requires a display name`);
    assert.ok(Number.isInteger(level.fixedSeed) && level.fixedSeed > 0, `${level.id} fixed seed is invalid`);
    assert.ok(level.duration > 0 && level.vehicleHp > 0, `${level.id} combat basics are invalid`);
    assert.ok(level.phases.length >= 2 && level.phases[0].at === 0, `${level.id} phase timeline must start at zero`);
    assert.ok(level.waves.length >= 5, `${level.id} requires enough wave beats`);
    assert.ok(level.supports.length >= 2, `${level.id} requires two support skills`);
    assert.ok(level.upgrades.length >= 3, `${level.id} requires upgrade choices`);

    let previousPhaseAt = -1;
    for (const phase of level.phases) {
        assert.ok(phase.at >= previousPhaseAt, `${level.id} phases must be ordered`);
        previousPhaseAt = phase.at;
    }

    let previousWaveAt = -1;
    for (const wave of level.waves) {
        assert.ok(wave.at >= previousWaveAt, `${level.id} waves must be ordered`);
        assert.ok(level.enemies[wave.enemyId], `${level.id} wave references an unknown enemy`);
        assert.ok(wave.count > 0 && wave.interval > 0, `${level.id} wave count or interval is invalid`);
        previousWaveAt = wave.at;
    }
}

const packageJson = JSON.parse(readText('package.json'));
const m3Data = loadTypeScriptModule('assets/scripts/battle/M3LevelData.ts');
const m6Catalog = loadTypeScriptModule('assets/scripts/battle/M6LevelCatalog.ts', { './M3LevelData': m3Data });
const levelSource = readText('assets/scripts/battle/M3CompleteLevel.ts');
const metaSource = readText('assets/scripts/meta/M5MetaLoop.ts');

assert.equal(packageJson.scripts['test:m6'], 'node tools/m6-content-validator.mjs');
assert.deepEqual(Object.keys(m6Catalog.M6_LEVEL_CATALOG), ['polluted-plain-01', 'withered-grassland-01']);
for (const level of Object.values(m6Catalog.M6_LEVEL_CATALOG)) {
    validateLevel(level);
}
assert.notEqual(
    m6Catalog.M6_LEVEL_CATALOG['polluted-plain-01'].fixedSeed,
    m6Catalog.M6_LEVEL_CATALOG['withered-grassland-01'].fixedSeed,
);
assert.notDeepEqual(
    m6Catalog.M6_LEVEL_CATALOG['polluted-plain-01'].waves,
    m6Catalog.M6_LEVEL_CATALOG['withered-grassland-01'].waves,
);
assert.equal(m6Catalog.getLevelConfig('unknown-level').id, 'polluted-plain-01');
assert.match(levelSource, /public configureLevel\(levelId: LevelId\): void/);
assert.match(levelSource, /private levelConfig: LevelConfig = getLevelConfig\(this\.levelId\)/);
assert.doesNotMatch(levelSource, /M3_LEVEL_CONFIG/);
assert.match(metaSource, /private selectedLevelId: LevelId = 'polluted-plain-01'/);
assert.match(metaSource, /this\.battle\.configureLevel\(this\.selectedLevelId\)/);
assert.match(metaSource, /Mission_WitheredGrassland/);

console.log('M6 content validator passed');
console.log('Catalog: two data-driven levels with ordered phases, waves, enemy references, supports and upgrades');

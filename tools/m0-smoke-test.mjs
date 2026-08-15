import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(toolsDirectory, '..');

function readJson(relativePath) {
    const filePath = path.join(projectDirectory, relativePath);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonc(relativePath) {
    const filePath = path.join(projectDirectory, relativePath);
    const source = fs.readFileSync(filePath, 'utf8');
    const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
    const withoutLineComments = withoutBlockComments.replace(/^\s*\/\/.*$/gm, '');
    return JSON.parse(withoutLineComments);
}

function assertFile(relativePath) {
    const filePath = path.join(projectDirectory, relativePath);
    assert.equal(fs.existsSync(filePath), true, `Missing required file: ${relativePath}`);
}

function assertDirectory(relativePath) {
    const directoryPath = path.join(projectDirectory, relativePath);
    assert.equal(fs.statSync(directoryPath).isDirectory(), true, `Missing required directory: ${relativePath}`);
}

function readText(relativePath) {
    const filePath = path.join(projectDirectory, relativePath);
    return fs.readFileSync(filePath, 'utf8');
}

const packageJson = readJson('package.json');
const tsconfig = readJsonc('tsconfig.json');
const creatorProject = readJson('settings/v2/packages/project.json');

assert.equal(packageJson.name, 'client');
assert.equal(packageJson.creator.version, '3.8.8');
assert.equal(packageJson.scripts['test:m0'], 'node tools/m0-smoke-test.mjs');
assert.equal(tsconfig.extends, './temp/tsconfig.cocos.json');
assert.equal(creatorProject.__version__, '1.0.6');

assertFile('AGENTS.md');
assertFile('docs/PRD.md');
assertFile('assets/scripts/core/diagnostics/M0SmokeTest.ts');
assertFile('assets/scenes/Bootstrap.scene');
assertFile('assets/scenes/Bootstrap.scene.meta');
assertFile('temp/tsconfig.cocos.json');
assertDirectory('assets');
assertDirectory('assets/scripts');

const bootstrapScene = readText('assets/scenes/Bootstrap.scene');
assert.match(bootstrapScene, /"__type__": "cc\.SceneAsset"/);
assert.match(bootstrapScene, /"_name": "Bootstrap"/);
assert.match(bootstrapScene, /"width": 750/);
assert.match(bootstrapScene, /"height": 1334/);
assert.doesNotMatch(bootstrapScene, /"__type__": "cc\.Button"/);

console.log('M0 smoke test passed');
console.log('Project: client');
console.log('Creator: 3.8.8');
console.log('Business UI dependency: none');

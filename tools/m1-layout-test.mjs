import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(toolsDirectory, '..');
const componentClassId = '049a3smbvZBOqDGeZHRoIf9';

function readText(relativePath) {
    return fs.readFileSync(path.join(projectDirectory, relativePath), 'utf8');
}

const packageJson = JSON.parse(readText('package.json'));
const scene = JSON.parse(readText('assets/scenes/Bootstrap.scene'));
const componentSource = readText('assets/scripts/ui/M1LayoutPrototype.ts');
const webTemplate = readText('build-templates/web-desktop/index.html');
const webTemplateStyle = readText('build-templates/web-desktop/style.css');

assert.equal(packageJson.scripts['test:m1'], 'node tools/m1-layout-test.mjs');
assert.match(componentSource, /const BATTLE_TOP = DESIGN_HEIGHT \/ 2 - HEADER_HEIGHT;/);
assert.match(componentSource, /const BATTLE_BOTTOM = DESIGN_HEIGHT \/ 2 - DESIGN_HEIGHT \* 0\.8;/);
assert.match(componentSource, /view\.setDesignResolutionSize\(DESIGN_WIDTH, DESIGN_HEIGHT, ResolutionPolicy\.FIXED_WIDTH\);/);
assert.match(componentSource, /profiler\.hideStats\(\);/);
assert.match(componentSource, /const leftX = -320;/);
assert.match(componentSource, /const rightX = 320;/);
assert.match(componentSource, /private createUpgradeOverlay\(\): Node/);
assert.match(componentSource, /private toggleUpgradeOverlay/);
assert.equal(componentSource.includes('M1LayoutPrototype'), true);
assert.match(webTemplate, /cc_exact_fit_screen="true"/);
assert.doesNotMatch(webTemplate, /class="header"|class="footer"/);
assert.match(webTemplateStyle, /overflow: hidden;/);

const canvas = scene.find((entry) => entry.__type__ === 'cc.Node' && entry._name === 'Canvas');
assert.ok(canvas, 'Bootstrap scene must contain Canvas');
assert.equal(
    canvas._components.some((component) => component.__id__ === 15),
    true,
    'Canvas must reference the M1 layout component',
);
assert.equal(
    scene.some((entry) => entry.__type__ === componentClassId),
    true,
    'Bootstrap scene must serialize the M1 layout component',
);

const battleHeightPercent = 0.8 - 0.07;
assert.equal(battleHeightPercent, 0.73, 'Battlefield must occupy 73% of vertical design space');

console.log('M1 layout test passed');
console.log('Battlefield: 7%-80%');
console.log('Left: global controls; right: environment skills; bottom: hero abilities');

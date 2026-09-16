import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// This DOM stub tests prototype state and event handlers, not browser layout or native gestures.
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>/)[1];
const nodes = new Map(), listeners = new Map(), timers = new Map();
let timerId = 0, hit = null;
class NodeStub {
  constructor() {
    this.dataset = {};
    this.scrollTop = 0;
    this.style = { setProperty() {} };
    this.classes = new Set();
    this.classList = {
      add: (...names) => names.forEach(n => this.classes.add(n)),
      remove: (...names) => names.forEach(n => this.classes.delete(n)),
      toggle: (name, force) => {
        const on = force ?? !this.classes.has(name);
        if (on) this.classes.add(name); else this.classes.delete(name);
        return on;
      }
    };
  }
  addEventListener() {}
  appendChild() {}
  remove() { this.removed = true; }
  setPointerCapture(id) { this.capture = id; }
  hasPointerCapture(id) { return this.capture === id; }
  releasePointerCapture() { this.capture = null; }
  closest(selector) {
    if (selector === '.bag-scroll') return getNode('.bag-scroll');
    if (selector === '[data-item]') return this.dataset.item ? this : null;
    if (selector === '[data-slot]') return this.dataset.slot !== undefined ? this : null;
    if (selector === 'button') return this;
    return null;
  }
  hasAttribute(name) { return name === 'data-free' && this.free; }
}
function getNode(key) {
  if (!nodes.has(key)) nodes.set(key, new NodeStub());
  return nodes.get(key);
}
const document = {
  querySelector: getNode,
  querySelectorAll: () => [],
  createElement: () => new NodeStub(),
  body: new NodeStub(),
  elementFromPoint: () => hit,
  addEventListener(type, fn) {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(fn);
  }
};
const context = vm.createContext({
  document, window: { addEventListener() {} }, console,
  setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id; },
  clearTimeout(id) { timers.delete(id); }
});
vm.runInContext(script, context);
const run = code => vm.runInContext(code, context);
function emit(type, values) {
  const event = { isPrimary: true, button: 0, pointerId: 1, pointerType: 'mouse', clientX: 20, clientY: 200, preventDefault() {}, ...values };
  for (const fn of listeners.get(type) || []) fn(event);
}
const checks = [];
function test(name, fn) { fn(); checks.push(name); console.log('PASS', name); }
function reset() { run("cancelDrag();resetGear();hero=0;page='hero';render();"); hit = null; }
function source(id='bag-0') { const node = new NodeStub(); node.dataset.item = id; return node; }
function target(slot) { const node = new NodeStub(); node.dataset.slot = String(slot); return node; }
function ids() { return run('JSON.stringify([...inventory,...equipped.flat()].map(i=>i.id).sort())'); }

test('Five primary pages render without dialogs or secondary pages', () => {
  for (const page of ['shop','hero','battle','action','base']) {
    run(`page='${page}';render();`);
    assert.match(getNode('#main').innerHTML, /class="screen /);
    assert.doesNotMatch(getNode('#main').innerHTML, /role="dialog"|class="layer/);
  }
  assert.doesNotMatch(script, /function (dialog|openScreen)\(/);
});
test('Equip swap preserves all 66 item identities and bag size', () => {
  reset(); const before = ids();
  assert.equal(run("equipItem('bag-0',0)"), true);
  assert.equal(run('equipped[0][0].id'), 'bag-0');
  assert.equal(run('inventory[0].id'), 'eq-0-0');
  assert.equal(run('inventory.length'), 42);
  assert.equal(ids(), before);
  assert.equal(run('power()'), 2668);
});
test('Wrong equipment slot changes neither inventory nor power', () => {
  reset(); const before = ids();
  assert.equal(run("equipItem('bag-0',1)"), false);
  assert.equal(ids(), before);
  assert.equal(run('power()'), 2556);
});
test('Hero equipment stays independent when switching heroes', () => {
  reset(); run("equipItem('bag-0',0);hero=1;render();");
  assert.equal(run('equipped[1][0].id'), 'eq-1-0');
  assert.equal(run('power()'), 2556);
  run('hero=0;render();');
  assert.equal(run('equipped[0][0].id'), 'bag-0');
});
test('Mouse drag event path equips matching target', () => {
  reset(); const node=source();
  emit('pointerdown',{target:node});
  emit('pointermove',{target:node,clientX:40});
  assert.equal(run('pointerSession.mode'), 'drag');
  hit=target(0); emit('pointerup',{target:node,clientX:40});
  assert.equal(run('equipped[0][0].id'), 'bag-0');
  assert.equal(run('pointerSession'), null);
  assert.equal(run('drag'), null);
});
test('Invalid drag drop leaves item equipped state unchanged', () => {
  reset();const node=source();
  emit('pointerdown',{target:node});emit('pointermove',{target:node,clientX:40});
  hit=target(1);emit('pointerup',{target:node,clientX:40});
  assert.equal(run('equipped[0][0].id'), 'eq-0-0');
  assert.equal(run('inventory[0].id'), 'bag-0');
});
test('Touch swipe scrolls the bag without starting equipment drag', () => {
  reset();getNode('.bag-scroll').scrollTop=0;const node=source();
  emit('pointerdown',{target:node,pointerType:'touch'});
  emit('pointermove',{target:node,pointerType:'touch',clientY:150});
  assert.equal(run('pointerSession.mode'), 'scroll');
  assert.equal(getNode('.bag-scroll').scrollTop, 50);
  assert.equal(run('drag'), null);
  emit('pointerup',{target:node,pointerType:'touch',clientY:150});
  assert.equal(run('equipped[0][0].id'), 'eq-0-0');
});
test('Touch long press then move equips without scrolling bag', () => {
  reset();getNode('.bag-scroll').scrollTop=0;const node=source();
  emit('pointerdown',{target:node,pointerType:'touch'});
  timers.get(run('pointerSession.timer'))();
  emit('pointermove',{target:node,pointerType:'touch',clientX:70,clientY:120});
  assert.equal(run('pointerSession.mode'), 'drag');
  assert.equal(getNode('.bag-scroll').scrollTop, 0);
  hit=target(0);emit('pointerup',{target:node,pointerType:'touch',clientX:70,clientY:120});
  assert.equal(run('equipped[0][0].id'), 'bag-0');
});
test('Pointer cancellation clears ghost and does not equip', () => {
  reset();const node=source();
  emit('pointerdown',{target:node});emit('pointermove',{target:node,clientX:40});
  emit('pointercancel',{target:node});
  assert.equal(run('drag'),null);assert.equal(run('pointerSession'),null);
  assert.equal(run('selected'),null);assert.equal(run('inventory[0].id'),'bag-0');
});
test('Bag filters and categories keep separate scroll positions', () => {
  reset();run("bagTab='装备';filter='全部';");getNode('.bag-scroll').scrollTop=142;
  run("rememberScroll();bagTab='宝石';render();");getNode('.bag-scroll').scrollTop=64;
  run("rememberScroll();bagTab='装备';render();");
  assert.equal(getNode('.bag-scroll').scrollTop,142);
  run("bagTab='宝石';render();");assert.equal(getNode('.bag-scroll').scrollTop,64);
  run("bagTab='装备';filter='头盔';");
  assert.equal((run('bagItems()').match(/data-item=/g)||[]).length,7);
});
console.log(`\n${checks.length} state/handler checks passed. Browser screenshots and real touch testing are not covered.`);

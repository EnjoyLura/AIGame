// Runs production TS against a minimal scene API, no browser or new dependencies.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const ts = require(process.env.COCOS_TYPESCRIPT || 'C:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript');
class Vec3 { constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});} set(v){Object.assign(this,v);} }
class UITransform { setContentSize(w,h){this.width=w;this.height=h;} convertToNodeSpaceAR(v){return v;} }
class Node { constructor(){this.children=[];this.components=new Map();this.active=true;this.angle=0;} addChild(n){this.children.push(n);} addComponent(C){const c=new C();this.components.set(C,c);return c;} getComponent(C){return this.components.get(C);} setWorldPosition(x,y,z){this.position={x,y,z};} destroy(){this.destroyed=true;} }
class Sprite {} Sprite.SizeMode={CUSTOM:0};
class UIOpacity {} class Color {constructor(...v){this.values=v;}}
class Graphics {clear(){} circle(){} stroke(){} fill(){}}
class SpriteFrame {} class Rect {constructor(x,y,width,height){Object.assign(this,{x,y,width,height});}} class Size {constructor(width,height){Object.assign(this,{width,height});}} class Vec2 {}
const cc={Node,Sprite,UIOpacity,UITransform,Vec3,Color,Graphics,SpriteFrame,Rect,Size,Vec2,resources:{load(){}}};
const createUINode=()=>{const n=new Node();n.addComponent(UITransform);return n;};
function load(file, deps){const source=fs.readFileSync(path.join(root,file),'utf8');const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;const exports={};vm.runInNewContext(output,{exports,require:k=>deps[k],console,Math});return exports;}
const {AssetLib}=load('assets/scripts/core/AssetLib.ts',{'cc':cc});
assert.equal(AssetLib.mortarFrames(),null);
AssetLib._frames.set('fx/mortar',{texture:{width:256,height:512}});assert.equal(AssetLib.mortarFrames(),null);
AssetLib._frames.set('fx/mortar',{texture:{width:512,height:512}});
const frames=AssetLib.mortarFrames();assert.equal(frames.length,16);assert.equal(frames,AssetLib.mortarFrames());
for(const f of frames){assert.equal(f.texture,frames[0].texture);assert.equal(f.packable,false);assert(f.rect.x>=0&&f.rect.y>=0&&f.rect.x+f.rect.width<=512&&f.rect.y+f.rect.height<=512);}
let available=true;
const {MortarFx,MORTAR_FX}=load('assets/scripts/battle/MortarFx.ts',{'cc':cc,'../core/AssetLib':{AssetLib:{mortarFrames:()=>available?frames:null}},'../core/createUINode':{createUINode}});
const fx=new MortarFx(new Node());const from=new Vec3(0,0),to=new Vec3(100,100);
let token=fx.begin(from,to,270,.5,1);assert(fx.active);assert.equal(fx.parts.filter(p=>p.node.active).length,3);
fx.tick(.25);assert.equal(fx.parts[1].node.position.x,50);assert.equal(fx.parts[1].node.position.y,350);
const snapshot=JSON.stringify(fx.parts.map(p=>p.node.position));fx.tick(0);assert.equal(JSON.stringify(fx.parts.map(p=>p.node.position)),snapshot);
fx.tick(.25);assert.equal(fx.parts[1].node.position.y,100);assert.equal(fx.impacted,false);
assert(fx.impact(token));assert.equal(fx.age,0);assert(fx.parts[1].node.active);assert(!fx.parts[3].node.active);
fx.tick(.1);assert(!fx.parts[1].node.active);fx.tick(.1);assert(fx.parts[3].node.active);
fx.tick(.13);assert(!fx.parts[2].node.active);assert(!fx.parts[0].node.active);
fx.tick(.57);assert(!fx.active);assert(!fx.node.active);
// Same battle seconds at 1x / 2x produce the same pose.
const a=new MortarFx(new Node()),b=new MortarFx(new Node());a.begin(from,to,270,.5,1);b.begin(from,to,270,.5,1);
for(let i=0;i<10;i++)a.tick(.02);for(let i=0;i<5;i++)b.tick(.02*2);
assert(Math.abs(a.parts[1].node.position.y-b.parts[1].node.position.y)<1e-8);
fx.begin(from,to,270,.5,1);fx.reset();assert(!fx.active);assert(fx.parts.every(p=>!p.node.active));
const fresh=fx.begin(from,to,270,.5,1);assert(!fx.impact(token));assert(fx.impact(fresh));fx.tick(100);assert(!fx.active);
available=false;token=fx.begin(from,to,270,.5,1);fx.tick(.5);assert(!fx.impact(token));assert(!fx.active);fx.destroy();assert(fx.node.destroyed);
// Verify integration ordering and unchanged gameplay statements, not just the test clock.
const bm=fs.readFileSync(path.join(root,'assets/scripts/battle/BattleManager.ts'),'utf8');
const update=bm.slice(bm.indexOf('    update(dt: number)'),bm.indexOf('// ---- 刷怪流程 ----'));
assert(update.indexOf('this._gameOver || this._paused')<update.indexOf('dt *= this._timeScale'));
assert(update.indexOf('fx.tick(dt)')<update.indexOf('this._tickDelayed(dt)'));
assert(bm.includes('this._mortarFx.length < MORTAR_FX.maxActive'));
assert(bm.includes('for (const fx of this._mortarFx) fx.destroy()'));
assert(bm.includes('for (const fx of this._mortarFx) fx.reset()'));
const combat=fs.readFileSync(path.join(root,'assets/scripts/battle/HeroCombat.ts'),'utf8');
assert(combat.includes("this._owner.def.id === 'rifle' && this._def.id === 'rifle-barrage' && this._def.mortar"));
assert(combat.includes('this._owner.battle.delayCall(castTime, () => {'));
assert(combat.includes('this._owner.battle.applyAreaDamage(center, radius, damage, this._owner.def.id, undefined, slot);'));
console.log('PASS: shared atlas/bounds, missing/invalid assets, flight/impact ordering, flash/fire/smoke/debris phases, pause, 2x, oversized dt, pool generation/reset/destroy, rifle-only integration; max '+MORTAR_FX.maxActive+' compositions / 60 sprite nodes.');

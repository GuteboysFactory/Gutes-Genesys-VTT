import assert from 'node:assert/strict';
globalThis.Hooks={on(){}};
const {bindWorldBackground,GENESYS_JOIN_BACKGROUND}=await import('../dist/module/world-background-v1885.js');
const listeners={};const form={dataset:{},addEventListener:(n,fn)=>{listeners[n]=fn;}};
const field={value:'old.webp',form,addEventListener:(n,fn)=>{listeners[n]=fn;}};const picker={};const root={querySelector:()=>field,querySelectorAll:()=>[picker]};
globalThis.game={system:{id:'genesys-vtt'},user:{isGM:true}};
class WorldConfig{}
assert.equal(bindWorldBackground(new WorldConfig(),root),true);assert.equal(field.value,GENESYS_JOIN_BACKGROUND);assert.equal(field.readOnly,true);assert.equal(picker.disabled,true);
field.value='other';listeners.submit();assert.equal(field.value,GENESYS_JOIN_BACKGROUND);
assert.equal(bindWorldBackground({},root),false);
game.system.id='other';assert.equal(bindWorldBackground(new WorldConfig(),root),false);
console.log('PASS fixed native WorldConfig background, submit enforcement and unrelated-system/application isolation');

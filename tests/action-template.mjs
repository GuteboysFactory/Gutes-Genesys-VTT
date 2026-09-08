import assert from 'node:assert/strict';
let init,registered;
globalThis.Hooks={once:(name,fn)=>{init=fn;}};
class Field{constructor(options){this.options=options;}}
globalThis.foundry={data:{fields:{StringField:Field,NumberField:Field}},abstract:{TypeDataModel:class{}},applications:{apps:{DocumentSheetConfig:{registerSheet:(...args)=>{registered=args;}}}},documents:{Item:class{}}};globalThis.CONFIG={Item:{dataModels:{}}};
const fs=await import('node:fs');const source=fs.readFileSync('dist/module/action-template-bootstrap.js','utf8').replace(/^import .*;$/m,'class GenesysItemSheet{}');await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));init();
const schema=CONFIG.Item.dataModels.actionTemplate.defineSchema();assert.equal(schema.difficulty.options.max,5);assert.ok(schema.activation.options.choices.includes('out-of-turn-incidental'));assert.equal(schema.skillId.options.initial,'');assert.deepEqual(registered[3].types,['actionTemplate']);
console.log('PASS: native Action Template schema and sheet registration');

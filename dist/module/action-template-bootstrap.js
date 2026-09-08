import {GenesysItemSheet} from './sheets/item-sheet.js';
Hooks.once('init',()=>{
 const {StringField,NumberField}=foundry.data.fields;
 class ActionTemplateData extends foundry.abstract.TypeDataModel{
  static defineSchema(){return {activation:new StringField({initial:'action',choices:['action','maneuver','incidental','out-of-turn-incidental']}),binding:new StringField({initial:'skill-check',choices:['skill-check','assist','maneuver','custom-check','heroic']}),heroicId:new StringField({initial:''}),skillId:new StringField({initial:''}),difficulty:new NumberField({initial:2,integer:true,min:0,max:5}),notes:new StringField({initial:''})};}
 }
 CONFIG.Item.dataModels.actionTemplate=ActionTemplateData;
 foundry.applications.apps.DocumentSheetConfig.registerSheet(foundry.documents.Item,'genesys-vtt',GenesysItemSheet,{types:['actionTemplate'],makeDefault:true,label:'Action Template'});
});

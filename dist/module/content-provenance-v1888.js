import {TALENT_SOURCE_PAGES} from './content-packs/talent-source-pages-v1888.js';
import {RUNE_RULES} from '../domain/runes/runes.js';
const SID='genesys-vtt';
export function sourceMetadata(item){
 const sourceId=item.system?.sourceId??item.system?.provenance?.sourceId??'',flags=item.flags?.[SID]??{},meta=flags.metadata??flags.libraryMetadata??{};
 if(TALENT_SOURCE_PAGES[sourceId])return {...TALENT_SOURCE_PAGES[sourceId],sourceId};
 const npc=flags.adversaryRulesSource??flags.adversaryTemplate;
 if(npc?.page!==undefined)return {sourceId:npc.id,book:'realms-of-terrinoth',page:npc.page,category:'adversary',version:'Official book + FAQ v1.1'};
 const rune=RUNE_RULES[flags.contentId];
 const page=rune?.page??meta.sourcePage??String(meta.printedSource??'').match(/pp?\.\s*([\d–-]+)/)?.[1]??flags.sourcePage;
 if(!sourceId||page===undefined)return null;
 return {sourceId,book:item.system?.provenance?.sourceType??item.system?.sourceType??'realms-of-terrinoth',page,category:meta.category??item.type,version:meta.sourceVersion??item.system?.provenance?.sourceVersion??'Official book + FAQ v1.1'};
}
Hooks.on('preCreateActor',doc=>{const source=sourceMetadata(doc);if(source)doc.updateSource({[`flags.${SID}.sourceReference`]:source});});
Hooks.on('preCreateItem',doc=>{const source=sourceMetadata(doc);if(source)doc.updateSource({[`flags.${SID}.sourceReference`]:source});});
Hooks.once('ready',async()=>{
 if(!game.user?.isGM||game.users?.activeGM?.id!==game.user.id)return;
 for(const doc of [...game.items,...game.actors,...[...game.actors].flatMap(a=>[...a.items])]){
  const source=sourceMetadata(doc);if(source&&JSON.stringify(doc.getFlag(SID,'sourceReference'))!==JSON.stringify(source)){
   if(game.users.activeGM?.id!==game.user.id)return;
   try{await doc.update({[`flags.${SID}.sourceReference`]:source});}catch(e){console.warn('genesys-vtt | Source metadata update can be retried',doc.uuid,e);}
  }
 }
});

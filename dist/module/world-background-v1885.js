export const GENESYS_JOIN_BACKGROUND='systems/genesys-vtt/assets/system/forge-the-story.webp';
/** The native WorldConfig form persists this value when Update World is pressed. */
export function bindWorldBackground(app,html){
 if(globalThis.game?.system?.id!=='genesys-vtt'||!game.user?.isGM)return false;
 const name=app?.constructor?.name;
 if(name!=='WorldConfig' && app?.options?.id!=='world-config')return false;
 const root=html?.querySelector?html:html?.[0]??app.element;
 const field=root?.querySelector?.('input[name="background"]');if(!field)return false;
 const apply=()=>{field.value=GENESYS_JOIN_BACKGROUND;field.readOnly=true;};apply();
 const form=field.form??root;
 if(!form.dataset.genesysJoinBackground){
  form.dataset.genesysJoinBackground='true';
  form.addEventListener('submit',apply,{capture:true});
  field.addEventListener('change',apply);
 }
 for(const button of root.querySelectorAll('[data-target="background"]'))button.disabled=true;
 return true;
}
Hooks.on('renderWorldConfig',bindWorldBackground);
Hooks.on('renderApplication',bindWorldBackground);
Hooks.on('renderApplicationV2',bindWorldBackground);

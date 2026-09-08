const TYPES=new Set(['image/png','image/jpeg','image/webp']);
export function validateAdversaryImage(file){
 if(!file||!TYPES.has(file.type))throw Error('Choose a PNG, JPEG or WebP image.');
 if(file.size>20*1024*1024)throw Error('Choose an image smaller than 20 MB.');
 return file;
}
export async function uploadAdversaryImage(file){
 validateAdversaryImage(file);
 const decoded=await createImageBitmap(file);decoded.close();
 const picker=foundry.applications.apps.FilePicker.implementation;
 const dir='genesys-adversaries';
 try{await picker.browse('data',dir);}catch{await picker.createDirectory('data',dir,{notify:false});}
 const extension={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[file.type];
 const named=new File([file],`${foundry.utils.randomID()}-${Date.now()}.${extension}`,{type:file.type});
 const result=await picker.upload('data',dir,named,{}, {notify:false});
 const path=typeof result==='string'?result:result?.path;
 if(!path)throw Error('Image upload failed. No NPC was created.');
 return path;
}

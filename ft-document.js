/* Duas capturas, uma evidência compatível com o cadastro atual. */
(function(root){
 'use strict';
 function validatePair(front,back,hasExisting){
  if(!front&&!back){if(hasExisting)return false;throw new Error('Anexe a frente e o verso do documento com foto.');}
  if(!front||!back)throw new Error('Selecione as duas fotos: frente e verso do documento.');
  if(!front.type?.startsWith('image/')||!back.type?.startsWith('image/'))throw new Error('Frente e verso devem ser arquivos de imagem.');
  return true;
 }
 async function compose(front,back){
  const images=[];
  try{
   images.push(await createImageBitmap(front));images.push(await createImageBitmap(back));
   const width=1400,padding=30,title=60;
   const heights=images.map(img=>Math.round(img.height*((width-padding*2)/img.width)));
   const canvas=document.createElement('canvas');canvas.width=width;canvas.height=heights.reduce((a,b)=>a+b,0)+padding*3+title*2;
   if(canvas.height>14000)throw new Error('Use fotos do documento mais próximas, sem áreas vazias ao redor.');
   const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Não foi possível preparar as fotos.');
   ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);let y=padding;
   images.forEach((img,i)=>{ctx.fillStyle='#17324d';ctx.font='bold 36px Arial';ctx.fillText(i===0?'DOCUMENTO — FRENTE':'DOCUMENTO — VERSO',padding,y+40);y+=title;ctx.drawImage(img,padding,y,width-padding*2,heights[i]);y+=heights[i]+padding;});
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.9));if(!blob)throw new Error('Não foi possível preparar a frente e o verso.');
   return new File([blob],'documento-frente-verso-'+Date.now()+'.jpg',{type:'image/jpeg'});
  }finally{images.forEach(image=>image.close?.());}
 }
 root.FTDocument={validatePair,compose};
 if(typeof document==='undefined')return;
 let source,front,back;
 function setup(){
  const files=document.querySelector('#launch .files');if(!files)return;
  source=document.getElementById('documentCombinedFile')||files.querySelectorAll('input[type=file]')[4];if(!source)return;
  source.id='documentCombinedFile';source.hidden=true;source.setAttribute('aria-hidden','true');
  const legacyField=source.closest('.field');if(legacyField){legacyField.hidden=true;legacyField.style.display='none';}
  if(document.getElementById('documentSides'))return;
  const box=document.createElement('div');box.id='documentSides';box.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:16px;margin-top:20px';
  const docIcon='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline-block;vertical-align:middle;flex-shrink:0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>';
  box.innerHTML='<div role="heading" aria-level="3" style="grid-column:1/-1;display:flex;align-items:center;gap:8px;font-weight:700">'+docIcon+' Documento com foto — frente e verso</div><div class="field"><label for="documentFront" style="display:flex;align-items:center;gap:8px">'+docIcon+' Frente do documento</label><input id="documentFront" type="file" accept="image/*"><span class="smallmuted">Selecione a foto da frente.</span></div><div class="field"><label for="documentBack" style="display:flex;align-items:center;gap:8px">'+docIcon+' Verso do documento</label><input id="documentBack" type="file" accept="image/*"><span class="smallmuted">Selecione a foto do verso.</span></div><p class="smallmuted" style="grid-column:1/-1">As duas fotos ficarão vinculadas à mesma FT. Em correções, deixe os dois campos vazios para manter o documento já enviado.</p>';
  files.insertAdjacentElement('afterend',box);front=box.querySelector('#documentFront');back=box.querySelector('#documentBack');
 }
 const save=root.saveFT;
 if(typeof save==='function')root.saveFT=async function(btn){
  setup();if(!source||!front||!back)return save.apply(this,arguments);
  if(root.__ftSending||root.__documentPreparing)return;
  root.__documentPreparing=true;const previous=btn?.textContent;
  try{
   if(btn){btn.disabled=true;btn.textContent='Preparando documento...';}
   const a=front.files?.[0],b=back.files?.[0];
   if(validatePair(a,b,!!(root.__editingDraft||root.__editingCorrection))){
    const combined=await compose(a,b);const transfer=new DataTransfer();transfer.items.add(combined);source.files=transfer.files;
   }
   front.disabled=true;back.disabled=true;
   return await save.apply(this,arguments);
  }catch(error){alert(error.message||'Não foi possível preparar o documento.');}
  finally{root.__documentPreparing=false;front.disabled=false;back.disabled=false;if(btn){btn.disabled=false;if(btn.textContent==='Preparando documento...')btn.textContent=previous;}}
 };
 const open=root.openView;
 if(typeof open==='function')root.openView=function(view){const result=open.apply(this,arguments);if(view==='launch'){setup();if(source)source.value='';if(front)front.value='';if(back)back.value='';}return result;};
 document.addEventListener('DOMContentLoaded',setup);
})(typeof window==='undefined'?globalThis:window);

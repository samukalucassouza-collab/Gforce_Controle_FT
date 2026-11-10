/* GFORCE FT - Devolução de PIX incorreto; requer migração SQL correspondente. */
(function(){
 const escapeText=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const currentRole=()=>window.currentUser?.dbRole || (typeof currentUser!=='undefined'?currentUser?.dbRole:null);
 const database=()=>typeof ftDb==='function'?ftDb():null;
 async function reload(){if(typeof loadCloud==='function')await loadCloud();else location.reload();}
 window.returnWrongPix=async function(id){
  if(!['financeiro','administrador'].includes(currentRole()))return alert('Acesso restrito ao Financeiro.');
  const motivo=prompt('Informe o motivo da devolução (ex.: Chave PIX incorreta):','Chave PIX incorreta');
  if(motivo===null)return;
  if(motivo.trim().length<5)return alert('Informe uma justificativa detalhada.');
  if(!confirm('Devolver esta FT ao supervisor para correção do PIX? Ela ficará bloqueada para pagamento.'))return;
  try{const {error}=await database().rpc('finance_return_wrong_pix',{p_ft:id,p_motivo:motivo.trim()});if(error)throw error;alert('FT devolvida ao supervisor.');await reload();}
  catch(e){alert('Não foi possível devolver a FT: '+(e.message||e));}
 };
 window.correctReturnedPix=async function(id){
  if(!['supervisor','administrador'].includes(currentRole()))return alert('Acesso restrito ao supervisor.');
  const row=typeof fts!=='undefined'?fts.find(x=>x.dbid===id):null;
  if(!row)return alert('FT não localizada.');
  const tipo=prompt('Tipo de chave PIX (CPF, E-mail, Telefone ou Aleatória):',row.pixtype||'CPF');
  if(tipo===null)return;
  const chave=prompt('Informe a chave PIX corrigida:',row.pix||'');
  if(chave===null)return;
  if(!tipo.trim()||chave.trim().length<3)return alert('Preencha o tipo e a chave PIX.');
  if(!confirm('Reenviar FT ao Financeiro com o PIX corrigido?'))return;
  try{const {error}=await database().rpc('supervisor_correct_pix',{p_ft:id,p_tipo_pix:tipo.trim(),p_chave_pix:chave.trim()});if(error)throw error;alert('PIX corrigido. FT reenviada ao Financeiro.');await reload();}
  catch(e){alert('Não foi possível corrigir o PIX: '+(e.message||e));}
 };
 function decorateFinance(){
  if(!['financeiro','administrador'].includes(currentRole()))return;
  document.querySelectorAll('#batchPayList .batch-pay-card').forEach((card,i)=>{
   const group=window.__batchGroups?.[i]?.[1]||[];
   const labels=card.querySelectorAll('.batch-ft-row');
   labels.forEach((label,j)=>{
    const row=group[j];if(!row||label.querySelector('.return-pix-btn'))return;
    const btn=document.createElement('button');btn.type='button';btn.className='ghost return-pix-btn';
    btn.style.cssText='margin:6px 0;color:#a52b2b;border:1px solid #e4b8b8';
    btn.textContent='↩ Devolver: PIX errado';
    btn.onclick=e=>{e.preventDefault();e.stopPropagation();window.returnWrongPix(row.dbid);};
    label.appendChild(btn);
   });
  });
 }
 function decorateSupervisor(){
  if(!['supervisor','administrador'].includes(currentRole()))return;
  document.querySelectorAll('#consultRows tr').forEach(tr=>{
   const id=tr.querySelector('button[onclick*="correctReturnedPix"]')?.dataset?.id;
   if(id)return;
   const code=tr.cells?.[0]?.textContent?.trim();
   const row=typeof fts!=='undefined'?fts.find(x=>x.id===code&&x.rawStatus==='devolvida_pix'):null;
   if(!row)return;
   const cell=tr.cells[tr.cells.length-1];if(!cell)return;
   const btn=document.createElement('button');btn.className='primary';btn.textContent='✏️ Corrigir PIX';
   btn.onclick=()=>window.correctReturnedPix(row.dbid);
   cell.appendChild(btn);
   const note=document.createElement('div');note.className='smallmuted';
   note.textContent='Financeiro: '+(row.financeObs||'Chave PIX incorreta');
   cell.appendChild(note);
  });
 }
 window.pixDecorateSupervisor=decorateSupervisor;
 function wrap(name,decorate){
  const old=window[name];if(typeof old!=='function'||old.__pixWrapped)return;
  const wrapped=function(...args){const out=old.apply(this,args);decorate();return out;};
  wrapped.__pixWrapped=true;window[name]=wrapped;
 }
 function init(){wrap('renderBatchPayments',decorateFinance);wrap('renderModernViews',decorateSupervisor);decorateFinance();decorateSupervisor();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0));else init();
})();

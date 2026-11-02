/* Painel consultivo: usa somente registros já carregados e não acessa o banco. */
(function (root) {
  'use strict';
  const labels = {rascunho:'Rascunho',aguardando_dp_rh:'Aguardando DP',solicitar_correcao:'Correção solicitada',recusada:'Recusada',autorizada:'Autorizada',aguardando_pagamento:'Aguardando Pagamento',paga:'Paga'};
  const statusOf = row => row.rawStatus || Object.keys(labels).find(key => labels[key] === row.status) || '';
  const amount = row => Number.isFinite(Number(row.value)) ? Number(row.value) : 0;
  const sum = rows => rows.reduce((total, row) => total + Math.round(amount(row)*100), 0) / 100;
  function scope(rows, user) {
    if (!user || !['administrador','supervisor','dp_rh','financeiro'].includes(user.dbRole)) return [];
    return user.dbRole === 'supervisor' ? rows.filter(row => row.supervisor_id === user.authId) : rows.slice();
  }
  function filter(rows, f) {
    return rows.filter(row => (!f.from || String(row.date||'') >= f.from) && (!f.to || String(row.date||'') <= f.to) && (!f.supervisor || (row.supervisor_id||row.supervisor) === f.supervisor) && (!f.unit || row.unit === f.unit) && (!f.reason || row.reason === f.reason) && (!f.status || statusOf(row) === f.status));
  }
  function summarize(rows) {
    const active = rows.filter(row => !['rascunho','recusada'].includes(statusOf(row)));
    const paid = active.filter(row => statusOf(row) === 'paga');
    const awaiting = active.filter(row => ['autorizada','aguardando_pagamento'].includes(statusOf(row)));
    return {total:active.length, validation:active.filter(row=>statusOf(row)==='aguardando_dp_rh').length, correction:active.filter(row=>statusOf(row)==='solicitar_correcao').length, awaiting:awaiting.length, paid:paid.length, value:sum(active), paidValue:sum(paid), awaitingValue:sum(awaiting), paidRate:active.length?paid.length/active.length*100:null, average:active.length?sum(active)/active.length:null};
  }
  function ranking(rows, sortBy) {
    const map = new Map();
    for (const row of rows) {
      if (['rascunho','recusada'].includes(statusOf(row))) continue;
      const key = row.supervisor_id || row.supervisor || 'Sem identificação';
      const item = map.get(key) || {name:row.supervisor||'Sem identificação',count:0,cents:0};
      item.count++;item.cents+=Math.round(amount(row)*100);map.set(key,item);
    }
    const list = [...map.values()].map(item=>({...item,value:item.cents/100}));
    return list.sort((a,b)=>(sortBy==='value'?b.value-a.value:sortBy==='least'?a.count-b.count:b.count-a.count)||a.name.localeCompare(b.name,'pt-BR'));
  }
  root.FTDashboard = {scope,filter,summarize,ranking,statusOf};
  if (typeof document === 'undefined') return;
  const money = value => value == null ? '—' : new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);
  const esc = value => String(value??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function renderPanel() {
    const home = document.getElementById('home');if(!home)return;
    const user = typeof currentUser !== 'undefined' ? currentUser : null;
    const all = typeof fts !== 'undefined' ? fts : [];
    let panel = document.getElementById('ftIndicators');
    if (!panel) {
      panel = document.createElement('section');panel.id='ftIndicators';panel.className='panel ft-indicators';
      panel.innerHTML=`<div class="ft-panel-heading"><div><h2>Indicadores de FTs</h2><p>Visão do período por data da FT</p></div><button type="button" class="ghost" id="ftClearFilters">Limpar filtros</button></div><div class="ft-filters"><label>Data inicial<input type="date" lang="pt-BR" id="ftKpiFrom"></label><label>Data final<input type="date" lang="pt-BR" id="ftKpiTo"></label><label id="ftSupervisorFilter">Supervisor<select id="ftKpiSupervisor"></select></label><label>Unidade<select id="ftKpiUnit"></select></label><label>Motivo<select id="ftKpiReason"></select></label><label>Status<select id="ftKpiStatus"><option value="">Todos</option>${Object.entries(labels).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label></div><p class="ft-filter-error" id="ftKpiError" role="alert" hidden></p><p class="ft-kpi-context" id="ftKpiContext" role="status" aria-live="polite"></p><div class="ft-kpi-grid" id="ftKpiCards"></div><div class="ft-ranking-head"><h3>Ranking de Supervisores</h3><label>Ordenar por<select id="ftRankSort"><option value="count">Mais FTs</option><option value="least">Menos FTs</option><option value="value">Maior valor lançado</option></select></label></div><div class="ft-ranking-scroll"><table><thead><tr><th>Posição</th><th>Supervisor</th><th>FTs</th><th>Valor lançado</th></tr></thead><tbody id="ftKpiRanking"></tbody></table></div><p class="ft-kpi-note">Rascunhos e recusadas não compõem os indicadores nem o ranking. Taxa de pagamento = FTs pagas ÷ FTs consideradas. Os valores seguem a data da FT, inclusive os pagamentos.</p>`;
      home.appendChild(panel);
      panel.addEventListener('change',renderPanel);
      panel.querySelector('#ftClearFilters').addEventListener('click',()=>{panel.querySelectorAll('.ft-filters input,.ft-filters select').forEach(el=>el.value='');renderPanel()});
    }
    const visible = !!user && ['administrador','supervisor','dp_rh','financeiro'].includes(user.dbRole);
    panel.hidden=!visible;home.classList.toggle('ft-has-indicators',visible);if(!visible)return;
    const rows=scope(all,user), byId=id=>document.getElementById(id);
    function options(id, entries) {
      const select=byId(id),prev=select.value;
      const list=[...new Map(entries).entries()].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'));
      select.innerHTML='<option value="">Todos</option>'+list.map(([value,label])=>`<option value="${esc(value)}">${esc(label)}</option>`).join('');
      if(list.some(([value])=>value===prev))select.value=prev;
    }
    options('ftKpiSupervisor',rows.map(row=>[row.supervisor_id||row.supervisor,row.supervisor||'Sem identificação']).filter(([key])=>key));
    options('ftKpiUnit',rows.map(row=>[row.unit,row.unit]).filter(([key])=>key));
    options('ftKpiReason',rows.map(row=>[row.reason,row.reason]).filter(([key])=>key));
    byId('ftSupervisorFilter').hidden=user.dbRole==='supervisor';
    const filters={from:byId('ftKpiFrom').value,to:byId('ftKpiTo').value,supervisor:byId('ftKpiSupervisor').value,unit:byId('ftKpiUnit').value,reason:byId('ftKpiReason').value,status:byId('ftKpiStatus').value};
    const invalid=!!(filters.from&&filters.to&&filters.from>filters.to);
    byId('ftKpiError').hidden=!invalid;byId('ftKpiError').textContent=invalid?'A data final deve ser igual ou posterior à data inicial.':'';
    const selected=invalid?[]:filter(rows,filters),m=summarize(selected);
    byId('ftKpiContext').textContent=invalid?'Ajuste as datas para consultar.':`${m.total} FT(s) consideradas · ${selected.length-m.total} rascunho(s) ou recusada(s) fora dos totais · ${user.dbRole==='supervisor'?'Somente suas FTs':'Registros disponíveis para seu acesso'}`;
    const metrics=[['FTs lançadas',m.total],['Aguardando DP',m.validation],['Em correção',m.correction],['Aguardando pagamento',m.awaiting],['FTs pagas',m.paid],['Valor lançado',money(m.value)],['Valor pago',money(m.paidValue)],['Valor a pagar',money(m.awaitingValue)],['Taxa de pagamento',m.paidRate==null?'—':m.paidRate.toLocaleString('pt-BR',{maximumFractionDigits:1})+'%'],['Valor médio por FT',money(m.average)]];
    byId('ftKpiCards').innerHTML=metrics.map(([label,value])=>`<article class="ft-kpi-card"><span>${label}</span><strong>${invalid?'—':esc(value)}</strong></article>`).join('');
    const ranked=ranking(selected,byId('ftRankSort').value);
    byId('ftKpiRanking').innerHTML=ranked.map((row,index)=>`<tr><td>${index+1}º</td><td>${esc(row.name)}</td><td>${row.count}</td><td>${money(row.value)}</td></tr>`).join('')||'<tr><td colspan="4">Nenhuma FT encontrada para os filtros.</td></tr>';
  }
  root.renderFTDashboard=renderPanel;
  for (const name of ['render','applyPermissions','goHome','logout']) {
    if(typeof root[name]==='function') {
      const original=root[name];root[name]=function(...args){const result=original.apply(this,args);if(result&&typeof result.then==='function')return result.then(value=>{renderPanel();return value});renderPanel();return result};
    }
  }
  document.addEventListener('DOMContentLoaded',renderPanel);
})(typeof window==='undefined'?globalThis:window);

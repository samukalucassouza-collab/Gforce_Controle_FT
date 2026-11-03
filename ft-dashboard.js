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
  function chartData(rows) {
    const active=rows.filter(row=>!['rascunho','recusada'].includes(statusOf(row)));
    const statuses=new Map(),reasons=new Map(),months=new Map();
    for(const row of active){const status=statusOf(row)||'outro';statuses.set(status,(statuses.get(status)||0)+1);const reason=row.reason||'Sem motivo';reasons.set(reason,(reasons.get(reason)||0)+1);const month=String(row.date||'').slice(0,7);if(/^\d{4}-\d{2}$/.test(month))months.set(month,(months.get(month)||0)+Math.round(amount(row)*100));}
    return {statuses:[...statuses],reasons:[...reasons].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'pt-BR')),months:[...months].sort((a,b)=>a[0].localeCompare(b[0])).map(([month,cents])=>[month,cents/100])};
  }
  root.FTDashboard = {scope,filter,summarize,ranking,statusOf,chartData};
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
      panel.innerHTML=`<div class="ft-panel-heading"><div><h2>Indicadores de FTs</h2><p>Visão do período por data da FT</p></div><div class="ft-panel-actions"><button type="button" class="ghost" id="ftClearFilters">Limpar filtros</button></div></div><div class="ft-filters"><label>Data inicial<input type="date" lang="pt-BR" id="ftKpiFrom"></label><label>Data final<input type="date" lang="pt-BR" id="ftKpiTo"></label><label id="ftSupervisorFilter">Supervisor<select id="ftKpiSupervisor"></select></label><label>Unidade<select id="ftKpiUnit"></select></label><label>Motivo<select id="ftKpiReason"></select></label><label>Status<select id="ftKpiStatus"><option value="">Todos</option>${Object.entries(labels).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label></div><p class="ft-filter-error" id="ftKpiError" role="alert" hidden></p><p class="ft-kpi-context" id="ftKpiContext" role="status" aria-live="polite"></p><div class="ft-kpi-grid" id="ftKpiCards"></div><div class="ft-chart-grid" id="ftKpiCharts"></div><div class="ft-ranking-head"><h3>Ranking de Supervisores</h3><label>Ordenar por<select id="ftRankSort"><option value="count">Mais FTs</option><option value="least">Menos FTs</option><option value="value">Maior valor lançado</option></select></label></div><div class="ft-ranking-scroll"><table><thead><tr><th>Posição</th><th>Supervisor</th><th>FTs</th><th>Valor lançado</th></tr></thead><tbody id="ftKpiRanking"></tbody></table></div><p class="ft-kpi-note">Rascunhos e recusadas não compõem os indicadores nem o ranking. Taxa de pagamento = FTs pagas ÷ FTs consideradas. Os valores seguem a data da FT, inclusive os pagamentos.</p>`;
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
    byId('ftKpiCharts').innerHTML=renderCharts(selected);
    const ranked=ranking(selected,byId('ftRankSort').value);
    byId('ftKpiRanking').innerHTML=ranked.map((row,index)=>`<tr><td>${index+1}º</td><td>${esc(row.name)}</td><td>${row.count}</td><td>${money(row.value)}</td></tr>`).join('')||'<tr><td colspan="4">Nenhuma FT encontrada para os filtros.</td></tr>';
  }
  function renderCharts(rows) {
    const data=chartData(rows),colors={paga:'#07956b',autorizada:'#347ad5',aguardando_pagamento:'#6c64db',aguardando_dp_rh:'#d18a17',solicitar_correcao:'#d25868'},empty='<p class="ft-chart-empty">Sem FTs para os filtros selecionados.</p>';
    const total=data.statuses.reduce((sum,[,n])=>sum+n,0);let offset=0;
    const arcs=data.statuses.map(([status,count])=>{const length=count/total*100;const svg='<circle cx="65" cy="65" r="48" fill="none" stroke="'+(colors[status]||'#76889d')+'" stroke-width="15" pathLength="100" stroke-dasharray="'+length+' '+(100-length)+'" stroke-dashoffset="'+(-offset)+'" transform="rotate(-90 65 65)"><title>'+esc(labels[status]||status)+': '+count+'</title></circle>';offset+=length;return svg}).join('');
    const donut=total?'<div class="ft-donut-layout"><svg viewBox="0 0 130 130" role="img" aria-label="Distribuição das '+total+' FTs por status">'+arcs+'<text x="65" y="63" text-anchor="middle" class="ft-donut-total">'+total+'</text><text x="65" y="82" text-anchor="middle" class="ft-donut-caption">FTs</text></svg><div class="ft-chart-legend">'+data.statuses.map(([status,count])=>'<div><i style="background:'+(colors[status]||'#76889d')+'"></i><span>'+esc(labels[status]||status)+'</span><b>'+count+'</b></div>').join('')+'</div></div>':empty;
    const max=Math.max(1,...data.reasons.map(([,n])=>n));
    const reasons=data.reasons.length?'<div class="ft-reason-chart">'+data.reasons.map(([name,count])=>'<div class="ft-chart-bar-row"><div><span>'+esc(name)+'</span><b>'+count+'</b></div><div class="ft-chart-track"><div style="width:'+count/max*100+'%"></div></div></div>').join('')+'</div>':empty;
    const months=data.months;let trend=empty;
    if(months.length){
      const w=560,h=180,left=18,right=542,top=15,bottom=145,peak=Math.max(1,...months.map(([,v])=>v));
      const point=(i,v)=>[months.length===1?w/2:left+i/(months.length-1)*(right-left),bottom-v/peak*(bottom-top)];
      const points=months.map(([,v],i)=>point(i,v));const poly=points.map(p=>p.join(',')).join(' ');
      const label=month=>month.slice(5)+'/'+month.slice(0,4);
      trend='<svg class="ft-trend" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Evolução mensal dos valores lançados"><line x1="18" y1="145" x2="542" y2="145" stroke="#d9e4ee"/><polygon points="'+points[0][0]+',145 '+poly+' '+points[points.length-1][0]+',145" fill="#e4effb"/><polyline points="'+poly+'" fill="none" stroke="#347ad5" stroke-width="3" stroke-linejoin="round"/>'+points.map(([x,y],i)=>'<circle cx="'+x+'" cy="'+y+'" r="4" fill="#347ad5"><title>'+label(months[i][0])+': '+money(months[i][1])+'</title></circle>').join('')+'<text x="18" y="173" class="ft-axis">'+label(months[0][0])+'</text><text x="542" y="173" text-anchor="end" class="ft-axis">'+label(months[months.length-1][0])+'</text></svg><div class="ft-month-values">'+months.map(([m,v])=>'<span>'+label(m)+' <b>'+money(v)+'</b></span>').join('')+'</div>';
    }
    return '<article class="ft-chart-card"><h3>Status das FTs</h3>'+donut+'</article><article class="ft-chart-card"><h3>FTs por motivo</h3>'+reasons+'</article><article class="ft-chart-card ft-chart-wide"><h3>Evolução mensal dos valores lançados</h3><p class="ft-chart-subtitle">Soma por mês da data da FT · '+months.length+' mês(es) com lançamentos</p>'+trend+'</article>';
  }
  root.renderFTDashboard=renderPanel;
  for (const name of ['render','applyPermissions','goHome','logout']) {
    if(typeof root[name]==='function') {
      const original=root[name];root[name]=function(...args){const result=original.apply(this,args);if(result&&typeof result.then==='function')return result.then(value=>{renderPanel();return value});renderPanel();return result};
    }
  }
  document.addEventListener('DOMContentLoaded',renderPanel);
})(typeof window==='undefined'?globalThis:window);

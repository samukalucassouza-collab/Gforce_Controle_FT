const {test}=require('node:test');const assert=require('node:assert/strict');
require('../ft-dashboard.js');const d=globalThis.FTDashboard;
const rows=[
 {date:'2026-10-01',supervisor_id:'a',supervisor:'Ana',unit:'Loja A',reason:'Apoio',value:130,rawStatus:'paga'},
 {date:'2026-10-31',supervisor_id:'a',supervisor:'Ana',unit:'Loja B',reason:'Falta',value:140,rawStatus:'autorizada'},
 {date:'2026-10-15',supervisor_id:'b',supervisor:'Bruno',unit:'Loja A',reason:'Apoio',value:100,rawStatus:'aguardando_pagamento'},
 {date:'2026-10-15',supervisor_id:'b',supervisor:'Bruno',unit:'Loja A',reason:'Apoio',value:100,rawStatus:'aguardando_dp_rh'},
 {date:'2026-11-01',supervisor_id:'b',supervisor:'Bruno',unit:'Loja A',reason:'Falta',value:130,rawStatus:'solicitar_correcao'},
 {date:'2026-10-10',supervisor_id:'b',supervisor:'Bruno',unit:'Loja A',reason:'Apoio',value:999,rawStatus:'rascunho'},
 {date:'2026-10-10',supervisor_id:'b',supervisor:'Bruno',unit:'Loja A',reason:'Apoio',value:999,rawStatus:'recusada'}];
test('dez indicadores e exclusão de rascunhos e recusadas',()=>{assert.deepEqual(d.summarize(rows),{total:5,validation:1,correction:1,awaiting:2,paid:1,value:600,paidValue:130,awaitingValue:240,paidRate:20,average:120})});
test('datas inclusivas e filtros combinados',()=>{const r=d.filter(rows,{from:'2026-10-01',to:'2026-10-31',supervisor:'a',unit:'Loja A',reason:'Apoio',status:'paga'});assert.deepEqual(r,[rows[0]]);assert.equal(d.filter(rows,{from:'2026-10-01',to:'2026-10-31'}).length,6)});
test('supervisor vê apenas seu escopo, sem mudar o original',()=>{const before=JSON.stringify(rows);assert.equal(d.scope(rows,{dbRole:'supervisor',authId:'a'}).length,2);assert.equal(d.scope(rows,null).length,0);assert.equal(d.scope(rows,{dbRole:'outro'}).length,0);assert.equal(d.scope(rows,{dbRole:'administrador'}).length,7);assert.equal(JSON.stringify(rows),before)});
test('ranking por quantidade, valor e menor quantidade',()=>{assert.equal(d.ranking(rows,'count')[0].name,'Bruno');assert.equal(d.ranking(rows,'least')[0].name,'Ana');assert.equal(d.ranking(rows,'value')[0].value,330)});
test('vazio, rótulos antigos e arredondamento monetário',()=>{assert.equal(d.summarize([]).paidRate,null);assert.equal(d.summarize([]).average,null);assert.equal(d.summarize([{status:'Paga',value:.1},{status:'Paga',value:.2}]).value,.3)});
test('filtros e cálculos não modificam dados nem fazem gravações',()=>{const before=JSON.stringify(rows);d.ranking(d.filter(rows,{}),'value');d.summarize(rows);assert.equal(JSON.stringify(rows),before)});

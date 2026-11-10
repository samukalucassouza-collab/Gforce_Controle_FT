-- GFORCE FT: devolução de PIX incorreto (proposta para revisão, NÃO aplicada)
-- Fluxo: financeiro -> supervisor -> financeiro, preservando histórico.
-- Antes de executar: revisar políticas RLS, funções submit_ft e finance_pay_batch.
-- Nunca reabrir FT paga.
BEGIN;
ALTER TYPE ft.ft_status ADD VALUE IF NOT EXISTS 'devolvida_pix';
COMMIT;
-- A implementação completa requer transições atômicas e validação de permissões:
-- 1. Financeiro só devolve FTs autorizadas/aguardando_pagamento.
-- 2. Justificativa obrigatória, gravada em ft.historico.
-- 3. Supervisor altera apenas tipo_pix/chave_pix e reenvia ao Financeiro.
-- 4. Bloquear pagamento de devolvida_pix até reenvio validado.
-- 5. Não publicar esta migração isoladamente.

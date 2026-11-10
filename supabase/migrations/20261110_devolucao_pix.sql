-- Revisar e aplicar ao Supabase ANTES de publicar o frontend.
ALTER TYPE ft.ft_status ADD VALUE IF NOT EXISTS 'devolvida_pix';

CREATE OR REPLACE FUNCTION ft.finance_return_wrong_pix(p_ft uuid,p_motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=ft,public AS $$
DECLARE v_status ft.ft_status;
BEGIN
 IF ft.current_role() NOT IN ('administrador','financeiro') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 IF length(btrim(coalesce(p_motivo,''))) < 5 THEN RAISE EXCEPTION 'Informe o motivo da devolução'; END IF;
 SELECT status INTO v_status FROM ft.fts WHERE id=p_ft FOR UPDATE;
 IF NOT FOUND OR v_status NOT IN ('autorizada','aguardando_pagamento') THEN RAISE EXCEPTION 'FT não disponível para devolução'; END IF;
 UPDATE ft.fts SET status='devolvida_pix',obs_financeiro=btrim(p_motivo),financeiro_id=auth.uid(),updated_at=now() WHERE id=p_ft;
 INSERT INTO ft.historico(ft_id,usuario_id,acao,status_anterior,status_novo,observacao)
 VALUES(p_ft,auth.uid(),'devolucao_pix',v_status,'devolvida_pix',btrim(p_motivo));
END $$;

CREATE OR REPLACE FUNCTION ft.supervisor_correct_pix(p_ft uuid,p_tipo_pix text,p_chave_pix text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=ft,public AS $$
DECLARE v_status ft.ft_status; v_owner uuid;
BEGIN
 IF ft.current_role() NOT IN ('administrador','supervisor') THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 IF length(btrim(coalesce(p_tipo_pix,'')))=0 OR length(btrim(coalesce(p_chave_pix,'')))<3 THEN RAISE EXCEPTION 'Informe o tipo e a chave PIX'; END IF;
 SELECT status,supervisor_id INTO v_status,v_owner FROM ft.fts WHERE id=p_ft FOR UPDATE;
 IF NOT FOUND OR v_status <> 'devolvida_pix' THEN RAISE EXCEPTION 'FT não disponível para correção de PIX'; END IF;
 IF v_owner<>auth.uid() AND ft.current_role()<>'administrador' THEN RAISE EXCEPTION 'FT pertence a outro supervisor'; END IF;
 UPDATE ft.fts SET tipo_pix=btrim(p_tipo_pix),chave_pix=btrim(p_chave_pix),status='autorizada',updated_at=now() WHERE id=p_ft;
 INSERT INTO ft.historico(ft_id,usuario_id,acao,status_anterior,status_novo,observacao)
 VALUES(p_ft,auth.uid(),'correcao_pix',v_status,'autorizada','Chave PIX corrigida e reenviada ao Financeiro');
END $$;
REVOKE ALL ON FUNCTION ft.finance_return_wrong_pix(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION ft.supervisor_correct_pix(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION ft.finance_return_wrong_pix(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION ft.supervisor_correct_pix(uuid,text,text) TO authenticated;

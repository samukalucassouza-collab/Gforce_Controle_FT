# GFORCE FT — versão para validação

Base: commit f84a6f2627600cf53dd1582652bb78a95a179457 do repositório Gforce_Controle_FT (19/10/2026). Não foi confirmada equivalência com o deploy atual do Netlify. A cópia antiga do ChatGPT Sites, de 28/09, não foi substituída.

## Alterações

Painel consultivo com filtros por data da FT, supervisor, unidade, motivo e status. Dez indicadores: FTs lançadas, aguardando DP, em correção, aguardando pagamento, FTs pagas, valor lançado, valor pago, valor a pagar, taxa de pagamento e valor médio por FT. Ranking por quantidade ou valor lançado; rascunhos e recusadas não entram nos totais. Supervisor visualiza somente suas FTs já carregadas. Não foram alterados acessos, consultas, cadastros ou regras de pagamento. A lista de indicadores é a proposta desta versão para revisão.

Documento com foto: campos separados para frente e verso. Ambas as imagens são preparadas em uma única imagem identificada com as duas faces, usando o tipo de evidência já existente. Assim, a galeria atual do DP exibe ambas sem exigir alteração de tabelas ou novos tipos. Ao corrigir FT existente, não escolher nenhuma nova imagem mantém o documento anterior; escolher uma face exige também a outra. Nenhum documento existente foi migrado ou apagado por esta implementação.

Impressão dos KPIs: botão único abre a impressão do navegador com os 10 indicadores, ranking, filtros e data de emissão, sem incluir formulários ou anexos. O usuário pode escolher Salvar como PDF. Conteúdo do relatório verificado na demonstração; a paginação final depende do navegador e da quantidade de supervisores.

## Verificação concluída

- `node --test tests/*.test.cjs`: 10 testes passaram.
- Sintaxe dos 9 blocos JavaScript originais e dos dois arquivos novos validada.
- Demonstração no navegador com dados fictícios: painel, totais, restrição ao supervisor e campos frente/verso.

## Validação pendente

- Login real e conferência do carregamento completo das FTs, incluindo eventual paginação do banco.
- Envio de uma FT de teste autorizada, documento frente/verso, correção e visualização pelo DP.
- Conferência do layout no celular físico.
- Conferência da lista de indicadores proposta e comparação da base com a versão realmente publicada.

Alterações destinadas à branch feature/painel-indicadores-validacao no GitHub, sem merge na main e sem publicação no Netlify/ChatGPT Sites. Nenhuma escrita foi executada no banco de produção. Os testes de composição de imagem foram simulados; o envio autenticado não foi realizado.

Gráficos: distribuição por status, quantidade por motivo e evolução mensal dos valores lançados. Seguem o mesmo escopo, filtros e exclusões dos indicadores. Incluídos no relatório único de impressão. Testes de agregação e conteúdo do relatório concluídos em demonstração com dados fictícios.

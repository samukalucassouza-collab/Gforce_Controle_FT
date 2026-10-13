# Backup GFORCE Controle FT — preparação segura

Status: **estrutura em preparação; nenhum backup automático foi ativado**.

## Objetivo
Proteger o banco PostgreSQL (esquemas, dados e permissões), os objetos de Storage do bucket `controle-ft` e o código da versão publicada. Uma exportação SQL isolada **não** inclui os bytes das fotos.

## Destino Google Drive existente
- Pasta principal: GFORCE FT - BACKUPS (ID `1qoK4KDdYwkdSvG-RaKJylpo-G-sqF-7c`)
- Diários: `1AVG5lUL4--6H6f4WN13o6kYOY6Zj8GsS`
- Semanais: `1QIhLyAdTLY2l1cu_ukPMqX5ToQXRe9ee`
- Mensais: `1AGEttNzQRWROwS-7FopiLBtun6oqbkmq`
- Versões do Sistema: `1fdOMWyKlU-343A9Sez91hPlO5uLVx8uu`

Não armazenar CPFs, fotos, backups ou segredos neste repositório público. Os arquivos de backup devem ser criptografados **antes** de chegar ao Drive. Chaves e senha de restauração devem ficar fora do repositório e fora do Drive.

## Procedimento a implementar
1. Preparar ambiente isolado com `pg_dump`, cliente de Storage e integração autorizada ao Google Drive.
2. Exportar PostgreSQL em formato customizado (`pg_dump -Fc`) com credenciais somente de leitura/backup adequadas. Incluir esquemas necessários para recuperação, além de `ft`; validar dependências de `auth`, `storage` e funções.
3. Listar recursivamente objetos do bucket `controle-ft`, baixar bytes, conferir contagem e hashes; registrar manifesto.
4. Empacotar código e metadados de versão; criptografar o conjunto com ferramenta autenticada e segredo externo.
5. Transferir para pasta diária/semanal/mensal apropriada e verificar tamanho/hash no destino.
6. Restaurar num **ambiente separado** e confirmar tabelas, FTs, fotos e fluxo de leitura. Nunca restaurar sobre produção durante teste.
7. Só então agendar a execução e estabelecer retenção (sem excluir arquivos automaticamente até validar).

## Dependências e riscos
- A conexão do Google Drive disponível nesta conversa **não** fornece, por si só, autenticação de execução automática fora do ChatGPT.
- A execução recorrente requer um executor autorizado (ex.: GitHub Actions) e credenciais protegidas como secrets; verificar quotas gratuitas e custos antes de ativar.
- O GitHub é público: jamais gravar `DATABASE_URL`, service_role, tokens OAuth, senhas de criptografia ou dados reais em commits, logs ou artifacts públicos.
- Verificar acesso de rede ao Postgres e permissões de Storage; não presumir que a chave anônima permite backup.
- Não modificar produção, RLS, usuários ou registros como parte da configuração de backup.

## Critérios de aceite
- [ ] Backup completo de banco gerado sem erros
- [ ] Todos os objetos de Storage incluídos e conferidos
- [ ] Arquivo criptografado no Drive privado
- [ ] Descriptografia e restauração de teste aprovadas
- [ ] Rotina diária/semanal/mensal automatizada e observável
- [ ] Política de retenção aprovada

Última inspeção: 44 FTs, 257 evidências, 192 históricos e 321 objetos de Storage (valores sujeitos a mudanças).

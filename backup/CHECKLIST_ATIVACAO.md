# Checklist de ativação — backup GFORCE FT

## Estado verificado
- Banco Supabase em produção: `cnuksifownmprsjqowzx`.
- Bucket de anexos: `controle-ft`.
- Contagens de referência: 44 FTs, 257 evidências, 192 eventos de histórico, 321 objetos no Storage.
- Pasta Google Drive já existente e não compartilhada publicamente: `1qoK4KDdYwkdSvG-RaKJylpo-G-sqF-7c`.
- **Ainda não foi criado um backup completo; nenhum agendamento está ativo.**

## Pré-requisitos de execução — fora do repositório
1. Definir executor de backup (runner próprio ou GitHub Actions) e verificar limite gratuito.
2. Criar credencial PostgreSQL com privilégios mínimos para `pg_dump`, com TLS obrigatório. Testar acesso a `ft` e dependências de restauração.
3. Configurar credencial Supabase para listar e baixar todos os objetos do bucket. Não utilizar chave `anon` para supor acesso a objetos privados.
4. Configurar credencial de acesso ao Drive **para automação** (OAuth com refresh token protegido, ou conta de serviço com pasta explicitamente compartilhada). A conexão interativa do ChatGPT não fornece essas credenciais ao runner.
5. Criar segredo de criptografia para backup; guardar chave de recuperação em local separado do Drive.
6. Guardar credenciais em cofre de secrets do executor, nunca em código, logs, artifact ou documento público.

## Execução e verificação
1. Fazer `pg_dump` e verificar integridade do arquivo.
2. Baixar todos os objetos do bucket, comparando a listagem inicial com a final; calcular SHA-256 de cada objeto.
3. Registrar manifesto com contagens, hashes, tamanho, data UTC, commit e status. Não incluir dados pessoais no manifesto.
4. Criptografar backup com cifra autenticada e enviar arquivo para Drive privado.
5. Confirmar upload por listagem/tamanho/hash, sem presumir sucesso apenas pela resposta da API.
6. Fazer download, descriptografar e restaurar em projeto isolado, conferindo FTs, evidências, históricos, fotos e permissões.
7. Ativar agendamento somente após restauração aprovada. Definir retenção e alertas de falha.

## Operação
- Rotina diária: cópia consistente de banco e anexos.
- Semanal/mensal: preservar pontos de recuperação independentes.
- Em falha: **não excluir backup anterior**; emitir alerta e registrar log sem segredos.
- Em restauração: suspender alterações somente após plano de incidente aprovado, sem sobrescrever produção em testes.
- Revisar regularmente compartilhamento da pasta e custos de armazenamento.

## Atenção de segurança independente
`ft.counters` foi sinalizada sem RLS. Não habilitar RLS sem avaliar permissões e políticas usadas pelo app, para evitar interrupção.

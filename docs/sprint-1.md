# Sprint 1 - Supabase schema, migrations e RLS

## Entrega

- Schema inicial completo em `supabase/migrations/202605100001_initial_schema.sql`.
- Configuracao basica do Supabase CLI em `supabase/config.toml`.
- RLS habilitado em todas as tabelas publicas criadas.
- Policies baseadas em `workspace_members`.
- RPC `create_initial_workspace(workspace_name, workspace_currency)` para o Sprint 2.
- Seed local opcional em `supabase/seed.sql`.

## Modelo de seguranca

Toda entidade financeira pertence a um `workspace_id`. Um usuario autenticado so acessa dados se existir registro correspondente em `workspace_members`.

Papeis:

- `owner`: pode ler, escrever, gerenciar membros e excluir workspace.
- `admin`: pode ler, escrever e gerenciar membros que nao sejam owner.
- `member`: pode ler e fazer CRUD de dados financeiros.
- `viewer`: pode apenas visualizar dados do workspace.

As funcoes auxiliares `can_read_workspace`, `can_write_workspace`, `can_admin_workspace` e `is_workspace_owner` centralizam a regra de autorizacao usada pelas policies.

## Workspace inicial

A funcao `create_initial_workspace` e idempotente:

- exige usuario autenticado;
- cria ou atualiza o profile basico;
- se o usuario ja tiver workspace, retorna o primeiro;
- se nao tiver, cria workspace, membership `owner`, categorias padrao e a conta `Conta principal`.

O Sprint 2 deve chamar essa RPC no onboarding ou no primeiro login.

## Como aplicar localmente

Com Node.js e Docker disponiveis:

```powershell
npx supabase start
npx supabase db reset
```

Para parar o ambiente:

```powershell
npx supabase stop
```

## Como aplicar no Supabase remoto

Opcoes:

1. Usar Supabase CLI conectado ao projeto remoto.
2. Executar o SQL de `supabase/migrations/202605100001_initial_schema.sql` no SQL Editor do painel Supabase.

Depois de aplicar, confirme:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Todas as tabelas criadas neste sprint devem retornar `rowsecurity = true`.

## Validacoes recomendadas

- Criar usuarios de teste no Supabase Auth.
- Chamar `select public.create_initial_workspace('Meu workspace');`.
- Confirmar criacao de profile, workspace, membership, categorias e conta principal.
- Testar que viewer falha ao inserir transacao.
- Testar que member consegue CRUD financeiro e falha ao alterar membros.
- Testar que somente owner consegue excluir workspace.

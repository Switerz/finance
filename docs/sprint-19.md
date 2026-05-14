# Sprint 19 — Multi-Workspace

## Objetivo

Permitir que o usuário pertença a múltiplos workspaces, troque entre eles e convide outras pessoas por link.

## Entregas

### Cookie de workspace ativo

`getCurrentWorkspace()` em `lib/queries/workspaces.ts` passou a respeitar um cookie `workspace_id`. Se o cookie aponta para um workspace do qual o usuário é membro, esse workspace é retornado. Caso contrário, faz fallback para o primeiro workspace por ordem de criação (comportamento anterior).

O cookie é definido em 3 momentos:
- Criação de workspace novo (action `createWorkspace`)
- Troca explícita via dropdown (action `switchWorkspace`)
- Aceite de convite (action `acceptInvitation`)
- Exclusão de workspace (action `deleteCurrentWorkspace`) — limpa o cookie

### `createWorkspace` e `switchWorkspace` (`lib/actions/workspaces.ts`)

- **`createWorkspace({ name, currency })`**: cria novo workspace via RPC `create_initial_workspace`, seta cookie, retorna `ActionResult`.
- **`switchWorkspace(workspaceId)`**: valida membership, seta cookie, chama `revalidatePath("/", "layout")`, retorna `ActionResult`.

### WorkspaceSwitcher funcional

`components/layout/workspace-switcher.tsx` passou a ser um wrapper server que busca `getCurrentWorkspace()` e `getUserWorkspaces()` e passa para o novo `workspace-switcher-client.tsx` (client component).

O dropdown mostra todos os workspaces do usuário com checkmark no ativo, e um item "Criar workspace" que abre um Dialog inline com formulário nome + moeda.

Após troca: `router.refresh()`. Após criação: `router.push("/dashboard")`.

### Convites por link (`lib/actions/settings.ts`)

- **`createInvitation({ email, role })`**: cria registro na tabela `invitations` (nova), retorna o `token` no resultado para o frontend gerar o link `/invite/[token]`.
- **`cancelInvitation(id)`**: marca o convite como `cancelled`.

O settings não envia email — o admin copia o link manualmente.

### Página de aceite (`app/invite/[token]/page.tsx`)

Rota pública (fora do grupo `(app)`). Verifica:
- Token inválido / expirado / já aceito: mostra mensagem de erro
- Usuário não autenticado: exibe botão "Fazer login" com `?next=/invite/[token]`
- Email logado diferente do convite: mostra erro de mismatch
- Happy path: mostra botão "Aceitar convite" com form action `acceptInvitation`

`acceptInvitation(formData)` usa o admin client para ler o convite por token (bypass RLS), adiciona o membro via admin client, seta o cookie e redireciona para `/dashboard`.

### Settings — fluxo de convites

`components/settings/settings-client.tsx` substituiu o formulário de "adicionar por email" por um formulário de "convidar". Convites pendentes aparecem em uma tabela com:
- Email, papel, data de expiração
- Botão "Copiar link" (copia `window.location.origin + /invite/ + token` para o clipboard)
- Botão de cancelar

Removido: campo "Emails na allowlist" e a dependência visual no `WORKSPACE_MEMBER_ALLOWLIST`.  
A função `addWorkspaceMemberByEmail` permanece no código mas não é mais exposta na UI.

### Migration (`supabase/migrations/20260513000002_invitations.sql`)

Nova tabela `invitations` com RLS: apenas admins/owners do workspace podem gerenciar convites. Índices em `token` e `(workspace_id, status)` para performance.

### Tipos (`types/finance.ts`)

- Adicionados: `Invitation`, `InvitationRole`, `InvitationStatus`
- `SettingsOverview`: substituiu `allowlistedEmailsCount: number` por `invitations: Invitation[]`

## Verificação

- `npm test` — 217 testes, 0 falhas
- `npm run lint` — 0 erros, 2 warnings conhecidos
- `npm run build` — 0 erros TypeScript, `/invite/[token]` aparece no output de rotas

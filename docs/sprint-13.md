# Sprint 13 - Configurações, membros e workspace

## Entrega

A Sprint 13 transformou `/settings` em uma tela real para perfil, workspace, membros, exportação completa e exclusão definitiva do workspace.

## Implementado

- Tela `/settings` com seções de perfil, workspace, membros, exportação e área de perigo.
- Query `getSettingsOverview()` para carregar perfil, workspace, membros e permissões.
- Actions para atualizar perfil, atualizar workspace, adicionar membro por email, alterar papel, remover membro e excluir workspace.
- Adição de membros por email allowlisted em `WORKSPACE_MEMBER_ALLOWLIST`.
- Uso de `SUPABASE_SERVICE_ROLE_KEY` apenas no servidor para resolver `profiles.email`.
- Exportação JSON completa em `GET /api/export?type=workspace&format=json`.
- Exclusão real do workspace, owner-only, com confirmação pelo nome.

## Regras

- Sem migration.
- Convite completo por email fica fora desta sprint.
- O usuário adicionado precisa ter feito login ao menos uma vez para existir em `profiles`.
- UI não permite criar outro owner.
- Owner não pode ter papel alterado nem ser removido.
- Admins podem gerenciar `admin`, `member` e `viewer`.
- Viewers não persistem alterações.
- Exportação JSON inclui apenas dados do workspace atual.

## Variáveis de ambiente

```env
SUPABASE_SERVICE_ROLE_KEY=
WORKSPACE_MEMBER_ALLOWLIST=pessoa1@email.com,pessoa2@email.com
```

`SUPABASE_SERVICE_ROLE_KEY` não deve ser exposta no client.

## Como testar

```powershell
rtk npm run lint
rtk npm run build
```

Validação manual recomendada:

- Abrir `/settings` como owner/admin/member/viewer.
- Atualizar nome/avatar do perfil.
- Atualizar nome e moeda do workspace como owner/admin.
- Confirmar que member/viewer não edita workspace.
- Adicionar membro por email allowlisted com profile existente.
- Bloquear email fora da allowlist.
- Bloquear email allowlisted sem profile existente.
- Bloquear membro duplicado.
- Alterar papel de admin/member/viewer.
- Impedir mudança para owner.
- Impedir remoção do owner.
- Remover membro não-owner.
- Exportar JSON completo e conferir que só contém dados do workspace atual.
- Confirmar que usuário sem sessão não exporta.
- Excluir workspace como owner digitando o nome exato.
- Bloquear exclusão para admin/member/viewer.
- Após exclusão, redirecionar para `/onboarding`.
- Testar responsividade mobile e desktop.

## Pendências

- Sistema completo de convites por email.
- Troca real entre múltiplos workspaces.
- Restauração automática de backup JSON.
- Testes automatizados de permissões administrativas.

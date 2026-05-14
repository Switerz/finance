-- Tabela de convites para novos membros de workspace.
-- O fluxo é: admin cria convite → copia link → convidado abre link e aceita.
-- Sem envio de email nesta versão — o link é compartilhado manualmente.

create table if not exists public.invitations (
  id            uuid        primary key default gen_random_uuid(),
  workspace_id  uuid        not null references public.workspaces(id) on delete cascade,
  invited_email text        not null,
  invited_by    uuid        not null references public.profiles(id) on delete cascade,
  token         text        not null unique default encode(gen_random_bytes(32), 'hex'),
  role          text        not null default 'member'
                            check (role in ('admin', 'member', 'viewer')),
  status        text        not null default 'pending'
                            check (status in ('pending', 'accepted', 'cancelled')),
  expires_at    timestamptz not null default (now() + interval '7 days'),
  created_at    timestamptz not null default now()
);

alter table public.invitations enable row level security;

-- Apenas admins/owners do workspace podem criar e gerenciar convites.
create policy "admins can manage invitations"
  on public.invitations
  for all
  using  (can_admin_workspace(workspace_id))
  with check (can_admin_workspace(workspace_id));

-- Índices para as queries mais frequentes.
create index if not exists invitations_token_idx
  on public.invitations (token);

create index if not exists invitations_workspace_status_idx
  on public.invitations (workspace_id, status);

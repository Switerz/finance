-- ── notification_preferences ─────────────────────────────────────────────────
-- Armazena quais tipos de alerta o utilizador quer receber por push.
create table public.notification_preferences (
  id                       uuid        primary key default gen_random_uuid(),
  user_id                  uuid        not null references auth.users on delete cascade,
  workspace_id             uuid        not null references public.workspaces on delete cascade,
  notify_subscriptions_due boolean     not null default true,
  notify_goals_late        boolean     not null default true,
  notify_budgets_blown     boolean     not null default true,
  days_before_subscription int         not null default 7
                                         check (days_before_subscription between 1 and 30),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (user_id, workspace_id)
);

alter table public.notification_preferences enable row level security;

create policy "np_select" on public.notification_preferences
  for select using (auth.uid() = user_id);

create policy "np_insert" on public.notification_preferences
  for insert with check (auth.uid() = user_id);

create policy "np_update" on public.notification_preferences
  for update using (auth.uid() = user_id);

-- ── push_subscriptions ────────────────────────────────────────────────────────
-- Armazena o endpoint e as chaves de cada subscrição push por dispositivo.
create table public.push_subscriptions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users on delete cascade,
  workspace_id uuid        not null references public.workspaces on delete cascade,
  endpoint     text        not null,
  p256dh       text        not null,
  auth_key     text        not null,
  created_at   timestamptz not null default now(),
  unique (user_id, workspace_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "ps_select" on public.push_subscriptions
  for select using (auth.uid() = user_id);

create policy "ps_insert" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

create policy "ps_delete" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- Trigger para atualizar updated_at automaticamente
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Só cria o trigger se a função ainda não tiver um trigger na tabela
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_notification_preferences_updated_at'
  ) then
    create trigger set_notification_preferences_updated_at
      before update on public.notification_preferences
      for each row execute function public.set_updated_at();
  end if;
end;
$$;

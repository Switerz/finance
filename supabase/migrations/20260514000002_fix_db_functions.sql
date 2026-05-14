-- Re-apply all critical workspace helper functions and create_initial_workspace.
-- Uses CREATE OR REPLACE so this is safe to run even if functions already exist.

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.workspace_role(target_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select wm.role
  from public.workspace_members wm
  where wm.workspace_id = target_workspace_id
    and wm.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.can_read_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.workspace_role(target_workspace_id) in ('owner', 'admin', 'member', 'viewer');
$$;

create or replace function public.can_write_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.workspace_role(target_workspace_id) in ('owner', 'admin', 'member');
$$;

create or replace function public.can_admin_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.workspace_role(target_workspace_id) in ('owner', 'admin');
$$;

create or replace function public.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.workspace_role(target_workspace_id) = 'owner';
$$;

create or replace function public.shares_workspace_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() = target_user_id
    or exists (
      select 1
      from public.workspace_members current_member
      join public.workspace_members target_member
        on target_member.workspace_id = current_member.workspace_id
      where current_member.user_id = auth.uid()
        and target_member.user_id = target_user_id
    );
$$;

create or replace function public.seed_default_workspace_data(target_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (workspace_id, name, type, color, icon, is_default)
  values
    (target_workspace_id, 'Salario',        'income',      '#078669', 'briefcase-business',  true),
    (target_workspace_id, 'Freelance',      'income',      '#0E7490', 'laptop',              true),
    (target_workspace_id, 'Reembolso',      'income',      '#2563EB', 'receipt',             true),
    (target_workspace_id, 'Rendimentos',    'income',      '#4F46E5', 'trending-up',         true),
    (target_workspace_id, 'Outros',         'income',      '#64748B', 'circle-dollar-sign',  true),
    (target_workspace_id, 'Moradia',        'expense',     '#B42318', 'home',                true),
    (target_workspace_id, 'Alimentacao',    'expense',     '#C2410C', 'utensils',            true),
    (target_workspace_id, 'Transporte',     'expense',     '#B45309', 'car',                 true),
    (target_workspace_id, 'Saude',          'expense',     '#BE123C', 'heart-pulse',         true),
    (target_workspace_id, 'Educacao',       'expense',     '#7C3AED', 'graduation-cap',      true),
    (target_workspace_id, 'Lazer',          'expense',     '#DB2777', 'gamepad-2',           true),
    (target_workspace_id, 'Assinaturas',    'expense',     '#9333EA', 'repeat',              true),
    (target_workspace_id, 'Compras',        'expense',     '#EA580C', 'shopping-bag',        true),
    (target_workspace_id, 'Viagem',         'expense',     '#0891B2', 'plane',               true),
    (target_workspace_id, 'Impostos',       'expense',     '#475569', 'landmark',            true),
    (target_workspace_id, 'Outros',         'expense',     '#64748B', 'circle-dollar-sign',  true),
    (target_workspace_id, 'Renda fixa',     'investment',  '#2563EB', 'badge-dollar-sign',   true),
    (target_workspace_id, 'Renda variavel', 'investment',  '#4F46E5', 'line-chart',          true),
    (target_workspace_id, 'Cripto',         'investment',  '#B45309', 'coins',               true),
    (target_workspace_id, 'Previdencia',    'investment',  '#0F766E', 'shield-check',        true),
    (target_workspace_id, 'Outros',         'investment',  '#64748B', 'piggy-bank',          true)
  on conflict do nothing;

  insert into public.accounts (workspace_id, name, type, initial_balance, current_balance, is_active)
  values (target_workspace_id, 'Conta principal', 'checking', 0, 0, true)
  on conflict do nothing;
end;
$$;

create or replace function public.create_initial_workspace(
  workspace_name text,
  workspace_currency text default 'BRL'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_workspace_id uuid;
  new_workspace_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.profiles (id, email)
  select auth.uid(), auth.email()
  on conflict (id) do update set email = coalesce(public.profiles.email, excluded.email);

  select wm.workspace_id
    into existing_workspace_id
  from public.workspace_members wm
  where wm.user_id = current_user_id
  order by wm.created_at asc
  limit 1;

  if existing_workspace_id is not null then
    return existing_workspace_id;
  end if;

  insert into public.workspaces (name, owner_id, currency)
  values (
    coalesce(nullif(trim(workspace_name), ''), 'Meu workspace'),
    current_user_id,
    coalesce(nullif(trim(workspace_currency), ''), 'BRL')
  )
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, current_user_id, 'owner');

  perform public.seed_default_workspace_data(new_workspace_id);

  return new_workspace_id;
end;
$$;

-- Ensure grants are correct.
grant execute on function public.workspace_role(uuid) to authenticated;
grant execute on function public.can_read_workspace(uuid) to authenticated;
grant execute on function public.can_write_workspace(uuid) to authenticated;
grant execute on function public.can_admin_workspace(uuid) to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.shares_workspace_with(uuid) to authenticated;

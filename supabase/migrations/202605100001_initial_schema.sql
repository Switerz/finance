-- Finance Planner - Sprint 1 initial schema, helpers, seeds, and RLS.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  currency text not null default 'BRL',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create or replace function public.prevent_workspace_owner_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_id <> old.owner_id then
    raise exception 'Workspace owner cannot be changed';
  end if;

  return new;
end;
$$;

create trigger workspaces_prevent_owner_change
before update of owner_id on public.workspaces
for each row execute function public.prevent_workspace_owner_change();

create table public.accounts (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  type text not null check (type in ('checking', 'savings', 'credit_card', 'cash', 'investment', 'other')),
  institution text,
  initial_balance numeric(14,2) not null default 0,
  current_balance numeric(14,2) not null default 0,
  credit_limit numeric(14,2),
  closing_day integer check (closing_day between 1 and 31),
  due_day integer check (due_day between 1 and 31),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense', 'investment', 'transfer')),
  parent_id uuid references public.categories(id) on delete set null,
  color text,
  icon text,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index categories_workspace_id_id_idx on public.categories (workspace_id, id);

create or replace function public.ensure_category_parent_same_workspace()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.parent_id is not null and not exists (
    select 1
    from public.categories parent
    where parent.id = new.parent_id
      and parent.workspace_id = new.workspace_id
  ) then
    raise exception 'Category parent must belong to the same workspace';
  end if;

  return new;
end;
$$;

create trigger categories_parent_same_workspace
before insert or update of workspace_id, parent_id on public.categories
for each row execute function public.ensure_category_parent_same_workspace();

create table public.recurring_rules (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  description text not null,
  amount numeric(14,2) not null,
  type text not null check (type in ('income', 'expense', 'investment')),
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  start_date date not null,
  end_date date,
  day_of_month integer check (day_of_month between 1 and 31),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  description text not null,
  amount numeric(14,2) not null,
  type text not null check (type in ('income', 'expense', 'investment', 'transfer')),
  transaction_date date not null,
  competence_month date,
  payment_method text check (payment_method in ('pix', 'credit_card', 'debit_card', 'cash', 'bank_slip', 'transfer', 'other')),
  status text not null default 'paid' check (status in ('paid', 'pending', 'scheduled', 'cancelled')),
  notes text,
  tags text[],
  is_recurring boolean not null default false,
  recurring_rule_id uuid references public.recurring_rules(id) on delete set null,
  installment_group_id uuid,
  installment_number integer check (installment_number is null or installment_number > 0),
  installment_total integer check (installment_total is null or installment_total > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_installments_valid check (
    (installment_number is null and installment_total is null)
    or (
      installment_number is not null
      and installment_total is not null
      and installment_number <= installment_total
    )
  )
);

create table public.subscriptions (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  amount numeric(14,2) not null,
  billing_cycle text not null check (billing_cycle in ('monthly', 'quarterly', 'yearly')),
  billing_day integer check (billing_day between 1 and 31),
  next_billing_date date,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  importance text check (importance in ('essential', 'useful', 'dispensable')),
  website text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  month date not null,
  planned_amount numeric(14,2) not null,
  alert_threshold numeric(4,3) not null default 0.9 check (alert_threshold > 0 and alert_threshold <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, category_id, month)
);

create table public.goals (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null,
  current_amount numeric(14,2) not null default 0,
  deadline date,
  monthly_contribution numeric(14,2),
  status text not null default 'active' check (status in ('active', 'completed', 'paused', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.imports (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  file_name text,
  source text,
  status text not null check (status in ('uploaded', 'mapped', 'processed', 'failed')),
  total_rows integer check (total_rows is null or total_rows >= 0),
  processed_rows integer check (processed_rows is null or processed_rows >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  entity_type text,
  entity_id uuid,
  action text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

create trigger recurring_rules_set_updated_at
before update on public.recurring_rules
for each row execute function public.set_updated_at();

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create trigger budgets_set_updated_at
before update on public.budgets
for each row execute function public.set_updated_at();

create trigger goals_set_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

create index workspace_members_user_id_workspace_id_idx on public.workspace_members (user_id, workspace_id);
create index workspace_members_workspace_id_role_idx on public.workspace_members (workspace_id, role);

create index accounts_workspace_id_idx on public.accounts (workspace_id);

create index categories_workspace_id_idx on public.categories (workspace_id);
create index categories_parent_id_idx on public.categories (parent_id);
create index categories_workspace_id_type_idx on public.categories (workspace_id, type);

create index transactions_workspace_id_idx on public.transactions (workspace_id);
create index transactions_transaction_date_idx on public.transactions (transaction_date);
create index transactions_category_id_idx on public.transactions (category_id);
create index transactions_account_id_idx on public.transactions (account_id);
create index transactions_workspace_id_transaction_date_idx on public.transactions (workspace_id, transaction_date);

create index recurring_rules_workspace_id_idx on public.recurring_rules (workspace_id);
create index recurring_rules_account_id_idx on public.recurring_rules (account_id);
create index recurring_rules_category_id_idx on public.recurring_rules (category_id);

create index subscriptions_workspace_id_idx on public.subscriptions (workspace_id);
create index subscriptions_account_id_idx on public.subscriptions (account_id);
create index subscriptions_category_id_idx on public.subscriptions (category_id);
create index subscriptions_next_billing_date_idx on public.subscriptions (next_billing_date);

create index budgets_workspace_id_idx on public.budgets (workspace_id);
create index budgets_month_idx on public.budgets (month);
create index budgets_category_id_idx on public.budgets (category_id);
create index budgets_workspace_id_month_idx on public.budgets (workspace_id, month);

create index goals_workspace_id_idx on public.goals (workspace_id);
create index imports_workspace_id_idx on public.imports (workspace_id);
create index imports_created_by_idx on public.imports (created_by);
create index audit_logs_workspace_id_idx on public.audit_logs (workspace_id);
create index audit_logs_user_id_idx on public.audit_logs (user_id);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    new.email
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

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
    (target_workspace_id, 'Salario', 'income', '#078669', 'briefcase-business', true),
    (target_workspace_id, 'Freelance', 'income', '#0E7490', 'laptop', true),
    (target_workspace_id, 'Reembolso', 'income', '#2563EB', 'receipt', true),
    (target_workspace_id, 'Rendimentos', 'income', '#4F46E5', 'trending-up', true),
    (target_workspace_id, 'Outros', 'income', '#64748B', 'circle-dollar-sign', true),
    (target_workspace_id, 'Moradia', 'expense', '#B42318', 'home', true),
    (target_workspace_id, 'Alimentacao', 'expense', '#C2410C', 'utensils', true),
    (target_workspace_id, 'Transporte', 'expense', '#B45309', 'car', true),
    (target_workspace_id, 'Saude', 'expense', '#BE123C', 'heart-pulse', true),
    (target_workspace_id, 'Educacao', 'expense', '#7C3AED', 'graduation-cap', true),
    (target_workspace_id, 'Lazer', 'expense', '#DB2777', 'gamepad-2', true),
    (target_workspace_id, 'Assinaturas', 'expense', '#9333EA', 'repeat', true),
    (target_workspace_id, 'Compras', 'expense', '#EA580C', 'shopping-bag', true),
    (target_workspace_id, 'Viagem', 'expense', '#0891B2', 'plane', true),
    (target_workspace_id, 'Impostos', 'expense', '#475569', 'landmark', true),
    (target_workspace_id, 'Outros', 'expense', '#64748B', 'circle-dollar-sign', true),
    (target_workspace_id, 'Renda fixa', 'investment', '#2563EB', 'badge-dollar-sign', true),
    (target_workspace_id, 'Renda variavel', 'investment', '#4F46E5', 'line-chart', true),
    (target_workspace_id, 'Cripto', 'investment', '#B45309', 'coins', true),
    (target_workspace_id, 'Previdencia', 'investment', '#0F766E', 'shield-check', true),
    (target_workspace_id, 'Outros', 'investment', '#64748B', 'piggy-bank', true)
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

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.subscriptions enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.imports enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select_self_or_shared_workspace
on public.profiles for select
to authenticated
using (public.shares_workspace_with(id));

create policy profiles_insert_self
on public.profiles for insert
to authenticated
with check (id = auth.uid());

create policy profiles_update_self
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy workspaces_select_workspace_members
on public.workspaces for select
to authenticated
using (public.can_read_workspace(id));

create policy workspaces_update_workspace_admins
on public.workspaces for update
to authenticated
using (public.can_admin_workspace(id))
with check (public.can_admin_workspace(id));

create policy workspaces_delete_workspace_owner
on public.workspaces for delete
to authenticated
using (public.is_workspace_owner(id));

create policy workspace_members_select_workspace_members
on public.workspace_members for select
to authenticated
using (public.can_read_workspace(workspace_id));

create policy workspace_members_insert_workspace_admins
on public.workspace_members for insert
to authenticated
with check (
  public.can_admin_workspace(workspace_id)
  and (
    public.is_workspace_owner(workspace_id)
    or role in ('admin', 'member', 'viewer')
  )
);

create policy workspace_members_update_workspace_admins
on public.workspace_members for update
to authenticated
using (
  public.can_admin_workspace(workspace_id)
  and (
    public.is_workspace_owner(workspace_id)
    or role in ('admin', 'member', 'viewer')
  )
)
with check (
  public.can_admin_workspace(workspace_id)
  and (
    public.is_workspace_owner(workspace_id)
    or role in ('admin', 'member', 'viewer')
  )
);

create policy workspace_members_delete_workspace_admins
on public.workspace_members for delete
to authenticated
using (
  public.can_admin_workspace(workspace_id)
  and (
    public.is_workspace_owner(workspace_id)
    or role in ('admin', 'member', 'viewer')
  )
);

create policy accounts_select_workspace_members
on public.accounts for select
to authenticated
using (public.can_read_workspace(workspace_id));

create policy accounts_insert_workspace_writers
on public.accounts for insert
to authenticated
with check (public.can_write_workspace(workspace_id));

create policy accounts_update_workspace_writers
on public.accounts for update
to authenticated
using (public.can_write_workspace(workspace_id))
with check (public.can_write_workspace(workspace_id));

create policy accounts_delete_workspace_writers
on public.accounts for delete
to authenticated
using (public.can_write_workspace(workspace_id));

create policy categories_select_workspace_members
on public.categories for select
to authenticated
using (public.can_read_workspace(workspace_id));

create policy categories_insert_workspace_writers
on public.categories for insert
to authenticated
with check (public.can_write_workspace(workspace_id));

create policy categories_update_workspace_writers
on public.categories for update
to authenticated
using (public.can_write_workspace(workspace_id))
with check (public.can_write_workspace(workspace_id));

create policy categories_delete_workspace_writers
on public.categories for delete
to authenticated
using (public.can_write_workspace(workspace_id));

create policy recurring_rules_select_workspace_members
on public.recurring_rules for select
to authenticated
using (public.can_read_workspace(workspace_id));

create policy recurring_rules_insert_workspace_writers
on public.recurring_rules for insert
to authenticated
with check (public.can_write_workspace(workspace_id));

create policy recurring_rules_update_workspace_writers
on public.recurring_rules for update
to authenticated
using (public.can_write_workspace(workspace_id))
with check (public.can_write_workspace(workspace_id));

create policy recurring_rules_delete_workspace_writers
on public.recurring_rules for delete
to authenticated
using (public.can_write_workspace(workspace_id));

create policy transactions_select_workspace_members
on public.transactions for select
to authenticated
using (public.can_read_workspace(workspace_id));

create policy transactions_insert_workspace_writers
on public.transactions for insert
to authenticated
with check (
  public.can_write_workspace(workspace_id)
  and (created_by is null or created_by = auth.uid())
);

create policy transactions_update_workspace_writers
on public.transactions for update
to authenticated
using (public.can_write_workspace(workspace_id))
with check (public.can_write_workspace(workspace_id));

create policy transactions_delete_workspace_writers
on public.transactions for delete
to authenticated
using (public.can_write_workspace(workspace_id));

create policy subscriptions_select_workspace_members
on public.subscriptions for select
to authenticated
using (public.can_read_workspace(workspace_id));

create policy subscriptions_insert_workspace_writers
on public.subscriptions for insert
to authenticated
with check (public.can_write_workspace(workspace_id));

create policy subscriptions_update_workspace_writers
on public.subscriptions for update
to authenticated
using (public.can_write_workspace(workspace_id))
with check (public.can_write_workspace(workspace_id));

create policy subscriptions_delete_workspace_writers
on public.subscriptions for delete
to authenticated
using (public.can_write_workspace(workspace_id));

create policy budgets_select_workspace_members
on public.budgets for select
to authenticated
using (public.can_read_workspace(workspace_id));

create policy budgets_insert_workspace_writers
on public.budgets for insert
to authenticated
with check (public.can_write_workspace(workspace_id));

create policy budgets_update_workspace_writers
on public.budgets for update
to authenticated
using (public.can_write_workspace(workspace_id))
with check (public.can_write_workspace(workspace_id));

create policy budgets_delete_workspace_writers
on public.budgets for delete
to authenticated
using (public.can_write_workspace(workspace_id));

create policy goals_select_workspace_members
on public.goals for select
to authenticated
using (public.can_read_workspace(workspace_id));

create policy goals_insert_workspace_writers
on public.goals for insert
to authenticated
with check (public.can_write_workspace(workspace_id));

create policy goals_update_workspace_writers
on public.goals for update
to authenticated
using (public.can_write_workspace(workspace_id))
with check (public.can_write_workspace(workspace_id));

create policy goals_delete_workspace_writers
on public.goals for delete
to authenticated
using (public.can_write_workspace(workspace_id));

create policy imports_select_workspace_members
on public.imports for select
to authenticated
using (public.can_read_workspace(workspace_id));

create policy imports_insert_workspace_writers
on public.imports for insert
to authenticated
with check (
  public.can_write_workspace(workspace_id)
  and (created_by is null or created_by = auth.uid())
);

create policy imports_update_workspace_writers
on public.imports for update
to authenticated
using (public.can_write_workspace(workspace_id))
with check (public.can_write_workspace(workspace_id));

create policy imports_delete_workspace_writers
on public.imports for delete
to authenticated
using (public.can_write_workspace(workspace_id));

create policy audit_logs_select_workspace_members
on public.audit_logs for select
to authenticated
using (public.can_read_workspace(workspace_id));

create policy audit_logs_insert_workspace_writers
on public.audit_logs for insert
to authenticated
with check (
  public.can_write_workspace(workspace_id)
  and (user_id is null or user_id = auth.uid())
);

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.prevent_workspace_owner_change() from public, anon, authenticated;
revoke execute on function public.ensure_category_parent_same_workspace() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.seed_default_workspace_data(uuid) from public, anon, authenticated;

revoke execute on function public.create_initial_workspace(text, text) from public, anon, authenticated;
revoke execute on function public.is_workspace_member(uuid) from public, anon, authenticated;
revoke execute on function public.workspace_role(uuid) from public, anon, authenticated;
revoke execute on function public.can_read_workspace(uuid) from public, anon, authenticated;
revoke execute on function public.can_write_workspace(uuid) from public, anon, authenticated;
revoke execute on function public.can_admin_workspace(uuid) from public, anon, authenticated;
revoke execute on function public.is_workspace_owner(uuid) from public, anon, authenticated;
revoke execute on function public.shares_workspace_with(uuid) from public, anon, authenticated;

grant execute on function public.create_initial_workspace(text, text) to authenticated;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.workspace_role(uuid) to authenticated;
grant execute on function public.can_read_workspace(uuid) to authenticated;
grant execute on function public.can_write_workspace(uuid) to authenticated;
grant execute on function public.can_admin_workspace(uuid) to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;
grant execute on function public.shares_workspace_with(uuid) to authenticated;

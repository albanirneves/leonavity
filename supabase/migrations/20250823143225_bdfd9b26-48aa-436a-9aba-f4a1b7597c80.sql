
-- 1) Enum de papéis da aplicação
create type if not exists public.app_role as enum ('admin', 'moderator', 'user');

-- 2) Tabela de roles por usuário
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

-- Habilita RLS
alter table public.user_roles enable row level security;

-- 3) Função helper para checar papel
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

-- 4) Políticas de acesso para user_roles
-- Usuário pode ver seus próprios papéis; admins veem tudo
drop policy if exists "users can read own roles" on public.user_roles;
create policy "users can read own roles"
on public.user_roles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "admins can read all roles" on public.user_roles;
create policy "admins can read all roles"
on public.user_roles
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Admins podem inserir/alterar/excluir papéis
drop policy if exists "admins can insert roles" on public.user_roles;
create policy "admins can insert roles"
on public.user_roles
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins can update roles" on public.user_roles;
create policy "admins can update roles"
on public.user_roles
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins can delete roles" on public.user_roles;
create policy "admins can delete roles"
on public.user_roles
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- 5) Tabela de perfis de usuário
create table if not exists public.profiles (
  id uuid not null references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id)
);

-- Habilita RLS
alter table public.profiles enable row level security;

-- Trigger para atualizar updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 6) Políticas de acesso para profiles
-- Usuário vê e edita seu próprio perfil
drop policy if exists "users can view own profile" on public.profiles;
create policy "users can view own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Admins podem ver e editar todos os perfis
drop policy if exists "admins can view all profiles" on public.profiles;
create policy "admins can view all profiles"
on public.profiles
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins can update all profiles" on public.profiles;
create policy "admins can update all profiles"
on public.profiles
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (true);

-- 7) Gatilho: cria um perfil quando um usuário é criado no auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', null),
    coalesce(new.raw_user_meta_data ->> 'last_name', null),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 8) Bootstrap: torna o primeiro usuário criado como admin automaticamente
create or replace function public.bootstrap_first_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end;
$$;

drop trigger if exists make_first_user_admin on auth.users;
create trigger make_first_user_admin
  after insert on auth.users
  for each row execute procedure public.bootstrap_first_admin();

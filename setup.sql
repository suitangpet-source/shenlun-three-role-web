-- 在 Supabase SQL Editor 中整段运行。
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nickname text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create table if not exists public.user_data (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data_key text not null,
  data_value text,
  updated_at timestamptz not null default now(),
  primary key(owner_id,data_key)
);
alter table public.profiles enable row level security;
alter table public.user_data enable row level security;

drop policy if exists profiles_select_self_or_admin on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
drop policy if exists profiles_delete_admin on public.profiles;
drop policy if exists user_data_select_own on public.user_data;
drop policy if exists user_data_insert_own on public.user_data;
drop policy if exists user_data_update_own on public.user_data;
drop policy if exists user_data_delete_own on public.user_data;
drop policy if exists approved_users_download_private_app on storage.objects;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.is_admin();
drop function if exists public.handle_new_user();

create or replace function private.is_approved()
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.profiles where owner_id=(select auth.uid()) and status='approved') $$;
create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.profiles where owner_id=(select auth.uid()) and status='approved' and role='admin') $$;
revoke all on function private.is_approved() from public,anon,authenticated;
revoke all on function private.is_admin() from public,anon,authenticated;
grant execute on function private.is_approved() to authenticated;
grant execute on function private.is_admin() to authenticated;

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 insert into public.profiles(owner_id,email,nickname)
 values(new.id,coalesce(new.email,''),nullif(new.raw_user_meta_data->>'nickname',''))
 on conflict(owner_id) do nothing;
 return new;
end; $$;
revoke all on function private.handle_new_user() from public,anon,authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure private.handle_new_user();

create policy profiles_select_self_or_admin on public.profiles for select to authenticated
using(owner_id=(select auth.uid()) or (select private.is_admin()));
create policy profiles_update_admin on public.profiles for update to authenticated
using((select private.is_admin())) with check((select private.is_admin()));
create policy profiles_delete_admin on public.profiles for delete to authenticated
using((select private.is_admin()));
create policy user_data_select_own on public.user_data for select to authenticated using(owner_id=(select auth.uid()));
create policy user_data_insert_own on public.user_data for insert to authenticated with check(owner_id=(select auth.uid()));
create policy user_data_update_own on public.user_data for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy user_data_delete_own on public.user_data for delete to authenticated using(owner_id=(select auth.uid()));

revoke all on table public.profiles from anon,authenticated;
revoke all on table public.user_data from anon,authenticated;
grant select,update,delete on public.profiles to authenticated;
grant select,insert,update,delete on public.user_data to authenticated;

insert into storage.buckets(id,name,public)
values('private-app','private-app',false)
on conflict(id) do update set public=false;
create policy approved_users_download_private_app on storage.objects for select to authenticated
using(bucket_id='private-app' and (select private.is_approved()));

-- 注册自己的管理员邮箱后，替换邮箱并单独执行：
-- update public.profiles set status='approved',role='admin',reviewed_at=now()
-- where lower(email)=lower('YOUR_ADMIN_EMAIL@example.com');

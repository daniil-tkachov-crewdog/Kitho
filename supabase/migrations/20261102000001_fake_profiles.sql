-- Fake profiles: admin-made filler profiles with no auth account. Real users can see, like, message
-- and report them; fakes never act themselves. Admins can hide them (hidden = invisible to everyone).

-- A profile no longer needs an auth account. Real profiles still go away with their account.
alter table public.profiles drop constraint profiles_id_fkey;
alter table public.profiles alter column id set default gen_random_uuid();

create function public.on_auth_user_deleted() returns trigger
language plpgsql security definer set search_path = '' as $$
begin delete from public.profiles where id = old.id; return old; end; $$;
create trigger on_auth_user_deleted after delete on auth.users
  for each row execute function public.on_auth_user_deleted();
revoke execute on function public.on_auth_user_deleted() from public, anon, authenticated;

-- No column grants → invisible to clients.
alter table public.profiles
  add column fake boolean not null default false,
  add column hidden boolean not null default false;

-- Hidden profiles disappear for everyone else (same as banned).
drop policy profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (not banned and not hidden));

-- ── Admin read model (service role only) ────────────────────────────────────────────────
create function public.admin_list_fake_users()
returns table (id uuid, personal_id text, name text, phone text, location text, age smallint, description text,
               reports bigint, hidden boolean, created_at timestamptz, photos jsonb)
language sql security definer set search_path = '' stable as $$
  select p.id, public.admin_get_personal_id(p.id), p.name, p.phone, p.location, p.age, p.description,
         (select count(*) from public.reports r where r.reported_id = p.id),
         p.hidden, p.created_at,
         coalesce((select jsonb_agg(jsonb_build_object('position', ph.position, 'path', ph.path) order by ph.position)
                     from public.photos ph where ph.profile_id = p.id), '[]'::jsonb)
    from public.profiles p
   where p.fake
   order by p.created_at desc;
$$;

-- ── Admin action (service role only) ────────────────────────────────────────────────────
create function public.admin_set_hidden(p_id uuid, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set hidden = p_on where id = p_id and fake;
  if not found then raise exception 'Fake profile not found.'; end if;
end; $$;

-- ── Grants ──────────────────────────────────────────────────────────────────────────────
revoke execute on function public.admin_list_fake_users() from public, anon, authenticated;
revoke execute on function public.admin_set_hidden(uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_list_fake_users() to service_role;
grant execute on function public.admin_set_hidden(uuid, boolean) to service_role;

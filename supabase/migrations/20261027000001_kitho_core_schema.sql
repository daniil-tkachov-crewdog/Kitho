-- Kitho core schema: profiles, photos, likes, messages + RLS + private-field RPCs.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  age smallint not null check (age between 1 and 120),
  location text not null check (char_length(location) between 1 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  phone text check (phone is null or char_length(phone) <= 30),
  personal_id_enc bytea,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_created_at_idx on public.profiles (created_at, id);

create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  path text not null,
  position smallint not null check (position between 1 and 3),
  created_at timestamptz not null default now(),
  unique (profile_id, position)
);

create table public.likes (
  liker_id uuid not null references public.profiles(id) on delete cascade,
  liked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (liker_id, liked_id),
  check (liker_id <> liked_id)
);
create index likes_liked_idx on public.likes (liked_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (sender_id, receiver_id),
  check (sender_id <> receiver_id)
);
create index messages_receiver_idx on public.messages (receiver_id);

alter table public.profiles enable row level security;
alter table public.photos enable row level security;
alter table public.likes enable row level security;
alter table public.messages enable row level security;

create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy photos_read on public.photos for select to authenticated using (true);
create policy photos_insert on public.photos for insert to authenticated with check (profile_id = (select auth.uid()));
create policy photos_update on public.photos for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy photos_delete on public.photos for delete to authenticated using (profile_id = (select auth.uid()));

create policy likes_read on public.likes for select to authenticated using (liker_id = (select auth.uid()) or liked_id = (select auth.uid()));
create policy likes_insert on public.likes for insert to authenticated with check (liker_id = (select auth.uid()));

create policy messages_read on public.messages for select to authenticated using (sender_id = (select auth.uid()) or receiver_id = (select auth.uid()));
create policy messages_insert on public.messages for insert to authenticated with check (sender_id = (select auth.uid()));

-- Column privileges: phone + personal_id_enc are never directly readable.
revoke all on public.profiles from anon, authenticated;
grant select (id, name, age, location, description, created_at, updated_at) on public.profiles to authenticated;
grant insert (id, name, age, location, description, phone) on public.profiles to authenticated;
grant update (name, age, location, description, phone) on public.profiles to authenticated;

revoke all on public.photos, public.likes, public.messages from anon;
revoke all on public.photos, public.likes, public.messages from authenticated;
grant select, insert, update, delete on public.photos to authenticated;
grant select, insert on public.likes to authenticated;
grant select, insert on public.messages to authenticated;

-- Encryption key for the personal ID lives in Supabase Vault.
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'kitho_personal_id_key', 'Key for profiles.personal_id_enc');

create function public.set_personal_id(p_personal_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare k text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select decrypted_secret into k from vault.decrypted_secrets where name = 'kitho_personal_id_key';
  update public.profiles
     set personal_id_enc = case when coalesce(trim(p_personal_id), '') = '' then null
                                else extensions.pgp_sym_encrypt(trim(p_personal_id), k) end
   where id = auth.uid();
end; $$;

create function public.get_my_private() returns table (phone text, has_personal_id boolean)
language sql security definer set search_path = '' stable as $$
  select p.phone, p.personal_id_enc is not null from public.profiles p where p.id = auth.uid();
$$;

revoke execute on function public.set_personal_id(text) from public, anon;
revoke execute on function public.get_my_private() from public, anon;
grant execute on function public.set_personal_id(text) to authenticated;
grant execute on function public.get_my_private() to authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

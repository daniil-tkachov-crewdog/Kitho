-- Personal ID is backend-only: generated automatically for every profile, stored encrypted,
-- never readable or writable by clients. Admins/backend read it via admin_get_personal_id().

-- Clients can no longer set it.
revoke execute on function public.set_personal_id(text) from authenticated;

-- Keyed hash of the plain ID: enforces uniqueness and allows admin lookup by ID.
alter table public.profiles add column personal_id_hash bytea unique;

create function public.assign_personal_id() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  k text;
  pid text;
  h bytea;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = 'kitho_personal_id_key';
  loop
    -- 12-digit random number, first digit non-zero.
    pid := (1 + floor(random() * 9))::int::text
        || lpad((('x' || encode(extensions.gen_random_bytes(6), 'hex'))::bit(48)::bigint % 100000000000)::text, 11, '0');
    h := extensions.hmac(pid, k, 'sha256');
    exit when not exists (select 1 from public.profiles where personal_id_hash = h);
  end loop;
  new.personal_id_enc := extensions.pgp_sym_encrypt(pid, k);
  new.personal_id_hash := h;
  return new;
end; $$;

create trigger profiles_assign_personal_id before insert on public.profiles
  for each row execute function public.assign_personal_id();
revoke execute on function public.assign_personal_id() from public, anon, authenticated;

-- Admin/backend only (service_role or postgres). Not callable by signed-in users.
create function public.admin_get_personal_id(p_profile_id uuid) returns text
language sql security definer set search_path = '' stable as $$
  select extensions.pgp_sym_decrypt(p.personal_id_enc,
           (select decrypted_secret from vault.decrypted_secrets where name = 'kitho_personal_id_key'))
    from public.profiles p where p.id = p_profile_id;
$$;

create function public.admin_find_profile_by_personal_id(p_personal_id text) returns uuid
language sql security definer set search_path = '' stable as $$
  select p.id from public.profiles p
   where p.personal_id_hash = extensions.hmac(p_personal_id,
           (select decrypted_secret from vault.decrypted_secrets where name = 'kitho_personal_id_key'), 'sha256');
$$;

revoke execute on function public.admin_get_personal_id(uuid) from public, anon, authenticated;
revoke execute on function public.admin_find_profile_by_personal_id(text) from public, anon, authenticated;
grant execute on function public.admin_get_personal_id(uuid) to service_role;
grant execute on function public.admin_find_profile_by_personal_id(text) to service_role;

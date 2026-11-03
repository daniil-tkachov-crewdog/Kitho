-- Date of birth (age derived, 18+), profile freeze, user blocking, existing/banned email check,
-- banned-email memory on account deletion, period-filtered admin visit log.

-- ── Profiles: birth date + freeze ───────────────────────────────────────────────────────
alter table public.profiles
  add column birth_date date,
  add column frozen boolean not null default false;

-- Age is always derived from birth_date. Users can set birth_date once; must be 18+.
-- Service role (admin, cron) has no auth.uid(), so admin-managed fake profiles keep a plain age.
create function public.profiles_apply_birth_date() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and old.birth_date is not null and new.birth_date is distinct from old.birth_date
     and auth.uid() is not null then
    raise exception 'Date of birth can''t be changed.';
  end if;
  if new.birth_date is not null then
    if new.birth_date > current_date - interval '18 years' then
      raise exception 'You must be 18 or over to use Kitho.';
    end if;
    if new.birth_date < current_date - interval '120 years' then
      raise exception 'Please enter a valid date of birth.';
    end if;
    new.age := date_part('year', pg_catalog.age(current_date::timestamp, new.birth_date::timestamp))::smallint;
  end if;
  return new;
end; $$;
create trigger profiles_apply_birth_date before insert or update on public.profiles
  for each row execute function public.profiles_apply_birth_date();
revoke execute on function public.profiles_apply_birth_date() from public, anon, authenticated;

-- Column privileges: age is no longer client-writable; birth_date is write-only; frozen is readable (feed filter).
revoke insert (age) on public.profiles from authenticated;
revoke update (age) on public.profiles from authenticated;
grant insert (birth_date, frozen) on public.profiles to authenticated;
grant update (birth_date, frozen) on public.profiles to authenticated;
grant select (frozen) on public.profiles to authenticated;

-- Keep ages current on birthdays.
create function public.refresh_ages() returns void
language sql security definer set search_path = '' as $$
  update public.profiles
     set age = date_part('year', pg_catalog.age(current_date::timestamp, birth_date::timestamp))::smallint
   where birth_date is not null
     and age <> date_part('year', pg_catalog.age(current_date::timestamp, birth_date::timestamp))::smallint;
$$;
revoke execute on function public.refresh_ages() from public, anon, authenticated;
grant execute on function public.refresh_ages() to service_role;
select cron.schedule('kitho-refresh-ages', '5 0 * * *', 'select public.refresh_ages()');

-- My own status: banned flag + birth date (private) + frozen. Return type changes → recreate.
drop function public.get_my_status();
create function public.get_my_status() returns table (banned boolean, birth_date date, frozen boolean)
language sql security definer set search_path = '' stable as $$
  select p.banned, p.birth_date, p.frozen from public.profiles p where p.id = auth.uid();
$$;
revoke execute on function public.get_my_status() from public, anon;
grant execute on function public.get_my_status() to authenticated;

-- ── Blocks ──────────────────────────────────────────────────────────────────────────────
create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);
alter table public.blocks enable row level security;
revoke all on public.blocks from anon, authenticated; -- RPC access only

-- Blocks or unblocks a user. Returns true when the user is now blocked.
create function public.toggle_block(p_user uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_user is null or p_user = me then raise exception 'Invalid user.'; end if;
  delete from public.blocks where blocker_id = me and blocked_id = p_user;
  if found then return false; end if;
  insert into public.blocks (blocker_id, blocked_id) values (me, p_user);
  return true;
end; $$;

create function public.block_state(p_other uuid) returns table (i_blocked boolean, blocked_me boolean)
language sql security definer set search_path = '' stable as $$
  select exists (select 1 from public.blocks where blocker_id = auth.uid() and blocked_id = p_other),
         exists (select 1 from public.blocks where blocker_id = p_other and blocked_id = auth.uid());
$$;

-- Everyone I blocked or who blocked me (hidden from my feed).
create function public.my_hidden_ids() returns setof uuid
language sql security definer set search_path = '' stable as $$
  select blocked_id from public.blocks where blocker_id = auth.uid()
  union
  select blocker_id from public.blocks where blocked_id = auth.uid();
$$;

revoke execute on function public.toggle_block(uuid) from public, anon;
revoke execute on function public.block_state(uuid) from public, anon;
revoke execute on function public.my_hidden_ids() from public, anon;
grant execute on function public.toggle_block(uuid) to authenticated;
grant execute on function public.block_state(uuid) to authenticated;
grant execute on function public.my_hidden_ids() to authenticated;

-- ── send_message: blocks stop messaging both ways; frozen users can't start new chats ─────
create or replace function public.send_message(p_to uuid, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  b text := trim(p_body);
  is_shadow boolean := public.is_restricted(auth.uid());
  c public.chats;
  new_id uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_to is null or p_to = me then raise exception 'Invalid recipient.'; end if;
  if char_length(b) not between 1 and 2000 then raise exception 'Message must be 1–2000 characters.'; end if;
  if exists (select 1 from public.blocks
              where (blocker_id = me and blocked_id = p_to) or (blocker_id = p_to and blocked_id = me)) then
    raise exception 'You can''t message this user.';
  end if;

  insert into public.chats (user_a, user_b, initiator_id, status, hidden_from)
  values (least(me, p_to), greatest(me, p_to), me, 'pending', case when is_shadow then p_to end)
  on conflict (user_a, user_b) do nothing
  returning id into new_id;

  if new_id is not null and exists (select 1 from public.profiles where id in (me, p_to) and frozen) then
    raise exception 'New chats can''t be started while a profile is frozen.';
  end if;

  select * into c from public.chats where user_a = least(me, p_to) and user_b = greatest(me, p_to) for update;

  if new_id is null then
    if c.status = 'declined' then
      raise exception 'This conversation is closed.';
    elsif c.status = 'pending' then
      if c.initiator_id = me then raise exception 'Wait for a reply before sending another message.'; end if;
      if not is_shadow then c.status := 'active'; end if; -- receiver replied to the letter
    end if;
    -- No longer restricted: the chat becomes visible again (earlier shadow messages stay hidden).
    if not is_shadow and c.hidden_from = p_to then c.hidden_from := null; end if;
  end if;

  insert into public.messages (chat_id, sender_id, receiver_id, body, shadow) values (c.id, me, p_to, b, is_shadow);
  update public.chats
     set status = c.status,
         hidden_from = c.hidden_from,
         last_message_at = now(),
         a_last_read_at = case when user_a = me then now() else a_last_read_at end,
         b_last_read_at = case when user_b = me then now() else b_last_read_at end
   where id = c.id;
  return c.id;
end; $$;

-- ── Email check on sign-up (existing account / banned-and-deleted) ─────────────────────
create table public.banned_emails (
  email_hash text primary key,              -- sha256 hex of lower(trim(email))
  created_at timestamptz not null default now()
);
alter table public.banned_emails enable row level security;
revoke all on public.banned_emails from anon, authenticated;

create function public.check_email(p_email text) returns text
language sql security definer set search_path = '' stable as $$
  select case
    when exists (select 1 from auth.users where lower(email) = lower(trim(p_email))) then 'exists'
    when exists (select 1 from public.banned_emails
                  where email_hash = encode(extensions.digest(lower(trim(p_email)), 'sha256'), 'hex')) then 'banned'
    else 'free' end;
$$;
revoke execute on function public.check_email(text) from public;
grant execute on function public.check_email(text) to anon, authenticated;

-- Called before deleting an account: remembers the email if the profile is banned.
create function public.remember_banned_email(p_user uuid) returns void
language sql security definer set search_path = '' as $$
  insert into public.banned_emails (email_hash)
  select encode(extensions.digest(lower(trim(u.email)), 'sha256'), 'hex')
    from auth.users u join public.profiles p on p.id = u.id
   where u.id = p_user and p.banned and u.email is not null
  on conflict do nothing;
$$;
revoke execute on function public.remember_banned_email(uuid) from public, anon, authenticated;
grant execute on function public.remember_banned_email(uuid) to service_role;

-- ── Admin: visits log by period (paged) ─────────────────────────────────────────────────
drop function public.admin_list_visits(int);
create function public.admin_list_visits(p_since timestamptz, p_limit int default 200, p_offset int default 0)
returns table (id uuid, who text, location text, device text, browser text, created_at timestamptz)
language sql security definer set search_path = '' stable as $$
  select v.id,
         case when v.user_id is null then 'Guest'
              else coalesce(p.name, u.email, 'User') end,
         v.location, v.device, v.browser, v.created_at
    from public.visits v
    left join auth.users u on u.id = v.user_id
    left join public.profiles p on p.id = v.user_id
   where v.created_at >= p_since
   order by v.created_at desc
   limit p_limit offset p_offset;
$$;
revoke execute on function public.admin_list_visits(timestamptz, int, int) from public, anon, authenticated;
grant execute on function public.admin_list_visits(timestamptz, int, int) to service_role;

-- ── Admin: users list gets `frozen` (return type changes → recreate) ────────────────────
drop function public.admin_list_users();
create function public.admin_list_users()
returns table (id uuid, personal_id text, name text, email text, phone text, location text, age smallint,
               reports bigint, points int, restricted boolean, restricted_manual boolean, banned boolean,
               fake boolean, frozen boolean, created_at timestamptz)
language sql security definer set search_path = '' stable as $$
  select a.id, public.admin_get_personal_id(a.id), p.name, a.email, p.phone, p.location, p.age,
         (select count(*) from public.reports r where r.reported_id = a.id),
         coalesce(p.points, 0),
         coalesce(p.restricted_manual or p.restricted_auto, false),
         coalesce(p.restricted_manual, false),
         coalesce(p.banned, false),
         coalesce(p.fake, false),
         coalesce(p.frozen, false),
         a.created_at
    from (select u.id, u.email::text as email, u.created_at from auth.users u
          union all
          select f.id, 'admin@kitho.co.uk', f.created_at from public.profiles f where f.fake) a
    left join public.profiles p on p.id = a.id
   order by a.created_at desc;
$$;
revoke execute on function public.admin_list_users() from public, anon, authenticated;
grant execute on function public.admin_list_users() to service_role;

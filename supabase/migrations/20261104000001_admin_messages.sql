-- Admin Messages: an automatic greeting from "Admin" to each new user, plus a direct user ↔ admin chat.
-- One admin chat per user (keyed by user id). Users read their own and write via functions; admins go through Edge Functions (service role).

-- ── Settings (singleton row) ───────────────────────────────────────────────────────────
create table public.admin_settings (
  id boolean primary key default true check (id),
  greeting_enabled boolean not null default true,
  greeting_text text not null default '' check (char_length(greeting_text) <= 2000)
);
insert into public.admin_settings default values;
alter table public.admin_settings enable row level security;
revoke all on public.admin_settings from anon, authenticated;

-- ── Chats + messages ───────────────────────────────────────────────────────────────────
create table public.admin_chats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  user_last_read_at timestamptz not null default '-infinity',
  admin_last_read_at timestamptz not null default '-infinity'
);

create table public.admin_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.admin_chats(user_id) on delete cascade,
  from_admin boolean not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index admin_messages_user_idx on public.admin_messages (user_id, created_at);

alter table public.admin_chats enable row level security;
alter table public.admin_messages enable row level security;
create policy admin_chats_read on public.admin_chats for select to authenticated using (user_id = (select auth.uid()));
create policy admin_messages_read on public.admin_messages for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.admin_chats, public.admin_messages from anon, authenticated;
grant select on public.admin_chats, public.admin_messages to authenticated;

-- Internal: append a message (creates the chat if missing).
create function public.admin_chat_post(p_user uuid, p_from_admin boolean, p_body text) returns void
language plpgsql security definer set search_path = '' as $$
declare b text := trim(p_body);
begin
  if char_length(b) not between 1 and 2000 then raise exception 'Message must be 1–2000 characters.'; end if;
  insert into public.admin_chats (user_id) values (p_user) on conflict (user_id) do nothing;
  insert into public.admin_messages (user_id, from_admin, body) values (p_user, p_from_admin, b);
  update public.admin_chats
     set last_message_at = now(),
         user_last_read_at = case when p_from_admin then user_last_read_at else now() end,
         admin_last_read_at = case when p_from_admin then now() else admin_last_read_at end
   where user_id = p_user;
end $$;

-- ── Greeting on profile creation ───────────────────────────────────────────────────────
create function public.on_profile_send_greeting() returns trigger
language plpgsql security definer set search_path = '' as $$
declare s public.admin_settings;
begin
  if new.fake then return new; end if;
  select * into s from public.admin_settings where id;
  if s.greeting_enabled and char_length(trim(s.greeting_text)) > 0 then
    perform public.admin_chat_post(new.id, true, s.greeting_text);
  end if;
  return new;
end $$;
create trigger profiles_send_greeting after insert on public.profiles
  for each row execute function public.on_profile_send_greeting();

-- ── User functions ─────────────────────────────────────────────────────────────────────
create function public.send_admin_message(p_body text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid()) then raise exception 'Create your profile first.'; end if;
  perform public.admin_chat_post(auth.uid(), false, p_body);
end $$;

create function public.mark_admin_chat_read() returns void
language sql security definer set search_path = '' as $$
  update public.admin_chats set user_last_read_at = now() where user_id = auth.uid();
$$;

-- My admin chat summary (no row if none).
create function public.my_admin_chat()
returns table (created_at timestamptz, last_message_at timestamptz, last_body text, last_from_admin boolean, unread int, admin_read_at timestamptz)
language sql stable set search_path = '' as $$
  select c.created_at, c.last_message_at, m.body, m.from_admin,
         (select count(*)::int from public.admin_messages x where x.user_id = c.user_id and x.from_admin and x.created_at > c.user_last_read_at),
         c.admin_last_read_at
    from public.admin_chats c
    left join lateral (select body, from_admin from public.admin_messages where user_id = c.user_id order by created_at desc limit 1) m on true
   where c.user_id = auth.uid();
$$;

-- ── Admin functions (service role only) ────────────────────────────────────────────────
create function public.admin_list_admin_chats()
returns table (user_id uuid, personal_id text, name text, created_at timestamptz, last_message_at timestamptz,
               last_body text, last_from_admin boolean, unread int)
language sql stable security definer set search_path = '' as $$
  select c.user_id, public.admin_get_personal_id(c.user_id), p.name, c.created_at, c.last_message_at, m.body, m.from_admin,
         (select count(*)::int from public.admin_messages x where x.user_id = c.user_id and not x.from_admin and x.created_at > c.admin_last_read_at)
    from public.admin_chats c
    join public.profiles p on p.id = c.user_id
    left join lateral (select body, from_admin from public.admin_messages where user_id = c.user_id order by created_at desc limit 1) m on true
   order by coalesce(c.last_message_at, c.created_at) desc;
$$;

create function public.admin_mark_admin_chat_read(p_user uuid) returns void
language sql security definer set search_path = '' as $$
  update public.admin_chats set admin_last_read_at = now() where user_id = p_user;
$$;

revoke execute on function public.admin_chat_post(uuid, boolean, text) from public, anon, authenticated;
revoke execute on function public.on_profile_send_greeting() from public, anon, authenticated;
revoke execute on function public.send_admin_message(text) from public, anon;
revoke execute on function public.mark_admin_chat_read() from public, anon;
revoke execute on function public.my_admin_chat() from public, anon;
revoke execute on function public.admin_list_admin_chats() from public, anon, authenticated;
revoke execute on function public.admin_mark_admin_chat_read(uuid) from public, anon, authenticated;
grant execute on function public.send_admin_message(text) to authenticated;
grant execute on function public.mark_admin_chat_read() to authenticated;
grant execute on function public.my_admin_chat() to authenticated;
grant execute on function public.admin_chat_post(uuid, boolean, text) to service_role;
grant execute on function public.admin_list_admin_chats() to service_role;
grant execute on function public.admin_mark_admin_chat_read(uuid) to service_role;

-- Realtime for the user side (RLS-filtered).
alter publication supabase_realtime add table public.admin_chats, public.admin_messages;

-- Push notifications (iOS app): device tokens, per-user notification settings, and triggers that send
-- pushes through the Expo push service for new messages, letters, likes and Kitho team messages.
-- Same delivery rules as the app: shadow (restricted) likes/messages and banned receivers get no push.

create extension if not exists pg_net with schema extensions;

-- ── Device tokens (one row per device; a device moves to whoever signs in on it) ──────────
create table if not exists public.push_tokens (
  token text primary key check (token like 'ExponentPushToken[%]' or token like 'ExpoPushToken[%]'),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null default 'ios',
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security; -- no direct access; RPCs below

create or replace function public.register_push_token(p_token text, p_platform text default 'ios') returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.push_tokens (token, user_id, platform) values (p_token, auth.uid(), coalesce(p_platform, 'ios'))
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end; $$;

create or replace function public.unregister_push_token(p_token text) returns void
language sql security definer set search_path = '' as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;

revoke execute on function public.register_push_token(text, text) from public, anon;
revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

-- ── Notification settings (no row = everything on) ─────────────────────────────────────
create table if not exists public.notification_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  messages boolean not null default true,
  letters boolean not null default true,
  likes boolean not null default true,
  admin boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_settings enable row level security;
drop policy if exists notification_settings_own on public.notification_settings;
create policy notification_settings_own on public.notification_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ── Sender ──────────────────────────────────────────────────────────────────────────────
-- p_kind: 'messages' | 'letters' | 'likes' | 'admin'. p_url: app route to open on tap.
create or replace function public.send_push(p_user uuid, p_kind text, p_title text, p_body text, p_url text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.notification_settings;
  wanted boolean := true;
  payload jsonb;
begin
  if exists (select 1 from public.profiles where id = p_user and banned) then return; end if;
  select * into s from public.notification_settings where user_id = p_user;
  if found then
    wanted := case p_kind when 'messages' then s.messages when 'letters' then s.letters
                          when 'likes' then s.likes when 'admin' then s.admin else true end;
  end if;
  if not wanted then return; end if;

  select jsonb_agg(jsonb_build_object(
           'to', t.token, 'title', p_title, 'body', left(p_body, 140), 'sound', 'default',
           'data', jsonb_build_object('url', p_url, 'kind', p_kind)))
    into payload
    from public.push_tokens t where t.user_id = p_user;
  if payload is null then return; end if;

  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    body := payload,
    headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
  );
end; $$;
revoke execute on function public.send_push(uuid, text, text, text, text) from public, anon, authenticated;

-- ── Triggers ────────────────────────────────────────────────────────────────────────────
create or replace function public.push_on_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  c public.chats;
  sender text;
begin
  if new.shadow then return null; end if;
  select * into c from public.chats where id = new.chat_id;
  select name into sender from public.profiles where id = new.sender_id;
  if c.status = 'pending' and c.initiator_id = new.sender_id then
    perform public.send_push(new.receiver_id, 'letters', 'New letter from ' || coalesce(sender, 'someone'), new.body, '/chat/' || new.chat_id);
  else
    perform public.send_push(new.receiver_id, 'messages', coalesce(sender, 'New message'), new.body, '/chat/' || new.chat_id);
  end if;
  return null;
end; $$;
drop trigger if exists messages_push on public.messages;
create trigger messages_push after insert on public.messages
  for each row execute function public.push_on_message();

create or replace function public.push_on_like() returns trigger
language plpgsql security definer set search_path = '' as $$
declare liker text;
begin
  if new.shadow then return null; end if;
  select name into liker from public.profiles where id = new.liker_id;
  perform public.send_push(new.liked_id, 'likes', coalesce(liker, 'Someone') || ' liked you', 'See who on Kitho.', '/user/' || new.liker_id);
  return null;
end; $$;
drop trigger if exists likes_push on public.likes;
create trigger likes_push after insert on public.likes
  for each row execute function public.push_on_like();

create or replace function public.push_on_admin_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not new.from_admin then return null; end if;
  perform public.send_push(new.user_id, 'admin', 'Kitho team', new.body, '/chat/admin');
  return null;
end; $$;
drop trigger if exists admin_messages_push on public.admin_messages;
create trigger admin_messages_push after insert on public.admin_messages
  for each row execute function public.push_on_admin_message();

revoke execute on function public.push_on_message() from public, anon, authenticated;
revoke execute on function public.push_on_like() from public, anon, authenticated;
revoke execute on function public.push_on_admin_message() from public, anon, authenticated;

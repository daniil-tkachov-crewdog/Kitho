-- Chats: one per pair of users. Opened by a match (mutual like) or by a letter (pending until the receiver replies or likes back).

create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  initiator_id uuid references public.profiles(id) on delete cascade, -- letter sender; null when opened by a match
  status text not null check (status in ('pending', 'active', 'declined')),
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  a_last_read_at timestamptz not null default '-infinity',
  b_last_read_at timestamptz not null default '-infinity',
  unique (user_a, user_b),
  check (user_a < user_b)
);
create index chats_user_b_idx on public.chats (user_b);

-- Messages: many per chat (drop the old one-greeting-per-pair limit).
alter table public.messages drop constraint messages_sender_id_receiver_id_key;
alter table public.messages drop constraint messages_body_check;
alter table public.messages add constraint messages_body_check check (char_length(body) between 1 and 2000);
alter table public.messages add column chat_id uuid references public.chats(id) on delete cascade;

-- Backfill existing greetings and mutual likes into chats.
insert into public.chats (user_a, user_b, initiator_id, status, created_at, last_message_at)
select least(sender_id, receiver_id), greatest(sender_id, receiver_id),
       (array_agg(sender_id order by created_at))[1],
       case when count(distinct sender_id) > 1 then 'active' else 'pending' end,
       min(created_at), max(created_at)
  from public.messages
 group by least(sender_id, receiver_id), greatest(sender_id, receiver_id);

insert into public.chats (user_a, user_b, status, created_at)
select l.liker_id, l.liked_id, 'active', greatest(l.created_at, r.created_at)
  from public.likes l join public.likes r on r.liker_id = l.liked_id and r.liked_id = l.liker_id
 where l.liker_id < l.liked_id
on conflict (user_a, user_b) do update set status = 'active';

update public.messages m set chat_id = c.id
  from public.chats c
 where c.user_a = least(m.sender_id, m.receiver_id) and c.user_b = greatest(m.sender_id, m.receiver_id);

alter table public.messages alter column chat_id set not null;
create index messages_chat_idx on public.messages (chat_id, created_at);

-- RLS: participants read; all writes go through the functions below.
alter table public.chats enable row level security;
create policy chats_read on public.chats for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));

drop policy messages_insert on public.messages;
revoke all on public.chats from anon, authenticated;
grant select on public.chats to authenticated;
revoke insert on public.messages from authenticated;

-- Sends a message to p_to. No chat yet → creates a pending letter. Returns the chat id.
create function public.send_message(p_to uuid, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := auth.uid();
  b text := trim(p_body);
  c public.chats;
  new_id uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_to is null or p_to = me then raise exception 'Invalid recipient.'; end if;
  if char_length(b) not between 1 and 2000 then raise exception 'Message must be 1–2000 characters.'; end if;

  insert into public.chats (user_a, user_b, initiator_id, status)
  values (least(me, p_to), greatest(me, p_to), me, 'pending')
  on conflict (user_a, user_b) do nothing
  returning id into new_id;

  select * into c from public.chats where user_a = least(me, p_to) and user_b = greatest(me, p_to) for update;

  if new_id is null then
    if c.status = 'declined' then
      raise exception 'This conversation is closed.';
    elsif c.status = 'pending' then
      if c.initiator_id = me then raise exception 'Wait for a reply before sending another message.'; end if;
      c.status := 'active'; -- receiver replied to the letter
    end if;
  end if;

  insert into public.messages (chat_id, sender_id, receiver_id, body) values (c.id, me, p_to, b);
  update public.chats
     set status = c.status,
         last_message_at = now(),
         a_last_read_at = case when user_a = me then now() else a_last_read_at end,
         b_last_read_at = case when user_b = me then now() else b_last_read_at end
   where id = c.id;
  return c.id;
end; $$;

-- Letter receiver declines a pending chat (hidden for them, closed for the sender).
create function public.decline_chat(p_chat uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.chats set status = 'declined'
   where id = p_chat and status = 'pending'
     and auth.uid() in (user_a, user_b) and initiator_id <> auth.uid();
  if not found then raise exception 'Chat not found.'; end if;
end; $$;

create function public.mark_chat_read(p_chat uuid) returns void
language sql security definer set search_path = '' as $$
  update public.chats
     set a_last_read_at = case when user_a = auth.uid() then now() else a_last_read_at end,
         b_last_read_at = case when user_b = auth.uid() then now() else b_last_read_at end
   where id = p_chat and auth.uid() in (user_a, user_b);
$$;

-- My chats with the other person, last message and unread count. Declined letters are hidden from the decliner.
create function public.list_my_chats()
returns table (id uuid, other_id uuid, status text, initiator_id uuid, created_at timestamptz,
               last_message_at timestamptz, last_body text, last_sender_id uuid, unread int)
language sql stable set search_path = '' as $$
  select c.id,
         case when c.user_a = auth.uid() then c.user_b else c.user_a end,
         c.status, c.initiator_id, c.created_at, c.last_message_at, m.body, m.sender_id,
         (select count(*)::int from public.messages x
           where x.chat_id = c.id and x.sender_id <> auth.uid()
             and x.created_at > case when c.user_a = auth.uid() then c.a_last_read_at else c.b_last_read_at end)
    from public.chats c
    left join lateral (
      select body, sender_id from public.messages where chat_id = c.id order by created_at desc limit 1
    ) m on true
   where auth.uid() in (c.user_a, c.user_b)
     and not (c.status = 'declined' and c.initiator_id is distinct from auth.uid())
   order by coalesce(c.last_message_at, c.created_at) desc;
$$;

-- Likes open chats: a mutual like, or the letter receiver liking the sender back.
create function public.on_like_open_chat() returns trigger
language plpgsql security definer set search_path = '' as $$
declare mutual boolean := exists (select 1 from public.likes where liker_id = new.liked_id and liked_id = new.liker_id);
begin
  update public.chats set status = 'active'
   where user_a = least(new.liker_id, new.liked_id) and user_b = greatest(new.liker_id, new.liked_id)
     and status <> 'active'
     and (initiator_id is distinct from new.liker_id or (mutual and status = 'pending'));
  if not found and mutual then
    insert into public.chats (user_a, user_b, status)
    values (least(new.liker_id, new.liked_id), greatest(new.liker_id, new.liked_id), 'active')
    on conflict (user_a, user_b) do nothing;
  end if;
  return null;
end; $$;
create trigger likes_open_chat after insert on public.likes
  for each row execute function public.on_like_open_chat();

revoke execute on function public.send_message(uuid, text) from public, anon;
revoke execute on function public.decline_chat(uuid) from public, anon;
revoke execute on function public.mark_chat_read(uuid) from public, anon;
revoke execute on function public.list_my_chats() from public, anon;
revoke execute on function public.on_like_open_chat() from public, anon, authenticated;
grant execute on function public.send_message(uuid, text) to authenticated;
grant execute on function public.decline_chat(uuid) to authenticated;
grant execute on function public.mark_chat_read(uuid) to authenticated;
grant execute on function public.list_my_chats() to authenticated;

-- Realtime (RLS-filtered).
alter publication supabase_realtime add table public.messages, public.chats;

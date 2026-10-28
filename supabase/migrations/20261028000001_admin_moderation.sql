-- Admin moderation: report points, auto/manual restriction (shadow delivery), bans, visitor tracking.
-- Everything here is backend-only: admin Edge Functions call the admin_* functions with the service role.

-- ── Report system parameters (editable in the admin panel) ──────────────────────────────
create table public.report_reason_points (
  reason text primary key check (reason in ('fake', 'spam', 'harassment', 'inappropriate', 'hate', 'underage', 'threats', 'other')),
  points smallint not null check (points between 1 and 3)
);
insert into public.report_reason_points (reason, points) values
  ('fake', 2), ('spam', 1), ('harassment', 2), ('inappropriate', 2),
  ('hate', 3), ('threats', 3), ('underage', 3), ('other', 1);

create table public.report_settings (
  id boolean primary key default true check (id), -- single row
  restrict_points int not null default 9 check (restrict_points > 0),
  ban_points int not null default 15 check (ban_points > 0),
  decay_days int not null default 7 check (decay_days > 0) -- 1 point goes down every decay_days
);
insert into public.report_settings default values;

alter table public.report_reason_points enable row level security;
alter table public.report_settings enable row level security;
revoke all on public.report_reason_points, public.report_settings from anon, authenticated;

-- ── Moderation state on profiles (no column grants → invisible to clients) ───────────────
alter table public.profiles
  add column points int not null default 0,
  add column points_decayed_at timestamptz not null default now(),
  add column restricted_manual boolean not null default false,
  add column restricted_auto boolean not null default false,
  add column banned boolean not null default false;

-- Points each report added: 0 when the same reporter already reported this user.
alter table public.reports add column points smallint not null default 0;
create index reports_created_idx on public.reports (created_at desc);

create function public.is_restricted(p_id uuid) returns boolean
language sql security definer set search_path = '' stable as $$
  select coalesce((select restricted_manual or restricted_auto or banned from public.profiles where id = p_id), false);
$$;

-- Applies the time decay to one profile, then sets the automatic restriction/ban.
-- Auto-restriction lifts below the threshold; a ban stays until an admin unbans.
create function public.refresh_points(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  s public.report_settings;
  step interval;
  n int;
  p public.profiles;
begin
  select * into s from public.report_settings;
  step := make_interval(days => s.decay_days);
  select * into p from public.profiles where id = p_id for update;
  if not found then return; end if;
  if p.points = 0 then
    p.points_decayed_at := now();
  else
    n := floor(extract(epoch from now() - p.points_decayed_at) / extract(epoch from step))::int;
    if n > 0 then
      p.points := greatest(0, p.points - n);
      p.points_decayed_at := case when p.points = 0 then now() else p.points_decayed_at + n * step end;
    end if;
  end if;
  update public.profiles
     set points = p.points,
         points_decayed_at = p.points_decayed_at,
         restricted_auto = p.points >= s.restrict_points,
         banned = banned or p.points >= s.ban_points
   where id = p_id;
end; $$;

-- Hourly job + after settings changes: refresh everyone who has points or an auto restriction.
create function public.refresh_all_points() returns void
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in select id from public.profiles where points > 0 or restricted_auto loop
    perform public.refresh_points(r.id);
  end loop;
end; $$;

create function public.on_report_points() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and tg_when = 'BEFORE' then
    new.points := case
      when exists (select 1 from public.reports where reporter_id = new.reporter_id and reported_id = new.reported_id) then 0
      else coalesce((select points from public.report_reason_points where reason = new.reason), 0)
    end;
    return new;
  end if;
  perform public.refresh_points(new.reported_id); -- decay first, then add
  update public.profiles set points = points + new.points where id = new.reported_id;
  perform public.refresh_points(new.reported_id);
  return null;
end; $$;
create trigger reports_points_before before insert on public.reports
  for each row execute function public.on_report_points();
create trigger reports_points_after after insert on public.reports
  for each row execute function public.on_report_points();

-- ── Bans: banned profiles disappear for everyone else ───────────────────────────────────
drop policy profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or not banned);

-- My own moderation status (the app locks banned users out; restriction is never shown).
create function public.get_my_status() returns table (banned boolean)
language sql security definer set search_path = '' stable as $$
  select p.banned from public.profiles p where p.id = auth.uid();
$$;

-- ── Restriction: likes and messages are accepted but never reach the receiver ───────────
alter table public.likes add column shadow boolean not null default false;
alter table public.messages add column shadow boolean not null default false;
alter table public.chats add column hidden_from uuid references public.profiles(id) on delete cascade;

create function public.likes_set_shadow() returns trigger
language plpgsql security definer set search_path = '' as $$
begin new.shadow := public.is_restricted(new.liker_id); return new; end; $$;
create trigger likes_shadow before insert on public.likes
  for each row execute function public.likes_set_shadow();

drop policy likes_read on public.likes;
create policy likes_read on public.likes for select to authenticated
  using (liker_id = (select auth.uid()) or (liked_id = (select auth.uid()) and not shadow));

drop policy messages_read on public.messages;
create policy messages_read on public.messages for select to authenticated
  using (sender_id = (select auth.uid()) or (receiver_id = (select auth.uid()) and not shadow));

drop policy chats_read on public.chats;
create policy chats_read on public.chats for select to authenticated
  using ((select auth.uid()) in (user_a, user_b) and hidden_from is distinct from (select auth.uid()));

-- Shadow likes never open chats or count towards a match.
create or replace function public.on_like_open_chat() returns trigger
language plpgsql security definer set search_path = '' as $$
declare mutual boolean;
begin
  if new.shadow then return null; end if;
  mutual := exists (select 1 from public.likes where liker_id = new.liked_id and liked_id = new.liker_id and not shadow);
  update public.chats set status = 'active'
   where user_a = least(new.liker_id, new.liked_id) and user_b = greatest(new.liker_id, new.liked_id)
     and status <> 'active'
     and hidden_from is null
     and (initiator_id is distinct from new.liker_id or (mutual and status = 'pending'));
  if not found and mutual then
    insert into public.chats (user_a, user_b, status)
    values (least(new.liker_id, new.liked_id), greatest(new.liker_id, new.liked_id), 'active')
    on conflict (user_a, user_b) do nothing;
  end if;
  return null;
end; $$;

-- Restricted senders: the chat/message is created as usual for them but hidden from the receiver.
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

  insert into public.chats (user_a, user_b, initiator_id, status, hidden_from)
  values (least(me, p_to), greatest(me, p_to), me, 'pending', case when is_shadow then p_to end)
  on conflict (user_a, user_b) do nothing
  returning id into new_id;

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

-- ── Visitor tracking (written by the track-visit Edge Function) ─────────────────────────
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,                 -- random per-browser id
  user_id uuid references auth.users(id) on delete set null,
  location text not null default '',
  device text not null default '',
  browser text not null default '',
  created_at timestamptz not null default now()
);
create index visits_created_idx on public.visits (created_at desc);
create index visits_visitor_idx on public.visits (visitor_id);
alter table public.visits enable row level security;
revoke all on public.visits from anon, authenticated;

-- ── Admin read models (service role only) ───────────────────────────────────────────────
create function public.admin_stats() returns table (visitors bigint, users bigint, reports bigint)
language sql security definer set search_path = '' stable as $$
  select (select count(distinct visitor_id) from public.visits),
         (select count(*) from auth.users),
         (select count(*) from public.reports);
$$;

create function public.admin_list_visits(p_limit int default 200)
returns table (id uuid, who text, location text, device text, browser text, created_at timestamptz)
language sql security definer set search_path = '' stable as $$
  select v.id,
         case when v.user_id is null then 'Guest'
              else coalesce(p.name, u.email, 'User') end,
         v.location, v.device, v.browser, v.created_at
    from public.visits v
    left join auth.users u on u.id = v.user_id
    left join public.profiles p on p.id = v.user_id
   order by v.created_at desc
   limit p_limit;
$$;

create function public.admin_list_users()
returns table (id uuid, personal_id text, name text, email text, phone text, location text, age smallint,
               reports bigint, points int, restricted boolean, restricted_manual boolean, banned boolean, created_at timestamptz)
language sql security definer set search_path = '' stable as $$
  select u.id, public.admin_get_personal_id(u.id), p.name, u.email::text, p.phone, p.location, p.age,
         (select count(*) from public.reports r where r.reported_id = u.id),
         coalesce(p.points, 0),
         coalesce(p.restricted_manual or p.restricted_auto, false),
         coalesce(p.restricted_manual, false),
         coalesce(p.banned, false),
         u.created_at
    from auth.users u
    left join public.profiles p on p.id = u.id
   order by u.created_at desc;
$$;

create function public.admin_list_reports()
returns table (id uuid, created_at timestamptz, reason text, details text, points smallint,
               reported_id uuid, reported_personal_id text, reported_name text,
               reporter_id uuid, reporter_personal_id text, reporter_name text)
language sql security definer set search_path = '' stable as $$
  select r.id, r.created_at, r.reason, r.details, r.points,
         r.reported_id, public.admin_get_personal_id(r.reported_id), d.name,
         r.reporter_id, public.admin_get_personal_id(r.reporter_id), s.name
    from public.reports r
    join public.profiles d on d.id = r.reported_id
    join public.profiles s on s.id = r.reporter_id
   order by r.created_at desc;
$$;

-- ── Admin actions (service role only) ───────────────────────────────────────────────────
-- Lifting a restriction/ban also caps the points below that threshold so it doesn't come straight back.
create function public.admin_set_restricted(p_id uuid, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.refresh_points(p_id);
  update public.profiles p
     set restricted_manual = p_on,
         restricted_auto = case when p_on then p.restricted_auto else false end,
         points = case when p_on then p.points else least(p.points, s.restrict_points - 1) end
    from public.report_settings s
   where p.id = p_id;
  if not found then raise exception 'Profile not found.'; end if;
end; $$;

create function public.admin_set_banned(p_id uuid, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.refresh_points(p_id);
  update public.profiles p
     set banned = p_on,
         points = case when p_on then p.points else least(p.points, s.ban_points - 1) end
    from public.report_settings s
   where p.id = p_id;
  if not found then raise exception 'Profile not found.'; end if;
  perform public.refresh_points(p_id);
end; $$;

-- ── Grants ──────────────────────────────────────────────────────────────────────────────
revoke execute on function public.is_restricted(uuid) from public, anon, authenticated;
revoke execute on function public.refresh_points(uuid) from public, anon, authenticated;
revoke execute on function public.refresh_all_points() from public, anon, authenticated;
revoke execute on function public.on_report_points() from public, anon, authenticated;
revoke execute on function public.likes_set_shadow() from public, anon, authenticated;
revoke execute on function public.get_my_status() from public, anon;
revoke execute on function public.admin_stats() from public, anon, authenticated;
revoke execute on function public.admin_list_visits(int) from public, anon, authenticated;
revoke execute on function public.admin_list_users() from public, anon, authenticated;
revoke execute on function public.admin_list_reports() from public, anon, authenticated;
revoke execute on function public.admin_set_restricted(uuid, boolean) from public, anon, authenticated;
revoke execute on function public.admin_set_banned(uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_restricted(uuid, boolean) to service_role;
grant execute on function public.admin_set_banned(uuid, boolean) to service_role;
grant execute on function public.get_my_status() to authenticated;
grant execute on function public.refresh_points(uuid) to service_role;
grant execute on function public.refresh_all_points() to service_role;
grant execute on function public.admin_stats() to service_role;
grant execute on function public.admin_list_visits(int) to service_role;
grant execute on function public.admin_list_users() to service_role;
grant execute on function public.admin_list_reports() to service_role;
grant select, insert, update, delete on public.visits, public.report_settings, public.report_reason_points to service_role;

-- ── Hourly decay ────────────────────────────────────────────────────────────────────────
create extension if not exists pg_cron;
select cron.schedule('kitho-points-decay', '0 * * * *', 'select public.refresh_all_points()');

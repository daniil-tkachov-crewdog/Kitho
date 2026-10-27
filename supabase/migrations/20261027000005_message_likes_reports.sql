-- Message likes (either participant, any message) and user reports.

alter table public.messages add column liked_by uuid[] not null default '{}';

-- Toggles my like on a message in one of my chats. Returns the new liked state.
create function public.toggle_message_like(p_message uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); liked boolean;
begin
  update public.messages m
     set liked_by = case when me = any(m.liked_by) then array_remove(m.liked_by, me) else m.liked_by || me end
   where m.id = p_message and me in (m.sender_id, m.receiver_id)
  returning me = any(m.liked_by) into liked;
  if liked is null then raise exception 'Message not found.'; end if;
  return liked;
end; $$;

revoke execute on function public.toggle_message_like(uuid) from public, anon;
grant execute on function public.toggle_message_like(uuid) to authenticated;

-- Reports: write-only for users; read by admins/backend (service role). Reported person's ID number via admin_get_personal_id().
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('fake', 'spam', 'harassment', 'inappropriate', 'hate', 'underage', 'threats', 'other')),
  details text not null default '' check (char_length(details) <= 1000),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);
create index reports_reported_idx on public.reports (reported_id);

alter table public.reports enable row level security;
create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = (select auth.uid()));
revoke all on public.reports from anon, authenticated;
grant insert (reporter_id, reported_id, reason, details) on public.reports to authenticated;

-- Admin Users table also lists fake profiles (flagged with `fake`, email shown as the admin one).
-- Return type changes, so the function is recreated.

drop function public.admin_list_users();

create function public.admin_list_users()
returns table (id uuid, personal_id text, name text, email text, phone text, location text, age smallint,
               reports bigint, points int, restricted boolean, restricted_manual boolean, banned boolean,
               fake boolean, created_at timestamptz)
language sql security definer set search_path = '' stable as $$
  select a.id, public.admin_get_personal_id(a.id), p.name, a.email, p.phone, p.location, p.age,
         (select count(*) from public.reports r where r.reported_id = a.id),
         coalesce(p.points, 0),
         coalesce(p.restricted_manual or p.restricted_auto, false),
         coalesce(p.restricted_manual, false),
         coalesce(p.banned, false),
         coalesce(p.fake, false),
         a.created_at
    from (select u.id, u.email::text as email, u.created_at from auth.users u
          union all
          select f.id, 'admin@kitho.co.uk', f.created_at from public.profiles f where f.fake) a
    left join public.profiles p on p.id = a.id
   order by a.created_at desc;
$$;

revoke execute on function public.admin_list_users() from public, anon, authenticated;
grant execute on function public.admin_list_users() to service_role;

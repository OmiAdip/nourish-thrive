-- DropASize admins. Run once: Supabase dashboard -> SQL editor -> New query -> paste all -> Run.
-- An admin is a coach account (profiles.role = 'coach'): they can use the coach panel (/admin)
-- and the coach tools in the app. Only the main admin below can add or remove admins.

create or replace function public.is_main_admin()
returns boolean language sql stable security definer set search_path = public, auth as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'omiadip308@gmail.com'
$$;

-- The main admin is always a coach.
update public.profiles set role = 'coach'
where id in (select id from auth.users where lower(email) = 'omiadip308@gmail.com');

-- Everyone with coach access, main admin first.
create or replace function public.admin_list()
returns table(email text, is_main boolean)
language sql stable security definer set search_path = public, auth as $$
  select u.email::text, lower(u.email) = 'omiadip308@gmail.com'
  from auth.users u join public.profiles p on p.id = u.id
  where p.role = 'coach' and (public.is_main_admin() or public.is_coach())
  order by 2 desc, 1
$$;

-- Add (p_admin = true) or remove (false) an admin by email. Main admin only.
create or replace function public.admin_set(p_email text, p_admin boolean)
returns text language plpgsql security definer set search_path = public, auth as $$
declare uid uuid;
begin
  if not public.is_main_admin() then
    raise exception 'Only the main admin can add or remove admins.';
  end if;
  if lower(trim(p_email)) = 'omiadip308@gmail.com' then
    raise exception 'The main admin can''t be removed.';
  end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then
    raise exception 'No account with that email. Ask them to sign up in the app first.';
  end if;
  update public.profiles set role = case when p_admin then 'coach' else 'member' end where id = uid;
  if not found then
    raise exception 'That account has no profile yet. Ask them to open the app once.';
  end if;
  return 'ok';
end $$;

revoke all on function public.admin_set(text, boolean) from public, anon;
revoke all on function public.admin_list() from public, anon;
grant execute on function public.admin_set(text, boolean) to authenticated;
grant execute on function public.admin_list() to authenticated;
grant execute on function public.is_main_admin() to authenticated;

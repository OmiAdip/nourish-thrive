-- Coach access to member data, enforced in the database (review before applying).
-- Promise in the app: with "share with coach" on, the coach sees "your why, mood, streak, cravings,
-- wins and weight trend". Food diary, cycle data and progress photos always stay private.
-- Coaches still manage targets and plans (daily-target, training-plan, coach-plan) and see each
-- member's name, tier and goal so the coach panel works without consent.

-- true if the member has sharing on; only the member or a coach may ask
create or replace function public.member_shares_with_coach(p_user text) returns boolean
language sql stable security definer set search_path to '' as $$
  select (public.is_coach() or p_user = (select auth.uid())::text) and exists (
    select 1 from public.user_data d
    where d.user_id::text = p_user and d.key = 'profile'
      and public.as_json(d.value) ->> 'shareWithCoach' = 'true')
$$;

-- profile fields a coach may see; cycle fields are never included
create or replace function public.coach_profile_view(p jsonb, shared boolean) returns jsonb
language sql immutable set search_path to '' as $$
  select case
    when jsonb_typeof(p) <> 'object' then null
    when shared then p - array['cycleOn','cycleLen','periodStart','cycle','symptoms']
    else jsonb_strip_nulls(jsonb_build_object('name', p->'name', 'tier', p->'tier', 'goal', p->'goal',
           'maintenance', p->'maintenance', 'shareWithCoach', p->'shareWithCoach'))
  end
$$;

-- what the coach panel reads instead of the user_data table
create or replace function public.coach_user_data(p_user uuid, p_keys text[] default null)
returns table(key text, value jsonb, updated_at timestamptz)
language sql stable security definer set search_path to '' as $$
  with s as (select public.member_shares_with_coach(p_user::text) shared)
  select d.key,
         case when d.key = 'profile' then public.coach_profile_view(public.as_json(d.value), s.shared)
              else public.as_json(d.value) end,
         d.updated_at
  from public.user_data d, s
  where public.is_coach() and d.user_id = p_user
    and (p_keys is null or d.key = any(p_keys))
    and (d.key in ('profile','daily-target','training-plan','coach-plan')
         or (s.shared and d.key in ('checkins','craving-log','reflections','weekly-insights',
                                    'active-days','nsv-wins','proud-log')))
  order by d.key
$$;

-- coaches change only goal, tier and maintenance; the rest of the profile (incl. cycle data) is kept
create or replace function public.coach_patch_profile(p_user uuid, p_patch jsonb) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare cur jsonb; add jsonb;
begin
  if not public.is_coach() then raise exception 'Coaches only'; end if;
  select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) into add
    from jsonb_each(coalesce(p_patch, '{}'::jsonb)) e(k, v) where k in ('goal','tier','maintenance');
  select public.as_json(value) into cur from public.user_data where user_id = p_user and key = 'profile' for update;
  if cur is null or jsonb_typeof(cur) <> 'object' then cur := '{}'::jsonb; end if;
  cur := cur || add;
  -- stored as JSON text, like the app writes it
  insert into public.user_data (user_id, key, value) values (p_user, 'profile', to_jsonb(cur::text))
  on conflict (user_id, key) do update set value = excluded.value;
  return public.coach_profile_view(cur, public.member_shares_with_coach(p_user::text));
end $$;

-- member list: same columns as before, filtered the same way
create or replace function public.admin_users()
returns table(id uuid, email text, role text, joined timestamptz, last_active timestamptz, profile jsonb,
              latest_checkin jsonb, unread_notes integer, avatar_path text, plan jsonb)
language sql stable security definer set search_path to '' as $$
  select p.id, p.email, p.role, p.created_at,
    (select max(d.updated_at) from public.user_data d where d.user_id = p.id),
    (select c.value from public.coach_user_data(p.id, array['profile']) c),
    (select case when jsonb_typeof(c.value) = 'array' then c.value -> -1 end
       from public.coach_user_data(p.id, array['checkins']) c),
    (select count(*)::int from public.coach_notes n where n.user_id = p.id and n.read_at is null),
    p.avatar_path,
    (select jsonb_build_object('template', c.value->>'template', 'weeks', c.value->>'blockWeeks', 'coachSet', c.value->>'coachSet')
       from public.coach_user_data(p.id, array['training-plan']) c)
  from public.profiles p
  where public.is_coach()
  order by p.created_at desc
$$;

-- no more direct coach access to the user_data table; writes only to the keys coaches manage
drop policy if exists "coach reads data" on public.user_data;
drop policy if exists "coach inserts data" on public.user_data;
drop policy if exists "coach updates data" on public.user_data;
drop policy if exists "coach deletes data" on public.user_data;
create policy "coach writes managed keys" on public.user_data for insert to authenticated
  with check ((select public.is_coach()) and key in ('daily-target','training-plan','coach-plan'));
create policy "coach updates managed keys" on public.user_data for update to authenticated
  using ((select public.is_coach()) and key in ('daily-target','training-plan','coach-plan'))
  with check ((select public.is_coach()) and key in ('daily-target','training-plan','coach-plan'));
create policy "coach deletes managed keys" on public.user_data for delete to authenticated
  using ((select public.is_coach()) and key in ('daily-target','training-plan','coach-plan'));

-- the coach summary ("clients") is readable only while the member is sharing
drop policy if exists "read shared" on public.shared_docs;
create policy "read shared" on public.shared_docs for select to authenticated using (
  collection = any (array['squad','config','pairs','community','votes','slots','videos','scores'])
  or doc_id = (select auth.uid())::text
  or ((select public.is_coach()) and (collection <> 'clients' or public.member_shares_with_coach(doc_id))));

revoke execute on function public.coach_user_data(uuid, text[]), public.coach_patch_profile(uuid, jsonb),
  public.member_shares_with_coach(text), public.admin_users() from anon, public;
grant execute on function public.coach_user_data(uuid, text[]), public.coach_patch_profile(uuid, jsonb),
  public.member_shares_with_coach(text), public.admin_users() to authenticated;

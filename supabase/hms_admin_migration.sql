-- =============================================================================
-- BookNest — Admin dashboard: verification workflow, listing moderation,
-- user management (roles + suspend), and an audit trail.
-- Run AFTER the earlier migrations. Safe to re-run.
-- =============================================================================

-- ---- 1. Manager verifications: add 'more_info', reviewer + note ------------
alter table public.manager_verifications drop constraint if exists manager_verifications_status_check;
alter table public.manager_verifications add constraint manager_verifications_status_check
  check (status in ('pending', 'approved', 'rejected', 'more_info'));
alter table public.manager_verifications add column if not exists reviewed_by uuid references public.profiles (id) on delete set null;
alter table public.manager_verifications add column if not exists review_note text;

-- ---- 2. Hotels: rejection reason + reviewer --------------------------------
alter table public.hotels add column if not exists rejection_reason text;
alter table public.hotels add column if not exists reviewed_by uuid references public.profiles (id) on delete set null;
alter table public.hotels add column if not exists reviewed_at timestamptz;

-- ---- 3. Profiles: suspension -----------------------------------------------
alter table public.profiles add column if not exists suspended boolean not null default false;
alter table public.profiles add column if not exists suspended_reason text;
alter table public.profiles add column if not exists suspended_at timestamptz;

-- ---- 4. Audit log ----------------------------------------------------------
create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  target_type text not null,
  target_id   uuid,
  details     jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;
grant select on public.admin_audit_log to authenticated;
drop policy if exists "audit: admin read" on public.admin_audit_log;
create policy "audit: admin read" on public.admin_audit_log
  for select using (public.get_my_role() = 'admin');

-- =============================================================================
-- RPCs (SECURITY DEFINER, each checks admin + writes to the audit log)
-- =============================================================================

create or replace function public.admin_review_manager(
  p_id       uuid,
  p_decision text,
  p_note     text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_mv public.manager_verifications;
begin
  if public.get_my_role() <> 'admin' then raise exception 'Not allowed'; end if;
  if p_decision not in ('approved', 'rejected', 'more_info') then raise exception 'Invalid decision'; end if;
  select * into v_mv from public.manager_verifications where id = p_id;
  if not found then raise exception 'Application not found'; end if;

  update public.manager_verifications
    set status         = p_decision,
        rejection_reason = case when p_decision = 'rejected' then p_note else null end,
        review_note    = p_note,
        reviewed_at    = now(),
        reviewed_by    = v_uid
    where id = p_id;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, details)
    values (v_uid, 'manager_' || p_decision, 'manager_verification', p_id,
            jsonb_build_object('note', p_note, 'user_id', v_mv.user_id, 'business', v_mv.business_name));
end;
$$;

create or replace function public.admin_review_hotel(
  p_id       uuid,
  p_decision text,
  p_reason   text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_h public.hotels;
begin
  if public.get_my_role() <> 'admin' then raise exception 'Not allowed'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Invalid decision'; end if;
  select * into v_h from public.hotels where id = p_id;
  if not found then raise exception 'Hotel not found'; end if;

  update public.hotels
    set status           = p_decision,
        rejection_reason = case when p_decision = 'rejected' then p_reason else null end,
        reviewed_at      = now(),
        reviewed_by      = v_uid,
        published_at     = case when p_decision = 'approved' then now() else published_at end
    where id = p_id;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, details)
    values (v_uid, 'hotel_' || p_decision, 'hotel', p_id,
            jsonb_build_object('reason', p_reason, 'name', v_h.name));
end;
$$;

create or replace function public.admin_set_user_role(
  p_user uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if public.get_my_role() <> 'admin' then raise exception 'Not allowed'; end if;
  if p_role not in ('guest', 'manager', 'admin', 'staff') then raise exception 'Invalid role'; end if;

  update public.profiles set role = p_role where id = p_user;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, details)
    values (v_uid, 'set_role', 'user', p_user, jsonb_build_object('role', p_role));
end;
$$;

create or replace function public.admin_set_user_suspended(
  p_user      uuid,
  p_suspended boolean,
  p_reason    text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if public.get_my_role() <> 'admin' then raise exception 'Not allowed'; end if;
  if p_user = v_uid then raise exception 'You cannot suspend yourself'; end if;

  update public.profiles
    set suspended        = p_suspended,
        suspended_reason = case when p_suspended then p_reason else null end,
        suspended_at     = case when p_suspended then now() else null end
    where id = p_user;

  insert into public.admin_audit_log (admin_id, action, target_type, target_id, details)
    values (v_uid, case when p_suspended then 'suspend_user' else 'unsuspend_user' end, 'user', p_user,
            jsonb_build_object('reason', p_reason));
end;
$$;

-- Manager-side: resubmit a rejected / more-info application for re-review.
create or replace function public.resubmit_verification()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select id into v_id from public.manager_verifications
    where user_id = v_uid order by created_at desc limit 1;
  if v_id is null then raise exception 'No application found'; end if;

  update public.manager_verifications
    set status = 'pending', reviewed_at = null, reviewed_by = null,
        review_note = null, rejection_reason = null
    where id = v_id and status in ('more_info', 'rejected');
end;
$$;

grant execute on function public.admin_review_manager(uuid, text, text)        to authenticated;
grant execute on function public.admin_review_hotel(uuid, text, text)          to authenticated;
grant execute on function public.admin_set_user_role(uuid, text)               to authenticated;
grant execute on function public.admin_set_user_suspended(uuid, boolean, text) to authenticated;
grant execute on function public.resubmit_verification()                       to authenticated;

-- =============================================================================
-- BookNest — Messaging Polish Migration
-- Safe to re-run (idempotent).
-- =============================================================================

-- 1. Helper function to check if a manager/staff/admin or the user themselves
-- shares an active conversation with the target profile.
create or replace function public.shares_conversation_with(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversations c
    where c.guest_id = p_profile_id
      and (
        c.guest_id = auth.uid()
        or public.can_manage_hotel(c.hotel_id, 'reply_messages')
        or public.get_my_role() = 'admin'
      )
  );
$$;

grant execute on function public.shares_conversation_with(uuid) to authenticated;

-- 2. Scoped SELECT policy on public.profiles
drop policy if exists "profiles: read conversation guests" on public.profiles;
create policy "profiles: read conversation guests"
  on public.profiles for select
  using (public.shares_conversation_with(id));

-- 3. Update the message-attachments storage bucket to be private
update storage.buckets
set public = false
where id = 'message-attachments';

-- 4. Secure select policy for storage.objects in message-attachments
drop policy if exists "message-attachments: read" on storage.objects;
create policy "message-attachments: read"
  on storage.objects for select
  using (
    bucket_id = 'message-attachments'
    and (
      case
        when name like '%/%' then
          public.can_access_conversation(cast(split_part(name, '/', 1) as uuid))
        else false
      end
    )
  );

-- 5. Secure insert policy for storage.objects in message-attachments
drop policy if exists "message-attachments: write" on storage.objects;
create policy "message-attachments: write"
  on storage.objects for insert
  with check (
    bucket_id = 'message-attachments'
    and auth.role() = 'authenticated'
    and (
      case
        when name like '%/%' then
          public.can_access_conversation(cast(split_part(name, '/', 1) as uuid))
        else false
      end
    )
  );

-- 6. Performance Index for Message Retrieval
create index if not exists idx_messages_conversation_id
  on public.messages(conversation_id);

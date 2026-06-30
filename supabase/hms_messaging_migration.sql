-- =============================================================================
-- BookNest — Messaging System Migration
-- Safe to re-run (idempotent).
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. CONVERSATIONS TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.conversations (
  id                    uuid primary key default gen_random_uuid(),
  hotel_id              uuid not null references public.hotels(id) on delete cascade,
  guest_id              uuid not null references public.profiles(id) on delete cascade,
  booking_id            uuid null references public.bookings(id) on delete set null,
  status                text not null default 'open' check (status in ('open', 'resolved')),
  last_message_at       timestamptz not null default now(),
  last_message_preview  text,
  guest_unread          int not null default 0,
  host_unread           int not null default 0,
  created_at            timestamptz not null default now(),
  unique (hotel_id, guest_id)
);

create index if not exists conversations_hotel_last_msg_idx on public.conversations(hotel_id, last_message_at desc);
create index if not exists conversations_guest_last_msg_idx on public.conversations(guest_id, last_message_at desc);

-- ----------------------------------------------------------------------------
-- 2. MESSAGES TABLE
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id),
  sender_role     text not null check (sender_role in ('guest', 'host')),
  body            text,
  attachments     jsonb not null default '[]',
  read_at         timestamptz null,
  created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);

-- ----------------------------------------------------------------------------
-- 3. UNREAD + PREVIEW MAINTENANCE TRIGGER
-- ----------------------------------------------------------------------------
create or replace function public.on_message_inserted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_preview text;
begin
  -- Generate preview text
  if new.body is not null and trim(new.body) <> '' then
    v_preview := substring(new.body from 1 for 100);
  else
    v_preview := 'Photo';
  end if;

  -- Update parent conversation metadata and counters
  update public.conversations
  set
    last_message_at = new.created_at,
    last_message_preview = v_preview,
    host_unread = case when new.sender_role = 'guest' then host_unread + 1 else host_unread end,
    guest_unread = case when new.sender_role = 'host' then guest_unread + 1 else guest_unread end
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists on_message_inserted_trigger on public.messages;
create trigger on_message_inserted_trigger
  after insert on public.messages
  for each row execute function public.on_message_inserted();

-- ----------------------------------------------------------------------------
-- 4. SECURITY DEFINER HELPERS (RLS recursion prevention)
-- ----------------------------------------------------------------------------
create or replace function public.can_access_conversation(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and (
        c.guest_id = auth.uid()
        or public.can_manage_hotel(c.hotel_id, 'reply_messages')
        or public.get_my_role() = 'admin'
      )
  );
$$;

create or replace function public.validate_message_sender(p_conversation_id uuid, p_sender_id uuid, p_sender_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and p_sender_id = auth.uid()
      and (
        (p_sender_role = 'guest' and c.guest_id = auth.uid())
        or
        (p_sender_role = 'host' and (public.can_manage_hotel(c.hotel_id, 'reply_messages') or public.get_my_role() = 'admin'))
      )
  );
$$;

grant execute on function public.can_access_conversation(uuid) to authenticated;
grant execute on function public.validate_message_sender(uuid, uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY & POLICIES
-- ----------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Conversations select
drop policy if exists "conversations: select" on public.conversations;
create policy "conversations: select"
  on public.conversations for select
  using (guest_id = auth.uid() or public.can_manage_hotel(hotel_id, 'reply_messages') or public.get_my_role() = 'admin');

-- Conversations insert
drop policy if exists "conversations: insert" on public.conversations;
create policy "conversations: insert"
  on public.conversations for insert
  with check (guest_id = auth.uid() or public.can_manage_hotel(hotel_id, 'reply_messages') or public.get_my_role() = 'admin');

-- Conversations update
drop policy if exists "conversations: update" on public.conversations;
create policy "conversations: update"
  on public.conversations for update
  using (guest_id = auth.uid() or public.can_manage_hotel(hotel_id, 'reply_messages') or public.get_my_role() = 'admin')
  with check (guest_id = auth.uid() or public.can_manage_hotel(hotel_id, 'reply_messages') or public.get_my_role() = 'admin');

-- Messages select
drop policy if exists "messages: select" on public.messages;
create policy "messages: select"
  on public.messages for select
  using (public.can_access_conversation(conversation_id));

-- Messages insert
drop policy if exists "messages: insert" on public.messages;
create policy "messages: insert"
  on public.messages for insert
  with check (public.validate_message_sender(conversation_id, sender_id, sender_role));

-- ----------------------------------------------------------------------------
-- 6. REALTIME REPLICATION
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
exception
  when others then
    -- Ignore error if realtime publication is not configured or in local migration
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. STORAGE BUCKET FOR ATTACHMENTS
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('message-attachments', 'message-attachments', true)
on conflict (id) do nothing;

drop policy if exists "message-attachments: read" on storage.objects;
drop policy if exists "message-attachments: write" on storage.objects;

create policy "message-attachments: read"
  on storage.objects for select
  using (bucket_id = 'message-attachments');

create policy "message-attachments: write"
  on storage.objects for insert
  with check (bucket_id = 'message-attachments' and auth.role() = 'authenticated');

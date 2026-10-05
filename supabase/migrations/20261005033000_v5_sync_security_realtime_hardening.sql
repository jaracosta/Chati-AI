-- Chati-AI V5 sync hardening + Realtime enablement
-- Applied to project pqnebvtbxwpizhzvrisu.

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

drop policy if exists "Users can read own conversations" on public.cloud_conversations;
create policy "Users can read own conversations"
on public.cloud_conversations
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own conversations" on public.cloud_conversations;
create policy "Users can insert own conversations"
on public.cloud_conversations
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own conversations" on public.cloud_conversations;
create policy "Users can update own conversations"
on public.cloud_conversations
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own conversations" on public.cloud_conversations;
create policy "Users can delete own conversations"
on public.cloud_conversations
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own messages" on public.cloud_messages;
create policy "Users can read own messages"
on public.cloud_messages
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own messages" on public.cloud_messages;
create policy "Users can insert own messages"
on public.cloud_messages
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own messages" on public.cloud_messages;
create policy "Users can update own messages"
on public.cloud_messages
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own messages" on public.cloud_messages;
create policy "Users can delete own messages"
on public.cloud_messages
for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists cloud_messages_conversation_user_idx
on public.cloud_messages (conversation_id, user_id);

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'cloud_conversations'
    ) then
      alter publication supabase_realtime add table public.cloud_conversations;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'cloud_messages'
    ) then
      alter publication supabase_realtime add table public.cloud_messages;
    end if;
  end if;
end
$$;

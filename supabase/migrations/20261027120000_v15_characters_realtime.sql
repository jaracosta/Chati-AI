-- Characters (cloud_items) send realtime changes too, so a character made or
-- edited on one device shows up on the others right away instead of on the
-- 30-second sync timer. Row level security (select own rows only) applies to
-- realtime, so each user only hears about their own characters.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cloud_items'
  ) then
    alter publication supabase_realtime add table public.cloud_items;
  end if;
end $$;

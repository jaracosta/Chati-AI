-- Chati-AI V7: user_profiles was created without table privileges, so every
-- profile read/save failed with "permission denied for table user_profiles".
-- Signed-in users need table privileges; RLS policies still limit each user
-- to their own row. Anonymous visitors get no access.
grant select, insert, update, delete on table public.user_profiles to authenticated;
revoke all on table public.user_profiles from anon;

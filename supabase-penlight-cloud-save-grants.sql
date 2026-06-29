-- Tool48 Penlight List cloud save grants and RLS policies.
-- Run this in the Supabase SQL Editor as the project owner/admin.
-- Do not put service_role, database password, or backend-only secrets in frontend code.

grant usage on schema public to anon, authenticated;

grant select on table public.members to anon, authenticated;
grant select on table public.performances to anon, authenticated;

grant select, insert, update, delete on table public.user_followed_performances to authenticated;
grant select, insert, update, delete on table public.penlight_lists to authenticated;
grant select, insert, update, delete on table public.penlight_list_items to authenticated;

alter table public.members enable row level security;
alter table public.performances enable row level security;
alter table public.user_followed_performances enable row level security;
alter table public.penlight_lists enable row level security;
alter table public.penlight_list_items enable row level security;

drop policy if exists "members_public_read" on public.members;
create policy "members_public_read"
on public.members
for select
to anon, authenticated
using (true);

drop policy if exists "performances_public_read" on public.performances;
create policy "performances_public_read"
on public.performances
for select
to anon, authenticated
using (true);

drop policy if exists "user_followed_performances_select_own" on public.user_followed_performances;
create policy "user_followed_performances_select_own"
on public.user_followed_performances
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_followed_performances_insert_own" on public.user_followed_performances;
create policy "user_followed_performances_insert_own"
on public.user_followed_performances
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_followed_performances_update_own" on public.user_followed_performances;
create policy "user_followed_performances_update_own"
on public.user_followed_performances
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_followed_performances_delete_own" on public.user_followed_performances;
create policy "user_followed_performances_delete_own"
on public.user_followed_performances
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "penlight_lists_select_own" on public.penlight_lists;
create policy "penlight_lists_select_own"
on public.penlight_lists
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "penlight_lists_insert_own" on public.penlight_lists;
create policy "penlight_lists_insert_own"
on public.penlight_lists
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "penlight_lists_update_own" on public.penlight_lists;
create policy "penlight_lists_update_own"
on public.penlight_lists
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "penlight_lists_delete_own" on public.penlight_lists;
create policy "penlight_lists_delete_own"
on public.penlight_lists
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "penlight_list_items_select_own" on public.penlight_list_items;
create policy "penlight_list_items_select_own"
on public.penlight_list_items
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "penlight_list_items_insert_own" on public.penlight_list_items;
create policy "penlight_list_items_insert_own"
on public.penlight_list_items
for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.penlight_lists
    where penlight_lists.id = list_id
      and penlight_lists.user_id = auth.uid()
  )
);

drop policy if exists "penlight_list_items_update_own" on public.penlight_list_items;
create policy "penlight_list_items_update_own"
on public.penlight_list_items
for update
to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from public.penlight_lists
    where penlight_lists.id = list_id
      and penlight_lists.user_id = auth.uid()
  )
);

drop policy if exists "penlight_list_items_delete_own" on public.penlight_list_items;
create policy "penlight_list_items_delete_own"
on public.penlight_list_items
for delete
to authenticated
using (auth.uid() = user_id);

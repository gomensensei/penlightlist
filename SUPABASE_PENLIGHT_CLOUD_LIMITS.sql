begin;

-- Tool48 Penlight cloud-save hard limit.
-- This preserves the existing "multiple list" model, but caps new cloud lists
-- at 3 per user from the moment this patch is run.

create or replace function public.tool48_enforce_penlight_list_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is null then
    raise exception 'tool48_penlight_cloud_list_user_missing';
  end if;

  if pg_column_size(new.payload) > 131072 then
    raise exception 'tool48_penlight_payload_too_large';
  end if;

  if tg_op = 'INSERT' and (
    select count(*)
    from public.penlight_lists
    where user_id = new.user_id
  ) >= 3 then
    raise exception 'tool48_penlight_cloud_list_limit_reached';
  end if;

  return new;
end;
$$;

drop trigger if exists tool48_penlight_list_limit_before_insert on public.penlight_lists;
drop trigger if exists tool48_penlight_list_limit_before_write on public.penlight_lists;
create trigger tool48_penlight_list_limit_before_write
before insert or update on public.penlight_lists
for each row execute function public.tool48_enforce_penlight_list_limit();

notify pgrst, 'reload schema';

commit;

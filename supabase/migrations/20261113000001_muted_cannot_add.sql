-- Muted users can't add songs. The UI hides the add buttons; this enforces it
-- for anyone calling the API directly with their own user id.
-- ponytail: rows without added_by_id (extension, auto-suggest) are not checked; a
-- determined user could omit it. Real fix is auth-backed identity.
create or replace function public.reject_muted_queue_insert()
returns trigger
language plpgsql
as $$
begin
  if new.added_by_id is not null and exists (
    select 1 from public.rooms r
    where r.id = new.room_id and r.user_roles ->> new.added_by_id = 'muted'
  ) then
    raise exception 'You are muted in this room' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists queue_items_reject_muted on public.queue_items;
create trigger queue_items_reject_muted
  before insert on public.queue_items
  for each row execute function public.reject_muted_queue_insert();

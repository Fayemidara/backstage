-- Notifications on posts: create trigger to insert notifications for subscribers
-- 1) Trigger function
create or replace function public.notify_subscribers_on_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only for top-level posts (not replies)
  if new.parent_post_id is not null then
    return new;
  end if;

  -- Insert a notification for all active subscribers except the author
  insert into public.notifications (user_id, message, type, community_id, reference_id, read)
  select s.user_id,
         coalesce((select p.username from public.communities c join public.profiles p on p.id = c.artist_id where c.id = new.community_id), 'Artist') || ' just posted in Lounge' as message,
         'post'::text as type,
         new.community_id,
         new.id,
         false
  from public.subscriptions s
  where s.community_id = new.community_id
    and s.status = 'active'
    and s.user_id <> new.user_id;

  return new;
end;
$$;

-- 2) Drop and recreate trigger to avoid duplicates
drop trigger if exists trg_notify_on_post on public.posts;
create trigger trg_notify_on_post
after insert on public.posts
for each row
execute function public.notify_subscribers_on_post();
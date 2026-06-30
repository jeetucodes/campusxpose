
create extension if not exists pg_net;

-- ============ tables ============
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_hash text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index idx_push_subs_user_hash on public.push_subscriptions(user_hash);
grant all on public.push_subscriptions to service_role;
alter table public.push_subscriptions enable row level security;
-- locked: no anon/authenticated policies; accessed only via backend (service role)

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_hash text not null,
  type text not null,
  message text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on public.notifications(user_hash, created_at desc);
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
-- locked: accessed only via backend server functions (service role)

create table public.push_config (
  id int primary key default 1,
  dispatch_url text not null,
  dispatch_token text not null,
  constraint push_config_singleton check (id = 1)
);
grant all on public.push_config to service_role;
alter table public.push_config enable row level security;
insert into public.push_config (id, dispatch_url, dispatch_token)
values (1, 'https://mcobkriudveoevbrmrwi.supabase.co/functions/v1/send-push',
        '7bc9f52067d13583e0b6323bb7a2bf6d8cc0fae38f7d1c5acff3881c1c197c75');

-- ============ enqueue helper ============
create or replace function public.enqueue_notifications(
  _hashes text[], _type text, _title text, _message text, _link text
) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  _cfg public.push_config%rowtype;
  _clean text[];
begin
  -- de-duplicate and drop nulls/empties
  select array_agg(distinct h) into _clean
  from unnest(_hashes) as h
  where h is not null and h <> '';

  if _clean is null or array_length(_clean, 1) is null then
    return;
  end if;

  -- in-app history (always, even if push fails)
  insert into public.notifications (user_hash, type, message, link)
  select h, _type, _message, _link from unnest(_clean) as h;

  -- best-effort browser push; never block the source insert
  begin
    select * into _cfg from public.push_config where id = 1;
    if found then
      perform net.http_post(
        url := _cfg.dispatch_url,
        body := jsonb_build_object(
          'user_hashes', to_jsonb(_clean),
          'payload', jsonb_build_object('title', _title, 'body', _message, 'url', _link)
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-dispatch-secret', _cfg.dispatch_token
        )
      );
    end if;
  exception when others then
    -- swallow: push is best-effort
    null;
  end;
end;
$$;

-- ============ triggers ============
-- 1) direct message -> recipient only
create or replace function public.trg_notify_dm() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.recipient_hash is not null and new.recipient_hash <> new.sender_hash then
    perform public.enqueue_notifications(
      array[new.recipient_hash], 'dm',
      'New message', 'New message from ' || new.sender_username,
      '/messages'
    );
  end if;
  return new;
end;
$$;
create trigger notify_dm after insert on public.direct_messages
for each row execute function public.trg_notify_dm();

-- 2) global chat reply -> thread participants (excluding the replier)
create or replace function public.trg_notify_global_reply() returns trigger
language plpgsql security definer set search_path = public as $$
declare _hashes text[];
begin
  if new.reply_to_id is not null then
    select array_agg(distinct anonymous_user_hash) into _hashes
    from public.global_messages
    where (id = new.reply_to_id or reply_to_id = new.reply_to_id)
      and anonymous_user_hash <> new.anonymous_user_hash;
    if _hashes is not null then
      perform public.enqueue_notifications(
        _hashes, 'reply',
        'New reply', new.username || ' replied in a thread you joined',
        '/global'
      );
    end if;
  end if;
  return new;
end;
$$;
create trigger notify_global_reply after insert on public.global_messages
for each row execute function public.trg_notify_global_reply();

-- 3) comment on a report -> report owner (+ parent comment author)
create or replace function public.trg_notify_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare _owner text; _parent text; _college uuid; _hashes text[];
begin
  select anonymous_user_hash, college_id into _owner, _college
  from public.posts where id = new.post_id;

  if new.parent_id is not null then
    select anonymous_user_hash into _parent
    from public.post_comments where id = new.parent_id;
  end if;

  _hashes := array_remove(array[_owner, _parent], new.anonymous_user_hash);

  if _hashes is not null and array_length(_hashes,1) is not null then
    perform public.enqueue_notifications(
      _hashes, 'comment',
      'New comment', new.username || ' commented on a report you follow',
      '/colleges/' || coalesce(_college::text, '')
    );
  end if;
  return new;
end;
$$;
create trigger notify_comment after insert on public.post_comments
for each row execute function public.trg_notify_comment();

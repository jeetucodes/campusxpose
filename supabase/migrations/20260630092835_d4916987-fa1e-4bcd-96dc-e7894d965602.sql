
revoke execute on function public.enqueue_notifications(text[], text, text, text, text) from anon, authenticated, public;
revoke execute on function public.trg_notify_dm() from anon, authenticated, public;
revoke execute on function public.trg_notify_global_reply() from anon, authenticated, public;
revoke execute on function public.trg_notify_comment() from anon, authenticated, public;

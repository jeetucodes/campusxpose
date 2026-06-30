import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, MessageCircle, Globe, ArrowLeft, Plus, Trash2, X, Pin } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIdentity } from "@/stores/identity";
import { supabase } from "@/integrations/supabase/client";
import { useDmStore } from "@/stores/dm";
import { UserSymbol } from "@/components/UserSymbol";
import { submitDirectMessage, fetchDirectMessages, deleteDirectConversation, togglePinMessage } from "@/lib/content.functions";
import { useReactions } from "@/hooks/useReactions";
import { ReactionChips, MessageActions, ReplyQuote } from "@/components/MessageReactions";
import { MessageGestures } from "@/components/MessageGestures";
import { usePresence } from "@/hooks/usePresence";
import { TypingIndicator } from "@/components/ChatPresence";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useVerifiedUsernames } from "@/hooks/useVerified";
import { VerifiedBadge } from "@/components/VerifiedBadge";

type Search = { to?: string };

export const Route = createFileRoute("/messages")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    to: typeof s.to === "string" ? s.to : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Direct Messages — CampusXpose" },
      {
        name: "description",
        content: "Anonymous one-to-one conversations between CampusXpose users.",
      },
      { property: "og:url", content: "https://campusxpose.online/messages" },
    ],
    links: [{ rel: "canonical", href: "https://campusxpose.online/messages" }],
  }),
  component: Messages,
});

type DM = {
  id: string;
  sender_username: string;
  recipient_username: string;
  sender_hash: string;
  content: string;
  created_at: string;
  reply_to_id?: string | null;
  reply_to_username?: string | null;
  reply_to_content?: string | null;
  pinned?: boolean;
};

function Messages() {
  const { to } = Route.useSearch();
  const navigate = useNavigate();
  const { hashedId, username, init } = useIdentity();
  const verified = useVerifiedUsernames();
  const markRead = useDmStore((s) => s.markRead);
  const refreshUnread = useDmStore((s) => s.refresh);
  const unreadBy = useDmStore((s) => s.unreadBy);
  const [all, setAll] = useState<DM[]>([]);
  const [text, setText] = useState("");
  const [newName, setNewName] = useState("");
  const [replyTo, setReplyTo] = useState<DM | null>(null);
  const { byMessage, toggle } = useReactions("direct", hashedId);

  const pinMessage = async (m: DM) => {
    if (!hashedId) return;
    const next = !m.pinned;
    setAll((prev) => prev.map((x) => (x.id === m.id ? { ...x, pinned: next } : x)));
    try {
      await togglePinMessage({
        data: { messageId: m.id, messageType: "direct", hashedId, pinned: next },
      });
    } catch {
      setAll((prev) => prev.map((x) => (x.id === m.id ? { ...x, pinned: !next } : x)));
      toast.error("Could not update pin");
    }
  };



  useEffect(() => {
    init();
  }, [init]);

  const load = useMemo(
    () => async () => {
      if (!hashedId || !username) return;
      try {
        const r = await fetchDirectMessages({ data: { hashedId, username } });
        setAll((r.messages ?? []) as DM[]);
      } catch {
        /* ignore transient errors */
      }
    },
    [hashedId, username],
  );

  useEffect(() => {
    if (!username) return;
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [username, load]);

  // Realtime: instantly reflect new/updated DMs that involve me.
  useEffect(() => {
    if (!hashedId) return;
    const ch = supabase
      .channel(`dm-rt-${hashedId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        (p) => {
          const row = (p.new ?? p.old) as { sender_hash?: string; recipient_hash?: string };
          if (row?.sender_hash === hashedId || row?.recipient_hash === hashedId) {
            load();
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [hashedId, load]);

  // Build conversation list: the "other party" for every message I'm part of.
  const conversations = useMemo(() => {
    const map = new Map<string, DM>();
    for (const m of all) {
      const other =
        m.sender_username === username ? m.recipient_username : m.sender_username;
      const existing = map.get(other);
      if (!existing || existing.created_at < m.created_at) map.set(other, m);
    }
    return Array.from(map.entries())
      .map(([name, last]) => ({ name, last }))
      .sort((a, b) => (a.last.created_at < b.last.created_at ? 1 : -1));
  }, [all, username]);

  const active = to;
  const dmRoom = active && username ? `dm-${[username, active].sort().join("|")}` : "";
  const { online, typing, notifyTyping } = usePresence(dmRoom, username, hashedId);
  const thread = useMemo(
    () =>
      active
        ? all.filter(
            (m) =>
              (m.sender_username === username &&
                m.recipient_username === active) ||
              (m.sender_username === active &&
                m.recipient_username === username),
          )
        : [],
    [all, active, username],
  );

  // Mark the open conversation as read whenever it changes or new messages land.
  useEffect(() => {
    if (active) {
      markRead(active);
      if (hashedId) refreshUnread(hashedId);
    }
  }, [active, thread.length, markRead, refreshUnread, hashedId]);

  const threadBoxRef = useRef<HTMLDivElement>(null);

  const prevActive = useRef<string | undefined>(undefined);
  useEffect(() => {
    const box = threadBoxRef.current;
    if (!box || !active) return;
    const instant = prevActive.current !== active;
    prevActive.current = active;
    box.scrollTo({ top: box.scrollHeight, behavior: instant ? "auto" : "smooth" });
  }, [active, thread.length]);

  const send = async () => {
    if (!text.trim() || !hashedId || !username || !active) return;
    const content = text.trim();
    const reply = replyTo;
    setText("");
    setReplyTo(null);
    // Optimistic insert so the message appears instantly (real-time feel).
    const tempId = `temp-${Date.now()}`;
    const optimistic: DM = {
      id: tempId,
      sender_username: username,
      recipient_username: active,
      sender_hash: hashedId,
      content,
      created_at: new Date().toISOString(),
      reply_to_id: reply?.id ?? null,
      reply_to_username: reply?.sender_username ?? null,
      reply_to_content: reply?.content ?? null,
    };
    setAll((prev) => [...prev, optimistic]);
    try {
      await submitDirectMessage({
        data: {
          hashedId,
          username,
          recipientUsername: active,
          content,
          replyToId: reply?.id,
          replyToUsername: reply?.sender_username,
          replyToContent: reply?.content,
        },
      });
      await load();
    } catch (e) {
      // Roll back the optimistic message on failure.
      setAll((prev) => prev.filter((m) => m.id !== tempId));
      toast.error(e instanceof Error ? e.message : "Message failed");
    }
  };


  const startNew = () => {
    const name = newName.trim();
    if (name.length < 3) return toast.error("Enter a valid username");
    if (name === username) return toast.error("You cannot message yourself");
    setNewName("");
    navigate({ to: "/messages", search: { to: name } });
  };

  const deleteConversation = async (other: string) => {
    if (!hashedId) return;
    if (!window.confirm(`Delete all messages with ${other}? This can't be undone.`)) return;
    setAll((prev) =>
      prev.filter(
        (m) =>
          !(
            (m.sender_username === username && m.recipient_username === other) ||
            (m.sender_username === other && m.recipient_username === username)
          ),
      ),
    );
    try {
      await deleteDirectConversation({ data: { hashedId, otherUsername: other } });
      toast.success("Conversation deleted");
      if (active === other) navigate({ to: "/messages", search: {} });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
      await load();
    }
  };

  return (
    <div className="flex h-[100dvh] bg-background md:h-[calc(100vh-4rem)]">
      {/* Conversation list */}
      <aside
        className={cn(
          "w-full flex-col border-r-2 border-dashed border-border md:flex md:w-72",
          active ? "hidden md:flex" : "flex",
        )}
      >
        <header className="flex items-center gap-2 border-b-2 border-dashed border-border px-4 py-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <MessageCircle className="h-5 w-5 text-accent" strokeWidth={2.5} />
          <span className="font-display text-lg font-bold">Direct Messages</span>
          <Button asChild variant="ghost" size="icon" className="ml-auto">
            <Link to="/global">
              <Globe className="h-4 w-4" />
            </Link>
          </Button>
        </header>

        <div className="border-b-2 border-dashed border-border p-3">
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startNew()}
              placeholder="username to message..."
            />
            <Button onClick={startNew} size="icon" className="shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((c) => {
            const unread = unreadBy[c.name] ?? 0;
            return (
              <div
                key={c.name}
                className={cn(
                  "group flex items-center gap-3 border-b border-dashed border-border px-4 py-3 transition-colors hover:bg-accent/10",
                  active === c.name && "bg-accent/15",
                )}
              >
                <Link
                  to="/messages"
                  search={{ to: c.name }}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <UserSymbol username={c.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 truncate font-medium">
                      {c.name}{c.name && verified.has(c.name) && <VerifiedBadge className="h-3.5 w-3.5" />}
                      {unread > 0 && active !== c.name && (
                        <span className="grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-accent-foreground">
                          {unread > 9 ? "9+" : unread}
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {c.last.sender_username === username ? "You: " : ""}
                      {c.last.content}
                    </div>
                  </div>
                  <div className="shrink-0 text-[10px] text-muted-foreground">
                    {timeAgo(c.last.created_at)}
                  </div>
                </Link>
              </div>
            );
          })}
          {conversations.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No conversations yet. Start one above, or tap a username in Global
              Chat.
            </p>
          )}
        </div>
      </aside>

      {/* Active thread */}
      <section
        className={cn("flex-1 flex-col", active ? "flex" : "hidden md:flex")}
      >
        {active ? (
          <>
            <header className="flex items-center gap-3 border-b-2 border-dashed border-border px-4 py-3">
              <Button asChild variant="ghost" size="icon">
                <Link to="/messages" search={{}}>
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <UserSymbol username={active} size="md" />
              <div>
                <div className="inline-flex items-center gap-1 font-display font-bold">{active}{active && verified.has(active) && <VerifiedBadge />}</div>
                {online >= 2 ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    online
                  </span>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Anonymous direct message
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto text-muted-foreground hover:text-destructive"
                aria-label={`Delete conversation with ${active}`}
                onClick={() => deleteConversation(active)}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </header>

            {thread.some((m) => m.pinned) && (
              <div className="border-b-2 border-dashed border-border bg-surface-2/60 px-4 py-2">
                <div className="mx-auto w-full max-w-2xl space-y-1">
                  {thread.filter((m) => m.pinned).map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-xs">
                      <Pin className="h-3.5 w-3.5 shrink-0 text-accent" />
                      <span className="shrink-0 font-semibold text-accent">{m.sender_username}:</span>
                      <span className="truncate text-muted-foreground">{m.content}</span>
                      <button
                        onClick={() => pinMessage(m)}
                        className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label="Unpin"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div ref={threadBoxRef} className="mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
              {thread.map((m) => {
                const own = m.sender_hash === hashedId;
                const reactions = byMessage.get(m.id) ?? [];
                return (
                  <div
                    key={m.id}
                    className={cn("group flex w-full", own ? "justify-end" : "justify-start")}
                  >
                    <div className={cn("flex max-w-[85%] flex-col gap-0", own ? "items-end" : "items-start")}>
                    <MessageGestures onReply={() => setReplyTo(m)} onReact={(e) => toggle(m.id, e)} onPin={() => pinMessage(m)} pinned={m.pinned} align={own ? "end" : "start"}>
                    <div className={cn("flex items-center gap-1", own ? "flex-row" : "flex-row-reverse")}>
                      <MessageActions
                        className="hidden transition-opacity md:flex md:opacity-0 md:group-hover:opacity-100"
                        onToggle={(e) => toggle(m.id, e)}
                        onReply={() => setReplyTo(m)}
                        onPin={() => pinMessage(m)}
                        pinned={m.pinned}
                      />
                      <div
                        className={cn(
                          "relative w-fit max-w-full border-2 border-border px-3 py-2 text-sm shadow-ink-soft",
                          own ? "bg-accent text-accent-foreground" : "bg-white",
                        )}
                        style={{
                          borderRadius: own
                            ? "18px 6px 18px 18px"
                            : "6px 18px 18px 18px",
                        }}
                      >
                        {m.pinned && (
                          <Pin className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rotate-45 text-accent" />
                        )}
                        <ReplyQuote username={m.reply_to_username} content={m.reply_to_content} align={own ? "end" : "start"} />
                        <div className="flex flex-wrap items-end justify-end gap-x-2">
                          <span className="whitespace-pre-wrap break-words leading-relaxed">
                            {m.content}
                          </span>
                          <span className={cn("shrink-0 text-[10px]", own ? "text-accent-foreground/70" : "text-muted-foreground")}>
                            {timeAgo(m.created_at)}
                          </span>
                        </div>
                      </div>

                    </div>
                    </MessageGestures>
                    <ReactionChips reactions={reactions} onToggle={(e) => toggle(m.id, e)} align={own ? "end" : "start"} />
                    </div>
                  </div>
                );
              })}
              {thread.length === 0 && (
                <p className="my-auto text-center text-sm text-muted-foreground">
                  No messages yet. Say hi to {active}.
                </p>
              )}
            </div>

            <div className="border-t-2 border-dashed border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <div className="mx-auto w-full max-w-2xl">
                <TypingIndicator users={typing} className="mb-1.5 px-1" />
                {replyTo && (
                  <div className="mb-2 flex items-center gap-2 rounded-md border border-border bg-surface-2/60 px-3 py-1.5 text-xs">
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-accent">Replying to {replyTo.sender_username}</span>
                      <div className="truncate text-muted-foreground">{replyTo.content}</div>
                    </div>
                    <button onClick={() => setReplyTo(null)} aria-label="Cancel reply">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2 rounded-2xl border-2 border-border bg-white px-2 py-1.5 shadow-ink-soft transition-colors focus-within:border-accent">
                  <Input
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      notifyTyping();
                    }}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder={`Message ${active}...`}
                    maxLength={1000}
                    className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Button
                    onClick={send}
                    disabled={!text.trim()}
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-full transition-transform active:scale-90"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <MessageCircle className="h-10 w-10 text-accent" strokeWidth={2} />
            <p>Pick a conversation or start a new one.</p>
          </div>
        )}
      </section>
    </div>
  );
}

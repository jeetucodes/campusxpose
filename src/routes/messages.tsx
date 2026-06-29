import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, MessageCircle, Globe, ArrowLeft, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIdentity } from "@/stores/identity";
import { useDmStore } from "@/stores/dm";
import { UserSymbol } from "@/components/UserSymbol";
import { submitDirectMessage, fetchDirectMessages, deleteDirectConversation } from "@/lib/content.functions";
import { useReactions } from "@/hooks/useReactions";
import { ReactionChips, MessageActions, ReplyQuote } from "@/components/MessageReactions";
import { MessageGestures } from "@/components/MessageGestures";
import { usePresence } from "@/hooks/usePresence";
import { TypingIndicator } from "@/components/ChatPresence";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

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
    ],
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
};

function Messages() {
  const { to } = Route.useSearch();
  const navigate = useNavigate();
  const { hashedId, username, init } = useIdentity();
  const markRead = useDmStore((s) => s.markRead);
  const refreshUnread = useDmStore((s) => s.refresh);
  const unreadBy = useDmStore((s) => s.unreadBy);
  const [all, setAll] = useState<DM[]>([]);
  const [text, setText] = useState("");
  const [newName, setNewName] = useState("");
  const [replyTo, setReplyTo] = useState<DM | null>(null);
  const { byMessage, toggle } = useReactions("direct", hashedId);

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
    <div className="flex h-[calc(100vh-4rem)] bg-background">
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
                      {c.name}
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
                <div className="font-display font-bold">{active}</div>
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

            <div ref={threadBoxRef} className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
              {thread.map((m) => {
                const own = m.sender_username === username;
                const reactions = byMessage.get(m.id) ?? [];
                return (
                  <div key={m.id} className={cn("group flex flex-col gap-1", own ? "items-end" : "items-start")}>
                    <MessageGestures onReply={() => setReplyTo(m)} onReact={(e) => toggle(m.id, e)} align={own ? "end" : "start"}>
                    <div className={cn("flex items-center gap-1", own ? "flex-row" : "flex-row-reverse")}>
                      <MessageActions
                        className="hidden transition-opacity md:flex md:opacity-0 md:group-hover:opacity-100"
                        onToggle={(e) => toggle(m.id, e)}
                        onReply={() => setReplyTo(m)}
                      />
                      <div
                        className={cn(
                          "max-w-[80%] border-2 border-border px-3 py-2 text-sm shadow-ink-soft",
                          own ? "bg-accent/15" : "bg-white",
                        )}
                        style={{
                          borderRadius: "16px 6px 18px 6px / 6px 18px 6px 16px",
                        }}
                      >
                        <ReplyQuote username={m.reply_to_username} content={m.reply_to_content} align={own ? "end" : "start"} />
                        <div className="whitespace-pre-wrap break-words">
                          {m.content}
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {timeAgo(m.created_at)}
                        </div>
                      </div>
                    </div>
                    </MessageGestures>
                    <ReactionChips reactions={reactions} onToggle={(e) => toggle(m.id, e)} align={own ? "end" : "start"} />
                  </div>
                );
              })}
              {thread.length === 0 && (
                <p className="my-auto text-center text-sm text-muted-foreground">
                  No messages yet. Say hi to {active}.
                </p>
              )}
            </div>

            <div className="border-t-2 border-dashed border-border px-4 py-3">
              <div className="mx-auto w-full max-w-2xl">
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
                <div className="flex items-center gap-2">
                  <Input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && send()}
                    placeholder="Message..."
                    maxLength={1000}
                  />
                  <Button
                    onClick={send}
                    disabled={!text.trim()}
                    size="icon"
                    className="shrink-0"
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

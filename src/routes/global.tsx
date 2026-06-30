import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Send, Globe, MessageCircle, ArrowLeft, X, Pin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIdentity } from "@/stores/identity";
import { UserSymbol } from "@/components/UserSymbol";
import { submitGlobalMessage, togglePinMessage } from "@/lib/content.functions";
import { useReactions } from "@/hooks/useReactions";
import { ReactionChips, MessageActions, ReplyQuote } from "@/components/MessageReactions";
import { MessageGestures } from "@/components/MessageGestures";
import { usePresence } from "@/hooks/usePresence";
import { useVerifiedUsernames } from "@/hooks/useVerified";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { TypingIndicator } from "@/components/ChatPresence";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AdPin } from "@/components/AdPin";
import { PollItem, NewPollButton } from "@/components/ChatPolls";
import { usePolls, type Poll } from "@/hooks/usePolls";

export const Route = createFileRoute("/global")({
  head: () => ({
    meta: [
      { title: "Global Chat — CampusXpose" },
      {
        name: "description",
        content:
          "One anonymous platform-wide room where students from every campus talk freely.",
      },
      { property: "og:url", content: "https://campusxpose.online/global" },
    ],
    links: [{ rel: "canonical", href: "https://campusxpose.online/global" }],
  }),
  component: GlobalChat,
});

type Msg = {
  id: string;
  username: string;
  content: string;
  anonymous_user_hash: string;
  created_at: string;
  pinned?: boolean;
  reply_to_id?: string | null;
  reply_to_username?: string | null;
  reply_to_content?: string | null;
};

function GlobalChat() {
  const { hashedId, username, init } = useIdentity();
  const verified = useVerifiedUsernames();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const navigate = useNavigate();
  const { byMessage, toggle } = useReactions("global", hashedId);
  const { typing, notifyTyping } = usePresence("global", username, hashedId);
  const { polls, votes, reload: reloadPolls } = usePolls("global");

  const pinMessage = async (m: Msg) => {
    if (!hashedId) return;
    const next = !m.pinned;
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, pinned: next } : x)));
    try {
      await togglePinMessage({
        data: { messageId: m.id, messageType: "global", hashedId, pinned: next },
      });
    } catch {
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, pinned: !next } : x)));
      toast.error("Could not update pin");
    }
  };

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    supabase
      .from("global_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(150)
      .then(({ data }) => setMessages((data ?? []) as Msg[]));
    const ch = supabase
      .channel("global-room")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "global_messages" },
        (p) => {
          const incoming = p.new as Msg;
          setMessages((prev) => [
            incoming,
            ...prev.filter(
              (m) =>
                m.id !== incoming.id &&
                !(
                  m.id.startsWith("temp-") &&
                  m.username === incoming.username &&
                  m.content === incoming.content
                ),
            ),
          ]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "global_messages" },
        (p) => {
          const updated = p.new as Msg;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, pinned: updated.pinned } : m)),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const send = async () => {
    if (!text.trim() || !hashedId || !username) return;
    const content = text.trim();
    const reply = replyTo;
    setText("");
    setReplyTo(null);
    // Optimistic insert for an instant, real-time feel.
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      {
        id: tempId,
        username,
        content,
        anonymous_user_hash: hashedId,
        created_at: new Date().toISOString(),
        reply_to_id: reply?.id ?? null,
        reply_to_username: reply?.username ?? null,
        reply_to_content: reply?.content ?? null,
      } as Msg,
      ...prev,
    ]);
    try {
      await submitGlobalMessage({
        data: {
          hashedId,
          username,
          content,
          replyToId: reply?.id,
          replyToUsername: reply?.username,
          replyToContent: reply?.content,
        },
      });
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error("Message failed");
    }
  };


  return (
    <div className="flex h-[100dvh] flex-col bg-background md:h-[calc(100dvh-4rem)]">
      <header className="flex items-center gap-3 border-b-2 border-dashed border-border bg-background px-4 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/" })}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div
          className="flex h-10 w-10 -rotate-2 items-center justify-center border-2 border-border bg-accent/15 text-accent shadow-ink-soft"
          style={{ borderRadius: "18px 7px 20px 7px / 7px 20px 7px 18px" }}
        >
          <Globe className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <div className="font-display text-lg font-bold">Global Chat</div>

          <div className="text-xs text-muted-foreground">
            Everyone on CampusXpose, one anonymous room
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link to="/messages">
            <MessageCircle className="h-4 w-4" /> DMs
          </Link>
        </Button>
      </header>

      <AdPin placement="global" />

      <ChatPolls scope="global" hashedId={hashedId} username={username} />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col-reverse gap-2 overflow-y-auto px-4 py-4">
        {messages.map((m) => {
          const own = m.anonymous_user_hash === hashedId;
          const reactions = byMessage.get(m.id) ?? [];
          return (
            <div
              key={m.id}
              className={cn("group flex items-end gap-2", own ? "justify-end" : "justify-start")}
            >
              {!own && <UserSymbol username={m.username} size="sm" />}
              <div className={cn("flex max-w-[80%] flex-col gap-1", own ? "items-end" : "items-start")}>
                <MessageGestures onReply={() => setReplyTo(m)} onReact={(e) => toggle(m.id, e)} align={own ? "end" : "start"}>
                  <div className="flex items-center gap-1">
                    {own && (
                      <MessageActions
                        className="hidden transition-opacity md:flex md:opacity-0 md:group-hover:opacity-100"
                        onToggle={(e) => toggle(m.id, e)}
                        onReply={() => setReplyTo(m)}
                      />
                    )}
                    <div
                      className={cn(
                        "w-fit max-w-full border-2 border-border px-3 py-2 text-sm shadow-ink-soft",
                        own ? "bg-accent text-accent-foreground" : "bg-white",
                      )}
                      style={{ borderRadius: "16px 6px 18px 6px / 6px 18px 6px 16px" }}
                    >
                      {!own && (
                        <Link
                          to="/messages"
                          search={{ to: m.username }}
                          className="mb-0.5 inline-flex items-center gap-1 text-xs font-bold text-accent hover:wavy-underline"
                        >
                          {m.username}{m.username && verified.has(m.username) && <VerifiedBadge className="h-3.5 w-3.5" />}
                        </Link>
                      )}
                      <ReplyQuote username={m.reply_to_username} content={m.reply_to_content} align={own ? "end" : "start"} />
                      <div className="flex flex-wrap items-end justify-end gap-x-2">
                        <span className="whitespace-pre-wrap break-words">{m.content}</span>
                        <span className={cn("shrink-0 text-[10px]", own ? "text-accent-foreground/70" : "text-muted-foreground")}>
                          {timeAgo(m.created_at)}
                        </span>
                      </div>
                    </div>

                    {!own && (
                      <MessageActions
                        className="hidden transition-opacity md:flex md:opacity-0 md:group-hover:opacity-100"
                        onToggle={(e) => toggle(m.id, e)}
                        onReply={() => setReplyTo(m)}
                      />
                    )}
                  </div>
                </MessageGestures>
                <ReactionChips reactions={reactions} onToggle={(e) => toggle(m.id, e)} align={own ? "end" : "start"} />
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <p className="my-auto text-center text-sm text-muted-foreground">
            No messages yet. Say something to the whole campus universe.
          </p>
        )}
      </div>

      <div className="border-t-2 border-dashed border-border bg-background px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-3xl">
          <TypingIndicator users={typing} className="mb-1.5 px-1" />
          {replyTo && (
            <div className="mb-2 flex items-center gap-2 rounded-md border border-border bg-surface-2/60 px-3 py-1.5 text-xs">
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-accent">Replying to {replyTo.username}</span>
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
              onChange={(e) => {
                setText(e.target.value);
                notifyTyping();
              }}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Message everyone..."
              maxLength={1000}
            />
            <Button onClick={send} disabled={!text.trim()} size="icon" className="shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

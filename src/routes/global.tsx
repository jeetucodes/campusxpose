import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef, KeyboardEvent } from "react";
import { Send, Globe, MessageCircle, ArrowLeft, X, Pin, Image as ImageIcon, Loader2 } from "lucide-react";
import { AutoResizeTextarea } from "@/components/AutoResizeTextarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useIdentity } from "@/stores/identity";
import { UserSymbol } from "@/components/UserSymbol";
import { submitGlobalMessage, togglePinMessage } from "@/lib/content.functions";
import { uploadToImgbb } from "@/lib/upload";
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
import { Linkify } from "@/components/Linkify";
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
  image_url?: string | null;
};

function GlobalChat() {
  const { hashedId, username, init } = useIdentity();
  const verified = useVerifiedUsernames();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      .then(({ data }) => {
        setMessages((data ?? []) as Msg[]);
        setLoading(false);
      });
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
    if ((!text.trim() && !imageFile) || !hashedId || !username) return;

    setUploadingImage(true);
    let uploadedUrl = null;
    try {
      if (imageFile) {
        uploadedUrl = await uploadToImgbb(imageFile);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to upload image");
      setUploadingImage(false);
      return;
    }
    setUploadingImage(false);

    const content = text.trim();
    const reply = replyTo;
    setText("");
    setReplyTo(null);
    setImageFile(null);

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
        reply_to_content: reply?.content || (reply?.image_url ? "📷 Image" : null),
        image_url: uploadedUrl,
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
          replyToContent: reply?.content || (reply?.image_url ? "📷 Image" : undefined),
          imageUrl: uploadedUrl ?? undefined,
        },
      });
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error(e instanceof Error ? e.message : (e as any)?.message || "Message failed");
    }
  };

  const pinned = useMemo(() => messages.filter((m) => m.pinned), [messages]);

  type StreamItem =
    | { kind: "msg"; at: string; msg: Msg }
    | { kind: "poll"; at: string; poll: Poll };
  const items = useMemo<StreamItem[]>(() => {
    const merged: StreamItem[] = [
      ...messages.map((m) => ({ kind: "msg" as const, at: m.created_at, msg: m })),
      ...polls.map((p) => ({ kind: "poll" as const, at: p.created_at, poll: p })),
    ];
    merged.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    return merged;
  }, [messages, polls]);


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

      {pinned.length > 0 && (
        <div className="border-b-2 border-dashed border-border bg-surface-2/60 px-4 py-2">
          <div className="mx-auto w-full max-w-3xl space-y-1">
            {pinned.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-xs">
                <Pin className="h-3.5 w-3.5 shrink-0 text-accent" />
                <span className="shrink-0 font-semibold text-accent">{m.username}:</span>
                <span className="truncate text-muted-foreground"><Linkify text={m.content} /></span>
                {(m.anonymous_user_hash === hashedId) && (
                  <button
                    onClick={() => pinMessage(m)}
                    className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label="Unpin"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col-reverse gap-2 overflow-y-auto px-4 py-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={cn("flex items-end gap-2", i % 2 === 0 ? "justify-end" : "justify-start")}>
              {i % 2 !== 0 && <div className="h-8 w-8 shrink-0 rounded-full bg-muted/40 animate-pulse" />}
              <div
                className={cn(
                  "h-12 w-[60%] border-2 border-border/20 bg-muted/20 animate-pulse",
                  i % 2 === 0 ? "bg-accent/10" : ""
                )}
                style={{ borderRadius: "16px 6px 18px 6px / 6px 18px 6px 16px" }}
              />
            </div>
          ))
        ) : items.map((it) => {
          if (it.kind === "poll") {
            const p = it.poll;
            const own = p.anonymous_user_hash === hashedId;
            return (
              <div key={`poll-${p.id}`} className={cn("flex", own ? "justify-end" : "justify-start")}>
                <div className="w-full max-w-[85%]">
                  <PollItem poll={p} votes={votes.filter((v) => v.poll_id === p.id)} hashedId={hashedId} own={own} />
                </div>
              </div>
            );
          }
          const m = it.msg;
          const own = m.anonymous_user_hash === hashedId;
          const reactions = byMessage.get(m.id) ?? [];
          return (
            <div
              key={m.id}
              className={cn("group flex items-end gap-2", own ? "justify-end" : "justify-start")}
            >
              {!own && <UserSymbol username={m.username} size="sm" />}
              <div className={cn("flex max-w-[80%] flex-col gap-0", own ? "items-end" : "items-start")}>
                <MessageGestures onReply={() => setReplyTo(m)} onReact={(e) => toggle(m.id, e)} onPin={() => pinMessage(m)} pinned={m.pinned} align={own ? "end" : "start"}>
                  <div className="flex items-center gap-1">
                    {own && (
                      <MessageActions
                        className="hidden transition-opacity md:flex md:opacity-0 md:group-hover:opacity-100"
                        onToggle={(e) => toggle(m.id, e)}
                        onReply={() => setReplyTo(m)}
                        onPin={() => pinMessage(m)}
                        pinned={m.pinned}
                      />
                    )}
                    <div
                      className={cn(
                        "relative w-fit max-w-full border-2 border-border px-3 py-2 text-sm shadow-ink-soft",
                        own ? "bg-accent text-accent-foreground" : "bg-white",
                      )}
                      style={{ borderRadius: "16px 6px 18px 6px / 6px 18px 6px 16px" }}
                    >
                      {m.pinned && (
                        <Pin className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rotate-45 text-accent" />
                      )}
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
                      {m.image_url && (
                        <div className="mb-2 max-w-[240px] overflow-hidden rounded-md border border-ink/10">
                          <img src={m.image_url} alt="Attachment" className="w-full h-auto object-cover" loading="lazy" />
                        </div>
                      )}
                      <div className="flex flex-wrap items-end justify-end gap-x-2">
                        {m.content && <span className="whitespace-pre-wrap break-all"><Linkify text={m.content} /></span>}
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
                        onPin={() => pinMessage(m)}
                        pinned={m.pinned}
                      />
                    )}
                  </div>
                </MessageGestures>
                <ReactionChips reactions={reactions} onToggle={(e) => toggle(m.id, e)} align={own ? "end" : "start"} />
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="my-auto text-center text-sm text-muted-foreground">

          </p>
        )}
      </div>


      <div className="border-t-2 border-dashed border-border bg-background px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-3xl">
          <TypingIndicator users={typing} className="mb-1.5 px-1" />
          {replyTo && (
            <div className="mb-2 flex items-center gap-2 rounded-md border border-border bg-surface-2/60 px-3 py-1.5 text-xs">
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-accent">Replying to {replyTo.content ? replyTo.username : "an image"}</span>
                <div className="truncate text-muted-foreground">{replyTo.content || (replyTo.image_url ? "📷 Image" : "")}</div>
              </div>
              <button onClick={() => setReplyTo(null)} aria-label="Cancel reply">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {imageFile && (
              <div className="relative w-20 h-20 rounded-md border-2 border-border overflow-hidden bg-surface-2/60">
                <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImageFile(null)}
                  className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-2xl border-2 border-border bg-white px-2 py-1.5 shadow-ink-soft transition-colors focus-within:border-accent">
              <NewPollButton scope="global" hashedId={hashedId} username={username} onCreated={reloadPolls} />

              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) setImageFile(e.target.files[0]);
                  e.target.value = "";
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:bg-transparent hover:text-accent"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>

              <AutoResizeTextarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  notifyTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Message everyone..."
                maxLength={1000}
                maxHeight={150}
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 max-h-32 pt-2.5"
                disabled={uploadingImage}
              />
              <Button
                onClick={send}
                disabled={(!text.trim() && !imageFile) || uploadingImage}
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full transition-transform active:scale-90"
                aria-label="Send message"
              >
                {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

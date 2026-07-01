import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, X, FileWarning, CheckCheck, Pin, Image as ImageIcon, Loader2 } from "lucide-react";
import { UserSymbol } from "@/components/UserSymbol";
import { useVerifiedUsernames } from "@/hooks/useVerified";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIdentity } from "@/stores/identity";
import { submitMessage, togglePinMessage } from "@/lib/content.functions";
import { uploadToImgbb } from "@/lib/upload";

import { DEFAULT_KEYWORDS } from "@/lib/categories";
import { useReactions } from "@/hooks/useReactions";
import { ReactionChips, MessageActions, ReplyQuote } from "@/components/MessageReactions";
import { MessageGestures } from "@/components/MessageGestures";
import { usePresence } from "@/hooks/usePresence";
import { TypingIndicator } from "@/components/ChatPresence";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AdPin } from "@/components/AdPin";
import { PollItem, NewPollButton } from "@/components/ChatPolls";
import { Linkify } from "@/components/Linkify";
import { usePolls, type Poll } from "@/hooks/usePolls";

export const Route = createFileRoute("/community/$collegeId")({
  component: Community,
});

type Msg = { id: string; username: string; content: string; anonymous_user_hash: string; is_incident_signal: boolean; created_at: string; pinned?: boolean; reply_to_id?: string | null; reply_to_username?: string | null; reply_to_content?: string | null; image_url?: string | null; };

function Community() {
  const { collegeId } = Route.useParams();
  const { hashedId, username } = useIdentity();
  const verified = useVerifiedUsernames();
  const sendFn = useServerFn(submitMessage);
  
  const { byMessage, toggle } = useReactions("community", hashedId);
  const { typing, notifyTyping } = usePresence(`community-${collegeId}`, username, hashedId);
  const { polls, votes, reload: reloadPolls } = usePolls("college", collegeId);

  const pinMessage = async (m: Msg) => {
    if (!hashedId) return;
    const next = !m.pinned;
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, pinned: next } : x)));
    try {
      await togglePinMessage({
        data: { messageId: m.id, messageType: "community", hashedId, pinned: next },
      });
    } catch {
      setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, pinned: !next } : x)));
      toast.error("Could not update pin");
    }
  };

  const collegeQ = useQuery({
    queryKey: ["college-name", collegeId],
    queryFn: async () => (await supabase.from("colleges").select("name").eq("id", collegeId).maybeSingle()).data,
  });

  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [incidentPrompt, setIncidentPrompt] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase.from("community_messages").select("*").eq("college_id", collegeId).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setMessages((data ?? []) as Msg[]));
    const ch = supabase
      .channel(`chat-${collegeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages", filter: `college_id=eq.${collegeId}` }, (p) => {
        const incoming = p.new as Msg;
        setMessages((prev) => [
          incoming,
          ...prev.filter(
            (m) =>
              m.id !== incoming.id &&
              !(m.id.startsWith("temp-") && m.username === incoming.username && m.content === incoming.content),
          ),
        ]);
      })

      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_messages" }, (p) => {
        setMessages((prev) => prev.filter((m) => m.id !== (p.old as any).id));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "community_messages" }, (p) => {
        const updated = p.new as Msg;
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, pinned: updated.pinned } : m)));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [collegeId]);


  const onType = (v: string) => {
    setText(v);
    notifyTyping();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const hit = DEFAULT_KEYWORDS.some((k) => v.toLowerCase().includes(k));
      setIncidentPrompt(hit && v.trim().length > 8);
    }, 1000);
  };

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

    const isSignal = DEFAULT_KEYWORDS.some((k) => text.toLowerCase().includes(k));
    const content = text.trim();
    const reply = replyTo;
    setText("");
    setReplyTo(null);
    setIncidentPrompt(false);
    setImageFile(null);
    
    // Optimistic insert for an instant, real-time feel.
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      {
        id: tempId,
        username,
        content,
        anonymous_user_hash: hashedId,
        is_incident_signal: isSignal,
        created_at: new Date().toISOString(),
        reply_to_id: reply?.id ?? null,
        reply_to_username: reply?.username ?? null,
        reply_to_content: reply?.content || (reply?.image_url ? "📷 Image" : null),
        image_url: uploadedUrl,
      } as Msg,
      ...prev,
    ]);
    try {
      await sendFn({ data: { collegeId, hashedId, username, content, isIncidentSignal: isSignal, replyToId: reply?.id, replyToUsername: reply?.username, replyToContent: reply?.content || (reply?.image_url ? "📷 Image" : undefined), imageUrl: uploadedUrl ?? undefined } });
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      toast.error(e instanceof Error ? e.message : (e as any)?.message || "Message failed");
    }
  };




  const initials = (collegeQ.data?.name ?? "Community").trim().slice(0, 2).toUpperCase();

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
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden md:border-x md:border-border">
        {/* header */}
        <header className="flex items-center gap-3 border-b border-border bg-surface/80 px-3 py-3 backdrop-blur-sm sm:px-4">
          <Link
            to="/colleges/$id"
            params={{ id: collegeId }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors hover:bg-surface-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold leading-tight">{collegeQ.data?.name ?? "Community"}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Anonymous live chat
              </span>
            </div>

          </div>
        </header>

        <AdPin placement="college" />

        {pinned.length > 0 && (
          <div className="border-b border-border bg-surface-2/60 px-3 py-2 sm:px-4">
            <div className="space-y-1">
              {pinned.map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-xs">
                  <Pin className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="shrink-0 font-semibold text-primary">{m.username}:</span>
                  <span className="truncate text-muted-foreground"><Linkify text={m.content} /></span>
                  {m.anonymous_user_hash === hashedId && (
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

        {/* messages */}
        <div className="flex flex-1 flex-col-reverse gap-3 overflow-y-auto px-3 py-4 sm:px-4">
          <AnimatePresence initial={false}>
            {items.map((it) => {
              if (it.kind === "poll") {
                const p = it.poll;
                const own = p.anonymous_user_hash === hashedId;
                return (
                  <motion.div
                    key={`poll-${p.id}`}
                    layout
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.18 }}
                    className={cn("flex", own ? "justify-end" : "justify-start")}
                  >
                    <div className="w-full max-w-[85%]">
                      <PollItem poll={p} votes={votes.filter((v) => v.poll_id === p.id)} hashedId={hashedId} own={own} />
                    </div>
                  </motion.div>
                );
              }
              const m = it.msg;
              const own = m.anonymous_user_hash === hashedId;
              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.18 }}
                  className={cn("flex items-end gap-2", own ? "flex-row-reverse" : "justify-start")}
                >
                  {!own && (
                    <UserSymbol username={m.username} size="sm" />
                  )}
                  <div className={cn("group/msg flex max-w-[80%] flex-col gap-0", own ? "items-end" : "items-start")}>
                    <MessageGestures onReply={() => setReplyTo(m)} onReact={(e) => toggle(m.id, e)} onPin={() => pinMessage(m)} pinned={m.pinned} align={own ? "end" : "start"}>
                    <div className={cn("flex items-center gap-1", own ? "flex-row" : "flex-row-reverse")}>
                      <MessageActions
                        className="hidden transition-opacity md:flex md:opacity-0 md:group-hover/msg:opacity-100"
                        onToggle={(e) => toggle(m.id, e)}
                        onReply={() => setReplyTo(m)}
                        onPin={() => pinMessage(m)}
                        pinned={m.pinned}
                      />
                      <div
                        className={cn(
                          "relative rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                          own
                            ? "rounded-br-md bg-primary text-primary-foreground shadow-primary/15"
                            : "rounded-bl-md border border-border bg-surface",
                          m.is_incident_signal && !own && "border-l-2 border-l-warning",
                        )}
                      >
                        {m.pinned && (
                          <Pin className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 rotate-45 text-primary" />
                        )}
                        {!own && <div className="mb-0.5 inline-flex items-center gap-1 text-xs font-semibold text-primary/80">{m.username}{m.username && verified.has(m.username) && <VerifiedBadge className="h-3.5 w-3.5" />}</div>}
                        <ReplyQuote username={m.reply_to_username} content={m.reply_to_content} align={own ? "end" : "start"} />
                        {m.image_url && (
                          <div className="mb-2 max-w-[240px] overflow-hidden rounded-md border border-ink/10 mt-1">
                            <img src={m.image_url} alt="Attachment" className="w-full h-auto object-cover" loading="lazy" />
                          </div>
                        )}
                        {m.content && <div className="whitespace-pre-wrap break-words leading-relaxed"><Linkify text={m.content} /></div>}
                      </div>
                    </div>
                    </MessageGestures>
                    <ReactionChips reactions={byMessage.get(m.id) ?? []} onToggle={(e) => toggle(m.id, e)} align={own ? "end" : "start"} />
                    <div className={cn("flex items-center gap-1 text-[10px] text-muted-foreground", own ? "justify-end pr-1" : "pl-1")}>
                      {timeAgo(m.created_at)}
                      {own && <CheckCheck className="h-3 w-3 text-primary" />}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {messages.length > 0 && (
            <div className="flex justify-center pb-1">
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Today</span>
            </div>
          )}
          {messages.length === 0 && <p className="my-auto text-center text-sm text-muted-foreground">No messages yet. Start the conversation.</p>}
        </div>


        {/* incident prompt */}
        <AnimatePresence>
          {incidentPrompt && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mx-3 mb-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm sm:mx-4">
              <div className="flex items-center gap-2 text-warning"><FileWarning className="h-4 w-4" /> Lagta hai kuch issue hai?</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button asChild size="sm" className="rounded-full"><Link to="/report" search={{ college: collegeId }}>📋 Report Officially</Link></Button>
                <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setIncidentPrompt(false)}>Nahi, bas baat kar raha tha</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* input */}
        <div className="border-t border-border bg-surface/80 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-4">
          <TypingIndicator users={typing} className="mb-1.5 px-1" />
          {replyTo && (
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-border bg-surface-2/60 px-3 py-1.5 text-xs">
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-primary">Replying to {replyTo.content ? replyTo.username : "an image"}</span>
                <div className="truncate text-muted-foreground">{replyTo.content || (replyTo.image_url ? "📷 Image" : "")}</div>
              </div>
              <button onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {imageFile && (
              <div className="relative w-20 h-20 rounded-md border border-border overflow-hidden bg-surface-2/60 ml-2">
                <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImageFile(null)}
                  className="absolute top-1 right-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-2 py-1.5 transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
              <NewPollButton scope="college" collegeId={collegeId} hashedId={hashedId} username={username} onCreated={reloadPolls} />
              
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
                className="shrink-0 text-muted-foreground hover:bg-transparent hover:text-primary rounded-full h-8 w-8" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
              
              <Input
                value={text}
                onChange={(e) => onType(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Write anonymously..."
                disabled={!hashedId || !username || uploadingImage}
                className="h-8 flex-1 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
              />
              <Button onClick={send} disabled={(!text.trim() && !imageFile) || uploadingImage} size="icon" className="h-9 w-9 shrink-0 rounded-full">
                {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

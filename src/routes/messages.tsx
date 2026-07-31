import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, MessageCircle, UserPlus, ArrowLeft, Plus, Trash2, X, Pin, ShieldCheck, Image as ImageIcon, Loader2, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Scanner } from '@yudiel/react-qr-scanner';
import { AutoResizeTextarea } from "@/components/AutoResizeTextarea";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIdentity } from "@/stores/identity";
import { supabase } from "@/integrations/supabase/client";
import { useDmStore } from "@/stores/dm";
import { UserSymbol } from "@/components/UserSymbol";
import { submitDirectMessage, fetchDirectMessages, deleteDirectConversation, togglePinMessage } from "@/lib/content.functions";
import { uploadToImgbb } from "@/lib/upload";
import { useReactions } from "@/hooks/useReactions";
import { ReactionChips, MessageActions, ReplyQuote } from "@/components/MessageReactions";
import { MessageGestures } from "@/components/MessageGestures";
import { usePresence } from "@/hooks/usePresence";
import { TypingIndicator } from "@/components/ChatPresence";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useVerifiedUsernames } from "@/hooks/useVerified";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Linkify } from "@/components/Linkify";
import { motion } from "framer-motion";

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
  image_url?: string | null;
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
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [newName, setNewName] = useState("");
  const [replyTo, setReplyTo] = useState<DM | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(() => {
    return typeof window !== 'undefined' && localStorage.getItem("camera_permission_granted") === "true";
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      if (!hashedId || !username) {
        // If identity is missing, wait a bit or just assume no messages for now if it stays missing.
        return;
      }
      try {
        const r = await fetchDirectMessages({ data: { hashedId, username } });
        setAll((r.messages ?? []) as DM[]);
      } catch {
        /* ignore transient errors */
      } finally {
        setLoading(false);
      }
    },
    [hashedId, username],
  );

  // Fallback to stop loading if it takes too long
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

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
    if ((!text.trim() && !imageFile) || !hashedId || !username || !active) return;
    
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
      reply_to_content: reply?.content || (reply?.image_url ? "📷 Image" : null),
      image_url: uploadedUrl,
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
          replyToContent: reply?.content || (reply?.image_url ? "📷 Image" : undefined),
          imageUrl: uploadedUrl ?? undefined,
        },
      });
      await load();
    } catch (e) {
      // Roll back the optimistic message on failure.
      setAll((prev) => prev.filter((m) => m.id !== tempId));
      toast.error(e instanceof Error ? e.message : (e as any)?.message || "Message failed");
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
          "w-full flex-col border-r-2 border-ink bg-paper md:flex md:w-[320px] shadow-ink",
          active ? "hidden md:flex" : "flex",
        )}
      >
        <header className="flex items-center gap-2 border-b-2 border-ink px-4 py-3 bg-paper sticky top-0 z-10 shadow-ink-soft">
          <Button asChild variant="ghost" size="icon" className="hover:bg-muted text-ink">
            <Link to="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <MessageCircle className="h-5 w-5 text-accent" strokeWidth={2.5} />
          <span className="font-display text-lg font-bold tracking-tight">Messages</span>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open && localStorage.getItem("camera_permission_granted") !== "true") {
              setIsScanning(false);
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-auto text-accent hover:text-accent hover:bg-accent/10 transition-colors" aria-label="Add Friends">
                <UserPlus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md border-2 border-ink bg-paper shadow-ink-lg wobbly-md overflow-hidden">
              <Tabs defaultValue="my-code" className="w-full">
                <DialogHeader className="mb-4">
                  <div className="flex items-center justify-between">
                    <DialogTitle className="flex items-center gap-2 text-xl font-display text-ink">
                      <UserPlus className="h-5 w-5 text-marker" /> Chat with Friends
                    </DialogTitle>
                    <TabsList className="bg-surface-2 border-2 border-ink shadow-ink-soft wobbly-sm p-1">
                      <TabsTrigger value="my-code" className="wobbly-sm data-[state=active]:bg-marker data-[state=active]:text-white">My Code</TabsTrigger>
                      <TabsTrigger value="scan" className="wobbly-sm data-[state=active]:bg-marker data-[state=active]:text-white">Scan</TabsTrigger>
                    </TabsList>
                  </div>
                  <DialogDescription className="text-base">
                    Share your QR code or scan a friend's code.
                  </DialogDescription>
                </DialogHeader>
                
                <TabsContent value="my-code" className="mt-2 min-h-[420px] flex flex-col items-center justify-center w-full outline-none">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="flex w-full flex-col items-center justify-center gap-5 py-2"
                  >
                    <motion.div 
                      animate={{ y: [0, -4, 0], rotate: [0, -1, 1, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                      className="sketch-card wobbly-md p-5 bg-white relative cursor-pointer"
                    >
                      <QRCode 
                        value={`https://campusxpose.online/messages?to=${username}`} 
                        size={180} 
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        viewBox={`0 0 256 256`}
                        fgColor="var(--ink)"
                        bgColor="transparent"
                      />
                    </motion.div>
                    <div className="text-center space-y-1">
                      <p className="font-display font-bold text-xl tracking-tight text-foreground">@{username}</p>
                      <p className="text-sm text-muted-foreground">Scan with phone camera to open chat</p>
                    </div>
                    <div className="flex w-full items-center gap-2 bg-white p-2 wobbly-sm border-2 border-ink shadow-ink-soft">
                      <Input 
                        readOnly 
                        value={`https://campusxpose.online/messages?to=${username}`} 
                        className="flex-1 bg-transparent border-none text-xs font-mono truncate shadow-none focus-visible:ring-0 px-2 text-ink" 
                      />
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="shrink-0 h-8 w-8 hover:bg-muted hover:text-ink transition-colors wobbly-sm"
                        onClick={() => {
                          navigator.clipboard.writeText(`https://campusxpose.online/messages?to=${username}`);
                          toast.success("Link copied to clipboard!");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon"
                        className="shrink-0 h-8 w-8 bg-marker text-white hover:bg-marker/90 border-2 border-ink shadow-ink-soft transition-all wobbly-sm hover:-translate-y-0.5"
                        onClick={() => {
                          const shareUrl = `https://campusxpose.online/messages?to=${username}`;
                          if (typeof navigator !== "undefined" && navigator.share) {
                            navigator.share({
                              title: "Message me anonymously",
                              text: `Chat with me on CampusXpose!`,
                              url: shareUrl,
                            }).catch(() => {});
                          } else if (typeof window !== "undefined" && (window as any).median) {
                            (window as any).median.share.sharePage({ url: shareUrl, title: "Message me anonymously" });
                          } else {
                            navigator.clipboard.writeText(shareUrl);
                            toast.success("Link copied to clipboard!");
                          }
                        }}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                </TabsContent>
                
                <TabsContent value="scan" className="mt-2 min-h-[420px] flex flex-col items-center justify-center w-full outline-none">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="flex w-full flex-col items-center justify-center py-2"
                  >
                    {!isScanning ? (
                      <div className="flex flex-col items-center justify-center gap-4 py-8 text-center px-4 sketch-card wobbly-md w-full h-[320px] relative overflow-hidden bg-white">
                        <motion.div 
                          animate={{ scale: [1, 1.1, 1], rotate: [-3, 3, -3] }} 
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          className="wobbly-oval bg-secondary p-5 border-2 border-ink shadow-ink-soft relative z-10"
                        >
                          <ImageIcon className="h-10 w-10 text-marker" />
                        </motion.div>
                        <div className="relative z-10">
                          <h3 className="font-display font-bold text-ink text-xl">Camera Permission</h3>
                          <p className="text-sm text-muted-foreground mt-1 max-w-[250px] font-sans">We need your permission to use the camera for scanning QR codes.</p>
                        </div>
                        <Button onClick={() => {
                          setIsScanning(true);
                          localStorage.setItem("camera_permission_granted", "true");
                        }} className="mt-2 bg-marker text-white hover:bg-marker/90 border-2 border-ink shadow-ink transition-all wobbly-sm px-6 hover:-translate-y-1 active:translate-y-0 relative z-10">
                          Enable Camera & Scan
                        </Button>
                      </div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="w-full max-w-[280px] overflow-hidden wobbly-md border-2 border-ink shadow-ink bg-white aspect-square relative flex items-center justify-center"
                      >
                        <motion.div 
                          animate={{ top: ["0%", "100%", "0%"] }} 
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          className="absolute left-0 w-full h-[4px] bg-marker z-20 pointer-events-none opacity-80" 
                        />
                        <Scanner
                          formats={['qr_code']}
                          constraints={{ facingMode: 'environment' }}
                          onError={(error: any) => {
                            console.error("Scanner Error:", error);
                            setIsScanning(false);
                            localStorage.removeItem("camera_permission_granted");
                            
                            // Specific error handling for permissions
                            if (error?.name === 'NotAllowedError' || error?.message?.toLowerCase().includes('permission denied')) {
                              toast.error("Camera Permission Denied! If you are in the app, make sure Camera permission is enabled in your App Settings/Manifest.", { duration: 6000 });
                            } else if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
                              toast.error("Camera requires HTTPS to work securely.");
                            } else {
                              toast.error(error?.message || "Failed to access camera. Device might not support it.");
                            }
                          }}
                          onScan={(result) => {
                            if (result && result.length > 0) {
                              const url = result[0].rawValue;
                              try {
                                const parsedUrl = new URL(url);
                                if (parsedUrl.hostname.includes("campusxpose.online") && parsedUrl.pathname.includes("/messages")) {
                                  const scannedUsername = parsedUrl.searchParams.get("to");
                                  if (scannedUsername) {
                                    setIsDialogOpen(false);
                                    navigate({ to: "/messages", search: { to: scannedUsername } });
                                    toast.success(`Chatting with ${scannedUsername}`);
                                  }
                                } else {
                                  toast.error("Invalid CampusXpose QR Code");
                                }
                              } catch (e) {
                                  toast.error("Invalid QR Code content");
                              }
                            }
                          }}
                        />
                      </motion.div>
                    )}
                    <p className="mt-6 text-xs text-muted-foreground text-center px-4 font-medium h-[20px]">Point your camera at a friend's CampusXpose QR code.</p>
                  </motion.div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </header>

        <div className="border-b-2 border-ink bg-surface-2 p-3">
          <div className="flex items-center gap-2 bg-white wobbly-sm border-2 border-ink shadow-ink-soft pr-1">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startNew()}
              placeholder="Username to message..."
              className="bg-transparent border-none focus-visible:ring-0 shadow-none text-ink placeholder:text-muted-foreground flex-1"
            />
            <Button onClick={startNew} size="icon" className="shrink-0 bg-marker text-white hover:bg-marker/90 wobbly-sm h-8 w-8 transition-transform hover:-translate-y-0.5 shadow-none border-none">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-muted/40 animate-pulse" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-1/2 rounded bg-muted/40 animate-pulse" />
                  <div className="h-3 w-3/4 rounded bg-muted/40 animate-pulse" />
                </div>
              </div>
            ))
          ) : conversations.map((c) => {
            const unread = unreadBy[c.name] ?? 0;
            return (
              <div
                key={c.name}
                className={cn(
                  "group flex items-center gap-3 border-b-2 border-ink px-4 py-3 transition-all hover:bg-muted cursor-pointer relative",
                  active === c.name && "bg-postit",
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
                        <span className="grid h-5 min-w-5 place-items-center bg-marker px-1 text-[10px] font-bold leading-none text-white wobbly-sm shadow-ink-soft">
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
          {!loading && conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center text-muted-foreground">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/30">
                <MessageCircle className="h-6 w-6 opacity-50" />
              </div>
              <p className="text-sm">
                No messages have arrived yet.<br/>
                Start a conversation above or tap a username in Global Chat.
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Active thread */}
      <section
        className={cn("min-h-0 flex-1 flex-col bg-paper", active ? "flex" : "hidden md:flex")}
      >
        {active ? (
          <>
            <header className="flex items-center gap-3 border-b-2 border-ink px-4 py-3 bg-paper sticky top-0 z-10 shadow-ink-soft">
              <Button asChild variant="ghost" size="icon" className="hover:bg-muted text-ink">
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
              <div className="border-b-2 border-ink bg-postit px-4 py-2 shadow-ink-soft z-10 relative">
                <div className="mx-auto w-full max-w-2xl space-y-1">
                  {thread.filter((m) => m.pinned).map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-xs">
                      <Pin className="h-3.5 w-3.5 shrink-0 text-marker" />
                      <span className="shrink-0 font-semibold text-marker">{m.sender_username}:</span>
                      <span className="truncate text-ink"><Linkify text={m.content} /></span>
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
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={cn("flex w-full", i % 2 === 0 ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "h-12 w-[60%] border-2 border-ink bg-muted/20 animate-pulse wobbly-md shadow-ink-soft",
                        i % 2 === 0 ? "bg-accent/10" : ""
                      )}
                    />
                  </div>
                ))
              ) : thread.map((m) => {
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
                          "relative w-fit max-w-full border-2 border-ink px-3 py-2 text-sm shadow-ink-soft wobbly-sm",
                          own ? "bg-marker text-white" : "bg-white text-ink",
                        )}
                      >
                        {m.pinned && (
                          <Pin className="absolute -right-2 -top-2 h-4 w-4 rotate-45 text-marker bg-postit rounded-full p-0.5 border border-ink shadow-sm" />
                        )}
                        <ReplyQuote username={m.reply_to_username} content={m.reply_to_content} align={own ? "end" : "start"} />
                        {m.image_url && (
                          <div className="mb-2 max-w-[240px] overflow-hidden rounded-md border border-ink/10 mt-1">
                            <img src={m.image_url} alt="Attachment" className="w-full h-auto object-cover" loading="lazy" />
                          </div>
                        )}
                        <div className="flex flex-wrap items-end justify-end gap-x-2">
                          {m.content && (
                            <span className="whitespace-pre-wrap break-all leading-relaxed">
                              <Linkify text={m.content} />
                            </span>
                          )}
                          <span className={cn("shrink-0 text-[10px]", own ? "text-white/80" : "text-muted-foreground")}>
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

            {active === "admin" ? (
              <div className="shrink-0 border-t-2 border-ink bg-paper px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <div className="mx-auto flex w-full max-w-2xl items-center justify-center gap-2 wobbly-md border-2 border-dashed border-ink bg-postit px-4 py-3 text-center text-sm text-ink shadow-ink-soft">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-marker" />
                  <span>This is an official admin message. You can read replies here, but can't reply back.</span>
                </div>
              </div>
            ) : (
              <div className="shrink-0 border-t-2 border-ink bg-paper px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_0_rgba(45,45,45,1)]">
                <div className="mx-auto w-full max-w-2xl">
                  <TypingIndicator users={typing} className="mb-1.5 px-1" />
                  {replyTo && (
                    <div className="mb-2 flex items-center gap-2 wobbly-sm border-2 border-ink bg-surface-2 px-3 py-1.5 text-xs shadow-ink-soft">
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-marker">Replying to {replyTo.content ? replyTo.sender_username : "an image"}</span>
                        <div className="truncate text-ink">{replyTo.content || (replyTo.image_url ? "📷 Image" : "")}</div>
                      </div>
                      <button onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="hover:text-marker text-muted-foreground transition-colors">
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
                    <div className="flex items-center gap-2 wobbly-md border-2 border-ink bg-white px-2 py-1.5 shadow-ink transition-transform focus-within:-translate-y-1">
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
                        className="shrink-0 text-ink hover:bg-muted hover:text-marker wobbly-sm transition-colors" 
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
                        placeholder={`Message ${active}...`}
                        maxLength={1000}
                        maxHeight={150}
                        className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 max-h-32 pt-2.5 text-ink placeholder:text-muted-foreground font-sans"
                        disabled={uploadingImage}
                      />
                      <Button
                        onClick={send}
                        disabled={(!text.trim() && !imageFile) || uploadingImage}
                        size="icon"
                        className="h-10 w-10 shrink-0 bg-marker text-white hover:bg-marker/90 wobbly-sm transition-transform active:scale-90 shadow-none border-none"
                        aria-label="Send message"
                      >
                        {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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

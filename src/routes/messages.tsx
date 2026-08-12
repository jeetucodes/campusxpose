import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Send,
  MessageCircle,
  UserPlus,
  ArrowLeft,
  Plus,
  Trash2,
  X,
  Pin,
  ShieldCheck,
  Image as ImageIcon,
  Loader2,
  Copy,
  Share2,
  Phone,
  PhoneMissed,
  PhoneCall,
  MoreVertical,
  Ban,
  Edit2,
  ChevronRight,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Scanner } from "@yudiel/react-qr-scanner";
import { AutoResizeTextarea } from "@/components/AutoResizeTextarea";
import { useCallStore } from "@/stores/call";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIdentity } from "@/stores/identity";
import { supabase } from "@/integrations/supabase/client";
import { useDmStore } from "@/stores/dm";
import { UserSymbol } from "@/components/UserSymbol";
import {
  submitDirectMessage,
  fetchDirectMessages,
  deleteDirectConversation,
  togglePinMessage,
} from "@/lib/content.functions";
import { notifyIncomingCall } from "@/lib/push.functions";
import { uploadToImgbb } from "@/lib/upload";
import { useReactions } from "@/hooks/useReactions";
import { ReactionChips, MessageActions, ReplyQuote } from "@/components/MessageReactions";
import { MessageGestures } from "@/components/MessageGestures";
import { usePresence } from "@/hooks/usePresence";
import { TypingIndicator } from "@/components/ChatPresence";
import { timeAgo, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useVerifiedUsernames } from "@/hooks/useVerified";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Linkify } from "@/components/Linkify";
import { motion } from "framer-motion";
import { enablePush, permissionState, isPushSupported } from "@/lib/push-client";
import { BellRing } from "lucide-react";

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
    return (
      typeof window !== "undefined" && localStorage.getItem("camera_permission_granted") === "true"
    );
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { byMessage, toggle } = useReactions("direct", hashedId);

  // Nicknames & Blocked Users from LocalStorage
  const [nicknames, setNicknames] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem("chat_nicknames");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [blockedUsers, setBlockedUsers] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("chat_blocked_users");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const updateNickname = (user: string, newName: string | null) => {
    const updated = { ...nicknames };
    if (newName) {
      updated[user] = newName;
    } else {
      delete updated[user];
    }
    setNicknames(updated);
    localStorage.setItem("chat_nicknames", JSON.stringify(updated));
  };

  const toggleBlockUser = (user: string) => {
    const isBlocked = blockedUsers.includes(user);
    const updated = isBlocked ? blockedUsers.filter((u) => u !== user) : [...blockedUsers, user];
    setBlockedUsers(updated);
    localStorage.setItem("chat_blocked_users", JSON.stringify(updated));
  };

  const [acceptedUsers, setAcceptedUsers] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("chat_accepted_users");
    if (stored) setAcceptedUsers(JSON.parse(stored));
  }, []);

  const acceptUser = (user: string) => {
    const updated = [...acceptedUsers, user];
    setAcceptedUsers(updated);
    localStorage.setItem("chat_accepted_users", JSON.stringify(updated));
  };

  const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");

  const getDisplayName = (user: string) => nicknames[user] || user;

  const { startCall: globalStartCall } = useCallStore();

  const [pushStatus, setPushStatus] = useState<string>("unsupported");
  const [isPushSupportedFlag, setIsPushSupportedFlag] = useState(false);

  useEffect(() => {
    setIsPushSupportedFlag(isPushSupported());
    setPushStatus(permissionState());
  }, []);

  const handleEnablePush = async () => {
    if (!hashedId) return;
    const res = await enablePush(hashedId);
    setPushStatus(res);
    if (res === "granted") toast.success("Push notifications enabled!");
    else if (res === "denied") toast.error("Push notifications denied by browser.");
  };

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

  const allRef = useRef(all);
  const acceptedUsersRef = useRef(acceptedUsers);
  useEffect(() => {
    allRef.current = all;
    acceptedUsersRef.current = acceptedUsers;
  }, [all, acceptedUsers]);


  useEffect(() => {
    if (!hashedId) return;
    const ch = supabase
      .channel(`dm-rt-${hashedId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, (p) => {
        const row = (p.new ?? p.old) as { sender_hash?: string; recipient_hash?: string };
        if (row?.sender_hash === hashedId || row?.recipient_hash === hashedId) {
          load();
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [hashedId, load]);

  // Build conversation list: the "other party" for every message I'm part of.
  const { regularConversations, requests } = useMemo(() => {
    const map = new Map<string, DM>();
    const messagesByUser = new Map<string, DM[]>();
    for (const m of all) {
      const other = m.sender_username === username ? m.recipient_username : m.sender_username;
      if (!messagesByUser.has(other)) messagesByUser.set(other, []);
      messagesByUser.get(other)!.push(m);
      const existing = map.get(other);
      if (!existing || existing.created_at < m.created_at) map.set(other, m);
    }

    const regular: Array<{ user: string; msg: DM }> = [];
    const reqs: Array<{ user: string; msg: DM }> = [];

    for (const [other, msg] of map.entries()) {
      if (blockedUsers.includes(other)) continue;
      const userMsgs = messagesByUser.get(other) || [];
      const isReq = userMsgs.every((x) => x.sender_username !== username) && !acceptedUsers.includes(other);
      if (isReq) reqs.push({ user: other, msg });
      else regular.push({ user: other, msg });
    }

    const sortFn = (a: { msg: DM }, b: { msg: DM }) => (a.msg.created_at < b.msg.created_at ? 1 : -1);
    return {
      regularConversations: regular.sort(sortFn),
      requests: reqs.sort(sortFn)
    };
  }, [all, username, blockedUsers, acceptedUsers]);

  const callsList = useMemo(() => {
    return all.filter(m => m.content?.startsWith("CALL_LOG|")).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [all]);

  const [activeTab, setActiveTab] = useState<"messages" | "calls">("messages");
  const [requestsSheetOpen, setRequestsSheetOpen] = useState(false);

  const active = to;
  const dmRoom = active && username ? `dm-${[username, active].sort().join("|")}` : "";
  const { online, typing, notifyTyping } = usePresence(dmRoom, username, hashedId);
  const thread = useMemo(
    () =>
      active
        ? all.filter(
          (m) =>
            (m.sender_username === username && m.recipient_username === active) ||
            (m.sender_username === active && m.recipient_username === username),
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

  const startCall = async () => {
    if (!active || !username) return;
    globalStartCall(active, username);
  };

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

  const isUnknown = thread.length > 0 && thread.every((m) => m.sender_username !== username) && !acceptedUsers.includes(active || "");

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-paper md:flex-row font-sans text-ink">
      <aside
        className={cn(
          "flex h-full w-full shrink-0 flex-col border-r-2 border-ink bg-paper transition-all z-10",
          active ? "hidden md:flex md:w-[340px] lg:w-[380px]" : "flex md:w-[340px] lg:w-[380px]",
        )}
      >
        <header className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="hover:bg-muted md:hidden -ml-2 text-ink/70">
              <Link to="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <MessageCircle className="h-5 w-5 text-marker" strokeWidth={2.5} />
            <span className="font-display text-2xl font-bold tracking-tight text-ink">Messages</span>
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <Sheet open={requestsSheetOpen} onOpenChange={setRequestsSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn("relative text-ink/60 hover:text-ink hover:bg-muted transition-colors")}
                  aria-label="Message Requests"
                >
                  <ShieldCheck className="h-5 w-5" />
                  {requests.length > 0 && (
                    <span className="absolute top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-marker text-[9px] font-bold text-white ring-2 ring-paper">
                      {requests.length > 9 ? "9+" : requests.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[340px] sm:w-[400px] bg-paper border-l-2 border-ink shadow-ink-lg flex flex-col gap-0 p-0">
                <SheetHeader className="p-4 border-b-2 border-ink">
                  <SheetTitle className="font-display text-xl text-ink flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-marker" /> Message Requests
                  </SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {requests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center text-muted-foreground">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/30">
                        <ShieldCheck className="h-6 w-6 opacity-50" />
                      </div>
                      <p className="text-sm">No new message requests.</p>
                    </div>
                  ) : (
                    requests.map((item) => {
                      const unread = unreadBy[item.user] ?? 0;
                      return (
                        <div
                          key={item.user}
                          className={cn(
                            "group flex items-center gap-3 px-3 py-2.5 wobbly-sm transition-all hover:bg-white/80 cursor-pointer relative",
                            active === item.user && "bg-white shadow-ink-soft border-2 border-ink sketch-card",
                          )}
                        >
                          <div
                            className="flex min-w-0 flex-1 items-center gap-3 outline-none"
                            onClick={() => {
                              setRequestsSheetOpen(false);
                              navigate({ to: "/messages", search: { to: item.user } });
                            }}
                          >
                            <UserSymbol username={item.user} size="sm" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 truncate font-medium">
                                <span className="text-ink font-semibold">{getDisplayName(item.user)}</span>
                                {item.user && verified.has(item.user) && (
                                  <VerifiedBadge className="h-3.5 w-3.5" />
                                )}
                                {unread > 0 && active !== item.user && (
                                  <span className="grid h-5 min-w-5 place-items-center bg-marker rounded-full px-1.5 text-[10px] font-bold leading-none text-white">
                                    {unread > 9 ? "9+" : unread}
                                  </span>
                                )}
                              </div>
                              <div className="truncate text-xs text-muted-foreground font-medium mt-0.5">
                                {item.msg.content?.startsWith("CALL_LOG|") ? (item.msg.content === "CALL_LOG|MISSED" ? "Missed call" : "Audio call") : item.msg.content}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                acceptUser(item.user);
                              }}
                              className="p-1.5 rounded-full text-emerald-600 hover:bg-emerald-100 transition-colors wobbly-sm border border-transparent hover:border-emerald-600/20"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Are you sure you want to delete this chat request from ${item.user}?`)) {
                                  deleteConversation(item.user);
                                }
                              }}
                              className="p-1.5 rounded-full text-red-500 hover:bg-red-100 transition-colors wobbly-sm border border-transparent hover:border-red-500/20"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open && localStorage.getItem("camera_permission_granted") !== "true") {
                  setIsScanning(false);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-accent hover:text-accent hover:bg-accent/10 transition-colors"
                  aria-label="Add Friends"
                >
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
                        <TabsTrigger
                          value="my-code"
                          className="wobbly-sm data-[state=active]:bg-marker data-[state=active]:text-white"
                        >
                          My Code
                        </TabsTrigger>
                        <TabsTrigger
                          value="scan"
                          className="wobbly-sm data-[state=active]:bg-marker data-[state=active]:text-white"
                        >
                          Scan
                        </TabsTrigger>
                      </TabsList>
                    </div>
                    <DialogDescription className="text-base">
                      Share your QR code or scan a friend's code.
                    </DialogDescription>
                  </DialogHeader>

                  <TabsContent
                    value="my-code"
                    className="mt-2 min-h-[420px] flex flex-col items-center justify-center w-full outline-none"
                  >
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
                        <p className="font-display font-bold text-xl tracking-tight text-foreground">
                          @{username}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Scan with phone camera to open chat
                        </p>
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
                            navigator.clipboard.writeText(
                              `https://campusxpose.online/messages?to=${username}`,
                            );
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
                              navigator
                                .share({
                                  title: "Message me anonymously",
                                  text: `Chat with me on CampusXpose!`,
                                  url: shareUrl,
                                })
                                .catch((err: any) => {
                                  if (err.name === "AbortError") return;
                                  navigator.clipboard.writeText(shareUrl).then(() => {
                                    toast.success("Link copied to clipboard!");
                                  }).catch(() => {});
                                });
                            } else if (typeof window !== "undefined" && (window as any).median) {
                              (window as any).median.share.sharePage({
                                url: shareUrl,
                                title: "Message me anonymously",
                              });
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

                  <TabsContent
                    value="scan"
                    className="mt-2 min-h-[420px] flex flex-col items-center justify-center w-full outline-none"
                  >
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
                            <h3 className="font-display font-bold text-ink text-xl">
                              Camera Permission
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-[250px] font-sans">
                              We need your permission to use the camera for scanning QR codes.
                            </p>
                          </div>
                          <Button
                            onClick={() => {
                              setIsScanning(true);
                              localStorage.setItem("camera_permission_granted", "true");
                            }}
                            className="mt-2 bg-marker text-white hover:bg-marker/90 border-2 border-ink shadow-ink transition-all wobbly-sm px-6 hover:-translate-y-1 active:translate-y-0 relative z-10"
                          >
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
                            formats={["qr_code"]}
                            constraints={{ facingMode: "environment" }}
                            onError={(error: any) => {
                              console.error("Scanner Error:", error);
                              setIsScanning(false);
                              localStorage.removeItem("camera_permission_granted");

                              // Specific error handling for permissions
                              if (
                                error?.name === "NotAllowedError" ||
                                error?.message?.toLowerCase().includes("permission denied")
                              ) {
                                toast.error(
                                  "Camera Permission Denied! If you are in the app, make sure Camera permission is enabled in your App Settings/Manifest.",
                                  { duration: 6000 },
                                );
                              } else if (
                                window.location.protocol !== "https:" &&
                                window.location.hostname !== "localhost"
                              ) {
                                toast.error("Camera requires HTTPS to work securely.");
                              } else {
                                toast.error(
                                  error?.message ||
                                  "Failed to access camera. Device might not support it.",
                                );
                              }
                            }}
                            onScan={(result) => {
                              if (result && result.length > 0) {
                                const url = result[0].rawValue;
                                try {
                                  const parsedUrl = new URL(url);
                                  if (
                                    parsedUrl.hostname.includes("campusxpose.online") &&
                                    parsedUrl.pathname.includes("/messages")
                                  ) {
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
                      <p className="mt-6 text-xs text-muted-foreground text-center px-4 font-medium h-[20px]">
                        Point your camera at a friend's CampusXpose QR code.
                      </p>
                    </motion.div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="px-3 pb-2">
          <div className="flex bg-secondary/60 p-1 wobbly-sm border-2 border-ink shadow-ink-soft">
            <button
              className={cn("flex-1 py-1.5 font-sans font-semibold transition-all text-sm wobbly-sm", activeTab === "messages" ? "bg-white text-ink shadow-ink-soft border-2 border-ink sketch-card" : "text-ink/50 hover:text-ink")}
              onClick={() => setActiveTab("messages")}
            >
              Chats
            </button>
            <button
              className={cn("flex-1 py-1.5 font-sans font-semibold transition-all text-sm wobbly-sm ml-1", activeTab === "calls" ? "bg-white text-ink shadow-ink-soft border-2 border-ink sketch-card" : "text-ink/50 hover:text-ink")}
              onClick={() => setActiveTab("calls")}
            >
              Calls
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-2">
          {isPushSupportedFlag && pushStatus === "default" && (
            <div className="bg-postit p-3 mx-2 mb-2 rounded-xl border border-ink/15 shadow-ink-soft">
              <p className="text-sm font-sans font-medium text-ink mb-2">
                Enable Push Notifications to get alerted for new messages.
              </p>
              <Button
                onClick={handleEnablePush}
                size="sm"
                className="w-full bg-ink text-white hover:bg-ink/80 rounded-lg shadow-none border-none"
              >
                <BellRing className="w-4 h-4 mr-2" /> Enable Notifications
              </Button>
            </div>
          )}

          <div className="px-1 mb-3">
            <div className="flex items-center gap-2 bg-white wobbly-sm px-2 py-1.5 border-2 border-ink shadow-ink-soft focus-within:shadow-ink transition-all">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startNew()}
                placeholder="New message to..."
                className="bg-transparent border-none focus-visible:ring-0 shadow-none text-ink placeholder:text-ink/30 flex-1 px-2 text-sm h-9 font-sans"
              />
              <Button
                onClick={startNew}
                size="icon"
                className="shrink-0 bg-marker text-white wobbly-sm h-8 w-8 transition-transform hover:-translate-y-0.5 shadow-ink-soft border-2 border-ink"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>




          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-muted/40 animate-pulse" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-1/2 rounded bg-muted/40 animate-pulse" />
                  <div className="h-3 w-3/4 rounded bg-muted/40 animate-pulse" />
                </div>
              </div>
            ))
            : activeTab === "calls" ? (
              callsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center text-muted-foreground">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/30">
                    <Phone className="h-6 w-6 opacity-50" />
                  </div>
                  <p className="text-sm">No recent calls.</p>
                </div>
              ) : (
                callsList.map((call) => {
                  const otherUser = call.sender_username === username ? call.recipient_username : call.sender_username;
                  const isIncoming = call.sender_username !== username;
                  const isMissed = call.content === "CALL_LOG|MISSED";
                  const durationStr = call.content.split("|")[2] || "0";
                  const durationInt = parseInt(durationStr);
                  const formattedDuration = `${Math.floor(durationInt / 60)}:${(durationInt % 60).toString().padStart(2, "0")}`;

                  return (
                    <div
                      key={call.id}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-3 rounded-2xl transition-all hover:bg-muted/50 cursor-pointer relative mb-1",
                        active === otherUser && "bg-white shadow-sm border border-border/40"
                      )}
                      onClick={() => navigate({ to: "/messages", search: { to: otherUser } })}
                    >
                      <UserSymbol username={otherUser} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 truncate font-medium">
                          <span className={isMissed && isIncoming ? "text-red-500 font-semibold" : "text-ink/90 font-semibold"}>
                            {getDisplayName(otherUser)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 font-medium">
                          {isMissed ? (
                            isIncoming ? (
                              <PhoneMissed className="h-3 w-3 text-red-500" />
                            ) : (
                              <PhoneMissed className="h-3 w-3" />
                            )
                          ) : (
                            <PhoneCall className="h-3 w-3 text-emerald-500" />
                          )}
                          <span className={isMissed && isIncoming ? "text-red-500" : ""}>
                            {isMissed ? (isIncoming ? "Missed Call" : "Canceled Call") : `Incoming Call • ${formattedDuration}`}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-[10px] text-muted-foreground self-start mt-1 font-medium">
                        {timeAgo(call.created_at)}
                      </div>
                    </div>
                  );
                })
              )
            ) : regularConversations.map((item) => {
              const unread = unreadBy[item.user] ?? 0;
              return (
                <div
                  key={item.user}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 wobbly-sm transition-all hover:bg-white/80 cursor-pointer relative mb-1",
                    active === item.user && "bg-white shadow-ink-soft border-2 border-ink sketch-card",
                  )}
                >
                  <Link
                    to="/messages"
                    search={{ to: item.user }}
                    className="flex min-w-0 flex-1 items-center gap-3 outline-none"
                  >
                    <UserSymbol username={item.user} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 truncate font-medium">
                        <span className="text-ink font-semibold">{getDisplayName(item.user)}</span>
                        {item.user && verified.has(item.user) && (
                          <VerifiedBadge className="h-3.5 w-3.5" />
                        )}
                        {unread > 0 && active !== item.user && (
                          <span className="grid h-5 min-w-5 place-items-center bg-marker rounded-full px-1.5 text-[10px] font-bold leading-none text-white">
                            {unread > 9 ? "9+" : unread}
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground font-medium mt-0.5">
                        {item.msg.sender_username === username ? "You: " : ""}
                        {item.msg.content?.startsWith("CALL_LOG|") ? (item.msg.content === "CALL_LOG|MISSED" ? "Missed call" : "Audio call") : item.msg.content}
                      </div>
                    </div>

                      <div className="shrink-0 text-[10px] text-muted-foreground mt-1 font-medium self-start">
                        {timeAgo(item.msg.created_at)}
                      </div>
                  </Link>
                </div>
              );
            })}
          {!loading && regularConversations.length === 0 && activeTab === "messages" && (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center text-muted-foreground">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/30">
                <MessageCircle className="h-6 w-6 opacity-50" />
              </div>
              <p className="text-sm">
                No messages have arrived yet.
                <br />
                Start a conversation above or tap a username in Global Chat.
              </p>
            </div>
          )}

        </div>
      </aside>

      {/* Active thread */}
      <section
        className={cn("min-h-0 flex-1 flex-col bg-paper relative", active ? "flex" : "hidden md:flex")}
      >
        {active ? (
          <>
            <header className="flex items-center gap-3 border-b-2 border-ink px-4 py-3 bg-white/90 backdrop-blur-md sticky top-0 z-20">
              <Button asChild variant="ghost" size="icon" className="md:hidden hover:bg-muted text-ink/80 -ml-2">
                <Link to="/messages" search={{}}>
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <UserSymbol username={active} size="md" />
              <div>
                <div className="inline-flex items-center gap-1 font-display font-bold text-ink">
                  {getDisplayName(active)}
                  {active && verified.has(active) && <VerifiedBadge />}
                </div>
                {online >= 2 ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    online
                  </span>
                ) : (
                  <div className="text-xs text-ink/40 font-medium">Anonymous direct message</div>
                )}
              </div>
              <div className="ml-auto flex items-center gap-2">
                {active && !blockedUsers.includes(active) && !isUnknown && (
                  <button
                    onClick={startCall}
                    className="rounded-full bg-ink/5 p-2 text-ink/60 hover:bg-ink/10 hover:text-ink transition-colors"
                  >
                    <Phone className="h-5 w-5" />
                  </button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-ink/40 hover:bg-muted hover:text-ink">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-2 border-ink/10 bg-white">
                    <DropdownMenuItem className="cursor-pointer font-medium" onClick={() => {
                      setNicknameInput(nicknames[active] || "");
                      setNicknameDialogOpen(true);
                    }}>
                      <Edit2 className="mr-2 h-4 w-4" /> {nicknames[active] ? "Change Nickname" : "Add Nickname"}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-marker focus:bg-red-50 focus:text-marker" onClick={() => deleteConversation(active)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Chat
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-marker focus:bg-red-50 focus:text-marker" onClick={() => toggleBlockUser(active)}>
                      <Ban className="mr-2 h-4 w-4" /> {blockedUsers.includes(active) ? "Unblock User" : "Block User"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {thread.some((m) => m.pinned) && (
              <div className="border-b-2 border-ink bg-postit px-4 py-2 z-10 relative shadow-ink-sm wobbly-sm mx-4 mt-2 mb-2">
                <div className="mx-auto w-full max-w-2xl space-y-1">
                  {thread
                    .filter((m) => m.pinned)
                    .map((m) => (
                      <div key={m.id} className="flex items-center gap-2 text-xs">
                        <Pin className="h-3.5 w-3.5 shrink-0 text-marker" />
                        <span className="shrink-0 font-semibold text-marker">
                          {m.sender_username}:
                        </span>
                        <span className="truncate text-ink">
                          <Linkify text={m.content} />
                        </span>
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

            <div
              ref={threadBoxRef}
              className="mx-auto flex w-full md:max-w-3xl min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 md:px-8 py-4 bg-paper"
            >
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn("flex w-full", i % 2 === 0 ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "h-10 w-[50%] rounded-2xl bg-muted/40 animate-pulse",
                        i % 2 === 0 ? "rounded-tr-sm bg-blue-100/50" : "rounded-tl-sm",
                      )}
                    />
                  </div>
                ))
                : thread.map((m) => {
                  const own = m.sender_hash === hashedId;
                  const reactions = byMessage.get(m.id) ?? [];
                  const isCallLog = m.content?.startsWith("CALL_LOG|");

                  if (isCallLog) {
                    const isMissed = m.content === "CALL_LOG|MISSED";
                    const durationStr = m.content?.split("|")[2] || "0";
                    const durationInt = parseInt(durationStr);
                    const formattedDuration = `${Math.floor(durationInt / 60)}:${(durationInt % 60).toString().padStart(2, "0")}`;

                    return (
                      <div key={m.id} className={cn("flex w-full my-3", own ? "justify-end" : "justify-start")}>
                        <div className={cn("flex items-center gap-3 px-4 py-2.5 rounded-xl border-2", isMissed ? "bg-red-50/80 border-red-200/50" : "bg-white border-ink/8")}>
                          <div className={cn("p-2 rounded-lg", isMissed ? "bg-red-100" : "bg-emerald-100")}>
                            {isMissed ? <PhoneMissed className="h-4 w-4 text-red-600" /> : <PhoneCall className="h-4 w-4 text-emerald-600" />}
                          </div>
                          <div className="flex flex-col ml-1">
                            <span className={cn("text-sm font-semibold tracking-wide", isMissed ? "text-red-600" : "text-emerald-700")}>
                              {isMissed ? (own ? "Canceled Call" : "Missed Call") : "Audio Call"}
                            </span>
                            {!isMissed && <span className="text-xs font-medium text-ink/50">{formattedDuration}</span>}
                          </div>
                          <div className="w-[1px] h-6 bg-ink/10 mx-2"></div>
                          <span className="text-[10px] text-ink/40 font-medium">{formatTime(m.created_at)}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      className={cn("group flex w-full", own ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "flex max-w-[85%] min-w-0 flex-col gap-0",
                          own ? "items-end" : "items-start",
                        )}
                      >
                        <MessageGestures
                          onReply={() => setReplyTo(m)}
                          onReact={(e) => toggle(m.id, e)}
                          onPin={() => pinMessage(m)}
                          pinned={m.pinned}
                          align={own ? "end" : "start"}
                        >
                          <div
                            className={cn(
                              "flex items-center gap-1",
                              own ? "flex-row" : "flex-row-reverse",
                            )}
                          >
                            <MessageActions
                              className="hidden transition-opacity md:flex md:opacity-0 md:group-hover:opacity-100"
                              onToggle={(e) => toggle(m.id, e)}
                              onReply={() => setReplyTo(m)}
                              onPin={() => pinMessage(m)}
                              pinned={m.pinned}
                            />
                            <div
                              className={cn(
                                "relative min-w-0 w-fit max-w-full px-4 py-2.5 text-[16px] font-sans",
                                own
                                  ? "bg-blue-100 text-ink border-2 border-blue-300 wobbly-sm shadow-ink-soft sketch-card"
                                  : "bg-white text-ink border-2 border-ink wobbly-sm shadow-ink-soft sketch-card",
                              )}
                            >
                              {m.pinned && (
                                <Pin className={cn("absolute -right-2 -top-2 h-5 w-5 rotate-45 rounded-full p-1", own ? "bg-white text-ink" : "bg-marker text-white")} />
                              )}
                              <ReplyQuote
                                username={m.reply_to_username}
                                content={m.reply_to_content}
                                align={own ? "end" : "start"}
                              />
                              {m.image_url && (
                                <div className="mb-2 max-w-[240px] overflow-hidden rounded-xl mt-1">
                                  <img
                                    src={m.image_url}
                                    alt="Attachment"
                                    className="w-full h-auto object-cover"
                                    loading="lazy"
                                  />
                                </div>
                              )}
                              <div className="flex flex-wrap items-end justify-end gap-x-2">
                                {m.content && (
                                  <span className="min-w-0 whitespace-pre-wrap break-words leading-relaxed font-bold flex-1">
                                    <Linkify text={m.content} />
                                  </span>
                                )}
                                <span
                                  className={cn(
                                    "shrink-0 text-[10px] ml-2 font-medium relative top-1",
                                    own ? "text-ink/50" : "text-ink/30",
                                  )}
                                >
                                  {formatTime(m.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </MessageGestures>
                        <ReactionChips
                          reactions={reactions}
                          onToggle={(e) => toggle(m.id, e)}
                          align={own ? "end" : "start"}
                        />
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
              <div className="shrink-0 bg-transparent px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <div className="mx-auto flex w-full max-w-xl items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-center text-sm text-ink shadow-md border border-border/20">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-blue-500" />
                  <span className="font-medium">
                    This is an official admin message. You can read replies here, but can't reply back.
                  </span>
                </div>
              </div>
            ) : blockedUsers.includes(active) ? (
              <div className="bg-white/60 backdrop-blur-md p-6 text-center text-muted-foreground font-medium flex flex-col items-center justify-center gap-2 border-t border-border/20 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <Ban className="h-8 w-8 text-red-400 mb-2" />
                You have blocked this user. Unblock them from the top menu to send messages.
              </div>
            ) : thread.length > 0 && thread.every((m) => m.sender_username !== username) && !acceptedUsers.includes(active) ? (
              <div className="shrink-0 bg-white/80 backdrop-blur-md border-t border-border/20 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <div className="mx-auto w-full max-w-xl bg-white rounded-2xl p-6 shadow-lg border border-border/10 flex flex-col items-center text-center gap-5">
                  <div className="space-y-1">
                    <h3 className="font-sans font-bold text-lg text-ink">Message Request</h3>
                    <p className="text-sm text-muted-foreground">
                      If you reply, <span className="font-semibold text-ink">{getDisplayName(active)}</span> will be able to call you and see when you've read their messages.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete this chat request from ${active}?`)) {
                          deleteConversation(active);
                        }
                      }}
                    >
                      Delete
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl shadow-md transition-all"
                      onClick={() => acceptUser(active)}
                    >
                      Accept
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="shrink-0 bg-white/90 backdrop-blur-md border-t-2 border-ink/8 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                <div className="mx-auto w-full md:max-w-3xl">
                  <TypingIndicator users={typing} className="mb-1.5 px-2" />
                  {replyTo && (
                    <div className="mb-2 flex items-center gap-2 wobbly-sm border-2 border-ink bg-postit px-3 py-2 text-xs shadow-ink-soft">
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-ink">
                          Replying to {replyTo.content ? replyTo.sender_username : "an image"}
                        </span>
                        <div className="truncate text-ink/50 mt-0.5">
                          {replyTo.content || (replyTo.image_url ? "📷 Image" : "")}
                        </div>
                      </div>
                      <button
                        onClick={() => setReplyTo(null)}
                        aria-label="Cancel reply"
                        className="hover:bg-muted/50 rounded-full p-1 text-ink/40 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    {imageFile && (
                      <div className="relative w-20 h-20 rounded-xl border-2 border-ink/10 overflow-hidden bg-surface-2/30 ml-2">
                        <img
                          src={URL.createObjectURL(imageFile)}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => setImageFile(null)}
                          className="absolute top-1 right-1 rounded-full bg-ink/70 p-1 text-white hover:bg-ink/90 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 wobbly-sm border-2 border-ink bg-white px-2 py-1.5 transition-all shadow-ink-soft focus-within:shadow-ink">
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
                        className="shrink-0 text-ink hover:bg-surface-2 wobbly-sm transition-colors ml-1 h-9 w-9 border border-transparent hover:border-ink"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                      >
                        <ImageIcon className="h-5 w-5" />
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
                        placeholder="Type a message..."
                        maxLength={1000}
                        maxHeight={150}
                        className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 max-h-32 pt-2 text-ink placeholder:text-ink/25 font-sans text-[15px]"
                        disabled={uploadingImage}
                      />
                      <Button
                        onClick={send}
                        disabled={(!text.trim() && !imageFile) || uploadingImage}
                        size="icon"
                        className="h-9 w-9 shrink-0 bg-marker text-white wobbly-sm hover:-translate-y-0.5 transition-transform active:translate-y-0 shadow-ink-soft border-2 border-ink mr-1"
                        aria-label="Send message"
                      >
                        {uploadingImage ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center text-ink/30 bg-paper">
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl border-2 border-ink/8 bg-white flex items-center justify-center rotate-3 shadow-ink-soft">
                <MessageCircle className="h-10 w-10 text-ink/15" strokeWidth={1.5} />
              </div>
              <div className="absolute -bottom-2 -right-2 h-6 w-6 rounded-lg bg-marker/10 border border-marker/20 flex items-center justify-center -rotate-6">
                <Send className="h-3 w-3 text-marker/40" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="font-display text-lg font-bold text-ink/25">Your messages</p>
              <p className="text-sm text-ink/20 font-medium">Select a chat or start a new conversation</p>
            </div>
          </div>
        )}
      </section>



      {/* Nickname Dialog */}
      <Dialog open={nicknameDialogOpen} onOpenChange={setNicknameDialogOpen}>
        <DialogContent className="sm:max-w-md bg-paper border-2 border-ink shadow-[4px_4px_0px_rgba(0,0,0,1)] wobbly-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-display font-bold">Nickname for {active}</DialogTitle>
            <DialogDescription className="text-sm font-medium text-ink/70">
              Only you can see this nickname. Leave blank to remove it.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input
              type="text"
              placeholder="Enter a nickname"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              className="w-full wobbly-sm border-2 border-ink bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-accent/50 shadow-ink-sm transition-all"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              className="border-2 border-ink hover:bg-muted"
              onClick={() => setNicknameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-accent text-white hover:bg-accent/90 border-2 border-ink shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
              onClick={() => {
                updateNickname(active || "", nicknameInput.trim());
                setNicknameDialogOpen(false);
              }}
            >
              Save Nickname
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Sparkles, RefreshCw, ChevronDown, ChevronUp, X, FileWarning, CheckCheck } from "lucide-react";
import { UserSymbol } from "@/components/UserSymbol";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIdentity } from "@/stores/identity";
import { submitMessage } from "@/lib/content.functions";
import { chatSummary } from "@/lib/ai.functions";
import { DEFAULT_KEYWORDS } from "@/lib/categories";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/community/$collegeId")({
  component: Community,
});

type Msg = { id: string; username: string; content: string; anonymous_user_hash: string; is_incident_signal: boolean; created_at: string };

function Community() {
  const { collegeId } = Route.useParams();
  const { hashedId, username } = useIdentity();
  const sendFn = useServerFn(submitMessage);
  const summaryFn = useServerFn(chatSummary);

  const collegeQ = useQuery({
    queryKey: ["college-name", collegeId],
    queryFn: async () => (await supabase.from("colleges").select("name").eq("id", collegeId).maybeSingle()).data,
  });

  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  
  const [summaryOpen, setSummaryOpen] = useState(true);
  const [summary, setSummary] = useState<{ key_issues: string[] } | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showRules, setShowRules] = useState(true);
  const [incidentPrompt, setIncidentPrompt] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase.from("community_messages").select("*").eq("college_id", collegeId).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setMessages((data ?? []) as Msg[]));
    const ch = supabase
      .channel(`chat-${collegeId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages", filter: `college_id=eq.${collegeId}` }, (p) => {
        setMessages((prev) => [p.new as Msg, ...prev.filter((m) => m.id !== (p.new as Msg).id)]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_messages" }, (p) => {
        setMessages((prev) => prev.filter((m) => m.id !== (p.old as any).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [collegeId]);


  const onType = (v: string) => {
    setText(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const hit = DEFAULT_KEYWORDS.some((k) => v.toLowerCase().includes(k));
      setIncidentPrompt(hit && v.trim().length > 8);
    }, 1000);
  };

  const send = async () => {
    if (!text.trim() || !hashedId || !username) return;
    const isSignal = DEFAULT_KEYWORDS.some((k) => text.toLowerCase().includes(k));
    const content = text.trim();
    setText("");
    setIncidentPrompt(false);
    try {
      await sendFn({ data: { collegeId, hashedId, username, content, isIncidentSignal: isSignal } });
    } catch {
      toast.error("Message failed");
    }
  };

  const loadSummary = async () => {
    setLoadingSummary(true);
    try {
      const s = await summaryFn({ data: { collegeId } });
      setSummary(s);
    } catch { toast.error("Could not generate summary"); } finally { setLoadingSummary(false); }
  };

  const initials = (collegeQ.data?.name ?? "Community").trim().slice(0, 2).toUpperCase();

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
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" /> Anonymous live chat
            </div>
          </div>
        </header>

        {/* AI summary bar */}
        <div className="border-b border-border bg-surface-2/40">
          <button onClick={() => setSummaryOpen((o) => !o)} className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium sm:px-4">
            <Sparkles className="h-4 w-4 text-primary" /> Today's Key Issues
            {summaryOpen ? <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground" /> : <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />}
          </button>
          {summaryOpen && (
            <div className="px-3 pb-3 text-sm sm:px-4">
              {summary?.key_issues?.length ? (
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {summary.key_issues.map((k, i) => <li key={i}>{k}</li>)}
                </ul>
              ) : (
                <p className="text-muted-foreground">No summary yet.</p>
              )}
              <Button size="sm" variant="outline" className="mt-2 rounded-full" onClick={loadSummary} disabled={loadingSummary}>
                <RefreshCw className={cn("mr-1 h-3.5 w-3.5", loadingSummary && "animate-spin")} /> {loadingSummary ? "Analyzing..." : "Refresh"}
              </Button>
            </div>
          )}
        </div>

        {showRules && (
          <div className="flex items-center gap-2 bg-primary/10 px-3 py-2 text-xs text-primary sm:px-4">
            Stay anonymous. Share truth. No personal attacks.
            <button className="ml-auto shrink-0" onClick={() => setShowRules(false)}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* messages */}
        <div className="flex flex-1 flex-col-reverse gap-3 overflow-y-auto px-3 py-4 sm:px-4">
          <AnimatePresence initial={false}>
            {messages.map((m) => {
              const own = m.anonymous_user_hash === hashedId;
              const avatar = (m.username ?? "?").trim().slice(0, 2).toUpperCase();
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
                    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-[10px] font-bold text-muted-foreground">
                      {avatar}
                    </div>
                  )}
                  <div className="flex max-w-[80%] flex-col gap-1">
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                        own
                          ? "rounded-br-md bg-primary text-primary-foreground shadow-primary/15"
                          : "rounded-bl-md border border-border bg-surface",
                        m.is_incident_signal && !own && "border-l-2 border-l-warning",
                      )}
                    >
                      {!own && <div className="mb-0.5 text-xs font-semibold text-primary/80">{m.username}</div>}
                      <div className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</div>
                    </div>
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
        <div className="border-t border-border bg-surface/80 px-3 py-3 backdrop-blur-sm sm:px-4">
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-2 py-1.5 transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
            <Input
              value={text}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Write anonymously..."
              disabled={!hashedId || !username}
              className="h-8 flex-1 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
            />
            <Button onClick={send} disabled={!text.trim()} size="icon" className="h-9 w-9 shrink-0 rounded-full">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}

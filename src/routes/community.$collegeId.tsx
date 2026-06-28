import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Sparkles, RefreshCw, ChevronDown, ChevronUp, X, FileWarning } from "lucide-react";
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
  const [cooldown, setCooldown] = useState(0);
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

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const onType = (v: string) => {
    setText(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const hit = DEFAULT_KEYWORDS.some((k) => v.toLowerCase().includes(k));
      setIncidentPrompt(hit && v.trim().length > 8);
    }, 1000);
  };

  const send = async () => {
    if (!text.trim() || cooldown > 0 || !hashedId || !username) return;
    const isSignal = DEFAULT_KEYWORDS.some((k) => text.toLowerCase().includes(k));
    const content = text.trim();
    setText("");
    setCooldown(10);
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

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col bg-background md:h-[calc(100dvh-4rem)]">
      <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <Link to="/colleges/$id" params={{ id: collegeId }}><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <div className="font-semibold">{collegeQ.data?.name ?? "Community"}</div>
          <div className="text-xs text-muted-foreground">Anonymous community chat</div>
        </div>
      </header>

      {/* AI summary bar */}
      <div className="border-b border-border bg-surface-2/50">
        <button onClick={() => setSummaryOpen((o) => !o)} className="flex w-full items-center gap-2 px-4 py-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" /> Today's Key Issues
          {summaryOpen ? <ChevronUp className="ml-auto h-4 w-4" /> : <ChevronDown className="ml-auto h-4 w-4" />}
        </button>
        {summaryOpen && (
          <div className="px-4 pb-3 text-sm">
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
        <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 text-xs text-primary">
          Stay anonymous. Share truth. No personal attacks.
          <button className="ml-auto" onClick={() => setShowRules(false)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* messages */}
      <div className="flex flex-1 flex-col-reverse gap-2 overflow-y-auto px-4 py-4">
        {messages.map((m) => {
          const own = m.anonymous_user_hash === hashedId;
          return (
            <div key={m.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-xl px-3 py-2 text-sm", own ? "bg-primary text-primary-foreground" : "bg-surface-2", m.is_incident_signal && !own && "border-l-2 border-warning")}>
                {!own && <div className="mb-0.5 text-xs font-medium opacity-70">{m.username}</div>}
                <div>{m.content}</div>
                <div className="mt-0.5 text-[10px] opacity-60">{timeAgo(m.created_at)}</div>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && <p className="my-auto text-center text-sm text-muted-foreground">No messages yet. Start the conversation.</p>}
      </div>

      {/* incident prompt */}
      <AnimatePresence>
        {incidentPrompt && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mx-4 mb-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
            <div className="flex items-center gap-2 text-warning"><FileWarning className="h-4 w-4" /> Lagta hai kuch issue hai?</div>
            <div className="mt-2 flex gap-2">
              <Button asChild size="sm" className="rounded-full"><Link to="/report" search={{ college: collegeId }}>📋 Report Officially</Link></Button>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setIncidentPrompt(false)}>Nahi, bas baat kar raha tha</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* input */}
      <div className="border-t border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <Input
            value={text}
            onChange={(e) => onType(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={cooldown > 0 ? `${cooldown} seconds...` : "Message likho..."}
            disabled={cooldown > 0}
            className="bg-surface-2"
          />
          <Button onClick={send} disabled={cooldown > 0 || !text.trim()} size="icon" className="shrink-0 rounded-full">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

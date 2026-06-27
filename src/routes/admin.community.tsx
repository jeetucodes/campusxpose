import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdmin } from "@/stores/admin";
import { adminClearChat, adminDeleteMessage } from "@/lib/admin.functions";
import { timeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/community")({
  head: () => ({ meta: [{ title: "Admin · Community" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminShell><CommunityAdmin /></AdminShell>,
});

function CommunityAdmin() {
  const { token } = useAdmin();
  const clear = useServerFn(adminClearChat);
  const delMsg = useServerFn(adminDeleteMessage);
  const colleges = useQuery({ queryKey: ["col-map"], queryFn: async () => (await supabase.from("colleges").select("id, name").order("name")).data ?? [] });
  const [collegeId, setCollegeId] = useState<string>("");
  const [msgs, setMsgs] = useState<any[]>([]);

  useEffect(() => {
    if (!collegeId) return;
    supabase.from("community_messages").select("*").eq("college_id", collegeId).order("created_at", { ascending: false }).limit(200).then(({ data }) => setMsgs(data ?? []));
    const ch = supabase.channel(`admin-chat-${collegeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_messages", filter: `college_id=eq.${collegeId}` }, (p) => {
        if (p.eventType === "INSERT") setMsgs((m) => [p.new, ...m]);
        if (p.eventType === "DELETE") setMsgs((m) => m.filter((x) => x.id !== (p.old as any).id));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [collegeId]);

  const exportChat = () => {
    const blob = new Blob([JSON.stringify(msgs, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `chat_${collegeId}_${new Date().toISOString().slice(0, 10)}.json`; a.click();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Community Monitor</h1>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Select value={collegeId} onValueChange={setCollegeId}>
          <SelectTrigger className="w-64 bg-surface"><SelectValue placeholder="Select a college" /></SelectTrigger>
          <SelectContent>{colleges.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        {collegeId && (
          <>
            <Button variant="outline" className="rounded-full" onClick={exportChat}>📥 Export First</Button>
            <Button variant="destructive" className="rounded-full" onClick={async () => { if (!window.confirm(`Delete all ${msgs.length} messages?`)) return; const r = await clear({ data: { token: token!, collegeId } }); toast.success(`Cleared ${r.deleted} messages`); setMsgs([]); }}>
              <Trash2 className="mr-1 h-4 w-4" /> Clear All Chat
            </Button>
          </>
        )}
      </div>
      <div className="mt-4 space-y-2">
        {msgs.map((m) => (
          <div key={m.id} className={cn("group flex items-center gap-2 rounded-lg bg-surface p-3 text-sm", m.is_incident_signal && "border-l-2 border-warning")}>
            <span className="font-medium">{m.username}</span>
            <span className="flex-1 truncate text-muted-foreground">{m.content}</span>
            <span className="text-xs text-muted-foreground">{timeAgo(m.created_at)}</span>
            <button className="opacity-0 transition-opacity group-hover:opacity-100" onClick={async () => { await delMsg({ data: { token: token!, id: m.id } }); setMsgs((x) => x.filter((y) => y.id !== m.id)); }}><Trash2 className="h-4 w-4 text-destructive" /></button>
          </div>
        ))}
        {collegeId && msgs.length === 0 && <p className="text-sm text-muted-foreground">No messages.</p>}
      </div>
    </div>
  );
}

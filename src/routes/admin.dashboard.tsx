import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Building2, AlertTriangle, FileText, Image, MessageSquare, Ban, Megaphone,
  Users, Activity, ShieldAlert, FileSearch, ArrowRight
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip,
} from "recharts";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdmin } from "@/stores/admin";
import { adminStats, adminRecentActivity, adminUpdatePushConfig } from "@/lib/admin.functions";
import { adminBroadcast } from "@/lib/notifications.functions";
import { INCIDENT_CATEGORIES, categoryLabel } from "@/lib/categories";
import { timeAgo } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin Dashboard" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminShell><Dashboard /></AdminShell>,
});

const COLORS = ["#6C63FF", "#FF4757", "#FFA502", "#2ED573", "#3B82F6", "#EC4899"];

function Dashboard() {
  const { token } = useAdmin();
  const stats = useServerFn(adminStats);

  const q = useQuery({
    queryKey: ["admin-stats"],
    enabled: !!token,
    refetchInterval: 30000,
    queryFn: () => stats({ data: { token: token! } }),
  });

  if (q.isLoading || !q.data) {
    return <div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl bg-surface" />)}</div>;
  }
  const d = q.data;
  const cards = [
    { label: "Colleges", icon: Building2, n: d.colleges.total, today: 0, color: "text-blue-400" },
    { label: "Incidents", icon: AlertTriangle, n: d.incidents.total, today: d.incidents.today, color: "text-destructive" },
    { label: "Posts", icon: FileText, n: d.posts.total, today: d.posts.today, color: "text-primary" },
    { label: "Evidence", icon: Image, n: d.evidence.total, today: d.evidence.today, color: "text-warning" },
    { label: "Messages", icon: MessageSquare, n: d.messages.total, today: d.messages.today, color: "text-success" },
    { label: "Banned Users", icon: Ban, n: d.banned.total, today: 0, color: "text-destructive" },
  ];

  const byCat = INCIDENT_CATEGORIES.map((c) => ({
    name: c.label,
    value: d.incidentRows.filter((r: any) => r.category === c.key).length,
  }));
  const sevBuckets = [
    { name: "Low", value: d.incidentRows.filter((r: any) => (r.severity ?? 0) <= 2).length },
    { name: "Medium", value: d.incidentRows.filter((r: any) => r.severity === 3).length },
    { name: "High", value: d.incidentRows.filter((r: any) => r.severity === 4).length },
    { name: "Critical", value: d.incidentRows.filter((r: any) => r.severity === 5).length },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-display font-bold tracking-tight text-ink flex items-center gap-3">
          Dashboard
          <span className="inline-block h-1 w-12 rounded-full bg-marker wavy-underline"></span>
        </h1>
        
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/colleges" className="sketch-card wobbly-sm flex items-center gap-2 px-4 py-2 text-sm font-medium text-ink bg-postit hover:bg-postit/80">
            <Building2 className="h-4 w-4 text-ink" /> Colleges
          </Link>
          <Link to="/admin/users" className="sketch-card wobbly-sm flex items-center gap-2 px-4 py-2 text-sm font-medium text-ink bg-surface hover:bg-surface-2">
            <Users className="h-4 w-4 text-ink" /> Users
          </Link>
          <Link to="/admin/incidents" className="sketch-card wobbly-sm flex items-center gap-2 px-4 py-2 text-sm font-medium text-ink bg-surface hover:bg-surface-2">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Incidents
          </Link>
          <Link to="/admin/moderation" className="sketch-card wobbly-sm flex items-center gap-2 px-4 py-2 text-sm font-medium text-ink bg-surface hover:bg-surface-2">
            <ShieldAlert className="h-4 w-4 text-warning" /> Moderation
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="sketch-card wobbly-md p-5 flex flex-col justify-between group">
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-full border-2 border-ink bg-surface shadow-ink-soft transition-transform group-hover:scale-110 group-hover:rotate-6`}>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </div>
              {c.today > 0 && <span className="font-display shadow-ink-soft border-2 border-ink rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive rotate-2">+{c.today} today</span>}
            </div>
            <div className="mt-4 text-4xl font-display font-bold text-ink">{c.n}</div>
            <div className="text-sm font-medium uppercase tracking-wider text-muted-foreground mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Incidents by Category">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byCat} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" stroke="#888" fontSize={11} />
              <YAxis type="category" dataKey="name" stroke="#888" fontSize={11} width={90} />
              <Tooltip contentStyle={{ background: "#1A1A1A", border: "1px solid #1F1F1F", borderRadius: 8 }} />
              <Bar dataKey="value" fill="#6C63FF" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Severity Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={sevBuckets} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                {sevBuckets.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#1A1A1A", border: "1px solid #1F1F1F", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <BroadcastCard />
      <RecentActivity />

    </div>
  );
}

function RecentActivity() {
  const { token } = useAdmin();
  const fn = useServerFn(adminRecentActivity);
  const [activeTab, setActiveTab] = useState<"posts" | "incidents" | "evidence">("posts");

  const q = useQuery({
    queryKey: ["admin-recent"],
    enabled: !!token,
    refetchInterval: 30000,
    queryFn: () => fn({ data: { token: token! } }),
  });

  return (
    <Card title="Recent Activity">
      <div className="mb-4 flex flex-wrap gap-2 border-b-2 border-ink border-dashed pb-3">
        <button
          onClick={() => setActiveTab("posts")}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-bold transition-all border-2 wobbly-sm ${activeTab === "posts" ? "bg-primary text-primary-foreground border-ink shadow-ink-soft -translate-y-1" : "bg-surface border-transparent text-muted-foreground hover:border-ink/50"}`}
        >
          <FileText className="h-4 w-4" /> Posts
        </button>
        <button
          onClick={() => setActiveTab("incidents")}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-bold transition-all border-2 wobbly-sm ${activeTab === "incidents" ? "bg-destructive text-destructive-foreground border-ink shadow-ink-soft -translate-y-1" : "bg-surface border-transparent text-muted-foreground hover:border-ink/50"}`}
        >
          <AlertTriangle className="h-4 w-4" /> Incidents
        </button>
        <button
          onClick={() => setActiveTab("evidence")}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-bold transition-all border-2 wobbly-sm ${activeTab === "evidence" ? "bg-warning text-ink border-ink shadow-ink-soft -translate-y-1" : "bg-surface border-transparent text-muted-foreground hover:border-ink/50"}`}
        >
          <FileSearch className="h-4 w-4" /> Evidence
        </button>
      </div>

      <div className="space-y-2">
        {activeTab === "posts" && (
          <>
            {(q.data?.posts ?? []).map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg bg-surface-2 p-3 text-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{p.username}</div>
                  <div className="truncate text-muted-foreground text-xs">{p.content}</div>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground">{timeAgo(p.created_at)}</div>
              </div>
            ))}
            {(q.data?.posts ?? []).length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">No recent posts.</p>}
          </>
        )}

        {activeTab === "incidents" && (
          <>
            {(q.data?.incidents ?? []).map((inc: any) => (
              <div key={inc.id} className="flex items-center gap-3 rounded-lg bg-surface-2 p-3 text-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/20 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{inc.title}</div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-destructive/80 font-medium">Sev {inc.severity}</span>
                    <span className="text-muted-foreground">&bull;</span>
                    <span className="text-muted-foreground truncate">{categoryLabel(inc.category)}</span>
                  </div>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground">{timeAgo(inc.first_seen)}</div>
              </div>
            ))}
            {(q.data?.incidents ?? []).length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">No recent incidents.</p>}
          </>
        )}

        {activeTab === "evidence" && (
          <>
            {(q.data?.evidence ?? []).map((ev: any) => (
              <div key={ev.id} className="flex items-center gap-3 rounded-lg bg-surface-2 p-3 text-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning">
                  <Image className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">File uploaded</div>
                  <div className="text-xs text-muted-foreground truncate uppercase">{ev.type}</div>
                </div>
                <a href={ev.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 shrink-0 text-xs text-primary hover:underline">
                  View <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            ))}
            {(q.data?.evidence ?? []).length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">No recent evidence.</p>}
          </>
        )}
      </div>
    </Card>
  );
}

function BroadcastCard() {
  const { token } = useAdmin();
  const broadcast = useServerFn(adminBroadcast);
  const updateConfig = useServerFn(adminUpdatePushConfig);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [configBusy, setConfigBusy] = useState(false);

  async function updatePushConfig() {
    if (!token) return;
    setConfigBusy(true);
    try {
      await updateConfig({ data: { token, origin: window.location.origin } });
      toast.success("Database push config updated to this domain");
    } catch {
      toast.error("Failed to update config");
    } finally {
      setConfigBusy(false);
    }
  }

  async function send() {
    if (!token || !message.trim()) return;
    setBusy(true);
    try {
      const res = await broadcast({
        data: { token, message: message.trim(), link: link.trim() || undefined },
      });
      toast.success(`Sent to ${res.inserted} users (${res.pushed} push)`);
      setMessage("");
      setLink("");
    } catch {
      toast.error("Broadcast failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Broadcast Announcement">
      <p className="mb-4 text-sm font-medium text-muted-foreground font-display">
        Sends one notification to every user (in-app + browser push for subscribers).
      </p>
      <div className="space-y-4">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Write your announcement here..."
          className="w-full border-2 border-ink bg-surface p-3 text-sm outline-none focus:ring-4 focus:ring-primary/20 wobbly-sm font-sans placeholder:text-muted-foreground resize-none"
        />
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          maxLength={300}
          placeholder="Optional link (e.g. /global)"
          className="w-full border-2 border-ink bg-surface p-3 text-sm outline-none focus:ring-4 focus:ring-primary/20 wobbly-sm font-sans placeholder:text-muted-foreground"
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={send}
            disabled={busy || !message.trim()}
            className="sketch-card wobbly-md flex flex-1 justify-center items-center gap-2 bg-primary px-4 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50 hover:bg-primary/90 hover:-translate-y-1 transition-all"
          >
            <Megaphone className="h-5 w-5" />
            {busy ? "Sending…" : "Send to All Users"}
          </button>
          <button
            onClick={updatePushConfig}
            disabled={configBusy}
            title="Fix DB Push Config URL"
            className="sketch-card wobbly-md flex justify-center items-center gap-2 bg-surface px-4 py-3 text-sm font-bold text-ink hover:bg-surface-2 disabled:opacity-50 transition-all"
          >
            {configBusy ? "Updating..." : "Fix Push Config"}
          </button>
        </div>
      </div>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="sketch-card wobbly-md bg-surface p-6">
      <h2 className="mb-5 font-display text-2xl font-bold text-ink underline decoration-wavy decoration-marker underline-offset-4">{title}</h2>
      {children}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Building2, AlertTriangle, FileText, Image, MessageSquare, Ban, Megaphone,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip,
} from "recharts";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdmin } from "@/stores/admin";
import { adminStats, adminRecentActivity } from "@/lib/admin.functions";
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
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <c.icon className={`h-5 w-5 ${c.color}`} />
              {c.today > 0 && <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive">+{c.today} today</span>}
            </div>
            <div className="mt-3 text-3xl font-bold">{c.n}</div>
            <div className="text-sm text-muted-foreground">{c.label}</div>
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
  const q = useQuery({
    queryKey: ["admin-recent"],
    enabled: !!token,
    refetchInterval: 30000,
    queryFn: () => fn({ data: { token: token! } }),
  });
  return (
    <Card title="Recent Activity">
      <div className="space-y-2">
        {(q.data?.posts ?? []).map((p: any) => (
          <div key={p.id} className="flex items-center gap-2 rounded-lg bg-surface-2 p-2 text-sm">
            <span className="font-medium">{p.username}</span>
            <span className="flex-1 truncate text-muted-foreground">{p.content}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(p.created_at)}</span>
          </div>
        ))}
        {(q.data?.posts ?? []).length === 0 && <p className="text-sm text-muted-foreground">No recent activity.</p>}
      </div>
    </Card>
  );
}

function BroadcastCard() {
  const { token } = useAdmin();
  const broadcast = useServerFn(adminBroadcast);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

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
      <p className="mb-3 text-sm text-muted-foreground">
        Sends one notification to every user (in-app + browser push for subscribers).
      </p>
      <div className="space-y-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Announcement message…"
          className="w-full rounded-lg border border-border bg-surface-2 p-3 text-sm outline-none focus:border-primary"
        />
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          maxLength={300}
          placeholder="Optional link (e.g. /global)"
          className="w-full rounded-lg border border-border bg-surface-2 p-3 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={send}
          disabled={busy || !message.trim()}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Megaphone className="h-4 w-4" />
          {busy ? "Sending…" : "Send to All Users"}
        </button>
      </div>
    </Card>
  );
}



function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-4 font-semibold">{title}</h2>
      {children}
    </div>
  );
}

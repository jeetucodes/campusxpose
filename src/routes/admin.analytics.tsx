import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { ratingColor, inr } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({ meta: [{ title: "Admin · Analytics" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminShell><Analytics /></AdminShell>,
});

function Analytics() {
  const q = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const [colleges, incidents, posts] = await Promise.all([
        supabase.from("colleges").select("*"),
        supabase.from("incidents").select("*"),
        supabase.from("posts").select("anonymous_user_hash"),
      ]);
      return { colleges: colleges.data ?? [], incidents: incidents.data ?? [], posts: posts.data ?? [] };
    },
  });
  const d = q.data;
  if (!d) return <p className="text-muted-foreground">Loading…</p>;

  const uniqueUsers = new Set(d.posts.map((p) => p.anonymous_user_hash)).size;
  const totalFine = d.incidents.reduce((s, i) => s + (i.total_amount ?? 0), 0);
  const resolved = d.incidents.filter((i) => i.status === "resolved").length;
  const resolutionRate = d.incidents.length ? Math.round((resolved / d.incidents.length) * 100) : 0;
  const mostReported = [...d.colleges].sort((a, b) => b.incident_count - a.incident_count)[0];

  const cities = Array.from(new Set(d.colleges.map((c) => c.city))).map((city) => {
    const cols = d.colleges.filter((c) => c.city === city);
    const inc = d.incidents.filter((i) => cols.some((c) => c.id === i.college_id)).length;
    const avg = cols.reduce((s, c) => s + (c.total_rating ?? 0), 0) / (cols.length || 1);
    return { city, colleges: cols.length, incidents: inc, avg };
  });

  const stats = [
    { l: "Unique Users", v: uniqueUsers },
    { l: "Most Reported", v: mostReported?.name ?? "—" },
    { l: "Total Fine Reported", v: inr(totalFine) },
    { l: "Resolution Rate", v: `${resolutionRate}%` },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className="rounded-xl border border-border bg-surface p-5">
            <div className="text-xl font-bold">{s.v}</div>
            <div className="text-sm text-muted-foreground">{s.l}</div>
          </div>
        ))}
      </div>
      <section>
        <h2 className="mb-3 font-semibold">City-wise Breakdown</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-muted-foreground"><tr><th className="p-3">City</th><th className="p-3">Colleges</th><th className="p-3">Incidents</th><th className="p-3">Avg Rating</th></tr></thead>
            <tbody>
              {cities.map((c) => (
                <tr key={c.city} className="border-t border-border">
                  <td className="p-3 font-medium">{c.city}</td>
                  <td className="p-3">{c.colleges}</td>
                  <td className="p-3">{c.incidents}</td>
                  <td className={cn("p-3 font-medium", ratingColor(c.avg))}>{c.avg.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

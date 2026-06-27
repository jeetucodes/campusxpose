import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Bot, FileText, Loader2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdmin } from "@/stores/admin";
import { adminAnalyzeBatch, adminGenerateReport } from "@/lib/admin.functions";
import { DEFAULT_KEYWORDS } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/admin/ai")({
  head: () => ({ meta: [{ title: "Admin · AI Control" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminShell><AIControl /></AdminShell>,
});

function AIControl() {
  const { token } = useAdmin();
  const batch = useServerFn(adminAnalyzeBatch);
  const report = useServerFn(adminGenerateReport);
  const [busy, setBusy] = useState(false);
  const [reportText, setReportText] = useState("");
  const [keywords, setKeywords] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_KEYWORDS;
    try { return JSON.parse(localStorage.getItem("campusxpose_keywords") || "null") ?? DEFAULT_KEYWORDS; } catch { return DEFAULT_KEYWORDS; }
  });
  const [newKw, setNewKw] = useState("");
  const [sensitivity, setSensitivity] = useState(6);

  const saveKw = (list: string[]) => { setKeywords(list); localStorage.setItem("campusxpose_keywords", JSON.stringify(list)); };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">AI Control</h1>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><Bot className="h-5 w-5 text-primary" /> Pending Analysis</h2>
        <Button disabled={busy} className="rounded-full" onClick={async () => { setBusy(true); try { const r = await batch({ data: { token: token! } }); toast.success(`${r.processed} analyzed, ${r.failed} failed`); } catch { toast.error("Failed"); } finally { setBusy(false); } }}>
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Analyze All Now
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><FileText className="h-5 w-5 text-primary" /> Daily Report</h2>
        <Button disabled={busy} variant="outline" className="rounded-full" onClick={async () => { setBusy(true); try { const r = await report({ data: { token: token! } }); setReportText(r.report); } catch { toast.error("Failed"); } finally { setBusy(false); } }}>Generate Today's Report</Button>
        {reportText && (
          <div className="mt-3">
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-4 text-xs">{reportText}</pre>
            <Button size="sm" variant="ghost" className="mt-2" onClick={() => { navigator.clipboard.writeText(reportText); toast.success("Copied"); }}>Copy</Button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-semibold">Incident Keywords</h2>
        <div className="flex flex-wrap gap-2">
          {keywords.map((k) => (
            <span key={k} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-sm">
              {k}<button className="text-destructive" onClick={() => saveKw(keywords.filter((x) => x !== k))}>×</button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Input value={newKw} onChange={(e) => setNewKw(e.target.value)} placeholder="Add keyword" className="bg-surface-2" />
          <Button onClick={() => { if (newKw.trim()) { saveKw([...keywords, newKw.trim()]); setNewKw(""); } }}>Add</Button>
        </div>
        <div className="mt-5">
          <span className="text-sm text-muted-foreground">Sensitivity: {sensitivity}</span>
          <Slider value={[sensitivity]} min={1} max={10} step={1} onValueChange={(v) => setSensitivity(v[0])} className="mt-1 max-w-sm" />
          <p className="mt-1 text-xs text-muted-foreground">Higher sensitivity = more false positives.</p>
        </div>
      </section>
    </div>
  );
}

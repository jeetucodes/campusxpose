import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Bot, FileText, Loader2, Download, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdmin } from "@/stores/admin";
import { adminAnalyzeBatch, adminGenerateReport, adminGenerateGrokReport } from "@/lib/admin.functions";
import { DEFAULT_KEYWORDS } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/admin/ai")({
  head: () => ({ meta: [{ title: "Admin · AI Control" }, { name: "robots", content: "noindex" }] }),
  component: () => <AdminShell><AIControl /></AdminShell>,
});

const cleanHtml = (raw: string) => {
  const match = raw.match(/```(?:html)?\s*([\s\S]*?)\s*```/i);
  return match ? match[1] : raw.replace(/```/g, "");
};

function AIControl() {
  const { token } = useAdmin();
  const batch = useServerFn(adminAnalyzeBatch);
  const report = useServerFn(adminGenerateReport);
  const grokReport = useServerFn(adminGenerateGrokReport);
  const [busy, setBusy] = useState(false);
  const [grokBusy, setGrokBusy] = useState(false);
  const [dailyBusy, setDailyBusy] = useState(false);
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_KEYWORDS;
    try { return JSON.parse(localStorage.getItem("campusxpose_keywords") || "null") ?? DEFAULT_KEYWORDS; } catch { return DEFAULT_KEYWORDS; }
  });
  const [newKw, setNewKw] = useState("");
  const [sensitivity, setSensitivity] = useState(6);

  const saveKw = (list: string[]) => { setKeywords(list); localStorage.setItem("campusxpose_keywords", JSON.stringify(list)); };

  const handleGrokReport = async () => {
    setGrokBusy(true);
    toast.info("AI is analyzing the entire website... This might take a minute.");
    try {
      const r = await grokReport({ data: { token: token! } });
      setReportHtml(r.reportHtml);
      toast.success("Analysis Complete!");
    } catch (e) {
      toast.error((e as Error)?.message ?? "Failed to generate report");
    } finally {
      setGrokBusy(false);
    }
  };

  const handlePrint = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>CampusXpose AI Analysis</title>
            <style>
              body {
                font-family: 'Inter', system-ui, sans-serif;
                padding: 40px;
                color: #0f172a;
              }
              h1, h2, h3 { font-weight: 800; color: #0f172a; margin-top: 0; }
              h2 { font-size: 1.5rem; border-bottom: 3px solid #0f172a; padding-bottom: 0.5rem; margin-top: 2rem; margin-bottom: 1rem; }
              h3 { font-size: 1.25rem; margin-top: 1.5rem; margin-bottom: 0.75rem; }
              p { line-height: 1.6; color: #334155; margin-bottom: 1rem; }
              strong { color: #dc2626; }
              ul, ol { background: #f8fafc; border: 2px solid #0f172a; border-radius: 8px; padding: 1.5rem 1.5rem 1.5rem 2.5rem; margin-bottom: 1.5rem; }
              li { margin-bottom: 0.5rem; }
              
              /* Beautiful Table Styling */
              table { width: 100%; border-collapse: collapse; margin-top: 1rem; margin-bottom: 2rem; background: #fff; border: 2px solid #0f172a; border-radius: 8px; }
              th, td { padding: 1rem; text-align: left; border-bottom: 2px solid #0f172a; }
              th { background: #f1f5f9; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.05em; font-weight: 800; color: #0f172a; }
              td:not(:last-child), th:not(:last-child) { border-right: 2px solid #0f172a; }
              tr:last-child td { border-bottom: none; }
              
              /* Header */
              .header { display: flex; align-items: center; gap: 16px; margin-bottom: 30px; border-bottom: 4px solid #0f172a; padding-bottom: 20px; }
              .header img { width: 60px; height: 60px; border-radius: 8px; border: 2px solid #0f172a; }
              .header h1 { margin: 0; font-size: 28px; }
              
              /* Print optimizations to prevent page breaks inside elements */
              @media print {
                table, ul, ol { page-break-inside: avoid; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                h2, h3 { page-break-after: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <img src="${window.location.origin}/logo.jpeg" alt="Logo" />
              <h1>CampusXpose Analysis</h1>
            </div>
            ${cleanHtml(reportHtml || "")}
          </body>
        </html>
      `);
      doc.close();
      
      iframe.contentWindow?.focus();
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => { document.body.removeChild(iframe); }, 1000);
      }, 500);
    }
  };

  return (
    <>
      <Dialog open={!!reportHtml} onOpenChange={(open) => !open && setReportHtml(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible">
          <DialogHeader className="print:hidden flex flex-row items-center justify-between border-b pb-4">
            <DialogTitle>AI Analysis Report</DialogTitle>
            <Button onClick={handlePrint} className="bg-primary text-white">
              <Printer className="mr-2 w-4 h-4" /> Print PDF
            </Button>
          </DialogHeader>
          
          <div id="printable-report" className="p-8 bg-white text-black min-h-screen">
            <style>{`
              /* Sketch Theme for AI HTML Output Preview */
              #printable-report {
                font-family: 'Inter', system-ui, sans-serif;
              }
              #printable-report h1, #printable-report h2, #printable-report h3 {
                font-weight: 800;
                color: #0f172a;
              }
              #printable-report h2 {
                font-size: 1.75rem;
                margin-top: 2rem;
                margin-bottom: 1rem;
                border-bottom: 3px solid #0f172a;
                padding-bottom: 0.5rem;
              }
              #printable-report h3 {
                font-size: 1.25rem;
                margin-top: 1.5rem;
                margin-bottom: 0.75rem;
              }
              #printable-report p {
                line-height: 1.7;
                margin-bottom: 1rem;
                color: #334155;
              }
              #printable-report strong {
                color: #dc2626;
                font-weight: 700;
              }
              #printable-report ul, #printable-report ol {
                margin-bottom: 1.5rem;
                padding: 1.25rem 1.25rem 1.25rem 2.5rem;
                background-color: #f8fafc;
                border: 2px solid #0f172a;
                border-radius: 8px;
                box-shadow: 4px 4px 0 #0f172a;
              }
              #printable-report li {
                margin-bottom: 0.5rem;
                color: #334155;
              }
              #printable-report li::marker {
                color: #0f172a;
                font-weight: 800;
              }
              /* Tables */
              #printable-report table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 1rem;
                margin-bottom: 2rem;
                background-color: #fff;
                border: 2px solid #0f172a;
                border-radius: 8px;
                box-shadow: 4px 4px 0 #0f172a;
                overflow: hidden;
              }
              #printable-report th, #printable-report td {
                padding: 1rem;
                text-align: left;
                border-bottom: 2px solid #0f172a;
              }
              #printable-report th {
                background-color: #f1f5f9;
                font-weight: 800;
                color: #0f172a;
                text-transform: uppercase;
                font-size: 0.85rem;
                letter-spacing: 0.05em;
              }
              #printable-report tr:last-child td {
                border-bottom: none;
              }
              #printable-report td:not(:last-child), #printable-report th:not(:last-child) {
                border-right: 2px solid #0f172a;
              }
            `}</style>
            <div className="flex items-center gap-4 mb-8 pb-6 border-b-4 border-gray-900">
              <img src="/logo.jpeg" className="w-14 h-14 rounded-lg border-2 border-gray-900" alt="Logo" />
              <h1 className="text-3xl font-black text-gray-900 m-0">CampusXpose Analysis</h1>
            </div>
            <div dangerouslySetInnerHTML={{ __html: cleanHtml(reportHtml || "") }} />
          </div>
        </DialogContent>
      </Dialog>
      <div className="space-y-8 print:hidden">
      <h1 className="text-2xl font-bold">AI Control</h1>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><Bot className="h-5 w-5 text-primary" /> OpenRouter Advanced Analysis</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Uses OpenRouter API (Nemotron-3) to perform a deep analysis of user behavior, incidents, colleges, and feedback across the entire website (excluding direct messages). Generates a beautifully formatted PDF report with logo.
        </p>
        <Button disabled={grokBusy} onClick={handleGrokReport} className="rounded-full bg-[#2d5da1] hover:bg-[#2d5da1]/90 text-white">
          {grokBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} 
          {grokBusy ? "Analyzing Data..." : "Generate Advanced PDF Report"}
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><Bot className="h-5 w-5 text-primary" /> Pending Analysis</h2>
        <Button disabled={busy} className="rounded-full" onClick={async () => { setBusy(true); try { const r = await batch({ data: { token: token! } }); toast.success(`${r.processed} analyzed, ${r.failed} failed${r.remaining ? " · more pending, run again" : ""}`); } catch (e) { toast.error((e as Error)?.message ?? "Failed"); } finally { setBusy(false); } }}>
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Analyze All Now
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><FileText className="h-5 w-5 text-primary" /> Daily Report (Legacy)</h2>
        <Button disabled={dailyBusy} variant="outline" className="rounded-full" onClick={async () => { 
          setDailyBusy(true); 
          toast.info("Generating daily report...");
          try { 
            const r = await report({ data: { token: token! } }); 
            setReportHtml(r.report);
            toast.success("Report Generated!");
          } catch (e) { 
            toast.error((e as Error)?.message ?? "Failed to generate report"); 
          } finally { 
            setDailyBusy(false); 
          } 
        }}>
          {dailyBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          {dailyBusy ? "Generating..." : "Generate Today's Report"}
        </Button>
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
    </>
  );
}

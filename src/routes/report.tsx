import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ghost, Shield, Check, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ProofUploader } from "@/components/ProofUploader";
import { REPORT_CATEGORIES } from "@/lib/categories";
import { useIdentity } from "@/stores/identity";
import { submitPost } from "@/lib/content.functions";
import { analyzePost as aiAnalyze } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/report")({
  validateSearch: z.object({ college: z.string().optional() }),
  head: () => ({ meta: [{ title: "Report an Incident — CampusXpose" }] }),
  component: ReportPage,
});

function ReportPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { hashedId, username } = useIdentity();
  const post = useServerFn(submitPost);
  const runAI = useServerFn(aiAnalyze);

  const collegesQ = useQuery({
    queryKey: ["colleges-min"],
    queryFn: async () => (await supabase.from("colleges").select("id, name, city").order("name")).data ?? [],
  });

  const [step, setStep] = useState(1);
  const [collegeId, setCollegeId] = useState<string>(search.college ?? "");
  const [collegeSearch, setCollegeSearch] = useState("");
  const [category, setCategory] = useState("");
  const [content, setContent] = useState("");
  const [affected, setAffected] = useState("");
  const [date, setDate] = useState("");
  const [fineAmount, setFineAmount] = useState("");
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const colleges = collegesQ.data ?? [];
  const selectedCollege = colleges.find((c) => c.id === collegeId);
  const filteredColleges = colleges.filter((c) => c.name.toLowerCase().includes(collegeSearch.toLowerCase()));

  const next = () => {
    if (step === 1 && !collegeId) return toast.error("Select a college");
    if (step === 2 && !category) return toast.error("Choose a category");
    if (step === 3 && content.trim().length < 50) return toast.error("Please describe in at least 50 characters");
    setStep((s) => Math.min(5, s + 1));
  };

  const submit = async () => {
    if (!hashedId || !username) return;
    setBusy(true);
    try {
      const finalContent = category === "fake_fine" && fineAmount ? `${content}\n\n[Fine amount: ₹${fineAmount}]` : content;
      const res = await post({ data: { collegeId, hashedId, username, content: finalContent, category, evidenceUrls } });
      if (res.postId) {
        runAI({ data: { postId: res.postId } }).catch(() => {});
      }
      toast.success("Your truth has been heard 🎯");
      setTimeout(() => navigate({ to: "/colleges/$id", params: { id: collegeId } }), 1200);
    } catch {
      toast.error("Could not submit. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold">Report an Incident</h1>
        {/* progress */}
        <div className="mt-4 flex gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className={cn("h-1.5 flex-1 rounded-full transition-colors", s <= step ? "bg-primary" : "bg-surface-2")} />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Step {step} of 5</p>

        <div className="mt-6 border-2 border-border bg-white p-6 shadow-ink" style={{ borderRadius: "25px 8px 22px 8px / 8px 22px 8px 25px" }}>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {step === 1 && (
                <div>
                  <h2 className="mb-3 font-semibold">Select College</h2>
                  <Input placeholder="Search colleges..." value={collegeSearch} onChange={(e) => setCollegeSearch(e.target.value)} className="bg-surface-2" />
                  <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
                    {filteredColleges.map((c) => (
                      <button key={c.id} onClick={() => setCollegeId(c.id)} className={cn("w-full border-2 px-3 py-2 text-left text-sm transition-all duration-100 hover:-rotate-1", collegeId === c.id ? "border-primary bg-primary/10 shadow-ink-soft" : "border-border bg-white hover:bg-surface-2")} style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}>
                        <span className="font-medium">{c.name}</span> <span className="text-muted-foreground">· {c.city}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="mb-3 font-semibold">Choose Category</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {REPORT_CATEGORIES.map((cat) => (
                      <button key={cat.key} onClick={() => setCategory(cat.key)} className={cn("rounded-xl border p-4 text-left transition-colors", category === cat.key ? "border-primary bg-primary/10" : "border-border hover:bg-surface-2")}>
                        <div className="text-2xl">{cat.emoji}</div>
                        <div className="mt-1 text-sm font-medium">{cat.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <h2 className="font-semibold">Describe the Incident</h2>
                  {category === "fake_fine" && (
                    <div className="grid gap-3 rounded-lg bg-surface-2 p-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Fine Amount (₹)</label>
                        <Input type="number" value={fineAmount} onChange={(e) => setFineAmount(e.target.value)} className="bg-surface" />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-muted-foreground">What happened? (min 50 chars)</label>
                    <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="Detail me likho kya hua..." className="bg-surface-2" />
                    <p className="mt-1 text-right text-xs text-muted-foreground">{content.length} chars</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Students affected (optional)</label>
                      <Input type="number" value={affected} onChange={(e) => setAffected(e.target.value)} className="bg-surface-2" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">When? (optional)</label>
                      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-surface-2" />
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <h2 className="font-semibold">Upload Proof</h2>
                  <p className="text-sm text-muted-foreground">Proof makes your report 5x more credible.</p>
                  <ProofUploader onUploaded={(url) => setEvidenceUrls((p) => [...p, url])} />
                  {evidenceUrls.length > 0 && <p className="text-sm text-success">{evidenceUrls.length} file(s) attached ✓</p>}
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <h2 className="font-semibold">Review & Submit</h2>
                  <div className="space-y-2 rounded-lg bg-surface-2 p-4 text-sm">
                    <Row k="College" v={selectedCollege?.name ?? "—"} />
                    <Row k="Category" v={REPORT_CATEGORIES.find((c) => c.key === category)?.label ?? "—"} />
                    {fineAmount && <Row k="Fine amount" v={`₹${fineAmount}`} />}
                    <Row k="Affected" v={affected || "—"} />
                    <Row k="Proof files" v={String(evidenceUrls.length)} />
                    <div className="pt-2 text-muted-foreground">{content}</div>
                  </div>
                  <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                    <div className="flex items-center gap-2"><Ghost className="h-5 w-5 text-primary" /><span className="font-medium">{username}</span></div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-success"><Shield className="h-4 w-4" /> Your real identity is never stored</div>
                    <p className="mt-1 text-xs text-muted-foreground">Even we cannot identify you.</p>
                  </div>
                  <Button disabled={busy} onClick={submit} className="w-full rounded-full">{busy ? "Submitting..." : "Submit Anonymously"}</Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {step < 5 && (
            <div className="mt-6 flex justify-between">
              <Button variant="ghost" disabled={step === 1} onClick={() => setStep((s) => s - 1)} className="rounded-full"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
              {step === 4 ? (
                <Button onClick={() => setStep(5)} variant="outline" className="rounded-full">Skip / Continue <ArrowRight className="ml-1 h-4 w-4" /></Button>
              ) : (
                <Button onClick={next} className="rounded-full">Next <ArrowRight className="ml-1 h-4 w-4" /></Button>
              )}
            </div>
          )}
        </div>
      </div>
    </SiteShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;
}

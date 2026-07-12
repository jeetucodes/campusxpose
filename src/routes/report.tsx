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
import { AutoResizeTextarea } from "@/components/AutoResizeTextarea";
import { ProofUploader } from "@/components/ProofUploader";
import { REPORT_CATEGORIES, CRITICAL_CATEGORIES, isSexualViolenceContent } from "@/lib/categories";
import { useIdentity } from "@/stores/identity";
import { submitPost } from "@/lib/content.functions";
import { analyzePost as aiAnalyze, reviewBeforePublish } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/report")({
  validateSearch: z.object({ college: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Report an Incident — CampusXpose" },
      { name: "description", content: "Anonymously report fake fines, placement fraud, harassment and other campus issues with evidence on CampusXpose." },
      { property: "og:url", content: "https://campusxpose.online/report" },
    ],
    links: [{ rel: "canonical", href: "https://campusxpose.online/report" }],
  }),
  component: ReportPage,
});

function ReportPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { hashedId, username } = useIdentity();
  const post = useServerFn(submitPost);
  const runAI = useServerFn(aiAnalyze);
  const runPreReview = useServerFn(reviewBeforePublish);

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
  const [scanning, setScanning] = useState(false);

  // AI review state
  const [isCritical, setIsCritical] = useState(false);
  const [criticalReason, setCriticalReason] = useState("");
  const [severityLabel, setSeverityLabel] = useState("NORMAL");

  const colleges = collegesQ.data ?? [];
  const selectedCollege = colleges.find((c) => c.id === collegeId);
  const filteredColleges = colleges.filter((c) => c.name.toLowerCase().includes(collegeSearch.toLowerCase()));

  // Is proof mandatory for this report?
  const proofMandatory = isCritical || CRITICAL_CATEGORIES.has(category);

  const next = async () => {
    if (step === 1 && !collegeId) return toast.error("Select a college");
    if (step === 2 && !category) return toast.error("Choose a category");
    if (step === 3 && content.trim().length < 50) return toast.error("Please describe in at least 50 characters");

    // Step 3 → 4: Run AI pre-review scan
    if (step === 3) {
      setScanning(true);
      try {
        // Fast client-side keyword check first
        const localCritical = isSexualViolenceContent(content) || CRITICAL_CATEGORIES.has(category);

        // Then full AI review
        const review = await runPreReview({ data: { content, category } });

        const critical = review.is_critical_sexual || localCritical;
        setIsCritical(critical);
        setSeverityLabel(review.severity_label);
        setCriticalReason(review.reason);

        if (critical) {
          toast.warning("⚠️ Serious allegation detected — proof upload zaroori hai", { duration: 4000 });
        }
      } catch {
        // Fallback to keyword check only
        const localCritical = isSexualViolenceContent(content) || CRITICAL_CATEGORIES.has(category);
        setIsCritical(localCritical);
        if (localCritical) setCriticalReason("Yeh ek serious allegation hai. Proof upload karna zaroori hai.");
      } finally {
        setScanning(false);
      }
    }

    setStep((s) => Math.min(5, s + 1));
  };

  const submit = async () => {
    if (!hashedId || !username) return;

    // Block submit if critical and no proof uploaded
    if (proofMandatory && evidenceUrls.length === 0) {
      toast.error("⚠️ Is report ke liye proof upload karna zaroori hai", { duration: 5000 });
      setStep(4);
      return;
    }

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
    <SiteShell hideFooter>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold">Report an Incident</h1>
        {/* progress */}
        <div className="mt-4 flex gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className={cn("h-1.5 flex-1 rounded-full transition-colors", s <= step ? (isCritical ? "bg-red-500" : "bg-primary") : "bg-surface-2")} />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Step {step} of 5</p>

        {/* Critical warning banner */}
        <AnimatePresence>
          {isCritical && step >= 4 && (
            <motion.div
              key="critical-banner"
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              className="mt-4 rounded-xl border-2 border-red-400 bg-red-50 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-lg">🚨</div>
                <div>
                  <p className="font-semibold text-red-700">Serious Allegation — Proof Zaroori Hai</p>
                  <p className="mt-1 text-sm text-red-600">
                    {criticalReason || "Aapki report mein ek bahut serious allegation hai (sexual violence / rape). Yeh report tab hi publish hogi jab aap koi proof upload karein — screenshot, audio, video, ya document."}
                  </p>
                  <p className="mt-2 text-xs text-red-500">
                    Bina proof ke yeh report hold mein rahegi aur publicly visible nahi hogi.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 text-xs text-red-700">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                Aapki identity poori tarah anonymous rahegi. Proof sirf verification ke liye use hoga.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                      <button key={cat.key} onClick={() => setCategory(cat.key)} className={cn("border-2 p-4 text-left transition-all duration-100 hover:-translate-y-0.5", category === cat.key ? (CRITICAL_CATEGORIES.has(cat.key) ? "border-red-400 bg-red-50 shadow-ink-soft" : "border-primary bg-primary/10 shadow-ink-soft") : "border-border bg-white hover:bg-surface-2")} style={{ borderRadius: "18px 6px 20px 6px / 6px 20px 6px 18px" }}>
                        <div className="text-2xl">{cat.emoji}</div>
                        <div className="mt-1 text-sm font-medium">{cat.label}</div>
                        {CRITICAL_CATEGORIES.has(cat.key) && (
                          <div className="mt-1 text-xs text-red-500 font-medium">Proof required</div>
                        )}
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
                    <AutoResizeTextarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Detail me likho kya hua..." className="bg-surface-2 min-h-[100px]" />
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
                  {CRITICAL_CATEGORIES.has(category) && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                      🚨 Is category ke liye proof upload mandatory hai. Aage badh ke proof zaroor upload karein.
                    </div>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">Upload Proof</h2>
                    {proofMandatory && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">REQUIRED</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {proofMandatory
                      ? "⚠️ Is serious report ke liye proof upload karna zaroori hai. Bina proof ke publish nahi hoga."
                      : "Proof makes your report 5x more credible."}
                  </p>
                  <ProofUploader onUploaded={(url) => setEvidenceUrls((p) => [...p, url])} />
                  {evidenceUrls.length > 0 && (
                    <p className="flex items-center gap-1 text-sm text-success">
                      <Check className="h-4 w-4" /> {evidenceUrls.length} file(s) attached ✓
                    </p>
                  )}
                  {proofMandatory && evidenceUrls.length === 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                      Koi bhi ek proof file upload karo (screenshot, audio, video, ya document) — phir aage badh sakte ho.
                    </div>
                  )}
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <h2 className="font-semibold">Review & Submit</h2>
                  {isCritical && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      🚨 Serious allegation — {evidenceUrls.length} proof file(s) attached. Report hold mein rahegi jab tak admin review na kare.
                    </div>
                  )}
                  <div className="space-y-2 rounded-lg bg-surface-2 p-4 text-sm">
                    <Row k="College" v={selectedCollege?.name ?? "—"} />
                    <Row k="Category" v={REPORT_CATEGORIES.find((c) => c.key === category)?.label ?? "—"} />
                    {fineAmount && <Row k="Fine amount" v={`₹${fineAmount}`} />}
                    <Row k="Affected" v={affected || "—"} />
                    <Row k="Proof files" v={String(evidenceUrls.length)} />
                    {isCritical && <Row k="AI Review" v={`${severityLabel} — Proof Required`} />}
                    <div className="pt-2 text-muted-foreground">{content}</div>
                  </div>
                  <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                    <div className="flex items-center gap-2"><Ghost className="h-5 w-5 text-primary" /><span className="font-medium">{username}</span></div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-success"><Shield className="h-4 w-4" /> Your real identity is never stored</div>
                    <p className="mt-1 text-xs text-muted-foreground">Even we cannot identify you.</p>
                  </div>
                  <Button disabled={busy || (proofMandatory && evidenceUrls.length === 0)} onClick={submit} className={cn("w-full", isCritical && "bg-red-600 hover:bg-red-700")}>
                    {busy ? "Submitting..." : isCritical ? "Submit with Proof 🚨" : "Submit Anonymously"}
                  </Button>
                  {proofMandatory && evidenceUrls.length === 0 && (
                    <p className="text-center text-xs text-red-500">Pehle proof upload karo (Step 4) — tabhi submit hoga.</p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* footer buttons */}
          <div className="mt-6 flex justify-between">
            <Button 
              variant="ghost" 
              onClick={() => {
                if (step === 1) {
                  if (collegeId) {
                    navigate({ to: "/colleges/$id", params: { id: collegeId } });
                  } else {
                    navigate({ to: "/colleges" });
                  }
                } else {
                  setStep((s) => s - 1);
                }
              }}
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> {step === 1 ? "Exit" : "Back"}
            </Button>
            {step < 5 && (
              step === 3 ? (
                <Button onClick={next} disabled={scanning}>
                  {scanning ? (
                    <span className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-4 w-4 rounded-full border-2 border-current border-t-transparent"
                      />
                      AI Review...
                    </span>
                  ) : (
                    <>Next <ArrowRight className="ml-1 h-4 w-4" /></>
                  )}
                </Button>
              ) : step === 4 ? (
                proofMandatory ? (
                  <Button
                    onClick={() => {
                      if (evidenceUrls.length === 0) {
                        toast.error("Is serious report ke liye proof upload karna zaroori hai");
                        return;
                      }
                      setStep(5);
                    }}
                    className={cn(evidenceUrls.length > 0 ? "" : "opacity-60")}
                  >
                    Continue <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={() => setStep(5)} variant="outline">Skip / Continue <ArrowRight className="ml-1 h-4 w-4" /></Button>
                )
              ) : (
                <Button onClick={next}>Next <ArrowRight className="ml-1 h-4 w-4" /></Button>
              )
            )}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;
}

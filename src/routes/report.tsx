import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ghost, Shield, Check, ArrowLeft, ArrowRight, Flame } from "lucide-react";
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
      {
        name: "description",
        content:
          "Anonymously report fake fines, placement fraud, harassment and other campus issues with evidence on CampusXpose.",
      },
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
    queryFn: async () =>
      (await supabase.from("colleges").select("id, name, city").order("name")).data ?? [],
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
  const filteredColleges = colleges.filter((c) =>
    c.name.toLowerCase().includes(collegeSearch.toLowerCase()),
  );

  // Is proof mandatory for this report?
  const proofMandatory = isCritical || CRITICAL_CATEGORIES.has(category);

  const next = async () => {
    if (step === 1 && !collegeId) return toast.error("Select a college");
    if (step === 2 && !category) return toast.error("Choose a category");
    if (step === 3 && content.trim().length < 50)
      return toast.error("Please describe in at least 50 characters");

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
          toast.warning("⚠️ Serious allegation detected — proof upload zaroori hai", {
            duration: 4000,
          });
        }
      } catch {
        // Fallback to keyword check only
        const localCritical = isSexualViolenceContent(content) || CRITICAL_CATEGORIES.has(category);
        setIsCritical(localCritical);
        if (localCritical)
          setCriticalReason("Yeh ek serious allegation hai. Proof upload karna zaroori hai.");
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
      const finalContent =
        category === "fake_fine" && fineAmount
          ? `${content}\n\n[Fine amount: ₹${fineAmount}]`
          : content;
      const res = await post({
        data: { collegeId, hashedId, username, content: finalContent, category, evidenceUrls },
      });
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
      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        <div className="mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-black flex items-center gap-3">
            <Flame className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-500 animate-pulse" /> Report an Incident
          </h1>
          <p className="mt-3 text-muted-foreground font-medium text-sm sm:text-base">Speak up securely. 100% anonymous & untraceable.</p>
        </div>

        {/* Chunky Progress */}
        <div className="flex gap-2 sm:gap-3 mb-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={cn(
                "h-3 sm:h-4 flex-1 rounded-md border-2 border-border transition-all duration-300",
                s <= step 
                  ? (isCritical ? "bg-red-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "bg-accent shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]") 
                  : "bg-surface-2 opacity-50"
              )}
            />
          ))}
        </div>
        <p className="text-xs sm:text-sm font-bold text-foreground">Step {step} of 5</p>

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
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-lg">
                  🚨
                </div>
                <div>
                  <p className="font-semibold text-red-700">
                    Serious Allegation — Proof Zaroori Hai
                  </p>
                  <p className="mt-1 text-sm text-red-600">
                    {criticalReason ||
                      "Aapki report mein ek bahut serious allegation hai (sexual violence / rape). Yeh report tab hi publish hogi jab aap koi proof upload karein — screenshot, audio, video, ya document."}
                  </p>
                  <p className="mt-2 text-xs text-red-500">
                    Bina proof ke yeh report hold mein rahegi aur publicly visible nahi hogi.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 text-xs text-red-700">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                Aapki identity poori tarah anonymous rahegi. Proof sirf verification ke liye use
                hoga.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className="mt-8 border-[3px] border-border bg-white p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all"
          style={{ borderRadius: "24px" }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {step === 1 && (
                <div>
                  <h2 className="mb-3 font-semibold">Select College</h2>
                  <Input
                    placeholder="Search colleges..."
                    value={collegeSearch}
                    onChange={(e) => setCollegeSearch(e.target.value)}
                    className="bg-surface-2"
                  />
                  <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
                    {filteredColleges.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setCollegeId(c.id)}
                        className={cn(
                          "w-full border-2 px-3 py-2 text-left text-sm transition-all duration-100 hover:-rotate-1",
                          collegeId === c.id
                            ? "border-primary bg-primary/10 shadow-ink-soft"
                            : "border-border bg-white hover:bg-surface-2",
                        )}
                        style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }}
                      >
                        <span className="font-medium">{c.name}</span>{" "}
                        <span className="text-muted-foreground">· {c.city}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="mb-4 font-display text-xl sm:text-2xl font-black">Choose Category</h2>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {REPORT_CATEGORIES.map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => setCategory(cat.key)}
                        className={cn(
                          "border-2 p-4 text-left transition-all duration-200",
                          category === cat.key
                            ? CRITICAL_CATEGORIES.has(cat.key)
                              ? "border-red-500 bg-red-100 shadow-[4px_4px_0px_0px_rgba(239,68,68,1)] -translate-y-1"
                              : "border-accent bg-accent/10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -translate-y-1"
                            : "border-border bg-white shadow-sm hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5",
                        )}
                        style={{ borderRadius: "16px" }}
                      >
                        <div className="text-3xl mb-2">{cat.emoji}</div>
                        <div className="text-sm sm:text-base font-bold text-foreground leading-tight">{cat.label}</div>
                        {CRITICAL_CATEGORIES.has(cat.key) && (
                          <div className="mt-2 inline-block rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 uppercase tracking-wide">
                            Proof Required
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <h2 className="font-display text-xl sm:text-2xl font-black mb-2">Describe the Incident</h2>
                  {category === "fake_fine" && (
                    <div className="grid gap-3 rounded-xl border-2 border-border bg-yellow-50 p-4 shadow-sm">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Fine Amount (₹)</label>
                        <Input
                          type="number"
                          value={fineAmount}
                          onChange={(e) => setFineAmount(e.target.value)}
                          className="border-2 border-border shadow-sm focus-visible:ring-2 focus-visible:ring-accent bg-white"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                      What happened? (min 50 chars)
                    </label>
                    <AutoResizeTextarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Detail me likho kya hua..."
                      className="border-2 border-border shadow-sm focus-visible:ring-2 focus-visible:ring-accent min-h-[120px] bg-white text-base"
                    />
                    <p className="mt-1 text-right text-xs text-muted-foreground">
                      {content.length} chars
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                        Students affected <span className="text-[10px] font-normal lowercase">(optional)</span>
                      </label>
                      <Input
                        type="number"
                        value={affected}
                        onChange={(e) => setAffected(e.target.value)}
                        className="border-2 border-border shadow-sm focus-visible:ring-2 focus-visible:ring-accent bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">When? <span className="text-[10px] font-normal lowercase">(optional)</span></label>
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="border-2 border-border shadow-sm focus-visible:ring-2 focus-visible:ring-accent bg-white"
                      />
                    </div>
                  </div>
                  {CRITICAL_CATEGORIES.has(category) && (
                    <div className="rounded-lg border-2 border-red-300 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700 shadow-sm">
                      🚨 Is category ke liye proof upload mandatory hai. Aage badh ke proof zaroor upload karein.
                    </div>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h2 className="font-display text-xl sm:text-2xl font-black">Upload Proof</h2>
                    {proofMandatory && (
                      <span className="rounded-md border-2 border-red-200 bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-red-700 shadow-sm">
                        REQUIRED
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
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
                      Koi bhi ek proof file upload karo (screenshot, audio, video, ya document) —
                      phir aage badh sakte ho.
                    </div>
                  )}
                </div>
              )}

              {step === 5 && (
                <div className="space-y-5">
                  <h2 className="font-display text-xl sm:text-2xl font-black">Review & Submit</h2>
                  {isCritical && (
                    <div className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-xs font-bold text-red-800 shadow-[2px_2px_0px_0px_rgba(239,68,68,1)]">
                      🚨 Serious allegation — {evidenceUrls.length} proof file(s) attached. Report hold mein rahegi jab tak admin review na kare.
                    </div>
                  )}
                  <div className="space-y-2.5 rounded-xl border-2 border-border bg-surface-2 p-5 text-sm shadow-sm">
                    <Row k="College" v={selectedCollege?.name ?? "—"} />
                    <Row
                      k="Category"
                      v={REPORT_CATEGORIES.find((c) => c.key === category)?.label ?? "—"}
                    />
                    {fineAmount && <Row k="Fine amount" v={`₹${fineAmount}`} />}
                    <Row k="Affected" v={affected || "—"} />
                    <Row k="Proof files" v={String(evidenceUrls.length)} />
                    {isCritical && <Row k="AI Review" v={`${severityLabel} — Proof Required`} />}
                    <div className="pt-3 mt-1 border-t-2 border-dashed border-border text-foreground font-medium text-sm leading-relaxed">{content}</div>
                  </div>
                  <div className="rounded-xl border-2 border-green-500 bg-green-50 p-4 shadow-[4px_4px_0px_0px_rgba(34,197,94,1)]">
                    <div className="flex items-center gap-2">
                      <Ghost className="h-6 w-6 text-green-600" />
                      <span className="font-black text-green-900">{username}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm font-bold text-green-700">
                      <Shield className="h-4 w-4" /> Your real identity is never stored
                    </div>
                    <p className="mt-1 text-xs font-semibold text-green-600/80">
                      Even we cannot identify you.
                    </p>
                  </div>
                  <Button
                    size="lg"
                    disabled={busy || (proofMandatory && evidenceUrls.length === 0)}
                    onClick={submit}
                    className={cn("w-full border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all font-black text-base sm:text-lg", isCritical ? "bg-red-500 hover:bg-red-600 text-white" : "bg-accent hover:bg-accent/90 text-white")}
                  >
                    {busy
                      ? "Submitting..."
                      : isCritical
                        ? "Submit with Proof 🚨"
                        : "Submit Anonymously"}
                  </Button>
                  {proofMandatory && evidenceUrls.length === 0 && (
                    <p className="text-center text-xs text-red-500">
                      Pehle proof upload karo (Step 4) — tabhi submit hoga.
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* footer buttons */}
          <div className="mt-8 flex justify-between border-t-2 border-dashed border-border pt-6">
            <Button
              variant="outline"
              size="lg"
              className="border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all font-bold"
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
              <ArrowLeft className="mr-2 h-4 w-4" /> {step === 1 ? "Exit" : "Back"}
            </Button>
            {step < 5 &&
              (step === 3 ? (
                <Button size="lg" className="border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all font-bold bg-accent text-white" onClick={next} disabled={scanning}>
                  {scanning ? (
                    <span className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-5 w-5 rounded-full border-4 border-current border-t-transparent"
                      />
                      Scanning...
                    </span>
                  ) : (
                    <>
                      Next Step <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              ) : step === 4 ? (
                proofMandatory ? (
                  <Button
                    size="lg"
                    className={cn("border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all font-bold bg-accent text-white", evidenceUrls.length > 0 ? "" : "opacity-50 cursor-not-allowed")}
                    onClick={() => {
                      if (evidenceUrls.length === 0) {
                        toast.error("Is serious report ke liye proof upload karna zaroori hai");
                        return;
                      }
                      setStep(5);
                    }}
                  >
                    Continue <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                ) : (
                  <Button size="lg" onClick={() => setStep(5)} variant="outline" className="border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all font-bold">
                    Skip / Continue <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                )
              ) : (
                <Button size="lg" className="border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all font-bold bg-accent text-white" onClick={next}>
                  Next Step <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              ))}
          </div>
        </div>
      </div>
    </SiteShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

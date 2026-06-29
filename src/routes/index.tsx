import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Ghost,
  Search,
  Shield,
  FileWarning,
  Sparkles,
  ArrowRight,
  Flame,
  Trophy,
  Medal,
  Award,
  ArrowBigUp,
  Upload,
} from "lucide-react";
import { UserSymbol } from "@/components/UserSymbol";
import { SiteShell } from "@/components/Footer";
import { getHomeData } from "@/lib/home.functions";
import { supabase } from "@/integrations/supabase/client";
import { INCIDENT_CATEGORIES, categoryLabel, categoryEmoji } from "@/lib/categories";
import { timeAgo } from "@/lib/format";
import { HomeAds } from "@/components/HomeAds";

const homeQueryOptions = queryOptions({
  queryKey: ["home"],
  queryFn: () => getHomeData(),
  refetchInterval: 15000,
  refetchOnWindowFocus: true,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusXpose — College ka sach, bina darr ke" },
      { name: "description", content: "Anonymous platform for Indian students. Report fake fines, placement fraud, faculty issues — 100% anonymously." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQueryOptions),
  errorComponent: ({ error }) => <div role="alert" className="p-8 text-center">{error.message}</div>,
  component: Home,
});

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

function useCountUp(target: number, durationMs = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / durationMs);
          const eased = 1 - Math.pow(1 - p, 3);
          setValue(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, durationMs]);

  return { value, ref };
}

const trustPills = [
  { emoji: "🔒", label: "Anonymous" },
  { emoji: "📄", label: "Evidence Based" },
  { emoji: "⚡", label: "Instant" },
  { emoji: "🤖", label: "AI Powered" },
];

const steps = [
  { icon: Ghost, title: "Anonymous Login", desc: "App open karo — auto identity ban jaati hai" },
  { icon: Search, title: "College Dhundo", desc: "Apne city ke colleges dekho" },
  { icon: Upload, title: "Proof Upload", desc: "Built-in blur tool se evidence chhupao" },
  { icon: Shield, title: "Sach Share Karo", desc: "Anonymously report karo, dunga sabko pata chale" },
];

const features = [
  { icon: Ghost, title: "Fully Anonymous", desc: "No email, no phone. Sirf ek ghost identity." },
  { icon: FileWarning, title: "Evidence Based", desc: "Built-in blur tool for proof documents." },
  { icon: Sparkles, title: "AI Powered", desc: "Pattern detection aur incident analysis." },
];

function rankBadge(i: number) {
  if (i === 0) return { Icon: Trophy, cls: "text-amber-500", label: "Gold" };
  if (i === 1) return { Icon: Medal, cls: "text-slate-400", label: "Silver" };
  if (i === 2) return { Icon: Award, cls: "text-orange-700", label: "Bronze" };
  return null;
}

function Home() {
  const { data } = useSuspenseQuery(homeQueryOptions);
  const queryClient = useQueryClient();
  const [showAllReports, setShowAllReports] = useState(false);

  const reportTarget = Math.max(data?.postCount ?? 0, 247);
  const counter = useCountUp(reportTarget);

  useEffect(() => {
    const ch = supabase
      .channel("home-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        queryClient.invalidateQueries({ queryKey: ["home"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, () => {
        queryClient.invalidateQueries({ queryKey: ["home"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "colleges" }, () => {
        queryClient.invalidateQueries({ queryKey: ["home"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  return (
    <SiteShell>
      <div className="bg-cx-bg font-inter text-cx-ink">
        {/* ===== HERO ===== */}
        <section className="cx-dotgrid relative overflow-hidden px-5 pb-12 pt-14 text-center">
          <motion.div {...fadeUp} className="mx-auto max-w-md">
            <span
              ref={counter.ref}
              className="inline-flex items-center gap-2 rounded-full border border-cx-accent bg-white px-3.5 py-1.5 text-sm font-semibold text-cx-accent shadow-sm"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="cx-pulse-dot absolute inline-flex h-full w-full rounded-full bg-cx-accent" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cx-accent" />
              </span>
              <span className="font-mono">{counter.value}+</span> Reports Filed
            </span>

            <h1 className="mt-6 font-grotesk text-[36px] font-bold leading-[1.1] tracking-tight">
              College ka{" "}
              <span className="relative inline-block">
                <span className="relative z-10">sach</span>
                <span aria-hidden className="absolute inset-x-[-2px] bottom-1 z-0 h-2.5 rounded-sm bg-cx-accent/30" />
              </span>
              , bina darr ke
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-cx-muted">
              Apne college ki asli kahani share karo. Fake fines, placement fraud, faculty issues — sab kuch anonymously report karo.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                to="/colleges"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-cx-accent px-5 py-3 font-grotesk text-base font-bold text-white shadow-sm transition-transform active:scale-[0.98]"
              >
                Apna College Dhundo <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/report"
                className="inline-flex items-center justify-center rounded-xl border border-cx-ink/15 bg-white px-5 py-3 font-grotesk text-base font-semibold text-cx-ink"
              >
                Issue Report Karo
              </Link>
            </div>

            {/* stat strip */}
            <div className="mt-8 grid grid-cols-3 gap-2.5">
              {[
                { n: data?.collegeCount ?? 0, l: "Colleges" },
                { n: data?.postCount ?? 0, l: "Reports" },
                { n: data?.incidentCount ?? 0, l: "Incidents" },
              ].map((s, i) => (
                <div key={i} className="rounded-2xl border border-cx-ink/10 bg-cx-surface px-2 py-3">
                  <div className="font-mono text-2xl font-bold text-cx-accent">{s.n}</div>
                  <div className="mt-0.5 text-xs font-medium text-cx-muted">{s.l}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* ===== TRUST PILLS ===== */}
        <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-5 pb-2 pt-4">
          {trustPills.map((p) => (
            <span
              key={p.label}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cx-accent bg-white px-3.5 py-1.5 text-sm font-semibold text-cx-accent"
            >
              <span>{p.emoji}</span> {p.label}
            </span>
          ))}
        </div>

        <div className="px-5">
          <HomeAds />
        </div>

        {/* ===== HOW IT WORKS ===== */}
        <section className="mx-auto max-w-md px-5 py-10">
          <h2 className="mb-5 font-grotesk text-2xl font-bold">How It Works</h2>
          <div className="space-y-3">
            {steps.map((s, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ delay: i * 0.05 }}
                className="relative overflow-hidden rounded-2xl border border-cx-ink/10 border-l-4 border-l-cx-accent bg-white p-4 shadow-sm"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-1 top-1 font-mono font-bold leading-none text-cx-ink"
                  style={{ fontSize: "80px", opacity: 0.06 }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="relative flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cx-accent/10 text-cx-accent">
                    <s.icon className="h-5 w-5" strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-grotesk text-base font-bold">{s.title}</h3>
                    <p className="mt-0.5 text-sm text-cx-muted">{s.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ===== TOP COLLEGES ===== */}
        <section className="mx-auto max-w-md px-5 py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-grotesk text-2xl font-bold">🔥 Top Reported</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cx-ink/10 bg-white px-2.5 py-1 text-xs font-bold text-cx-accent">
              <span className="relative flex h-2 w-2">
                <span className="cx-pulse-dot absolute inline-flex h-full w-full rounded-full bg-cx-accent" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cx-accent" />
              </span>
              LIVE
            </span>
          </div>
          <div className="overflow-hidden rounded-2xl border border-cx-ink/10 bg-white shadow-sm">
            {(data?.top ?? []).map((c, i) => {
              const badge = rankBadge(i);
              return (
                <Link
                  key={c.id}
                  to="/colleges/$id"
                  params={{ id: c.id }}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${i % 2 ? "bg-[#fafafa]" : "bg-white"} ${i > 0 ? "border-t border-cx-ink/[0.06]" : ""}`}
                >
                  <span className="grid w-7 shrink-0 place-items-center">
                    {badge ? (
                      <badge.Icon className={`h-5 w-5 ${badge.cls}`} strokeWidth={2.5} />
                    ) : (
                      <span className="font-mono text-sm font-bold text-cx-muted">{i + 1}</span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-grotesk text-[15px] font-bold">{c.name}</div>
                    <div className="truncate text-xs text-cx-muted">{c.city}</div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cx-accent/10 px-2.5 py-1 font-mono text-sm font-bold text-cx-accent">
                    <Flame className="h-3.5 w-3.5" /> {c.incident_count}
                  </span>
                </Link>
              );
            })}
            {(data?.top ?? []).length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-cx-muted">Abhi tak koi report nahi. Pehle aap karo!</p>
            )}
          </div>
        </section>

        {/* ===== REPORT CATEGORIES ===== */}
        <section className="mx-auto max-w-md px-5 py-8">
          <h2 className="mb-4 font-grotesk text-2xl font-bold">Kya Report Kar Sakte Ho?</h2>
          <div className="grid grid-cols-2 gap-3">
            {INCIDENT_CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.key}
                {...fadeUp}
                transition={{ delay: i * 0.04 }}
                className="flex flex-col items-center gap-2 rounded-2xl border border-cx-ink/10 bg-white p-4 text-center shadow-sm transition-all duration-150 hover:scale-[1.02] hover:border-cx-accent active:scale-[1.02] active:border-cx-accent"
              >
                <span className="text-[32px] leading-none">{cat.emoji}</span>
                <span className="font-grotesk text-sm font-bold">{cat.label}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ===== LATEST REPORTS ===== */}
        <section className="mx-auto max-w-md px-5 py-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-grotesk text-2xl font-bold">📰 Latest Reports</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cx-ink/10 bg-white px-2.5 py-1 text-xs font-bold text-cx-accent">
              <span className="relative flex h-2 w-2">
                <span className="cx-pulse-dot absolute inline-flex h-full w-full rounded-full bg-cx-accent" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cx-accent" />
              </span>
              LIVE
            </span>
          </div>
          <div className="space-y-3">
            {(showAllReports ? (data?.recentPosts ?? []) : (data?.recentPosts ?? []).slice(0, 3)).map((p) => {
              const card = (
                <div className="rounded-2xl border border-cx-ink/10 border-l-[3px] border-l-cx-accent bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <UserSymbol username={p.username} size="sm" />
                    <span className="font-semibold text-cx-ink">{p.username ?? "Anonymous"}</span>
                    {p.created_at && <span className="text-cx-muted" suppressHydrationWarning>· {timeAgo(p.created_at)}</span>}
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-cx-accent/10 px-2 py-0.5 font-mono text-[11px] font-bold text-cx-accent">
                      <ArrowBigUp className="h-3.5 w-3.5" /> {p.upvotes ?? 0}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-cx-surface px-2 py-0.5 text-[11px] font-medium text-cx-ink">
                      {categoryEmoji(p.category ?? "general")} {categoryLabel(p.category ?? "general")}
                    </span>
                    {p.college_name && (
                      <span className="text-[11px] font-semibold text-cx-accent">🏫 {p.college_name}</span>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-cx-ink/90">{p.content}</p>
                </div>
              );
              return p.college_id ? (
                <Link key={p.id} to="/colleges/$id" params={{ id: p.college_id }} className="block">
                  {card}
                </Link>
              ) : (
                <div key={p.id}>{card}</div>
              );
            })}
            {(data?.recentPosts ?? []).length === 0 && (
              <p className="text-center text-sm text-cx-muted">Abhi koi report nahi aayi.</p>
            )}
          </div>
          {(data?.recentPosts ?? []).length > 3 && (
            <div className="mt-5 text-center">
              <button
                onClick={() => setShowAllReports((v) => !v)}
                className="rounded-xl border border-cx-ink/15 bg-white px-4 py-2 font-grotesk text-sm font-semibold"
              >
                {showAllReports ? "Show less" : "Read more"}
              </button>
            </div>
          )}
        </section>

        {/* ===== WHY US ===== */}
        <section className="mx-auto max-w-md px-5 pb-10">
          <div className="grid gap-3">
            {features.map((f, i) => (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 rounded-2xl border border-cx-ink/10 bg-cx-surface p-4"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-cx-accent shadow-sm">
                  <f.icon className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-grotesk text-base font-bold">{f.title}</h3>
                  <p className="mt-0.5 text-sm text-cx-muted">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* spacer so sticky CTA + bottom nav never cover content */}
        <div className="h-32" />
      </div>

      {/* ===== STICKY BOTTOM CTA ===== */}
      <div className="fixed inset-x-0 bottom-16 z-50 border-t border-cx-ink/10 bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:bottom-0">
        <Link
          to="/report"
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-cx-accent px-5 py-3.5 font-grotesk text-base font-bold text-white active:scale-[0.99]"
        >
          Abhi Report Karo <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </SiteShell>
  );
}

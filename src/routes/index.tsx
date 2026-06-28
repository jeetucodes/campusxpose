import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Ghost, Search, Shield, FileWarning, Sparkles, ArrowRight, Flame, TrendingUp } from "lucide-react";
import { SiteShell } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { getHomeData } from "@/lib/home.functions";
import { supabase } from "@/integrations/supabase/client";
import { INCIDENT_CATEGORIES, categoryLabel, categoryEmoji } from "@/lib/categories";
import { timeAgo } from "@/lib/format";

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
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

const WOBBLY = "255px 15px 225px 15px / 15px 225px 15px 255px";
const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";

function Home() {
  const { data } = useSuspenseQuery(homeQueryOptions);
  const queryClient = useQueryClient();

  // Auto-update top reported + stats when posts/incidents/colleges change.
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

  const steps = [
    { icon: Ghost, title: "Anonymous Login", desc: "App open karo — auto identity ban jaati hai", rot: "-rotate-2" },
    { icon: Search, title: "College Dhundo", desc: "Apne city ke colleges dekho", rot: "rotate-1" },
    { icon: Shield, title: "Sach Share Karo", desc: "Anonymously report karo, proof upload karo", rot: "-rotate-1" },
  ];
  const features = [
    { icon: Ghost, title: "Fully Anonymous", desc: "No email, no phone. Sirf ek ghost identity.", bg: "bg-white" },
    { icon: FileWarning, title: "Evidence Based", desc: "Built-in blur tool for proof documents.", bg: "bg-postit" },
    { icon: Sparkles, title: "AI Powered", desc: "Pattern detection aur incident analysis.", bg: "bg-white" },
  ];


  return (
    <SiteShell>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-20 text-center">
        {/* hand-drawn arrow to CTA (desktop) */}
        <svg className="pointer-events-none absolute right-[14%] top-[46%] hidden h-24 w-24 -rotate-12 text-accent md:block" viewBox="0 0 100 100" fill="none">
          <path d="M10 20 C 40 30, 60 50, 80 80" stroke="currentColor" strokeWidth="3" strokeDasharray="6 6" strokeLinecap="round" />
          <path d="M80 80 L 64 76 M80 80 L 76 62" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        {/* bouncing decorative circle */}
        <div className="absolute left-[12%] top-28 hidden h-12 w-12 animate-gentle-bounce border-2 border-border bg-postit md:block" style={{ borderRadius: "50% 40% 55% 45% / 45% 55% 40% 50%" }} />

        <motion.div {...fadeUp} className="mx-auto max-w-3xl">
          <span
            className="inline-flex -rotate-2 items-center gap-2 border-2 border-border bg-white px-4 py-1.5 text-sm font-semibold text-success shadow-ink-soft"
            style={{ borderRadius: WOBBLY_MD }}
          >
            <Shield className="h-3.5 w-3.5" /> 100% Anonymous Platform
          </span>
          <h1 className="mt-6 font-display text-5xl font-bold tracking-tight sm:text-7xl">
            Campus<span className="text-accent">Xpose</span>
            <span className="ml-1 inline-block rotate-12 text-accent">!</span>
          </h1>
          <p className="mt-4 text-2xl font-semibold">College ka sach, bina darr ke</p>
          <p className="mx-auto mt-3 max-w-xl text-lg text-muted-foreground">
            Apne college ki asli kahani share karo. Fake fines, placement fraud, faculty issues — sab kuch anonymously report karo.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link to="/colleges">Apna College Dhundo <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/report">Issue Report Karo</Link>
            </Button>
          </div>
          <div className="mx-auto mt-12 grid max-w-lg grid-cols-3 gap-4">
            {[
              { n: data?.collegeCount ?? 0, l: "Colleges", rot: "-rotate-2", bg: "bg-white" },
              { n: data?.postCount ?? 0, l: "Reports", rot: "rotate-2", bg: "bg-postit" },
              { n: "∞", l: "Anonymous Users", rot: "-rotate-1", bg: "bg-white" },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * i }}
                className={`border-2 border-border p-4 shadow-ink ${s.rot} ${s.bg}`}
                style={{ borderRadius: WOBBLY_MD }}
              >
                <div className="font-display text-3xl font-bold text-accent">{s.n}</div>
                <div className="text-sm text-muted-foreground">{s.l}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="mb-10 text-center font-display text-4xl font-bold">How It Works</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div
              key={i}
              {...fadeUp}
              transition={{ delay: i * 0.1 }}
              className={`sketch-card p-6 ${s.rot}`}
              style={{ borderRadius: WOBBLY_MD }}
            >
              <div
                className="mb-4 grid h-12 w-12 place-items-center border-2 border-border bg-accent text-accent-foreground"
                style={{ borderRadius: "50% 42% 55% 45% / 45% 55% 42% 50%" }}
              >
                <s.icon className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <div className="mb-1 text-sm text-muted-foreground">Step {i + 1}</div>
              <h3 className="mb-2 font-display text-xl font-bold">{s.title}</h3>
              <p className="text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={i}
              {...fadeUp}
              transition={{ delay: i * 0.1 }}
              className={`relative border-2 border-border p-6 shadow-ink transition-transform duration-100 hover:-rotate-1 ${f.bg}`}
              style={{ borderRadius: WOBBLY_MD }}
            >
              {/* tape strip */}
              <span className="absolute -top-3 left-1/2 h-5 w-16 -translate-x-1/2 rotate-3 bg-foreground/10 backdrop-blur-sm" />
              <div
                className="mb-4 grid h-11 w-11 place-items-center border-2 border-border bg-white"
                style={{ borderRadius: "50% 42% 55% 45% / 45% 55% 42% 50%" }}
              >
                <f.icon className="h-6 w-6 text-accent" strokeWidth={2.5} />
              </div>
              <h3 className="mb-2 font-display text-xl font-bold">{f.title}</h3>
              <p className="text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Top reported */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="mb-6 font-display text-3xl font-bold">🔥 Top Reported Colleges This Week</h2>
        <div className="space-y-4">
          {(data?.top ?? []).map((c, i) => (
            <Link
              key={c.id}
              to="/colleges/$id"
              params={{ id: c.id }}
              className={`sketch-card flex items-center justify-between p-4 ${i % 2 ? "rotate-1" : "-rotate-1"}`}
              style={{ borderRadius: WOBBLY_MD }}
            >
              <div>
                <div className="font-display text-lg font-bold">{c.name}</div>
                <div className="text-sm text-muted-foreground">{c.city}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 border-2 border-border bg-accent/15 px-2.5 py-1 text-sm font-bold text-accent">
                  <Flame className="h-3.5 w-3.5" /> {c.incident_count}
                </span>
                <TrendingUp className="h-4 w-4 text-accent" strokeWidth={2.5} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}

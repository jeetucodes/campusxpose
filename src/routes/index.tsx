import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Ghost, Search, Shield, FileWarning, Sparkles, ArrowRight, Flame, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusXpose — College ka sach, bina darr ke" },
      { name: "description", content: "Anonymous platform for Indian students. Report fake fines, placement fraud, faculty issues — 100% anonymously." },
    ],
  }),
  component: Home,
});

function useHomeData() {
  return useQuery({
    queryKey: ["home"],
    queryFn: async () => {
      const [colleges, posts, top] = await Promise.all([
        supabase.from("colleges").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("colleges").select("id, name, city, incident_count, total_rating").order("incident_count", { ascending: false }).limit(5),
      ]);
      return {
        collegeCount: colleges.count ?? 0,
        postCount: posts.count ?? 0,
        top: top.data ?? [],
      };
    },
  });
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

function Home() {
  const { data } = useHomeData();

  const steps = [
    { icon: Ghost, title: "Anonymous Login", desc: "App open karo — auto identity ban jaati hai" },
    { icon: Search, title: "College Dhundo", desc: "Apne city ke colleges dekho" },
    { icon: Shield, title: "Sach Share Karo", desc: "Anonymously report karo, proof upload karo" },
  ];
  const features = [
    { icon: Ghost, title: "Fully Anonymous", desc: "No email, no phone. Sirf ek ghost identity." },
    { icon: FileWarning, title: "Evidence Based", desc: "Built-in blur tool for proof documents." },
    { icon: Sparkles, title: "AI Powered", desc: "Pattern detection aur incident analysis." },
  ];

  return (
    <SiteShell>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-20 text-center">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <motion.div {...fadeUp} className="mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-success">
            <Shield className="h-3.5 w-3.5" /> 100% Anonymous Platform
          </span>
          <h1 className="mt-6 text-5xl font-extrabold tracking-tight sm:text-7xl">
            Campus<span className="text-accent">Xpose</span>
          </h1>
          <p className="mt-4 text-xl font-semibold text-foreground/90">College ka sach, bina darr ke</p>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Apne college ki asli kahani share karo. Fake fines, placement fraud, faculty issues — sab kuch anonymously report karo.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-full">
              <Link to="/colleges">Apna College Dhundo <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <Link to="/report">Issue Report Karo</Link>
            </Button>
          </div>
          <div className="mx-auto mt-12 grid max-w-lg grid-cols-3 gap-4">
            {[
              { n: data?.collegeCount ?? 0, l: "Colleges" },
              { n: data?.postCount ?? 0, l: "Reports" },
              { n: "∞", l: "Anonymous Users" },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 * i }} className="rounded-xl border border-border bg-surface p-4">
                <div className="text-2xl font-bold text-primary">{s.n}</div>
                <div className="text-xs text-muted-foreground">{s.l}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-10 text-center text-3xl font-bold">How It Works</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.1 }} className="glow-card rounded-xl border border-border bg-surface p-6">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
                <s.icon className="h-6 w-6" />
              </div>
              <div className="mb-1 text-sm text-muted-foreground">Step {i + 1}</div>
              <h3 className="mb-2 text-lg font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f, i) => (
            <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.1 }} className="glow-card rounded-xl border border-border bg-surface p-6">
              <f.icon className="mb-4 h-7 w-7 text-accent" />
              <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Top reported */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="mb-6 text-2xl font-bold">🔥 Top Reported Colleges This Week</h2>
        <div className="space-y-3">
          {(data?.top ?? []).map((c) => (
            <Link key={c.id} to="/colleges/$id" params={{ id: c.id }} className="glow-card flex items-center justify-between rounded-xl border border-border bg-surface p-4">
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.city}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-medium text-destructive">
                  <Flame className="h-3.5 w-3.5" /> {c.incident_count}
                </span>
                <TrendingUp className="h-4 w-4 text-destructive" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}

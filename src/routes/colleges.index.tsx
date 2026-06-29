import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Search, Flame, MapPin, ArrowRight, SlidersHorizontal, Plus, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/Footer";
import { StarRating } from "@/components/StarRating";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useIdentity } from "@/stores/identity";
import { submitCollegeRequest } from "@/lib/content.functions";
import { CITIES, COLLEGE_TYPES, INDIAN_STATES } from "@/lib/categories";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/colleges/")({
  head: () => ({
    meta: [
      { title: "Find Your College's Truth — CampusXpose" },
      { name: "description", content: "Browse Indian colleges, see ratings and incident reports. Search by name or city." },
      { property: "og:url", content: "https://campusxpose.online/colleges" },
    ],
    links: [{ rel: "canonical", href: "https://campusxpose.online/colleges" }],
  }),
  component: CollegesPage,
});

type Col = {
  id: string; name: string; city: string; state: string; type: string;
  total_rating: number; total_reviews: number; incident_count: number;
};

const TYPE_COLORS: Record<string, string> = {
  Engineering: "bg-[#2d5da1]/15 text-[#2d5da1]",
  Medical: "bg-success/15 text-success",
  Arts: "bg-warning/15 text-warning",
  University: "bg-accent/15 text-accent",
  Research: "bg-[#2d5da1]/15 text-[#2d5da1]",
  Commerce: "bg-accent/15 text-accent",
};


function CollegesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["colleges"],
    queryFn: async () => {
      const { data, error } = await supabase.from("colleges").select("*");
      if (error) throw error;
      return data as Col[];
    },
  });

  const [q, setQ] = useState("");
  const [city, setCity] = useState("All");
  const [type, setType] = useState("All");
  const [sort, setSort] = useState<"reported" | "rating" | "reviews">("reported");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (q.trim()) {
      const s = q.toLowerCase();
      rows = rows.filter((c) => c.name.toLowerCase().includes(s) || c.city.toLowerCase().includes(s));
    }
    if (city !== "All") rows = rows.filter((c) => c.city === city);
    if (type !== "All") rows = rows.filter((c) => c.type === type);
    rows = [...rows].sort((a, b) => {
      if (sort === "reported") return b.incident_count - a.incident_count;
      if (sort === "rating") return a.total_rating - b.total_rating;
      return b.total_reviews - a.total_reviews;
    });
    return rows;
  }, [data, q, city, type, sort]);

  return (
    <SiteShell hideFooter>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Find Your College's Truth</h1>
          <RequestCollegeDialog />
        </div>

        <div className="mt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by college name or city..." className="bg-surface pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="flex items-center gap-2 rounded-md border-2 border-border bg-white px-3 py-2 text-sm font-medium"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {filtersOpen ? "Hide Filters" : "Filters"}
            </button>
            {(city !== "All" || type !== "All" || q.trim()) && (
              <button
                onClick={() => { setCity("All"); setType("All"); setQ(""); }}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                Reset
              </button>
            )}
          </div>
          {filtersOpen && (
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">City</div>
                <div className="flex flex-wrap gap-2">
                  {["All", ...CITIES].map((c) => (
                    <Pill key={c} active={city === c} onClick={() => setCity(c)}>{c}</Pill>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</div>
                <div className="flex flex-wrap gap-2">
                  {["All", ...COLLEGE_TYPES].map((t) => (
                    <Pill key={t} active={type === t} onClick={() => setType(t)} small>{t}</Pill>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sort by</div>
                <div className="flex flex-wrap gap-2">
                  <SortBtn active={sort === "reported"} onClick={() => setSort("reported")}>Most Reported</SortBtn>
                  <SortBtn active={sort === "rating"} onClick={() => setSort("rating")}>Lowest Rated</SortBtn>
                  <SortBtn active={sort === "reviews"} onClick={() => setSort("reviews")}>Most Reviews</SortBtn>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 wobbly-md bg-surface-2" />)
            : filtered.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}>
                  <div className={cn("sketch-card flex h-full flex-col p-5", i % 2 ? "rotate-1" : "-rotate-1")} style={{ borderRadius: "25px 8px 22px 8px / 8px 22px 8px 25px" }}>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-lg font-bold leading-tight">{c.name}</h3>
                      <button
                        onClick={() => shareCollege(c)}
                        className="inline-flex shrink-0 items-center justify-center rounded-md border-2 border-border bg-surface-2 p-1.5 text-muted-foreground transition-transform hover:-translate-y-0.5 hover:text-foreground"
                        title="Share"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 border border-border bg-surface-2 px-2 py-0.5 text-muted-foreground">
                        <MapPin className="h-3 w-3" />{c.city}, {c.state}
                      </span>
                      <span className={cn("border border-border px-2 py-0.5 font-semibold", TYPE_COLORS[c.type] ?? "bg-surface-2 text-muted-foreground")}>{c.type}</span>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <StarRating value={c.total_rating} />
                      <span className="text-xs text-muted-foreground">{c.total_reviews} reviews</span>
                    </div>
                    <div className="mt-3">
                      <span className={cn("inline-flex items-center gap-1 border-2 border-border px-2.5 py-1 text-xs font-bold", c.incident_count > 50 ? "bg-accent/15 text-accent" : "bg-surface-2 text-muted-foreground")}>
                        {c.incident_count > 50 && <Flame className="h-3.5 w-3.5" />}
                        {c.incident_count} incidents
                      </span>
                    </div>
                    <Link
                      to="/colleges/$id"
                      params={{ id: c.id }}
                      className="mt-5 flex w-full items-center justify-center gap-1 border-2 border-border bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground shadow-ink transition-transform duration-100 hover:-translate-y-0.5 hover:shadow-ink-lg"
                      style={{ borderRadius: "18px 6px 20px 6px / 6px 20px 6px 18px" }}
                    >
                      View Truth <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </motion.div>
              ))}

        </div>

        {!isLoading && filtered.length === 0 && (
          <div className="mt-16 text-center">
            <div className="mx-auto inline-grid h-20 w-20 place-items-center border-2 border-border bg-postit text-4xl shadow-ink" style={{ borderRadius: "50% 42% 55% 45% / 45% 55% 42% 50%" }}>🔍</div>
            <h3 className="mt-4 font-display text-xl font-bold">No colleges found</h3>
            <p className="mt-1 text-muted-foreground">Try a different search, or request to add it.</p>
            <div className="mt-4 flex justify-center"><RequestCollegeDialog /></div>
          </div>
        )}
      </div>
    </SiteShell>
  );
}

async function shareCollege(c: Col) {
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/colleges/${c.id}`;
  const text = `Check out ${c.name} on CampusXpose`;
  const copyFallback = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => toast.success("Link copied!")).catch(() => toast.error("Couldn't copy link"));
    } else {
      toast.error("Sharing not supported on this device");
    }
  };
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: c.name, text, url });
    } catch (e: any) {
      // User cancelled or permission denied (e.g. inside an iframe) — fall back to copy.
      if (e?.name !== "AbortError") copyFallback();
    }
  } else {
    copyFallback();
  }
}

function Pill({ active, onClick, children, small }: { active: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <button onClick={onClick} style={{ borderRadius: "14px 5px 16px 5px / 5px 16px 5px 14px" }} className={cn("border-2 px-3 py-1 transition-transform duration-100 hover:-rotate-2", small ? "text-xs" : "text-sm", active ? "border-border bg-accent text-accent-foreground shadow-ink-soft" : "border-border bg-white text-muted-foreground hover:text-foreground")}>
      {children}
    </button>
  );
}
function SortBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ borderRadius: "12px 4px 14px 4px / 4px 14px 4px 12px" }} className={cn("border-2 border-border px-2.5 py-1 transition-transform duration-100 hover:-rotate-2", active ? "bg-[#2d5da1] text-white shadow-ink-soft" : "bg-white text-muted-foreground hover:text-foreground")}>
      {children}
    </button>
  );
}

function RequestCollegeDialog() {
  const { hashedId } = useIdentity();
  const submit = useServerFn(submitCollegeRequest);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "", city: "", state: "Madhya Pradesh", type: "Engineering", established: "", description: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit() {
    if (!hashedId) return;
    if (form.name.trim().length < 2 || form.city.trim().length < 2 || form.state.trim().length < 2) {
      toast.error("Please fill in name, city and state.");
      return;
    }
    setBusy(true);
    try {
      const res = await submit({
        data: {
          hashedId,
          name: form.name.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          type: form.type as any,
          established: form.established ? Number(form.established) : null,
          description: form.description.trim() || undefined,
        },
      });
      if ((res as any).ok === false && (res as any).reason === "exists") {
        toast.error("This college already exists — try searching for it.");
      } else {
        toast.success("Request sent! Admins will review and add it soon.");
        setOpen(false);
        setForm({ name: "", city: "", state: "Madhya Pradesh", type: "Engineering", established: "", description: "" });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="h-4 w-4" /> Request a College
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request to add a college</DialogTitle>
          <DialogDescription>Can't find your college? Send it for review and we'll add it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="College name *" value={form.name} onChange={(e) => set("name", e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="City *" value={form.city} onChange={(e) => set("city", e.target.value)} />
            <Select value={form.state} onValueChange={(v) => set("state", v)}>
              <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
              <SelectContent>
                {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select value={form.type} onValueChange={(v) => set("type", v)}>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                {COLLEGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Established (year)" value={form.established} onChange={(e) => set("established", e.target.value)} />
          </div>
          <Textarea placeholder="Anything else? (optional)" value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={onSubmit} disabled={busy}>{busy ? "Sending..." : "Send Request"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



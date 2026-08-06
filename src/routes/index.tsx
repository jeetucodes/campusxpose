import { useEffect, useRef, useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import {
  FileWarning,
  ArrowRight,
  Flame,
  TrendingUp,
  ArrowBigUp,
  EyeOff,
  MapPinOff,
  Megaphone,
  Ghost,
  Search,
  Gamepad2,
} from "lucide-react";
import { UserSymbol } from "@/components/UserSymbol";
import { SiteShell } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { getHomeData, type HomeData } from "@/lib/home.functions";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel, categoryEmoji } from "@/lib/categories";
import { timeAgo } from "@/lib/format";
import { HomeAds } from "@/components/HomeAds";
import { useVerifiedUsernames } from "@/hooks/useVerified";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { FeedbackForm } from "@/components/FeedbackForm";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ExpandableText } from "@/components/ExpandableText";

const homeQueryOptions = queryOptions({
  queryKey: ["home"],
  queryFn: () => getHomeData(),
  staleTime: 5 * 60 * 1000, // Data stays fresh for 5 minutes (live subscription handles real-time updates)
  refetchOnWindowFocus: false, // Don't refetch when switching tabs
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusXpose — College ka sach, bina darr ke" },
      {
        name: "description",
        content:
          "Anonymous platform for Indian students. Report fake fines, placement fraud, faculty issues — 100% anonymously.",
      },
      { property: "og:url", content: "https://campusxpose.online/" },
    ],
    links: [{ rel: "canonical", href: "https://campusxpose.online/" }],
  }),
  component: Home,
});

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";
const CYCLING_WORDS = ["truth", "voice", "power", "justice", "facts"];

function AnimatedStat({ n, l, color }: { n: number; l: string; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center border border-border bg-white p-2 rounded-xl shadow-sm">
      <div className={`font-display text-xl sm:text-2xl font-bold ${color}`}>{n}</div>
      <div className="text-[9px] sm:text-[10px] font-semibold text-foreground mt-0.5">{l}</div>
    </div>
  );
}

// Floating particle dot
function FloatingDot({
  x,
  y,
  size,
  delay,
  duration,
  color,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  color: string;
}) {
  return (
    <motion.div
      className={`absolute rounded-full pointer-events-none ${color}`}
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
      animate={{
        y: [0, -20, 0],
        x: [0, 8, -4, 0],
        scale: [1, 1.15, 1],
        opacity: [0.15, 0.35, 0.15],
      }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function Home() {
  const { data } = useQuery(homeQueryOptions);
  const verified = useVerifiedUsernames();
  const top: HomeData["top"] = data?.top ?? [];
  const recentPosts: HomeData["recentPosts"] = data?.recentPosts ?? [];
  const queryClient = useQueryClient();
  const [showAllReports, setShowAllReports] = useState(false);
  const [activeTopIdx, setActiveTopIdx] = useState(0);

  // Auto-scroll for Top Colleges (Ad-like Slider)
  useEffect(() => {
    if (top.length <= 1) return;
    const interval = setInterval(() => {
      setActiveTopIdx((prev) => (prev + 1) % top.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [top.length]);

  // Cycling headline word state
  const [wordIdx, setWordIdx] = useState(0);
  const [wordVisible, setWordVisible] = useState(true);

  // Cycle headline word every 2.2s with a blur-fade transition
  useEffect(() => {
    const interval = setInterval(() => {
      setWordVisible(false);
      setTimeout(() => {
        setWordIdx((i) => (i + 1) % CYCLING_WORDS.length);
        setWordVisible(true);
      }, 300);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // Stable floating dots config
  const dots = useMemo(
    () => [
      { x: 10, y: 20, size: 18, delay: 0, duration: 5, color: "bg-accent" },
      { x: 80, y: 10, size: 12, delay: 0.8, duration: 4, color: "bg-yellow-400" },
      { x: 60, y: 75, size: 22, delay: 1.5, duration: 6, color: "bg-accent" },
      { x: 25, y: 65, size: 10, delay: 0.3, duration: 4.5, color: "bg-yellow-400" },
      { x: 90, y: 55, size: 16, delay: 2, duration: 5.5, color: "bg-accent" },
      { x: 45, y: 15, size: 8, delay: 1.2, duration: 3.8, color: "bg-yellow-400" },
    ],
    [],
  );

  // Live data subscription
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
    return () => {
      supabase.removeChannel(ch);
    };
  }, [queryClient]);

  return (
    <SiteShell>
      {/* ── Hero Section ── */}
      <div className="px-4 pt-6 pb-2 space-y-4 mx-auto max-w-4xl">
        {/* Hero Card — floating particles */}
        <motion.section
          style={{ borderRadius: WOBBLY_MD }}
          className="relative w-full overflow-hidden border-2 border-border bg-white sm:min-h-[380px] min-h-[300px] cursor-default"
        >
          {/* Animated glow blobs */}
          <motion.div
            className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-accent/20 blur-3xl pointer-events-none"
            animate={{ scale: [1, 1.22, 1], opacity: [0.25, 0.5, 0.25] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -bottom-12 -left-12 w-52 h-52 rounded-full bg-yellow-300/20 blur-2xl pointer-events-none"
            animate={{ scale: [1, 1.3, 1], opacity: [0.18, 0.38, 0.18] }}
            transition={{ duration: 7, delay: 1, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Floating accent dots */}
          {dots.map((d, i) => (
            <FloatingDot key={i} {...d} />
          ))}

          {/* Background campus illustration */}
          <img
            src="/heroimg.png"
            alt="CampusXpose campus illustration"
            className="absolute inset-0 h-full w-full object-cover object-[80%_bottom] sm:object-[right_bottom]"
          />

          {/* Text-readable gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-white via-white/85 to-transparent sm:via-white/55" />

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-start px-6 pt-20 pb-6 sm:px-12 sm:py-12">
            <div className="w-[85%] max-w-[300px] sm:max-w-[55%] space-y-3">
              {/* Live anonymous badge */}

              {/* Headline with cycling & blurring word */}
              <motion.h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl text-foreground">
                Speak your{" "}
                <span className="relative inline-block">
                  <motion.span
                    key={wordIdx}
                    initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                    animate={
                      wordVisible
                        ? { opacity: 1, y: 0, filter: "blur(0px)" }
                        : { opacity: 0, y: -8, filter: "blur(6px)" }
                    }
                    transition={{ duration: 0.28, ease: "easeInOut" }}
                    className="inline-block text-accent"
                  >
                    {CYCLING_WORDS[wordIdx]}
                  </motion.span>
                  {/* Underline that animates in/out with the word */}
                  <motion.span
                    className="absolute -bottom-1 left-0 h-[3px] bg-accent rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: wordVisible ? 1 : 0 }}
                    transition={{ duration: 0.28, ease: "easeInOut" }}
                    style={{ width: "100%", transformOrigin: "left" }}
                  />
                </span>
                —<br />
                without fear.
              </motion.h1>

              <motion.p className="hidden sm:block text-xs leading-relaxed text-muted-foreground sm:text-sm font-medium">
                Share the real story of your college.
                <br className="hidden sm:block" />
                Fake fines, placement fraud, faculty abuse — report it all, 100% anonymously.
              </motion.p>
            </div>
          </div>
        </motion.section>

        {/* CTA Wide Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-6">
          <Link to="/colleges" className="block group">
            <div className="sketch-card flex items-center gap-4 bg-accent p-3 sm:p-4 transition-all" style={{ borderRadius: WOBBLY_MD }}>
              <div className="w-12 h-12 rounded-full bg-white border-2 border-border flex items-center justify-center shrink-0 shadow-sm group-hover:rotate-12 transition-transform">
                <Search className="h-6 w-6 text-accent" />
              </div>
              <div className="text-left">
                <div className="font-display font-bold text-lg sm:text-xl text-white leading-tight group-hover:underline decoration-white decoration-2 underline-offset-2">Find College</div>
                <div className="text-white/90 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mt-0.5">Search & Reviews</div>
              </div>
            </div>
          </Link>

          <Link to="/report" className="block group">
            <div className="sketch-card flex items-center gap-4 bg-yellow-400 p-3 sm:p-4 transition-all" style={{ borderRadius: WOBBLY_MD }}>
              <div className="w-12 h-12 rounded-full bg-white border-2 border-border flex items-center justify-center shrink-0 shadow-sm group-hover:-rotate-12 transition-transform">
                <Flame className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="text-left">
                <div className="font-display font-bold text-lg sm:text-xl text-foreground leading-tight group-hover:underline decoration-foreground decoration-2 underline-offset-2">Report Issue</div>
                <div className="text-foreground/70 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mt-0.5">100% Anonymous</div>
              </div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
           <Link to="/confessions" className={`block group ${!(data?.site_settings?.news_enabled !== false && data?.news && data.news.length > 0) ? "sm:col-span-2" : ""}`}>
            <div className="sketch-card flex items-center gap-4 bg-[#fff9c4] p-3 sm:p-4 transition-all" style={{ borderRadius: WOBBLY_MD }}>
              <div className="w-12 h-12 rounded-full bg-purple-100 border-2 border-border flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                <Ghost className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-left">
                <div className="font-display font-bold text-lg sm:text-xl text-foreground leading-tight group-hover:underline decoration-foreground decoration-2 underline-offset-2">Confessions</div>
                <div className="text-foreground/70 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mt-0.5">Secrets & Gossip</div>
              </div>
            </div>
          </Link>
          
          {data?.site_settings?.news_enabled !== false && data?.news && data.news.length > 0 && (
             <Link to="/news" className="block group">
              <div className="sketch-card flex items-center gap-4 bg-blue-100 p-3 sm:p-4 transition-all relative" style={{ borderRadius: WOBBLY_MD }}>
                <span className="absolute -top-2 -right-2 bg-destructive text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-border shadow-sm animate-pulse">NEW</span>
                <div className="w-12 h-12 rounded-full bg-white border-2 border-border flex items-center justify-center shrink-0 shadow-sm group-hover:rotate-12 transition-transform">
                  <Megaphone className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="font-display font-bold text-lg sm:text-xl text-foreground leading-tight group-hover:underline decoration-foreground decoration-2 underline-offset-2">Latest News</div>
                  <div className="text-foreground/70 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mt-0.5">Updates & Alerts</div>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* Game Arcade Wide Banner */}
        <Link to="/games" className="block group mt-3 sm:mt-4">
          <div className="sketch-card flex items-center justify-between gap-4 bg-green-300 p-3 sm:p-5 transition-all relative overflow-hidden" style={{ borderRadius: WOBBLY_MD }}>
            {/* Background dots/pattern */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#000 2px, transparent 2px)", backgroundSize: "16px 16px" }}></div>
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border-2 border-border flex items-center justify-center shrink-0 shadow-sm group-hover:-rotate-12 group-hover:scale-110 transition-transform">
                <Gamepad2 className="h-6 w-6 sm:h-7 sm:w-7 text-green-600" />
              </div>
              <div className="text-left">
                <div className="font-display font-bold text-xl sm:text-2xl text-foreground leading-tight group-hover:underline decoration-foreground decoration-2 underline-offset-2 flex items-center gap-2">
                  Game Arcade <span className="bg-destructive text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-border animate-bounce shadow-sm">PLAY</span>
                </div>
                <div className="text-foreground/80 text-[11px] sm:text-xs font-semibold uppercase tracking-wider mt-0.5">Stress buster mini-games</div>
              </div>
            </div>
            <ArrowRight className="h-6 w-6 text-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all relative z-10 hidden sm:block" />
          </div>
        </Link>
      </div>

      <HomeAds />

      {/* Top Reported Colleges (Big Card Style & Scroll Effect) */}
      <motion.section
        initial={{ opacity: 0, y: 50, rotate: -1, scale: 0.95 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
        className="mx-auto max-w-4xl px-4 py-8 sm:py-12 z-20 relative"
      >
        <div className="sketch-card bg-[#fff9c4] p-4 sm:p-8 border-4 border-border shadow-ink-lg relative overflow-hidden group" style={{ borderRadius: WOBBLY_MD }}>
          {/* Decorative tape/pin */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6 bg-red-400/80 border-2 border-border rotate-2 z-10 shadow-sm" />

          {/* Background decoration */}
          <div className="absolute -right-12 -bottom-12 w-40 h-40 bg-yellow-300 rounded-full blur-3xl opacity-40 group-hover:opacity-70 transition-opacity duration-700 pointer-events-none" />
          <div className="absolute -left-12 -top-12 w-32 h-32 bg-accent rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none" />

          {/* Section Header */}
          <div className="mb-6 flex items-center justify-between gap-3 border-b-4 border-border/20 pb-4 relative z-10">
            <h2 className="font-display text-3xl sm:text-4xl font-bold flex items-center gap-2 text-foreground">
              <span className="text-4xl">🔥</span> Top Reported
            </h2>
            <span
              className="inline-flex items-center gap-1.5 border-2 border-border bg-yellow-300 px-3 py-1.5 text-xs font-bold text-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
              </span>
              LIVE
            </span>
          </div>

          {/* The Slider */}
          <div className="relative overflow-hidden w-full h-[220px] sm:h-[180px] bg-white border-2 border-border flex flex-col justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] z-10" style={{ borderRadius: WOBBLY_MD }}>
            <AnimatePresence mode="wait">
              {top.length > 0 ? (
                <motion.div
                  key={activeTopIdx}
                  initial={{ opacity: 0, x: 20, rotate: 1 }}
                  animate={{ opacity: 1, x: 0, rotate: 0 }}
                  exit={{ opacity: 0, x: -20, rotate: -1 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 p-5 sm:p-6 flex flex-col"
                >
                   <Link
                     to="/colleges/$id"
                     params={{ id: top[activeTopIdx].id }}
                     className="flex-1 flex flex-col justify-between w-full h-full"
                   >
                     <div className="flex items-start gap-4">
                       <span className={`flex items-center justify-center shrink-0 h-14 w-14 font-display text-3xl font-bold border-2 border-border rounded-full shadow-sm ${activeTopIdx === 0 ? "bg-yellow-400 text-foreground" : activeTopIdx === 1 ? "bg-gray-200 text-foreground" : activeTopIdx === 2 ? "bg-orange-300 text-foreground" : "bg-muted text-muted-foreground"}`}>
                         #{activeTopIdx + 1}
                       </span>
                       <div className="pt-1 w-full max-w-[80%]">
                         <div className="font-display text-2xl sm:text-3xl font-bold text-foreground group-hover:text-accent transition-colors line-clamp-2 leading-tight">{top[activeTopIdx].name}</div>
                         <div className="text-sm font-semibold text-muted-foreground flex items-center gap-1 mt-1"><MapPinOff className="w-4 h-4" /> {top[activeTopIdx].city}</div>
                       </div>
                     </div>
                     <div className="flex items-center gap-2 mt-auto border-t-2 border-dashed border-border/20 pt-4 pb-1">
                       <span className="inline-flex items-center gap-1.5 border-2 border-border bg-accent px-3 py-1.5 text-sm font-bold text-white shadow-sm" style={{ borderRadius: WOBBLY_MD }}>
                         <Flame className="h-4 w-4 fill-yellow-400" /> {top[activeTopIdx].incident_count} Reports
                       </span>
                       <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest ml-2 hidden sm:inline-block">Trending</span>
                     </div>
                   </Link>
                </motion.div>
              ) : (
                <div className="text-center w-full text-muted-foreground font-medium flex items-center justify-center h-full">
                  No reports yet. Be the first to speak up!
                </div>
              )}
            </AnimatePresence>
            {/* Progress dots */}
            {top.length > 1 && (
              <div className="absolute bottom-4 right-5 sm:bottom-6 sm:right-6 flex gap-1.5 z-10 bg-white/80 p-1.5 rounded-full border-2 border-border shadow-sm">
                {top.map((_, i) => (
                  <button
                    key={i} 
                    onClick={() => setActiveTopIdx(i)}
                    className={`w-2.5 h-2.5 rounded-full border-2 border-border transition-colors ${i === activeTopIdx ? "bg-accent" : "bg-white hover:bg-muted"}`} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.section>

      {/* Latest Reports */}
      <section className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <div className="mb-8 flex items-center justify-between gap-3 border-b-4 border-border pb-4">
          <h2 className="font-display text-3xl sm:text-4xl font-bold flex items-center gap-2">
            <span className="text-4xl">📰</span> Latest Reports
          </h2>
          <span
            className="inline-flex items-center gap-1.5 border-2 border-border bg-yellow-300 px-3 py-1.5 text-xs font-bold text-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            style={{ borderRadius: WOBBLY_MD }}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
            </span>
            LIVE
          </span>
        </div>
        <div className="columns-1 sm:columns-2 gap-6 space-y-6">
          {recentPosts.slice(0, 4).map((p, i) => {
            const isPinned = i === 0;
            const card = (
              <div
                className={`sketch-card relative p-4 sm:p-5 group transition-all hover:-translate-y-1 hover:shadow-ink-lg ${i % 2 ? "-rotate-1" : "rotate-1"} ${isPinned ? "bg-red-50" : "bg-white"}`}
                style={{ borderRadius: WOBBLY_MD, breakInside: "avoid" }}
              >
                {isPinned && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-accent rounded-full border-2 border-border shadow-sm z-10 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full opacity-60" />
                  </div>
                )}
                <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground flex-wrap">
                  <UserSymbol username={p.username} size="sm" />
                  <span className="inline-flex items-center gap-1 font-bold text-foreground text-xs sm:text-sm">
                    {p.username ?? "Anonymous"}
                    {p.username && verified.has(p.username) && <VerifiedBadge />}
                  </span>
                  {p.created_at && <span className="font-medium text-[10px] sm:text-[11px] bg-muted px-2 py-0.5 rounded-full" suppressHydrationWarning>{timeAgo(p.created_at)}</span>}
                  <span className="ml-auto inline-flex items-center gap-1 sm:gap-1.5 border-2 border-border bg-green-100 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-bold text-green-700 rounded-md">
                    <ArrowBigUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {p.upvotes ?? 0}
                  </span>
                </div>
                <div className="mt-2.5 sm:mt-3 flex items-center gap-2">
                  <span className="border-2 border-border bg-yellow-100 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-bold text-yellow-800 rounded-md shadow-sm">
                    {categoryEmoji(p.category ?? "general")} {categoryLabel(p.category ?? "general")}
                  </span>
                </div>
                {p.college_name && (
                  <div className="mt-3 flex items-start gap-1.5 text-sm font-bold text-accent bg-accent/5 p-2 rounded-lg border border-accent/20">
                    <span className="mt-0.5">🏫</span> <span className="line-clamp-1">{p.college_name}</span>
                  </div>
                )}
                <ExpandableText text={p.content || ""} />
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
          {recentPosts.length === 0 && (
            <p className="text-center text-muted-foreground font-medium p-8 border-2 border-dashed border-border rounded-xl col-span-full">No reports yet. Check back soon!</p>
          )}
        </div>
        {recentPosts.length > 3 && (
          <div className="mt-8 text-center">
            <Link to="/reports">
              <Button variant="outline" size="lg" className="border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] transition-all font-bold">
                Read all reports <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <div className="mb-10 text-center relative">
          <div className="absolute inset-0 -top-4 w-24 h-24 mx-auto bg-yellow-300 rounded-full blur-2xl opacity-40 pointer-events-none" />
          <h2 className="font-display text-4xl sm:text-5xl font-bold relative z-10 flex items-center justify-center gap-3">
            <span className="text-4xl">🤔</span> Common Sawaal
          </h2>
          <p className="mt-3 text-lg font-medium text-muted-foreground relative z-10 max-w-lg mx-auto">
            Tumhare dimaag mein chal rahe kuch sawaalon ke jawaab
          </p>
        </div>
        <div className="sketch-card p-4 sm:p-6 bg-[#fff9c4] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative" style={{ borderRadius: WOBBLY_MD }}>
          {/* Post-it pin */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-red-400 rounded-full border-2 border-border shadow-sm z-10" />
          <Accordion type="single" collapsible className="w-full space-y-3 pt-2">
            <AccordionItem value="item-1" className="border-2 border-border bg-white px-4 rounded-xl shadow-sm">
              <AccordionTrigger className="font-bold text-lg text-left hover:no-underline hover:text-accent py-4">
                Kya mera sach mein koi naam nahi aayega?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground font-medium text-base pb-4">
                Haan, bilkul! Hum na email maangte hain, na phone number, aur na hi koi location/IP
                data store karte hain. Tum ekdum safe aur anonymous ho.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border-2 border-border bg-white px-4 rounded-xl shadow-sm">
              <AccordionTrigger className="font-bold text-lg text-left hover:no-underline hover:text-accent py-4">
                College administration ko kaise pata chalega?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground font-medium text-base pb-4">
                Jab tumhari post pe kaafi upvotes aur engagement aati hai, toh usey automatically
                attention milti hai. Yeh platform ek collective voice banata hai jise ignore karna
                mushkil ho jata hai.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="border-2 border-border bg-white px-4 rounded-xl shadow-sm">
              <AccordionTrigger className="font-bold text-lg text-left hover:no-underline hover:text-accent py-4">
                Kya main proof/documents upload kar sakta hoon?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground font-medium text-base pb-4">
                Haan! Hum strongly encourage karte hain ki tum reports ke saath photos ya documents
                upload karo taaki tumhari baat sach sabit ho sake.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4" className="border-2 border-border bg-white px-4 rounded-xl shadow-sm">
              <AccordionTrigger className="font-bold text-lg text-left hover:no-underline hover:text-accent py-4">
                Fake reports ko kaise rokoge?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground font-medium text-base pb-4">
                Hamari community hi moderation karti hai. Agar koi fake ya galat cheez post hoti
                hai, toh users use downvote ya report kar sakte hain. Spam accounts jaldi block kar
                diye jaate hain.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* Feedback */}
      <HomeAds />
      <section id="feedback" className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-6 text-center">
          <h2 className="font-display text-3xl font-bold">💬 Feedback</h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            App kaisa laga? Kya add karein, kya behtar ho sakta hai — apni honest baat batao.
          </p>
        </div>
        <FeedbackForm />
      </section>
    </SiteShell>
  );
}

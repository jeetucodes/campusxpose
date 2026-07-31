import { useEffect, useRef, useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { FileWarning, ArrowRight, Flame, TrendingUp, ArrowBigUp, EyeOff, MapPinOff, Megaphone, Ghost } from "lucide-react";
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

const homeQueryOptions = queryOptions({
  queryKey: ["home"],
  queryFn: () => getHomeData(),
  staleTime: 15000,
  refetchInterval: 15000,
  refetchOnWindowFocus: true,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampusXpose — College ka sach, bina darr ke" },
      { name: "description", content: "Anonymous platform for Indian students. Report fake fines, placement fraud, faculty issues — 100% anonymously." },
      { property: "og:url", content: "https://campusxpose.online/" },
    ],
    links: [{ rel: "canonical", href: "https://campusxpose.online/" }],
  }),
  component: Home,
});

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";
const CYCLING_WORDS = ["truth", "voice", "courage", "justice", "truth"];

// Count-up animation hook
function useCountUp(target: number, duration = 1.5) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const controls = animate(0, target, {
      duration,
      ease: "easeOut",
      onUpdate(v) { setVal(Math.floor(v)); },
    });
    return () => controls.stop();
  }, [target, duration]);
  return val;
}

function AnimatedStat({ n, l, color }: { n: number; l: string; color: string }) {
  const count = useCountUp(n);
  return (
    <div className="flex flex-col items-center justify-center border border-border bg-white p-2 rounded-xl shadow-sm">
      <div className={`font-display text-xl sm:text-2xl font-bold ${color}`}>{count}</div>
      <div className="text-[9px] sm:text-[10px] font-semibold text-foreground mt-0.5">{l}</div>
    </div>
  );
}

// Floating particle dot
function FloatingDot({ x, y, size, delay, duration, color }: {
  x: number; y: number; size: number; delay: number; duration: number; color: string;
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

  // Cycling headline word state
  const [wordIdx, setWordIdx] = useState(0);
  const [wordVisible, setWordVisible] = useState(true);

  // 3D tilt motion values for hero card
  const heroRef = useRef<HTMLElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-150, 150], [4, -4]);
  const rotateY = useTransform(mouseX, [-150, 150], [-4, 4]);

  // Cycle headline word every 2.2s with a blur-fade transition
  useEffect(() => {
    const interval = setInterval(() => {
      setWordVisible(false);
      setTimeout(() => {
        setWordIdx(i => (i + 1) % CYCLING_WORDS.length);
        setWordVisible(true);
      }, 300);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  // Mouse tilt handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };
  const handleMouseLeave = () => { mouseX.set(0); mouseY.set(0); };

  // Stable floating dots config
  const dots = useMemo(() => [
    { x: 10, y: 20, size: 18, delay: 0,   duration: 5,   color: "bg-accent" },
    { x: 80, y: 10, size: 12, delay: 0.8, duration: 4,   color: "bg-yellow-400" },
    { x: 60, y: 75, size: 22, delay: 1.5, duration: 6,   color: "bg-accent" },
    { x: 25, y: 65, size: 10, delay: 0.3, duration: 4.5, color: "bg-yellow-400" },
    { x: 90, y: 55, size: 16, delay: 2,   duration: 5.5, color: "bg-accent" },
    { x: 45, y: 15, size: 8,  delay: 1.2, duration: 3.8, color: "bg-yellow-400" },
  ], []);

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
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  return (
    <SiteShell>
      {/* ── Hero Section ── */}
      <div className="px-4 pt-6 pb-2 space-y-4 mx-auto max-w-4xl">

        {/* Hero Card — 3D tilt on hover + floating particles */}
        <motion.section
          ref={heroRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ rotateX, rotateY, transformPerspective: 900, borderRadius: WOBBLY_MD }}
          className="relative w-full overflow-hidden border-2 border-border bg-white sm:min-h-[380px] min-h-[300px] cursor-default"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
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
          {dots.map((d, i) => <FloatingDot key={i} {...d} />)}

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
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl text-foreground"
              >
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

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="hidden sm:block text-xs leading-relaxed text-muted-foreground sm:text-sm font-medium"
              >
                Share the real story of your college.<br className="hidden sm:block" />
                Fake fines, placement fraud, faculty abuse — report it all, 100% anonymously.
              </motion.p>
            </div>
          </div>
        </motion.section>

        {/* CTA Buttons */}
        <div className="flex gap-2 sm:gap-3">
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <Button
              asChild
              className="w-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-border bg-accent text-white hover:bg-accent/90 h-10 text-[11px] sm:h-12 sm:text-base px-2 sm:px-4"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <Link to="/colleges">
                Find Your College <ArrowRight className="ml-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Link>
            </Button>
          </motion.div>

          <motion.div
            className="flex-1"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <Button
              asChild
              variant="outline"
              className="w-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-border bg-white text-foreground hover:bg-muted h-10 text-[11px] sm:h-12 sm:text-base px-2 sm:px-4"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <Link to="/report">Report an Issue</Link>
            </Button>
          </motion.div>
        </div>

        {/* News / Updates Button */}
        {data?.site_settings?.news_enabled !== false && data?.news && data.news.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            whileHover={{ scale: 1.01 }}
          >
            <Button
              asChild
              variant="outline"
              className="w-full mt-4 h-12 border-2 border-border bg-white hover:bg-muted shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-primary font-bold flex items-center justify-center gap-2"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <Link to="/news">
                <Megaphone className="w-5 h-5 animate-pulse" />
                Latest News & Updates
                <div className="bg-destructive text-white text-[10px] px-2 py-0.5 rounded-full ml-2">New</div>
              </Link>
            </Button>
          </motion.div>
        )}

        {/* Stats Row — count-up on mount + wobble on hover */}
        <div className="grid grid-cols-4 gap-2 pt-2 pb-4">
          {[
            { n: data?.collegeCount ?? 0, l: "Colleges",   color: "text-accent" },
            { n: data?.postCount    ?? 0, l: "Reports",    color: "text-yellow-500" },
            { n: data?.incidentCount?? 0, l: "Incidents",  color: "text-accent" },
            { n: data?.userCount    ?? 0, l: "Anon Users", color: "text-yellow-500" },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.8 }}
              whileHover={{ scale: 1.06, rotate: i % 2 === 0 ? 1.5 : -1.5 }}
            >
              <AnimatedStat {...s} />
            </motion.div>
          ))}
        </div>

        {/* Confessions Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          whileHover={{ scale: 1.01 }}
        >
          <Link to="/confessions" className="block">
            <div
              className="mt-2 flex items-center gap-3 border-2 border-border bg-white p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-muted/50 transition-colors"
              style={{ borderRadius: WOBBLY_MD }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-border bg-purple-100 text-primary shadow-sm">
                <Ghost className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-display font-bold text-sm">Anonymous Confessions</div>
                <div className="text-[11px] text-muted-foreground font-medium line-clamp-1">Share your secrets, read others' gossip. 100% untraceable.</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </Link>
        </motion.div>

      </div>

      <HomeAds />

      {/* Top Reported Colleges */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="font-display text-3xl font-bold">🔥 Top Reported Colleges</h2>
          <span className="inline-flex items-center gap-1.5 border-2 border-border bg-white px-2.5 py-1 text-xs font-bold text-success" style={{ borderRadius: WOBBLY_MD }}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            LIVE
          </span>
        </div>
        <div className="space-y-4">
          {top.map((c, i) => (
            <Link
              key={c.id}
              to="/colleges/$id"
              params={{ id: c.id }}
              className={`sketch-card flex items-center justify-between p-4 ${i % 2 ? "rotate-1" : "-rotate-1"}`}
              style={{ borderRadius: WOBBLY_MD }}
            >
              <div className="flex items-center gap-3">
                <span className="font-display text-2xl font-bold text-muted-foreground">#{i + 1}</span>
                <div>
                  <div className="font-display text-lg font-bold">{c.name}</div>
                  <div className="text-sm text-muted-foreground">{c.city}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 border-2 border-border bg-accent/15 px-2.5 py-1 text-sm font-bold text-accent">
                  <Flame className="h-3.5 w-3.5" /> {c.incident_count}
                </span>
                <TrendingUp className="h-4 w-4 text-accent" strokeWidth={2.5} />
              </div>
            </Link>
          ))}
          {top.length === 0 && (
            <p className="text-center text-muted-foreground">No reports yet. Be the first to speak up!</p>
          )}
        </div>
      </section>

      {/* Latest Reports */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="font-display text-3xl font-bold">📰 Latest Reports</h2>
          <span className="inline-flex items-center gap-1.5 border-2 border-border bg-white px-2.5 py-1 text-xs font-bold text-success" style={{ borderRadius: WOBBLY_MD }}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            LIVE
          </span>
        </div>
        <div className="space-y-4">
          {(showAllReports ? recentPosts : recentPosts.slice(0, 3)).map((p, i) => {
            const card = (
              <div
                className={`sketch-card p-4 ${i % 2 ? "rotate-1" : "-rotate-1"}`}
                style={{ borderRadius: WOBBLY_MD }}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <UserSymbol username={p.username} size="sm" />
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    {p.username ?? "Anonymous"}
                    {p.username && verified.has(p.username) && <VerifiedBadge />}
                  </span>
                  {p.created_at && <span suppressHydrationWarning>· {timeAgo(p.created_at)}</span>}
                  <span className="ml-auto inline-flex items-center gap-1 border-2 border-border bg-white px-2 py-0.5 text-[11px] font-bold text-accent">
                    <ArrowBigUp className="h-3.5 w-3.5" /> {p.upvotes ?? 0}
                  </span>
                  <span className="border border-border bg-white px-2 py-0.5 text-[11px]">
                    {categoryEmoji(p.category ?? "general")} {categoryLabel(p.category ?? "general")}
                  </span>
                </div>
                {p.college_name && (
                  <div className="mt-1 text-xs font-semibold text-accent">🏫 {p.college_name}</div>
                )}
                <p className="mt-2 line-clamp-3 text-sm">{p.content}</p>
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
            <p className="text-center text-muted-foreground">No reports yet. Check back soon!</p>
          )}
        </div>
        {recentPosts.length > 3 && (
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={() => setShowAllReports(v => !v)}>
              {showAllReports ? "Show less" : "Read more"}
            </Button>
          </div>
        )}
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-6 text-center">
          <h2 className="font-display text-3xl font-bold">🤔 Common Sawaal</h2>
          <p className="mt-2 text-muted-foreground">Tumhare dimaag mein chal rahe kuch sawaalon ke jawaab</p>
        </div>
        <div className="sketch-card p-2 sm:p-4 bg-white" style={{ borderRadius: WOBBLY_MD }}>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1" className="border-b-2 border-border">
              <AccordionTrigger className="font-bold text-left hover:no-underline hover:text-accent">
                Kya mera sach mein koi naam nahi aayega?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground font-medium">
                Haan, bilkul! Hum na email maangte hain, na phone number, aur na hi koi location/IP data store karte hain. Tum ekdum safe aur anonymous ho.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2" className="border-b-2 border-border">
              <AccordionTrigger className="font-bold text-left hover:no-underline hover:text-accent">
                College administration ko kaise pata chalega?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground font-medium">
                Jab tumhari post pe kaafi upvotes aur engagement aati hai, toh usey automatically attention milti hai. Yeh platform ek collective voice banata hai jise ignore karna mushkil ho jata hai.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3" className="border-b-2 border-border">
              <AccordionTrigger className="font-bold text-left hover:no-underline hover:text-accent">
                Kya main proof/documents upload kar sakta hoon?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground font-medium">
                Haan! Hum strongly encourage karte hain ki tum reports ke saath photos ya documents upload karo taaki tumhari baat sach sabit ho sake.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4" className="border-b-0">
              <AccordionTrigger className="font-bold text-left hover:no-underline hover:text-accent">
                Fake reports ko kaise rokoge?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground font-medium">
                Hamari community hi moderation karti hai. Agar koi fake ya galat cheez post hoti hai, toh users use downvote ya report kar sakte hain. Spam accounts jaldi block kar diye jaate hain.
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

import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Ghost, Shield, FileWarning, ArrowRight, Flame, TrendingUp, ArrowBigUp, EyeOff, MapPinOff, Megaphone } from "lucide-react";
import { UserSymbol } from "@/components/UserSymbol";
import { SiteShell } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { getHomeData, type HomeData } from "@/lib/home.functions";
import { supabase } from "@/integrations/supabase/client";
import { categoryLabel, categoryEmoji } from "@/lib/categories";
import { timeAgo } from "@/lib/format";
import { HomeAds } from "@/components/HomeAds";
import { TrustSection } from "@/components/TrustSection";
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

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
};

const WOBBLY = "255px 15px 225px 15px / 15px 225px 15px 255px";
const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";

function Home() {
  const { data } = useQuery(homeQueryOptions);
  const verified = useVerifiedUsernames();
  const top: HomeData["top"] = data?.top ?? [];
  const recentPosts: HomeData["recentPosts"] = data?.recentPosts ?? [];
  const queryClient = useQueryClient();
  const [showAllReports, setShowAllReports] = useState(false);

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

  const features = [
    { icon: EyeOff, title: "No Email, No Phone", desc: "Login me kuch nahi maangte. App khulte hi anonymous identity ban jaati hai.", bg: "bg-white" },
    { icon: MapPinOff, title: "No Location, No IP", desc: "Tumhari location, IP ya device ki koi permission nahi li jaati — na store hoti hai.", bg: "bg-postit" },
    { icon: FileWarning, title: "Built-in Blur Tool", desc: "Proof upload karne se pehle naam/face blur kar do — bina kisi extra app ke.", bg: "bg-white" },
  ];


  return (
    <SiteShell>
      {/* Hero Section */}
      <div className="px-4 pt-6 pb-2 space-y-4 mx-auto max-w-4xl">

        {/* Hero Card */}
        <section
          className="relative w-full overflow-hidden border-2 border-border bg-white sm:min-h-[380px] min-h-[300px]"
          style={{ borderRadius: WOBBLY_MD }}
        >
          {/* Background image — college sketch on bottom right */}
          <img
            src="/heroimg.png"
            alt="CampusXpose campus illustration"
            className="absolute inset-0 h-full w-full object-cover object-[80%_bottom] sm:object-[right_bottom]"
          />

          {/* Strong gradient so text is easily readable on top-left */}
          <div className="absolute inset-0 bg-gradient-to-br from-white via-white/80 to-transparent sm:via-white/50" />

          {/* Text overlay — top-left */}
          <div className="relative z-10 flex flex-col justify-start px-6 pt-20 pb-6 sm:px-12 sm:py-12">
            <motion.div {...fadeUp} className="w-[85%] max-w-[280px] sm:max-w-[50%] space-y-3">
              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl text-foreground">
                College ka sach,
                <br />
                bina darr ke.
              </h1>
              <p className="hidden sm:block text-xs leading-relaxed text-muted-foreground sm:text-sm font-medium">
                Apne college ki asli kahani share karo.<br className="hidden sm:block" />
                Fake fines, placement fraud, faculty issues — sab kuch anonymously report karo.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Buttons Row */}
        <div className="flex gap-2 sm:gap-3">
          <Button asChild className="flex-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-border bg-accent text-white hover:bg-accent/90 h-10 text-[11px] sm:h-12 sm:text-base px-2 sm:px-4" style={{ borderRadius: WOBBLY_MD }}>
            <Link to="/colleges">
              Apna College Dhundo <ArrowRight className="ml-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] border-2 border-border bg-white text-foreground hover:bg-muted h-10 text-[11px] sm:h-12 sm:text-base px-2 sm:px-4" style={{ borderRadius: WOBBLY_MD }}>
            <Link to="/report">Issue Report Karo</Link>
          </Button>
        </div>

        {/* News Page Link Button */}
        {data?.site_settings?.news_enabled !== false && data?.news && data.news.length > 0 && (
          <Button 
            asChild
            variant="outline" 
            className="w-full mt-4 h-12 border-2 border-border bg-white hover:bg-muted shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-primary font-bold flex items-center justify-center gap-2"
            style={{ borderRadius: WOBBLY_MD }}
          >
            <Link to="/news">
              <Megaphone className="w-5 h-5 animate-pulse" /> 
              CampusXpose Updates / News
              <div className="bg-destructive text-white text-[10px] px-2 py-0.5 rounded-full ml-2">New</div>
            </Link>
          </Button>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 pt-2 pb-4">
          {[
            { n: data?.collegeCount ?? 0, l: "Colleges", color: "text-accent" },
            { n: data?.postCount ?? 0, l: "Reports", color: "text-yellow-500" },
            { n: data?.incidentCount ?? 0, l: "Incidents", color: "text-accent" },
            { n: data?.userCount ?? 0, l: "Anon Users", color: "text-yellow-500" },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="flex flex-col items-center justify-center border border-border bg-white p-2 rounded-xl shadow-sm"
            >
              <div className={`font-display text-xl sm:text-2xl font-bold ${s.color}`}>{s.n}</div>
              <div className="text-[9px] sm:text-[10px] font-semibold text-foreground mt-0.5">{s.l}</div>
            </motion.div>
          ))}
        </div>

      </div>

      <HomeAds />

      {/* Top reported */}
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
            <p className="text-center text-muted-foreground">Abhi tak koi report nahi. Pehle aap karo!</p>
          )}
        </div>
      </section>


      {/* Top voted reports */}
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
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">{p.username ?? "Anonymous"}{p.username && verified.has(p.username) && <VerifiedBadge />}</span>
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
            <p className="text-center text-muted-foreground">Abhi koi report nahi aayi.</p>
          )}
        </div>
        {recentPosts.length > 3 && (
          <div className="mt-6 text-center">
            <Button variant="outline" onClick={() => setShowAllReports((v) => !v)}>
              {showAllReports ? "Show less" : "Read more"}
            </Button>
          </div>
        )}
      </section>

      {/* FAQ / Common Sawaal */}
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

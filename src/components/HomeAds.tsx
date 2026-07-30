import { useEffect, useRef, useState } from "react";
import { ExternalLink, ChevronLeft, ChevronRight, Megaphone, ArrowRight } from "lucide-react";
import { useAds, type Ad } from "@/hooks/useAds";
import { cn } from "@/lib/utils";

// ─── Ad card — two-column layout on desktop ───────────────────────────────────

function HomeAdCard({ ad, active }: { ad: Ad; active: boolean }) {
  const isVideo = ad.kind === "video" && ad.embed_url;
  const hasImage = !isVideo && !!ad.media_url;
  const hasMedia = isVideo || hasImage;

  return (
    <div
      className={cn(
        "relative overflow-hidden border-2 border-ink bg-white transition-all duration-500",
        "shadow-[4px_4px_0px_0px_var(--ink)]",
        active ? "opacity-100 scale-100" : "opacity-0 scale-[0.98] absolute inset-0 pointer-events-none",
      )}
      style={{ borderRadius: "20px 7px 22px 7px / 7px 22px 7px 20px" }}
    >
      {/* Tape strip decoration */}
      <div className="absolute -top-1.5 left-8 z-10 h-5 w-16 -rotate-1 rounded-sm bg-yellow-200 border border-yellow-300/80 pointer-events-none" />

      {/* VIDEO — full width stacked layout */}
      {isVideo ? (
        <div>
          <div className="relative w-full bg-black" style={{ paddingBottom: "52%" }}>
            <iframe
              src={ad.embed_url!}
              title={ad.title}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
            <span className="absolute top-3 right-3 z-10 rounded-full border border-white/30 bg-black/60 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
              Ad
            </span>
          </div>
          <AdTextRow ad={ad} />
        </div>
      ) : hasImage ? (
        /* IMAGE — two-column on md+, stacked on mobile */
        <div className="flex flex-col md:flex-row md:min-h-[200px]">
          {/* Image column — fills left half */}
          <div className="relative md:w-1/2 shrink-0 overflow-hidden bg-surface-2">
            <img
              src={ad.media_url!}
              alt={ad.title}
              loading="eager"
              className="h-full w-full object-cover"
              style={{ minHeight: "180px", maxHeight: "280px" }}
            />
            <span className="absolute top-3 left-3 rounded-full border border-accent/30 bg-white/90 backdrop-blur-sm px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent shadow-sm">
              Sponsored
            </span>
          </div>

          {/* Text column — fills right half, vertically centred */}
          <div className="flex flex-1 flex-col justify-center gap-3 p-5 md:p-7">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1.5">
                Sponsored
              </p>
              <h3 className="font-display text-xl font-bold leading-snug text-foreground">
                {ad.title}
              </h3>
              {ad.body && (
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {ad.body}
                </p>
              )}
            </div>
            {ad.link_url && (
              <a
                href={ad.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start inline-flex items-center gap-2 border-2 border-ink bg-accent px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0_0_var(--ink)] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_var(--ink)] active:translate-y-0"
                style={{ borderRadius: "10px 3px 12px 3px / 3px 12px 3px 10px" }}
              >
                {ad.cta_label || "Learn more"}
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      ) : (
        /* TEXT ONLY — single row */
        <AdTextRow ad={ad} showBadge />
      )}
    </div>
  );
}

// ─── Bottom text row (used for video + text-only ads) ────────────────────────

function AdTextRow({ ad, showBadge }: { ad: Ad; showBadge?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        {showBadge && (
          <span className="inline-block rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent mb-1">
            Sponsored
          </span>
        )}
        <h3 className="font-display text-base font-bold leading-snug truncate">{ad.title}</h3>
        {ad.body && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1 mt-0.5">{ad.body}</p>
        )}
      </div>
      {ad.link_url && (
        <a
          href={ad.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 border-2 border-ink bg-accent px-3 py-1.5 text-xs font-bold text-white shadow-[2px_2px_0_0_var(--ink)] transition-all hover:-translate-y-0.5"
          style={{ borderRadius: "8px 3px 10px 3px / 3px 10px 3px 8px" }}
        >
          {ad.cta_label || "Learn more"}
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

// ─── Main HomeAds with carousel ───────────────────────────────────────────────

export function HomeAds() {
  const ads = useAds("home");
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (ads.length <= 1) return;
    timerRef.current = setInterval(() => setIdx((i) => (i + 1) % ads.length), 6000);
  };

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [ads.length]);

  const go = (dir: 1 | -1) => {
    setIdx((i) => (i + dir + ads.length) % ads.length);
    startTimer();
  };

  if (ads.length === 0) return null;
  const single = ads.length === 1;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-3">
      {/* Section label */}
      <div className="flex items-center gap-1.5 mb-2">
        <Megaphone className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Sponsored
        </span>
      </div>

      {/* Carousel wrapper */}
      <div className="relative">
        {single ? (
          <HomeAdCard ad={ads[0]} active />
        ) : (
          <div className="relative">
            {ads.map((ad, i) => (
              <div
                key={ad.id}
                className={i === idx ? "relative z-10" : "absolute inset-0 z-0"}
              >
                <HomeAdCard ad={ad} active={i === idx} />
              </div>
            ))}
          </div>
        )}

        {/* Arrow buttons */}
        {!single && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous ad"
              className="absolute -left-4 top-1/2 z-20 -translate-y-1/2 hidden sm:flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-white shadow-[2px_2px_0_0_var(--ink)] transition hover:bg-surface-2 hover:-translate-y-[calc(50%+2px)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next ad"
              className="absolute -right-4 top-1/2 z-20 -translate-y-1/2 hidden sm:flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-white shadow-[2px_2px_0_0_var(--ink)] transition hover:bg-surface-2 hover:-translate-y-[calc(50%+2px)]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Dot indicators */}
      {!single && (
        <div className="mt-2.5 flex justify-center gap-1.5">
          {ads.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setIdx(i); startTimer(); }}
              aria-label={`Ad ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full border border-ink/40 transition-all duration-300",
                i === idx ? "w-5 bg-accent" : "w-1.5 bg-muted hover:bg-border",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}

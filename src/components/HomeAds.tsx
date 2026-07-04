import { ExternalLink, Megaphone } from "lucide-react";
import { useAds, type Ad } from "@/hooks/useAds";
import { Button } from "@/components/ui/button";

function HomeAdCard({ ad, index = 0 }: { ad: Ad, index?: number }) {
  const isVideo = ad.kind === "video" && ad.embed_url;
  return (
    <div 
      className={`sketch-card flex flex-col sm:flex-row items-center gap-4 p-4 ${index % 2 ? "rotate-1" : "-rotate-1"}`}
      style={{ borderRadius: "25px 8px 22px 8px / 8px 22px 8px 25px" }}
    >
      {isVideo ? (
        <div className="aspect-video w-full sm:w-1/3 shrink-0 rounded-xl overflow-hidden border-2 border-border bg-black">
          <iframe
            src={ad.embed_url!}
            title={ad.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : ad.media_url ? (
        <img src={ad.media_url} alt={ad.title} className="h-40 w-full sm:h-32 sm:w-32 shrink-0 object-cover rounded-xl border-2 border-border" loading="lazy" />
      ) : null}
      
      <div className="flex-1 w-full text-center sm:text-left space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h3 className="font-display text-xl font-bold">{ad.title}</h3>
            <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent border border-accent/20">
              Ad
            </span>
          </div>
        </div>
        {ad.body && <p className="text-sm text-muted-foreground">{ad.body}</p>}
        {ad.link_url && (
          <div className="pt-2">
            <a 
              href={ad.link_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-1 border-2 border-border bg-accent px-4 py-2 text-sm font-bold text-accent-foreground shadow-ink transition-transform duration-100 hover:-translate-y-0.5 hover:shadow-ink-lg"
              style={{ borderRadius: "18px 6px 20px 6px / 6px 20px 6px 18px" }}
            >
              {ad.cta_label || "Learn more"} <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/** Renders home-placement ads. Empty when the master switch is off. */
export function HomeAds() {
  const ads = useAds("home");
  if (ads.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="flex flex-col gap-6">
        {ads.map((ad, i) => (
          <HomeAdCard key={ad.id} ad={ad} index={i} />
        ))}
      </div>
    </section>
  );
}

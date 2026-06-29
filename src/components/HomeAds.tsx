import { ExternalLink, Megaphone } from "lucide-react";
import { useAds, type Ad } from "@/hooks/useAds";
import { Button } from "@/components/ui/button";

function HomeAdCard({ ad }: { ad: Ad }) {
  const isVideo = ad.kind === "video" && ad.embed_url;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {isVideo ? (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={ad.embed_url!}
            title={ad.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : ad.media_url ? (
        <img src={ad.media_url} alt={ad.title} className="max-h-64 w-full object-cover" loading="lazy" />
      ) : null}
      <div className="flex items-start gap-3 p-4">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Megaphone className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{ad.title}</h3>
            <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
              Ad
            </span>
          </div>
          {ad.body && <p className="mt-1 text-sm text-muted-foreground">{ad.body}</p>}
          {ad.link_url && (
            <Button asChild size="sm" className="mt-3 rounded-full">
              <a href={ad.link_url} target="_blank" rel="noopener noreferrer">
                {ad.cta_label || "Learn more"} <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Renders home-placement ads. Empty when the master switch is off. */
export function HomeAds() {
  const ads = useAds("home");
  if (ads.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {ads.map((ad) => (
          <HomeAdCard key={ad.id} ad={ad} />
        ))}
      </div>
    </section>
  );
}

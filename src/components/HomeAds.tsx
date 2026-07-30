import { ExternalLink } from "lucide-react";
import { useAds, type Ad } from "@/hooks/useAds";

function HomeAdCard({ ad }: { ad: Ad }) {
  const isVideo = ad.kind === "video" && ad.embed_url;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {/* Media area */}
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
        <img
          src={ad.media_url}
          alt={ad.title}
          className="h-44 w-full object-cover sm:h-56"
          loading="lazy"
        />
      ) : null}

      {/* Content */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent border border-accent/20">
              Ad
            </span>
          </div>
          <h3 className="font-semibold leading-snug">{ad.title}</h3>
          {ad.body && <p className="text-sm text-muted-foreground">{ad.body}</p>}
        </div>
        {ad.link_url && (
          <a
            href={ad.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground transition hover:opacity-90"
          >
            {ad.cta_label || "Learn more"} <ExternalLink className="h-3 w-3" />
          </a>
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
    <section className="mx-auto w-full max-w-3xl px-4 py-4">
      <div className="flex flex-col gap-4">
        {ads.map((ad) => (
          <HomeAdCard key={ad.id} ad={ad} />
        ))}
      </div>
    </section>
  );
}

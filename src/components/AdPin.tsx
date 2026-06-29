import { useEffect, useState } from "react";
import { Pin, ExternalLink, X } from "lucide-react";
import { useAds, type Ad } from "@/hooks/useAds";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function AdMedia({ ad }: { ad: Ad }) {
  if (ad.kind === "video" && ad.embed_url) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          src={ad.embed_url}
          title={ad.title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }
  if (ad.media_url) {
    return (
      <img
        src={ad.media_url}
        alt={ad.title}
        className="w-full rounded-lg object-cover"
        loading="lazy"
      />
    );
  }
  return null;
}

/**
 * A pinned promo line that sits at the very top of a chat. Tapping it opens
 * the ad in a dialog. Cycles through multiple ads. Renders nothing when the
 * admin master switch is off or there are no ads for the placement.
 */
export function AdPin({ placement }: { placement: "global" | "college" }) {
  const ads = useAds(placement);
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (ads.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % ads.length), 5000);
    return () => clearInterval(t);
  }, [ads.length]);

  if (ads.length === 0) return null;
  const ad = ads[Math.min(idx, ads.length - 1)];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 border-b border-accent/20 bg-gradient-to-r from-accent/15 via-accent/10 to-transparent px-3 py-2 text-left transition-colors hover:from-accent/25"
        aria-label={`Promotion: ${ad.title}`}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
          <Pin className="h-3 w-3" />
        </span>
        <span className="truncate text-sm font-medium text-foreground">{ad.title}</span>
        <span className="ml-auto shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
          Ad
        </span>
        {ads.length > 1 && (
          <span className="flex shrink-0 gap-1">
            {ads.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  i === idx ? "bg-accent" : "bg-accent/30",
                )}
              />
            ))}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pin className="h-4 w-4 text-accent" /> {ad.title}
            </DialogTitle>
            {ad.body && <DialogDescription>{ad.body}</DialogDescription>}
          </DialogHeader>
          <AdMedia ad={ad} />
          {ad.link_url && (
            <Button asChild className="w-full rounded-full">
              <a href={ad.link_url} target="_blank" rel="noopener noreferrer">
                {ad.cta_label || "Learn more"} <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

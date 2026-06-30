import { useRef, useState, type ReactNode } from "react";
import { Reply } from "lucide-react";
import { REACTION_EMOJIS, type ReactionEmoji } from "@/lib/reactions";
import { cn } from "@/lib/utils";

/**
 * Mobile-only gesture layer for chat bubbles:
 * - Swipe right  -> reply
 * - Long press   -> open emoji reaction picker
 * On desktop (no touch) it's an inert wrapper; the hover action buttons stay.
 */
export function MessageGestures({
  children,
  onReply,
  onReact,
  align = "start",
}: {
  children: ReactNode;
  onReply: () => void;
  onReact: (emoji: ReactionEmoji) => void;
  align?: "start" | "end";
}) {
  const [dx, setDx] = useState(0);
  const [armed, setArmed] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [placeBelow, setPlaceBelow] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const longTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moved = useRef(false);

  const clearLong = () => {
    if (longTimer.current) {
      clearTimeout(longTimer.current);
      longTimer.current = null;
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
    moved.current = false;
    longTimer.current = setTimeout(() => {
      const top = wrapRef.current?.getBoundingClientRect().top ?? 200;
      setPlaceBelow(top < 80);
      setShowReactions(true);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(12);
    }, 420);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const deltaX = t.clientX - startX.current;
    const deltaY = t.clientY - startY.current;
    if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
      moved.current = true;
      clearLong();
    }
    if (deltaX > 0 && Math.abs(deltaX) > Math.abs(deltaY)) {
      const clamped = Math.min(deltaX, 72);
      setDx(clamped);
      setArmed(clamped > 48);
    }
  };

  const onTouchEnd = () => {
    clearLong();
    if (armed) onReply();
    setDx(0);
    setArmed(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      {dx > 0 && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-1">
          <Reply
            className={cn(
              "h-5 w-5 transition-colors",
              armed ? "text-accent" : "text-muted-foreground/50",
            )}
          />
        </div>
      )}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: dx ? `translateX(${dx}px)` : undefined,
          transition: dx ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </div>

      {showReactions && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowReactions(false)} />
          <div
            className={cn(
              "absolute -top-12 z-50 flex gap-1 rounded-full border-2 border-border bg-white p-1.5 shadow-ink-soft",
              align === "end" ? "right-0" : "left-0",
            )}
          >
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(emoji);
                  setShowReactions(false);
                }}
                className="grid h-9 w-9 place-items-center rounded-full text-xl transition-transform active:scale-110"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

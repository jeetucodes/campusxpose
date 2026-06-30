import { Smile, Reply, Pin, PinOff } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { REACTION_EMOJIS, type ReactionEmoji } from "@/lib/reactions";
import type { ReactionSummary } from "@/hooks/useReactions";
import { cn } from "@/lib/utils";

export function ReactionChips({
  reactions,
  onToggle,
  align = "start",
}: {
  reactions: ReactionSummary[];
  onToggle: (emoji: ReactionEmoji) => void;
  align?: "start" | "end";
}) {
  if (!reactions.length) return null;
  return (
    <div
      className={cn(
        "relative z-20 -mt-2 flex flex-wrap gap-1",
        align === "end" ? "mr-2 justify-end" : "ml-2 justify-start",
      )}
    >
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => onToggle(r.emoji as ReactionEmoji)}
          className={cn(
            "flex items-center gap-0.5 rounded-full border bg-white px-1.5 py-0.5 text-[11px] leading-none shadow-sm transition-all duration-150 active:scale-90",
            r.mine
              ? "border-accent text-accent hover:bg-accent/10"
              : "border-border text-muted-foreground hover:-translate-y-0.5 hover:bg-surface-2",
          )}
        >
          <span className="text-xs leading-none">{r.emoji}</span>
          <span className="font-semibold tabular-nums">{r.count}</span>
        </button>
      ))}
    </div>
  );
}


export function MessageActions({
  onToggle,
  onReply,
  onPin,
  pinned,
  className,
}: {
  onToggle: (emoji: ReactionEmoji) => void;
  onReply: () => void;
  onPin?: () => void;
  pinned?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <button
            aria-label="Add reaction"
            className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-accent"
          >
            <Smile className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="center"
          sideOffset={6}
          className="flex w-auto gap-0.5 rounded-full border-2 border-border bg-white p-1.5 shadow-ink-soft animate-in fade-in zoom-in-95 duration-150"
        >
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onToggle(emoji)}
              className="grid h-9 w-9 place-items-center rounded-full text-xl transition-transform duration-150 hover:-translate-y-1 hover:scale-125 active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </PopoverContent>

      </Popover>
      <button
        aria-label="Reply"
        onClick={onReply}
        className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-2 hover:text-accent"
      >
        <Reply className="h-4 w-4" />
      </button>
      {onPin && (
        <button
          aria-label={pinned ? "Unpin message" : "Pin message"}
          onClick={onPin}
          className={cn(
            "grid h-7 w-7 place-items-center rounded-full transition-colors hover:bg-surface-2 hover:text-accent",
            pinned ? "text-accent" : "text-muted-foreground",
          )}
        >
          {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}


export function ReplyQuote({
  username,
  content,
  align = "start",
}: {
  username?: string | null;
  content?: string | null;
  align?: "start" | "end";
}) {
  if (!content) return null;
  const onAccent = align === "end";
  return (
    <div
      className={cn(
        "mb-1 max-w-full overflow-hidden border-l-2 px-2 py-1 text-xs",
        align === "end" ? "text-right" : "text-left",
        onAccent
          ? "border-accent-foreground/50 bg-accent-foreground/15"
          : "border-accent/60 bg-surface-2/60",
      )}
      style={{ borderRadius: "8px" }}
    >
      {username && (
        <div
          className={cn(
            "truncate font-semibold",
            onAccent ? "text-accent-foreground/90" : "text-accent/90",
          )}
        >
          {username}
        </div>
      )}
      <div
        className={cn(
          "line-clamp-2 break-words",
          onAccent ? "text-accent-foreground/80" : "text-muted-foreground",
        )}
      >
        {content}
      </div>
    </div>
  );
}


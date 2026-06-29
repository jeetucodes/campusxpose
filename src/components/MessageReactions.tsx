import { Smile, Reply } from "lucide-react";
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
    <div className={cn("flex flex-wrap gap-1", align === "end" ? "justify-end" : "justify-start")}>
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => onToggle(r.emoji as ReactionEmoji)}
          className={cn(
            "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
            r.mine
              ? "border-accent bg-accent/15 text-accent"
              : "border-border bg-surface text-muted-foreground hover:bg-surface-2",
          )}
        >
          <span>{r.emoji}</span>
          <span className="font-semibold">{r.count}</span>
        </button>
      ))}
    </div>
  );
}

export function MessageActions({
  onToggle,
  onReply,
  className,
}: {
  onToggle: (emoji: ReactionEmoji) => void;
  onReply: () => void;
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
          className="flex w-auto gap-1 rounded-full border-2 border-border bg-white p-1.5 shadow-ink-soft"
        >
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onToggle(emoji)}
              className="grid h-9 w-9 place-items-center rounded-full text-xl transition-transform hover:scale-125 hover:bg-surface-2"
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
  return (
    <div
      className={cn(
        "mb-1 border-l-2 border-accent/60 bg-surface-2/60 px-2 py-1 text-xs",
        align === "end" ? "text-right" : "text-left",
      )}
      style={{ borderRadius: "8px" }}
    >
      {username && <div className="font-semibold text-accent/90">{username}</div>}
      <div className="line-clamp-2 text-muted-foreground">{content}</div>
    </div>
  );
}

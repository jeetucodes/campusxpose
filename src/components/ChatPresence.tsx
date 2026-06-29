import { cn } from "@/lib/utils";

export function OnlineBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      {count} online
    </span>
  );
}

export function TypingIndicator({ users, className }: { users: string[]; className?: string }) {
  if (users.length === 0) return null;
  const label =
    users.length === 1
      ? `${users[0]} is typing`
      : users.length === 2
        ? `${users[0]} and ${users[1]} are typing`
        : `${users.length} people are typing`;
  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      <span className="flex items-center gap-0.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
      </span>
      <span className="italic">{label}…</span>
    </div>
  );
}

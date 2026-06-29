import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small verified tick. Render right after a username.
 * Pass `verified` directly, or wrap with VerifiedName for set-based lookup.
 */
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <BadgeCheck
      className={cn("inline-block h-4 w-4 shrink-0 fill-accent text-white", className)}
      aria-label="Verified"
    />
  );
}

/** Username text followed by a verified tick when the name is in `verifiedSet`. */
export function VerifiedName({
  username,
  verifiedSet,
  className,
  badgeClassName,
}: {
  username: string | null | undefined;
  verifiedSet: Set<string>;
  className?: string;
  badgeClassName?: string;
}) {
  const name = username ?? "Anonymous";
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {name}
      {username && verifiedSet.has(username) && <VerifiedBadge className={badgeClassName} />}
    </span>
  );
}

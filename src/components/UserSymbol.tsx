import { userAvatar } from "@/lib/avatar";
import { cn } from "@/lib/utils";

const SIZES: Record<string, string> = {
  sm: "h-7 w-7 text-sm",
  md: "h-10 w-10 text-lg",
  lg: "h-12 w-12 text-2xl",
};

export function UserSymbol({
  username,
  size = "md",
  className,
}: {
  username: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { symbol, color } = userAvatar(username);
  return (
    <div
      className={cn(
        "grid shrink-0 -rotate-2 place-items-center border-2 border-border shadow-ink-soft",
        SIZES[size],
        className,
      )}
      style={{
        borderRadius: "18px 7px 20px 7px / 7px 20px 7px 18px",
        backgroundColor: `${color}22`,
      }}
      aria-hidden
    >
      <span>{symbol}</span>
    </div>
  );
}

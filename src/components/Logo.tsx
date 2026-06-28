import { Ghost } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 font-display font-bold tracking-tight ${className}`}>
      <span
        className="grid h-9 w-9 -rotate-3 place-items-center border-2 border-border bg-postit text-foreground shadow-ink-soft"
        style={{ borderRadius: "16px 6px 18px 6px / 6px 18px 6px 16px" }}
      >
        <Ghost className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <span className="text-xl">
        Campus<span className="text-accent">Xpose</span>
      </span>
    </Link>
  );
}

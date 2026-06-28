import { Ghost } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 font-display font-bold tracking-tight ${className}`}>
      <span
        className="grid h-10 w-10 -rotate-6 place-items-center border-2 border-ink bg-postit text-ink shadow-ink"
        style={{ borderRadius: "16px 6px 18px 6px / 6px 18px 6px 16px" }}
      >
        <Ghost className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <span className="whitespace-nowrap text-xl sm:text-2xl">
        Campus
        <span className="relative inline-block text-accent">
          <span
            aria-hidden
            className="absolute -bottom-1 left-[-4px] right-[-4px] h-3 bg-marker/20 wobbly-sm"
          />
          <span className="relative z-10">Xpose</span>
        </span>
      </span>
    </Link>
  );
}

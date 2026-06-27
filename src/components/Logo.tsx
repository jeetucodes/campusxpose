import { Ghost } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
        <Ghost className="h-5 w-5" />
      </span>
      <span className="text-lg">
        Campus<span className="text-accent">Xpose</span>
      </span>
    </Link>
  );
}

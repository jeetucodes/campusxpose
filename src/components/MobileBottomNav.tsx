import { Link } from "@tanstack/react-router";
import { Home, GraduationCap, Globe, MessageCircle } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/colleges", label: "Colleges", icon: GraduationCap },
  { to: "/global", label: "Global", icon: Globe },
  { to: "/messages", label: "DMs", icon: MessageCircle },
] as const;

export function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-dashed border-border bg-background/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-5xl items-stretch justify-around">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: Boolean(exact) }}
              activeProps={{ className: "text-accent" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors"
            >
              <Icon className="h-5 w-5" strokeWidth={2.5} />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

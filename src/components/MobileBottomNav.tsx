import { Link } from "@tanstack/react-router";
import { Home, GraduationCap, Globe, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDmUnread } from "@/stores/dm";

const items = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/colleges", label: "Colleges", icon: GraduationCap, exact: false },
  { to: "/global", label: "Global", icon: Globe, exact: false },
  { to: "/messages", label: "DMs", icon: MessageCircle, exact: false },
] as const;

export function MobileBottomNav() {
  const unread = useDmUnread();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-dashed border-border bg-background/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-5xl items-stretch justify-around">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact }}
              className="flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors"
            >
              {({ isActive }) => (
                <>
                  <span className={cn(
                    "relative flex items-center justify-center",
                    isActive ? "text-accent" : "text-muted-foreground"
                  )}>
                    <Icon className="h-5 w-5" strokeWidth={2.5} />
                    {to === "/messages" && unread > 0 && (
                      <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-accent-foreground">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute -bottom-1.5 h-1 w-1 rounded-full bg-accent" />
                    )}
                  </span>
                  <span className={cn(isActive ? "text-accent" : "text-muted-foreground")}>{label}</span>
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

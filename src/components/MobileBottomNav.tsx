import { Link } from "@tanstack/react-router";
import { Home, GraduationCap, Globe, Gamepad2, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/colleges", label: "Colleges", icon: GraduationCap, exact: false },
  { to: "/global", label: "Global", icon: Globe, exact: false },
  { to: "/projects", label: "Projects", icon: FolderOpen, exact: false },
  { to: "/games", label: "Games", icon: Gamepad2, exact: false },
] as const;

export function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-dashed border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-5xl items-stretch justify-around">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact }}
              className="flex h-16 sm:h-20 flex-col items-center justify-center gap-1 sm:gap-1.5 text-xs sm:text-[15px] font-medium sm:font-bold transition-colors"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "relative flex items-center justify-center",
                      isActive ? "text-accent" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5 sm:h-7 sm:w-7" strokeWidth={2.5} />

                    {isActive && (
                      <span className="absolute -bottom-1.5 sm:-bottom-2 h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-accent" />
                    )}
                  </span>
                  <span className={cn(isActive ? "text-accent" : "text-muted-foreground")}>
                    {label}
                  </span>
                </>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

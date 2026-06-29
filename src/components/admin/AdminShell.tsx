import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, Building2, AlertTriangle, FileText, MessageSquare,
  Users, ShieldAlert, BarChart3, Bot, LogOut, Ghost,
} from "lucide-react";
import { useAdmin } from "@/stores/admin";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/colleges", label: "Colleges", icon: Building2 },
  { to: "/admin/incidents", label: "Incidents", icon: AlertTriangle },
  { to: "/admin/posts", label: "Posts", icon: FileText },
  { to: "/admin/community", label: "Community", icon: MessageSquare },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/ai", label: "AI Control", icon: Bot },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const { token, logout } = useAdmin();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token) navigate({ to: "/admin/login" });
  }, [mounted, token, navigate]);

  // Never render the admin shell (even briefly) until we've confirmed, on the
  // client, that an admin token exists. During SSR and the first client render
  // this returns null, so the admin layout is never present without auth.
  if (!mounted || !token) {
    return <div className="min-h-screen bg-background" />;
  }


  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Sidebar desktop */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex">
        <div className="mb-6 flex items-center gap-2">
          <Ghost className="h-6 w-6 text-primary" />
          <span className="font-extrabold">Campus<span className="text-accent">Xpose</span></span>
          <span className="ml-auto rounded bg-destructive/20 px-1.5 py-0.5 text-[10px] font-bold text-destructive">ADMIN</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors", pathname === n.to ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground")}>
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <button onClick={() => { logout(); navigate({ to: "/admin/login" }); }} className="mt-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </aside>

      <main className="flex-1 overflow-x-hidden p-4 pb-24 md:p-8">{children}</main>

      {/* Bottom tab bar mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex overflow-x-auto border-t border-border bg-surface md:hidden no-scrollbar">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className={cn("flex shrink-0 basis-[68px] flex-col items-center gap-0.5 px-3 py-2 text-[10px]", pathname === n.to ? "text-primary" : "text-muted-foreground")}>
            <n.icon className="h-4 w-4" /> {n.label}
          </Link>
        ))}
        <button onClick={() => { logout(); navigate({ to: "/admin/login" }); }} className="flex shrink-0 basis-[68px] flex-col items-center gap-0.5 px-3 py-2 text-[10px] text-destructive">
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </nav>
    </div>
  );
}

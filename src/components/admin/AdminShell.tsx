import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Building2,
  AlertTriangle,
  FileText,
  MessageSquare,
  Users,
  ShieldAlert,
  BarChart3,
  Bot,
  LogOut,
  Ghost,
  Megaphone,
  MessagesSquare,
  Vote,
  MessageSquareHeart,
  UserCog,
  Gamepad2,
  ShoppingCart,
  Menu,
} from "lucide-react";
import { useAdmin } from "@/stores/admin";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const NAV_GROUPS = [
  {
    title: "CampusXpose",
    items: [
      { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/colleges", label: "Colleges", icon: Building2 },
      { to: "/admin/incidents", label: "Incidents", icon: AlertTriangle },
      { to: "/admin/posts", label: "Posts", icon: FileText },
      { to: "/admin/comments", label: "Comments", icon: MessagesSquare },
      { to: "/admin/projects", label: "Projects", icon: FileText },
      { to: "/admin/news", label: "News", icon: Megaphone },
      { to: "/admin/polls", label: "Polls", icon: Vote },
      { to: "/admin/community", label: "Community", icon: MessageSquare },
      { to: "/admin/users", label: "Users", icon: Users },
      { to: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
      { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/admin/ai", label: "AI Control", icon: Bot },
      { to: "/admin/features", label: "Features", icon: Bot },
      { to: "/admin/feedback", label: "Feedback", icon: MessageSquareHeart },
      { to: "/admin/profile", label: "Profile", icon: UserCog },
    ]
  },
  {
    title: "Ads & Games",
    items: [
      { to: "/admin/ads", label: "Ads", icon: Megaphone },
      { to: "/admin/games", label: "Games & AI", icon: Gamepad2 },
    ]
  }
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { token, logout } = useAdmin();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !token) navigate({ to: "/admin/login" });
  }, [mounted, token, navigate]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (!mounted || !token) {
    return <div className="min-h-screen bg-background" />;
  }

  const NavLinks = () => (
    <>
      <div className="mb-8 flex items-center gap-2 px-4 md:px-0">
        <Ghost className="h-6 w-6 text-primary" />
        <span className="font-extrabold text-lg">
          Campus<span className="text-accent">Xpose</span>
        </span>
        <span className="ml-auto rounded-md bg-destructive/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-destructive border border-destructive/20">
          ADMIN
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto no-scrollbar px-2 md:px-0">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-1.5">
            <div className="px-3 py-1.5 text-xs font-bold text-muted-foreground/70 uppercase tracking-widest border-b border-border/40 mb-1">
              {group.title}
            </div>
            {group.items.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  pathname === n.to
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <n.icon className={cn("h-4 w-4", pathname === n.to ? "text-primary-foreground" : "text-muted-foreground")} /> {n.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="mt-auto pt-6 pb-2 px-2 md:px-0 border-t border-border/40 mt-4">
        <button
          onClick={() => {
            logout();
            navigate({ to: "/admin/login" });
          }}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <Ghost className="h-6 w-6 text-primary" />
          <span className="font-extrabold text-lg">
            CX <span className="text-accent">Admin</span>
          </span>
        </div>
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0 md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-[320px] p-4 sm:p-6 flex flex-col border-r-border/40">
            <NavLinks />
          </SheetContent>
        </Sheet>
      </div>

      {/* Sidebar desktop */}
      <aside className="hidden w-[280px] shrink-0 flex-col border-r border-border/40 bg-surface/30 p-6 md:flex h-screen sticky top-0">
        <NavLinks />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)] md:min-h-screen">
        <div className="mx-auto w-full max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
}

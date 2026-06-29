import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Shield, ChevronDown, Trash2 } from "lucide-react";
import { UserSymbol } from "@/components/UserSymbol";
import { useIdentity } from "@/stores/identity";
import { useDmUnread } from "@/stores/dm";
import { ForgetMeDialog } from "@/components/ForgetMeDialog";
import { Logo } from "@/components/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { username, isReady, init } = useIdentity();
  const unread = useDmUnread();
  const [open, setOpen] = useState(false);
  const [forgetOpen, setForgetOpen] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-dashed border-ink bg-paper">
      <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Logo />
        <div className="hidden items-center gap-3 text-lg md:flex">
          {[
            { to: "/colleges", label: "Colleges" },
            { to: "/global", label: "Global" },
            { to: "/messages", label: "DMs" },
            { to: "/report", label: "Report" },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="relative px-3 py-1.5 font-display transition-all duration-100 hover:-rotate-1 hover:text-accent"
              activeProps={{ className: "border-2 border-ink bg-white shadow-ink text-accent -rotate-1" }}
              inactiveProps={{ className: "text-foreground" }}
              style={{ borderRadius: "16px 6px 18px 6px / 6px 18px 6px 16px" }}
            >
              {item.label}
              {item.to === "/messages" && unread > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-accent-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          ))}
        </div>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 border-2 border-ink bg-white px-3 py-1.5 text-sm shadow-ink transition-transform duration-100 hover:-rotate-2"
              style={{ borderRadius: "20px 7px 22px 7px / 7px 22px 7px 20px" }}
            >
              <UserSymbol username={username} size="sm" />
              <span className="max-w-[120px] truncate font-medium">{isReady ? username : "..."}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 border-2 border-ink bg-white p-3 shadow-ink"
            style={{ borderRadius: "18px 6px 20px 6px / 6px 20px 6px 18px" }}
          >
            <div className="mb-2 flex items-center gap-2">
              <UserSymbol username={username} size="sm" />
              <span className="font-display font-bold">{username}</span>
            </div>
            <div className="mb-3 flex items-center gap-2 border border-dashed border-success bg-success/10 px-3 py-2 text-xs text-success">
              <Shield className="h-4 w-4" />
              Identity never stored
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={async () => {
                await reset();
                toast.success("New anonymous identity generated");
                setOpen(false);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Forget Me
            </Button>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </header>
  );
}

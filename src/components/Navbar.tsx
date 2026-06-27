import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Ghost, Shield, ChevronDown, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useIdentity } from "@/stores/identity";
import { Logo } from "@/components/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { username, isReady, init, reset } = useIdentity();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <div className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link to="/colleges" className="transition-colors hover:text-foreground">Colleges</Link>
          <Link to="/report" className="transition-colors hover:text-foreground">Report</Link>
        </div>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm transition-colors hover:border-primary/50">
              <Ghost className="h-4 w-4 text-primary" />
              <span className="max-w-[120px] truncate font-medium">{isReady ? username : "..."}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 border-border bg-surface p-3">
            <div className="mb-2 flex items-center gap-2">
              <Ghost className="h-5 w-5 text-primary" />
              <span className="font-semibold">{username}</span>
            </div>
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
              <Shield className="h-4 w-4" />
              Identity never stored
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
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

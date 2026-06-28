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
    <header className="sticky top-0 z-40 border-b-2 border-dashed border-border bg-background/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Logo />
        <div className="hidden items-center gap-6 text-lg md:flex">
          <Link to="/colleges" className="transition-colors hover:wavy-underline">Colleges</Link>
          <Link to="/report" className="transition-colors hover:wavy-underline">Report</Link>
        </div>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 border-2 border-border bg-white px-3 py-1.5 text-sm shadow-ink-soft transition-transform duration-100 hover:-rotate-2"
              style={{ borderRadius: "20px 7px 22px 7px / 7px 22px 7px 20px" }}
            >
              <Ghost className="h-4 w-4 text-accent" strokeWidth={2.5} />
              <span className="max-w-[120px] truncate font-medium">{isReady ? username : "..."}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 border-2 border-border bg-white p-3 shadow-ink"
            style={{ borderRadius: "18px 6px 20px 6px / 6px 20px 6px 18px" }}
          >
            <div className="mb-2 flex items-center gap-2">
              <Ghost className="h-5 w-5 text-accent" strokeWidth={2.5} />
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

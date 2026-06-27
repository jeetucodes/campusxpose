import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Navbar } from "@/components/Navbar";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-surface/50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <Logo />
          <div className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-xs text-success">
            <Shield className="h-3.5 w-3.5" /> 100% Anonymous
          </div>
        </div>
        <div className="flex gap-8 text-sm text-muted-foreground">
          <Link to="/colleges" className="hover:text-foreground">Colleges</Link>
          <Link to="/report" className="hover:text-foreground">Report</Link>
          <Link to="/colleges" className="hover:text-foreground">Community</Link>
        </div>
        <p className="text-sm text-muted-foreground">No identity stored. Ever.</p>
      </div>
    </footer>
  );
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

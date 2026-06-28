import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Navbar } from "@/components/Navbar";

export function Footer() {
  return (
    <footer className="mt-20 border-t-2 border-dashed border-border bg-surface-2/60">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <Logo />
          <div
            className="inline-flex items-center gap-2 border-2 border-border bg-success/15 px-3 py-1 text-xs font-semibold text-success shadow-ink-soft"
            style={{ borderRadius: "16px 6px 18px 6px / 6px 18px 6px 16px" }}
          >
            <Shield className="h-3.5 w-3.5" /> 100% Anonymous
          </div>
        </div>
        <div className="flex gap-8 text-lg">
          <Link to="/colleges" className="hover:wavy-underline">Colleges</Link>
          <Link to="/report" className="hover:wavy-underline">Report</Link>
          <Link to="/colleges" className="hover:wavy-underline">Community</Link>
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

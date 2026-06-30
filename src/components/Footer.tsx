import { Link } from "@tanstack/react-router";
import { Shield, MessageCircle, Megaphone, Home, FileText, MessageSquareHeart, Lock, Scale } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Navbar } from "@/components/Navbar";

const WOBBLY = "16px 6px 18px 6px / 6px 18px 6px 16px";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t-2 border-dashed border-ink bg-surface-2/60">
      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* Top section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Brand */}
          <div
            className="space-y-4 border-2 border-ink bg-white p-5 shadow-ink"
            style={{ borderRadius: WOBBLY }}
          >
            <Logo />
            <p className="text-sm leading-relaxed text-muted-foreground">
              CampusXpose — students speaking up, anonymously.
              Report incidents, share experiences, and find your community without fear.
            </p>
            <div
              className="inline-flex items-center gap-2 border-2 border-ink bg-success/15 px-3 py-1 text-xs font-semibold text-success"
              style={{ borderRadius: WOBBLY }}
            >
              <Shield className="h-3.5 w-3.5" /> 100% Anonymous
            </div>
          </div>

          {/* Navigation */}
          <div
            className="space-y-4 border-2 border-ink bg-white p-5 shadow-ink"
            style={{ borderRadius: WOBBLY }}
          >
            <h3 className="text-lg font-display font-bold wavy-underline">Navigate</h3>
            <ul className="space-y-2.5 text-muted-foreground">
              <li>
                <Link to="/" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <Home className="h-4 w-4" /> Home
                </Link>
              </li>
              <li>
                <Link to="/colleges" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <Megaphone className="h-4 w-4" /> Colleges
                </Link>
              </li>
              <li>
                <Link to="/report" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <FileText className="h-4 w-4" /> Report
                </Link>
              </li>
              <li>
                <Link to="/global" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <MessageCircle className="h-4 w-4" /> Global Chat
                </Link>
              </li>
              <li>
                <Link to="/trust" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <Shield className="h-4 w-4" /> Privacy & Trust
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <Lock className="h-4 w-4" /> Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/" hash="feedback" className="inline-flex items-center gap-2 hover:text-foreground transition-colors">
                  <MessageSquareHeart className="h-4 w-4" /> Feedback
                </Link>
              </li>
            </ul>
          </div>
        </div>





        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t-2 border-dashed border-ink pt-6 text-sm text-muted-foreground md:flex-row">
          <p className="font-display font-bold text-foreground">No identity stored. Ever.</p>
          <p>© {year} CampusXpose. Built for students.</p>
        </div>
      </div>
    </footer>
  );
}

export function SiteShell({ children, hideFooter }: { children: React.ReactNode; hideFooter?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
    </div>
  );
}

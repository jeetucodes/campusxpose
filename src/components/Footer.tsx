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
        {/* Main Footer Card */}
        <div
          className="border-2 border-ink bg-white p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          style={{ borderRadius: WOBBLY }}
        >
          <div className="grid gap-10 md:grid-cols-5">
            {/* Brand - takes 3 columns on desktop */}
            <div className="space-y-5 md:col-span-3">
              <Logo />
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground font-medium">
                CampusXpose — students speaking up, anonymously.
                Report incidents, share experiences, and find your community without fear.
              </p>
              <div
                className="inline-flex items-center gap-2 border-2 border-ink bg-success/15 px-3 py-1.5 text-xs font-bold text-success"
                style={{ borderRadius: WOBBLY }}
              >
                <Shield className="h-4 w-4" /> 100% Anonymous
              </div>
            </div>

            {/* Navigation - takes 2 columns on desktop */}
            <div className="space-y-5 md:col-span-2">
              <h3 className="text-lg font-display font-bold wavy-underline inline-block">Navigate</h3>
              <ul className="grid grid-cols-2 gap-y-3 gap-x-2 sm:gap-x-4 text-xs sm:text-sm font-medium text-muted-foreground">
                <li>
                  <Link to="/" className="inline-flex items-center gap-2 hover:text-accent transition-colors">
                    <Home className="h-4 w-4" /> Home
                  </Link>
                </li>
                <li>
                  <Link to="/colleges" className="inline-flex items-center gap-2 hover:text-accent transition-colors">
                    <Megaphone className="h-4 w-4" /> Colleges
                  </Link>
                </li>
                <li>
                  <Link to="/report" className="inline-flex items-center gap-2 hover:text-accent transition-colors">
                    <FileText className="h-4 w-4" /> Report
                  </Link>
                </li>
                <li>
                  <Link to="/global" className="inline-flex items-center gap-2 hover:text-accent transition-colors">
                    <MessageCircle className="h-4 w-4" /> Global Chat
                  </Link>
                </li>
                <li>
                  <Link to="/trust" className="inline-flex items-center gap-2 hover:text-accent transition-colors">
                    <Shield className="h-4 w-4" /> Privacy & Trust
                  </Link>
                </li>
                <li>
                  <Link to="/" hash="feedback" className="inline-flex items-center gap-2 hover:text-accent transition-colors">
                    <MessageSquareHeart className="h-4 w-4" /> Feedback
                  </Link>
                </li>
                <li>
                  <Link to="/privacy" className="inline-flex items-center gap-2 hover:text-accent transition-colors">
                    <Lock className="h-4 w-4" /> Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="inline-flex items-center gap-2 hover:text-accent transition-colors">
                    <Scale className="h-4 w-4" /> Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
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

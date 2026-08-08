import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import favicon from "@/assets/favicon.png";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { MobileBottomNav } from "@/components/MobileBottomNav";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
      },
      { name: "theme-color", content: "#111111" },
      { title: "CampusXpose — College ka sach, bina darr ke" },
      {
        name: "description",
        content:
          "Anonymous platform for Indian college students to rate colleges and report fake fines, placement fraud, and harassment.",
      },
      { name: "author", content: "CampusXpose" },
      { name: "google-site-verification", content: "1BCMAogu2qMCNHNGQjFcQxKKiAa8183Lt1iPNZ1Y7s8" },
      { property: "og:title", content: "CampusXpose — College ka sach, bina darr ke" },
      {
        property: "og:description",
        content:
          "Anonymous platform for Indian college students to rate colleges and report fake fines, placement fraud, and harassment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "CampusXpose — College ka sach, bina darr ke" },
      {
        name: "twitter:description",
        content:
          "Anonymous platform for Indian college students to rate colleges and report fake fines, placement fraud, and harassment.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4775d11f-2679-4112-a831-752842265928/id-preview-b47b8bb1--5e5e5f3c-9e18-4ded-bf54-ed3632d01563.lovable.app-1782677617743.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4775d11f-2679-4112-a831-752842265928/id-preview-b47b8bb1--5e5e5f3c-9e18-4ded-bf54-ed3632d01563.lovable.app-1782677617743.png",
      },
    ],
    links: [
      {
        rel: "preconnect",
        href: "https://mcobkriudveoevbrmrwi.supabase.co",
        crossOrigin: "anonymous",
      },
      { rel: "dns-prefetch", href: "https://mcobkriudveoevbrmrwi.supabase.co" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", href: favicon },
      { rel: "apple-touch-icon", href: favicon },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.OneSignalDeferred = window.OneSignalDeferred || [];
              OneSignalDeferred.push(async function(OneSignal) {
                await OneSignal.init({
                  appId: "99906f9e-9dd2-4000-b559-0185efddc600",
                });
              });
            `,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { GlobalCallListener } from "@/components/GlobalCallListener";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const pathname = router.state.location.pathname;

  // Deep linking: redirect to mobile app or Play Store on Android
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isAndroid = /android/i.test(navigator.userAgent);

    // Detect if already inside the Median wrapper
    const isMedianWebview =
      /Median|gonative|co\.median\.android\.abxkxke/i.test(navigator.userAgent) ||
      (window as any).median ||
      (window as any).gonative ||
      (navigator.userAgent.includes("wv") && isAndroid);

    if (isAndroid && !isMedianWebview) {
      // Prevent redirect loop if the user intentionally comes back to the browser
      if (sessionStorage.getItem("app_redirect_attempted")) return;
      sessionStorage.setItem("app_redirect_attempted", "true");

      // Instead of forcing an automatic redirect (which Chrome blocks due to no user gesture, causing the fallback timeout to incorrectly fire),
      // we show a prompt. Chrome requires a physical click to launch an app via intent.
      (window as any).showAppPrompt = true;
    }
  }, []);

  const [showPrompt, setShowPrompt] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).showAppPrompt) {
      setShowPrompt(true);
    }
  }, []);

  // Native Capacitor OneSignal Setup
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Check if we are running in a Capacitor native environment
    const isCapacitor = !!(window as any).Capacitor?.isNative;

    const setupOneSignal = async () => {
      try {
        const { default: OneSignal } = await import('@onesignal/capacitor-plugin');
        
        OneSignal.initialize("99906f9e-9dd2-4000-b559-0185efddc600");
        OneSignal.Notifications.requestPermission(true);

        import("@/integrations/supabase/client").then(({ supabase }) => {
          supabase.auth.getSession().then(({ data }) => {
            if (data.session?.user) {
              OneSignal.login(data.session.user.id);
            }
          });

          supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
              OneSignal.login(session.user.id);
            } else {
              OneSignal.logout();
            }
          });
        });
      } catch (e) {
        console.error("OneSignal initialization failed", e);
      }
    };

    if (isCapacitor) {
      setupOneSignal();
    }
  }, []);

  const handleOpenApp = () => {
    const pathAndQuery = window.location.pathname + window.location.search + window.location.hash;
    const packageName = "co.median.android.abxkxke";
    const playStoreFallback = `https://play.google.com/store/apps/details?id=${packageName}&pcampaignid=web_share`;

    // Using a custom scheme format to bypass same-domain intent blocks,
    // or standard intent with S.browser_fallback_url.
    const intentUrl = `intent://campusxpose.online${pathAndQuery}#Intent;scheme=https;package=${packageName};S.browser_fallback_url=${encodeURIComponent(playStoreFallback)};end;`;

    window.location.href = intentUrl;

    // Fallback if Chrome doesn't process the intent fallback correctly
    setTimeout(() => {
      if (!document.hidden) {
        window.location.href = playStoreFallback;
      }
    }, 1500);
  };

  const isCommunityChat = useMemo(() => pathname.startsWith("/community/"), [pathname]);
  const isAdmin = useMemo(() => pathname.startsWith("/admin/"), [pathname]);
  const isGlobal = useMemo(() => pathname === "/global", [pathname]);
  const isMessages = useMemo(() => pathname === "/messages", [pathname]);
  const isConfess = useMemo(() => pathname === "/confess", [pathname]);
  const isGames = useMemo(() => pathname.startsWith("/games/"), [pathname]);
  const hideNav = isCommunityChat || isAdmin || isGlobal || isMessages || isConfess || isGames;

  return (
    <QueryClientProvider client={queryClient}>
      {showPrompt && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm px-6 text-center animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-border max-w-sm w-full space-y-6">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-2">
              <img src="/logo.jpeg" alt="Logo" className="w-12 h-12 rounded-xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Open in App</h2>
              <p className="text-muted-foreground mt-2 font-sans text-sm">
                For the best experience, open this link in the CampusXpose app.
              </p>
            </div>
            <div className="space-y-3 pt-2">
              <Button onClick={handleOpenApp} className="w-full text-base py-6 shadow-md" size="lg">
                Continue in App
              </Button>
              <Button
                onClick={() => setShowPrompt(false)}
                variant="ghost"
                className="w-full text-muted-foreground"
              >
                Continue in Browser
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <div className={cn("md:pb-0", !hideNav && "pb-[calc(4rem+env(safe-area-inset-bottom))]")}>
        <Outlet />
      </div>
      {!hideNav && <MobileBottomNav />}
      <Toaster position="top-center" theme="light" richColors />
      <GlobalCallListener />
    </QueryClientProvider>
  );
}

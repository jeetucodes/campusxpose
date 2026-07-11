import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useMemo, type ReactNode } from "react";

import appCss from "../styles.css?url";
import favicon from "@/assets/favicon.png";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
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
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
      { name: "theme-color", content: "#111111" },
      { title: "CampusXpose — College ka sach, bina darr ke" },
      { name: "description", content: "Anonymous platform for Indian college students to rate colleges and report fake fines, placement fraud, and harassment." },
      { name: "author", content: "CampusXpose" },
      { name: "google-site-verification", content: "1BCMAogu2qMCNHNGQjFcQxKKiAa8183Lt1iPNZ1Y7s8" },
      { property: "og:title", content: "CampusXpose — College ka sach, bina darr ke" },
      { property: "og:description", content: "Anonymous platform for Indian college students to rate colleges and report fake fines, placement fraud, and harassment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "CampusXpose — College ka sach, bina darr ke" },
      { name: "twitter:description", content: "Anonymous platform for Indian college students to rate colleges and report fake fines, placement fraud, and harassment." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4775d11f-2679-4112-a831-752842265928/id-preview-b47b8bb1--5e5e5f3c-9e18-4ded-bf54-ed3632d01563.lovable.app-1782677617743.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4775d11f-2679-4112-a831-752842265928/id-preview-b47b8bb1--5e5e5f3c-9e18-4ded-bf54-ed3632d01563.lovable.app-1782677617743.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://mcobkriudveoevbrmrwi.supabase.co", crossOrigin: "anonymous" },
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
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const isCommunityChat = useMemo(() => pathname.startsWith("/community/"), [pathname]);
  const isAdmin = useMemo(() => pathname.startsWith("/admin/"), [pathname]);
  const isGlobal = useMemo(() => pathname === "/global", [pathname]);
  const isMessages = useMemo(() => pathname === "/messages", [pathname]);
  const isConfess = useMemo(() => pathname === "/confess", [pathname]);
  const hideNav = isCommunityChat || isAdmin || isGlobal || isMessages || isConfess;

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <div className={cn("md:pb-0", !hideNav && "pb-[calc(4rem+env(safe-area-inset-bottom))]")}>
        <Outlet />
      </div>
      {!hideNav && <MobileBottomNav />}
      <Toaster position="top-center" theme="light" richColors />

    </QueryClientProvider>
  );
}

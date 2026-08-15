import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteShell } from "@/components/Footer";

export const Route = createFileRoute("/store")({
  component: StoreRedirect,
});

function StoreRedirect() {
  useEffect(() => {
    // Redirect to the external store URL
    window.location.replace("https://www.cxshopp.store/");
  }, []);

  return (
    <SiteShell>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="h-16 w-16 animate-bounce rounded-full border-2 border-border bg-accent text-3xl shadow-sm flex items-center justify-center mb-6">
          🛍️
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Redirecting to CX Store...
        </h1>
        <p className="mt-2 text-muted-foreground font-medium max-w-md">
          Taking you to the best student deals. Hang on tight!
        </p>
      </div>
    </SiteShell>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, XCircle, AlertTriangle } from "lucide-react";
import { runProjectsMigration } from "@/lib/setup-projects.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ONE-TIME SETUP PAGE for Projects tables.
 * Visit /setup-projects once, then this page can be ignored.
 */
export const Route = createFileRoute("/setup-projects")({
  head: () => ({
    meta: [{ title: "DB Setup — CampusXpose" }, { name: "robots", content: "noindex" }],
  }),
  component: SetupPage,
});

function SetupPage() {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{
    steps: { step: string; ok: boolean; error?: string }[];
    verify: Record<string, boolean>;
  } | null>(null);

  const migrate = useServerFn(runProjectsMigration);

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const res = await migrate();
      setResult(res as any);
    } catch (e: any) {
      setResult({
        steps: [{ step: "Migration", ok: false, error: e?.message ?? "Unknown error" }],
        verify: {},
      });
    } finally {
      setRunning(false);
    }
  };

  const allVerified =
    result &&
    ["projects", "project_ratings", "collaborate_requests"].every(
      (t) => result.verify[t] === true,
    );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper p-4">
      <div
        className="w-full max-w-lg border-2 border-ink bg-white p-8 shadow-ink"
        style={{ borderRadius: "20px 6px 22px 6px / 6px 22px 6px 20px" }}
      >
        <h1 className="mb-2 font-display text-2xl font-black">🛠️ Projects DB Setup</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          This creates the 3 tables needed for the Projects feature:{" "}
          <code className="rounded bg-muted px-1 text-xs">projects</code>,{" "}
          <code className="rounded bg-muted px-1 text-xs">project_ratings</code>,{" "}
          <code className="rounded bg-muted px-1 text-xs">collaborate_requests</code>
        </p>

        <Button onClick={run} disabled={running} className="mb-6 w-full gap-2" size="lg">
          {running ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating tables…
            </>
          ) : (
            "🚀 Create Tables Now"
          )}
        </Button>

        {result && (
          <div className="space-y-4">
            {/* Step results */}
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                Migration Steps
              </h2>
              {result.steps.map((s, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border p-2.5 text-sm",
                    s.ok
                      ? "border-green-200 bg-green-50 text-green-800"
                      : "border-red-200 bg-red-50 text-red-800",
                  )}
                >
                  {s.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium">{s.step}</div>
                    {s.error && (
                      <div className="mt-0.5 truncate text-xs opacity-80">{s.error}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Verification */}
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                Table Verification
              </h2>
              {Object.entries(result.verify).map(([table, ok]) => (
                <div
                  key={table}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-mono",
                    ok
                      ? "border-green-200 bg-green-50 text-green-800"
                      : "border-red-200 bg-red-50 text-red-800",
                  )}
                >
                  {ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                  )}
                  {table} — {ok ? "✅ Ready" : "❌ Not found"}
                </div>
              ))}
            </div>

            {/* Status message */}
            {allVerified ? (
              <div className="rounded-xl border-2 border-green-400 bg-green-50 p-4 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-600" />
                <p className="font-bold text-green-800">All tables created! 🎉</p>
                <p className="mt-1 text-sm text-green-700">
                  Projects feature is now ready to use.
                </p>
                <Button
                  className="mt-3"
                  onClick={() => navigate({ to: "/projects/" })}
                >
                  Go to /projects →
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-bold text-amber-800">
                      Automated migration may have failed
                    </p>
                    <p className="mt-1 text-sm text-amber-700">
                      The Management API requires a Personal Access Token, not the service role
                      key. Please run the SQL manually in Supabase:
                    </p>
                    <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-amber-700">
                      <li>
                        Go to{" "}
                        <a
                          href="https://supabase.com/dashboard/project/tsmvnbtckrnxorhlovei/sql/new"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          Supabase SQL Editor ↗
                        </a>
                      </li>
                      <li>
                        Paste the SQL from{" "}
                        <code className="rounded bg-amber-100 px-1 text-xs">
                          supabase/migrations/20260701095000_projects_feature.sql
                        </code>
                      </li>
                      <li>Click Run</li>
                      <li>Come back here and click "Create Tables Now" again to verify</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

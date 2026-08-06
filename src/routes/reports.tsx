import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { getAllReports } from "@/lib/home.functions";
import { SiteShell } from "@/components/Footer";
import { UserSymbol } from "@/components/UserSymbol";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { categoryLabel, categoryEmoji } from "@/lib/categories";
import { timeAgo } from "@/lib/format";
import { ExpandableText } from "@/components/ExpandableText";
import { ArrowBigUp, ArrowLeft } from "lucide-react";
import { useVerifiedUsernames } from "@/hooks/useVerified";
import { Button } from "@/components/ui/button";

const reportsQueryOptions = queryOptions({
  queryKey: ["reports", "all"],
  queryFn: () => getAllReports(),
  staleTime: 5 * 60 * 1000,
});

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

const WOBBLY_MD = "25px 8px 22px 8px / 8px 22px 8px 25px";

function ReportsPage() {
  const { data: reports, isLoading } = useQuery(reportsQueryOptions);
  const verified = useVerifiedUsernames();

  return (
    <SiteShell hideFooter>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <div className="mb-8 flex items-center gap-4">
          <Link to="/">
            <Button variant="outline" size="icon" className="h-10 w-10 border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] transition-all">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-bold flex items-center gap-3">
            <span className="text-4xl">📰</span> All Reports
          </h1>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground font-bold">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Loading reports...
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-6 space-y-4 sm:space-y-6">
            {(reports ?? []).map((p, i) => {
              const card = (
                <div
                  className={`sketch-card relative p-4 sm:p-5 group transition-all hover:-translate-y-1 hover:shadow-ink-lg ${i % 2 ? "-rotate-1" : "rotate-1"} bg-white`}
                  style={{ borderRadius: WOBBLY_MD, breakInside: "avoid" }}
                >
                  <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground flex-wrap">
                    <UserSymbol username={p.username} size="sm" />
                    <span className="inline-flex items-center gap-1 font-bold text-foreground text-xs sm:text-sm">
                      {p.username ?? "Anonymous"}
                      {p.username && verified.has(p.username) && <VerifiedBadge />}
                    </span>
                    {p.created_at && (
                      <span className="font-medium text-[10px] sm:text-[11px] bg-muted px-2 py-0.5 rounded-full" suppressHydrationWarning>
                        {timeAgo(p.created_at)}
                      </span>
                    )}
                    <span className="ml-auto inline-flex items-center gap-1 sm:gap-1.5 border-2 border-border bg-green-100 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-xs font-bold text-green-700 rounded-md">
                      <ArrowBigUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {p.upvotes ?? 0}
                    </span>
                  </div>
                  <div className="mt-2.5 sm:mt-3 flex items-center gap-2">
                    <span className="border-2 border-border bg-yellow-100 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-bold text-yellow-800 rounded-md shadow-sm">
                      {categoryEmoji(p.category ?? "general")} {categoryLabel(p.category ?? "general")}
                    </span>
                  </div>
                  {p.college_name && (
                    <div className="mt-3 flex items-start gap-1.5 text-xs sm:text-sm font-bold text-accent bg-accent/5 p-2 rounded-lg border border-accent/20">
                      <span className="mt-0.5">🏫</span> <span className="line-clamp-2 leading-tight">{p.college_name}</span>
                    </div>
                  )}
                  <ExpandableText text={p.content || ""} />
                </div>
              );
              return p.college_id ? (
                <Link key={p.id} to="/colleges/$id" params={{ id: p.college_id }} className="block">
                  {card}
                </Link>
              ) : (
                <div key={p.id}>{card}</div>
              );
            })}
            {(!reports || reports.length === 0) && (
              <p className="text-center text-muted-foreground font-medium p-8 border-2 border-dashed border-border rounded-xl col-span-full">
                No reports found.
              </p>
            )}
          </div>
        )}
      </div>
    </SiteShell>
  );
}

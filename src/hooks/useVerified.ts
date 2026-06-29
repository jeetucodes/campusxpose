import { useQuery } from "@tanstack/react-query";
import { listVerifiedUsernames } from "@/lib/content.functions";

/** Returns a Set of usernames that carry a verified tick. Cached app-wide. */
export function useVerifiedUsernames(): Set<string> {
  const q = useQuery({
    queryKey: ["verified-usernames"],
    queryFn: () => listVerifiedUsernames(),
    staleTime: 5 * 60 * 1000,
  });
  return new Set(q.data?.usernames ?? []);
}

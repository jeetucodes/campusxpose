import { useQuery } from "@tanstack/react-query";
import { listAvatarOverrides } from "@/lib/content.functions";

/** Returns a Map of username -> custom avatar URL set by an admin. Cached app-wide. */
export function useAvatarOverrides(): Map<string, string> {
  const q = useQuery({
    queryKey: ["avatar-overrides"],
    queryFn: () => listAvatarOverrides(),
    staleTime: 30 * 1000,
  });
  return new Map((q.data?.overrides ?? []).map((o) => [o.username, o.url]));
}

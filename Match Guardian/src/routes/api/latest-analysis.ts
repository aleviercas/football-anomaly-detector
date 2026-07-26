import { createFileRoute } from "@tanstack/react-router";

// Resolve the latest analysis id for a given match id.
export const Route = createFileRoute("/api/latest-analysis")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const matchId = url.searchParams.get("match");
        if (!matchId) return Response.json({ id: null });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("analyses")
          .select("id")
          .eq("match_id", matchId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return Response.json({ id: data?.id ?? null });
      },
    },
  },
});

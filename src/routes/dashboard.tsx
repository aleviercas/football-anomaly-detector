import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Shell, verdictClass, verdictLabel } from "@/components/Shell";
import { listRecentAnalyses } from "@/lib/matches.functions";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Football Intel — Detector de Anomalías" },
      { name: "description", content: "Análisis recientes de anomalías en partidos de fútbol con score, veredicto y confianza." },
      { property: "og:title", content: "Dashboard de análisis — Football Intel — Detector de Anomalías" },
      { property: "og:description", content: "Últimos partidos analizados y su score de anomalía." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const doList = useServerFn(listRecentAnalyses);
  const q = useQuery({ queryKey: ["recent-analyses"], queryFn: () => doList() });
  const results = q.data?.results ?? [];

  return (
    <Shell title="Análisis recientes" subtitle="Los últimos partidos que hemos analizado. Filtra por veredicto para ir directo a los sospechosos.">
      {q.isLoading && <div className="text-sm text-muted-foreground">Cargando…</div>}
      {!q.isLoading && results.length === 0 && (
        <div className="p-8 border border-dashed border-border rounded-lg text-center">
          <div className="text-sm text-muted-foreground">Aún no hay análisis.</div>
          <Link to="/" className="text-emerald-400 hover:underline text-sm mt-2 inline-block">Buscar un partido →</Link>
        </div>
      )}

      <div className="grid gap-2">
        {results.map((r) => (
          <Link
            key={r.id}
            to="/match/$id"
            params={{ id: r.match_id }}
            className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card hover:border-emerald-500/40 transition-colors"
          >
            <ScoreBar score={r.overall_score} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {r.matches?.home_team} <span className="text-muted-foreground">vs</span> {r.matches?.away_team}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                {r.matches?.league ? `${r.matches.league} · ` : ""}
                {r.matches?.match_date ? new Date(r.matches.match_date).toLocaleDateString() : ""}
                {r.matches && r.matches.home_score != null && ` · ${r.matches.home_score}-${r.matches.away_score}`}
              </div>
            </div>
            <div className={`text-xs px-2 py-1 rounded border ${verdictClass(r.verdict)}`}>{verdictLabel(r.verdict)}</div>
            <div className="text-xs font-mono tabular-nums text-muted-foreground w-14 text-right">
              {(r.overall_score * 100).toFixed(0)}%
            </div>
          </Link>
        ))}
      </div>
    </Shell>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 0.75 ? "bg-red-500" : score >= 0.55 ? "bg-orange-500" : score >= 0.35 ? "bg-yellow-500" : "bg-emerald-500";
  return (
    <div className="w-1.5 h-10 rounded-full bg-muted/40 overflow-hidden relative shrink-0">
      <div className={`absolute bottom-0 left-0 right-0 ${color}`} style={{ height: `${Math.max(4, score * 100)}%` }} />
    </div>
  );
}

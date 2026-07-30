import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, AlertTriangle, ShieldCheck, CircleAlert } from "lucide-react";

import { Shell, verdictClass, verdictLabel } from "@/components/Shell";
import { getAnalysis } from "@/lib/matches.functions";
import { DETECTOR_LABELS } from "@/lib/detection/ensemble";

export const Route = createFileRoute("/match/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Análisis del partido — SmartFootball — Detector de Anomalías` },
      { name: "description", content: `Resultado de la detección de anomalías para el partido ${params.id}.` },
      { property: "og:title", content: "Análisis de partido — SmartFootball — Detector de Anomalías" },
      { property: "og:description", content: "Score de anomalía, detectores y evidencias." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MatchPage,
});

function MatchPage() {
  const { id } = Route.useParams();
  const doGet = useServerFn(getAnalysis);
  const q = useQuery({
    queryKey: ["match-analysis", id],
    // The analysis id is the match id in url — we resolve to the newest analysis for this match server-side.
    queryFn: async () => {
      // Small fetch chain: first look up latest analysis id for this match.
      const res = await fetch(`/api/latest-analysis?match=${id}`);
      const j: { id: string | null } = await res.json();
      if (!j.id) return { analysis: null, detectorScores: [] };
      return await doGet({ data: { id: j.id } });
    },
  });

  if (q.isLoading) return <Shell><div className="text-sm text-muted-foreground pt-8">Cargando análisis…</div></Shell>;
  const a = q.data?.analysis as AnalysisRow | null | undefined;
  const scores = (q.data?.detectorScores ?? []) as DetectorRow[];

  if (!a) {
    return (
      <Shell>
        <div className="pt-8">
          <Link to="/" className="text-sm text-emerald-400 hover:underline inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Volver</Link>
          <div className="mt-6 text-sm text-muted-foreground">No hay análisis para este partido.</div>
        </div>
      </Shell>
    );
  }

  const m = a.matches;
  const overall = Number(a.overall_score);
  const confidence = Number(a.confidence);
  const completeness = Number(a.data_completeness);

  return (
    <Shell>
      <div className="pt-8">
        <Link to="/anomaly-detector" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Detector de Anomalías</Link>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {m?.home_team} <span className="text-muted-foreground text-xl">vs</span> {m?.away_team}
          </h1>
          <div className="text-lg font-mono tabular-nums px-2 py-0.5 rounded bg-muted/40">
            {m?.home_score} - {m?.away_score}
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {m?.league ? `${m.league} · ` : ""}{m?.match_date && new Date(m.match_date).toLocaleString()}
        </div>
      </div>

      {/* Verdict card */}
      <section className="mt-8 grid md:grid-cols-3 gap-3">
        <div className={`p-5 rounded-xl border ${verdictClass(a.verdict)} md:col-span-2`}>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-80">
            {a.verdict === "clean" ? <ShieldCheck className="h-3.5 w-3.5" /> : a.verdict === "high_risk" ? <AlertTriangle className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
            Veredicto
          </div>
          <div className="text-3xl font-semibold mt-1">{verdictLabel(a.verdict)}</div>
          <div className="mt-4 flex items-end gap-3">
            <div className="text-5xl font-bold tabular-nums">{(overall * 100).toFixed(0)}<span className="text-xl opacity-60">%</span></div>
            <div className="text-xs opacity-70 pb-2">score global de anomalía</div>
          </div>
        </div>
        <div className="grid gap-3">
          <Meter label="Confianza" value={confidence} hint="Basada en completitud + acuerdo de detectores" />
          <Meter label="Completitud de datos" value={completeness} hint="Cuántas variables clave logramos recolectar" />
        </div>
      </section>

      {/* Detectors */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Detectores</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {scores.map((d) => {
            const score = Number(d.score);
            const reasons = (d.reasons ?? []) as string[];
            return (
              <div key={d.id} className="p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{DETECTOR_LABELS[d.detector] ?? d.detector}</div>
                  <div className="text-xs font-mono tabular-nums text-muted-foreground">{(score * 100).toFixed(0)}%</div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className={`h-full ${score >= 0.75 ? "bg-red-500" : score >= 0.55 ? "bg-orange-500" : score >= 0.35 ? "bg-yellow-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.max(2, score * 100)}%` }}
                  />
                </div>
                {reasons.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground list-disc list-inside">
                    {reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                )}
                <div className="mt-1 text-[10px] text-muted-foreground/70">peso {Number(d.weight).toFixed(2)}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Evidences */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Evidencias destacadas</h2>
        {a.evidences.length === 0 ? (
          <div className="text-sm text-muted-foreground">Ninguna señal significativa.</div>
        ) : (
          <div className="grid gap-2">
            {a.evidences.map((e, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border text-sm ${
                  e.severity === "high"
                    ? "border-red-500/30 bg-red-500/5 text-red-200"
                    : e.severity === "warn"
                    ? "border-orange-500/30 bg-orange-500/5 text-orange-200"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                <div className="text-[10px] uppercase tracking-wide opacity-70 mb-0.5">
                  {DETECTOR_LABELS[e.detector] ?? e.detector}
                </div>
                {e.message}
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mt-10 text-xs text-muted-foreground max-w-2xl">
        Este análisis es probabilístico y estadístico. Un score alto indica que el partido se aleja de los patrones esperados en varias dimensiones, no una acusación de amaño. Úsalo como punto de partida para investigar.
      </p>
    </Shell>
  );
}

function Meter({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold tabular-nums mt-1">{(value * 100).toFixed(0)}%</div>
      <div className="mt-2 h-1 rounded-full bg-muted/40 overflow-hidden">
        <div className="h-full bg-cyan-500" style={{ width: `${Math.max(2, value * 100)}%` }} />
      </div>
      {hint && <div className="text-[10px] text-muted-foreground/70 mt-1.5">{hint}</div>}
    </div>
  );
}

type AnalysisRow = {
  id: string;
  match_id: string;
  overall_score: number | string;
  verdict: string;
  confidence: number | string;
  data_completeness: number | string;
  evidences: { detector: string; severity: "info" | "warn" | "high"; message: string }[];
  matches: {
    home_team: string;
    away_team: string;
    league: string | null;
    match_date: string;
    home_score: number | null;
    away_score: number | null;
  } | null;
};

type DetectorRow = {
  id: string;
  detector: string;
  score: number | string;
  weight: number | string;
  reasons: unknown;
};

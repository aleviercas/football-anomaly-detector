import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Search, Loader2, Sparkles, ShieldAlert, TrendingUp, Zap, AlertTriangle } from "lucide-react";

import { Shell, verdictClass, verdictLabel } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { listProviders, searchMatches, analyzeMatch, listRecentAnalyses } from "@/lib/matches.functions";

export const Route = createFileRoute("/anomaly-detector")({
  head: () => ({
    meta: [
      { title: "Detector de Anomalías — SmartFootball" },
      { name: "description", content: "Detecta anomalías estadísticas en partidos de fútbol pasados usando 9 algoritmos: Isolation Forest, LOF, análisis bayesiano, Ley de Benford, patrones de amaño, temporal y más." },
      { property: "og:title", content: "Detector de Anomalías — SmartFootball" },
      { property: "og:description", content: "Análisis multi-algoritmo de partidos de fútbol para detectar anomalías y posibles amaños." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnomalyDetectorPage,
});

function isAuthError(err: unknown) {
  return err instanceof Error && /unauthorized/i.test(err.message);
}

function AnomalyDetectorPage() {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);

  // This module requires an account (analyses are tied to your history).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/login", search: { redirect: "/anomaly-detector" } });
      } else {
        setCheckingSession(false);
      }
    });
  }, [navigate]);

  const doListProviders = useServerFn(listProviders);
  const doSearch = useServerFn(searchMatches);
  const doAnalyze = useServerFn(analyzeMatch);
  const doListRecent = useServerFn(listRecentAnalyses);

  const providersQ = useQuery({ queryKey: ["providers"], queryFn: () => doListProviders(), enabled: !checkingSession });
  const recentQ = useQuery({ queryKey: ["recent-analyses"], queryFn: () => doListRecent(), enabled: !checkingSession });

  const [text, setText] = useState("");
  const searchM = useMutation({
    mutationFn: (q: string) => doSearch({ data: { text: q } }),
    onError: (err) => { if (isAuthError(err)) navigate({ to: "/login", search: { redirect: "/anomaly-detector" } }); },
  });
  const analyzeM = useMutation({
    mutationFn: (v: { provider: string; externalId: string; teamHint?: string; dateHint?: string }) =>
      doAnalyze({ data: v }),
    onSuccess: (res) => {
      if (res && !res.error && res.match) navigate({ to: "/match/$id", params: { id: res.match.id } });
    },
    onError: (err) => { if (isAuthError(err)) navigate({ to: "/login", search: { redirect: "/anomaly-detector" } }); },
  });

  const recent = recentQ.data?.results ?? [];

  if (checkingSession) {
    return (
      <Shell>
        <div className="pt-16 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Hero */}
      <section className="pt-16 pb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 text-xs font-medium mb-6">
          <Sparkles className="h-3.5 w-3.5" /> 9 algoritmos · cross-validation · datos oficiales
        </div>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
          ¿Ese partido fue <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">normal</span> o hay algo raro?
        </h1>
        <p className="text-muted-foreground text-lg mt-4 max-w-2xl">
          Analizamos partidos ya jugados con Isolation Forest, LOF, análisis bayesiano, Ley de Benford, movimiento de cuotas, patrones conocidos de amaño y análisis temporal. Cruzamos los resultados para reducir falsos positivos.
        </p>

        {/* Search */}
        <form
          className="mt-8 flex flex-col sm:flex-row gap-2 max-w-2xl"
          onSubmit={(e) => { e.preventDefault(); if (text.trim()) searchM.mutate(text.trim()); }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Buscar equipo (ej: Real Madrid, Barcelona, Liverpool)…"
              className="w-full pl-10 pr-4 h-12 rounded-lg bg-card border border-border focus:border-emerald-500/60 focus:outline-none transition-colors text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={searchM.isPending || !text.trim()}
            className="h-12 px-6 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-2 justify-center"
          >
            {searchM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar
          </button>
        </form>

        {/* Provider status */}
        {providersQ.isError && (
          <div className="mt-4 text-xs text-red-400">
            No se pudo consultar el estado de los proveedores de datos.
          </div>
        )}
        {providersQ.data && (
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {providersQ.data.enabled.length === 0 && (
              <span className="flex items-center gap-1 text-yellow-400">
                <AlertTriangle className="h-3.5 w-3.5" /> Sin proveedores de datos activos — configura API keys en Vercel.
              </span>
            )}
            {providersQ.data.enabled.map((p) => (
              <span key={p.id} className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {p.label} activo
              </span>
            ))}
            {providersQ.data.missingKeys.map((k) => (
              <span key={k} className="px-2 py-1 rounded-md bg-muted/40 text-muted-foreground border border-border">
                Falta {k}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Results */}
      {searchM.isError && !isAuthError(searchM.error) && (
        <section className="pt-4 pb-2">
          <div className="text-sm text-red-400">
            No se pudo completar la búsqueda ({searchM.error instanceof Error ? searchM.error.message : "error desconocido"}). Probá de nuevo en unos segundos.
          </div>
        </section>
      )}
      {analyzeM.isError && !isAuthError(analyzeM.error) && (
        <section className="pt-2 pb-2">
          <div className="text-sm text-red-400">
            No se pudo analizar el partido ({analyzeM.error instanceof Error ? analyzeM.error.message : "error desconocido"}).
          </div>
        </section>
      )}
      {searchM.data && (
        <section className="pt-4 pb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Resultados ({searchM.data.results.length})
          </h2>
          {searchM.data.error && (
            <div className="text-sm text-red-400 mb-3">Error: {searchM.data.error}</div>
          )}
          {searchM.data.results.length === 0 && !searchM.data.error && (
            <div className="text-sm text-muted-foreground">Sin resultados. Prueba con otro equipo.</div>
          )}
          <div className="grid gap-2">
            {searchM.data.results.map((r) => {
              const scoreShown = r.homeScore != null && r.awayScore != null;
              const isPending = analyzeM.isPending && analyzeM.variables?.externalId === r.externalId;
              return (
                <div
                  key={`${r.provider}-${r.externalId}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-emerald-500/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {r.homeTeam} <span className="text-muted-foreground">vs</span> {r.awayTeam}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {r.league ? `${r.league} · ` : ""}
                      {new Date(r.matchDate).toLocaleDateString()} · {r.provider}
                    </div>
                  </div>
                  {scoreShown && (
                    <div className="text-sm font-mono tabular-nums px-3 py-1 rounded bg-muted/40">
                      {r.homeScore} - {r.awayScore}
                    </div>
                  )}
                  <button
                    onClick={() => analyzeM.mutate({ provider: r.provider, externalId: r.externalId, teamHint: r.homeTeam, dateHint: r.matchDate })}
                    disabled={analyzeM.isPending || !scoreShown}
                    title={!scoreShown ? "Solo se pueden analizar partidos ya jugados" : "Analizar"}
                    className="text-xs font-medium px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black transition-colors disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    Analizar
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Method blurb */}
      <section className="mt-2 grid sm:grid-cols-3 gap-3">
        {[
          { icon: TrendingUp, title: "Isolation Forest + LOF", desc: "Detecta outliers en el vector de features del partido." },
          { icon: ShieldAlert, title: "Bayesian + Benford + Patrones", desc: "Combina probabilidades, integridad de datos y reglas conocidas de amaños." },
          { icon: Zap, title: "Cross-validation", desc: "Solo alertamos cuando varios detectores convergen." },
        ].map((f) => (
          <div key={f.title} className="p-4 rounded-lg border border-border bg-card/50">
            <f.icon className="h-4 w-4 text-emerald-400 mb-2" />
            <div className="text-sm font-medium">{f.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{f.desc}</div>
          </div>
        ))}
      </section>

      {/* Your history — same page, no separate dashboard */}
      <section className="mt-12">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Tu historial de análisis
        </h2>
        {recentQ.isLoading && <div className="text-sm text-muted-foreground">Cargando…</div>}
        {!recentQ.isLoading && recentQ.data?.dbConfigured === false && (
          <div className="p-4 border border-dashed border-border rounded-lg text-sm text-muted-foreground">
            El historial necesita Supabase configurado (ver README).
          </div>
        )}
        {!recentQ.isLoading && recentQ.data?.dbConfigured !== false && recent.length === 0 && (
          <div className="p-6 border border-dashed border-border rounded-lg text-center text-sm text-muted-foreground">
            Todavía no analizaste ningún partido. Buscá uno arriba para empezar.
          </div>
        )}
        <div className="grid gap-2">
          {recent.map((r) => (
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
      </section>
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

import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Circle } from "lucide-react";

import { Shell } from "@/components/Shell";

export const Route = createFileRoute("/modules")({
  head: () => ({
    meta: [
      { title: "Módulos — SmartFootball" },
      { name: "description", content: "Roadmap de módulos de SmartFootball: inteligencia de fútbol para fanáticos y clubes." },
    ],
  }),
  component: ModulesPage,
});

type Audience = "fans" | "clubs" | "both";

type ModuleInfo = {
  name: string;
  status: "active" | "planned";
  audience: Audience;
  description: string;
};

const MODULES: ModuleInfo[] = [
  {
    name: "Detector de Anomalías",
    status: "active",
    audience: "both",
    description:
      "Detecta posibles amaños o irregularidades estadísticas en partidos ya jugados: 9 algoritmos (estadístico, Isolation Forest, LOF, Bayesiano, Ley de Benford, patrones, temporal, movimiento de cuotas y modelo histórico).",
  },
  {
    name: "Comparador de Equipos",
    status: "planned",
    audience: "both",
    description:
      "Compará dos equipos cabeza a cabeza: historial de enfrentamientos, forma reciente, goles a favor/en contra, posesión, eficiencia por minuto de juego.",
  },
  {
    name: "Análisis de Resultados y Rendimiento",
    status: "planned",
    audience: "both",
    description:
      "Tendencias de resultados por competencia, local/visitante, rachas, puntos por partido esperados vs. reales (xPTS).",
  },
  {
    name: "Debilidades del Rival (Scouting)",
    status: "planned",
    audience: "clubs",
    description:
      "Identifica patrones débiles del próximo rival: qué banda ataca más, cómo defiende los córners, vulnerabilidad a la presión alta, jugadores con más pérdidas de balón bajo presión.",
  },
  {
    name: "Tácticas Probables del Rival",
    status: "planned",
    audience: "clubs",
    description:
      "A partir del historial reciente, predice la formación y el plan de partido más probable del rival (posesión vs. contragolpe, línea defensiva alta/baja, presión tras pérdida).",
  },
  {
    name: "Estilo de Juego y Estrategia",
    status: "planned",
    audience: "clubs",
    description:
      "Perfil de estilo (posesión, directo, presión, transición) por equipo y por entrenador, útil para preparar la charla técnica pre-partido.",
  },
  {
    name: "Informe de Rendimiento de Jugador",
    status: "planned",
    audience: "clubs",
    description:
      "Perfil individual: mapas de calor, duelos ganados/perdidos, carga física estimada, comparación contra jugadores de perfil similar en otras ligas (para fichajes).",
  },
  {
    name: "Sugerencia de Alineación / Rotaciones",
    status: "planned",
    audience: "clubs",
    description:
      "Recomienda la alineación óptima según el rival, el calendario de partidos (fatiga/rotación) y el historial de rendimiento en cada posición.",
  },
  {
    name: "Analítica de Mercado de Fichajes",
    status: "planned",
    audience: "clubs",
    description:
      "Identifica jugadores con perfil estadístico similar al que el club necesita, a un costo/edad objetivo, cruzando ligas y fuentes de datos.",
  },
  {
    name: "Predicción de Resultados",
    status: "planned",
    audience: "fans",
    description:
      "Probabilidades de resultado (1X2), marcador exacto y over/under basadas en forma reciente, historial y modelos estadísticos (no apuestas, solo predicción informativa).",
  },
  {
    name: "Alertas de Mercado de Cuotas en Vivo",
    status: "planned",
    audience: "both",
    description:
      "Notifica movimientos anómalos de cuotas antes/durante un partido en curso, para señalar posibles irregularidades en tiempo real (extensión natural del Detector de Anomalías).",
  },
  {
    name: "Panel de Comunicación de Riesgo Reputacional",
    status: "planned",
    audience: "clubs",
    description:
      "Para dirigentes/prensa del club: consolida menciones de amaño o controversia arbitral en medios y redes, con evidencia estadística de respaldo (o refutación).",
  },
];

const audienceLabel: Record<Audience, string> = {
  fans: "Fanáticos",
  clubs: "Clubes",
  both: "Fanáticos y clubes",
};

const audienceClass: Record<Audience, string> = {
  fans: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  clubs: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  both: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
};

function ModulesPage() {
  return (
    <Shell
      title="Módulos"
      subtitle="SmartFootball es una plataforma de inteligencia de fútbol construida por módulos. El Detector de Anomalías es el primero; el resto queda planificado sobre la misma base de datos de partidos, equipos y jugadores."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {MODULES.map((m) => (
          <div key={m.name} className="p-4 rounded-lg border border-border bg-card/40 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium text-sm flex items-center gap-2">
                {m.status === "active" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                {m.name}
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${
                  m.status === "active"
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                    : "text-muted-foreground bg-muted/30 border-border"
                }`}
              >
                {m.status === "active" ? "Activo" : "Próximamente"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{m.description}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border w-fit ${audienceClass[m.audience]}`}>
              {audienceLabel[m.audience]}
            </span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

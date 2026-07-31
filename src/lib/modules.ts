export type Audience = "fans" | "clubs" | "both";

export type ModuleInfo = {
  slug: string;
  name: string;
  status: "active" | "planned";
  audience: Audience;
  description: string;
  /** Route path, only set for active/clickable modules. */
  path?: string;
};

export const MODULES: ModuleInfo[] = [
  {
    slug: "anomaly-detector",
    name: "Detector de Anomalías",
    status: "active",
    audience: "both",
    path: "/anomaly-detector",
    description:
      "Detecta posibles amaños o irregularidades en partidos ya jugados: motor estadístico de 7 métodos (Z-score multivariado, Mahalanobis, PCA, Isolation Forest, One-Class SVM, DBSCAN, cambio de nivel) calibrado contra partidos históricos comparables, más señales de dominio (Bayesiano, Benford, patrones, cuotas). Analiza producción, posesión/pases, progresión, presión (PPDA), defensa y disciplina.",
  },
  {
    slug: "team-comparator",
    name: "Comparador de Equipos",
    status: "planned",
    audience: "both",
    description:
      "Compará dos equipos cabeza a cabeza: historial de enfrentamientos, forma reciente, goles a favor/en contra, posesión, eficiencia por minuto de juego.",
  },
  {
    slug: "results-performance",
    name: "Análisis de Resultados y Rendimiento",
    status: "planned",
    audience: "both",
    description:
      "Tendencias de resultados por competencia, local/visitante, rachas, puntos por partido esperados vs. reales (xPTS).",
  },
  {
    slug: "opponent-weaknesses",
    name: "Debilidades del Rival (Scouting)",
    status: "planned",
    audience: "clubs",
    description:
      "Identifica patrones débiles del próximo rival: qué banda ataca más, cómo defiende los córners, vulnerabilidad a la presión alta, jugadores con más pérdidas de balón bajo presión.",
  },
  {
    slug: "opponent-tactics",
    name: "Tácticas Probables del Rival",
    status: "planned",
    audience: "clubs",
    description:
      "A partir del historial reciente, predice la formación y el plan de partido más probable del rival (posesión vs. contragolpe, línea defensiva alta/baja, presión tras pérdida).",
  },
  {
    slug: "playing-style",
    name: "Estilo de Juego y Estrategia",
    status: "planned",
    audience: "clubs",
    description:
      "Perfil de estilo (posesión, directo, presión, transición) por equipo y por entrenador, útil para preparar la charla técnica pre-partido.",
  },
  {
    slug: "player-reports",
    name: "Informe de Rendimiento de Jugador",
    status: "planned",
    audience: "clubs",
    description:
      "Perfil individual: mapas de calor, duelos ganados/perdidos, carga física estimada, comparación contra jugadores de perfil similar en otras ligas (para fichajes).",
  },
  {
    slug: "lineup-suggestions",
    name: "Sugerencia de Alineación / Rotaciones",
    status: "planned",
    audience: "clubs",
    description:
      "Recomienda la alineación óptima según el rival, el calendario de partidos (fatiga/rotación) y el historial de rendimiento en cada posición.",
  },
  {
    slug: "transfer-analytics",
    name: "Analítica de Mercado de Fichajes",
    status: "planned",
    audience: "clubs",
    description:
      "Identifica jugadores con perfil estadístico similar al que el club necesita, a un costo/edad objetivo, cruzando ligas y fuentes de datos.",
  },
  {
    slug: "result-prediction",
    name: "Predicción de Resultados",
    status: "planned",
    audience: "fans",
    description:
      "Probabilidades de resultado (1X2), marcador exacto y over/under basadas en forma reciente, historial y modelos estadísticos (no apuestas, solo predicción informativa).",
  },
  {
    slug: "live-odds-alerts",
    name: "Alertas de Mercado de Cuotas en Vivo",
    status: "planned",
    audience: "both",
    description:
      "Notifica movimientos anómalos de cuotas antes/durante un partido en curso, para señalar posibles irregularidades en tiempo real (extensión natural del Detector de Anomalías).",
  },
  {
    slug: "reputational-risk",
    name: "Panel de Riesgo Reputacional",
    status: "planned",
    audience: "clubs",
    description:
      "Para dirigentes/prensa del club: consolida menciones de amaño o controversia arbitral en medios y redes, con evidencia estadística de respaldo (o refutación).",
  },
];

export const audienceLabel: Record<Audience, string> = {
  fans: "Fanáticos",
  clubs: "Clubes",
  both: "Fanáticos y clubes",
};

export const audienceClass: Record<Audience, string> = {
  fans: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  clubs: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  both: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
};

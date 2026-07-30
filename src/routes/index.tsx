import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Lock, Sparkles } from "lucide-react";

import { Shell } from "@/components/Shell";
import { MODULES, audienceLabel, audienceClass } from "@/lib/modules";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartFootball — Football, made smart" },
      { name: "description", content: "SmartFootball es una plataforma de inteligencia de fútbol por módulos, para fanáticos y clubes. Primer módulo: Detector de Anomalías en partidos ya jugados." },
      { property: "og:title", content: "SmartFootball" },
      { property: "og:description", content: "Football, made smart. Inteligencia de fútbol por módulos para fanáticos y clubes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <Shell>
      <section className="pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 text-xs font-medium mb-6">
          <Sparkles className="h-3.5 w-3.5" /> Inteligencia de fútbol por módulos
        </div>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.05]">
          Football, made <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">smart</span>.
        </h1>
        <p className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto">
          SmartFootball reúne, en una sola plataforma, las herramientas de inteligencia que fanáticos y clubes necesitan: desde detectar anomalías en partidos pasados hasta preparar el próximo rival.
        </p>
      </section>

      <section className="pb-16">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Módulos</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {MODULES.map((m) => {
            const card = (
              <div
                key={m.slug}
                className={`p-4 rounded-lg border bg-card/40 flex flex-col gap-2 transition-colors ${
                  m.status === "active"
                    ? "border-border hover:border-emerald-500/40 cursor-pointer"
                    : "border-border/60 opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {m.status === "active" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
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
            );
            return m.status === "active" && m.path ? (
              <Link key={m.slug} to={m.path} className="contents">
                {card}
              </Link>
            ) : (
              card
            );
          })}
        </div>
      </section>
    </Shell>
  );
}

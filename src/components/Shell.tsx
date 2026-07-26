import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, ChevronRight } from "lucide-react";

export function Shell({ children, title, subtitle }: { children: ReactNode; title?: string; subtitle?: string }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 backdrop-blur sticky top-0 z-10 bg-background/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Activity className="h-5 w-5 text-black" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Football Intel</div>
              <div className="text-[11px] text-muted-foreground -mt-0.5">Módulo: Detector de Anomalías</div>
            </div>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link to="/" className="px-3 py-1.5 rounded-md hover:bg-accent/50 transition-colors">Buscar</Link>
            <Link to="/dashboard" className="px-3 py-1.5 rounded-md hover:bg-accent/50 transition-colors">Dashboard</Link>
          </nav>
        </div>
      </header>
      {(title || subtitle) && (
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-6">
          {title && <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">{title}</h1>}
          {subtitle && <p className="text-muted-foreground mt-2 max-w-2xl">{subtitle}</p>}
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">{children}</main>
      <footer className="border-t border-border/60 py-6 text-xs text-muted-foreground">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-wrap gap-4 items-center justify-between">
          <span>Herramienta estadística exploratoria. No constituye prueba de amaño.</span>
          <span className="flex items-center gap-1">Detección basada en 8 algoritmos independientes <ChevronRight className="h-3 w-3" /></span>
        </div>
      </footer>
    </div>
  );
}

export function verdictClass(v: string) {
  switch (v) {
    case "clean": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    case "watch": return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
    case "suspicious": return "text-orange-400 bg-orange-500/10 border-orange-500/30";
    case "high_risk": return "text-red-400 bg-red-500/10 border-red-500/30";
    default: return "text-muted-foreground bg-muted/30 border-border";
  }
}

export function verdictLabel(v: string) {
  return {
    clean: "Sin anomalías",
    watch: "Bajo interés",
    suspicious: "Sospechoso",
    high_risk: "Alto riesgo",
  }[v] ?? v;
}

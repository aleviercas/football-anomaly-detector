import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

function BallIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 7.2l3.6 2.6-1.4 4.3H9.8l-1.4-4.3L12 7.2z"
        fill="currentColor"
      />
      <path
        d="M12 2.75v4.45M8.4 9.8L4.3 8.5M9.8 14.1l-2.7 3.7M14.2 14.1l2.7 3.7M15.6 9.8l4.1-1.3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoaded(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user, loaded };
}

export function Shell({ children, title, subtitle }: { children: ReactNode; title?: string; subtitle?: string }) {
  const { user, loaded } = useAuthUser();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 backdrop-blur sticky top-0 z-10 bg-background/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <BallIcon className="h-5 w-5 text-black" />
            </div>
            <div className="text-sm font-semibold tracking-tight">SmartFootball</div>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link to="/" className="px-3 py-1.5 rounded-md hover:bg-accent/50 transition-colors">Inicio</Link>
            {loaded && user && (
              <>
                <span className="hidden sm:inline px-2 text-xs text-muted-foreground truncate max-w-[160px]">{user.email}</span>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate({ to: "/" });
                  }}
                  className="px-3 py-1.5 rounded-md hover:bg-accent/50 transition-colors"
                >
                  Salir
                </button>
              </>
            )}
            {loaded && !user && (
              <Link to="/login" search={{ redirect: "/anomaly-detector" }} className="px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-medium transition-colors">
                Ingresar
              </Link>
            )}
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
          <span>SmartFootball · inteligencia de fútbol para fanáticos y clubes</span>
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

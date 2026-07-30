import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, LogIn, UserPlus } from "lucide-react";

import { Shell } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : "/anomaly-detector",
  }),
  head: () => ({
    meta: [{ title: "Ingresar — SmartFootball" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/login" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        navigate({ to: redirect });
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (data.session) {
          navigate({ to: redirect });
        } else {
          setNotice("Cuenta creada. Revisá tu email para confirmar la cuenta antes de ingresar.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la operación.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell
      title={mode === "signin" ? "Ingresar" : "Crear cuenta"}
      subtitle="SmartFootball registra tus análisis por cuenta, para que puedas volver a consultarlos."
    >
      <form onSubmit={onSubmit} className="max-w-sm grid gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 h-11 px-3 rounded-lg bg-card border border-border focus:border-emerald-500/60 focus:outline-none text-sm"
            placeholder="vos@club.com"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Contraseña</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 h-11 px-3 rounded-lg bg-card border border-border focus:border-emerald-500/60 focus:outline-none text-sm"
            placeholder="••••••••"
          />
        </div>

        {error && <div className="text-sm text-red-400">{error}</div>}
        {notice && <div className="text-sm text-emerald-400">{notice}</div>}

        <button
          type="submit"
          disabled={loading}
          className="h-11 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : mode === "signin" ? (
            <LogIn className="h-4 w-4" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {mode === "signin" ? "Ingresar" : "Crear cuenta"}
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setNotice(null); }}
          className="text-xs text-muted-foreground hover:text-foreground text-center mt-1"
        >
          {mode === "signin" ? "¿No tenés cuenta? Creá una" : "¿Ya tenés cuenta? Ingresá"}
        </button>
      </form>
    </Shell>
  );
}

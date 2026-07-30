# SmartFootball

**Football, made smart.** SmartFootball es una plataforma de inteligencia
de fútbol por módulos, pensada para venderse por suscripción a
**fanáticos** y a **clubes/confederaciones**. El home (`/`) es el hub de
módulos; cada módulo activo vive en su propia ruta.

## Módulo activo: Detector de Anomalías (`/anomaly-detector`)

Detecta posibles amaños/anomalías en partidos **ya jugados**, combinando:

- Motor multi-fuente automático (`src/lib/providers/`): API-Football,
  football-data.org y TheSportsDB, con fallback entre ellas.
- Ensemble de 9 algoritmos (`src/lib/detection/`): estadístico (Z-score/IQR),
  Isolation Forest, LOF, Bayesiano, Ley de Benford, patrones de amaño
  conocidos, análisis temporal, movimiento de cuotas y modelo histórico.

Requiere estar logueado (los análisis quedan asociados a tu cuenta, para
poder volver a consultarlos en la misma página — no hay un dashboard
separado).

## Cuentas de usuario

Login/registro con email y contraseña (`/login`), vía Supabase Auth. Cada
usuario ve solo su propio historial de análisis (tabla `user_analyses`);
la caché de partidos/análisis en sí es compartida entre cuentas, para no
volver a pedirle los mismos datos a las APIs externas.

## Configuración (variables de entorno)

```
API_FOOTBALL_KEY=tu_key_de_api-football.com
FOOTBALL_DATA_TOKEN=tu_token_de_football-data.org

# Supabase — server-side (persistencia + auth)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
SUPABASE_PUBLISHABLE_KEY=tu_anon_o_publishable_key

# Supabase — mismas credenciales, pero expuestas al navegador (login/signup).
# OJO: Vite solo inyecta variables VITE_* en el bundle del cliente, así que
# estas dos son imprescindibles para que el login funcione.
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_anon_o_publishable_key
```

En Vercel: Project Settings → Environment Variables. Después de agregarlas,
volvé a desplegar (un simple "Redeploy" alcanza).

### Cómo agregar/actualizar Supabase

1. Creá un proyecto gratis en [supabase.com](https://supabase.com) (si no
   lo hiciste ya).
2. En el SQL Editor, corré, en este orden:
   - `supabase/migrations/20260726190707_fa47131b-4db9-45e1-bddc-0eef58cd120d.sql`
     (tablas `matches`, `analyses`, `detector_scores`, etc.)
   - `supabase/migrations/20260731120000_user_analyses.sql`
     (tabla `user_analyses`, para el historial por cuenta)
3. En Project Settings → API, copiá la `Project URL` y las keys
   `anon`/`publishable` y `service_role`.
4. Cargalas en Vercel como se detalla arriba.
5. (Opcional para probar rápido) En Authentication → Providers → Email,
   podés desactivar "Confirm email" para no tener que configurar SMTP
   mientras testeás — en producción real conviene dejarlo activado.

> Regenerá cualquier key/token que se haya compartido fuera de un entorno
> seguro (chat, captura de pantalla, etc.) antes de usarla en producción.

## Roadmap de módulos (para clubes y fanáticos)

| Módulo | Para | Qué hace |
|---|---|---|
| ✅ Detector de Anomalías | Ambos | Posibles amaños/irregularidades en partidos pasados |
| Comparador de Equipos | Ambos | Cabeza a cabeza, historial, forma reciente |
| Análisis de Resultados y Rendimiento | Ambos | Tendencias, rachas, puntos esperados (xPTS) |
| Debilidades del Rival (Scouting) | Clubes | Patrones débiles del próximo rival |
| Tácticas Probables del Rival | Clubes | Predicción de plan de partido y formación rival |
| Estilo de Juego y Estrategia | Clubes | Perfil táctico por equipo/entrenador |
| Informe de Rendimiento de Jugador | Clubes | Mapas de calor, duelos, comparables para fichajes |
| Sugerencia de Alineación/Rotaciones | Clubes | Óptimo según rival, fatiga y calendario |
| Analítica de Mercado de Fichajes | Clubes | Búsqueda de jugadores por perfil estadístico |
| Predicción de Resultados | Fanáticos | Probabilidades 1X2, marcador, over/under |
| Alertas de Cuotas en Vivo | Ambos | Movimientos anómalos de cuotas en tiempo real |
| Panel de Riesgo Reputacional | Clubes | Monitoreo de menciones de amaño/controversia |

El código de este listado vive en `src/lib/modules.ts` (se renderiza en el
home) y en `MODULES` — agregar un módulo nuevo es agregar una entrada ahí
más su ruta.

## Desarrollo local

Necesitás Node.js 20+.

```sh
npm install
npm run dev
```

## Despliegue

Pensado para Vercel (`vercel.json` incluido, sin dependencias de Lovable ni
Cloudflare). El preset de Nitro está fijado en `"vercel"` en
`vite.config.ts`.

```sh
npm run build
```

## Instalable como PWA (celular)

Incluye `manifest.webmanifest` y un service worker (`public/sw.js`): desde
el navegador del celular se puede "Agregar a la pantalla de inicio" sin
pasar por App Store / Google Play.

## Stack

- TanStack Start · React 19 · TypeScript · Tailwind CSS · shadcn/ui
- Supabase (auth + persistencia de partidos/análisis)
- Nitro (preset `vercel`) para el build de producción

## Histórico

El prototipo original en Python/Flask (el primer detector de anomalías,
antes de fusionarse con el motor actual en TypeScript) queda archivado en
[`legacy-python-prototype/`](./legacy-python-prototype), sin borrar nada.

# SmartFootball

**SmartFootball** es una plataforma de inteligencia de fútbol, pensada para
venderse por suscripción a **fanáticos** y a **clubes**. Está construida
por módulos sobre una misma base de datos de partidos, equipos y
jugadores. Podés ver el roadmap completo (activo + planeado) en
`/modules` dentro de la propia app.

## Módulo activo: Detector de Anomalías

Detecta posibles amaños/anomalías en partidos **ya jugados**, combinando:

- Motor multi-fuente automático (`src/lib/providers/`): API-Football,
  football-data.org y TheSportsDB, con fallback entre ellas.
- Ensemble de 9 algoritmos (`src/lib/detection/`): estadístico (Z-score/IQR),
  Isolation Forest, LOF, Bayesiano, Ley de Benford, patrones de amaño
  conocidos, análisis temporal, movimiento de cuotas y modelo histórico.

Funciona **con o sin Supabase configurado**: si no hay credenciales de
Supabase, analiza igual (sin guardar historial); si las agregás, además
persiste cada partido/análisis para el Dashboard.

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

## Configuración (variables de entorno)

```
API_FOOTBALL_KEY=tu_key_de_api-football.com
FOOTBALL_DATA_TOKEN=tu_token_de_football-data.org

# Opcional pero recomendado (habilita historial/Dashboard):
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

En Vercel: Project Settings → Environment Variables.

### Cómo agregar Supabase (para que el Dashboard guarde historial)

1. Creá un proyecto gratis en [supabase.com](https://supabase.com).
2. En el SQL Editor, corré el contenido de
   `supabase/migrations/20260726190707_fa47131b-4db9-45e1-bddc-0eef58cd120d.sql`
   (crea las tablas `matches`, `analyses`, `detector_scores`).
3. En Project Settings → API, copiá la `Project URL` y la
   `service_role` key.
4. Cargalas en Vercel como `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, y
   volvé a desplegar.

> Regenerá cualquier key/token que se haya compartido fuera de un entorno
> seguro (chat, captura de pantalla, etc.) antes de usarla en producción.

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
- Supabase (opcional — persistencia de partidos y análisis)
- Nitro (preset `vercel`) para el build de producción

## Histórico

El prototipo original en Python/Flask (el primer detector de anomalías,
antes de fusionarse con el motor actual en TypeScript) queda archivado en
[`legacy-python-prototype/`](./legacy-python-prototype), sin borrar nada.

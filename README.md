# Football Anomaly

Detección de anomalías y posibles amaños en partidos de fútbol **ya jugados**.
Football Anomaly combina, en una sola app:

- Los algoritmos avanzados que ya existían en el prototipo de **Match Guardian**
  (TanStack Start + React 19 + TypeScript): Isolation Forest, Local Outlier
  Factor, análisis Bayesiano, detección de patrones de amaño conocidos,
  análisis temporal y movimiento de cuotas.
- La **Ley de Benford** (`src/lib/detection/benford.ts`), portada del
  prototipo original en Python (`football-anomaly-detector`), como señal
  extra de integridad de los datos.
- Un **motor de datos multi-fuente** (`src/lib/providers/chain.ts`) que
  busca y combina automáticamente estadísticas desde varias APIs, con
  fallback entre ellas cuando a una le falta un dato:
  1. [API-Football](https://www.api-football.com/) — `API_FOOTBALL_KEY`
  2. [football-data.org](https://www.football-data.org/) — `FOOTBALL_DATA_TOKEN`
  3. TheSportsDB (gratuita, sin key) como respaldo adicional

El código Python original queda archivado, sin borrar nada, en
[`legacy-python-prototype/`](./legacy-python-prototype) por si querés
recuperar alguna idea puntual de ahí.

## Cómo funciona

1. El usuario busca un partido ya jugado (equipo, fecha, liga).
2. `chainSearch`/`chainDetail` recorren los proveedores disponibles y arman
   un único `MatchData` combinando lo mejor de cada fuente.
3. `runAnalysis` (`src/lib/detection/ensemble.ts`) corre **9 detectores**
   en paralelo (estadístico, Isolation Forest, LOF, Bayesiano, patrones,
   temporal, movimiento de cuotas, ML histórico y Benford), pondera sus
   resultados y valida cruzado cuando varios coinciden.
4. Se muestra un veredicto (`clean` / `watch` / `suspicious` / `high_risk`)
   con la evidencia detallada de cada algoritmo.

## Configuración (variables de entorno)

Creá un archivo `.env` (no se sube al repo) con:

```
API_FOOTBALL_KEY=tu_key_de_api-football.com
FOOTBALL_DATA_TOKEN=tu_token_de_football-data.org
```

> Importante: regenerá cualquier key/token que se haya compartido fuera de
> un entorno seguro (chat, captura de pantalla, etc.) antes de usarla en
> producción.

## Desarrollo local

Necesitás Node.js 20+.

```sh
npm install
npm run dev
```

## Build de producción

```sh
npm run build
```

## Instalable como PWA (celular)

La app incluye `manifest.webmanifest` y un service worker
(`public/sw.js`), así que desde el navegador del celular (Chrome/Safari)
se puede "Agregar a la pantalla de inicio" y queda instalada como una app
nativa, sin pasar por App Store / Google Play. Si más adelante querés una
app nativa real (para las tiendas), el siguiente paso natural es envolver
este mismo proyecto con [Capacitor](https://capacitorjs.com/).

## Stack

- TanStack Start · React 19 · TypeScript · Tailwind CSS · shadcn/ui
- Supabase (persistencia opcional de análisis pasados)
- Despliegue vía Nitro (Cloudflare Workers) o cualquier host Node

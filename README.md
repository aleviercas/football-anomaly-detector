# Football Intel

**Football Intel** es una plataforma de inteligencia de fútbol. La idea es
que crezca como un conjunto de módulos —pensados tanto para fanáticos como
para clubes— construidos sobre una misma base de datos de partidos,
equipos y jugadores.

## Módulos

### ✅ Detector de Anomalías (activo)

Detecta posibles amaños/anomalías en partidos **ya jugados**, combinando:

- Motor multi-fuente automático (`src/lib/providers/`): API-Football,
  football-data.org y TheSportsDB, con fallback entre ellas.
- Ensemble de 9 algoritmos (`src/lib/detection/`): estadístico (Z-score/IQR),
  Isolation Forest, LOF, Bayesiano, Ley de Benford, patrones de amaño
  conocidos, análisis temporal, movimiento de cuotas y modelo histórico.

### 🔜 Próximos módulos (ver roadmap más abajo)

Pensado para escalar a un producto por suscripción, con un plan para
fanáticos y otro para clubes/cuerpos técnicos.

## Configuración (variables de entorno)

```
API_FOOTBALL_KEY=tu_key_de_api-football.com
FOOTBALL_DATA_TOKEN=tu_token_de_football-data.org
```

En Vercel: Project Settings → Environment Variables.

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
- Supabase (persistencia de partidos y análisis)
- Nitro (preset `vercel`) para el build de producción

## Histórico

El prototipo original en Python/Flask (el primer detector de anomalías,
antes de fusionarse con el motor actual en TypeScript) queda archivado en
[`legacy-python-prototype/`](./legacy-python-prototype), sin borrar nada.

import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// Standalone Vite config for Football Anomaly — no Lovable tooling involved.
// Deploys as a normal TanStack Start (Nitro) app. The "vercel" preset makes
// Nitro build server output for Vercel's Node runtime.
export default defineConfig({
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts,
      // our SSR wrapper that turns crashes into a friendly error page
      // instead of a bare 500.
      server: { entry: "server" },
    }),
    viteReact(),
    nitro({ preset: "vercel" }),
  ],
});

import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
//
// By default this middleware compares the request's Origin header against
// the origin of `ctx.request.url` — but behind Vercel's proxy that URL is
// often built from the internal 127.0.0.1 address the Node function actually
// listens on, not the public domain, so every legitimate request was being
// rejected (search/analyze silently doing nothing in the browser). Instead
// we explicitly whitelist the domains this deployment can actually be
// reached at, which Vercel exposes via env vars at runtime.
function allowedOrigins(): string[] {
  const hosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.PUBLIC_APP_ORIGIN?.replace(/^https?:\/\//, ""),
  ].filter((h): h is string => Boolean(h));
  return hosts.map((h) => `https://${h}`);
}

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
  origin: (origin) => {
    if (origin === "http://localhost:3000" || origin === "http://127.0.0.1:3000") return true;
    if (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return true;
    return allowedOrigins().includes(origin);
  },
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));

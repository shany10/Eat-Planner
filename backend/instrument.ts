import * as Sentry from "@sentry/node";
import "dotenv/config";

// Initialise Sentry/GlitchTip as early as possible — this file is imported on
// the very first line of index.ts, before express and any instrumented module.
// The DSN is read from the environment so it can point to "glitchtip-web" inside
// Docker and to "localhost" when running the backend directly on the host.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  // Share of transactions sampled for performance tracing (0 to 1).
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.01),
  // Disable all telemetry when no DSN is configured (e.g. local dev / CI).
  enabled: Boolean(process.env.SENTRY_DSN),
});

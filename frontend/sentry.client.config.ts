import * as Sentry from '@sentry/nuxt'

// Browser-side error reporting to GlitchTip.
// The DSN host must be reachable from the user's browser, i.e. localhost:8000
// (see NUXT_PUBLIC_SENTRY_DSN). An empty DSN disables the SDK, which is the
// safe default when monitoring is not configured.
const dsn = useRuntimeConfig().public.sentry?.dsn

Sentry.init({
  dsn,
  environment: import.meta.dev ? 'development' : 'production',
  // Share of transactions sampled for performance tracing (0 to 1).
  tracesSampleRate: 0.1
})

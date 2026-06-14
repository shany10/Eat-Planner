import * as Sentry from '@sentry/nuxt'

// Server-side (Nitro SSR) error reporting to GlitchTip.
// This code runs inside the frontend container, so the DSN host must be the
// docker service name "glitchtip-web" (see SENTRY_SERVER_DSN), not localhost.
// An empty DSN disables the SDK.
const dsn = useRuntimeConfig().sentry?.serverDsn

Sentry.init({
  dsn,
  environment: import.meta.dev ? 'development' : 'production',
  tracesSampleRate: 0.1
})

// https://nuxt.com/docs/api/configuration/nuxt-config
const env = (globalThis as typeof globalThis & {
  process?: {
    env: Record<string, string | undefined>
  }
}).process?.env ?? {}

// Umami analytics: only inject the tracking script when both the script source
// and the website id are configured, so nothing breaks when analytics is off.
const umamiSrc = env.NUXT_PUBLIC_UMAMI_SRC || ''
const umamiWebsiteId = env.NUXT_PUBLIC_UMAMI_WEBSITE_ID || ''
const umamiScript = umamiSrc && umamiWebsiteId
  ? [{ 'src': umamiSrc, 'defer': true, 'data-website-id': umamiWebsiteId }]
  : []
const sentryEnabled = Boolean(env.NUXT_PUBLIC_SENTRY_DSN || env.SENTRY_SERVER_DSN)
const modules = ['@nuxt/eslint', '@nuxt/ui', '@pinia/nuxt']

if (sentryEnabled) {
  modules.push('@sentry/nuxt/module')
}

const nuxtConfig = defineNuxtConfig({
  modules,

  // Register components without the directory prefix so shared primitives in
  // `components/common` are usable by their bare name (<AppButton>, <PageHeader>,
  // <AppBadge>…) instead of <CommonAppButton>. Basenames are unique across the
  // components tree, so there are no collisions.
  components: [{ path: '~/components', pathPrefix: false }],

  app: {
    head: {
      script: umamiScript
    }
  },

  devtools: {
    enabled: env.NODE_ENV === 'development' && env.NUXT_DEVTOOLS === 'true'
  },

  css: ['~/assets/css/tailwind.css'],
  colorMode: {
    preference: 'system',
    fallback: 'light',
    classSuffix: ''
  },
  runtimeConfig: {
    backendBaseUrl: env.NUXT_BACKEND_BASE_URL || 'http://backend:3000',
    // Server-side (SSR) Sentry DSN — host must be the docker service glitchtip-web.
    sentry: {
      serverDsn: env.SENTRY_SERVER_DSN || ''
    },
    public: {
      googleClientId: env.NUXT_PUBLIC_GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID || '',
      realtimeBaseUrl: env.NUXT_PUBLIC_REALTIME_BASE_URL || 'http://localhost:3000',
      // Serveurs ICE pour la visio WebRTC.
      // - En local, le STUN public Google suffit (les pairs se joignent en direct).
      // - En prod derriere des NAT/firewalls stricts, renseigne un serveur TURN
      //   (ex: coturn) via ces variables, sinon l appel echoue a se connecter.
      stunUrl: env.NUXT_PUBLIC_STUN_URL || 'stun:stun.l.google.com:19302',
      turnUrl: env.NUXT_PUBLIC_TURN_URL || '',
      turnUsername: env.NUXT_PUBLIC_TURN_USERNAME || '',
      turnCredential: env.NUXT_PUBLIC_TURN_CREDENTIAL || '',
      // Browser-side Sentry DSN — host must be localhost (reachable from the browser).
      sentry: {
        dsn: env.NUXT_PUBLIC_SENTRY_DSN || ''
      }
    }
  },

  // css: ['~/assets/css/main.css'],

  devServer: {
    host: '0.0.0.0',
    port: 3001
  },
  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})

if (sentryEnabled) {
  Object.assign(nuxtConfig, {
    // Self-hosted GlitchTip: disable source map upload to sentry.io (no auth token).
    sentry: {
      sourceMapsUploadOptions: {
        enabled: false
      }
    }
  })
}

export default nuxtConfig

// https://nuxt.com/docs/api/configuration/nuxt-config
const env = (globalThis as typeof globalThis & {
  process?: {
    env: Record<string, string | undefined>
  }
}).process?.env ?? {}

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@pinia/nuxt'],

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
    public: {
      googleClientId: env.NUXT_PUBLIC_GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID || ''
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

<script setup>
import BusinessNav from '~/components/layout/BusinessNav.vue'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

function toggleColorMode() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  htmlAttrs: {
    lang: 'fr'
  }
})
</script>

<template>
  <div class="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f8fafc_35%,#f8fafc_100%)] text-slate-900 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_35%,#020617_100%)] dark:text-slate-100">
    <header class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 dark:border-slate-800 dark:bg-slate-950/95">
      <div class="flex items-center justify-between gap-4 px-4 py-4 lg:px-6">
        <NuxtLink
          to="/"
          class="group flex items-center gap-3"
        >
          <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-lg font-semibold text-white shadow-sm dark:bg-white dark:text-slate-900">
            EP
          </div>
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
              Eat Planner
            </p>
            <p class="text-sm font-medium text-slate-700 dark:text-slate-200">
              Rentabilite & production
            </p>
          </div>
        </NuxtLink>

        <div class="flex items-center gap-2">
          <button
            class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            @click="toggleColorMode"
          >
            {{ isDark ? 'Clair' : 'Sombre' }}
          </button>

          <template v-if="!isAuthenticated">
            <NuxtLink to="/login">
              <button class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Login
              </button>
            </NuxtLink>
            <NuxtLink to="/register">
              <button class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-900">
                Register
              </button>
            </NuxtLink>
          </template>
        </div>
      </div>
    </header>

    <main v-if="isAuthenticated">
      <div class="grid min-h-[calc(100vh-76px)] lg:grid-cols-[320px_minmax(0,1fr)]">
        <div class="border-b border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-950/95 lg:border-b-0 lg:border-r">
          <BusinessNav />
        </div>
        <div class="min-w-0 px-4 py-8 lg:px-8">
          <div class="mx-auto w-full max-w-6xl">
            <NuxtPage />
          </div>
        </div>
      </div>
    </main>

    <main
      v-else
      class="mx-auto max-w-7xl px-4 py-8"
    >
      <NuxtPage />
    </main>
  </div>
</template>

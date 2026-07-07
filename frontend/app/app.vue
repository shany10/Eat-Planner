<script setup lang="ts">
import BusinessNav from '~/components/layout/BusinessNav.vue'
import GlobalSearch from '~/components/layout/GlobalSearch.vue'
import NotificationBell from '~/components/layout/NotificationBell.vue'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
const hasMounted = ref(false)
const themeButtonLabel = computed(() => (hasMounted.value && isDark.value ? 'Clair' : 'Sombre'))
const themeButtonIcon = computed(() => (hasMounted.value && isDark.value ? 'i-lucide-sun' : 'i-lucide-moon'))
const themeButtonAriaLabel = computed(() => (hasMounted.value && isDark.value ? 'Activer le mode clair' : 'Activer le mode sombre'))
const appToast = useAppToast()
const logoError = ref(false)

onMounted(() => {
  hasMounted.value = true
})

function toggleColorMode() {
  const nextPreference = isDark.value ? 'light' : 'dark'
  colorMode.preference = nextPreference
  appToast.info(nextPreference === 'dark' ? 'Mode sombre active' : 'Mode clair active')
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
  <UApp :toaster="{ position: 'top-right', expand: true, progress: true }">
    <div class="app-shell">
      <header class="app-topbar">
        <div class="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <NuxtLink
            to="/"
            class="group flex min-w-0 items-center gap-3"
          >
            <img
              v-if="!logoError"
              src="/logo.png"
              alt="Eat Planner"
              class="h-10 w-10 shrink-0 rounded-[1rem] object-contain"
              @error="logoError = true"
            >
            <div
              v-else
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-[#6b3414] text-sm font-bold text-white shadow-sm"
            >
              EP
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-bold text-[#1a1c1c] dark:text-white font-['Be_Vietnam_Pro',sans-serif]">
                Eat Planner
              </p>
              <p class="truncate text-xs text-[#40493e] dark:text-[#c0c9ba]">
                Pilotage restaurant
              </p>
            </div>
          </NuxtLink>

          <div class="flex shrink-0 items-center gap-2 sm:gap-3">
            <template v-if="isAuthenticated">
              <GlobalSearch class="hidden md:block" />

              <NotificationBell />
            </template>

            <button
              class="inline-flex items-center gap-2 rounded-full border border-[#c0c9ba]/40 px-4 py-2 text-sm font-bold text-[#40493e] transition hover:bg-[#f3f3f3] dark:border-white/10 dark:text-[#c0c9ba] dark:hover:bg-[#2f3131]"
              :aria-label="themeButtonAriaLabel"
              :title="themeButtonLabel"
              @click="toggleColorMode"
            >
              <UIcon
                :name="themeButtonIcon"
                class="size-4"
              />
              <span class="hidden sm:inline">{{ themeButtonLabel }}</span>
            </button>

            <template v-if="!isAuthenticated">
              <NuxtLink
                to="/login"
                class="inline-flex items-center gap-2 rounded-full border border-[#707a6d] px-5 py-2 text-sm font-bold text-[#1a1c1c] transition hover:bg-[#f3f3f3] dark:border-[#c0c9ba] dark:text-white dark:hover:bg-[#2f3131]"
              >
                Login
              </NuxtLink>
              <NuxtLink
                to="/register"
                class="inline-flex items-center gap-2 rounded-full bg-[#feb236] px-5 py-2 text-sm font-bold text-[#6d4700] shadow-sm transition-all hover:bg-[#ffc059] hover:shadow-md"
              >
                Register
              </NuxtLink>
            </template>
          </div>
        </div>
      </header>

      <main v-if="isAuthenticated">
        <div class="grid min-h-[calc(100vh-65px)] w-full lg:grid-cols-[260px_minmax(0,1fr)]">
          <div class="h-full">
            <BusinessNav />
          </div>
          <div class="app-content bg-[#f9f9f9] dark:bg-[#131514]">
            <div class="mx-auto w-full max-w-6xl">
              <NuxtPage />
            </div>
          </div>
        </div>
      </main>

      <main
        v-else
        class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
      >
        <NuxtPage />
      </main>
    </div>
  </UApp>
</template>

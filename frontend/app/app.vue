<script setup lang="ts">
import BusinessNav from '~/components/layout/BusinessNav.vue'
import BusinessBottomNav from '~/components/layout/BusinessBottomNav.vue'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
const hasMounted = ref(false)
const themeButtonLabel = computed(() => (hasMounted.value && isDark.value ? 'Clair' : 'Sombre'))
const themeButtonIcon = computed(() => (hasMounted.value && isDark.value ? 'i-lucide-sun' : 'i-lucide-moon'))
const themeButtonAriaLabel = computed(() => (hasMounted.value && isDark.value ? 'Activer le mode clair' : 'Activer le mode sombre'))

const { collapsed, toggle: toggleSidebar } = useSidebar()
const { ensureProfileLoaded } = useBusinessNav()

onMounted(() => {
  hasMounted.value = true
  if (isAuthenticated.value) {
    ensureProfileLoaded()
  }
})

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
  <UApp :toaster="{ position: 'top-right', expand: true, progress: true }">
    <div class="app-shell">
      <header class="app-topbar">
        <div class="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div class="flex min-w-0 items-center gap-3">
            <UTooltip
              v-if="isAuthenticated"
              :text="collapsed ? 'Agrandir le menu' : 'Reduire le menu'"
            >
              <button
                type="button"
                class="btn-secondary !px-2 hidden lg:inline-flex"
                :aria-label="collapsed ? 'Agrandir le menu' : 'Reduire le menu'"
                :aria-expanded="!collapsed"
                @click="toggleSidebar"
              >
                <UIcon
                  :name="collapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
                  class="size-4"
                />
              </button>
            </UTooltip>

            <NuxtLink
              to="/"
              class="group flex min-w-0 items-center gap-3"
            >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white shadow-sm dark:bg-white dark:text-slate-950">
              EP
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-slate-950 dark:text-white">
                Eat Planner
              </p>
              <p class="truncate text-xs text-slate-500 dark:text-slate-400">
                Pilotage restaurant
              </p>
            </div>
            </NuxtLink>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <button
              class="btn-secondary !px-3"
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
                class="btn-secondary"
              >
                Login
              </NuxtLink>
              <NuxtLink
                to="/register"
                class="btn-primary"
              >
                Register
              </NuxtLink>
            </template>
          </div>
        </div>
      </header>

      <main v-if="isAuthenticated">
        <div
          class="mx-auto grid max-w-[1500px] transition-[grid-template-columns] duration-200 ease-out lg:h-[calc(100vh-65px)] lg:overflow-hidden"
          :class="collapsed ? 'lg:grid-cols-[88px_minmax(0,1fr)]' : 'lg:grid-cols-[280px_minmax(0,1fr)]'"
        >
          <div class="app-sidebar hidden h-full overflow-hidden lg:block">
            <BusinessNav />
          </div>
          <div class="app-content h-full pb-24 lg:overflow-y-auto lg:pb-0">
            <div class="mx-auto w-full max-w-6xl">
              <NuxtPage />
            </div>
          </div>
        </div>
        <BusinessBottomNav />
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

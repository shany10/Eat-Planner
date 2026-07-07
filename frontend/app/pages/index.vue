<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import EmptyStateCard from '~/components/common/EmptyStateCard.vue'
import type { ManagedUser } from '~/types/access'
import { useAuthStore } from '~/stores/auth'
import { useChargeStore } from '~/stores/charges'
import { useDishStore } from '~/stores/dishes'
import { useForecastStore } from '~/stores/forecasts'
import { useIngredientStore } from '~/stores/ingredients'
import { usePurchaseOrderStore } from '~/stores/purchase-orders'
import { useSaleStore } from '~/stores/sales'

definePageMeta({
  middleware: 'auth'
})

const authStore = useAuthStore()
const ingredientStore = useIngredientStore()
const dishStore = useDishStore()
const chargeStore = useChargeStore()
const saleStore = useSaleStore()
const forecastStore = useForecastStore()
const purchaseOrderStore = usePurchaseOrderStore()
const appToast = useAppToast()

const users = ref<ManagedUser[]>([])
const loading = ref(true)
const errorMessage = ref('')
const lastUpdatedAt = ref<Date | null>(null)

type DashboardStat = {
  title: string
  value: string | number
  hint: string
}

type DashboardStep = {
  title: string
  to: string
  count: number
  ready: boolean
}

type DashboardAlert = {
  title: string
  to: string
  action: string
}

type DashboardAction = {
  label: string
  to: string
  icon: string
}

const profile = computed(() => authStore.profile)
const isAdmin = computed(() => profile.value?.role === 'admin')
const isSupplier = computed(() => profile.value?.role === 'supplier')
const firstName = computed(() => profile.value?.firstname || 'Equipe')
const restaurantName = computed(() => profile.value?.restaurantName || 'Restaurant')
const roleLabel = computed(() => isAdmin.value ? 'Admin' : isSupplier.value ? 'Fournisseur' : 'Manager')

const projectedRevenue = computed(() => forecastStore.forecast?.totals.totalProjectedRevenue ?? 0)
const projectedPlates = computed(() => forecastStore.forecast?.totals.totalProjectedPlates ?? 0)
const ingredientNeedsCount = computed(() => forecastStore.forecast?.ingredientNeeds.length ?? 0)
const openPurchaseOrderCount = computed(() => purchaseOrderStore.openOrders.length)
const managerCount = computed(() => users.value.filter(user => user.role === 'manager').length)
const inactiveUserCount = computed(() => users.value.filter(user => !user.active).length)
const latestSale = computed(() =>
  [...saleStore.items].sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())[0] ?? null
)

const twoFactorCoverage = computed(() => {
  if (users.value.length === 0) {
    return profile.value?.twoFactorEnabled ? 100 : 0
  }

  return Math.round((users.value.filter(user => user.twoFactorEnabled).length / users.value.length) * 100)
})

const setupSteps = computed<DashboardStep[]>(() => [
  { title: 'Ingredients', to: '/ingredients', count: ingredientStore.items.length, ready: ingredientStore.items.length > 0 },
  { title: 'Fournisseurs', to: '/suppliers', count: ingredientStore.items.filter(item => item.supplier).length, ready: ingredientStore.items.some(item => item.supplier) },
  { title: 'Plats', to: '/dishes', count: dishStore.items.length, ready: dishStore.items.length > 0 },
  { title: 'Charges', to: '/charges', count: chargeStore.items.length, ready: chargeStore.items.length > 0 },
  { title: 'Ventes', to: '/sales', count: saleStore.items.length, ready: saleStore.items.length > 0 }
])

const setupProgress = computed(() => {
  const completed = setupSteps.value.filter(step => step.ready).length
  return Math.round((completed / Math.max(setupSteps.value.length, 1)) * 100)
})

const businessScore = computed(() => {
  const salesScore = saleStore.items.length > 0 ? 100 : 0
  const forecastScore = forecastStore.forecast?.dishes.length ? 100 : 0
  const purchaseScore = openPurchaseOrderCount.value > 0 || ingredientStore.items.some(item => item.supplier) ? 100 : 35

  return Math.round((setupProgress.value * 0.45) + (salesScore * 0.2) + (forecastScore * 0.2) + (purchaseScore * 0.15))
})

const stats = computed<DashboardStat[]>(() => isAdmin.value
  ? [
      { title: 'Comptes', value: users.value.length, hint: 'utilisateurs' },
      { title: 'Managers', value: managerCount.value, hint: 'equipe' },
      { title: '2FA', value: `${twoFactorCoverage.value}%`, hint: 'couverture' },
      { title: 'Inactifs', value: inactiveUserCount.value, hint: 'a verifier' }
    ]
  : [
      { title: 'Score', value: `${businessScore.value}%`, hint: 'pilotage' },
      { title: 'Ventes', value: formatCurrency(saleStore.recentRevenue), hint: 'recent' },
      { title: 'Prevision', value: `${projectedPlates.value}`, hint: 'portions' },
      { title: 'Achats', value: openPurchaseOrderCount.value, hint: formatCurrency(purchaseOrderStore.openAmount) }
    ])

const priorityAlerts = computed<DashboardAlert[]>(() => {
  const items: DashboardAlert[] = []

  if (!profile.value?.twoFactorEnabled) {
    items.push({ title: 'Activer la 2FA', to: '/security', action: 'Securite' })
  }

  if (isAdmin.value && inactiveUserCount.value > 0) {
    items.push({ title: `${inactiveUserCount.value} compte(s) inactif(s)`, to: '/admin', action: 'Admin' })
  }

  if (!isAdmin.value && ingredientStore.items.length === 0) {
    items.push({ title: 'Ajouter les ingredients', to: '/ingredients', action: 'Ingredients' })
  }

  if (!isAdmin.value && ingredientStore.items.length > 0 && dishStore.items.length === 0) {
    items.push({ title: 'Creer les plats', to: '/dishes', action: 'Plats' })
  }

  if (saleStore.items.length === 0) {
    items.push({ title: 'Saisir des ventes', to: '/sales', action: 'Ventes' })
  }

  return items.slice(0, 3)
})

const quickActions = computed<DashboardAction[]>(() => isAdmin.value
  ? [
      { label: 'Utilisateurs', to: '/admin', icon: 'i-lucide-users-round' },
      { label: 'Securite', to: '/security', icon: 'i-lucide-shield-check' },
      { label: 'Previsions', to: '/forecasts', icon: 'i-lucide-chart-no-axes-combined' }
    ]
  : [
      { label: 'Previsions', to: '/forecasts', icon: 'i-lucide-chart-no-axes-combined' },
      { label: 'Achats', to: '/purchase-orders', icon: 'i-lucide-shopping-cart' },
      { label: 'Ventes', to: '/sales', icon: 'i-lucide-banknote' }
    ])

const topForecastDishes = computed(() =>
  [...(forecastStore.forecast?.dishes ?? [])]
    .sort((a, b) => b.recommendedQuantity - a.recommendedQuantity)
    .slice(0, 3)
)

const primaryAction = computed(() => {
  if (isAdmin.value) {
    return { label: 'Panel admin', to: '/admin' }
  }

  if (ingredientStore.items.length === 0) {
    return { label: 'Ajouter ingredients', to: '/ingredients' }
  }

  if (saleStore.items.length === 0) {
    return { label: 'Saisir ventes', to: '/sales' }
  }

  return { label: 'Voir previsions', to: '/forecasts' }
})

function formatCurrency(value: number) {
  return `${value.toFixed(2)} EUR`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value))
}

async function fetchAdminUsers() {
  users.value = await $fetch<ManagedUser[]>('/api/admin/users')
}

async function loadDashboard() {
  loading.value = true
  errorMessage.value = ''

  try {
    const currentProfile = await authStore.loadProfile()
    if (currentProfile?.role === 'supplier') {
      await navigateTo('/supplier-messages')
      return
    }

    const tasks: Array<Promise<unknown>> = [
      ingredientStore.load(),
      dishStore.load(),
      chargeStore.load(),
      saleStore.load(),
      forecastStore.load(),
      purchaseOrderStore.load()
    ]

    if (currentProfile?.role === 'admin') {
      tasks.push(fetchAdminUsers())
    } else {
      users.value = []
    }

    await Promise.all(tasks)
    lastUpdatedAt.value = new Date()
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de charger le dashboard')
    appToast.error('Dashboard indisponible', errorMessage.value)
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)
</script>

<template>
  <div class="space-y-5 p-4 font-sans md:p-6">
    <header class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/70">
          Dashboard
        </p>
        <h1 class="mt-1 font-['Be_Vietnam_Pro',sans-serif] text-3xl font-bold text-[#1a1c1c] dark:text-white">
          Bonjour {{ firstName }}
        </h1>
        <div class="mt-2 flex flex-wrap gap-2">
          <span class="rounded-full bg-[#e8e8e8] px-3 py-1 text-[11px] font-bold text-[#40493e] dark:bg-[#2f3131] dark:text-[#c0c9ba]">
            {{ roleLabel }}
          </span>
          <span class="rounded-full bg-[#e8e8e8] px-3 py-1 text-[11px] font-bold text-[#40493e] dark:bg-[#2f3131] dark:text-[#c0c9ba]">
            {{ restaurantName }}
          </span>
          <span class="rounded-full bg-[#e8e8e8] px-3 py-1 text-[11px] font-bold text-[#40493e] dark:bg-[#2f3131] dark:text-[#c0c9ba]">
            {{ lastUpdatedAt ? 'A jour' : 'Chargement' }}
          </span>
        </div>
      </div>

      <NuxtLink
        :to="primaryAction.to"
        class="inline-flex items-center justify-center rounded-full bg-[#feb236] px-6 py-2.5 text-sm font-bold text-[#6d4700] shadow-sm transition hover:bg-[#ffc059]"
      >
        {{ primaryAction.label }}
      </NuxtLink>
    </header>

    <p
      v-if="errorMessage"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ errorMessage }}
    </p>

    <template v-if="loading">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="index in 4"
          :key="index"
          class="h-28 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800"
        />
      </div>
    </template>

    <template v-else>
      <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="stat in stats"
          :key="stat.title"
          class="rounded-xl border border-[#c0c9ba]/20 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#1a1c1c]"
        >
          <p class="text-[10px] font-bold uppercase text-[#40493e]/70 dark:text-[#c0c9ba]/70">
            {{ stat.title }}
          </p>
          <p class="mt-1 text-2xl font-black text-[#1a1c1c] dark:text-white">
            {{ stat.value }}
          </p>
          <p class="mt-1 text-xs text-[#40493e] dark:text-[#c0c9ba]">
            {{ stat.hint }}
          </p>
        </article>
      </section>

      <section class="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <article class="rounded-xl border border-[#c0c9ba]/20 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1a1c1c]">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/70">
                Priorites
              </p>
              <h2 class="mt-1 text-lg font-bold text-[#1a1c1c] dark:text-white">
                A montrer maintenant
              </h2>
            </div>
            <span class="rounded-full bg-[#e8e8e8] px-3 py-1 text-[11px] font-bold text-[#40493e] dark:bg-[#2f3131] dark:text-[#c0c9ba]">
              {{ priorityAlerts.length }} point(s)
            </span>
          </div>

          <div class="mt-4 grid gap-2">
            <div
              v-if="priorityAlerts.length === 0"
              class="rounded-xl border border-[#005013]/20 bg-[#005013]/5 px-4 py-3 text-sm font-bold text-[#005013] dark:border-[#8ad986]/20 dark:bg-[#8ad986]/10 dark:text-[#8ad986]"
            >
              Pret pour la demo.
            </div>

            <NuxtLink
              v-for="alert in priorityAlerts"
              :key="`${alert.title}-${alert.to}`"
              :to="alert.to"
              class="flex items-center justify-between gap-3 rounded-xl border border-[#c0c9ba]/20 bg-[#f3f3f3] px-4 py-3 text-sm transition hover:shadow-sm dark:border-white/5 dark:bg-[#2f3131]"
            >
              <span class="font-bold text-[#1a1c1c] dark:text-white">{{ alert.title }}</span>
              <span class="text-xs font-bold text-[#40493e] dark:text-[#c0c9ba]">{{ alert.action }}</span>
            </NuxtLink>
          </div>
        </article>

        <article class="rounded-xl border border-[#c0c9ba]/20 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1a1c1c]">
          <p class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/70">
            Actions
          </p>
          <div class="mt-4 grid gap-2">
            <NuxtLink
              v-for="action in quickActions"
              :key="action.to"
              :to="action.to"
              class="flex items-center gap-3 rounded-xl border border-[#c0c9ba]/20 bg-[#f3f3f3] px-4 py-3 text-sm font-bold text-[#1a1c1c] transition hover:shadow-sm dark:border-white/5 dark:bg-[#2f3131] dark:text-white"
            >
              <UIcon
                :name="action.icon"
                class="size-4 text-[#005013] dark:text-[#8ad986]"
              />
              {{ action.label }}
            </NuxtLink>
          </div>
        </article>
      </section>

      <section
        v-if="!isAdmin"
        class="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]"
      >
        <article class="rounded-xl border border-[#c0c9ba]/20 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1a1c1c]">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/70">
                Parcours demo
              </p>
              <h2 class="mt-1 text-lg font-bold text-[#1a1c1c] dark:text-white">
                Donnees metier
              </h2>
            </div>
            <span class="rounded-full bg-[#e8e8e8] px-3 py-1 text-[11px] font-bold text-[#40493e] dark:bg-[#2f3131] dark:text-[#c0c9ba]">
              {{ setupProgress }}%
            </span>
          </div>

          <div class="mt-4 h-2 overflow-hidden rounded-full bg-[#e8e8e8] dark:bg-[#2f3131]">
            <div
              class="h-full rounded-full bg-[#005013] transition-all dark:bg-[#8ad986]"
              :style="{ width: `${setupProgress}%` }"
            />
          </div>

          <div class="mt-4 grid gap-2 sm:grid-cols-2">
            <NuxtLink
              v-for="step in setupSteps"
              :key="step.to"
              :to="step.to"
              class="flex items-center justify-between rounded-xl border border-[#c0c9ba]/20 bg-[#f3f3f3] px-4 py-3 text-sm dark:border-white/5 dark:bg-[#2f3131]"
            >
              <span class="font-bold text-[#1a1c1c] dark:text-white">{{ step.title }}</span>
              <span class="text-xs font-bold" :class="step.ready ? 'text-[#005013] dark:text-[#8ad986]' : 'text-[#40493e] dark:text-[#c0c9ba]'">
                {{ step.count }}
              </span>
            </NuxtLink>
          </div>
        </article>

        <article class="rounded-xl border border-[#c0c9ba]/20 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1a1c1c]">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/70">
                Production
              </p>
              <h2 class="mt-1 text-lg font-bold text-[#1a1c1c] dark:text-white">
                Prevision du jour
              </h2>
            </div>
            <NuxtLink
              to="/forecasts"
              class="rounded-full border border-[#707a6d] px-4 py-2 text-sm font-bold text-[#1a1c1c] transition hover:bg-[#f3f3f3] dark:border-[#c0c9ba] dark:text-white dark:hover:bg-[#2f3131]"
            >
              Ouvrir
            </NuxtLink>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-3">
            <div class="rounded-xl bg-[#f3f3f3] p-4 dark:bg-[#2f3131]">
              <p class="text-xs text-[#40493e] dark:text-[#c0c9ba]">Portions</p>
              <p class="mt-1 text-xl font-black text-[#1a1c1c] dark:text-white">{{ projectedPlates }}</p>
            </div>
            <div class="rounded-xl bg-[#f3f3f3] p-4 dark:bg-[#2f3131]">
              <p class="text-xs text-[#40493e] dark:text-[#c0c9ba]">CA projete</p>
              <p class="mt-1 text-xl font-black text-[#1a1c1c] dark:text-white">{{ formatCurrency(projectedRevenue) }}</p>
            </div>
            <div class="rounded-xl bg-[#f3f3f3] p-4 dark:bg-[#2f3131]">
              <p class="text-xs text-[#40493e] dark:text-[#c0c9ba]">Besoins</p>
              <p class="mt-1 text-xl font-black text-[#1a1c1c] dark:text-white">{{ ingredientNeedsCount }}</p>
            </div>
          </div>

          <div class="mt-4 grid gap-2">
            <div
              v-if="topForecastDishes.length === 0"
              class="rounded-xl border border-dashed border-[#c0c9ba] px-4 py-3 text-sm text-[#40493e] dark:border-[#40493e] dark:text-[#c0c9ba]"
            >
              Lance une prevision pour afficher les plats.
            </div>
            <div
              v-for="dish in topForecastDishes"
              :key="dish.dishId"
              class="flex items-center justify-between gap-3 rounded-xl bg-[#f3f3f3] px-4 py-3 text-sm dark:bg-[#2f3131]"
            >
              <span class="font-bold text-[#1a1c1c] dark:text-white">{{ dish.dishName }}</span>
              <span class="text-[#40493e] dark:text-[#c0c9ba]">{{ dish.recommendedQuantity }} portions</span>
            </div>
          </div>
        </article>
      </section>

      <EmptyStateCard
        v-if="ingredientStore.items.length === 0 && dishStore.items.length === 0"
        eyebrow="Base vide"
        title="Ajoute les donnees de demo."
        description="Ingredients, plats et ventes suffisent pour rendre la soutenance lisible."
        action-label="Ingredients"
        action-to="/ingredients"
        secondary-label="Plats"
        secondary-to="/dishes"
      />

      <p class="text-xs text-[#40493e] dark:text-[#c0c9ba]">
        {{ latestSale ? `Derniere vente : ${formatDate(latestSale.serviceDate)}` : 'Aucune vente recente' }}
      </p>
    </template>
  </div>
</template>

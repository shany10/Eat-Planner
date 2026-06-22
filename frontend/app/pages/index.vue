<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import EmptyStateCard from '~/components/common/EmptyStateCard.vue'
import ForecastBoard from '~/components/forecasts/ForecastBoard.vue'
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

type DashboardStep = {
  title: string
  to: string
  count: number
  helper: string
  ready: boolean
}

type DashboardStat = {
  title: string
  value: string | number
  hint: string
}

type DashboardAlert = {
  title: string
  description: string
  to: string
  action: string
}

type DashboardAction = {
  to: string
  label: string
  description: string
}

type DashboardMission = {
  title: string
  value: string
  helper: string
  to: string
  icon: string
}

const profile = computed(() => authStore.profile)
const isAdmin = computed(() => profile.value?.role === 'admin')
const firstName = computed(() => profile.value?.firstname || 'Equipe')
const roleLabel = computed(() => isAdmin.value ? 'Admin principal' : 'Manager')
const securityLabel = computed(() => profile.value?.twoFactorEnabled ? '2FA activee' : '2FA inactive')
const restaurantName = computed(() => profile.value?.restaurantName || 'Mon restaurant')
const pricingSettingsLabel = computed(() =>
  `Marge ${Math.round((profile.value?.defaultMarginRate ?? 0.72) * 100)}% - TVA ${Math.round((profile.value?.vatRate ?? 0.1) * 100)}%`
)

const totalRevenue = computed(() => saleStore.items.reduce((sum, sale) => sum + sale.totalAmount, 0))
const projectedRevenue = computed(() => forecastStore.forecast?.totals.totalProjectedRevenue ?? 0)
const projectedPlates = computed(() => forecastStore.forecast?.totals.totalProjectedPlates ?? 0)
const forecastIngredientBudget = computed(() =>
  forecastStore.forecast?.ingredientNeeds.reduce((sum, need) => sum + need.estimatedCost, 0) ?? 0
)
const latestSale = computed(() =>
  [...saleStore.items].sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())[0] ?? null
)
const openPurchaseOrderCount = computed(() => purchaseOrderStore.openOrders.length)
const managerCount = computed(() => users.value.filter(user => user.role === 'manager').length)
const inactiveUserCount = computed(() => users.value.filter(user => !user.active).length)
const twoFactorCoverage = computed(() => {
  if (users.value.length === 0) {
    return profile.value?.twoFactorEnabled ? 100 : 0
  }

  return Math.round((users.value.filter(user => user.twoFactorEnabled).length / users.value.length) * 100)
})

const foodCostAverage = computed(() => {
  const dishes = dishStore.items.filter(dish => dish.profitability)
  if (dishes.length === 0) {
    return 0
  }

  return dishes.reduce((sum, dish) => sum + (dish.profitability?.foodCost || 0), 0) / dishes.length
})

const suggestedPriceAverage = computed(() => {
  if (dishStore.items.length === 0) {
    return 0
  }

  const total = dishStore.items.reduce((sum, dish) => sum + (dish.profitability?.suggestedPriceIncludingTax || dish.profitability?.suggestedPrice || 0), 0)
  return total / dishStore.items.length
})

const setupSteps = computed<DashboardStep[]>(() => [
  { title: 'Ingredients', to: '/ingredients', count: ingredientStore.items.length, helper: 'Base matiere premiere', ready: ingredientStore.items.length > 0 },
  { title: 'Fournisseurs', to: '/suppliers', count: ingredientStore.items.filter(item => item.supplier).length, helper: 'Ingredients relies aux achats', ready: ingredientStore.items.some(item => item.supplier) },
  { title: 'Plats', to: '/dishes', count: dishStore.items.length, helper: 'Recettes et marges', ready: dishStore.items.length > 0 },
  { title: 'Charges', to: '/charges', count: chargeStore.items.length, helper: 'Couts fixes et variables', ready: chargeStore.items.length > 0 },
  { title: 'Ventes', to: '/sales', count: saleStore.items.length, helper: 'Historique utile pour prevoir', ready: saleStore.items.length > 0 }
])

const setupProgress = computed(() => {
  const completed = setupSteps.value.filter(step => step.ready).length
  return Math.round((completed / Math.max(setupSteps.value.length, 1)) * 100)
})

const businessScore = computed(() => {
  const dataScore = setupProgress.value
  const salesScore = saleStore.items.length > 0 ? 100 : 0
  const forecastScore = (forecastStore.forecast?.dishes.length ?? 0) > 0 ? 100 : 0
  const purchaseScore = openPurchaseOrderCount.value > 0 || ingredientStore.items.some(item => item.supplier) ? 100 : 35

  return Math.round((dataScore * 0.45) + (salesScore * 0.2) + (forecastScore * 0.2) + (purchaseScore * 0.15))
})

const stats = computed<DashboardStat[]>(() => isAdmin.value
  ? [
      { title: 'Comptes', value: users.value.length, hint: 'Tous les utilisateurs' },
      { title: 'Managers', value: managerCount.value, hint: 'Equipe metier active' },
      { title: 'Inactifs', value: inactiveUserCount.value, hint: 'Comptes a revoir' },
      { title: 'Couverture 2FA', value: `${twoFactorCoverage.value}%`, hint: 'Niveau de securite equipe' }
    ]
  : [
      { title: 'Score pilotage', value: `${businessScore.value}%`, hint: 'Donnees, ventes, prevision, achats' },
      { title: 'CA recent', value: formatCurrency(saleStore.recentRevenue), hint: '7 derniers tickets' },
      { title: 'Projection jour', value: formatCurrency(projectedRevenue.value), hint: `${projectedPlates.value} portions prevues` },
      { title: 'Achats ouverts', value: openPurchaseOrderCount.value, hint: formatCurrency(purchaseOrderStore.openAmount) }
    ])

const missions = computed<DashboardMission[]>(() => [
  {
    title: 'Produire',
    value: `${projectedPlates.value} portions`,
    helper: forecastStore.forecast?.dishes.length
      ? `${forecastStore.forecast.dishes.length} plat(s) dans la prevision`
      : 'Lance la prevision pour creer le plan du jour',
    to: '/forecasts',
    icon: 'i-lucide-chart-no-axes-combined'
  },
  {
    title: 'Vendre',
    value: formatCurrency(totalRevenue.value),
    helper: latestSale.value ? `Derniere vente ${formatDate(latestSale.value.serviceDate)}` : 'Aucun ticket enregistre',
    to: '/sales',
    icon: 'i-lucide-banknote'
  },
  {
    title: 'Commander',
    value: formatCurrency(forecastIngredientBudget.value),
    helper: openPurchaseOrderCount.value > 0
      ? `${openPurchaseOrderCount.value} commande(s) fournisseur ouvertes`
      : 'Transforme les besoins matieres en panier manager',
    to: '/purchase-orders',
    icon: 'i-lucide-shopping-cart'
  }
])

const alerts = computed(() => {
  const items: DashboardAlert[] = []

  if (!profile.value?.twoFactorEnabled) {
    items.push({
      title: 'La securite peut etre renforcee',
      description: 'Active la 2FA pour rendre l acces plus pro des maintenant.',
      to: '/security',
      action: 'Activer la 2FA'
    })
  }

  if (isAdmin.value && inactiveUserCount.value > 0) {
    items.push({
      title: `${inactiveUserCount.value} compte(s) inactif(s)`,
      description: 'Passe dans le panel admin pour verifier les statuts et les acces.',
      to: '/admin',
      action: 'Voir le panel admin'
    })
  }

  if (!isAdmin.value && ingredientStore.items.length === 0) {
    items.push({
      title: 'La base ingredients est vide',
      description: 'C est le premier levier pour rendre tout le reste utile.',
      to: '/ingredients',
      action: 'Ajouter des ingredients'
    })
  }

  if (!isAdmin.value && ingredientStore.items.length > 0 && dishStore.items.length === 0) {
    items.push({
      title: 'Les plats ne sont pas encore configures',
      description: 'Passe sur les recettes pour voir apparaitre une vraie lecture marge.',
      to: '/dishes',
      action: 'Composer un plat'
    })
  }

  if (saleStore.items.length === 0) {
    items.push({
      title: 'Aucune vente saisie',
      description: 'Le dashboard semblera beaucoup plus vivant apres les premiers tickets.',
      to: '/sales',
      action: 'Saisir des ventes'
    })
  }

  return items.slice(0, 3)
})

const actions = computed<DashboardAction[]>(() => isAdmin.value
  ? [
      { to: '/admin', label: 'Gerer les utilisateurs', description: 'Roles, activations et acces.' },
      { to: '/security', label: 'Verifier la securite', description: '2FA et parcours de connexion.' },
      { to: '/sales', label: 'Suivre les ventes', description: 'Garder un oeil sur le flux business.' },
      { to: '/forecasts', label: 'Voir la prevision', description: 'Projection et alertes du jour.' }
    ]
  : [
      { to: '/ingredients', label: 'Consolider les ingredients', description: 'Matieres premieres et prix achat.' },
      { to: '/purchase-orders', label: 'Preparer un panier achats', description: 'Commander les ingredients chez les fournisseurs.' },
      { to: '/dishes', label: 'Mettre a jour les plats', description: 'Recettes, marges, prix conseilles.' },
      { to: '/sales', label: 'Saisir les ventes', description: 'Tickets et historique du jour.' },
      { to: '/forecasts', label: 'Lire la prevision', description: 'Besoins matieres et volumes.' }
    ].slice(0, 4))

const topForecastDishes = computed(() =>
  [...(forecastStore.forecast?.dishes ?? [])]
    .sort((a, b) => b.projectedRevenue - a.projectedRevenue)
    .slice(0, 3)
)

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
  <div class="p-4 md:p-8 space-y-6 font-sans">
    <section>
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <span class="text-[10px] uppercase tracking-widest font-bold text-[#40493e]/60 dark:text-[#c0c9ba]">{{ isAdmin ? 'Supervision plateforme' : 'Dashboard' }}</span>
          <h1 class="text-3xl md:text-[32px] md:leading-10 font-bold text-[#1a1c1c] dark:text-[#f1f1f1] font-['Be_Vietnam_Pro',sans-serif]">
            Bonjour {{ firstName }}
          </h1>
          <p class="text-[#40493e] dark:text-[#c0c9ba] text-sm mt-1">
            {{ isAdmin
              ? 'Etat des comptes, securite et signaux de gestion visibles sans detour.'
              : 'Les chiffres utiles, les alertes et les raccourcis sont remontes en premier.' }}
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <NuxtLink
            :to="isAdmin ? '/admin' : (ingredientStore.items.length === 0 ? '/ingredients' : saleStore.items.length === 0 ? '/sales' : '/forecasts')"
            class="bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] font-bold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-2"
          >
            {{ isAdmin ? 'Panel admin' : (ingredientStore.items.length === 0 ? 'Ajouter ingredients' : saleStore.items.length === 0 ? 'Saisir ventes' : 'Previsions') }}
          </NuxtLink>
          <NuxtLink
            :to="profile?.twoFactorEnabled ? '/account' : '/security'"
            class="border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white font-bold py-2.5 px-6 rounded-full hover:bg-[#f3f3f3] dark:hover:bg-[#2f3131] transition-all flex items-center gap-2"
          >
            {{ profile?.twoFactorEnabled ? 'Mon compte' : 'Activer 2FA' }}
          </NuxtLink>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 py-4">
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ roleLabel }}</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ restaurantName }}</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ securityLabel }}</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ pricingSettingsLabel }}</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ lastUpdatedAt ? 'Synchronise' : 'Chargement' }}</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">
          {{ latestSale ? `Derniere vente ${formatDate(latestSale.serviceDate)}` : 'Aucune vente recente' }}
        </span>
      </div>
    </section>

    <p
      v-if="errorMessage"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ errorMessage }}
    </p>

    <template v-if="loading">
      <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="index in 4"
          :key="index"
          class="h-32 animate-pulse rounded-[2.5rem] bg-slate-200 dark:bg-slate-800"
        />
      </div>
    </template>

    <div
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      <div
        v-for="stat in stats"
        :key="stat.title"
        class="bg-[#f3f3f3] dark:bg-[#1a1c1c] p-6 rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5"
      >
        <span class="text-[10px] font-bold uppercase text-[#40493e]/70 dark:text-[#c0c9ba]/70">{{ stat.title }}</span>
        <div class="text-3xl font-black text-[#1a1c1c] dark:text-white my-1">{{ stat.value }}</div>
        <div class="text-xs text-[#40493e] dark:text-[#c0c9ba]">{{ stat.hint }}</div>
      </div>
    </div>

    <section
      v-if="!loading && !isAdmin"
      class="bg-white dark:bg-[#1a1c1c] rounded-[2.5rem] p-6 border border-[#c0c9ba]/20 dark:border-white/5 shadow-sm"
    >
      <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/60">Mission manager</span>
          <h2 class="font-bold text-lg text-[#1a1c1c] dark:text-white mt-1">
            Produire, vendre, commander
          </h2>
        </div>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">Score {{ businessScore }}%</span>
      </div>

      <div class="grid gap-4 lg:grid-cols-3">
        <NuxtLink
          v-for="mission in missions"
          :key="mission.title"
          :to="mission.to"
          class="rounded-3xl border border-[#c0c9ba]/20 dark:border-white/5 bg-[#f3f3f3] dark:bg-[#2f3131] p-5 transition-all hover:shadow-md"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm font-bold text-[#1a1c1c] dark:text-white">
                {{ mission.title }}
              </p>
              <p class="mt-2 text-2xl font-black text-[#1a1c1c] dark:text-white">
                {{ mission.value }}
              </p>
            </div>
            <span class="inline-flex size-10 items-center justify-center rounded-full bg-[#005013]/10 text-[#005013] dark:bg-[#8ad986]/15 dark:text-[#8ad986]">
              <UIcon
                :name="mission.icon"
                class="size-5"
              />
            </span>
          </div>
          <p class="mt-3 text-sm leading-6 text-[#40493e] dark:text-[#c0c9ba]">
            {{ mission.helper }}
          </p>
        </NuxtLink>
      </div>
    </section>

    <section
      v-if="!loading"
      class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"
    >
      <div class="bg-white dark:bg-[#1a1c1c] rounded-[2.5rem] p-6 border border-[#c0c9ba]/20 dark:border-white/5 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <div>
            <span class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/60">Alertes</span>
            <h2 class="font-bold text-lg text-[#1a1c1c] dark:text-white mt-1">
              A traiter
            </h2>
          </div>
          <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ alerts.length }} point(s)</span>
        </div>

        <div class="mt-4 grid gap-3">
          <div
            v-if="alerts.length === 0"
            class="rounded-3xl p-5 border border-[#005013]/20 bg-[#005013]/5 dark:border-[#8ad986]/20 dark:bg-[#8ad986]/10"
          >
            <p class="text-sm font-bold text-[#005013] dark:text-[#8ad986]">
              Rien de critique
            </p>
            <p class="mt-1 text-sm text-[#40493e] dark:text-[#c0c9ba]">
              Les donnees principales sont lisibles.
            </p>
          </div>

          <div
            v-for="alert in alerts"
            :key="`${alert.title}-${alert.to}`"
            class="rounded-3xl p-5 border border-[#c0c9ba]/20 dark:border-white/5 bg-[#f3f3f3] dark:bg-[#2f3131]"
          >
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p class="text-sm font-bold text-[#1a1c1c] dark:text-white">
                  {{ alert.title }}
                </p>
                <p class="mt-1 text-sm text-[#40493e] dark:text-[#c0c9ba]">
                  {{ alert.description }}
                </p>
              </div>
              <NuxtLink
                :to="alert.to"
                class="border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white font-bold py-2 px-5 rounded-full hover:bg-[#e8e8e8] dark:hover:bg-[#3a3d3d] transition-all text-sm text-center min-w-fit"
              >
                {{ alert.action }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-[#1a1c1c] rounded-[2.5rem] p-6 border border-[#c0c9ba]/20 dark:border-white/5 shadow-sm">
        <span class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/60">Actions rapides</span>
        <h2 class="font-bold text-lg text-[#1a1c1c] dark:text-white mt-1">
          Raccourcis
        </h2>

        <div class="mt-4 grid gap-3">
          <NuxtLink
            v-for="action in actions"
            :key="action.to"
            :to="action.to"
            class="block rounded-3xl p-5 border border-[#c0c9ba]/20 dark:border-white/5 bg-[#f3f3f3] dark:bg-[#2f3131] transition-all hover:shadow-md"
          >
            <p class="text-sm font-bold text-[#1a1c1c] dark:text-white">
              {{ action.label }}
            </p>
            <p class="mt-1 text-sm text-[#40493e] dark:text-[#c0c9ba]">
              {{ action.description }}
            </p>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section
      v-if="!loading"
      class="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]"
    >
      <div class="bg-white dark:bg-[#1a1c1c] rounded-[2.5rem] p-6 border border-[#c0c9ba]/20 dark:border-white/5 shadow-sm">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/60">Progression</span>
            <h2 class="font-bold text-lg text-[#1a1c1c] dark:text-white mt-1">
              Donnees configurees
            </h2>
          </div>
          <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">Setup {{ setupProgress }}%</span>
        </div>

        <div class="mt-4 h-2 overflow-hidden rounded-full bg-[#e8e8e8] dark:bg-[#2f3131]">
          <div
            class="h-full rounded-full bg-[linear-gradient(90deg,#feb236,#005013)] transition-all"
            :style="{ width: `${setupProgress}%` }"
          />
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <NuxtLink
            v-for="step in setupSteps"
            :key="step.to"
            :to="step.to"
            class="rounded-3xl p-4 border border-[#c0c9ba]/20 dark:border-white/5 bg-[#f3f3f3] dark:bg-[#2f3131] transition-all hover:shadow-md"
          >
            <p class="text-sm font-bold text-[#1a1c1c] dark:text-white">
              {{ step.title }}
            </p>
            <p class="mt-1 text-xl font-black text-[#1a1c1c] dark:text-white">
              {{ step.count }}
            </p>
            <p class="mt-1 text-xs text-[#40493e] dark:text-[#c0c9ba]">
              {{ step.ready ? 'Pret' : step.helper }}
            </p>
          </NuxtLink>
        </div>
      </div>

      <div class="bg-white dark:bg-[#1a1c1c] rounded-[2.5rem] p-6 border border-[#c0c9ba]/20 dark:border-white/5 shadow-sm">
        <span class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/60">Lecture rapide</span>
        <h2 class="font-bold text-lg text-[#1a1c1c] dark:text-white mt-1">
          Signaux metier
        </h2>

        <div class="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <div class="rounded-3xl p-4 border border-[#c0c9ba]/20 dark:border-white/5 bg-[#f3f3f3] dark:bg-[#2f3131]">
            <p class="text-sm text-[#40493e] dark:text-[#c0c9ba]">
              Food cost moyen
            </p>
            <p class="mt-1 text-xl font-black text-[#1a1c1c] dark:text-white">
              {{ foodCostAverage.toFixed(2) }} EUR
            </p>
          </div>
          <div class="rounded-3xl p-4 border border-[#c0c9ba]/20 dark:border-white/5 bg-[#f3f3f3] dark:bg-[#2f3131]">
            <p class="text-sm text-[#40493e] dark:text-[#c0c9ba]">
              Prix conseille TTC moyen
            </p>
            <p class="mt-1 text-xl font-black text-[#1a1c1c] dark:text-white">
              {{ suggestedPriceAverage.toFixed(2) }} EUR
            </p>
          </div>
          <div class="rounded-3xl p-4 border border-[#c0c9ba]/20 dark:border-white/5 bg-[#f3f3f3] dark:bg-[#2f3131]">
            <p class="text-sm text-[#40493e] dark:text-[#c0c9ba]">
              Projection
            </p>
            <p class="mt-1 text-xl font-black text-[#1a1c1c] dark:text-white">
              {{ forecastStore.forecast?.totals.totalProjectedPlates || 0 }} portions
            </p>
          </div>
        </div>
      </div>
    </section>

    <EmptyStateCard
      v-if="!loading && ingredientStore.items.length === 0 && dishStore.items.length === 0"
      eyebrow="Base vide"
      title="Le produit est pret, il manque les premieres donnees."
      description="Commence par les ingredients, puis ajoute les plats et les ventes pour rendre toutes les pages vraiment vivantes."
      action-label="Ouvrir les ingredients"
      action-to="/ingredients"
      secondary-label="Aller aux plats"
      secondary-to="/dishes"
    />

    <div
      v-if="!loading"
      class="space-y-4"
    >
      <div class="flex items-center justify-between gap-3">
        <div>
          <span class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/60">Prevision</span>
          <h2 class="font-bold text-lg text-[#1a1c1c] dark:text-white mt-1">
            Donnees de production
          </h2>
        </div>
        <NuxtLink
          to="/forecasts"
          class="border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white font-bold py-2.5 px-6 rounded-full hover:bg-[#f3f3f3] dark:hover:bg-[#2f3131] transition-all flex items-center gap-2"
        >
          Voir tout
        </NuxtLink>
      </div>

      <div
        v-if="topForecastDishes.length > 0"
        class="grid gap-4 md:grid-cols-3"
      >
        <div
          v-for="dish in topForecastDishes"
          :key="dish.dishId"
          class="bg-white dark:bg-[#1a1c1c] rounded-3xl p-5 border border-[#c0c9ba]/20 dark:border-white/5 shadow-sm"
        >
          <p class="text-sm font-bold text-[#1a1c1c] dark:text-white">
            {{ dish.dishName }}
          </p>
          <p class="mt-1 text-sm text-[#40493e] dark:text-[#c0c9ba]">
            {{ dish.recommendedQuantity }} portions conseillees
          </p>
          <p class="mt-2 text-sm text-[#40493e] dark:text-[#c0c9ba]">
            CA projete {{ formatCurrency(dish.projectedRevenue) }}
          </p>
        </div>
      </div>

      <ForecastBoard :forecast="forecastStore.forecast" />
    </div>
  </div>
</template>

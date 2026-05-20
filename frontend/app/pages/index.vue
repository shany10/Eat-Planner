<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import EmptyStateCard from '~/components/common/EmptyStateCard.vue'
import StatCard from '~/components/common/StatCard.vue'
import ForecastBoard from '~/components/forecasts/ForecastBoard.vue'
import type { ManagedUser } from '~/types/access'
import { useAuthStore } from '~/stores/auth'
import { useChargeStore } from '~/stores/charges'
import { useDishStore } from '~/stores/dishes'
import { useForecastStore } from '~/stores/forecasts'
import { useIngredientStore } from '~/stores/ingredients'
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

const profile = computed(() => authStore.profile)
const isAdmin = computed(() => profile.value?.role === 'admin')
const firstName = computed(() => profile.value?.firstname || 'Equipe')
const roleLabel = computed(() => isAdmin.value ? 'Admin principal' : 'Manager')
const securityLabel = computed(() => profile.value?.twoFactorEnabled ? '2FA activee' : '2FA inactive')

const activeIngredients = computed(() => ingredientStore.items.filter(item => item.active).length)
const activeDishes = computed(() => dishStore.items.filter(item => item.active).length)
const latestSale = computed(() =>
  [...saleStore.items].sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())[0] ?? null
)
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

  const total = dishStore.items.reduce((sum, dish) => sum + (dish.profitability?.suggestedPrice || 0), 0)
  return total / dishStore.items.length
})

const setupSteps = computed<DashboardStep[]>(() => [
  { title: 'Ingredients', to: '/ingredients', count: ingredientStore.items.length, helper: 'Base matiere premiere', ready: ingredientStore.items.length > 0 },
  { title: 'Plats', to: '/dishes', count: dishStore.items.length, helper: 'Recettes et marges', ready: dishStore.items.length > 0 },
  { title: 'Charges', to: '/charges', count: chargeStore.items.length, helper: 'Couts fixes et variables', ready: chargeStore.items.length > 0 },
  { title: 'Ventes', to: '/sales', count: saleStore.items.length, helper: 'Historique utile pour prevoir', ready: saleStore.items.length > 0 }
])

const setupProgress = computed(() => {
  const completed = setupSteps.value.filter(step => step.ready).length
  return Math.round((completed / Math.max(setupSteps.value.length, 1)) * 100)
})

const stats = computed<DashboardStat[]>(() => isAdmin.value
  ? [
      { title: 'Comptes', value: users.value.length, hint: 'Tous les utilisateurs' },
      { title: 'Managers', value: managerCount.value, hint: 'Equipe metier active' },
      { title: 'Inactifs', value: inactiveUserCount.value, hint: 'Comptes a revoir' },
      { title: 'Couverture 2FA', value: `${twoFactorCoverage.value}%`, hint: 'Niveau de securite equipe' }
    ]
  : [
      { title: 'Ingredients actifs', value: activeIngredients.value, hint: 'Base exploitable' },
      { title: 'Plats suivis', value: activeDishes.value, hint: 'Recettes et rentabilite' },
      { title: 'Charges / jour', value: formatCurrency(chargeStore.dailyChargeEstimate), hint: 'Toutes charges actives' },
      { title: 'CA recent', value: formatCurrency(saleStore.recentRevenue), hint: '7 derniers tickets' }
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
      { to: '/ingredients', label: 'Consolider la base', description: 'Ingredients, fournisseurs, prix achat.' },
      { to: '/dishes', label: 'Mettre a jour les plats', description: 'Recettes, marges, prix conseilles.' },
      { to: '/sales', label: 'Saisir les ventes', description: 'Tickets et historique du jour.' },
      { to: '/forecasts', label: 'Lire la prevision', description: 'Besoins matieres et volumes.' }
    ])

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
      forecastStore.load()
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
  <div class="space-y-5">
    <section class="app-page-header app-page-header--compact">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="app-eyebrow">
            {{ isAdmin ? 'Supervision plateforme' : 'Dashboard' }}
          </p>
          <h1 class="app-title mt-2">
            Bonjour {{ firstName }}
          </h1>
          <p class="app-subtitle mt-2">
            {{ isAdmin
              ? 'Etat des comptes, securite et signaux de gestion visibles sans detour.'
              : 'Les chiffres utiles, les alertes et les raccourcis sont remontes en premier.' }}
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <NuxtLink
            :to="isAdmin ? '/admin' : (ingredientStore.items.length === 0 ? '/ingredients' : saleStore.items.length === 0 ? '/sales' : '/forecasts')"
            class="btn-primary"
          >
            {{ isAdmin ? 'Panel admin' : (ingredientStore.items.length === 0 ? 'Ajouter ingredients' : saleStore.items.length === 0 ? 'Saisir ventes' : 'Previsions') }}
          </NuxtLink>
          <NuxtLink
            :to="profile?.twoFactorEnabled ? '/account' : '/security'"
            class="btn-secondary"
          >
            {{ profile?.twoFactorEnabled ? 'Mon compte' : 'Activer 2FA' }}
          </NuxtLink>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <span class="app-pill">{{ roleLabel }}</span>
        <span class="app-pill">{{ securityLabel }}</span>
        <span class="app-pill">{{ lastUpdatedAt ? 'Synchronise' : 'Chargement' }}</span>
        <span class="app-pill">
          {{ latestSale ? `Derniere vente ${formatDate(latestSale.serviceDate)}` : 'Aucune vente recente' }}
        </span>
      </div>
    </section>

    <p
      v-if="errorMessage"
      class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ errorMessage }}
    </p>

    <template v-if="loading">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="index in 4"
          :key="index"
          class="h-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800"
        />
      </div>
    </template>

    <div
      v-else
      class="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
    >
      <StatCard
        v-for="stat in stats"
        :key="stat.title"
        :title="stat.title"
        :value="stat.value"
        :hint="stat.hint"
      />
    </div>

    <section
      v-if="!loading"
      class="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]"
    >
      <div class="app-section">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="app-eyebrow">
              Alertes
            </p>
            <h2 class="app-section-title mt-1">
              A traiter
            </h2>
          </div>
          <span class="app-pill">
            {{ alerts.length }} point(s)
          </span>
        </div>

        <div class="mt-4 grid gap-2">
          <div
            v-if="alerts.length === 0"
            class="app-inset border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/25"
          >
            <p class="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              Rien de critique
            </p>
            <p class="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
              Les donnees principales sont lisibles.
            </p>
          </div>

          <div
            v-for="alert in alerts"
            :key="`${alert.title}-${alert.to}`"
            class="app-inset"
          >
            <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p class="text-sm font-semibold text-slate-900 dark:text-white">
                  {{ alert.title }}
                </p>
                <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {{ alert.description }}
                </p>
              </div>
              <NuxtLink
                :to="alert.to"
                class="btn-secondary min-w-fit"
              >
                {{ alert.action }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <div class="app-section">
        <p class="app-eyebrow">
          Actions rapides
        </p>
        <h2 class="app-section-title mt-1">
          Raccourcis
        </h2>

        <div class="mt-4 grid gap-2">
          <NuxtLink
            v-for="action in actions"
            :key="action.to"
            :to="action.to"
            class="app-inset block transition hover:border-slate-300 hover:bg-white dark:hover:border-slate-700 dark:hover:bg-slate-900"
          >
            <p class="text-sm font-semibold text-slate-900 dark:text-white">
              {{ action.label }}
            </p>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {{ action.description }}
            </p>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section
      v-if="!loading"
      class="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]"
    >
      <div class="app-section">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="app-eyebrow">
              Progression
            </p>
            <h2 class="app-section-title mt-1">
              Donnees configurees
            </h2>
          </div>
          <span class="app-pill">
            Setup {{ setupProgress }}%
          </span>
        </div>

        <div class="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            class="h-full rounded-full bg-[linear-gradient(90deg,#f97316,#14b8a6,#0f172a)] transition-all"
            :style="{ width: `${setupProgress}%` }"
          />
        </div>

        <div class="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <NuxtLink
            v-for="step in setupSteps"
            :key="step.to"
            :to="step.to"
            class="app-inset transition hover:border-slate-300 dark:hover:border-slate-700"
          >
            <p class="text-sm font-semibold text-slate-900 dark:text-white">
              {{ step.title }}
            </p>
            <p class="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
              {{ step.count }}
            </p>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {{ step.ready ? 'Pret' : step.helper }}
            </p>
          </NuxtLink>
        </div>
      </div>

      <div class="app-section">
        <p class="app-eyebrow">
          Lecture rapide
        </p>
        <h2 class="app-section-title mt-1">
          Signaux metier
        </h2>

        <div class="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
          <div class="app-inset">
            <p class="text-sm text-slate-500">
              Food cost moyen
            </p>
            <p class="mt-1 text-xl font-semibold">
              {{ foodCostAverage.toFixed(2) }} EUR
            </p>
          </div>
          <div class="app-inset">
            <p class="text-sm text-slate-500">
              Prix conseille moyen
            </p>
            <p class="mt-1 text-xl font-semibold">
              {{ suggestedPriceAverage.toFixed(2) }} EUR
            </p>
          </div>
          <div class="app-inset">
            <p class="text-sm text-slate-500">
              Projection
            </p>
            <p class="mt-1 text-xl font-semibold">
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
      class="space-y-3"
    >
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="app-eyebrow">
            Prevision
          </p>
          <h2 class="app-section-title mt-1">
            Donnees de production
          </h2>
        </div>
        <NuxtLink
          to="/forecasts"
          class="btn-secondary"
        >
          Voir tout
        </NuxtLink>
      </div>

      <div
        v-if="topForecastDishes.length > 0"
        class="grid gap-3 md:grid-cols-3"
      >
        <div
          v-for="dish in topForecastDishes"
          :key="dish.dishId"
          class="app-card"
        >
          <p class="text-sm font-semibold text-slate-900 dark:text-white">
            {{ dish.dishName }}
          </p>
          <p class="mt-1 text-sm text-slate-500">
            {{ dish.recommendedQuantity }} portions conseillees
          </p>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
            CA projete {{ formatCurrency(dish.projectedRevenue) }}
          </p>
        </div>
      </div>

      <ForecastBoard :forecast="forecastStore.forecast" />
    </div>
  </div>
</template>

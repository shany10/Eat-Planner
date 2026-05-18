<script setup lang="ts">
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
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.statusMessage || 'Impossible de charger le dashboard'
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)
</script>

<template>
  <div class="space-y-8">
    <section class="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ecfeff_48%,#f8fafc_100%)] p-8 shadow-sm dark:border-slate-800 dark:bg-[linear-gradient(135deg,#0f172a_0%,#082f49_45%,#020617_100%)]">
      <div class="pointer-events-none absolute inset-0">
        <div class="absolute -left-10 top-0 h-40 w-40 rounded-full bg-orange-300/20 dark:bg-orange-500/10" />
        <div class="absolute right-0 top-10 h-56 w-56 rounded-full bg-cyan-300/20 dark:bg-cyan-500/10" />
        <div class="absolute bottom-0 left-1/3 h-36 w-36 rounded-full bg-emerald-300/20 dark:bg-emerald-500/10" />
      </div>

      <div class="relative grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div class="max-w-3xl">
          <p class="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            {{ isAdmin ? 'Supervision plateforme' : 'Pilotage restaurant' }}
          </p>

          <div class="mt-4 flex flex-wrap gap-2 text-xs">
            <span class="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
              {{ roleLabel }}
            </span>
            <span class="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
              {{ securityLabel }}
            </span>
            <span class="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
              {{ lastUpdatedAt ? 'Dashboard synchronise' : 'Chargement des donnees' }}
            </span>
          </div>

          <h1 class="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Bonjour {{ firstName }}, {{ isAdmin ? 'voici une vue plus propre de la supervision.' : 'voici un cockpit plus clair pour ton activite.' }}
          </h1>

          <p class="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            {{ isAdmin
              ? 'Le role admin doit comprendre tout de suite l etat des acces, la securite et la sante generale de la plateforme.'
              : 'Apres connexion, tu dois voir tout de suite ou tu en es, quoi faire maintenant et ce qui demande ton attention.' }}
          </p>

          <div class="mt-6 flex flex-wrap gap-3">
            <NuxtLink
              :to="isAdmin ? '/admin' : (ingredientStore.items.length === 0 ? '/ingredients' : saleStore.items.length === 0 ? '/sales' : '/forecasts')"
              class="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {{ isAdmin ? 'Ouvrir le panel admin' : (ingredientStore.items.length === 0 ? 'Commencer la base' : saleStore.items.length === 0 ? 'Saisir les ventes' : 'Voir la prevision') }}
            </NuxtLink>
            <NuxtLink
              :to="profile?.twoFactorEnabled ? '/account' : '/security'"
              class="rounded-full border border-slate-300 bg-white/70 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-white dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950"
            >
              {{ profile?.twoFactorEnabled ? 'Voir mon compte' : 'Activer la 2FA' }}
            </NuxtLink>
          </div>
        </div>

        <div class="rounded-[1.75rem] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-[0_25px_60px_-35px_rgba(15,23,42,0.85)] dark:border-white/10">
          <p class="text-xs uppercase tracking-[0.3em] text-white/60">
            A retenir aujourd hui
          </p>

          <div class="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p class="text-xs uppercase tracking-[0.22em] text-white/55">
                {{ isAdmin ? 'Comptes' : 'Setup' }}
              </p>
              <p class="mt-3 text-2xl font-semibold tracking-tight text-white">
                {{ isAdmin ? users.length : `${setupProgress}%` }}
              </p>
              <p class="mt-2 text-sm leading-6 text-white/70">
                {{ isAdmin ? 'Vue equipe et acces' : 'Parcours produit complete' }}
              </p>
            </div>

            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p class="text-xs uppercase tracking-[0.22em] text-white/55">
                {{ isAdmin ? '2FA' : 'Projection' }}
              </p>
              <p class="mt-3 text-2xl font-semibold tracking-tight text-white">
                {{ isAdmin ? `${twoFactorCoverage}%` : forecastStore.forecast?.totals.totalProjectedPlates || 0 }}
              </p>
              <p class="mt-2 text-sm leading-6 text-white/70">
                {{ isAdmin ? 'Couverture securite equipe' : 'Portions prevues aujourd hui' }}
              </p>
            </div>

            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p class="text-xs uppercase tracking-[0.22em] text-white/55">
                {{ isAdmin ? 'Inactifs' : 'CA recent' }}
              </p>
              <p class="mt-3 text-2xl font-semibold tracking-tight text-white">
                {{ isAdmin ? inactiveUserCount : formatCurrency(saleStore.recentRevenue) }}
              </p>
              <p class="mt-2 text-sm leading-6 text-white/70">
                {{ isAdmin ? 'Comptes a revoir' : '7 derniers tickets' }}
              </p>
            </div>
          </div>

          <div class="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p class="text-sm font-semibold text-white">
              Signal rapide
            </p>
            <p class="mt-2 text-lg font-medium text-white">
              {{ latestSale ? `Derniere vente le ${formatDate(latestSale.serviceDate)}` : 'Aucune vente recente pour le moment.' }}
            </p>
            <p class="mt-2 text-sm leading-6 text-white/70">
              {{ latestSale ? formatCurrency(latestSale.totalAmount) : 'Ajoute des ventes pour rendre le dashboard plus vivant.' }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <p
      v-if="errorMessage"
      class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ errorMessage }}
    </p>

    <template v-if="loading">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="index in 4"
          :key="index"
          class="h-36 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
        />
      </div>
    </template>

    <div
      v-else
      class="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
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
      class="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]"
    >
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
              Alertes
            </p>
            <h2 class="mt-3 text-2xl font-semibold tracking-tight">
              Ce qui merite ton attention
            </h2>
          </div>
          <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            {{ alerts.length }} point(s)
          </span>
        </div>

        <div class="mt-5 grid gap-3">
          <div
            v-if="alerts.length === 0"
            class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/25"
          >
            <p class="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              Rien de critique pour l instant
            </p>
            <p class="mt-2 text-sm leading-6 text-emerald-800 dark:text-emerald-200">
              Le dashboard est propre, tu peux te concentrer sur les prochaines actions utiles.
            </p>
          </div>

          <div
            v-for="alert in alerts"
            :key="`${alert.title}-${alert.to}`"
            class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
          >
            <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div class="max-w-2xl">
                <p class="text-sm font-semibold text-slate-900 dark:text-white">
                  {{ alert.title }}
                </p>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ alert.description }}
                </p>
              </div>
              <NuxtLink
                :to="alert.to"
                class="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                {{ alert.action }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
          Actions rapides
        </p>
        <h2 class="mt-3 text-2xl font-semibold tracking-tight">
          Les raccourcis utiles apres connexion
        </h2>

        <div class="mt-5 grid gap-3">
          <NuxtLink
            v-for="action in actions"
            :key="action.to"
            :to="action.to"
            class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-900"
          >
            <p class="text-sm font-semibold text-slate-900 dark:text-white">
              {{ action.label }}
            </p>
            <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {{ action.description }}
            </p>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section
      v-if="!loading"
      class="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]"
    >
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
              Progression
            </p>
            <h2 class="mt-3 text-2xl font-semibold tracking-tight">
              Parcours produit et niveau de maturite
            </h2>
          </div>
          <div class="rounded-2xl bg-slate-950 px-5 py-4 text-white dark:bg-white dark:text-slate-900">
            <p class="text-xs uppercase tracking-[0.22em] text-white/60 dark:text-slate-500">
              Setup
            </p>
            <p class="mt-2 text-2xl font-semibold">
              {{ setupProgress }}%
            </p>
          </div>
        </div>

        <div class="mt-5 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            class="h-full rounded-full bg-[linear-gradient(90deg,#f97316,#14b8a6,#0f172a)] transition-all"
            :style="{ width: `${setupProgress}%` }"
          />
        </div>

        <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <NuxtLink
            v-for="step in setupSteps"
            :key="step.to"
            :to="step.to"
            class="rounded-2xl border p-4 transition hover:-translate-y-0.5"
            :class="step.ready
              ? 'border-emerald-200 bg-emerald-50 hover:border-emerald-300 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:hover:border-emerald-800'
              : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'"
          >
            <p class="text-sm font-semibold text-slate-900 dark:text-white">
              {{ step.title }}
            </p>
            <p class="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {{ step.count }}
            </p>
            <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {{ step.helper }}
            </p>
          </NuxtLink>
        </div>
      </div>

      <div class="space-y-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
            Lecture rapide
          </p>
          <h2 class="mt-3 text-2xl font-semibold tracking-tight">
            Signaux a lire en premier
          </h2>

          <div class="mt-5 grid gap-3">
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                Food cost moyen
              </p>
              <p class="mt-2 text-2xl font-semibold">
                {{ foodCostAverage.toFixed(2) }} EUR
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Lisible des qu une premiere base recettes existe.
              </p>
            </div>

            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                Prix conseille moyen
              </p>
              <p class="mt-2 text-2xl font-semibold">
                {{ suggestedPriceAverage.toFixed(2) }} EUR
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Un bon signal pour sentir si la base reste coherente.
              </p>
            </div>

            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                Derniere vente
              </p>
              <p class="mt-2 text-2xl font-semibold">
                {{ latestSale ? formatCurrency(latestSale.totalAmount) : 'Aucune' }}
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {{ latestSale ? formatDate(latestSale.serviceDate) : 'Ajoute des tickets pour alimenter le cockpit.' }}
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="flex items-center justify-between gap-4">
            <h2 class="text-xl font-semibold">
              Focus prevision
            </h2>
            <NuxtLink
              to="/forecasts"
              class="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Voir les previsions
            </NuxtLink>
          </div>

          <div
            v-if="topForecastDishes.length > 0"
            class="mt-5 grid gap-3"
          >
            <div
              v-for="dish in topForecastDishes"
              :key="dish.dishId"
              class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-semibold text-slate-900 dark:text-white">
                    {{ dish.dishName }}
                  </p>
                  <p class="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {{ dish.category }}
                  </p>
                </div>
                <span class="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-slate-900">
                  {{ dish.recommendedQuantity }} portions
                </span>
              </div>
              <p class="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Revenu projete {{ formatCurrency(dish.projectedRevenue) }} pour un food cost estime a {{ formatCurrency(dish.projectedFoodCost) }}.
              </p>
            </div>
          </div>

          <div
            v-else
            class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950"
          >
            <p class="text-sm font-semibold text-slate-900 dark:text-white">
              Pas encore assez de matiere pour une vraie priorite prevision.
            </p>
            <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Des plats relies a la base ingredients et quelques ventes donneront un rendu beaucoup plus convaincant.
            </p>
          </div>
        </div>
      </div>
    </section>

    <EmptyStateCard
      v-if="!loading && ingredientStore.items.length === 0 && dishStore.items.length === 0"
      eyebrow="Base vide"
      title="Le produit est pret, il manque encore les premieres donnees."
      description="Commence par les ingredients pour rendre le dashboard concret. Ensuite les plats, les charges et les ventes donneront un vrai ressenti d application finie."
      action-label="Ouvrir les ingredients"
      action-to="/ingredients"
      secondary-label="Aller aux plats"
      secondary-to="/dishes"
    />

    <ForecastBoard
      v-if="!loading"
      :forecast="forecastStore.forecast"
    />
  </div>
</template>

<script setup lang="ts">
import EmptyStateCard from '~/components/common/EmptyStateCard.vue'
import StatCard from '~/components/common/StatCard.vue'
import DishForm from '~/components/dishes/DishForm.vue'
import DishTable from '~/components/dishes/DishTable.vue'
import type { Dish, DishIngredientLine } from '~/types/business'
import { useDishStore } from '~/stores/dishes'
import { useIngredientStore } from '~/stores/ingredients'

definePageMeta({
  middleware: 'auth'
})

const dishStore = useDishStore()
const ingredientStore = useIngredientStore()

const editingDish = ref<Dish | null>(null)
const errorMessage = ref('')
const loading = ref(true)

type DishPayload = {
  name: string
  category: string
  description?: string
  targetMarginRate: number
  estimatedDailyServings: number
  active?: boolean
  ingredients: DishIngredientLine[]
}

type PageStat = {
  title: string
  value: string | number
  hint: string
}

const dishCount = computed(() => dishStore.items.length)
const activeDishCount = computed(() => dishStore.items.filter(item => item.active).length)
const profitableDishCount = computed(() =>
  dishStore.items.filter(item => (item.profitability?.expectedGrossProfit || 0) > 0).length
)
const estimatedDailyServings = computed(() =>
  dishStore.items.reduce((sum, item) => sum + item.estimatedDailyServings, 0)
)

const averageSuggestedPrice = computed(() => {
  if (dishCount.value === 0) {
    return 0
  }

  return dishStore.items.reduce((sum, item) => sum + (item.profitability?.suggestedPrice || 0), 0) / dishCount.value
})

const averageFoodCost = computed(() => {
  const pricedDishes = dishStore.items.filter(item => item.profitability)
  if (pricedDishes.length === 0) {
    return 0
  }

  return pricedDishes.reduce((sum, item) => sum + (item.profitability?.foodCost || 0), 0) / pricedDishes.length
})

const recipeCoverage = computed(() => {
  if (dishCount.value === 0) {
    return 0
  }

  return Math.round((dishStore.items.filter(item => (item.profitability?.lines?.length || 0) > 0).length / dishCount.value) * 100)
})

const topSuggestedDish = computed(() =>
  [...dishStore.items]
    .sort((a, b) => (b.profitability?.suggestedPrice || 0) - (a.profitability?.suggestedPrice || 0))[0] ?? null
)

const stats = computed<PageStat[]>(() => [
  { title: 'Plats actifs', value: activeDishCount.value, hint: 'Carte exploitable' },
  { title: 'Plats rentables', value: profitableDishCount.value, hint: 'Marge brute positive' },
  { title: 'Prix conseille moyen', value: formatCurrency(averageSuggestedPrice.value), hint: 'Repere pricing rapide' },
  { title: 'Portions / jour', value: estimatedDailyServings.value, hint: 'Capacite estimee totale' }
])

const pricingSignal = computed(() => {
  if (ingredientStore.items.length === 0) {
    return 'Ajoute des ingredients pour debloquer la creation des recettes.'
  }

  if (dishCount.value === 0) {
    return 'Compose les premiers plats pour faire apparaitre les prix conseilles.'
  }

  if (topSuggestedDish.value) {
    return `${topSuggestedDish.value.name} ressort actuellement comme le plat au prix conseille le plus haut.`
  }

  return 'La carte commence a raconter un niveau de prix coherent.'
})

async function loadPage() {
  loading.value = true
  errorMessage.value = ''
  try {
    await Promise.all([dishStore.load(), ingredientStore.load()])
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.statusMessage || 'Impossible de charger les plats'
  } finally {
    loading.value = false
  }
}

async function saveDish(payload: DishPayload) {
  try {
    if (editingDish.value) {
      await dishStore.update(editingDish.value._id, payload)
      editingDish.value = null
    } else {
      await dishStore.create(payload)
    }
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.statusMessage || 'Echec lors de l enregistrement du plat'
  }
}

async function removeDish(item: Dish) {
  try {
    await dishStore.remove(item._id)
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.statusMessage || 'Suppression impossible'
  }
}

function formatCurrency(value: number) {
  return `${value.toFixed(2)} EUR`
}

onMounted(loadPage)
</script>

<template>
  <div class="space-y-8">
    <section class="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#fef3c7_48%,#f8fafc_100%)] p-8 shadow-sm dark:border-slate-800 dark:bg-[linear-gradient(135deg,#0f172a_0%,#172554_48%,#020617_100%)]">
      <div class="pointer-events-none absolute inset-0">
        <div class="absolute -left-12 top-0 h-40 w-40 rounded-full bg-sky-300/20 dark:bg-sky-500/10" />
        <div class="absolute right-0 top-10 h-52 w-52 rounded-full bg-amber-300/20 dark:bg-amber-500/10" />
      </div>

      <div class="relative grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div class="max-w-3xl">
          <p class="text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
            Carte rentable
          </p>
          <div class="mt-4 flex flex-wrap gap-2 text-xs">
            <span class="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
              {{ activeDishCount }} plat(s) actif(s)
            </span>
            <span class="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
              {{ ingredientStore.items.length }} ingredient(s) disponible(s)
            </span>
            <span class="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
              {{ loading ? 'Calcul en cours' : 'Carte a jour' }}
            </span>
          </div>

          <h1 class="mt-5 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Recettes et prix de vente
          </h1>
          <p class="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Chaque plat relie sa recette, son cout matiere, sa part de charges et son prix conseille. C est ici que le produit commence vraiment a raconter sa rentabilite.
          </p>

          <div class="mt-6 flex flex-wrap gap-3">
            <a
              href="#dish-form"
              class="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Ajouter un plat
            </a>
            <NuxtLink
              to="/ingredients"
              class="rounded-full border border-slate-300 bg-white/70 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-white dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950"
            >
              Gerer les ingredients
            </NuxtLink>
          </div>
        </div>

        <div class="rounded-[1.75rem] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-[0_25px_60px_-35px_rgba(15,23,42,0.85)] dark:border-white/10">
          <p class="text-xs uppercase tracking-[0.3em] text-white/60">
            Vue pricing
          </p>

          <div class="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p class="text-xs uppercase tracking-[0.22em] text-white/55">
                Plats
              </p>
              <p class="mt-3 text-2xl font-semibold tracking-tight text-white">
                {{ dishCount }}
              </p>
              <p class="mt-2 text-sm leading-6 text-white/70">
                References sur la carte
              </p>
            </div>

            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p class="text-xs uppercase tracking-[0.22em] text-white/55">
                Couverture
              </p>
              <p class="mt-3 text-2xl font-semibold tracking-tight text-white">
                {{ recipeCoverage }}%
              </p>
              <p class="mt-2 text-sm leading-6 text-white/70">
                Plats avec lecture recette exploitable
              </p>
            </div>

            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p class="text-xs uppercase tracking-[0.22em] text-white/55">
                Food cost
              </p>
              <p class="mt-3 text-2xl font-semibold tracking-tight text-white">
                {{ formatCurrency(averageFoodCost) }}
              </p>
              <p class="mt-2 text-sm leading-6 text-white/70">
                Moyenne sur les plats calcules
              </p>
            </div>
          </div>

          <div class="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p class="text-sm font-semibold text-white">
              Signal pricing
            </p>
            <p class="mt-2 text-sm leading-6 text-white/70">
              {{ pricingSignal }}
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

    <template v-else>
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          v-for="stat in stats"
          :key="stat.title"
          :title="stat.title"
          :value="stat.value"
          :hint="stat.hint"
        />
      </div>

      <section class="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
            Ce qu un bon plat raconte
          </p>
          <h2 class="mt-3 text-2xl font-semibold tracking-tight">
            Une fiche plus lisible pour un produit plus pro
          </h2>
          <div class="mt-5 grid gap-3">
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm font-semibold text-slate-900 dark:text-white">
                1. Une recette claire
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Quelques ingredients bien doses suffisent deja pour faire monter la perception de qualite.
              </p>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm font-semibold text-slate-900 dark:text-white">
                2. Un objectif de marge
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                La marge cible donne une direction claire au prix conseille affiche ensuite.
              </p>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm font-semibold text-slate-900 dark:text-white">
                3. Un volume journalier
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Ce repere aide les previsions a devenir credibles plus vite.
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
            Focus marge
          </p>
          <h2 class="mt-3 text-2xl font-semibold tracking-tight">
            Les signaux a surveiller
          </h2>
          <div class="mt-5 grid gap-3">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                Prix conseille moyen
              </p>
              <p class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                {{ formatCurrency(averageSuggestedPrice) }}
              </p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                Food cost moyen
              </p>
              <p class="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                {{ formatCurrency(averageFoodCost) }}
              </p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                Lecture produit
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Une carte bien structuree facilite ensuite les ventes, la prevision et la lecture du dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      <EmptyStateCard
        v-if="ingredientStore.items.length === 0"
        eyebrow="Prerequis manquant"
        title="Impossible de creer un plat tant qu il n y a pas d ingredient."
        description="Ajoute au moins un ingredient dans la base pour pouvoir composer une recette et calculer le prix conseille."
        action-label="Ajouter des ingredients"
        action-to="/ingredients"
      />

      <section
        v-else
        id="dish-form"
        class="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
              Formulaire
            </p>
            <h2 class="mt-3 text-xl font-semibold">
              Fiche plat
            </h2>
          </div>
          <span class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            {{ editingDish ? 'Edition en cours' : 'Nouveau plat' }}
          </span>
        </div>
        <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Renseigne la categorie, la marge cible et une recette simple. Meme une premiere version rend l interface beaucoup plus convaincante.
        </p>
        <div class="mt-5">
          <DishForm
            :ingredient-options="ingredientStore.items"
            :initial-value="editingDish"
            :submit-label="editingDish ? 'Mettre a jour le plat' : 'Ajouter le plat'"
            @submit="saveDish"
            @cancel="editingDish = null"
          />
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="mb-5 flex items-center justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
              Table
            </p>
            <h2 class="mt-3 text-xl font-semibold">
              Vue carte
            </h2>
          </div>
          <span class="text-sm text-slate-500">{{ dishStore.items.length }} plat(s)</span>
        </div>
        <DishTable
          :items="dishStore.items"
          @edit="editingDish = $event"
          @remove="removeDish"
        />
      </section>
    </template>
  </div>
</template>

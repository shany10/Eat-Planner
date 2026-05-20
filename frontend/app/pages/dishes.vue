<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
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
const appToast = useAppToast()

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
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de charger les plats')
    appToast.error('Chargement impossible', errorMessage.value)
  } finally {
    loading.value = false
  }
}

async function saveDish(payload: DishPayload) {
  try {
    if (editingDish.value) {
      await dishStore.update(editingDish.value._id, payload)
      editingDish.value = null
      appToast.success('Plat mis a jour', `${payload.name} a ete modifie.`)
    } else {
      await dishStore.create(payload)
      appToast.success('Plat ajoute', `${payload.name} est maintenant dans la carte.`)
    }
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Echec lors de l enregistrement du plat')
    appToast.error('Enregistrement impossible', errorMessage.value)
  }
}

async function removeDish(item: Dish) {
  try {
    await dishStore.remove(item._id)
    appToast.success('Plat supprime', `${item.name} a ete retire de la carte.`)
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Suppression impossible')
    appToast.error('Suppression impossible', errorMessage.value)
  }
}

function formatCurrency(value: number) {
  return `${value.toFixed(2)} EUR`
}

onMounted(loadPage)
</script>

<template>
  <div class="space-y-5">
    <section class="app-page-header app-page-header--compact">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="app-eyebrow">
            Carte rentable
          </p>
          <h1 class="app-title mt-2">
            Recettes et prix de vente
          </h1>
          <p class="app-subtitle mt-2">
            La carte, les prix et le formulaire arrivent tout de suite pour eviter l effet page trop longue.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <a
            href="#dish-form"
            class="btn-primary"
          >
            Ajouter un plat
          </a>
          <NuxtLink
            to="/ingredients"
            class="btn-secondary"
          >
            Ingredients
          </NuxtLink>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <span class="app-pill">{{ activeDishCount }} plat(s) actif(s)</span>
        <span class="app-pill">{{ ingredientStore.items.length }} ingredient(s)</span>
        <span class="app-pill">{{ recipeCoverage }}% recettes</span>
        <span class="app-pill">{{ loading ? 'Calcul en cours' : 'Carte a jour' }}</span>
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

    <template v-else>
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          v-for="stat in stats"
          :key="stat.title"
          :title="stat.title"
          :value="stat.value"
          :hint="stat.hint"
        />
      </div>

      <div class="app-section">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="app-eyebrow">
              Signal pricing
            </p>
            <p class="app-section-title mt-1">
              {{ pricingSignal }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="app-pill">Food cost {{ formatCurrency(averageFoodCost) }}</span>
            <span class="app-pill">Prix moyen {{ formatCurrency(averageSuggestedPrice) }}</span>
            <span class="app-pill">{{ dishCount }} plat(s)</span>
          </div>
        </div>
      </div>

      <EmptyStateCard
        v-if="ingredientStore.items.length === 0"
        eyebrow="Prerequis manquant"
        title="Impossible de creer un plat tant qu il n y a pas d ingredient."
        description="Ajoute au moins un ingredient dans la base pour pouvoir composer une recette et calculer le prix conseille."
        action-label="Ajouter des ingredients"
        action-to="/ingredients"
      />

      <section class="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div class="app-section">
          <div class="mb-4 flex items-center justify-between gap-4">
            <div>
              <p class="app-eyebrow">
                Table
              </p>
              <h2 class="app-section-title mt-1">
                Vue carte
              </h2>
            </div>
            <span class="app-pill">{{ dishStore.items.length }} plat(s)</span>
          </div>
          <DishTable
            :items="dishStore.items"
            @edit="editingDish = $event"
            @remove="removeDish"
          />
        </div>

        <div
          v-if="ingredientStore.items.length > 0"
          id="dish-form"
          class="app-section scroll-mt-28"
        >
          <div class="mb-4 flex items-center justify-between gap-4">
            <div>
              <p class="app-eyebrow">
                Formulaire
              </p>
              <h2 class="app-section-title mt-1">
                {{ editingDish ? 'Modifier plat' : 'Nouveau plat' }}
              </h2>
            </div>
            <span class="app-pill">
              {{ editingDish ? 'Edition' : 'Creation' }}
            </span>
          </div>
          <DishForm
            :ingredient-options="ingredientStore.items"
            :initial-value="editingDish"
            :submit-label="editingDish ? 'Mettre a jour le plat' : 'Ajouter le plat'"
            @submit="saveDish"
            @cancel="editingDish = null"
          />
        </div>
      </section>
    </template>
  </div>
</template>

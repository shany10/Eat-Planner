<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import AppModal from '~/components/common/AppModal.vue'
import EmptyStateCard from '~/components/common/EmptyStateCard.vue'
import DishForm from '~/components/dishes/DishForm.vue'
import DishTable from '~/components/dishes/DishTable.vue'
import PricingAlertsCard from '~/components/dishes/PricingAlertsCard.vue'
import type { Dish, DishIngredientLine } from '~/types/business'
import { useAuthStore } from '~/stores/auth'
import { useDishStore } from '~/stores/dishes'
import { useIngredientStore } from '~/stores/ingredients'

definePageMeta({
  middleware: 'manager'
})

const authStore = useAuthStore()
const dishStore = useDishStore()
const ingredientStore = useIngredientStore()
const appToast = useAppToast()

const editingDish = ref<Dish | null>(null)
const dishModalOpen = ref(false)
const errorMessage = ref('')
const loading = ref(true)
const showFilters = ref(false)

const dishFilters = reactive({
  search: '',
  category: 'all',
  status: 'all',
  health: 'all'
})

type DishPayload = {
  name: string
  category: string
  description?: string
  targetMarginRate: number | null
  actualPriceIncludingTax: number
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
const activeDishCount = computed(
  () => dishStore.items.filter(item => item.active).length
)
const profitableDishCount = computed(
  () =>
    dishStore.items.filter(
      item => (item.profitability?.expectedGrossProfit || 0) > 0
    ).length
)
const estimatedDailyServings = computed(() =>
  dishStore.items.reduce((sum, item) => sum + item.estimatedDailyServings, 0)
)

const averageSuggestedPrice = computed(() => {
  if (dishCount.value === 0) {
    return 0
  }

  return (
    dishStore.items.reduce(
      (sum, item) =>
        sum
        + (item.profitability?.suggestedPriceIncludingTax
          || item.profitability?.suggestedPrice
          || 0),
      0
    ) / dishCount.value
  )
})

const dishCategoryOptions = computed(() =>
  [
    ...new Set(dishStore.items.map(item => item.category).filter(Boolean))
  ].sort((a, b) => a.localeCompare(b, 'fr'))
)

const filteredDishes = computed(() => {
  const search = dishFilters.search.trim().toLowerCase()

  return dishStore.items.filter((item) => {
    const searchableText = [
      item.name,
      item.category,
      item.description,
      ...(item.profitability?.lines?.map(line => line.ingredientName) ?? [])
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    const matchesSearch = !search || searchableText.includes(search)
    const matchesCategory
      = dishFilters.category === 'all' || item.category === dishFilters.category
    const matchesStatus
      = dishFilters.status === 'all'
        || (dishFilters.status === 'active' && item.active)
        || (dishFilters.status === 'inactive' && !item.active)
    const isProfitable = (item.profitability?.expectedGrossProfit || 0) > 0
    const needsReview
      = !item.profitability
        || !item.profitability.lines.length
        || (item.profitability.priceGapIncludingTax ?? 0) < 0
        || !isProfitable
    const matchesHealth
      = dishFilters.health === 'all'
        || (dishFilters.health === 'profitable' && isProfitable)
        || (dishFilters.health === 'review' && needsReview)

    return matchesSearch && matchesCategory && matchesStatus && matchesHealth
  })
})

const dishTableEmptyMessage = computed(() =>
  dishStore.items.length === 0
    ? 'Aucun plat pour le moment. Cree une recette pour voir apparaitre le cout matiere, la part de charges et le prix conseille.'
    : 'Aucun plat ne correspond aux filtres actifs.'
)

const defaultMarginRate = computed(
  () => authStore.profile?.defaultMarginRate ?? 0.72
)

const stats = computed<PageStat[]>(() => [
  {
    title: 'Plats actifs',
    value: activeDishCount.value,
    hint: 'Carte exploitable'
  },
  {
    title: 'Plats rentables',
    value: profitableDishCount.value,
    hint: 'Marge brute positive'
  },
  {
    title: 'Prix conseille TTC moyen',
    value: formatCurrency(averageSuggestedPrice.value),
    hint: 'Repere pricing rapide'
  },
  {
    title: 'Portions / jour',
    value: estimatedDailyServings.value,
    hint: 'Capacite estimee totale'
  }
])

async function loadPage() {
  loading.value = true
  errorMessage.value = ''
  try {
    const results = await Promise.allSettled([
      authStore.loadProfile(),
      dishStore.load(),
      ingredientStore.load()
    ])

    const firstFailure = results.find(result => result.status === 'rejected')

    if (firstFailure?.status === 'rejected') {
      errorMessage.value = getFetchErrorMessage(
        firstFailure.reason,
        'Impossible de charger tous les elements des plats'
      )
      appToast.error('Chargement partiel', errorMessage.value)
    }
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(
      error,
      'Impossible de charger les plats'
    )
    appToast.error('Chargement impossible', errorMessage.value)
  } finally {
    loading.value = false
  }
}

async function saveDish(payload: DishPayload) {
  try {
    if (editingDish.value) {
      await dishStore.update(editingDish.value._id, payload)
      appToast.success('Plat mis a jour', `${payload.name} a ete modifie.`)
    } else {
      await dishStore.create(payload)
      appToast.success(
        'Plat ajoute',
        `${payload.name} est maintenant dans la carte.`
      )
    }
    closeDishModal()
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(
      error,
      'Echec lors de l enregistrement du plat'
    )
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

function openDishModal() {
  editingDish.value = null
  dishModalOpen.value = true
}

function editDish(item: Dish) {
  editingDish.value = item
  dishModalOpen.value = true
}

function closeDishModal() {
  dishModalOpen.value = false
  editingDish.value = null
}

function resetDishFilters() {
  dishFilters.search = ''
  dishFilters.category = 'all'
  dishFilters.status = 'all'
  dishFilters.health = 'all'
}

function formatCurrency(value: number) {
  return `${value.toFixed(2)} €`
}

onMounted(loadPage)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      eyebrow="Carte rentable"
      title="Recettes & prix de vente"
      subtitle="Compose tes plats et lis d'un coup d'œil coût, marge et prix conseillé."
    >
      <template #actions>
        <AppButton
          icon="i-lucide-plus"
          :disabled="ingredientStore.items.length === 0"
          @click="openDishModal"
        >
          Ajouter un plat
        </AppButton>
        <AppButton
          variant="secondary"
          to="/ingredients"
          icon="i-lucide-wheat"
        >
          Ingrédients
        </AppButton>
      </template>
    </PageHeader>

    <p
      v-if="errorMessage"
      class="app-alert-error"
    >
      <UIcon
        name="i-lucide-circle-alert"
        class="mt-0.5 size-4 shrink-0"
      />
      <span>{{ errorMessage }}</span>
    </p>

    <template v-if="loading">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="index in 4"
          :key="index"
          class="h-24 animate-pulse rounded-[var(--ep-radius)] bg-[color:var(--ep-surface-muted)]"
        />
      </div>
    </template>

    <template v-else>
      <EmptyStateCard
        v-if="ingredientStore.items.length === 0"
        eyebrow="Prérequis manquant"
        title="Ajoute d'abord un ingrédient"
        description="Il faut au moins une matière première dans la base pour composer une recette et calculer le prix conseillé."
        action-label="Ajouter des ingrédients"
        action-to="/ingredients"
      />

      <template v-else>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            v-for="stat in stats"
            :key="stat.title"
            :title="stat.title"
            :value="stat.value"
            :hint="stat.hint"
          />
        </div>

        <PricingAlertsCard />

        <section class="app-section space-y-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-2">
              <h2 class="app-section-title">
                Carte
              </h2>
              <AppBadge>{{ filteredDishes.length }} / {{ dishStore.items.length }}</AppBadge>
            </div>

            <div class="flex items-center gap-2">
              <div class="relative flex-1 sm:w-64 sm:flex-none">
                <UIcon
                  name="i-lucide-search"
                  class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--ep-text-subtle)]"
                />
                <input
                  v-model="dishFilters.search"
                  class="app-input pl-9"
                  type="search"
                  placeholder="Rechercher…"
                  aria-label="Rechercher un plat"
                >
              </div>
              <button
                type="button"
                class="btn-secondary btn-sm"
                :aria-expanded="showFilters"
                @click="showFilters = !showFilters"
              >
                <UIcon
                  name="i-lucide-sliders-horizontal"
                  class="size-4"
                />
                <span class="hidden sm:inline">Filtres</span>
              </button>
            </div>
          </div>

          <div
            v-if="showFilters"
            class="grid gap-3 border-t border-[color:var(--ep-border)] pt-4 sm:grid-cols-3"
          >
            <select
              v-model="dishFilters.category"
              class="app-input"
              aria-label="Filtrer par catégorie"
            >
              <option value="all">
                Toutes catégories
              </option>
              <option
                v-for="category in dishCategoryOptions"
                :key="category"
                :value="category"
              >
                {{ category }}
              </option>
            </select>
            <select
              v-model="dishFilters.status"
              class="app-input"
              aria-label="Filtrer par statut"
            >
              <option value="all">
                Tous statuts
              </option>
              <option value="active">
                Actifs
              </option>
              <option value="inactive">
                Inactifs
              </option>
            </select>
            <div class="flex gap-2">
              <select
                v-model="dishFilters.health"
                class="app-input"
                aria-label="Filtrer par rentabilité"
              >
                <option value="all">
                  Tous niveaux
                </option>
                <option value="profitable">
                  Rentables
                </option>
                <option value="review">
                  À revoir
                </option>
              </select>
              <button
                type="button"
                class="btn-ghost btn-sm shrink-0"
                aria-label="Réinitialiser les filtres"
                @click="resetDishFilters"
              >
                <UIcon
                  name="i-lucide-rotate-ccw"
                  class="size-4"
                />
              </button>
            </div>
          </div>

          <DishTable
            :items="filteredDishes"
            :empty-message="dishTableEmptyMessage"
            @edit="editDish"
            @remove="removeDish"
          />
        </section>
      </template>
    </template>

    <AppModal
      :open="dishModalOpen"
      :title="editingDish ? 'Modifier plat' : 'Nouveau plat'"
      eyebrow="Formulaire"
      :description="
        editingDish
          ? 'Ajuste la recette, le prix ou les portions.'
          : 'Ajoute la recette sans perdre la table de vue.'
      "
      size="lg"
      variant="warm"
      @close="closeDishModal"
    >
      <DishForm
        :ingredient-options="ingredientStore.items"
        :initial-value="editingDish"
        :default-margin-rate="defaultMarginRate"
        :submit-label="
          editingDish ? 'Mettre a jour le plat' : 'Ajouter le plat'
        "
        @submit="saveDish"
        @cancel="closeDishModal"
      />
    </AppModal>
  </div>
</template>

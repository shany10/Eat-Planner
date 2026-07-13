<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import AppModal from '~/components/common/AppModal.vue'
import IngredientForm from '~/components/ingredients/IngredientForm.vue'
import IngredientTable from '~/components/ingredients/IngredientTable.vue'
import type { Ingredient } from '~/types/business'
import { useIngredientStore } from '~/stores/ingredients'
import { useSupplierStore } from '~/stores/suppliers'

definePageMeta({
  middleware: 'manager'
})

const ingredientStore = useIngredientStore()
const supplierStore = useSupplierStore()
const appToast = useAppToast()

const editingIngredient = ref<Ingredient | null>(null)
const isIngredientModalOpen = ref(false)
const errorMessage = ref('')
const loading = ref(true)
const showFilters = ref(false)

const ingredientFilters = reactive({
  search: '',
  category: 'all',
  unit: 'all',
  supplier: 'all',
  status: 'all'
})

type PageStat = {
  title: string
  value: string | number
  hint: string
}

type IngredientPayload = {
  name: string
  category: Ingredient['category']
  unit: Ingredient['unit']
  orderUnit?: Ingredient['unit']
  purchasePrice: number
  stockQuantity?: number
  minimumStock?: number
  averageDailyUsage?: number
  minimumOrderQuantity?: number
  supplier?: string | null
  active?: boolean
}

const ingredientCategoryOptions: Ingredient['category'][] = [
  'Viandes',
  'Poissons',
  'Fruits et legumes',
  'Produits laitiers',
  'Epicerie seche',
  'Boissons',
  'Surgeles',
  'Boulangerie',
  'Condiments',
  'Produits d entretien'
]

const ingredientCount = computed(() => ingredientStore.items.length)
const activeIngredientCount = computed(() => ingredientStore.items.filter(item => item.active).length)
const linkedIngredientCount = computed(() => ingredientStore.items.filter(item => Boolean(item.supplier)).length)
const lowStockIngredientCount = computed(() =>
  ingredientStore.items.filter(item => item.stockQuantity <= item.minimumStock).length
)

const ingredientCoverage = computed(() => {
  if (ingredientCount.value === 0) {
    return 0
  }

  return Math.round((linkedIngredientCount.value / ingredientCount.value) * 100)
})

const averagePurchasePrice = computed(() => {
  if (ingredientCount.value === 0) {
    return 0
  }

  return ingredientStore.items.reduce((sum, item) => sum + item.purchasePrice, 0) / ingredientCount.value
})

const ingredientUnitOptions = computed(() =>
  [...new Set(ingredientStore.items.map(item => item.unit))]
)

const filteredIngredients = computed(() => {
  const search = ingredientFilters.search.trim().toLowerCase()

  return ingredientStore.items.filter((item) => {
    const supplierId = getIngredientSupplierId(item)
    const supplierName = getIngredientSupplierName(item)
    const searchableText = [
      item.name,
      item.category,
      item.unit,
      item.purchasePrice.toFixed(2),
      String(item.stockQuantity),
      String(item.minimumStock),
      supplierName
    ].filter(Boolean).join(' ').toLowerCase()

    const matchesSearch = !search || searchableText.includes(search)
    const matchesCategory = ingredientFilters.category === 'all' || item.category === ingredientFilters.category
    const matchesUnit = ingredientFilters.unit === 'all' || item.unit === ingredientFilters.unit
    const matchesStatus = ingredientFilters.status === 'all'
      || (ingredientFilters.status === 'active' && item.active)
      || (ingredientFilters.status === 'inactive' && !item.active)
    const matchesSupplier = ingredientFilters.supplier === 'all'
      || (ingredientFilters.supplier === 'linked' && Boolean(item.supplier))
      || (ingredientFilters.supplier === 'unlinked' && !item.supplier)
      || supplierId === ingredientFilters.supplier

    return matchesSearch && matchesCategory && matchesUnit && matchesStatus && matchesSupplier
  })
})

const ingredientTableEmptyMessage = computed(() =>
  ingredientStore.items.length === 0
    ? 'Aucun ingredient pour le moment. Cree ta premiere matiere premiere pour activer le calcul des plats.'
    : 'Aucun ingredient ne correspond aux filtres actifs.'
)

const stats = computed<PageStat[]>(() => [
  { title: 'Ingredients actifs', value: activeIngredientCount.value, hint: 'References utilisables' },
  { title: 'Ingredients relies', value: `${ingredientCoverage.value}%`, hint: 'Avec fournisseur associe' },
  { title: 'Stock bas', value: lowStockIngredientCount.value, hint: 'Sous le seuil conseille' },
  { title: 'Prix achat moyen', value: formatCurrency(averagePurchasePrice.value), hint: 'Repere matiere rapide' }
])

const modalTitle = computed(() => editingIngredient.value ? 'Modifier ingredient' : 'Nouvel ingredient')
const modalDescription = computed(() =>
  editingIngredient.value
    ? 'Mets a jour le prix, l unite ou le fournisseur sans quitter la table.'
    : 'Ajoute une matiere premiere; le fournisseur reste optionnel.'
)

async function loadPage() {
  loading.value = true
  errorMessage.value = ''
  try {
    const results = await Promise.allSettled([ingredientStore.load(), supplierStore.load()])
    const firstFailure = results.find(result => result.status === 'rejected')

    if (firstFailure?.status === 'rejected') {
      errorMessage.value = getFetchErrorMessage(firstFailure.reason, 'Impossible de charger tous les elements des ingredients')
      appToast.error('Chargement partiel', errorMessage.value)
    }
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de charger les ingredients')
    appToast.error('Chargement impossible', errorMessage.value)
  } finally {
    loading.value = false
  }
}

function openCreateIngredient() {
  editingIngredient.value = null
  isIngredientModalOpen.value = true
}

function openEditIngredient(item: Ingredient) {
  editingIngredient.value = item
  isIngredientModalOpen.value = true
}

function closeIngredientModal() {
  isIngredientModalOpen.value = false
  editingIngredient.value = null
}

function resetIngredientFilters() {
  ingredientFilters.search = ''
  ingredientFilters.category = 'all'
  ingredientFilters.unit = 'all'
  ingredientFilters.supplier = 'all'
  ingredientFilters.status = 'all'
}

async function saveIngredient(payload: IngredientPayload) {
  try {
    if (editingIngredient.value) {
      await ingredientStore.update(editingIngredient.value._id, payload)
      appToast.success('Ingredient mis a jour', `${payload.name} a ete modifie.`)
    } else {
      await ingredientStore.create(payload)
      appToast.success('Ingredient ajoute', `${payload.name} est maintenant disponible.`)
    }

    closeIngredientModal()
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Echec lors de l enregistrement de l ingredient')
    appToast.error('Enregistrement impossible', errorMessage.value)
  }
}

async function removeIngredient(item: Ingredient) {
  try {
    await ingredientStore.remove(item._id)
    appToast.success('Ingredient supprime', `${item.name} a ete retire.`)
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Suppression impossible')
    appToast.error('Suppression impossible', errorMessage.value)
  }
}

function formatCurrency(value: number) {
  return `${value.toFixed(2)} EUR`
}

function getIngredientSupplierId(item: Ingredient) {
  if (!item.supplier) {
    return ''
  }

  return typeof item.supplier === 'object' ? item.supplier._id : item.supplier
}

function getIngredientSupplierName(item: Ingredient) {
  if (!item.supplier) {
    return ''
  }

  if (typeof item.supplier === 'object') {
    return item.supplier.name
  }

  return supplierStore.items.find(supplier => supplier._id === item.supplier)?.name ?? item.supplier
}

onMounted(loadPage)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      eyebrow="Matières premières"
      title="Ingrédients"
      subtitle="Gère ta base matière et retrouve chaque référence en un coup d'œil."
    >
      <template #actions>
        <AppButton
          icon="i-lucide-plus"
          @click="openCreateIngredient"
        >
          Ajouter un ingrédient
        </AppButton>
        <AppButton
          variant="secondary"
          to="/suppliers"
          icon="i-lucide-truck"
        >
          Fournisseurs
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
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          v-for="stat in stats"
          :key="stat.title"
          :title="stat.title"
          :value="stat.value"
          :hint="stat.hint"
        />
      </div>

      <section class="app-section space-y-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-2">
            <h2 class="app-section-title">
              Base ingrédients
            </h2>
            <AppBadge>{{ filteredIngredients.length }} / {{ ingredientStore.items.length }}</AppBadge>
          </div>

          <div class="flex items-center gap-2">
            <div class="relative flex-1 sm:w-64 sm:flex-none">
              <UIcon
                name="i-lucide-search"
                class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--ep-text-subtle)]"
              />
              <input
                v-model="ingredientFilters.search"
                class="app-input pl-9"
                type="search"
                placeholder="Rechercher…"
                aria-label="Rechercher un ingrédient"
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
          class="grid gap-3 border-t border-[color:var(--ep-border)] pt-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <select
            v-model="ingredientFilters.category"
            class="app-input"
            aria-label="Filtrer par catégorie"
          >
            <option value="all">
              Toutes catégories
            </option>
            <option
              v-for="category in ingredientCategoryOptions"
              :key="category"
              :value="category"
            >
              {{ category }}
            </option>
          </select>
          <select
            v-model="ingredientFilters.unit"
            class="app-input"
            aria-label="Filtrer par unité"
          >
            <option value="all">
              Toutes unités
            </option>
            <option
              v-for="unit in ingredientUnitOptions"
              :key="unit"
              :value="unit"
            >
              {{ unit }}
            </option>
          </select>
          <select
            v-model="ingredientFilters.supplier"
            class="app-input"
            aria-label="Filtrer par fournisseur"
          >
            <option value="all">
              Tous fournisseurs
            </option>
            <option value="linked">
              Avec fournisseur
            </option>
            <option value="unlinked">
              Sans fournisseur
            </option>
            <option
              v-for="supplier in supplierStore.items"
              :key="supplier._id"
              :value="supplier._id"
            >
              {{ supplier.name }}
            </option>
          </select>
          <div class="flex gap-2">
            <select
              v-model="ingredientFilters.status"
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
            <button
              type="button"
              class="btn-ghost btn-sm shrink-0"
              aria-label="Réinitialiser les filtres"
              @click="resetIngredientFilters"
            >
              <UIcon
                name="i-lucide-rotate-ccw"
                class="size-4"
              />
            </button>
          </div>
        </div>

        <IngredientTable
          :items="filteredIngredients"
          :empty-message="ingredientTableEmptyMessage"
          @edit="openEditIngredient"
          @remove="removeIngredient"
        />
      </section>
    </template>

    <AppModal
      :open="isIngredientModalOpen"
      :title="modalTitle"
      :description="modalDescription"
      eyebrow="Ingredient"
      size="lg"
      variant="warm"
      @close="closeIngredientModal"
    >
      <IngredientForm
        :suppliers="supplierStore.items"
        :initial-value="editingIngredient"
        :submit-label="editingIngredient ? 'Mettre a jour l ingredient' : 'Ajouter l ingredient'"
        show-cancel
        @submit="saveIngredient"
        @cancel="closeIngredientModal"
      />
    </AppModal>
  </div>
</template>

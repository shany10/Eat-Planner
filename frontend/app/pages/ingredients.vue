<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import AppModal from '~/components/common/AppModal.vue'
import StatCard from '~/components/common/StatCard.vue'
import IngredientForm from '~/components/ingredients/IngredientForm.vue'
import IngredientTable from '~/components/ingredients/IngredientTable.vue'
import type { Ingredient } from '~/types/business'
import { useIngredientStore } from '~/stores/ingredients'
import { useSupplierStore } from '~/stores/suppliers'

definePageMeta({
  middleware: 'auth'
})

const ingredientStore = useIngredientStore()
const supplierStore = useSupplierStore()
const appToast = useAppToast()

const editingIngredient = ref<Ingredient | null>(null)
const isIngredientModalOpen = ref(false)
const errorMessage = ref('')
const loading = ref(true)

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
const supplierCount = computed(() => supplierStore.items.length)
const activeSupplierCount = computed(() => supplierStore.items.filter(item => item.active).length)
const linkedIngredientCount = computed(() => ingredientStore.items.filter(item => Boolean(item.supplier)).length)
const supplierlessIngredients = computed(() => ingredientStore.items.filter(item => !item.supplier).length)
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

const setupSignal = computed(() => {
  if (ingredientCount.value === 0) {
    return 'Ajoute les premieres matieres premieres pour debloquer les recettes et les prix conseilles.'
  }

  if (supplierCount.value === 0) {
    return 'Les ingredients sont prets; tu peux ajouter les fournisseurs sur une page dediee quand tu veux structurer les achats.'
  }

  if (supplierlessIngredients.value > 0) {
    return `${supplierlessIngredients.value} ingredient(s) restent sans fournisseur. La table est exploitable, mais les achats seront plus lisibles avec ces liens.`
  }

  return 'La base matiere est proprement reliee aux fournisseurs.'
})

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
    await Promise.all([ingredientStore.load(), supplierStore.load()])
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
  <div class="space-y-5">
    <section class="app-page-header app-page-header--compact">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="app-eyebrow">
            Matieres premieres
          </p>
          <h1 class="app-title mt-2">
            Ingredients
          </h1>
          <p class="app-subtitle mt-2">
            Une page centree sur la table ingredients, avec creation et edition en fenetre pour garder la lecture claire.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="btn-primary"
            @click="openCreateIngredient"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-4"
            />
            Ajouter un ingredient
          </button>
          <NuxtLink
            to="/suppliers"
            class="btn-secondary"
          >
            <UIcon
              name="i-lucide-truck"
              class="size-4"
            />
            Fournisseurs
          </NuxtLink>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <span class="app-pill">{{ activeIngredientCount }} ingredient(s) actif(s)</span>
        <span class="app-pill">{{ activeSupplierCount }} fournisseur(s) actif(s)</span>
        <span class="app-pill">{{ ingredientCoverage }}% relies</span>
        <span class="app-pill">{{ lowStockIngredientCount }} stock bas</span>
        <span class="app-pill">{{ loading ? 'Synchronisation' : 'Base a jour' }}</span>
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
              Signal base
            </p>
            <p class="app-section-title mt-1">
              {{ setupSignal }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="app-pill">{{ supplierlessIngredients }} sans fournisseur</span>
            <span class="app-pill">{{ lowStockIngredientCount }} a reapprovisionner</span>
            <span class="app-pill">{{ supplierCount }} fournisseur(s)</span>
            <span class="app-pill">{{ ingredientCount }} ingredient(s)</span>
          </div>
        </div>
      </div>

      <section class="app-section">
        <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="app-eyebrow">
              Filtres
            </p>
            <h2 class="app-section-title mt-1">
              Retrouver une matiere premiere
            </h2>
          </div>
          <span class="app-pill">{{ filteredIngredients.length }} / {{ ingredientStore.items.length }} ligne(s)</span>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_0.8fr_1fr_1fr_auto]">
          <input
            v-model="ingredientFilters.search"
            class="app-input"
            type="search"
            placeholder="Rechercher nom, fournisseur, prix"
            aria-label="Rechercher un ingredient"
          >
          <select
            v-model="ingredientFilters.category"
            class="app-input"
            aria-label="Filtrer par categorie"
          >
            <option value="all">
              Toutes categories
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
            aria-label="Filtrer par unite"
          >
            <option value="all">
              Toutes unites
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
            class="btn-secondary"
            @click="resetIngredientFilters"
          >
            <UIcon
              name="i-lucide-rotate-ccw"
              class="size-4"
            />
            Reset
          </button>
        </div>
      </section>

      <section
        v-if="ingredientStore.items.length === 0"
        class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 dark:border-slate-700 dark:bg-slate-900/60"
      >
        <p class="app-eyebrow">
          Premier setup
        </p>
        <h3 class="mt-3 text-lg font-semibold text-slate-950 dark:text-white">
          Ajoute ton premier ingredient.
        </h3>
        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
          La table reste vide pour le moment. Le bouton ouvre une fenetre propre, sans pousser la table plus bas dans la page.
        </p>
        <div class="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            class="btn-primary"
            @click="openCreateIngredient"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-4"
            />
            Creer un ingredient
          </button>
          <NuxtLink
            to="/suppliers"
            class="btn-secondary"
          >
            Gerer les fournisseurs
          </NuxtLink>
        </div>
      </section>

      <div class="app-section">
        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="app-eyebrow">
              Table
            </p>
            <h2 class="app-section-title mt-1">
              Base ingredients
            </h2>
          </div>
          <span class="app-pill">{{ filteredIngredients.length }} ligne(s)</span>
        </div>
        <IngredientTable
          :items="filteredIngredients"
          :empty-message="ingredientTableEmptyMessage"
          @edit="openEditIngredient"
          @remove="removeIngredient"
        />
      </div>
    </template>

    <AppModal
      :open="isIngredientModalOpen"
      :title="modalTitle"
      :description="modalDescription"
      eyebrow="Ingredient"
      size="lg"
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

<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import AppModal from '~/components/common/AppModal.vue'
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
  <div class="p-4 md:p-8 space-y-6 font-sans">
    <section>
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <span class="text-[10px] uppercase tracking-widest font-bold text-[#40493e]/60 dark:text-[#c0c9ba]">Matieres premieres</span>
          <h1 class="text-3xl md:text-[32px] md:leading-10 font-bold text-[#1a1c1c] dark:text-[#f1f1f1] font-['Be_Vietnam_Pro',sans-serif]">
            Ingredients
          </h1>
          <p class="text-[#40493e] dark:text-[#c0c9ba] text-sm mt-1">
            Une page centree sur la table ingredients, avec creation et edition en fenetre pour garder la lecture claire.
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] font-bold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-2"
            @click="openCreateIngredient"
          >
            <UIcon name="i-lucide-plus" class="size-5" />
            Ajouter un ingredient
          </button>
          <NuxtLink
            to="/suppliers"
            class="bg-[#6b3414] text-white hover:bg-[#884b29] font-bold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-2"
          >
            <UIcon name="i-lucide-truck" class="size-5" />
            Fournisseurs
          </NuxtLink>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 py-4">
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ activeIngredientCount }} ingredient(s) actif(s)</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ activeSupplierCount }} fournisseur(s) actif(s)</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ ingredientCoverage }}% relies</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ lowStockIngredientCount }} stock bas</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ loading ? 'Synchronisation' : 'Base a jour' }}</span>
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

    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

      <div class="bg-[#005013]/5 dark:bg-[#8ad986]/10 rounded-[2.5rem] p-6 border border-[#005013]/20 dark:border-[#8ad986]/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div class="flex items-center gap-4">
          <UIcon name="i-lucide-megaphone" class="text-[#005013] dark:text-[#8ad986] size-7 shrink-0" />
          <div>
            <span class="text-[10px] font-bold uppercase text-[#005013]/70 dark:text-[#8ad986]/70">Signal base</span>
            <p class="font-bold text-[#1a1c1c] dark:text-[#e2e2e2] mt-0.5">
              {{ setupSignal }}
            </p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 shrink-0">
          <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[10px] font-bold rounded-full text-[#40493e] dark:text-[#c0c9ba]">{{ supplierlessIngredients }} sans fournisseur</span>
          <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[10px] font-bold rounded-full text-[#40493e] dark:text-[#c0c9ba]">{{ lowStockIngredientCount }} a reapprovisionner</span>
          <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[10px] font-bold rounded-full text-[#40493e] dark:text-[#c0c9ba]">{{ supplierCount }} fournisseur(s)</span>
        </div>
      </div>

      <section class="bg-white dark:bg-[#1a1c1c] rounded-[2.5rem] p-6 border border-[#c0c9ba]/20 dark:border-white/5 shadow-sm">
        <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/60">Filtres</span>
            <h4 class="font-bold text-[#1a1c1c] dark:text-white mt-1">
              Retrouver une matiere premiere
            </h4>
          </div>
          <span class="bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] px-3 py-1 rounded-full text-[10px] font-bold w-fit">{{ filteredIngredients.length }} / {{ ingredientStore.items.length }} ligne(s)</span>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_0.8fr_1fr_1fr_auto]">
          <input
            v-model="ingredientFilters.search"
            class="bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
            type="search"
            placeholder="Rechercher nom, fournisseur, prix"
            aria-label="Rechercher un ingredient"
          >
          <select
            v-model="ingredientFilters.category"
            class="bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
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
            class="bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
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
            class="bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
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
            class="bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
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
            class="border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white font-bold py-2.5 px-6 rounded-full hover:bg-[#f3f3f3] dark:hover:bg-[#2f3131] transition-all flex items-center justify-center gap-2"
            @click="resetIngredientFilters"
          >
            <UIcon name="i-lucide-rotate-ccw" class="size-4" />
            Reset
          </button>
        </div>
      </section>

      <section
        v-if="ingredientStore.items.length === 0"
        class="bg-white dark:bg-[#1a1c1c] rounded-[2.5rem] p-10 md:p-16 border-2 border-dashed border-[#c0c9ba] dark:border-[#40493e] flex flex-col items-center text-center space-y-6"
      >
        <div class="space-y-3">
          <span class="text-[10px] font-bold uppercase text-[#40493e]/50 dark:text-[#c0c9ba]/50">Premier setup</span>
          <h3 class="text-2xl font-bold text-[#1a1c1c] dark:text-white">
            Ajoute ton premier ingredient.
          </h3>
          <p class="text-[#40493e] dark:text-[#c0c9ba] text-sm max-w-md mx-auto">
            La table reste vide pour le moment. Le bouton ouvre une fenetre propre, sans pousser la table plus bas dans la page.
          </p>
        </div>
        <div class="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            class="bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex justify-center items-center gap-2"
            @click="openCreateIngredient"
          >
            <UIcon name="i-lucide-plus" class="size-5" />
            Creer un ingredient
          </button>
          <NuxtLink
            to="/suppliers"
            class="border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white font-bold py-3 px-8 rounded-full hover:bg-[#f3f3f3] dark:hover:bg-[#2f3131] transition-all flex justify-center items-center"
          >
            Gerer les fournisseurs
          </NuxtLink>
        </div>
      </section>

      <div
        v-else
        class="bg-white dark:bg-[#1a1c1c] rounded-[2.5rem] overflow-hidden border border-[#c0c9ba]/20 dark:border-white/5 shadow-sm"
      >
        <div class="p-6 border-b border-[#c0c9ba]/20 dark:border-white/5 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center bg-[#f3f3f3]/50 dark:bg-[#2f3131]/50">
          <div>
            <span class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/60">Table</span>
            <h4 class="font-bold text-[#1a1c1c] dark:text-white mt-1">
              Base ingredients
            </h4>
          </div>
          <span class="bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] px-3 py-1 rounded-full text-[10px] font-bold w-fit">{{ filteredIngredients.length }} ligne(s)</span>
        </div>
        <div class="p-0">
          <IngredientTable
            :items="filteredIngredients"
            :empty-message="ingredientTableEmptyMessage"
            @edit="openEditIngredient"
            @remove="removeIngredient"
          />
        </div>
      </div>
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

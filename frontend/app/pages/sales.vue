<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import AppModal from '~/components/common/AppModal.vue'
import EmptyStateCard from '~/components/common/EmptyStateCard.vue'
import SaleCsvImport from '~/components/sales/SaleCsvImport.vue'
import SaleForm from '~/components/sales/SaleForm.vue'
import SaleTable from '~/components/sales/SaleTable.vue'
import type { Sale } from '~/types/business'
import { useDishStore } from '~/stores/dishes'
import { useSaleStore } from '~/stores/sales'

definePageMeta({
  middleware: 'auth'
})

const saleStore = useSaleStore()
const dishStore = useDishStore()
const appToast = useAppToast()
const errorMessage = ref('')
const loading = ref(true)
const saleModalOpen = ref(false)
const importModalOpen = ref(false)
const showFilters = ref(false)

const saleFilters = reactive({
  search: '',
  dateFrom: '',
  dateTo: '',
  minAmount: ''
})

type PageStat = {
  title: string
  value: string | number
  hint: string
}

const ticketCount = computed(() => saleStore.items.length)
const totalRevenue = computed(() => saleStore.items.reduce((sum, sale) => sum + sale.totalAmount, 0))
const totalUnitsSold = computed(() =>
  saleStore.items.reduce((sum, sale) => sum + sale.items.reduce((lineSum, item) => lineSum + item.quantity, 0), 0)
)

const averageTicket = computed(() => {
  if (ticketCount.value === 0) {
    return 0
  }

  return totalRevenue.value / ticketCount.value
})

const filteredSales = computed(() => {
  const search = saleFilters.search.trim().toLowerCase()
  const minAmount = saleFilters.minAmount === '' ? null : Number(saleFilters.minAmount)

  return saleStore.items.filter((sale) => {
    const saleDate = toDateKey(sale.serviceDate)
    const searchableText = [
      saleDate,
      sale.notes,
      sale.totalAmount.toFixed(2),
      ...sale.items.map(item => getSaleItemDishName(item))
    ].filter(Boolean).join(' ').toLowerCase()

    const matchesSearch = !search || searchableText.includes(search)
    const matchesFrom = !saleFilters.dateFrom || saleDate >= saleFilters.dateFrom
    const matchesTo = !saleFilters.dateTo || saleDate <= saleFilters.dateTo
    const matchesAmount = minAmount === null || sale.totalAmount >= minAmount

    return matchesSearch && matchesFrom && matchesTo && matchesAmount
  })
})

const saleTableEmptyMessage = computed(() =>
  saleStore.items.length === 0
    ? 'Aucune vente enregistree. Cree ton premier ticket pour commencer a alimenter les previsions.'
    : 'Aucune vente ne correspond aux filtres actifs.'
)

const stats = computed<PageStat[]>(() => [
  { title: 'Tickets', value: ticketCount.value, hint: 'Historique saisi' },
  { title: 'CA cumule', value: formatCurrency(totalRevenue.value), hint: 'Tous tickets confondus' },
  { title: 'Ticket moyen', value: formatCurrency(averageTicket.value), hint: 'Repere commercial rapide' },
  { title: 'Quantites vendues', value: totalUnitsSold.value, hint: 'Somme des portions saisies' }
])

async function loadPage() {
  loading.value = true
  errorMessage.value = ''
  try {
    const results = await Promise.allSettled([saleStore.load(), dishStore.load()])
    const firstFailure = results.find(result => result.status === 'rejected')

    if (firstFailure?.status === 'rejected') {
      errorMessage.value = getFetchErrorMessage(firstFailure.reason, 'Impossible de charger tous les elements des ventes')
      appToast.error('Chargement partiel', errorMessage.value)
    }
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de charger les ventes')
    appToast.error('Chargement impossible', errorMessage.value)
  } finally {
    loading.value = false
  }
}

async function saveSale(payload: {
  serviceDate: string
  notes?: string
  items: Array<{ dish: string, quantity: number, unitPrice?: number }>
}) {
  try {
    await saleStore.create(payload)
    saleModalOpen.value = false
    appToast.success('Vente enregistree', `Ticket du ${formatDate(payload.serviceDate)} ajoute.`)
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Echec lors de l enregistrement de la vente')
    appToast.error('Enregistrement impossible', errorMessage.value)
  }
}

async function importSalesCsv(csv: string) {
  try {
    const result = await saleStore.importCsv(csv)
    const detail = result.skippedRows > 0
      ? `${result.importedRows} ligne(s) importee(s), ${result.skippedRows} ignoree(s).`
      : `${result.importedRows} ligne(s) importee(s) dans ${result.createdSales} ticket(s).`

    importModalOpen.value = false
    appToast.success('Import CSV termine', detail)

    if (result.errors.length > 0) {
      errorMessage.value = result.errors.join(' ')
    }
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Import CSV impossible')
    appToast.error('Import impossible', errorMessage.value)
  }
}

async function removeSale(item: Sale) {
  try {
    await saleStore.remove(item._id)
    appToast.success('Vente supprimee', `Ticket du ${formatDate(item.serviceDate)} retire.`)
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Suppression impossible')
    appToast.error('Suppression impossible', errorMessage.value)
  }
}

function resetSaleFilters() {
  saleFilters.search = ''
  saleFilters.dateFrom = ''
  saleFilters.dateTo = ''
  saleFilters.minAmount = ''
}

function getSaleItemDishName(item: Sale['items'][number]) {
  return typeof item.dish === 'object' ? item.dish.name : item.dish
}

function toDateKey(value: Date | string) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatCurrency(value: number) {
  return `${value.toFixed(2)} EUR`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value))
}

onMounted(loadPage)
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      eyebrow="Historique commercial"
      title="Ventes"
      subtitle="Enregistre tes tickets pour alimenter le dashboard et les prévisions."
    >
      <template #actions>
        <AppButton
          icon="i-lucide-plus"
          :disabled="dishStore.items.length === 0"
          @click="saleModalOpen = true"
        >
          Ajouter une vente
        </AppButton>
        <AppButton
          variant="secondary"
          icon="i-lucide-upload"
          :disabled="dishStore.items.length === 0"
          @click="importModalOpen = true"
        >
          Import CSV
        </AppButton>
        <AppButton
          variant="ghost"
          to="/dishes"
          icon="i-lucide-utensils"
        >
          Plats
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
        v-if="dishStore.items.length === 0"
        eyebrow="Prérequis manquant"
        title="Ajoute d'abord un plat"
        description="Il faut au moins un plat à la carte pour enregistrer un ticket et alimenter les prévisions."
        action-label="Créer un plat"
        action-to="/dishes"
        secondary-label="Compléter les ingrédients"
        secondary-to="/ingredients"
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

        <section class="app-section space-y-4">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-2">
              <h2 class="app-section-title">
                Tickets enregistrés
              </h2>
              <AppBadge>{{ filteredSales.length }} / {{ saleStore.items.length }}</AppBadge>
            </div>

            <div class="flex items-center gap-2">
              <div class="relative flex-1 sm:w-64 sm:flex-none">
                <UIcon
                  name="i-lucide-search"
                  class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--ep-text-subtle)]"
                />
                <input
                  v-model="saleFilters.search"
                  class="app-input pl-9"
                  type="search"
                  placeholder="Rechercher…"
                  aria-label="Rechercher une vente"
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
            <label class="block">
              <span class="app-label">Depuis</span>
              <input
                v-model="saleFilters.dateFrom"
                class="app-input"
                type="date"
                aria-label="Date de début"
              >
            </label>
            <label class="block">
              <span class="app-label">Jusqu'au</span>
              <input
                v-model="saleFilters.dateTo"
                class="app-input"
                type="date"
                aria-label="Date de fin"
              >
            </label>
            <label class="block">
              <span class="app-label">CA minimum</span>
              <input
                v-model="saleFilters.minAmount"
                class="app-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                aria-label="Montant minimum"
              >
            </label>
            <div class="flex items-end">
              <button
                type="button"
                class="btn-ghost btn-sm"
                @click="resetSaleFilters"
              >
                <UIcon
                  name="i-lucide-rotate-ccw"
                  class="size-4"
                />
                Réinitialiser
              </button>
            </div>
          </div>

          <SaleTable
            :items="filteredSales"
            :empty-message="saleTableEmptyMessage"
            @remove="removeSale"
          />
        </section>
      </template>
    </template>

    <AppModal
      :open="saleModalOpen"
      title="Nouveau ticket"
      eyebrow="Formulaire"
      description="Enregistre la vente sans masquer durablement la table."
      size="lg"
      variant="warm"
      @close="saleModalOpen = false"
    >
      <SaleForm
        :dishes="dishStore.items"
        @submit="saveSale"
      />
    </AppModal>

    <AppModal
      :open="importModalOpen"
      title="Importer des ventes"
      eyebrow="CSV"
      description="Ajoute un fichier CSV, puis la table se met a jour."
      variant="warm"
      @close="importModalOpen = false"
    >
      <SaleCsvImport @import="importSalesCsv" />
    </AppModal>
  </div>
</template>

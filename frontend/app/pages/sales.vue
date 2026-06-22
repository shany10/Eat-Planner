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

const latestSale = computed(() =>
  [...saleStore.items].sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())[0] ?? null
)

const todayRevenue = computed(() => {
  const today = toDateKey(new Date())

  return saleStore.items
    .filter(sale => toDateKey(sale.serviceDate) === today)
    .reduce((sum, sale) => sum + sale.totalAmount, 0)
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

const salesSignal = computed(() => {
  if (dishStore.items.length === 0) {
    return 'Ajoute des plats pour rendre la saisie commerciale possible.'
  }

  if (ticketCount.value === 0) {
    return 'Les premiers tickets vont donner de la matiere au dashboard et aux previsions.'
  }

  if (latestSale.value) {
    return `Derniere vente enregistree le ${formatDate(latestSale.value.serviceDate)}.`
  }

  return 'Le flux commercial commence a devenir lisible.'
})

async function loadPage() {
  loading.value = true
  errorMessage.value = ''
  try {
    await Promise.all([saleStore.load(), dishStore.load()])
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
  <div class="p-4 md:p-8 space-y-6 font-sans">
    <section>
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <span class="text-[10px] uppercase tracking-widest font-bold text-[#40493e]/60 dark:text-[#c0c9ba]">Historique commercial</span>
          <h1 class="text-3xl md:text-[32px] md:leading-10 font-bold text-[#1a1c1c] dark:text-[#f1f1f1] font-['Be_Vietnam_Pro',sans-serif]">
            Ventes
          </h1>
          <p class="text-[#40493e] dark:text-[#c0c9ba] text-sm mt-1">
            Les tickets restent au centre de la page, la saisie et l import s ouvrent en modal.
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] font-bold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="dishStore.items.length === 0"
            @click="saleModalOpen = true"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-5"
            />
            Ajouter une vente
          </button>
          <button
            type="button"
            class="border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white font-bold py-2.5 px-6 rounded-full hover:bg-[#f3f3f3] dark:hover:bg-[#2f3131] transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="dishStore.items.length === 0"
            @click="importModalOpen = true"
          >
            <UIcon
              name="i-lucide-upload"
              class="size-5"
            />
            Import CSV
          </button>
          <NuxtLink
            to="/dishes"
            class="border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white font-bold py-2.5 px-6 rounded-full hover:bg-[#f3f3f3] dark:hover:bg-[#2f3131] transition-all flex items-center gap-2"
          >
            <UIcon
              name="i-lucide-utensils"
              class="size-5"
            />
            Plats
          </NuxtLink>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 py-4">
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ ticketCount }} ticket(s)</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ dishStore.items.length }} plat(s)</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">CA jour {{ formatCurrency(todayRevenue) }}</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ loading ? 'Chargement' : 'Flux a jour' }}</span>
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
            <span class="text-[10px] font-bold uppercase text-[#005013]/70 dark:text-[#8ad986]/70">Signal ventes</span>
            <p class="font-bold text-[#1a1c1c] dark:text-[#e2e2e2] mt-0.5">
              {{ salesSignal }}
            </p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 shrink-0">
          <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[10px] font-bold rounded-full text-[#40493e] dark:text-[#c0c9ba]">Total {{ formatCurrency(totalRevenue) }}</span>
          <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[10px] font-bold rounded-full text-[#40493e] dark:text-[#c0c9ba]">Ticket moyen {{ formatCurrency(averageTicket) }}</span>
          <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[10px] font-bold rounded-full text-[#40493e] dark:text-[#c0c9ba]">{{ totalUnitsSold }} portion(s)</span>
        </div>
      </div>

      <EmptyStateCard
        v-if="dishStore.items.length === 0"
        eyebrow="Prerequis manquant"
        title="Impossible de saisir une vente sans plat."
        description="Ajoute au moins un plat a la carte pour pouvoir enregistrer un ticket et alimenter les previsions."
        action-label="Creer un plat"
        action-to="/dishes"
        secondary-label="Completer les ingredients"
        secondary-to="/ingredients"
      />

      <section class="bg-white dark:bg-[#1a1c1c] rounded-[2.5rem] p-6 border border-[#c0c9ba]/20 dark:border-white/5 shadow-sm">
        <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/60">Filtres</span>
            <h4 class="font-bold text-[#1a1c1c] dark:text-white mt-1">
              Retrouver un ticket
            </h4>
          </div>
          <span class="bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] px-3 py-1 rounded-full text-[10px] font-bold w-fit">{{ filteredSales.length }} / {{ saleStore.items.length }} vente(s)</span>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_0.9fr_0.9fr_0.9fr_auto]">
          <input
            v-model="saleFilters.search"
            class="bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
            type="search"
            placeholder="Rechercher date, plat, note"
            aria-label="Rechercher une vente"
          >
          <input
            v-model="saleFilters.dateFrom"
            class="bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
            type="date"
            aria-label="Date de debut"
          >
          <input
            v-model="saleFilters.dateTo"
            class="bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
            type="date"
            aria-label="Date de fin"
          >
          <input
            v-model="saleFilters.minAmount"
            class="bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
            type="number"
            min="0"
            step="0.01"
            placeholder="CA minimum"
            aria-label="Montant minimum"
          >
          <button
            type="button"
            class="border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white font-bold py-2.5 px-6 rounded-full hover:bg-[#f3f3f3] dark:hover:bg-[#2f3131] transition-all flex items-center justify-center gap-2"
            @click="resetSaleFilters"
          >
            <UIcon
              name="i-lucide-rotate-ccw"
              class="size-4"
            />
            Reset
          </button>
        </div>
      </section>

      <div class="bg-white dark:bg-[#1a1c1c] rounded-[2.5rem] overflow-hidden border border-[#c0c9ba]/20 dark:border-white/5 shadow-sm">
        <div class="p-6 border-b border-[#c0c9ba]/20 dark:border-white/5 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center bg-[#f3f3f3]/50 dark:bg-[#2f3131]/50">
          <div>
            <span class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/60">Table</span>
            <h4 class="font-bold text-[#1a1c1c] dark:text-white mt-1">
              Tickets enregistres
            </h4>
          </div>
          <span class="bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] px-3 py-1 rounded-full text-[10px] font-bold w-fit">{{ filteredSales.length }} vente(s)</span>
        </div>
        <div class="p-0">
          <SaleTable
            :items="filteredSales"
            :empty-message="saleTableEmptyMessage"
            @remove="removeSale"
          />
        </div>
      </div>
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

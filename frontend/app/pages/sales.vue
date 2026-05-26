<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import EmptyStateCard from '~/components/common/EmptyStateCard.vue'
import StatCard from '~/components/common/StatCard.vue'
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
  <div class="space-y-5">
    <section class="app-page-header app-page-header--compact">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="app-eyebrow">
            Historique commercial
          </p>
          <h1 class="app-title mt-2">
            Ventes
          </h1>
          <p class="app-subtitle mt-2">
            Les tickets et la saisie restent au premier niveau pour que le flux commercial soit lisible rapidement.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <a
            href="#sale-form"
            class="btn-primary"
          >
            Ajouter une vente
          </a>
          <NuxtLink
            to="/dishes"
            class="btn-secondary"
          >
            Plats
          </NuxtLink>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <span class="app-pill">{{ ticketCount }} ticket(s)</span>
        <span class="app-pill">{{ dishStore.items.length }} plat(s)</span>
        <span class="app-pill">CA jour {{ formatCurrency(todayRevenue) }}</span>
        <span class="app-pill">{{ loading ? 'Chargement' : 'Flux a jour' }}</span>
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
              Signal ventes
            </p>
            <p class="app-section-title mt-1">
              {{ salesSignal }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="app-pill">Total {{ formatCurrency(totalRevenue) }}</span>
            <span class="app-pill">Ticket moyen {{ formatCurrency(averageTicket) }}</span>
            <span class="app-pill">{{ totalUnitsSold }} portion(s)</span>
          </div>
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

      <section class="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div class="app-section">
          <div class="mb-4 flex items-center justify-between gap-4">
            <div>
              <p class="app-eyebrow">
                Table
              </p>
              <h2 class="app-section-title mt-1">
                Tickets enregistres
              </h2>
            </div>
            <span class="app-pill">{{ saleStore.items.length }} vente(s)</span>
          </div>
          <SaleTable
            :items="saleStore.items"
            @remove="removeSale"
          />
        </div>

        <div
          v-if="dishStore.items.length > 0"
          id="sale-form"
          class="grid gap-4 scroll-mt-28"
        >
          <div class="app-section">
            <div class="mb-4 flex items-center justify-between gap-4">
              <div>
                <p class="app-eyebrow">
                  Formulaire
                </p>
                <h2 class="app-section-title mt-1">
                  Nouveau ticket
                </h2>
              </div>
              <span class="app-pill">
                Saisie rapide
              </span>
            </div>
            <SaleForm
              :dishes="dishStore.items"
              @submit="saveSale"
            />
          </div>

          <div class="app-section">
            <div class="mb-4 flex items-center justify-between gap-4">
              <div>
                <p class="app-eyebrow">
                  Import
                </p>
                <h2 class="app-section-title mt-1">
                  Ventes CSV
                </h2>
              </div>
              <span class="app-pill">
                CSV
              </span>
            </div>
            <SaleCsvImport @import="importSalesCsv" />
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

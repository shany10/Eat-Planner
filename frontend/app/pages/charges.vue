<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import AppModal from '~/components/common/AppModal.vue'
import ChargeForm from '~/components/charges/ChargeForm.vue'
import ChargeTable from '~/components/charges/ChargeTable.vue'
import type { Charge } from '~/types/business'
import { useChargeStore } from '~/stores/charges'

definePageMeta({
  middleware: 'auth'
})

const chargeStore = useChargeStore()
const appToast = useAppToast()
const editingCharge = ref<Charge | null>(null)
const chargeModalOpen = ref(false)
const errorMessage = ref('')

const chargeFilters = reactive({
  search: '',
  category: 'all',
  period: 'all',
  status: 'all'
})

const chargeCategoryOptions: Array<{ value: Charge['category'], label: string }> = [
  { value: 'staff', label: 'Salaires' },
  { value: 'utilities', label: 'Energie' },
  { value: 'rent', label: 'Loyer' },
  { value: 'equipment', label: 'Materiel' },
  { value: 'insurance', label: 'Assurance' },
  { value: 'subscriptions', label: 'Abonnements' },
  { value: 'other', label: 'Autre' }
]

const activeChargeCount = computed(() => chargeStore.items.filter(charge => charge.active).length)
const monthlyChargeEstimate = computed(() => chargeStore.dailyChargeEstimate * 30)
const fixedChargeCount = computed(() => chargeStore.items.filter(charge => charge.period === 'monthly').length)

const filteredCharges = computed(() => {
  const search = chargeFilters.search.trim().toLowerCase()

  return chargeStore.items.filter((charge) => {
    const categoryLabel = chargeCategoryOptions.find(option => option.value === charge.category)?.label ?? charge.category
    const searchableText = [
      charge.name,
      charge.category,
      categoryLabel,
      charge.amount.toFixed(2),
      charge.period
    ].join(' ').toLowerCase()

    const matchesSearch = !search || searchableText.includes(search)
    const matchesCategory = chargeFilters.category === 'all' || charge.category === chargeFilters.category
    const matchesPeriod = chargeFilters.period === 'all' || charge.period === chargeFilters.period
    const matchesStatus = chargeFilters.status === 'all'
      || (chargeFilters.status === 'active' && charge.active)
      || (chargeFilters.status === 'inactive' && !charge.active)

    return matchesSearch && matchesCategory && matchesPeriod && matchesStatus
  })
})

const chargeTableEmptyMessage = computed(() =>
  chargeStore.items.length === 0
    ? 'Aucune charge enregistree. Ajoute tes couts fixes et variables pour affiner le prix conseille.'
    : 'Aucune charge ne correspond aux filtres actifs.'
)

async function loadPage() {
  errorMessage.value = ''
  try {
    await chargeStore.load()
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de charger les charges')
    appToast.error('Chargement impossible', errorMessage.value)
  }
}

async function saveCharge(payload: Omit<Charge, '_id'>) {
  try {
    if (editingCharge.value) {
      await chargeStore.update(editingCharge.value._id, payload)
      appToast.success('Charge mise a jour', `${payload.name} a ete modifiee.`)
    } else {
      await chargeStore.create(payload)
      appToast.success('Charge ajoutee', `${payload.name} est maintenant prise en compte.`)
    }
    closeChargeModal()
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Echec lors de l enregistrement de la charge')
    appToast.error('Enregistrement impossible', errorMessage.value)
  }
}

async function removeCharge(item: Charge) {
  try {
    await chargeStore.remove(item._id)
    appToast.success('Charge supprimee', `${item.name} a ete retiree.`)
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Suppression impossible')
    appToast.error('Suppression impossible', errorMessage.value)
  }
}

function openChargeModal() {
  editingCharge.value = null
  chargeModalOpen.value = true
}

function editCharge(item: Charge) {
  editingCharge.value = item
  chargeModalOpen.value = true
}

function closeChargeModal() {
  chargeModalOpen.value = false
  editingCharge.value = null
}

function resetChargeFilters() {
  chargeFilters.search = ''
  chargeFilters.category = 'all'
  chargeFilters.period = 'all'
  chargeFilters.status = 'all'
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
            Charges operationnelles
          </p>
          <h1 class="app-title mt-2">
            Fixes, variables et repartition
          </h1>
          <p class="app-subtitle mt-2">
            Les charges restent en table pleine largeur, la saisie passe en modal pour garder les couts lisibles.
          </p>
        </div>

        <button
          type="button"
          class="btn-primary"
          @click="openChargeModal"
        >
          <UIcon
            name="i-lucide-plus"
            class="size-4"
          />
          Ajouter une charge
        </button>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <span class="app-pill">{{ activeChargeCount }} active(s)</span>
        <span class="app-pill">{{ fixedChargeCount }} mensuelle(s)</span>
        <span class="app-pill">Jour {{ formatCurrency(chargeStore.dailyChargeEstimate) }}</span>
        <span class="app-pill">Mois {{ formatCurrency(monthlyChargeEstimate) }}</span>
      </div>
    </section>

    <p
      v-if="errorMessage"
      class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ errorMessage }}
    </p>

    <section class="app-section">
      <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="app-eyebrow">
            Filtres
          </p>
          <h2 class="app-section-title mt-1">
            Isoler un cout
          </h2>
        </div>
        <span class="app-pill">{{ filteredCharges.length }} / {{ chargeStore.items.length }} ligne(s)</span>
      </div>

      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
        <input
          v-model="chargeFilters.search"
          class="app-input"
          type="search"
          placeholder="Rechercher nom, categorie, montant"
          aria-label="Rechercher une charge"
        >
        <select
          v-model="chargeFilters.category"
          class="app-input"
          aria-label="Filtrer par categorie"
        >
          <option value="all">
            Toutes categories
          </option>
          <option
            v-for="category in chargeCategoryOptions"
            :key="category.value"
            :value="category.value"
          >
            {{ category.label }}
          </option>
        </select>
        <select
          v-model="chargeFilters.period"
          class="app-input"
          aria-label="Filtrer par periode"
        >
          <option value="all">
            Toutes periodes
          </option>
          <option value="daily">
            Journalier
          </option>
          <option value="monthly">
            Mensuel
          </option>
        </select>
        <select
          v-model="chargeFilters.status"
          class="app-input"
          aria-label="Filtrer par statut"
        >
          <option value="all">
            Tous statuts
          </option>
          <option value="active">
            Actives
          </option>
          <option value="inactive">
            Inactives
          </option>
        </select>
        <button
          type="button"
          class="btn-secondary"
          @click="resetChargeFilters"
        >
          <UIcon
            name="i-lucide-rotate-ccw"
            class="size-4"
          />
          Reset
        </button>
      </div>
    </section>

    <section class="app-section">
      <div class="mb-4 flex items-center justify-between gap-4">
        <div>
          <p class="app-eyebrow">
            Table
          </p>
          <h2 class="app-section-title mt-1">
            Historique des charges
          </h2>
        </div>
        <span class="app-pill">{{ filteredCharges.length }} ligne(s)</span>
      </div>
      <ChargeTable
        :items="filteredCharges"
        :empty-message="chargeTableEmptyMessage"
        @edit="editCharge"
        @remove="removeCharge"
      />
    </section>

    <AppModal
      :open="chargeModalOpen"
      :title="editingCharge ? 'Modifier charge' : 'Nouvelle charge'"
      eyebrow="Formulaire"
      :description="editingCharge ? 'Mets a jour le cout, la periode ou le statut.' : 'Ajoute un cout sans quitter la table.'"
      size="lg"
      @close="closeChargeModal"
    >
      <ChargeForm
        :initial-value="editingCharge"
        :submit-label="editingCharge ? 'Mettre a jour la charge' : 'Ajouter la charge'"
        @submit="saveCharge"
        @cancel="closeChargeModal"
      />
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import AppModal from '~/components/common/AppModal.vue'
import ChargeForm from '~/components/charges/ChargeForm.vue'
import ChargeTable from '~/components/charges/ChargeTable.vue'
import type { Charge } from '~/types/business'
import { useChargeStore } from '~/stores/charges'

definePageMeta({
  middleware: 'manager'
})

const chargeStore = useChargeStore()
const appToast = useAppToast()
const editingCharge = ref<Charge | null>(null)
const chargeModalOpen = ref(false)
const errorMessage = ref('')
const loading = ref(true)
const showFilters = ref(false)

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

const stats = computed(() => [
  { title: 'Charges actives', value: activeChargeCount.value, hint: 'Prises en compte' },
  { title: 'Mensuelles', value: fixedChargeCount.value, hint: 'Récurrentes' },
  { title: 'Coût / jour', value: formatCurrency(chargeStore.dailyChargeEstimate), hint: 'Estimation lissée' },
  { title: 'Coût / mois', value: formatCurrency(monthlyChargeEstimate.value), hint: 'Sur 30 jours' }
])

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
  loading.value = true
  errorMessage.value = ''
  try {
    await chargeStore.load()
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de charger les charges')
    appToast.error('Chargement impossible', errorMessage.value)
  } finally {
    loading.value = false
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
  <div class="space-y-6">
    <PageHeader
      eyebrow="Charges opérationnelles"
      title="Charges fixes & variables"
      subtitle="Suis tes coûts et leur répartition pour fiabiliser le prix conseillé."
    >
      <template #actions>
        <AppButton
          icon="i-lucide-plus"
          @click="openChargeModal"
        >
          Ajouter une charge
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
              Historique des charges
            </h2>
            <AppBadge>{{ filteredCharges.length }} / {{ chargeStore.items.length }}</AppBadge>
          </div>

          <div class="flex items-center gap-2">
            <div class="relative flex-1 sm:w-64 sm:flex-none">
              <UIcon
                name="i-lucide-search"
                class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--ep-text-subtle)]"
              />
              <input
                v-model="chargeFilters.search"
                class="app-input pl-9"
                type="search"
                placeholder="Rechercher…"
                aria-label="Rechercher une charge"
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
            v-model="chargeFilters.category"
            class="app-input"
            aria-label="Filtrer par catégorie"
          >
            <option value="all">
              Toutes catégories
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
            aria-label="Filtrer par période"
          >
            <option value="all">
              Toutes périodes
            </option>
            <option value="daily">
              Journalier
            </option>
            <option value="monthly">
              Mensuel
            </option>
          </select>
          <div class="flex gap-2">
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
              class="btn-ghost btn-sm shrink-0"
              aria-label="Réinitialiser les filtres"
              @click="resetChargeFilters"
            >
              <UIcon
                name="i-lucide-rotate-ccw"
                class="size-4"
              />
            </button>
          </div>
        </div>

        <ChargeTable
          :items="filteredCharges"
          :empty-message="chargeTableEmptyMessage"
          @edit="editCharge"
          @remove="removeCharge"
        />
      </section>
    </template>

    <AppModal
      :open="chargeModalOpen"
      :title="editingCharge ? 'Modifier charge' : 'Nouvelle charge'"
      eyebrow="Formulaire"
      :description="editingCharge ? 'Mets a jour le cout, la periode ou le statut.' : 'Ajoute un cout sans quitter la table.'"
      size="lg"
      variant="warm"
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

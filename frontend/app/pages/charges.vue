<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
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
const errorMessage = ref('')

const activeChargeCount = computed(() => chargeStore.items.filter(charge => charge.active).length)
const monthlyChargeEstimate = computed(() => chargeStore.dailyChargeEstimate * 30)
const fixedChargeCount = computed(() => chargeStore.items.filter(charge => charge.period === 'monthly').length)

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
      editingCharge.value = null
      appToast.success('Charge mise a jour', `${payload.name} a ete modifiee.`)
    } else {
      await chargeStore.create(payload)
      appToast.success('Charge ajoutee', `${payload.name} est maintenant prise en compte.`)
    }
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
            Les lignes de charges sont visibles directement, avec la saisie a cote pour aller plus vite.
          </p>
        </div>

        <a
          href="#charge-form"
          class="btn-primary"
        >
          Ajouter une charge
        </a>
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

    <section class="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <div class="app-section">
        <div class="mb-4 flex items-center justify-between gap-4">
          <div>
            <p class="app-eyebrow">
              Table
            </p>
            <h2 class="app-section-title mt-1">
              Historique des charges
            </h2>
          </div>
          <span class="app-pill">{{ chargeStore.items.length }} ligne(s)</span>
        </div>
        <ChargeTable
          :items="chargeStore.items"
          @edit="editingCharge = $event"
          @remove="removeCharge"
        />
      </div>

      <div
        id="charge-form"
        class="app-section scroll-mt-28"
      >
        <div class="mb-4 flex items-center justify-between gap-4">
          <div>
            <p class="app-eyebrow">
              Formulaire
            </p>
            <h2 class="app-section-title mt-1">
              {{ editingCharge ? 'Modifier charge' : 'Nouvelle charge' }}
            </h2>
          </div>
          <span class="app-pill">
            {{ editingCharge ? 'Edition' : 'Creation' }}
          </span>
        </div>
        <ChargeForm
          :initial-value="editingCharge"
          :submit-label="editingCharge ? 'Mettre a jour la charge' : 'Ajouter la charge'"
          @submit="saveCharge"
          @cancel="editingCharge = null"
        />
      </div>
    </section>
  </div>
</template>

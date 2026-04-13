<script setup lang="ts">
import ChargeForm from '~/components/charges/ChargeForm.vue'
import ChargeTable from '~/components/charges/ChargeTable.vue'
import type { Charge } from '~/types/business'
import { useChargeStore } from '~/stores/charges'

definePageMeta({
  middleware: 'auth'
})

const chargeStore = useChargeStore()
const editingCharge = ref<Charge | null>(null)
const errorMessage = ref('')

async function loadPage() {
  errorMessage.value = ''
  try {
    await chargeStore.load()
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.statusMessage || 'Impossible de charger les charges'
  }
}

async function saveCharge(payload: Omit<Charge, '_id'>) {
  try {
    if (editingCharge.value) {
      await chargeStore.update(editingCharge.value._id, payload)
      editingCharge.value = null
    } else {
      await chargeStore.create(payload)
    }
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.statusMessage || 'Echec lors de l enregistrement de la charge'
  }
}

async function removeCharge(item: Charge) {
  try {
    await chargeStore.remove(item._id)
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.statusMessage || 'Suppression impossible'
  }
}

onMounted(loadPage)
</script>

<template>
  <div class="space-y-8">
    <section class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
        Charges operationnelles
      </p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight">
        Fixes, variables et repartition
      </h1>
      <p class="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
        Les charges actives sont converties en cout quotidien pour alimenter le calcul du prix conseille.
      </p>
      <div class="mt-6">
        <a
          href="#charge-form"
          class="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Ajouter une charge
        </a>
      </div>
    </section>

    <p
      v-if="errorMessage"
      class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ errorMessage }}
    </p>

    <section
      id="charge-form"
      class="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div class="mb-5 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-semibold">
            Nouvelle charge
          </h2>
          <p class="mt-1 text-sm text-slate-500">
            Estimation quotidienne actuelle : {{ chargeStore.dailyChargeEstimate.toFixed(2) }} EUR
          </p>
        </div>
      </div>
      <ChargeForm
        :initial-value="editingCharge"
        :submit-label="editingCharge ? 'Mettre a jour la charge' : 'Ajouter la charge'"
        @submit="saveCharge"
        @cancel="editingCharge = null"
      />
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div class="mb-5 flex items-center justify-between">
        <h2 class="text-xl font-semibold">
          Historique des charges
        </h2>
        <span class="text-sm text-slate-500">{{ chargeStore.items.length }} lignes</span>
      </div>
      <ChargeTable
        :items="chargeStore.items"
        @edit="editingCharge = $event"
        @remove="removeCharge"
      />
    </section>
  </div>
</template>

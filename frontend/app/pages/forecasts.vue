<script setup lang="ts">
import EmptyStateCard from '~/components/common/EmptyStateCard.vue'
import ForecastBoard from '~/components/forecasts/ForecastBoard.vue'
import { useForecastStore } from '~/stores/forecasts'

definePageMeta({
  middleware: 'auth'
})

const forecastStore = useForecastStore()
const selectedDate = ref(new Date().toISOString().slice(0, 10))
const errorMessage = ref('')

async function loadForecast() {
  errorMessage.value = ''
  try {
    await forecastStore.load(selectedDate.value)
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.statusMessage || 'Impossible de charger la prevision'
  }
}

onMounted(loadForecast)
</script>

<template>
  <div class="space-y-8">
    <section class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
        Production intelligente
      </p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight">
        Previsions de vente et besoins matieres
      </h1>
      <p class="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
        Version MVP : la prevision s appuie sur l historique recent et le comportement du meme jour de semaine.
      </p>
      <div class="mt-6">
        <a
          href="#forecast-controls"
          class="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Calculer une prevision
        </a>
      </div>
    </section>

    <div
      id="forecast-controls"
      class="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-xl font-semibold">
            Generer une date de production
          </h2>
          <p class="mt-1 text-sm text-slate-500">
            Change la date pour recalculer les quantites conseillees.
          </p>
        </div>
        <div class="flex gap-2">
          <input
            v-model="selectedDate"
            class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
            type="date"
          >
          <button
            class="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
            @click="loadForecast"
          >
            Recalculer
          </button>
        </div>
      </div>
    </div>

    <p
      v-if="errorMessage"
      class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ errorMessage }}
    </p>

    <EmptyStateCard
      v-if="forecastStore.forecast && forecastStore.forecast.dishes.length === 0"
      eyebrow="Pas assez de donnees"
      title="Aucune projection exploitable pour cette date."
      description="Enregistre quelques ventes pour que le moteur de prevision puisse calculer des quantites recommandees et des besoins matieres."
      action-label="Saisir des ventes"
      action-to="/sales"
      secondary-label="Verifier les plats"
      secondary-to="/dishes"
    />

    <ForecastBoard
      v-else
      :forecast="forecastStore.forecast"
    />
  </div>
</template>

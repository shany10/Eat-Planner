<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import EmptyStateCard from '~/components/common/EmptyStateCard.vue'
import ForecastBoard from '~/components/forecasts/ForecastBoard.vue'
import { useForecastStore } from '~/stores/forecasts'

definePageMeta({
  middleware: 'auth'
})

const forecastStore = useForecastStore()
const appToast = useAppToast()
const selectedDate = ref(new Date().toISOString().slice(0, 10))
const errorMessage = ref('')

async function loadForecast(showSuccess = false) {
  errorMessage.value = ''
  try {
    await forecastStore.load(selectedDate.value)
    if (showSuccess) {
      appToast.success('Prevision calculee', `Projection mise a jour pour le ${selectedDate.value}.`)
    }
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de charger la prevision')
    appToast.error('Calcul impossible', errorMessage.value)
  }
}

async function saveForecast() {
  errorMessage.value = ''
  try {
    await forecastStore.save(selectedDate.value)
    appToast.success('Prevision sauvegardee', `Recommandations conservees pour le ${selectedDate.value}.`)
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de sauvegarder la prevision')
    appToast.error('Sauvegarde impossible', errorMessage.value)
  }
}

async function correctForecast(payload: {
  forecastId: string
  dishId: string
  correctionQuantity: number
  correctionComment: string
}) {
  errorMessage.value = ''
  try {
    await forecastStore.correct(payload.forecastId, payload.dishId, payload.correctionQuantity, payload.correctionComment)
    appToast.success('Correction sauvegardee', 'La recommandation et les besoins matieres sont recalcules.')
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de corriger la prevision')
    appToast.error('Correction impossible', errorMessage.value)
  }
}

onMounted(loadForecast)
</script>

<template>
  <div class="space-y-5">
    <section class="app-page-header app-page-header--compact">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="app-eyebrow">
            Production intelligente
          </p>
          <h1 class="app-title mt-2">
            Previsions et besoins matieres
          </h1>
          <p class="app-subtitle mt-2">
            La date de calcul est accessible tout de suite, puis la production conseillee arrive juste dessous.
          </p>
        </div>

        <div
          id="forecast-controls"
          class="scroll-mt-28 flex flex-col gap-2 sm:flex-row"
        >
          <input
            v-model="selectedDate"
            class="app-input sm:w-44"
            type="date"
          >
          <button
            class="btn-secondary"
            @click="loadForecast(true)"
          >
            Previsualiser
          </button>
          <button
            class="btn-primary"
            @click="saveForecast"
          >
            Generer et sauvegarder
          </button>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <span class="app-pill">{{ forecastStore.forecast?.targetDate || selectedDate }}</span>
        <span class="app-pill">{{ forecastStore.forecast?.persisted ? 'Sauvegardee' : 'Simulation' }}</span>
        <span class="app-pill">{{ forecastStore.forecast?.dishes.length || 0 }} plat(s)</span>
        <span class="app-pill">{{ forecastStore.forecast?.ingredientNeeds.length || 0 }} besoin(s)</span>
      </div>
    </section>

    <p
      v-if="errorMessage"
      class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
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
      @correct="correctForecast"
    />
  </div>
</template>

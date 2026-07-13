<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import EmptyStateCard from '~/components/common/EmptyStateCard.vue'
import ForecastBoard from '~/components/forecasts/ForecastBoard.vue'
import { useForecastStore } from '~/stores/forecasts'

definePageMeta({
  middleware: 'manager'
})

const forecastStore = useForecastStore()
const appToast = useAppToast()
const selectedDate = ref(new Date().toISOString().slice(0, 10))
const errorMessage = ref('')

const statusLabel = computed(() => {
  if (forecastStore.pending) {
    return 'Calcul'
  }

  if (!forecastStore.forecast) {
    return 'A lancer'
  }

  return forecastStore.forecast.persisted ? 'Validee' : 'Simulation'
})

const forecastStats = computed(() => {
  const forecast = forecastStore.forecast

  return [
    { title: 'Statut', value: statusLabel.value, hint: forecast?.targetDate ?? selectedDate.value },
    { title: 'Portions', value: forecast?.totals.totalProjectedPlates ?? 0, hint: `${forecast?.dishes.length ?? 0} plat(s)` },
    { title: 'CA projete', value: formatCurrency(forecast?.totals.totalProjectedRevenue ?? 0), hint: 'estimation' },
    { title: 'Besoins', value: forecast?.ingredientNeeds.length ?? 0, hint: 'ingredients' }
  ]
})

const methodCards = [
  {
    title: 'Historique',
    value: '42 jours',
    text: 'ventes passees'
  },
  {
    title: 'Calcul',
    value: '55 / 30 / 15',
    text: 'jour similaire, recent, long'
  },
  {
    title: 'Confiance',
    value: '5 puis 12 j',
    text: 'moyenne puis haute'
  },
  {
    title: 'Besoins',
    value: 'recettes',
    text: 'portions x ingredients'
  }
]

async function loadForecast(showSuccess = false) {
  errorMessage.value = ''

  try {
    await forecastStore.load(selectedDate.value)
    if (showSuccess) {
      appToast.success('Prevision calculee', selectedDate.value)
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
    appToast.success('Prevision sauvegardee', selectedDate.value)
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
    appToast.success('Correction sauvegardee', 'Quantites mises a jour.')
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de corriger la prevision')
    appToast.error('Correction impossible', errorMessage.value)
  }
}

function formatCurrency(value: number) {
  return `${value.toFixed(2)} EUR`
}

onMounted(loadForecast)
</script>

<template>
  <div class="space-y-5 p-4 font-sans md:p-6">
    <header class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/70">
          Previsions
        </p>
        <h1 class="mt-1 font-['Be_Vietnam_Pro',sans-serif] text-3xl font-bold text-[#1a1c1c] dark:text-white">
          Production du jour
        </h1>
      </div>

      <div class="grid gap-2 sm:grid-cols-[minmax(0,180px)_auto_auto]">
        <input
          v-model="selectedDate"
          class="w-full rounded-full border border-[#c0c9ba]/30 bg-white px-4 py-2.5 text-sm text-[#1a1c1c] outline-none transition focus:ring-2 focus:ring-[#feb236] dark:border-white/10 dark:bg-[#2f3131] dark:text-white"
          type="date"
          aria-label="Date de prevision"
        >
        <button
          class="inline-flex items-center justify-center gap-2 rounded-full border border-[#707a6d] px-5 py-2.5 text-sm font-bold text-[#1a1c1c] transition hover:bg-[#f3f3f3] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#c0c9ba] dark:text-white dark:hover:bg-[#2f3131]"
          :disabled="forecastStore.pending"
          @click="loadForecast(true)"
        >
          <UIcon
            name="i-lucide-refresh-cw"
            class="size-4"
          />
          Calculer
        </button>
        <button
          class="inline-flex items-center justify-center gap-2 rounded-full bg-[#feb236] px-5 py-2.5 text-sm font-bold text-[#6d4700] shadow-sm transition hover:bg-[#ffc059] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="forecastStore.pending || !forecastStore.forecast"
          @click="saveForecast"
        >
          <UIcon
            name="i-lucide-save"
            class="size-4"
          />
          Valider
        </button>
      </div>
    </header>

    <p
      v-if="errorMessage"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ errorMessage }}
    </p>

    <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article
        v-for="stat in forecastStats"
        :key="stat.title"
        class="rounded-xl border border-[#c0c9ba]/20 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#1a1c1c]"
      >
        <p class="text-[10px] font-bold uppercase text-[#40493e]/70 dark:text-[#c0c9ba]/70">
          {{ stat.title }}
        </p>
        <p class="mt-1 text-2xl font-black text-[#1a1c1c] dark:text-white">
          {{ stat.value }}
        </p>
        <p class="mt-1 text-xs text-[#40493e] dark:text-[#c0c9ba]">
          {{ stat.hint }}
        </p>
      </article>
    </section>

    <section class="rounded-xl border border-[#c0c9ba]/20 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1a1c1c]">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/70">
            Methode
          </p>
          <h2 class="mt-1 text-lg font-bold text-[#1a1c1c] dark:text-white">
            Comment la prevision est calculee
          </h2>
        </div>
        <p class="max-w-2xl text-sm text-[#40493e] dark:text-[#c0c9ba]">
          L'app transforme les ventes en quantites de production, puis en besoins matieres.
        </p>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="card in methodCards"
          :key="card.title"
          class="rounded-xl bg-[#f3f3f3] p-4 dark:bg-[#2f3131]"
        >
          <p class="text-xs font-bold uppercase text-[#40493e] dark:text-[#c0c9ba]">
            {{ card.title }}
          </p>
          <p class="mt-1 text-xl font-black text-[#1a1c1c] dark:text-white">
            {{ card.value }}
          </p>
          <p class="mt-1 text-sm text-[#40493e] dark:text-[#c0c9ba]">
            {{ card.text }}
          </p>
        </article>
      </div>
    </section>

    <EmptyStateCard
      v-if="forecastStore.forecast && forecastStore.forecast.dishes.length === 0"
      eyebrow="Pas assez de donnees"
      title="Aucune projection pour cette date."
      description="Ajoute quelques ventes et plats pour calculer les quantites."
      action-label="Ventes"
      action-to="/sales"
      secondary-label="Plats"
      secondary-to="/dishes"
    />

    <ForecastBoard
      v-else
      :forecast="forecastStore.forecast"
      @correct="correctForecast"
    />
  </div>
</template>

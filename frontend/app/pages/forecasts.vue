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

const forecastProgress = computed(() => {
  if (forecastStore.pending) {
    return 45
  }

  if (!forecastStore.forecast) {
    return 15
  }

  if (forecastStore.forecast.persisted) {
    return 100
  }

  return forecastStore.forecast.dishes.length > 0 ? 72 : 38
})

const forecastMissionTitle = computed(() => {
  if (forecastStore.pending) {
    return 'Calcul en cours'
  }

  if (!forecastStore.forecast) {
    return 'Choisir la date'
  }

  if (forecastStore.forecast.persisted) {
    return 'Plan valide'
  }

  return 'Simulation prete'
})

const forecastMissionHint = computed(() => {
  if (forecastStore.pending) {
    return 'Le moteur relit les ventes, les plats et les besoins matieres.'
  }

  if (!forecastStore.forecast) {
    return 'La mission commence par une date de service.'
  }

  if (forecastStore.forecast.persisted) {
    return 'Les quantites sont sauvegardees et peuvent etre corrigees plat par plat.'
  }

  return 'Tu peux valider la simulation pour figer le plan de production.'
})

const forecastTotals = computed(() => {
  const forecast = forecastStore.forecast

  return {
    plates: forecast?.totals.totalProjectedPlates ?? 0,
    revenue: forecast?.totals.totalProjectedRevenue ?? 0,
    ingredients: forecast?.ingredientNeeds.length ?? 0
  }
})

const forecastDataSummary = computed(() => {
  const dishes = forecastStore.forecast?.dishes ?? []
  const historyDays = dishes.reduce((sum, dish) => sum + dish.historyDaysUsed, 0)
  const highConfidence = dishes.filter(dish => dish.confidence === 'high').length
  const corrected = dishes.filter(dish => dish.userCorrectionQuantity != null).length

  return {
    averageHistoryDays: dishes.length === 0 ? 0 : Math.round(historyDays / dishes.length),
    highConfidence,
    corrected,
    alerts: forecastStore.forecast?.alerts.length ?? 0,
    ingredientNeeds: forecastStore.forecast?.ingredientNeeds.length ?? 0
  }
})

const explanationCards = computed(() => [
  {
    title: 'Baseline',
    icon: 'i-lucide-history',
    value: `${forecastDataSummary.value.averageHistoryDays} j`,
    text: 'Point de depart du calcul: le moteur regarde l historique disponible par plat, puis part d une quantite moyenne.'
  },
  {
    title: 'Tendance',
    icon: 'i-lucide-trending-up',
    value: forecastStore.forecast ? `${forecastStore.forecast.dishes.length} plat(s)` : '-',
    text: 'La recommandation ajuste la baseline selon les ventes recentes, la moyenne longue et le comportement du jour de semaine.'
  },
  {
    title: 'Confiance',
    icon: 'i-lucide-shield-check',
    value: `${forecastDataSummary.value.highConfidence} haute(s)`,
    text: 'Plus il y a d historique stable, plus la confiance monte. Une confiance basse veut dire: a verifier par le manager.'
  },
  {
    title: 'Besoins matieres',
    icon: 'i-lucide-wheat',
    value: `${forecastDataSummary.value.ingredientNeeds}`,
    text: 'Les besoins sont calcules avec les recettes: quantite conseillee du plat multipliee par ses ingredients.'
  }
])

const missionSteps = computed(() => [
  {
    number: 1,
    title: 'Date',
    detail: selectedDate.value,
    icon: 'i-lucide-calendar-days',
    state: 'done'
  },
  {
    number: 2,
    title: 'Simulation',
    detail: forecastStore.forecast ? `${forecastStore.forecast.dishes.length} plat(s)` : 'A lancer',
    icon: 'i-lucide-sparkles',
    state: forecastStore.forecast ? 'done' : 'current'
  },
  {
    number: 3,
    title: 'Validation',
    detail: forecastStore.forecast?.persisted ? 'Sauvegardee' : 'A valider',
    icon: 'i-lucide-badge-check',
    state: forecastStore.forecast?.persisted ? 'done' : forecastStore.forecast ? 'current' : 'locked'
  }
])

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

function getStepClass(state: string) {
  if (state === 'done') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100'
  }

  if (state === 'current') {
    return 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100'
  }

  return 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400'
}

function formatCurrency(value: number) {
  return `${value.toFixed(2)} EUR`
}

onMounted(loadForecast)
</script>

<template>
  <div class="p-4 md:p-8 space-y-6 font-sans">
    <section>
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <span class="text-[10px] uppercase tracking-widest font-bold text-[#40493e]/60 dark:text-[#c0c9ba]">Production intelligente</span>
          <h1 class="text-3xl md:text-[32px] md:leading-10 font-bold text-[#1a1c1c] dark:text-[#f1f1f1] font-['Be_Vietnam_Pro',sans-serif]">
            Previsions et besoins matieres
          </h1>
          <p class="text-[#40493e] dark:text-[#c0c9ba] text-sm mt-1">
            Une mission simple: choisir la date, simuler les quantites, valider le plan de production.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ forecastStore.forecast?.targetDate || selectedDate }}</span>
          <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ forecastStore.forecast?.persisted ? 'Sauvegardee' : 'Simulation' }}</span>
          <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ forecastStore.forecast?.dishes.length || 0 }} plat(s)</span>
          <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ forecastStore.forecast?.ingredientNeeds.length || 0 }} besoin(s)</span>
        </div>
      </div>
    </section>

    <section class="bg-white dark:bg-[#1a1c1c] rounded-[2.5rem] p-6 border border-[#c0c9ba]/20 dark:border-white/5 shadow-sm">
      <div class="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div>
          <span class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/60">Mission prevision</span>
          <h2 class="font-bold text-lg text-[#1a1c1c] dark:text-white mt-1">
            {{ forecastMissionTitle }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-[#40493e] dark:text-[#c0c9ba]">
            {{ forecastMissionHint }}
          </p>

          <div class="mt-4">
            <div class="flex items-center justify-between text-[10px] font-bold uppercase text-[#40493e]/70 dark:text-[#c0c9ba]/70">
              <span>Niveau de preparation</span>
              <span>{{ forecastProgress }}%</span>
            </div>
            <div class="mt-2 h-2 overflow-hidden rounded-full bg-[#e8e8e8] dark:bg-[#2f3131]">
              <div
                class="h-full rounded-full bg-[linear-gradient(90deg,#feb236,#005013)] transition-all"
                :style="{ width: `${forecastProgress}%` }"
              />
            </div>
          </div>
        </div>

        <div class="grid gap-3 md:grid-cols-3">
          <article
            v-for="step in missionSteps"
            :key="step.number"
            class="rounded-3xl border p-4"
            :class="getStepClass(step.state)"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="inline-flex size-8 items-center justify-center rounded-full bg-white/70 text-sm font-bold dark:bg-black/30">
                {{ step.number }}
              </span>
              <UIcon
                :name="step.icon"
                class="size-5"
              />
            </div>
            <h3 class="mt-3 text-sm font-bold">
              {{ step.title }}
            </h3>
            <p class="mt-1 text-sm opacity-80">
              {{ step.detail }}
            </p>
          </article>
        </div>
      </div>

      <div class="mt-6 grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto]">
        <input
          v-model="selectedDate"
          class="w-full bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236] transition"
          type="date"
          aria-label="Date de prevision"
        >
        <div class="rounded-3xl border border-[#c0c9ba]/20 dark:border-white/5 bg-[#f3f3f3] dark:bg-[#2f3131] px-4 py-3">
          <p class="text-[10px] font-bold uppercase text-[#40493e]/70 dark:text-[#c0c9ba]/70">
            Portions
          </p>
          <p class="mt-1 font-black text-[#1a1c1c] dark:text-white">
            {{ forecastTotals.plates }}
          </p>
        </div>
        <div class="rounded-3xl border border-[#c0c9ba]/20 dark:border-white/5 bg-[#f3f3f3] dark:bg-[#2f3131] px-4 py-3">
          <p class="text-[10px] font-bold uppercase text-[#40493e]/70 dark:text-[#c0c9ba]/70">
            CA projete
          </p>
          <p class="mt-1 font-black text-[#1a1c1c] dark:text-white">
            {{ formatCurrency(forecastTotals.revenue) }}
          </p>
        </div>
        <button
          class="border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white font-bold py-2.5 px-6 rounded-full hover:bg-[#f3f3f3] dark:hover:bg-[#2f3131] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="forecastStore.pending"
          @click="loadForecast(true)"
        >
          <UIcon
            name="i-lucide-eye"
            class="size-4"
          />
          Simuler
        </button>
        <button
          class="bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] font-bold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="forecastStore.pending"
          @click="saveForecast"
        >
          <UIcon
            name="i-lucide-save"
            class="size-4"
          />
          Valider
        </button>
      </div>
    </section>

    <p
      v-if="errorMessage"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ errorMessage }}
    </p>

    <section class="bg-white dark:bg-[#1a1c1c] rounded-[2.5rem] p-6 border border-[#c0c9ba]/20 dark:border-white/5 shadow-sm">
      <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/60">Explication des donnees</span>
          <h2 class="font-bold text-lg text-[#1a1c1c] dark:text-white mt-1">
            Comment la prevision se lit
          </h2>
        </div>
        <div class="flex flex-wrap gap-2">
          <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ forecastDataSummary.corrected }} correction(s)</span>
          <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ forecastDataSummary.alerts }} alerte(s)</span>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="card in explanationCards"
          :key="card.title"
          class="rounded-3xl border border-[#c0c9ba]/20 dark:border-white/5 bg-[#f3f3f3] dark:bg-[#2f3131] p-5"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-bold text-[#1a1c1c] dark:text-white">
                {{ card.title }}
              </p>
              <p class="mt-1 text-xl font-black text-[#1a1c1c] dark:text-white">
                {{ card.value }}
              </p>
            </div>
            <span class="inline-flex size-9 items-center justify-center rounded-full bg-[#005013]/10 text-[#005013] dark:bg-[#8ad986]/15 dark:text-[#8ad986]">
              <UIcon
                :name="card.icon"
                class="size-4"
              />
            </span>
          </div>
          <p class="mt-3 text-sm leading-6 text-[#40493e] dark:text-[#c0c9ba]">
            {{ card.text }}
          </p>
        </article>
      </div>

      <div class="mt-4 rounded-3xl border border-[#005013]/20 bg-[#005013]/5 p-5 text-sm leading-6 text-[#1a1c1c] dark:border-[#8ad986]/20 dark:bg-[#8ad986]/10 dark:text-[#e2e2e2]">
        A expliquer simplement: la page transforme les ventes passees en quantites de production, puis transforme ces quantites en liste d ingredients a preparer ou commander.
      </div>
    </section>

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

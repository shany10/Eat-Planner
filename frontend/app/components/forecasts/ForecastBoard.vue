<script setup lang="ts">
import type { ForecastResponse } from '~/types/business'

const props = defineProps<{
  forecast: ForecastResponse | null
}>()

const emit = defineEmits<{
  correct: [payload: { forecastId: string, dishId: string, correctionQuantity: number, correctionComment: string }]
}>()

const correctionForms = reactive<Record<string, { quantity: number, comment: string }>>({})

watch(() => props.forecast, (forecast) => {
  if (!forecast) {
    return
  }

  for (const dish of forecast.dishes) {
    correctionForms[dish.dishId] = {
      quantity: dish.userCorrectionQuantity ?? dish.recommendedQuantity,
      comment: dish.correctionComment ?? ''
    }
  }
}, { immediate: true })

function getProductionPrice(dish: ForecastResponse['dishes'][number]) {
  return dish.actualPriceIncludingTax && dish.actualPriceIncludingTax > 0
    ? dish.actualPriceIncludingTax
    : dish.suggestedPriceIncludingTax ?? dish.suggestedPrice
}

function formatCurrency(value = 0) {
  return `${value.toFixed(2)} EUR`
}

function submitCorrection(dish: ForecastResponse['dishes'][number]) {
  if (!props.forecast?._id) {
    return
  }

  const form = correctionForms[dish.dishId]
  emit('correct', {
    forecastId: props.forecast._id,
    dishId: dish.dishId,
    correctionQuantity: Number(form?.quantity ?? dish.recommendedQuantity),
    correctionComment: form?.comment ?? ''
  })
}
</script>

<template>
  <section
    v-if="!forecast"
    class="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300"
  >
    Aucune prevision chargee pour le moment. Choisis une date puis lance le calcul pour afficher la production conseillee.
  </section>

  <div
    v-else
    class="grid gap-6"
  >
    <section class="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            Production conseillee
          </h3>
          <div class="flex flex-wrap justify-end gap-2">
            <span class="app-pill">{{ forecast.persisted ? 'Sauvegardee' : 'Simulation' }}</span>
            <span class="text-sm text-slate-500">{{ forecast.targetDate }}</span>
          </div>
        </div>

        <div class="mt-4 space-y-3">
          <div
            v-for="dish in forecast.dishes"
            :key="dish.dishId"
            class="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {{ dish.category }}
                </p>
                <h4 class="mt-1 font-semibold">
                  {{ dish.dishName }}
                </h4>
                <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Baseline {{ dish.baselineQuantity }} - historique {{ dish.historyDaysUsed }} jours
                </p>
                <p class="mt-1 text-sm text-slate-500">
                  {{ dish.comment }}
                </p>
              </div>

              <div class="text-right">
                <p class="text-2xl font-semibold">
                  {{ dish.recommendedQuantity }}
                </p>
                <p class="text-sm text-slate-500">
                  portions
                </p>
              </div>
            </div>

            <div class="mt-3 flex flex-wrap gap-2 text-xs">
              <span class="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                Tendance: {{ dish.trend }}
              </span>
              <span class="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                Confiance: {{ dish.confidence }}
              </span>
              <span class="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                Initial: {{ dish.initialForecastQuantity ?? dish.recommendedQuantity }}
              </span>
              <span class="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                Reel: {{ dish.actualQuantitySold ?? 0 }}
              </span>
              <span class="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                Ecart: {{ dish.productionGap ?? 0 }}
              </span>
              <span class="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                CA projete: {{ formatCurrency(dish.projectedRevenue) }}
              </span>
              <span class="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                Prix TTC: {{ formatCurrency(getProductionPrice(dish)) }}
              </span>
            </div>

            <div
              v-if="forecast.persisted && forecast._id"
              class="mt-4 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
            >
              <div class="grid gap-2 sm:grid-cols-[0.7fr_1fr_auto]">
                <input
                  v-model.number="correctionForms[dish.dishId]!.quantity"
                  class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Quantite corrigee"
                >
                <input
                  v-model="correctionForms[dish.dishId]!.comment"
                  class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-900"
                  type="text"
                  maxlength="280"
                  placeholder="Commentaire"
                >
                <button
                  class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
                  @click="submitCorrection(dish)"
                >
                  Corriger
                </button>
              </div>
              <p
                v-if="dish.correctedAt"
                class="text-xs text-slate-500"
              >
                Correction sauvegardee le {{ new Date(dish.correctedAt).toLocaleString('fr-FR') }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 class="text-lg font-semibold">
            Besoins matieres
          </h3>
          <div class="mt-4 space-y-2 text-sm">
            <div
              v-for="ingredient in forecast.ingredientNeeds"
              :key="ingredient.ingredientId"
              class="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950"
            >
              <span>{{ ingredient.ingredientName }}</span>
              <span>{{ ingredient.quantity }} {{ ingredient.unit }}</span>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 class="text-lg font-semibold">
            Alertes
          </h3>
          <div class="mt-4 space-y-2 text-sm">
            <p
              v-if="forecast.alerts.length === 0"
              class="text-slate-600 dark:text-slate-300"
            >
              Aucun signal critique sur cette date.
            </p>
            <div
              v-for="alert in forecast.alerts"
              :key="alert.dishId"
              class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <strong>{{ alert.dishName }}</strong> - {{ alert.message }}
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

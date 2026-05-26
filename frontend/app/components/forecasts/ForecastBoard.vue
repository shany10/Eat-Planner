<script setup lang="ts">
import type { ForecastResponse } from '~/types/business'

type ForecastDishView = ForecastResponse['dishes'][number]

const props = defineProps<{
  forecast: ForecastResponse | null
}>()

const emit = defineEmits<{
  correct: [payload: { forecastId: string, dishId: string, correctionQuantity: number, correctionComment: string }]
}>()

const correctionForms = ref<Record<string, { quantity: number, comment: string }>>({})

const sortedDishes = computed(() =>
  [...(props.forecast?.dishes ?? [])].sort((a, b) => b.recommendedQuantity - a.recommendedQuantity)
)

const totalRecommendedQuantity = computed(() =>
  (props.forecast?.dishes ?? []).reduce((sum, dish) => sum + dish.recommendedQuantity, 0)
)

const totalProjectedFoodCost = computed(() =>
  (props.forecast?.dishes ?? []).reduce((sum, dish) => sum + dish.projectedFoodCost, 0)
)

const highConfidenceCount = computed(() =>
  (props.forecast?.dishes ?? []).filter(dish => dish.confidence === 'high').length
)

const confidenceScore = computed(() => {
  const dishes = props.forecast?.dishes ?? []

  if (dishes.length === 0) {
    return 0
  }

  const score = dishes.reduce((sum, dish) => {
    if (dish.confidence === 'high') {
      return sum + 3
    }

    if (dish.confidence === 'medium') {
      return sum + 2
    }

    return sum + 1
  }, 0)

  return Math.round((score / (dishes.length * 3)) * 100)
})

watch(() => props.forecast, (forecast) => {
  const nextForms: Record<string, { quantity: number, comment: string }> = {}

  if (!forecast) {
    correctionForms.value = nextForms
    return
  }

  for (const dish of forecast.dishes) {
    nextForms[dish.dishId] = {
      quantity: dish.userCorrectionQuantity ?? dish.recommendedQuantity,
      comment: dish.correctionComment ?? ''
    }
  }

  correctionForms.value = nextForms
}, { immediate: true })

function getProductionPrice(dish: ForecastDishView) {
  return dish.actualPriceIncludingTax && dish.actualPriceIncludingTax > 0
    ? dish.actualPriceIncludingTax
    : dish.suggestedPriceIncludingTax ?? dish.suggestedPrice
}

function getConfidenceLabel(confidence: ForecastDishView['confidence']) {
  if (confidence === 'high') {
    return 'Confiance haute'
  }

  if (confidence === 'medium') {
    return 'Confiance moyenne'
  }

  return 'Confiance basse'
}

function getConfidenceClass(confidence: ForecastDishView['confidence']) {
  if (confidence === 'high') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
  }

  if (confidence === 'medium') {
    return 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200'
  }

  return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'
}

function getTrendLabel(trend: ForecastDishView['trend']) {
  if (trend === 'up') {
    return 'Tendance haute'
  }

  if (trend === 'down') {
    return 'Tendance basse'
  }

  return 'Stable'
}

function getTrendIcon(trend: ForecastDishView['trend']) {
  if (trend === 'up') {
    return 'i-lucide-trending-up'
  }

  if (trend === 'down') {
    return 'i-lucide-trending-down'
  }

  return 'i-lucide-minus'
}

function getMissionLabel(dish: ForecastDishView) {
  if (dish.confidence === 'high') {
    return 'Pret'
  }

  if (dish.confidence === 'medium') {
    return 'A surveiller'
  }

  return 'A challenger'
}

function getGapClass(value = 0) {
  if (value === 0) {
    return 'text-slate-500 dark:text-slate-400'
  }

  return value > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'
}

function formatCurrency(value = 0) {
  return `${value.toFixed(2)} EUR`
}

function submitCorrection(dish: ForecastDishView) {
  if (!props.forecast?._id) {
    return
  }

  const form = correctionForms.value[dish.dishId]
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
    class="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300"
  >
    Aucune prevision chargee pour le moment. Choisis une date puis lance le calcul pour afficher la production conseillee.
  </section>

  <div
    v-else
    class="grid gap-5"
  >
    <section class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <article class="app-card">
        <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
          Mission
        </p>
        <p class="mt-2 text-xl font-semibold text-slate-950 dark:text-white">
          {{ forecast.persisted ? 'Validee' : 'Simulation' }}
        </p>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {{ forecast.targetDate }}
        </p>
      </article>

      <article class="app-card">
        <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
          Portions cible
        </p>
        <p class="mt-2 text-xl font-semibold text-slate-950 dark:text-white">
          {{ totalRecommendedQuantity }}
        </p>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {{ forecast.dishes.length }} plat(s)
        </p>
      </article>

      <article class="app-card">
        <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
          CA projete
        </p>
        <p class="mt-2 text-xl font-semibold text-slate-950 dark:text-white">
          {{ formatCurrency(forecast.totals.totalProjectedRevenue) }}
        </p>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Cout matiere {{ formatCurrency(totalProjectedFoodCost) }}
        </p>
      </article>

      <article class="app-card">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              Confiance
            </p>
            <p class="mt-2 text-xl font-semibold text-slate-950 dark:text-white">
              {{ confidenceScore }}%
            </p>
          </div>
          <span class="app-pill">{{ highConfidenceCount }} haute(s)</span>
        </div>
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            class="h-full rounded-full bg-emerald-600 dark:bg-emerald-300"
            :style="{ width: `${confidenceScore}%` }"
          />
        </div>
      </article>
    </section>

    <section class="grid gap-4 xl:grid-cols-[1.35fr_0.85fr]">
      <div class="app-section">
        <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p class="app-eyebrow">
              Mission du service
            </p>
            <h3 class="app-section-title mt-1">
              Quantites a preparer
            </h3>
          </div>
          <span class="app-pill">{{ sortedDishes.length }} objectif(s)</span>
        </div>

        <div class="space-y-3">
          <article
            v-for="dish in sortedDishes"
            :key="dish.dishId"
            class="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950"
          >
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="app-pill">{{ dish.category }}</span>
                  <span
                    class="inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold"
                    :class="getConfidenceClass(dish.confidence)"
                  >
                    {{ getMissionLabel(dish) }}
                  </span>
                </div>
                <h4 class="mt-3 text-lg font-semibold text-slate-950 dark:text-white">
                  {{ dish.dishName }}
                </h4>
                <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ dish.comment || 'Objectif calcule avec l historique disponible.' }}
                </p>
              </div>

              <div class="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-center dark:border-slate-800 dark:bg-slate-900">
                <p class="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                  Objectif
                </p>
                <p class="mt-1 text-3xl font-bold text-slate-950 dark:text-white">
                  {{ dish.recommendedQuantity }}
                </p>
                <p class="text-sm text-slate-500">
                  portion(s)
                </p>
              </div>
            </div>

            <div class="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div class="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
                <span class="text-slate-500 dark:text-slate-400">Base</span>
                <strong class="mt-1 block">{{ dish.baselineQuantity }} portion(s)</strong>
              </div>
              <div class="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
                <span class="text-slate-500 dark:text-slate-400">Historique</span>
                <strong class="mt-1 block">{{ dish.historyDaysUsed }} jour(s)</strong>
              </div>
              <div class="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
                <span class="text-slate-500 dark:text-slate-400">Prix TTC</span>
                <strong class="mt-1 block">{{ formatCurrency(getProductionPrice(dish)) }}</strong>
              </div>
              <div class="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
                <span class="text-slate-500 dark:text-slate-400">CA attendu</span>
                <strong class="mt-1 block">{{ formatCurrency(dish.projectedRevenue) }}</strong>
              </div>
            </div>

            <div class="mt-3 flex flex-wrap gap-2 text-xs">
              <span class="inline-flex items-center gap-1 rounded-md bg-slate-100 px-3 py-1 font-semibold dark:bg-slate-800">
                <UIcon
                  :name="getTrendIcon(dish.trend)"
                  class="size-3.5"
                />
                {{ getTrendLabel(dish.trend) }}
              </span>
              <span class="rounded-md bg-slate-100 px-3 py-1 font-semibold dark:bg-slate-800">
                {{ getConfidenceLabel(dish.confidence) }}
              </span>
              <span class="rounded-md bg-slate-100 px-3 py-1 font-semibold dark:bg-slate-800">
                Initial {{ dish.initialForecastQuantity ?? dish.recommendedQuantity }}
              </span>
              <span class="rounded-md bg-slate-100 px-3 py-1 font-semibold dark:bg-slate-800">
                Reel {{ dish.actualQuantitySold ?? 0 }}
              </span>
              <span
                class="rounded-md bg-slate-100 px-3 py-1 font-semibold dark:bg-slate-800"
                :class="getGapClass(dish.productionGap)"
              >
                Ecart {{ dish.productionGap ?? 0 }}
              </span>
            </div>

            <div
              v-if="forecast.persisted && forecast._id"
              class="mt-4 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <div class="grid gap-2 sm:grid-cols-[0.7fr_1fr_auto]">
                <input
                  v-model.number="correctionForms[dish.dishId]!.quantity"
                  class="app-input"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Quantite corrigee"
                  aria-label="Quantite corrigee"
                >
                <input
                  v-model="correctionForms[dish.dishId]!.comment"
                  class="app-input"
                  type="text"
                  maxlength="280"
                  placeholder="Note de correction"
                  aria-label="Note de correction"
                >
                <button
                  class="btn-primary"
                  @click="submitCorrection(dish)"
                >
                  <UIcon
                    name="i-lucide-check"
                    class="size-4"
                  />
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
          </article>
        </div>
      </div>

      <div class="space-y-4">
        <section class="app-section">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <p class="app-eyebrow">
                Courses
              </p>
              <h3 class="app-section-title mt-1">
                Besoins matieres
              </h3>
            </div>
            <span class="app-pill">{{ forecast.ingredientNeeds.length }}</span>
          </div>
          <div class="space-y-2 text-sm">
            <p
              v-if="forecast.ingredientNeeds.length === 0"
              class="text-slate-600 dark:text-slate-300"
            >
              Aucun besoin matiere calcule pour cette date.
            </p>
            <div
              v-for="ingredient in forecast.ingredientNeeds"
              :key="ingredient.ingredientId"
              class="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="font-medium">{{ ingredient.ingredientName }}</span>
                <span>{{ ingredient.quantity }} {{ ingredient.unit }}</span>
              </div>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Cout estime {{ formatCurrency(ingredient.estimatedCost) }}
              </p>
            </div>
          </div>
        </section>

        <section class="app-section">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <p class="app-eyebrow">
                Vigilance
              </p>
              <h3 class="app-section-title mt-1">
                Alertes
              </h3>
            </div>
            <span class="app-pill">{{ forecast.alerts.length }}</span>
          </div>
          <div class="space-y-2 text-sm">
            <p
              v-if="forecast.alerts.length === 0"
              class="text-slate-600 dark:text-slate-300"
            >
              Aucun signal critique sur cette date.
            </p>
            <div
              v-for="alert in forecast.alerts"
              :key="alert.dishId"
              class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <strong>{{ alert.dishName }}</strong> - {{ alert.message }}
            </div>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>

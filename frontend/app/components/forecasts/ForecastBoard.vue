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
    class="rounded-[2.5rem] border-2 border-dashed border-[#c0c9ba] dark:border-[#40493e] bg-white dark:bg-[#1a1c1c] p-8 text-sm text-[#40493e] dark:text-[#c0c9ba]"
  >
    Aucune prevision chargee pour le moment. Choisis une date puis lance le calcul pour afficher la production conseillee.
  </section>

  <div
    v-else
    class="grid gap-6"
  >
    <section class="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      <article class="bg-[#f3f3f3] dark:bg-[#1a1c1c] p-6 rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5">
        <span class="text-[10px] font-bold uppercase text-[#40493e]/70 dark:text-[#c0c9ba]/70">Mission</span>
        <p class="text-xl font-black text-[#1a1c1c] dark:text-white my-1">
          {{ forecast.persisted ? 'Validee' : 'Simulation' }}
        </p>
        <p class="text-xs text-[#40493e] dark:text-[#c0c9ba]">
          {{ forecast.targetDate }}
        </p>
      </article>

      <article class="bg-[#f3f3f3] dark:bg-[#1a1c1c] p-6 rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5">
        <span class="text-[10px] font-bold uppercase text-[#40493e]/70 dark:text-[#c0c9ba]/70">Portions cible</span>
        <p class="text-xl font-black text-[#1a1c1c] dark:text-white my-1">
          {{ totalRecommendedQuantity }}
        </p>
        <p class="text-xs text-[#40493e] dark:text-[#c0c9ba]">
          {{ forecast.dishes.length }} plat(s)
        </p>
      </article>

      <article class="bg-[#f3f3f3] dark:bg-[#1a1c1c] p-6 rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5">
        <span class="text-[10px] font-bold uppercase text-[#40493e]/70 dark:text-[#c0c9ba]/70">CA projete</span>
        <p class="text-xl font-black text-[#1a1c1c] dark:text-white my-1">
          {{ formatCurrency(forecast.totals.totalProjectedRevenue) }}
        </p>
        <p class="text-xs text-[#40493e] dark:text-[#c0c9ba]">
          Cout matiere {{ formatCurrency(totalProjectedFoodCost) }}
        </p>
      </article>

      <article class="bg-[#f3f3f3] dark:bg-[#1a1c1c] p-6 rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <span class="text-[10px] font-bold uppercase text-[#40493e]/70 dark:text-[#c0c9ba]/70">Confiance</span>
            <p class="text-xl font-black text-[#1a1c1c] dark:text-white my-1">
              {{ confidenceScore }}%
            </p>
          </div>
          <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ highConfidenceCount }} haute(s)</span>
        </div>
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-[#e8e8e8] dark:bg-[#2f3131]">
          <div
            class="h-full rounded-full bg-[#005013] dark:bg-[#8ad986]"
            :style="{ width: `${confidenceScore}%` }"
          />
        </div>
      </article>
    </section>

    <section class="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
      <div class="bg-white dark:bg-[#1a1c1c] rounded-[2.5rem] p-6 border border-[#c0c9ba]/20 dark:border-white/5 shadow-sm">
        <div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <span class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/60">Mission du service</span>
            <h3 class="font-bold text-lg text-[#1a1c1c] dark:text-white mt-1">
              Quantites a preparer
            </h3>
          </div>
          <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ sortedDishes.length }} objectif(s)</span>
        </div>

        <div class="space-y-4">
          <article
            v-for="dish in sortedDishes"
            :key="dish.dishId"
            class="rounded-3xl border border-[#c0c9ba]/20 dark:border-white/5 bg-[#f3f3f3] dark:bg-[#2f3131] p-5"
          >
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#1a1c1c] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ dish.category }}</span>
                  <span
                    class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold"
                    :class="getConfidenceClass(dish.confidence)"
                  >
                    {{ getMissionLabel(dish) }}
                  </span>
                </div>
                <h4 class="mt-3 text-lg font-bold text-[#1a1c1c] dark:text-white">
                  {{ dish.dishName }}
                </h4>
                <p class="mt-2 text-sm leading-6 text-[#40493e] dark:text-[#c0c9ba]">
                  {{ dish.comment || 'Objectif calcule avec l historique disponible.' }}
                </p>
              </div>

              <div class="shrink-0 rounded-3xl border border-[#c0c9ba]/20 dark:border-white/5 bg-white dark:bg-[#1a1c1c] px-6 py-4 text-center">
                <p class="text-[10px] font-bold uppercase text-[#40493e]/70 dark:text-[#c0c9ba]/70">
                  Objectif
                </p>
                <p class="mt-1 text-3xl font-black text-[#1a1c1c] dark:text-white">
                  {{ dish.recommendedQuantity }}
                </p>
                <p class="text-sm text-[#40493e] dark:text-[#c0c9ba]">
                  portion(s)
                </p>
              </div>
            </div>

            <div class="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div class="rounded-2xl bg-white dark:bg-[#1a1c1c] p-3 text-sm border border-[#c0c9ba]/20 dark:border-white/5">
                <span class="text-[#40493e] dark:text-[#c0c9ba]">Base</span>
                <strong class="mt-1 block text-[#1a1c1c] dark:text-white">{{ dish.baselineQuantity }} portion(s)</strong>
              </div>
              <div class="rounded-2xl bg-white dark:bg-[#1a1c1c] p-3 text-sm border border-[#c0c9ba]/20 dark:border-white/5">
                <span class="text-[#40493e] dark:text-[#c0c9ba]">Historique</span>
                <strong class="mt-1 block text-[#1a1c1c] dark:text-white">{{ dish.historyDaysUsed }} jour(s)</strong>
              </div>
              <div class="rounded-2xl bg-white dark:bg-[#1a1c1c] p-3 text-sm border border-[#c0c9ba]/20 dark:border-white/5">
                <span class="text-[#40493e] dark:text-[#c0c9ba]">Prix TTC</span>
                <strong class="mt-1 block text-[#1a1c1c] dark:text-white">{{ formatCurrency(getProductionPrice(dish)) }}</strong>
              </div>
              <div class="rounded-2xl bg-white dark:bg-[#1a1c1c] p-3 text-sm border border-[#c0c9ba]/20 dark:border-white/5">
                <span class="text-[#40493e] dark:text-[#c0c9ba]">CA attendu</span>
                <strong class="mt-1 block text-[#1a1c1c] dark:text-white">{{ formatCurrency(dish.projectedRevenue) }}</strong>
              </div>
            </div>

            <div class="mt-3 flex flex-wrap gap-2 text-xs">
              <span class="inline-flex items-center gap-1 rounded-full bg-[#e8e8e8] dark:bg-[#1a1c1c] px-3 py-1 font-bold text-[#40493e] dark:text-[#c0c9ba]">
                <UIcon
                  :name="getTrendIcon(dish.trend)"
                  class="size-3.5"
                />
                {{ getTrendLabel(dish.trend) }}
              </span>
              <span class="rounded-full bg-[#e8e8e8] dark:bg-[#1a1c1c] px-3 py-1 font-bold text-[#40493e] dark:text-[#c0c9ba]">
                {{ getConfidenceLabel(dish.confidence) }}
              </span>
              <span class="rounded-full bg-[#e8e8e8] dark:bg-[#1a1c1c] px-3 py-1 font-bold text-[#40493e] dark:text-[#c0c9ba]">
                Initial {{ dish.initialForecastQuantity ?? dish.recommendedQuantity }}
              </span>
              <span class="rounded-full bg-[#e8e8e8] dark:bg-[#1a1c1c] px-3 py-1 font-bold text-[#40493e] dark:text-[#c0c9ba]">
                Reel {{ dish.actualQuantitySold ?? 0 }}
              </span>
              <span
                class="rounded-full bg-[#e8e8e8] dark:bg-[#1a1c1c] px-3 py-1 font-bold"
                :class="getGapClass(dish.productionGap)"
              >
                Ecart {{ dish.productionGap ?? 0 }}
              </span>
            </div>

            <div
              v-if="forecast.persisted && forecast._id"
              class="mt-4 grid gap-2 rounded-3xl border border-[#c0c9ba]/20 dark:border-white/5 bg-white dark:bg-[#1a1c1c] p-3"
            >
              <div class="grid gap-2 sm:grid-cols-[0.7fr_1fr_auto]">
                <input
                  v-model.number="correctionForms[dish.dishId]!.quantity"
                  class="w-full bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236] transition"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Quantite corrigee"
                  aria-label="Quantite corrigee"
                >
                <input
                  v-model="correctionForms[dish.dishId]!.comment"
                  class="w-full bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm placeholder:text-[#40493e]/50 dark:placeholder:text-[#c0c9ba]/50 focus:outline-none focus:ring-2 focus:ring-[#feb236] transition"
                  type="text"
                  maxlength="280"
                  placeholder="Note de correction"
                  aria-label="Note de correction"
                >
                <button
                  class="bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] font-bold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
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
                class="text-xs text-[#40493e] dark:text-[#c0c9ba]"
              >
                Correction sauvegardee le {{ new Date(dish.correctedAt).toLocaleString('fr-FR') }}
              </p>
            </div>
          </article>
        </div>
      </div>

      <div class="space-y-6">
        <section class="bg-white dark:bg-[#1a1c1c] rounded-[2.5rem] p-6 border border-[#c0c9ba]/20 dark:border-white/5 shadow-sm">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <span class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/60">Courses</span>
              <h3 class="font-bold text-lg text-[#1a1c1c] dark:text-white mt-1">
                Besoins matieres
              </h3>
            </div>
            <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ forecast.ingredientNeeds.length }}</span>
          </div>
          <div class="space-y-2 text-sm">
            <p
              v-if="forecast.ingredientNeeds.length === 0"
              class="text-[#40493e] dark:text-[#c0c9ba]"
            >
              Aucun besoin matiere calcule pour cette date.
            </p>
            <div
              v-for="ingredient in forecast.ingredientNeeds"
              :key="ingredient.ingredientId"
              class="rounded-2xl bg-[#f3f3f3] dark:bg-[#2f3131] px-4 py-2 border border-[#c0c9ba]/20 dark:border-white/5"
            >
              <div class="flex items-center justify-between gap-3">
                <span class="font-bold text-[#1a1c1c] dark:text-white">{{ ingredient.ingredientName }}</span>
                <span class="text-[#1a1c1c] dark:text-white">{{ ingredient.quantity }} {{ ingredient.unit }}</span>
              </div>
              <p class="mt-1 text-xs text-[#40493e] dark:text-[#c0c9ba]">
                Cout estime {{ formatCurrency(ingredient.estimatedCost) }}
              </p>
            </div>
          </div>
        </section>

        <section class="bg-white dark:bg-[#1a1c1c] rounded-[2.5rem] p-6 border border-[#c0c9ba]/20 dark:border-white/5 shadow-sm">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <span class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/60">Vigilance</span>
              <h3 class="font-bold text-lg text-[#1a1c1c] dark:text-white mt-1">
                Alertes
              </h3>
            </div>
            <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ forecast.alerts.length }}</span>
          </div>
          <div class="space-y-2 text-sm">
            <p
              v-if="forecast.alerts.length === 0"
              class="text-[#40493e] dark:text-[#c0c9ba]"
            >
              Aucun signal critique sur cette date.
            </p>
            <div
              v-for="alert in forecast.alerts"
              :key="alert.dishId"
              class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
            >
              <strong>{{ alert.dishName }}</strong> - {{ alert.message }}
            </div>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>

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

const ingredientNeeds = computed(() => props.forecast?.ingredientNeeds ?? [])

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
    return 'Haute'
  }

  if (confidence === 'medium') {
    return 'Moyenne'
  }

  return 'Basse'
}

function getConfidenceClass(confidence: ForecastDishView['confidence']) {
  if (confidence === 'high') {
    return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
  }

  if (confidence === 'medium') {
    return 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200'
  }

  return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
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
    class="rounded-xl border border-dashed border-[#c0c9ba] bg-white p-6 text-sm text-[#40493e] dark:border-[#40493e] dark:bg-[#1a1c1c] dark:text-[#c0c9ba]"
  >
    Choisis une date puis lance le calcul.
  </section>

  <div
    v-else
    class="grid gap-4 xl:grid-cols-[1fr_360px]"
  >
    <section class="rounded-xl border border-[#c0c9ba]/20 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1a1c1c]">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/70">
            Production
          </p>
          <h2 class="mt-1 text-lg font-bold text-[#1a1c1c] dark:text-white">
            Quantites a preparer
          </h2>
        </div>
        <span class="rounded-full bg-[#e8e8e8] px-3 py-1 text-[11px] font-bold text-[#40493e] dark:bg-[#2f3131] dark:text-[#c0c9ba]">
          {{ sortedDishes.length }} plat(s)
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-left text-sm">
          <thead class="border-b border-[#c0c9ba]/20 text-xs uppercase text-[#40493e] dark:border-white/10 dark:text-[#c0c9ba]">
            <tr>
              <th class="px-3 py-2 font-bold">
                Plat
              </th>
              <th class="px-3 py-2 font-bold">
                Quantite
              </th>
              <th class="px-3 py-2 font-bold">
                Confiance
              </th>
              <th class="px-3 py-2 font-bold">
                Prix
              </th>
              <th class="px-3 py-2 font-bold">
                CA
              </th>
              <th
                v-if="forecast.persisted && forecast._id"
                class="px-3 py-2 font-bold"
              >
                Corriger
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#c0c9ba]/20 dark:divide-white/10">
            <tr
              v-for="dish in sortedDishes"
              :key="dish.dishId"
            >
              <td class="px-3 py-3">
                <p class="font-bold text-[#1a1c1c] dark:text-white">
                  {{ dish.dishName }}
                </p>
                <p class="text-xs text-[#40493e] dark:text-[#c0c9ba]">
                  {{ dish.category }}
                </p>
              </td>
              <td class="px-3 py-3 text-xl font-black text-[#1a1c1c] dark:text-white">
                {{ dish.recommendedQuantity }}
              </td>
              <td class="px-3 py-3">
                <span
                  class="rounded-full px-3 py-1 text-xs font-bold"
                  :class="getConfidenceClass(dish.confidence)"
                >
                  {{ getConfidenceLabel(dish.confidence) }}
                </span>
              </td>
              <td class="px-3 py-3 text-[#40493e] dark:text-[#c0c9ba]">
                {{ formatCurrency(getProductionPrice(dish)) }}
              </td>
              <td class="px-3 py-3 font-bold text-[#1a1c1c] dark:text-white">
                {{ formatCurrency(dish.projectedRevenue) }}
              </td>
              <td
                v-if="forecast.persisted && forecast._id"
                class="px-3 py-3"
              >
                <div class="flex items-center gap-2">
                  <input
                    v-model.number="correctionForms[dish.dishId]!.quantity"
                    class="w-20 rounded-full border border-[#c0c9ba]/30 bg-[#f3f3f3] px-3 py-2 text-sm text-[#1a1c1c] outline-none focus:ring-2 focus:ring-[#feb236] dark:border-white/10 dark:bg-[#2f3131] dark:text-white"
                    type="number"
                    min="0"
                    step="1"
                    aria-label="Quantite corrigee"
                  >
                  <button
                    class="inline-flex size-9 items-center justify-center rounded-full bg-[#feb236] text-[#6d4700] transition hover:bg-[#ffc059]"
                    type="button"
                    aria-label="Sauvegarder la correction"
                    @click="submitCorrection(dish)"
                  >
                    <UIcon
                      name="i-lucide-check"
                      class="size-4"
                    />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <aside class="grid gap-4">
      <section class="rounded-xl border border-[#c0c9ba]/20 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1a1c1c]">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/70">
              Matieres
            </p>
            <h2 class="mt-1 text-lg font-bold text-[#1a1c1c] dark:text-white">
              Besoins
            </h2>
          </div>
          <span class="rounded-full bg-[#e8e8e8] px-3 py-1 text-[11px] font-bold text-[#40493e] dark:bg-[#2f3131] dark:text-[#c0c9ba]">
            {{ ingredientNeeds.length }}
          </span>
        </div>

        <div class="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          <p
            v-if="ingredientNeeds.length === 0"
            class="text-sm text-[#40493e] dark:text-[#c0c9ba]"
          >
            Aucun besoin calcule.
          </p>
          <div
            v-for="ingredient in ingredientNeeds"
            :key="ingredient.ingredientId"
            class="rounded-xl bg-[#f3f3f3] px-4 py-3 text-sm dark:bg-[#2f3131]"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="font-bold text-[#1a1c1c] dark:text-white">{{ ingredient.ingredientName }}</span>
              <span class="text-[#40493e] dark:text-[#c0c9ba]">{{ ingredient.quantity }} {{ ingredient.unit }}</span>
            </div>
            <p class="mt-1 text-xs text-[#40493e] dark:text-[#c0c9ba]">
              {{ formatCurrency(ingredient.estimatedCost) }}
            </p>
          </div>
        </div>
      </section>

      <section class="rounded-xl border border-[#c0c9ba]/20 bg-white p-5 shadow-sm dark:border-white/5 dark:bg-[#1a1c1c]">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="text-lg font-bold text-[#1a1c1c] dark:text-white">
            Alertes
          </h2>
          <span class="rounded-full bg-[#e8e8e8] px-3 py-1 text-[11px] font-bold text-[#40493e] dark:bg-[#2f3131] dark:text-[#c0c9ba]">
            {{ forecast.alerts.length }}
          </span>
        </div>

        <div class="space-y-2 text-sm">
          <p
            v-if="forecast.alerts.length === 0"
            class="text-[#40493e] dark:text-[#c0c9ba]"
          >
            Rien a signaler.
          </p>
          <div
            v-for="alert in forecast.alerts"
            :key="alert.dishId"
            class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <strong>{{ alert.dishName }}</strong>
            <span class="block">{{ alert.message }}</span>
          </div>
        </div>
      </section>
    </aside>
  </div>
</template>

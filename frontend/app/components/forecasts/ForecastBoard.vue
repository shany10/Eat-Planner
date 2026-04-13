<script setup lang="ts">
import type { ForecastResponse } from '~/types/business'

defineProps<{
  forecast: ForecastResponse | null
}>()
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
          <span class="text-sm text-slate-500">{{ forecast.targetDate }}</span>
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
                CA projete: {{ dish.projectedRevenue.toFixed(2) }} EUR
              </span>
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

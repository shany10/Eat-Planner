<script setup lang="ts">
import type { Dish } from '~/types/business'

defineProps<{
  items: Dish[]
}>()

defineEmits<{
  edit: [item: Dish]
  remove: [item: Dish]
}>()
</script>

<template>
  <div
    v-if="items.length === 0"
    class="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300"
  >
    Aucun plat pour le moment. Cree une recette pour voir apparaitre le cout matiere, la part de charges et le prix conseille.
  </div>

  <div
    v-else
    class="space-y-4"
  >
    <article
      v-for="item in items"
      :key="item._id"
      class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.2em] text-slate-400">
            {{ item.category }}
          </p>
          <h3 class="mt-1 text-xl font-semibold">
            {{ item.name }}
          </h3>
          <p class="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            {{ item.description || 'Aucune description pour le moment.' }}
          </p>
        </div>

        <div class="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
          <div>Food cost: <strong>{{ item.profitability?.foodCost?.toFixed(2) || '0.00' }} EUR</strong></div>
          <div>Charges / portion: <strong>{{ item.profitability?.chargeCost?.toFixed(2) || '0.00' }} EUR</strong></div>
          <div>Prix conseille: <strong>{{ item.profitability?.suggestedPrice?.toFixed(2) || '0.00' }} EUR</strong></div>
          <div>Marge cible: <strong>{{ Math.round((item.targetMarginRate || 0) * 100) }}%</strong></div>
          <div>Portions / jour: <strong>{{ item.estimatedDailyServings }}</strong></div>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <span
          v-for="line in item.profitability?.lines || []"
          :key="`${item._id}-${line.ingredientId}`"
          class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {{ line.ingredientName }} - {{ line.recipeQuantity }} {{ line.recipeUnit }}
        </span>
      </div>

      <div class="mt-5 flex justify-end gap-2">
        <button
          class="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
          @click="$emit('edit', item)"
        >
          Editer
        </button>
        <button
          class="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white"
          @click="$emit('remove', item)"
        >
          Supprimer
        </button>
      </div>
    </article>
  </div>
</template>

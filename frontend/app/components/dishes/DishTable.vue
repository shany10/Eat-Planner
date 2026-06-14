<script setup lang="ts">
import type { Dish } from "~/types/business";

withDefaults(
  defineProps<{
    items: Dish[];
    emptyMessage?: string;
  }>(),
  {
    emptyMessage:
      "Aucun plat pour le moment. Cree une recette pour voir apparaitre le cout matiere, la part de charges et le prix conseille.",
  },
);

defineEmits<{
  edit: [item: Dish];
  remove: [item: Dish];
}>();

function formatCurrency(value?: number) {
  return `${(value ?? 0).toFixed(2)} EUR`;
}

function formatPercent(value?: number | null) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function getMarginSourceLabel(item: Dish) {
  if (item.profitability?.marginSource === "account") {
    return "Globale";
  }

  if (item.profitability?.marginSource === "dish") {
    return "Specifique";
  }

  return "Systeme";
}

function getGapClass(item: Dish) {
  const gap = item.profitability?.priceGapIncludingTax ?? 0;

  if (!item.profitability?.actualPriceIncludingTax) {
    return "text-slate-500 dark:text-slate-400";
  }

  return gap >= 0
    ? "text-emerald-700 dark:text-emerald-300"
    : "text-red-700 dark:text-red-300";
}
</script>

<template>
  <div
    v-if="items.length === 0"
    class="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/80 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300"
  >
    {{ emptyMessage }}
  </div>

  <div v-else class="space-y-2 grid gap-4 grid-cols-3">
    <article
      v-for="item in items"
      :key="item._id"
      class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div class="">
        <div>
          <p class="text-xs uppercase tracking-[0.2em] text-slate-400">
            {{ item.category }}
          </p>
          <h3 class="mt-1 text-xl font-semibold">
            {{ item.name }}
          </h3>
          <p class="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            {{ item.description || "Aucune description pour le moment." }}
          </p>
        </div>

        <div class="grid gap-2 text-sm mt-2 text-slate-600 dark:text-slate-300">
          <div
            class="grid gap-1 grid-cols-2 rounded-xl bg-slate-50 p-2 dark:bg-slate-950"
          >
            <span>Cout matiere</span>
            <strong class="text-right">{{
              formatCurrency(item.profitability?.foodCost)
            }}</strong>
            <span>Charges / portion</span>
            <strong class="text-right">{{
              formatCurrency(item.profitability?.chargeCost)
            }}</strong>
            <span>Cout total HT</span>
            <strong class="text-right">{{
              formatCurrency(item.profitability?.totalCost)
            }}</strong>
          </div>

          <div
            class="grid gap-1 grid-cols-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-950"
          >
            <span>Marge {{ getMarginSourceLabel(item) }}</span>
            <strong class="text-right">{{
              formatPercent(
                item.profitability?.effectiveMarginRate ??
                  item.targetMarginRate,
              )
            }}</strong>
            <span>Prix conseille HT</span>
            <strong class="text-right">{{
              formatCurrency(item.profitability?.suggestedPriceExcludingTax)
            }}</strong>
            <span>TVA</span>
            <strong class="text-right">
              {{ formatCurrency(item.profitability?.suggestedVatAmount) }}
              <span class="text-xs font-normal text-slate-500"
                >({{ formatPercent(item.profitability?.vatRate) }})</span
              >
            </strong>
            <span>Prix conseille TTC</span>
            <strong class="text-right">{{
              formatCurrency(
                item.profitability?.suggestedPriceIncludingTax ??
                  item.profitability?.suggestedPrice,
              )
            }}</strong>
          </div>

          <div
            class="grid gap-1 grid-cols-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-950"
          >
            <span>Prix reel TTC</span>
            <strong class="text-right">
              {{
                item.profitability?.actualPriceIncludingTax
                  ? formatCurrency(item.profitability.actualPriceIncludingTax)
                  : "Non renseigne"
              }}
            </strong>
            <span>Ecart TTC</span>
            <strong class="text-right" :class="getGapClass(item)">
              {{
                item.profitability?.actualPriceIncludingTax
                  ? formatCurrency(item.profitability?.priceGapIncludingTax)
                  : "-"
              }}
              <span
                v-if="item.profitability?.actualPriceIncludingTax"
                class="text-xs font-normal"
              >
                ({{ formatPercent(item.profitability?.priceGapRate) }})
              </span>
            </strong>
            <span>Portions / jour</span>
            <strong class="text-right">{{
              item.estimatedDailyServings
            }}</strong>
          </div>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <span
          v-for="line in item.profitability?.lines || []"
          :key="`${item._id}-${line.ingredientId}`"
          class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {{ line.ingredientName }} - {{ line.recipeQuantity }}
          {{ line.recipeUnit }}
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

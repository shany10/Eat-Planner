<script setup lang="ts">
import type { Dish } from '~/types/business'
import DataTable, { type DataTableColumn } from '~/components/common/DataTable.vue'
import TableRowActions from '~/components/common/TableRowActions.vue'
import AppBadge from '~/components/common/AppBadge.vue'

withDefaults(
  defineProps<{
    items: Dish[]
    emptyMessage?: string
  }>(),
  {
    emptyMessage:
      'Aucun plat pour le moment. Crée une recette pour voir le coût matière, la part de charges et le prix conseillé.'
  }
)

defineEmits<{
  edit: [item: Dish]
  remove: [item: Dish]
}>()

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Plat' },
  { key: 'totalCost', label: 'Coût HT', align: 'right' },
  { key: 'margin', label: 'Marge', align: 'right' },
  { key: 'suggested', label: 'Prix conseillé TTC', align: 'right' },
  { key: 'actual', label: 'Prix réel TTC', align: 'right' },
  { key: 'gap', label: 'Écart', align: 'right' },
  { key: 'actions', label: 'Actions', align: 'right' }
]

function formatCurrency(value?: number) {
  return `${(value ?? 0).toFixed(2)} €`
}

function formatPercent(value?: number | null) {
  return `${Math.round((value ?? 0) * 100)}%`
}

function getMarginSourceLabel(item: Dish) {
  if (item.profitability?.marginSource === 'account') {
    return 'Globale'
  }

  if (item.profitability?.marginSource === 'dish') {
    return 'Spécifique'
  }

  return 'Système'
}

function getGapClass(item: Dish) {
  if (!item.profitability?.actualPriceIncludingTax) {
    return 'text-[color:var(--ep-text-subtle)]'
  }

  return (item.profitability?.priceGapIncludingTax ?? 0) >= 0 ? 'text-success' : 'text-error'
}
</script>

<template>
  <DataTable
    :columns="columns"
    :rows="items"
    expandable
    empty-title="Aucun plat"
    :empty-message="emptyMessage"
    empty-icon="i-lucide-utensils-crossed"
  >
    <template #cell-name="{ row }">
      <span class="ep-cell-strong">{{ row.name }}</span>
      <span class="ep-cell-sub">{{ row.category }}</span>
    </template>

    <template #cell-totalCost="{ row }">
      {{ formatCurrency(row.profitability?.totalCost) }}
    </template>

    <template #cell-margin="{ row }">
      <span class="inline-flex items-center gap-1.5">
        {{ formatPercent(row.profitability?.effectiveMarginRate ?? row.targetMarginRate) }}
        <AppBadge>{{ getMarginSourceLabel(row) }}</AppBadge>
      </span>
    </template>

    <template #cell-suggested="{ row }">
      <span class="ep-cell-strong">
        {{ formatCurrency(row.profitability?.suggestedPriceIncludingTax ?? row.profitability?.suggestedPrice) }}
      </span>
    </template>

    <template #cell-actual="{ row }">
      <span :class="row.profitability?.actualPriceIncludingTax ? '' : 'text-[color:var(--ep-text-subtle)]'">
        {{ row.profitability?.actualPriceIncludingTax ? formatCurrency(row.profitability.actualPriceIncludingTax) : 'Non renseigné' }}
      </span>
    </template>

    <template #cell-gap="{ row }">
      <span
        class="font-semibold"
        :class="getGapClass(row)"
      >
        {{ row.profitability?.actualPriceIncludingTax ? formatCurrency(row.profitability?.priceGapIncludingTax) : '—' }}
      </span>
    </template>

    <template #cell-actions="{ row }">
      <TableRowActions
        @edit="$emit('edit', row)"
        @remove="$emit('remove', row)"
      />
    </template>

    <template #expanded="{ row }">
      <div class="grid gap-4 py-2 md:grid-cols-2">
        <div>
          <p class="app-eyebrow mb-2">
            Décomposition du coût
          </p>
          <dl class="grid grid-cols-2 gap-y-1.5 text-sm">
            <dt class="text-[color:var(--ep-text-muted)]">
              Coût matière
            </dt>
            <dd class="ep-num">
              {{ formatCurrency(row.profitability?.foodCost) }}
            </dd>
            <dt class="text-[color:var(--ep-text-muted)]">
              Charges / portion
            </dt>
            <dd class="ep-num">
              {{ formatCurrency(row.profitability?.chargeCost) }}
            </dd>
            <dt class="text-[color:var(--ep-text-muted)]">
              Prix conseillé HT
            </dt>
            <dd class="ep-num">
              {{ formatCurrency(row.profitability?.suggestedPriceExcludingTax) }}
            </dd>
            <dt class="text-[color:var(--ep-text-muted)]">
              TVA ({{ formatPercent(row.profitability?.vatRate) }})
            </dt>
            <dd class="ep-num">
              {{ formatCurrency(row.profitability?.suggestedVatAmount) }}
            </dd>
            <dt class="text-[color:var(--ep-text-muted)]">
              Portions / jour
            </dt>
            <dd class="ep-num">
              {{ row.estimatedDailyServings }}
            </dd>
          </dl>
        </div>

        <div>
          <p class="app-eyebrow mb-2">
            Recette
          </p>
          <p
            v-if="row.description"
            class="mb-3 text-sm text-[color:var(--ep-text-muted)]"
          >
            {{ row.description }}
          </p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="line in row.profitability?.lines || []"
              :key="`${row._id}-${line.ingredientId}`"
              class="ep-badge"
            >
              {{ line.ingredientName }} · {{ line.recipeQuantity }} {{ line.recipeUnit }}
            </span>
            <span
              v-if="!(row.profitability?.lines || []).length"
              class="text-sm text-[color:var(--ep-text-subtle)]"
            >
              Aucun ingrédient associé.
            </span>
          </div>
        </div>
      </div>
    </template>
  </DataTable>
</template>

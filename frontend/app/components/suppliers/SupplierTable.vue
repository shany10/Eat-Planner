<script setup lang="ts">
import type { Supplier } from '~/types/business'
import DataTable, { type DataTableColumn } from '~/components/common/DataTable.vue'
import TableRowActions from '~/components/common/TableRowActions.vue'

withDefaults(defineProps<{
  items: Supplier[]
  emptyMessage?: string
}>(), {
  emptyMessage: 'Aucun fournisseur pour le moment. Utilise le bouton Ajouter fournisseur pour créer la première fiche.'
})

defineEmits<{
  edit: [item: Supplier]
  remove: [item: Supplier]
}>()

const columns: DataTableColumn[] = [
  { key: 'name', label: 'Fournisseur' },
  { key: 'products', label: 'Produits' },
  { key: 'delivery', label: 'Livraison' },
  { key: 'minimum', label: 'Minimum', align: 'right' },
  { key: 'contact', label: 'Contact' },
  { key: 'actions', label: 'Actions', align: 'right' }
]

function formatCurrency(value?: number) {
  return `${Number(value || 0).toFixed(2)} €`
}
</script>

<template>
  <DataTable
    :columns="columns"
    :rows="items"
    empty-title="Aucun fournisseur"
    :empty-message="emptyMessage"
    empty-icon="i-lucide-truck"
  >
    <template #cell-name="{ row }">
      <span class="ep-cell-strong">{{ row.name }}</span>
      <span class="ep-cell-sub">{{ row.address || 'Adresse non renseignée' }}</span>
    </template>

    <template #cell-products="{ row }">
      <span class="text-[color:var(--ep-text-muted)]">{{ row.productTypes?.join(', ') || '—' }}</span>
    </template>

    <template #cell-delivery="{ row }">
      {{ row.deliveryLeadTimeDays ?? 0 }} j · {{ formatCurrency(row.deliveryFee) }}
    </template>

    <template #cell-minimum="{ row }">
      {{ formatCurrency(row.minimumOrderAmount) }}
    </template>

    <template #cell-contact="{ row }">
      <span class="ep-cell-strong">{{ row.contactName || '—' }}</span>
      <span class="ep-cell-sub">{{ row.email || row.phone || '—' }}</span>
    </template>

    <template #cell-actions="{ row }">
      <TableRowActions
        @edit="$emit('edit', row)"
        @remove="$emit('remove', row)"
      />
    </template>
  </DataTable>
</template>

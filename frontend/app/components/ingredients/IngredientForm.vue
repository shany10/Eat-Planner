<script setup lang="ts">
import type { Ingredient, Supplier } from '~/types/business'

const props = withDefaults(defineProps<{
  suppliers: Supplier[]
  initialValue?: Partial<Ingredient> | null
  submitLabel?: string
  showCancel?: boolean
}>(), {
  initialValue: null,
  submitLabel: 'Enregistrer l ingredient',
  showCancel: false
})

const emit = defineEmits<{
  submit: [payload: {
    name: string
    category: Ingredient['category']
    unit: Ingredient['unit']
    orderUnit?: Ingredient['unit']
    purchasePrice: number
    stockQuantity?: number
    minimumStock?: number
    averageDailyUsage?: number
    minimumOrderQuantity?: number
    supplier?: string | null
    active?: boolean
  }]
  cancel: []
}>()

const unitOptions: Ingredient['unit'][] = ['g', 'kg', 'ml', 'cl', 'l', 'piece', 'carton', 'sac', 'bouteille', 'barquette', 'boite']
const categoryOptions: Ingredient['category'][] = [
  'Viandes',
  'Poissons',
  'Fruits et legumes',
  'Produits laitiers',
  'Epicerie seche',
  'Boissons',
  'Surgeles',
  'Boulangerie',
  'Condiments',
  'Produits d entretien'
]

const form = reactive({
  name: '',
  category: 'Epicerie seche' as Ingredient['category'],
  unit: 'kg' as Ingredient['unit'],
  orderUnit: 'kg' as Ingredient['unit'],
  purchasePrice: 0,
  stockQuantity: 0,
  minimumStock: 0,
  averageDailyUsage: 0,
  minimumOrderQuantity: 0,
  supplier: '' as string | null,
  active: true
})

watchEffect(() => {
  form.name = props.initialValue?.name ?? ''
  form.category = props.initialValue?.category ?? 'Epicerie seche'
  form.unit = props.initialValue?.unit ?? 'kg'
  form.orderUnit = props.initialValue?.orderUnit ?? props.initialValue?.unit ?? 'kg'
  form.purchasePrice = props.initialValue?.purchasePrice ?? 0
  form.stockQuantity = props.initialValue?.stockQuantity ?? 0
  form.minimumStock = props.initialValue?.minimumStock ?? 0
  form.averageDailyUsage = props.initialValue?.averageDailyUsage ?? 0
  form.minimumOrderQuantity = props.initialValue?.minimumOrderQuantity ?? 0
  form.supplier = typeof props.initialValue?.supplier === 'object'
    ? props.initialValue?.supplier?._id ?? ''
    : props.initialValue?.supplier ?? ''
  form.active = props.initialValue?.active ?? true
})

function submit() {
  emit('submit', {
    name: form.name,
    category: form.category,
    unit: form.unit,
    orderUnit: form.orderUnit,
    purchasePrice: Number(form.purchasePrice),
    stockQuantity: Number(form.stockQuantity),
    minimumStock: Number(form.minimumStock),
    averageDailyUsage: Number(form.averageDailyUsage),
    minimumOrderQuantity: Number(form.minimumOrderQuantity),
    supplier: form.supplier || null,
    active: form.active
  })
}
</script>

<template>
  <form
    class="grid gap-3"
    @submit.prevent="submit"
  >
    <div class="grid gap-3 md:grid-cols-2">
      <input
        v-model="form.name"
        class="app-input"
        placeholder="Nom de l ingredient"
        required
      >

      <select
        v-model="form.category"
        class="app-input"
      >
        <option
          v-for="category in categoryOptions"
          :key="category"
          :value="category"
        >
          {{ category }}
        </option>
      </select>

      <select
        v-model="form.unit"
        class="app-input"
      >
        <option
          v-for="unit in unitOptions"
          :key="unit"
          :value="unit"
        >
          {{ unit }}
        </option>
      </select>

      <select
        v-model="form.orderUnit"
        class="app-input"
      >
        <option
          v-for="unit in unitOptions"
          :key="unit"
          :value="unit"
        >
          Commande en {{ unit }}
        </option>
      </select>

      <input
        v-model.number="form.purchasePrice"
        class="app-input"
        placeholder="Prix achat unitaire"
        type="number"
        min="0"
        step="0.01"
      >

      <select
        v-model="form.supplier"
        class="app-input"
      >
        <option value="">
          Sans fournisseur
        </option>
        <option
          v-for="supplier in suppliers"
          :key="supplier._id"
          :value="supplier._id"
        >
          {{ supplier.name }}
        </option>
      </select>
    </div>

    <div class="grid gap-3 md:grid-cols-4">
      <input
        v-model.number="form.stockQuantity"
        class="app-input"
        placeholder="Stock actuel"
        type="number"
        min="0"
        step="0.01"
      >
      <input
        v-model.number="form.minimumStock"
        class="app-input"
        placeholder="Seuil minimum"
        type="number"
        min="0"
        step="0.01"
      >
      <input
        v-model.number="form.averageDailyUsage"
        class="app-input"
        placeholder="Conso/jour"
        type="number"
        min="0"
        step="0.01"
      >
      <input
        v-model.number="form.minimumOrderQuantity"
        class="app-input"
        placeholder="Mini commande"
        type="number"
        min="0"
        step="0.01"
      >
    </div>

    <div class="flex items-center justify-between">
      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input
          v-model="form.active"
          type="checkbox"
        >
        Ingredient actif
      </label>

      <div class="flex gap-2">
        <button
          v-if="showCancel || initialValue"
          type="button"
          class="btn-secondary"
          @click="$emit('cancel')"
        >
          <UIcon
            name="i-lucide-x"
            class="size-4"
          />
          Annuler
        </button>
        <button
          type="submit"
          class="btn-primary"
        >
          <UIcon
            name="i-lucide-save"
            class="size-4"
          />
          {{ submitLabel }}
        </button>
      </div>
    </div>
  </form>
</template>

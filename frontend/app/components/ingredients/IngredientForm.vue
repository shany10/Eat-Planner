<script setup lang="ts">
import type { Ingredient, Supplier } from '~/types/business'

const props = withDefaults(defineProps<{
  suppliers: Supplier[]
  initialValue?: Partial<Ingredient> | null
  submitLabel?: string
}>(), {
  initialValue: null,
  submitLabel: 'Enregistrer l ingredient'
})

const emit = defineEmits<{
  submit: [payload: { name: string, unit: Ingredient['unit'], purchasePrice: number, supplier?: string | null, active?: boolean }]
  cancel: []
}>()

const form = reactive({
  name: '',
  unit: 'kg' as Ingredient['unit'],
  purchasePrice: 0,
  supplier: '' as string | null,
  active: true
})

watchEffect(() => {
  form.name = props.initialValue?.name ?? ''
  form.unit = props.initialValue?.unit ?? 'kg'
  form.purchasePrice = props.initialValue?.purchasePrice ?? 0
  form.supplier = typeof props.initialValue?.supplier === 'object'
    ? props.initialValue?.supplier?._id ?? ''
    : props.initialValue?.supplier ?? ''
  form.active = props.initialValue?.active ?? true
})

function submit() {
  emit('submit', {
    name: form.name,
    unit: form.unit,
    purchasePrice: Number(form.purchasePrice),
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
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <input
        v-model="form.name"
        class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
        placeholder="Nom de l ingredient"
        required
      >

      <select
        v-model="form.unit"
        class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
      >
        <option value="g">
          g
        </option>
        <option value="kg">
          kg
        </option>
        <option value="ml">
          ml
        </option>
        <option value="cl">
          cl
        </option>
        <option value="l">
          l
        </option>
        <option value="piece">
          piece
        </option>
      </select>

      <input
        v-model="form.purchasePrice"
        class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
        placeholder="Prix achat unitaire"
        type="number"
        min="0"
        step="0.01"
      >

      <select
        v-model="form.supplier"
        class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
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
          v-if="initialValue"
          type="button"
          class="rounded-xl border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
          @click="$emit('cancel')"
        >
          Annuler
        </button>
        <button class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-slate-900">
          {{ submitLabel }}
        </button>
      </div>
    </div>
  </form>
</template>

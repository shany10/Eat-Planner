<script setup lang="ts">
import type { Charge } from '~/types/business'

const props = withDefaults(defineProps<{
  initialValue?: Partial<Charge> | null
  submitLabel?: string
}>(), {
  initialValue: null,
  submitLabel: 'Enregistrer la charge'
})

const emit = defineEmits<{
  submit: [payload: Omit<Charge, '_id'>]
  cancel: []
}>()

const form = reactive({
  name: '',
  category: 'rent' as Charge['category'],
  amount: 0,
  period: 'monthly' as Charge['period'],
  active: true
})

watchEffect(() => {
  form.name = props.initialValue?.name ?? ''
  form.category = props.initialValue?.category ?? 'rent'
  form.amount = props.initialValue?.amount ?? 0
  form.period = props.initialValue?.period ?? 'monthly'
  form.active = props.initialValue?.active ?? true
})

function submit() {
  emit('submit', { ...form, amount: Number(form.amount) })
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
        placeholder="Nom de la charge"
        required
      >
      <select
        v-model="form.category"
        class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
      >
        <option value="staff">
          Salaires
        </option>
        <option value="utilities">
          Energie
        </option>
        <option value="rent">
          Loyer
        </option>
        <option value="equipment">
          Materiel
        </option>
        <option value="insurance">
          Assurance
        </option>
        <option value="subscriptions">
          Abonnements
        </option>
        <option value="other">
          Autre
        </option>
      </select>
      <input
        v-model="form.amount"
        class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
        type="number"
        min="0"
        step="0.01"
        placeholder="Montant"
      >
      <select
        v-model="form.period"
        class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
      >
        <option value="daily">
          Journalier
        </option>
        <option value="monthly">
          Mensuel
        </option>
      </select>
    </div>

    <div class="flex items-center justify-between gap-3">
      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input
          v-model="form.active"
          type="checkbox"
        >
        Charge active
      </label>

      <div class="flex gap-2">
        <button
          v-if="initialValue"
          type="button"
          class="rounded-xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700"
          @click="$emit('cancel')"
        >
          Annuler
        </button>
        <button class="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white dark:bg-white dark:text-slate-900">
          {{ submitLabel }}
        </button>
      </div>
    </div>
  </form>
</template>

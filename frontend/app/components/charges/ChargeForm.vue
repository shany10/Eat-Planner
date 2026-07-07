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

const fieldClass = 'app-input'
const primaryBtn = 'btn-primary'
const secondaryBtn = 'btn-secondary'
</script>

<template>
  <form
    class="grid gap-4"
    @submit.prevent="submit"
  >
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <input
        v-model="form.name"
        :class="fieldClass"
        placeholder="Nom de la charge"
        required
      >
      <select
        v-model="form.category"
        :class="fieldClass"
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
        :class="fieldClass"
        type="number"
        min="0"
        step="0.01"
        placeholder="Montant"
      >
      <select
        v-model="form.period"
        :class="fieldClass"
      >
        <option value="daily">
          Journalier
        </option>
        <option value="monthly">
          Mensuel
        </option>
      </select>
    </div>

    <div class="flex items-center justify-between gap-3 pt-2">
      <label class="flex items-center gap-2 text-sm font-medium text-[#40493e] dark:text-[#c0c9ba]">
        <input
          v-model="form.active"
          type="checkbox"
          class="size-4 rounded accent-[#005013]"
        >
        Charge active
      </label>

      <div class="flex gap-2">
        <button
          v-if="initialValue"
          type="button"
          :class="secondaryBtn"
          @click="$emit('cancel')"
        >
          Annuler
        </button>
        <button :class="primaryBtn">
          {{ submitLabel }}
        </button>
      </div>
    </div>
  </form>
</template>

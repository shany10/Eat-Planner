<script setup lang="ts">
import type { Dish } from '~/types/business'

const props = defineProps<{
  dishes: Dish[]
}>()

const emit = defineEmits<{
  submit: [payload: {
    serviceDate: string
    notes?: string
    items: Array<{ dish: string, quantity: number, unitPrice?: number }>
  }]
}>()

const form = reactive({
  serviceDate: new Date().toISOString().slice(0, 10),
  notes: '',
  items: [
    {
      dish: '',
      quantity: 1,
      unitPrice: undefined as number | undefined
    }
  ]
})

const canSubmit = computed(() => {
  return props.dishes.length > 0
    && form.items.length > 0
    && form.items.every(item => item.dish && Number(item.quantity) > 0)
})

function createBlankLine() {
  return {
    dish: props.dishes[0]?._id ?? '',
    quantity: 1,
    unitPrice: undefined as number | undefined
  }
}

watchEffect(() => {
  const firstItem = form.items[0]
  const firstDishId = props.dishes[0]?._id

  if (firstItem && !firstItem.dish && firstDishId) {
    firstItem.dish = firstDishId
  }
})

function addLine() {
  form.items.push(createBlankLine())
}

function removeLine(index: number) {
  if (form.items.length === 1) {
    form.items[0] = createBlankLine()
    return
  }

  form.items.splice(index, 1)
}

function submit() {
  if (!canSubmit.value) {
    return
  }

  emit('submit', {
    serviceDate: form.serviceDate,
    notes: form.notes,
    items: form.items.map(item => ({
      dish: item.dish,
      quantity: Number(item.quantity),
      unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined
    }))
  })
}
</script>

<template>
  <form
    class="grid gap-4"
    @submit.prevent="submit"
  >
    <div class="grid gap-3 md:grid-cols-[0.8fr_1fr_auto]">
      <input
        v-model="form.serviceDate"
        class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
        type="date"
      >
      <input
        v-model="form.notes"
        class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
        placeholder="Notes service"
      >
      <button
        type="button"
        class="rounded-xl border border-slate-300 px-4 py-3 text-sm dark:border-slate-700"
        @click="addLine"
      >
        Ajouter une ligne
      </button>
    </div>

    <div class="space-y-3">
      <div
        v-for="(item, index) in form.items"
        :key="index"
        class="grid gap-3 md:grid-cols-[1.4fr_0.7fr_0.7fr_auto]"
      >
        <select
          v-model="item.dish"
          class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
        >
          <option
            v-for="dish in dishes"
            :key="dish._id"
            :value="dish._id"
          >
            {{ dish.name }}
          </option>
        </select>
        <input
          v-model="item.quantity"
          class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
          type="number"
          min="1"
          step="1"
        >
        <input
          v-model="item.unitPrice"
          class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
          type="number"
          min="0"
          step="0.01"
          placeholder="Prix optionnel"
        >
        <button
          type="button"
          class="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white"
          @click="removeLine(index)"
        >
          Retirer
        </button>
      </div>
    </div>

    <div class="flex items-center justify-between gap-3">
      <p class="text-sm text-slate-500">
        Garde au moins une ligne de plat pour enregistrer le ticket.
      </p>
      <button
        class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
        :disabled="!canSubmit"
      >
        Enregistrer la vente
      </button>
    </div>
  </form>
</template>

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

function getDefaultUnitPrice(dish: Dish) {
  return dish.actualPriceIncludingTax > 0
    ? dish.actualPriceIncludingTax
    : dish.profitability?.suggestedPriceIncludingTax ?? dish.profitability?.suggestedPrice ?? 0
}

function formatCurrency(value: number) {
  return `${value.toFixed(2)} EUR`
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
      unitPrice: item.unitPrice === undefined || Number.isNaN(Number(item.unitPrice))
        ? undefined
        : Number(item.unitPrice)
    }))
  })
}

const fieldClass = 'w-full bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm placeholder:text-[#40493e]/50 dark:placeholder:text-[#c0c9ba]/50 focus:outline-none focus:ring-2 focus:ring-[#feb236] transition'
const secondaryBtn = 'border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white font-bold py-2.5 px-6 rounded-full hover:bg-[#f3f3f3] dark:hover:bg-[#2f3131] transition-all flex items-center justify-center gap-2'
const primaryBtn = 'bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] font-bold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed'
const dangerBtn = 'border border-[#ba1a1a]/40 text-[#ba1a1a] dark:text-[#ff897d] font-bold px-5 py-2.5 rounded-full hover:bg-[#ba1a1a]/10 transition-all'
</script>

<template>
  <form
    class="grid gap-4"
    @submit.prevent="submit"
  >
    <div class="grid gap-3 md:grid-cols-[0.8fr_1fr_auto]">
      <input
        v-model="form.serviceDate"
        :class="fieldClass"
        type="date"
      >
      <input
        v-model="form.notes"
        :class="fieldClass"
        placeholder="Notes service"
      >
      <button
        type="button"
        :class="secondaryBtn"
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
          :class="fieldClass"
        >
          <option
            v-for="dish in dishes"
            :key="dish._id"
            :value="dish._id"
          >
            {{ dish.name }} - defaut {{ formatCurrency(getDefaultUnitPrice(dish)) }}
          </option>
        </select>
        <input
          v-model.number="item.quantity"
          :class="fieldClass"
          type="number"
          min="1"
          step="1"
        >
        <input
          v-model.number="item.unitPrice"
          :class="fieldClass"
          type="number"
          min="0"
          step="0.01"
          placeholder="Prix TTC optionnel"
        >
        <button
          type="button"
          :class="dangerBtn"
          @click="removeLine(index)"
        >
          Retirer
        </button>
      </div>
    </div>

    <div class="flex items-center justify-between gap-3 pt-2">
      <p class="text-sm text-[#40493e] dark:text-[#c0c9ba]">
        Garde au moins une ligne de plat pour enregistrer le ticket.
      </p>
      <button
        :class="primaryBtn"
        :disabled="!canSubmit"
      >
        Enregistrer la vente
      </button>
    </div>
  </form>
</template>

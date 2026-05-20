<script setup lang="ts">
import type { Dish, DishIngredientLine, Ingredient } from '~/types/business'

const props = withDefaults(defineProps<{
  ingredientOptions: Ingredient[]
  initialValue?: Partial<Dish> | null
  submitLabel?: string
}>(), {
  initialValue: null,
  submitLabel: 'Enregistrer le plat'
})

const emit = defineEmits<{
  submit: [payload: {
    name: string
    category: string
    description?: string
    targetMarginRate: number
    estimatedDailyServings: number
    active?: boolean
    ingredients: DishIngredientLine[]
  }]
  cancel: []
}>()

const form = reactive({
  name: '',
  category: '',
  description: '',
  targetMarginRate: 0.72,
  estimatedDailyServings: 15,
  active: true,
  ingredients: [] as DishIngredientLine[]
})

const canSubmit = computed(() => {
  return props.ingredientOptions.length > 0
    && form.ingredients.length > 0
    && form.ingredients.every(line => line.ingredient && Number(line.quantity) > 0)
})

function createBlankLine(): DishIngredientLine {
  return {
    ingredient: props.ingredientOptions[0]?._id ?? '',
    quantity: 1,
    unit: 'kg'
  }
}

watchEffect(() => {
  form.name = props.initialValue?.name ?? ''
  form.category = props.initialValue?.category ?? ''
  form.description = props.initialValue?.description ?? ''
  form.targetMarginRate = props.initialValue?.targetMarginRate ?? 0.72
  form.estimatedDailyServings = props.initialValue?.estimatedDailyServings ?? 15
  form.active = props.initialValue?.active ?? true
  form.ingredients = props.initialValue?.ingredients?.map(line => ({ ...line })) ?? [createBlankLine()]
})

function addLine() {
  form.ingredients.push(createBlankLine())
}

function removeLine(index: number) {
  if (form.ingredients.length === 1) {
    form.ingredients[0] = createBlankLine()
    return
  }

  form.ingredients.splice(index, 1)
}

function submit() {
  if (!canSubmit.value) {
    return
  }

  emit('submit', {
    name: form.name,
    category: form.category,
    description: form.description,
    targetMarginRate: Number(form.targetMarginRate),
    estimatedDailyServings: Number(form.estimatedDailyServings),
    active: form.active,
    ingredients: form.ingredients.map(line => ({
      ingredient: line.ingredient,
      quantity: Number(line.quantity),
      unit: line.unit
    }))
  })
}
</script>

<template>
  <form
    class="grid gap-4"
    @submit.prevent="submit"
  >
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <input
        v-model="form.name"
        class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
        placeholder="Nom du plat"
        required
      >
      <input
        v-model="form.category"
        class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
        placeholder="Categorie"
        required
      >
      <input
        v-model="form.targetMarginRate"
        class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
        type="number"
        min="0"
        max="0.95"
        step="0.01"
        placeholder="Marge cible"
      >
      <input
        v-model="form.estimatedDailyServings"
        class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
        type="number"
        min="1"
        step="1"
        placeholder="Portions / jour"
      >
    </div>

    <textarea
      v-model="form.description"
      class="min-h-24 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
      placeholder="Description du plat"
    />

    <div class="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 class="font-medium">
            Composition
          </h3>
          <p class="mt-1 text-sm text-slate-500">
            Garde au moins une ligne d ingredient pour que le calcul de rentabilite fonctionne.
          </p>
        </div>
        <button
          type="button"
          class="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
          @click="addLine"
        >
          Ajouter une ligne
        </button>
      </div>

      <div class="space-y-3">
        <div
          v-for="(line, index) in form.ingredients"
          :key="index"
          class="grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr_auto]"
        >
          <select
            v-model="line.ingredient"
            class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
          >
            <option
              v-for="ingredient in ingredientOptions"
              :key="ingredient._id"
              :value="ingredient._id"
            >
              {{ ingredient.name }}
            </option>
          </select>
          <input
            v-model="line.quantity"
            class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
            type="number"
            min="0.01"
            step="0.01"
          >
          <select
            v-model="line.unit"
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
          <button
            type="button"
            class="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white"
            @click="removeLine(index)"
          >
            Retirer
          </button>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between">
      <label class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input
          v-model="form.active"
          type="checkbox"
        >
        Plat actif
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
        <button
          class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
          :disabled="!canSubmit"
        >
          {{ submitLabel }}
        </button>
      </div>
    </div>
  </form>
</template>

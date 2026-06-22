<script setup lang="ts">
import type { Dish, DishIngredientLine, Ingredient } from "~/types/business";

const props = withDefaults(
  defineProps<{
    ingredientOptions: Ingredient[];
    initialValue?: Partial<Dish> | null;
    submitLabel?: string;
    defaultMarginRate?: number;
  }>(),
  {
    initialValue: null,
    submitLabel: "Enregistrer le plat",
    defaultMarginRate: 0.72,
  },
);

const emit = defineEmits<{
  submit: [
    payload: {
      name: string;
      category: string;
      description?: string;
      targetMarginRate: number | null;
      actualPriceIncludingTax: number;
      estimatedDailyServings: number;
      active?: boolean;
      ingredients: DishIngredientLine[];
    },
  ];
  cancel: [];
}>();

const form = reactive({
  name: "",
  category: "",
  description: "",
  targetMarginRate: 0.72,
  actualPriceIncludingTax: 0,
  estimatedDailyServings: 15,
  active: true,
  ingredients: [] as DishIngredientLine[],
});

const useGlobalMargin = ref(true);

const canSubmit = computed(() => {
  return (
    props.ingredientOptions.length > 0 &&
    form.ingredients.length > 0 &&
    Number(form.actualPriceIncludingTax) >= 0 &&
    (useGlobalMargin.value ||
      (Number(form.targetMarginRate) >= 0 &&
        Number(form.targetMarginRate) <= 0.95)) &&
    form.ingredients.every(
      (line) => line.ingredient && Number(line.quantity) > 0,
    )
  );
});

function createBlankLine(): DishIngredientLine {
  return {
    ingredient: props.ingredientOptions[0]?._id ?? "",
    quantity: 1,
    unit: "kg",
  };
}

watchEffect(() => {
  form.name = props.initialValue?.name ?? "";
  form.category = props.initialValue?.category ?? "";
  form.description = props.initialValue?.description ?? "";
  useGlobalMargin.value = props.initialValue
    ? props.initialValue.targetMarginRate == null
    : true;
  form.targetMarginRate =
    props.initialValue?.targetMarginRate ?? props.defaultMarginRate;
  form.actualPriceIncludingTax =
    props.initialValue?.actualPriceIncludingTax ?? 0;
  form.estimatedDailyServings =
    props.initialValue?.estimatedDailyServings ?? 15;
  form.active = props.initialValue?.active ?? true;
  form.ingredients = props.initialValue?.ingredients?.map((line) => ({
    ...line,
  })) ?? [createBlankLine()];
});

const globalMarginLabel = computed(
  () => `${Math.round(props.defaultMarginRate * 100)}%`,
);

function addLine() {
  form.ingredients.push(createBlankLine());
}

function removeLine(index: number) {
  if (form.ingredients.length === 1) {
    form.ingredients[0] = createBlankLine();
    return;
  }

  form.ingredients.splice(index, 1);
}

function submit() {
  if (!canSubmit.value) {
    return;
  }

  emit("submit", {
    name: form.name,
    category: form.category,
    description: form.description,
    targetMarginRate: Number(form.targetMarginRate),
    actualPriceIncludingTax: Number(form.actualPriceIncludingTax),
    estimatedDailyServings: Number(form.estimatedDailyServings),
    active: form.active,
    ingredients: form.ingredients.map((line) => ({
      ingredient: line.ingredient,
      quantity: Number(line.quantity),
      unit: line.unit,
    })),
  });
  // reset the form fields after successful submit
  resetForm();
}

function resetForm() {
  form.name = "";
  form.category = "";
  form.description = "";
  form.targetMarginRate = props.defaultMarginRate;
  form.actualPriceIncludingTax = 0;
  form.estimatedDailyServings = 15;
  form.active = true;
  form.ingredients = [createBlankLine()];
  useGlobalMargin.value = true;
}

const fieldClass =
  "w-full bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm placeholder:text-[#40493e]/50 dark:placeholder:text-[#c0c9ba]/50 focus:outline-none focus:ring-2 focus:ring-[#feb236] transition";
const textareaClass =
  "w-full bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-2xl px-4 py-3 text-sm min-h-24 placeholder:text-[#40493e]/50 dark:placeholder:text-[#c0c9ba]/50 focus:outline-none focus:ring-2 focus:ring-[#feb236] transition";
const labelClass =
  "text-[10px] font-bold uppercase tracking-wide text-[#40493e]/70 dark:text-[#c0c9ba]/70";
const primaryBtn =
  "bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] font-bold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed";
const secondaryBtn =
  "border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white font-bold py-2.5 px-6 rounded-full hover:bg-[#f3f3f3] dark:hover:bg-[#2f3131] transition-all flex items-center gap-2";
const dangerBtn =
  "border border-[#ba1a1a]/40 text-[#ba1a1a] dark:text-[#ff897d] font-bold px-5 py-2.5 rounded-full hover:bg-[#ba1a1a]/10 transition-all";
</script>

<template>
  <form class="grid gap-4" @submit.prevent="submit">
    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div class="grid gap-1.5">
        <label for="name" :class="labelClass"> Nom du plat </label>
        <input
          v-model="form.name"
          id="name"
          :class="fieldClass"
          placeholder="Nom du plat"
          required
        />
      </div>
      <div class="grid gap-1.5">
        <label for="category" :class="labelClass">
          Catégorie
        </label>
        <input
          v-model="form.category"
          id="category"
          :class="fieldClass"
          placeholder="Categorie"
          required
        />
      </div>
      <div class="grid gap-1.5">
        <label for="estimatedDailyServings" :class="labelClass">
          Portions / jour
        </label>
        <input
          v-model.number="form.estimatedDailyServings"
          :class="fieldClass"
          type="number"
          min="1"
          step="1"
          id="estimatedDailyServings"
          placeholder="Portions / jour"
        />
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <div class="grid gap-1.5">
        <label for="targetMarginRate" :class="labelClass">
          Marge en %
        </label>
        <input
          id="targetMarginRate"
          v-model.number="form.targetMarginRate"
          :class="fieldClass"
          type="number"
          min="0"
          max="0.95"
          step="0.01"
          placeholder="Marge specifique"
        />
      </div>
      <div class="grid gap-1.5">
        <label for="actualPriceIncludingTax" :class="labelClass">
          Prix reel TTC
        </label>
        <input
          id="actualPriceIncludingTax"
          v-model.number="form.actualPriceIncludingTax"
          :class="fieldClass"
          type="number"
          min="0"
          step="0.01"
          placeholder="Prix reel TTC"
        />
      </div>
    </div>

    <textarea
      v-model="form.description"
      :class="textareaClass"
      placeholder="Description du plat"
    />

    <div class="rounded-3xl border border-[#c0c9ba]/20 dark:border-white/5 bg-[#f3f3f3] dark:bg-[#2f3131] p-5">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 class="font-bold text-[#1a1c1c] dark:text-white">Composition</h3>
          <p class="mt-1 text-sm text-[#40493e] dark:text-[#c0c9ba]">
            Garde au moins une ligne d ingredient pour que le calcul de
            rentabilite fonctionne.
          </p>
        </div>
        <button
          type="button"
          class="border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white font-bold px-4 py-2 rounded-full text-sm hover:bg-[#e8e8e8] dark:hover:bg-[#3a3d3d] transition-all"
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
            :class="fieldClass"
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
            v-model.number="line.quantity"
            :class="fieldClass"
            type="number"
            min="0.01"
            step="0.01"
          />
          <select
            v-model="line.unit"
            :class="fieldClass"
          >
            <option value="g">g</option>
            <option value="kg">kg</option>
            <option value="ml">ml</option>
            <option value="cl">cl</option>
            <option value="l">l</option>
            <option value="piece">piece</option>
          </select>
          <button type="button" :class="dangerBtn" @click="removeLine(index)">
            Retirer
          </button>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between gap-4 pt-2">
      <label
        class="flex items-center gap-2 text-sm font-medium text-[#40493e] dark:text-[#c0c9ba]"
      >
        <input v-model="form.active" type="checkbox" class="size-4 rounded accent-[#005013]" />
        Plat actif
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
        <button
          :class="primaryBtn"
          :disabled="!canSubmit"
        >
          {{ submitLabel }}
        </button>
      </div>
    </div>
  </form>
</template>

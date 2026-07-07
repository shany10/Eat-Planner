<script setup lang="ts">
import { getFetchErrorMessage } from "~/utils/fetch-error";
import AppModal from "~/components/common/AppModal.vue";
import EmptyStateCard from "~/components/common/EmptyStateCard.vue";
import DishForm from "~/components/dishes/DishForm.vue";
import DishTable from "~/components/dishes/DishTable.vue";
import type { Dish, DishIngredientLine } from "~/types/business";
import { useAuthStore } from "~/stores/auth";
import { useDishStore } from "~/stores/dishes";
import { useIngredientStore } from "~/stores/ingredients";

definePageMeta({
  middleware: "auth",
});

const authStore = useAuthStore();
const dishStore = useDishStore();
const ingredientStore = useIngredientStore();
const appToast = useAppToast();

const editingDish = ref<Dish | null>(null);
const dishModalOpen = ref(false);
const errorMessage = ref("");
const loading = ref(true);

const dishFilters = reactive({
  search: "",
  category: "all",
  status: "all",
  health: "all",
});

type DishPayload = {
  name: string;
  category: string;
  description?: string;
  targetMarginRate: number | null;
  actualPriceIncludingTax: number;
  estimatedDailyServings: number;
  active?: boolean;
  ingredients: DishIngredientLine[];
};

type PageStat = {
  title: string;
  value: string | number;
  hint: string;
};

const dishCount = computed(() => dishStore.items.length);
const activeDishCount = computed(
  () => dishStore.items.filter((item) => item.active).length,
);
const profitableDishCount = computed(
  () =>
    dishStore.items.filter(
      (item) => (item.profitability?.expectedGrossProfit || 0) > 0,
    ).length,
);
const estimatedDailyServings = computed(() =>
  dishStore.items.reduce((sum, item) => sum + item.estimatedDailyServings, 0),
);

const averageSuggestedPrice = computed(() => {
  if (dishCount.value === 0) {
    return 0;
  }

  return (
    dishStore.items.reduce(
      (sum, item) =>
        sum +
        (item.profitability?.suggestedPriceIncludingTax ||
          item.profitability?.suggestedPrice ||
          0),
      0,
    ) / dishCount.value
  );
});

const averageFoodCost = computed(() => {
  const pricedDishes = dishStore.items.filter((item) => item.profitability);
  if (pricedDishes.length === 0) {
    return 0;
  }

  return (
    pricedDishes.reduce(
      (sum, item) => sum + (item.profitability?.foodCost || 0),
      0,
    ) / pricedDishes.length
  );
});

const recipeCoverage = computed(() => {
  if (dishCount.value === 0) {
    return 0;
  }

  return Math.round(
    (dishStore.items.filter(
      (item) => (item.profitability?.lines?.length || 0) > 0,
    ).length /
      dishCount.value) *
      100,
  );
});

const topSuggestedDish = computed(
  () =>
    [...dishStore.items].sort(
      (a, b) =>
        (b.profitability?.suggestedPriceIncludingTax ||
          b.profitability?.suggestedPrice ||
          0) -
        (a.profitability?.suggestedPriceIncludingTax ||
          a.profitability?.suggestedPrice ||
          0),
    )[0] ?? null,
);

const dishCategoryOptions = computed(() =>
  [
    ...new Set(dishStore.items.map((item) => item.category).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "fr")),
);

const filteredDishes = computed(() => {
  const search = dishFilters.search.trim().toLowerCase();

  return dishStore.items.filter((item) => {
    const searchableText = [
      item.name,
      item.category,
      item.description,
      ...(item.profitability?.lines?.map((line) => line.ingredientName) ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = !search || searchableText.includes(search);
    const matchesCategory =
      dishFilters.category === "all" || item.category === dishFilters.category;
    const matchesStatus =
      dishFilters.status === "all" ||
      (dishFilters.status === "active" && item.active) ||
      (dishFilters.status === "inactive" && !item.active);
    const isProfitable = (item.profitability?.expectedGrossProfit || 0) > 0;
    const needsReview =
      !item.profitability ||
      !item.profitability.lines.length ||
      (item.profitability.priceGapIncludingTax ?? 0) < 0 ||
      !isProfitable;
    const matchesHealth =
      dishFilters.health === "all" ||
      (dishFilters.health === "profitable" && isProfitable) ||
      (dishFilters.health === "review" && needsReview);

    return matchesSearch && matchesCategory && matchesStatus && matchesHealth;
  });
});

const dishTableEmptyMessage = computed(() =>
  dishStore.items.length === 0
    ? "Aucun plat pour le moment. Cree une recette pour voir apparaitre le cout matiere, la part de charges et le prix conseille."
    : "Aucun plat ne correspond aux filtres actifs.",
);

const defaultMarginRate = computed(
  () => authStore.profile?.defaultMarginRate ?? 0.72,
);
const vatRate = computed(() => authStore.profile?.vatRate ?? 0.1);
const restaurantName = computed(
  () => authStore.profile?.restaurantName || "Mon restaurant",
);

const stats = computed<PageStat[]>(() => [
  {
    title: "Plats actifs",
    value: activeDishCount.value,
    hint: "Carte exploitable",
  },
  {
    title: "Plats rentables",
    value: profitableDishCount.value,
    hint: "Marge brute positive",
  },
  {
    title: "Prix conseille TTC moyen",
    value: formatCurrency(averageSuggestedPrice.value),
    hint: "Repere pricing rapide",
  },
  {
    title: "Portions / jour",
    value: estimatedDailyServings.value,
    hint: "Capacite estimee totale",
  },
]);

const pricingSignal = computed(() => {
  if (ingredientStore.items.length === 0) {
    return "Ajoute des ingredients pour debloquer la creation des recettes.";
  }

  if (dishCount.value === 0) {
    return "Compose les premiers plats pour faire apparaitre les prix conseilles.";
  }

  if (topSuggestedDish.value) {
    return `${topSuggestedDish.value.name} ressort actuellement comme le plat au prix conseille le plus haut.`;
  }

  return "La carte commence a raconter un niveau de prix coherent.";
});

async function loadPage() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const results = await Promise.allSettled([
      authStore.loadProfile(),
      dishStore.load(),
      ingredientStore.load(),
    ]);

    const firstFailure = results.find(result => result.status === "rejected");

    if (firstFailure?.status === "rejected") {
      errorMessage.value = getFetchErrorMessage(
        firstFailure.reason,
        "Impossible de charger tous les elements des plats",
      );
      appToast.error("Chargement partiel", errorMessage.value);
    }
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(
      error,
      "Impossible de charger les plats",
    );
    appToast.error("Chargement impossible", errorMessage.value);
  } finally {
    loading.value = false;
  }
}

async function saveDish(payload: DishPayload) {
  try {
    if (editingDish.value) {
      await dishStore.update(editingDish.value._id, payload);
      appToast.success("Plat mis a jour", `${payload.name} a ete modifie.`);
    } else {
      await dishStore.create(payload);
      appToast.success(
        "Plat ajoute",
        `${payload.name} est maintenant dans la carte.`,
      );
    }
    closeDishModal();
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(
      error,
      "Echec lors de l enregistrement du plat",
    );
    appToast.error("Enregistrement impossible", errorMessage.value);
  }
}

async function removeDish(item: Dish) {
  try {
    await dishStore.remove(item._id);
    appToast.success("Plat supprime", `${item.name} a ete retire de la carte.`);
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, "Suppression impossible");
    appToast.error("Suppression impossible", errorMessage.value);
  }
}

function openDishModal() {
  editingDish.value = null;
  dishModalOpen.value = true;
}

function editDish(item: Dish) {
  editingDish.value = item;
  dishModalOpen.value = true;
}

function closeDishModal() {
  dishModalOpen.value = false;
  editingDish.value = null;
}

function resetDishFilters() {
  dishFilters.search = "";
  dishFilters.category = "all";
  dishFilters.status = "all";
  dishFilters.health = "all";
}

function formatCurrency(value: number) {
  return `${value.toFixed(2)} EUR`;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

onMounted(loadPage);
</script>

<template>
  <div class="p-4 md:p-8 space-y-6 font-sans">
    <section>
      <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <span class="text-[10px] uppercase tracking-widest font-bold text-[#40493e]/60 dark:text-[#c0c9ba]">Carte rentable</span>
          <h1 class="text-3xl md:text-[32px] md:leading-10 font-bold text-[#1a1c1c] dark:text-[#f1f1f1] font-['Be_Vietnam_Pro',sans-serif]">
            Recettes et prix de vente
          </h1>
          <p class="text-[#40493e] dark:text-[#c0c9ba] text-sm mt-1">
            La table garde toute la largeur, les formulaires s ouvrent seulement au moment de creer ou modifier.
          </p>
        </div>

        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] font-bold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            :disabled="ingredientStore.items.length === 0"
            @click="openDishModal"
          >
            <UIcon name="i-lucide-plus" class="size-5" />
            Ajouter un plat
          </button>
          <NuxtLink
            to="/ingredients"
            class="border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white font-bold py-2.5 px-6 rounded-full hover:bg-[#f3f3f3] dark:hover:bg-[#2f3131] transition-all flex items-center gap-2"
          >
            <UIcon name="i-lucide-wheat" class="size-5" />
            Ingredients
          </NuxtLink>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 py-4">
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ activeDishCount }} plat(s) actif(s)</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ restaurantName }}</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ ingredientStore.items.length }} ingredient(s)</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">Marge {{ formatPercent(defaultMarginRate) }}</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">TVA {{ formatPercent(vatRate) }}</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ recipeCoverage }}% recettes</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ loading ? "Calcul en cours" : "Carte a jour" }}</span>
      </div>
    </section>

    <p
      v-if="errorMessage"
      class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ errorMessage }}
    </p>

    <template v-if="loading">
      <div class="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="index in 4"
          :key="index"
          class="h-32 animate-pulse rounded-[2.5rem] bg-slate-200 dark:bg-slate-800"
        />
      </div>
    </template>

    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          v-for="stat in stats"
          :key="stat.title"
          class="bg-[#f3f3f3] dark:bg-[#1a1c1c] p-6 rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5"
        >
          <span class="text-[10px] font-bold uppercase text-[#40493e]/70 dark:text-[#c0c9ba]/70">{{ stat.title }}</span>
          <div class="text-3xl font-black text-[#1a1c1c] dark:text-white my-1">{{ stat.value }}</div>
          <div class="text-xs text-[#40493e] dark:text-[#c0c9ba]">{{ stat.hint }}</div>
        </div>
      </div>

      <div class="bg-[#005013]/5 dark:bg-[#8ad986]/10 rounded-[2.5rem] p-6 border border-[#005013]/20 dark:border-[#8ad986]/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div class="flex items-center gap-4">
          <UIcon name="i-lucide-megaphone" class="text-[#005013] dark:text-[#8ad986] size-7 shrink-0" />
          <div>
            <span class="text-[10px] font-bold uppercase text-[#005013]/70 dark:text-[#8ad986]/70">Signal pricing</span>
            <p class="font-bold text-[#1a1c1c] dark:text-[#e2e2e2] mt-0.5">
              {{ pricingSignal }}
            </p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 shrink-0">
          <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[10px] font-bold rounded-full text-[#40493e] dark:text-[#c0c9ba]">Food cost {{ formatCurrency(averageFoodCost) }}</span>
          <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[10px] font-bold rounded-full text-[#40493e] dark:text-[#c0c9ba]">Prix TTC moyen {{ formatCurrency(averageSuggestedPrice) }}</span>
          <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[10px] font-bold rounded-full text-[#40493e] dark:text-[#c0c9ba]">{{ dishCount }} plat(s)</span>
        </div>
      </div>

      <EmptyStateCard
        v-if="ingredientStore.items.length === 0"
        eyebrow="Prerequis manquant"
        title="Impossible de creer un plat tant qu il n y a pas d ingredient."
        description="Ajoute au moins un ingredient dans la base pour pouvoir composer une recette et calculer le prix conseille."
        action-label="Ajouter des ingredients"
        action-to="/ingredients"
      />

      <section class="bg-white dark:bg-[#1a1c1c] rounded-[2.5rem] p-6 border border-[#c0c9ba]/20 dark:border-white/5 shadow-sm">
        <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/60">Filtres</span>
            <h4 class="font-bold text-[#1a1c1c] dark:text-white mt-1">Retrouver un plat rapidement</h4>
          </div>
          <span class="bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] px-3 py-1 rounded-full text-[10px] font-bold w-fit">{{ filteredDishes.length }} / {{ dishStore.items.length }} plat(s)</span>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
          <input
            v-model="dishFilters.search"
            class="bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
            type="search"
            placeholder="Rechercher nom, categorie, ingredient"
            aria-label="Rechercher un plat"
          />
          <select
            v-model="dishFilters.category"
            class="bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
            aria-label="Filtrer par categorie"
          >
            <option value="all">Toutes categories</option>
            <option
              v-for="category in dishCategoryOptions"
              :key="category"
              :value="category"
            >
              {{ category }}
            </option>
          </select>
          <select
            v-model="dishFilters.status"
            class="bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
            aria-label="Filtrer par statut"
          >
            <option value="all">Tous statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
          <select
            v-model="dishFilters.health"
            class="bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
            aria-label="Filtrer par rentabilite"
          >
            <option value="all">Tous niveaux</option>
            <option value="profitable">Rentables</option>
            <option value="review">A revoir</option>
          </select>
          <button
            type="button"
            class="border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white font-bold py-2.5 px-6 rounded-full hover:bg-[#f3f3f3] dark:hover:bg-[#2f3131] transition-all flex items-center justify-center gap-2"
            @click="resetDishFilters"
          >
            <UIcon name="i-lucide-rotate-ccw" class="size-4" />
            Reset
          </button>
        </div>
      </section>

      <div class="bg-white dark:bg-[#1a1c1c] rounded-[2.5rem] overflow-hidden border border-[#c0c9ba]/20 dark:border-white/5 shadow-sm">
        <div class="p-6 border-b border-[#c0c9ba]/20 dark:border-white/5 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center bg-[#f3f3f3]/50 dark:bg-[#2f3131]/50">
          <div>
            <span class="text-[10px] font-bold uppercase text-[#40493e]/60 dark:text-[#c0c9ba]/60">Table</span>
            <h4 class="font-bold text-[#1a1c1c] dark:text-white mt-1">Vue carte</h4>
          </div>
          <span class="bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] px-3 py-1 rounded-full text-[10px] font-bold w-fit">{{ filteredDishes.length }} plat(s)</span>
        </div>
        <div class="p-0">
          <DishTable
            :items="filteredDishes"
            :empty-message="dishTableEmptyMessage"
            @edit="editDish"
            @remove="removeDish"
          />
        </div>
      </div>
    </template>

    <AppModal
      :open="dishModalOpen"
      :title="editingDish ? 'Modifier plat' : 'Nouveau plat'"
      eyebrow="Formulaire"
      :description="
        editingDish
          ? 'Ajuste la recette, le prix ou les portions.'
          : 'Ajoute la recette sans perdre la table de vue.'
      "
      size="lg"
      variant="warm"
      @close="closeDishModal"
    >
      <DishForm
        :ingredient-options="ingredientStore.items"
        :initial-value="editingDish"
        :default-margin-rate="defaultMarginRate"
        :submit-label="
          editingDish ? 'Mettre a jour le plat' : 'Ajouter le plat'
        "
        @submit="saveDish"
        @cancel="closeDishModal"
      />
    </AppModal>
  </div>
</template>

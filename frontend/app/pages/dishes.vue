<script setup lang="ts">
import { getFetchErrorMessage } from "~/utils/fetch-error";
import AppModal from "~/components/common/AppModal.vue";
import EmptyStateCard from "~/components/common/EmptyStateCard.vue";
import StatCard from "~/components/common/StatCard.vue";
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
    await Promise.all([
      authStore.loadProfile(),
      dishStore.load(),
      ingredientStore.load(),
    ]);
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
  console.log("remove dish", item);
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
  <div class="space-y-5">
    <section class="app-page-header app-page-header--compact">
      <div
        class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
      >
        <div>
          <p class="app-eyebrow">Carte rentable</p>
          <h1 class="app-title mt-2">Recettes et prix de vente</h1>
          <p class="app-subtitle mt-2">
            La table garde toute la largeur, les formulaires s ouvrent seulement
            au moment de creer ou modifier.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="btn-primary"
            :disabled="ingredientStore.items.length === 0"
            @click="openDishModal"
          >
            <UIcon name="i-lucide-plus" class="size-4" />
            Ajouter un plat
          </button>
          <NuxtLink to="/ingredients" class="btn-secondary">
            Ingredients
          </NuxtLink>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <span class="app-pill">{{ activeDishCount }} plat(s) actif(s)</span>
        <span class="app-pill">{{ restaurantName }}</span>
        <span class="app-pill"
          >{{ ingredientStore.items.length }} ingredient(s)</span
        >
        <span class="app-pill"
          >Marge {{ formatPercent(defaultMarginRate) }}</span
        >
        <span class="app-pill">TVA {{ formatPercent(vatRate) }}</span>
        <span class="app-pill">{{ recipeCoverage }}% recettes</span>
        <span class="app-pill">{{
          loading ? "Calcul en cours" : "Carte a jour"
        }}</span>
      </div>
    </section>

    <p
      v-if="errorMessage"
      class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
    >
      {{ errorMessage }}
    </p>

    <template v-if="loading">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="index in 4"
          :key="index"
          class="h-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800"
        />
      </div>
    </template>

    <template v-else>
      <!-- <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          v-for="stat in stats"
          :key="stat.title"
          :title="stat.title"
          :value="stat.value"
          :hint="stat.hint"
        />
      </div> -->

      <!-- <div class="app-section">
        <div
          class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <p class="app-eyebrow">Signal pricing</p>
            <p class="app-section-title mt-1">
              {{ pricingSignal }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="app-pill"
              >Food cost {{ formatCurrency(averageFoodCost) }}</span
            >
            <span class="app-pill"
              >Prix TTC moyen {{ formatCurrency(averageSuggestedPrice) }}</span
            >
            <span class="app-pill">{{ dishCount }} plat(s)</span>
          </div>
        </div>
      </div> -->

      <EmptyStateCard
        v-if="ingredientStore.items.length === 0"
        eyebrow="Prerequis manquant"
        title="Impossible de creer un plat tant qu il n y a pas d ingredient."
        description="Ajoute au moins un ingredient dans la base pour pouvoir composer une recette et calculer le prix conseille."
        action-label="Ajouter des ingredients"
        action-to="/ingredients"
      />

      <section class="app-section">
        <div
          class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <p class="app-eyebrow">Filtres</p>
            <h2 class="app-section-title mt-1">Retrouver un plat rapidement</h2>
          </div>
          <span class="app-pill"
            >{{ filteredDishes.length }} /
            {{ dishStore.items.length }} plat(s)</span
          >
        </div>

        <div
          class="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto]"
        >
          <input
            v-model="dishFilters.search"
            class="app-input"
            type="search"
            placeholder="Rechercher nom, categorie, ingredient"
            aria-label="Rechercher un plat"
          />
          <select
            v-model="dishFilters.category"
            class="app-input"
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
            class="app-input"
            aria-label="Filtrer par statut"
          >
            <option value="all">Tous statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
          <select
            v-model="dishFilters.health"
            class="app-input"
            aria-label="Filtrer par rentabilite"
          >
            <option value="all">Tous niveaux</option>
            <option value="profitable">Rentables</option>
            <option value="review">A revoir</option>
          </select>
          <button type="button" class="btn-secondary" @click="resetDishFilters">
            <UIcon name="i-lucide-rotate-ccw" class="size-4" />
            Reset
          </button>
        </div>
      </section>

      <section class="app-section">
        <div class="mb-4 flex items-center justify-between gap-4">
          <div>
            <p class="app-eyebrow">Table</p>
            <h2 class="app-section-title mt-1">Vue carte</h2>
          </div>
          <span class="app-pill">{{ filteredDishes.length }} plat(s)</span>
        </div>
        <DishTable
          :items="filteredDishes"
          :empty-message="dishTableEmptyMessage"
          @edit="editDish"
          @remove="removeDish"
        />
      </section>
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

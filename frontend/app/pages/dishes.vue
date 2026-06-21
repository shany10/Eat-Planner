<script setup lang="ts">
import AppModal from "~/components/common/AppModal.vue";
import EmptyStateCard from "~/components/common/EmptyStateCard.vue";
import DishForm from "~/components/dishes/DishForm.vue";
import DishTable from "~/components/dishes/DishTable.vue";

definePageMeta({
  middleware: "auth",
});

const {
  authStore,
  dishStore,
  ingredientStore,
  loading,
  errorMessage,
  loadPage,
} = useDishPage();

const {
  editingDish,
  dishModalOpen,
  saveDish,
  removeDish,
  openDishModal,
  editDish,
  closeDishModal,
} = useDishActions(errorMessage);

const {
  activeDishCount,
  recipeCoverage,
} = useDishStats();

const {
  dishFilters,
  dishCategoryOptions,
  filteredDishes,
  dishTableEmptyMessage,
  resetDishFilters,
} = useDishFilters();

const defaultMarginRate = computed(
  () => authStore.profile?.defaultMarginRate ?? 0.72,
);
const vatRate = computed(() => authStore.profile?.vatRate ?? 0.1);
const restaurantName = computed(
  () => authStore.profile?.restaurantName || "Mon restaurant",
);

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

onMounted(loadPage);
</script>

<template>
  <div class="space-y-5">
    <section class="app-page-header app-page-header--compact">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="app-eyebrow">Carte rentable</p>
          <h1 class="app-title mt-2">Recettes et prix de vente</h1>
          <p class="app-subtitle mt-2">
            La table garde toute la largeur, les formulaires s ouvrent seulement
            au moment de creer ou modifier.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn-primary" :disabled="ingredientStore.items.length === 0"
            @click="openDishModal">
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
        <span class="app-pill">{{ ingredientStore.items.length }} ingredient(s)</span>
        <span class="app-pill">Marge {{ formatPercent(defaultMarginRate) }}</span>
        <span class="app-pill">TVA {{ formatPercent(vatRate) }}</span>
        <span class="app-pill">{{ recipeCoverage }}% recettes</span>
        <span class="app-pill">{{
          loading ? "Calcul en cours" : "Carte a jour"
          }}</span>
      </div>
    </section>

    <p v-if="errorMessage"
      class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
      {{ errorMessage }}
    </p>

    <template v-if="loading">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div v-for="index in 4" :key="index" class="h-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      </div>
    </template>

    <template v-else>
      <EmptyStateCard v-if="ingredientStore.items.length === 0" eyebrow="Prerequis manquant"
        title="Impossible de creer un plat tant qu il n y a pas d ingredient."
        description="Ajoute au moins un ingredient dans la base pour pouvoir composer une recette et calculer le prix conseille."
        action-label="Ajouter des ingredients" action-to="/ingredients" />

      <section class="app-section">
        <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="app-eyebrow">Filtres</p>
            <h2 class="app-section-title mt-1">Retrouver un plat rapidement</h2>
          </div>
          <span class="app-pill">{{ filteredDishes.length }} /
            {{ dishStore.items.length }} plat(s)</span>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
          <input v-model="dishFilters.search" class="app-input" type="search"
            placeholder="Rechercher nom, categorie, ingredient" aria-label="Rechercher un plat" />
          <select v-model="dishFilters.category" class="app-input" aria-label="Filtrer par categorie">
            <option value="all">Toutes categories</option>
            <option v-for="category in dishCategoryOptions" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
          <select v-model="dishFilters.status" class="app-input" aria-label="Filtrer par statut">
            <option value="all">Tous statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
          <select v-model="dishFilters.health" class="app-input" aria-label="Filtrer par rentabilite">
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
        <DishTable :items="filteredDishes" :empty-message="dishTableEmptyMessage" @edit="editDish"
          @remove="removeDish" />
      </section>
    </template>

    <AppModal :open="dishModalOpen" :title="editingDish ? 'Modifier plat' : 'Nouveau plat'" eyebrow="Formulaire"
      :description="editingDish
        ? 'Ajuste la recette, le prix ou les portions.'
        : 'Ajoute la recette sans perdre la table de vue.'
        " size="lg" @close="closeDishModal">
      <DishForm :ingredient-options="ingredientStore.items" :initial-value="editingDish"
        :default-margin-rate="defaultMarginRate" :submit-label="editingDish ? 'Mettre a jour le plat' : 'Ajouter le plat'
          " @submit="saveDish" @cancel="closeDishModal" />
    </AppModal>
  </div>
</template>

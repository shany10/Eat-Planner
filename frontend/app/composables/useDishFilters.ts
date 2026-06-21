import type { Dish } from "~/types/business";
import { useDishStore } from "~/stores/dishes";

export function useDishFilters() {
  const dishStore = useDishStore();

  const dishFilters = reactive({
    search: "",
    category: "all",
    status: "all",
    health: "all",
  });

  const dishCategoryOptions = computed((): string[] => {
    const categories = (dishStore.items as Dish[])
      .map((item) => item.category)
      .filter((c): c is string => Boolean(c));
    return Array.from(new Set(categories)).sort((a, b) =>
      a.localeCompare(b, "fr"),
    );
  });

  const filteredDishes = computed((): Dish[] => {
    const search = dishFilters.search.trim().toLowerCase();

    return (dishStore.items as Dish[]).filter((item) => {
      const searchableText = [
        item.name,
        item.category,
        item.description,
        ...(item.profitability?.lines?.map(
          (line: { ingredientName: string }) => line.ingredientName,
        ) ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search || searchableText.includes(search);
      const matchesCategory =
        dishFilters.category === "all" ||
        item.category === dishFilters.category;
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

  function resetDishFilters() {
    dishFilters.search = "";
    dishFilters.category = "all";
    dishFilters.status = "all";
    dishFilters.health = "all";
  }

  return {
    dishFilters,
    dishCategoryOptions,
    filteredDishes,
    dishTableEmptyMessage,
    resetDishFilters,
  };
}

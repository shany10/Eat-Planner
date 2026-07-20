import type { Dish } from '~/types/business'
import { useDishStore } from '~/stores/dishes'
import { useIngredientStore } from '~/stores/ingredients'

export function useDishStats() {
  const dishStore = useDishStore()
  const ingredientStore = useIngredientStore()

  const items = computed((): Dish[] => dishStore.items)

  const dishCount = computed(() => items.value.length)

  const activeDishCount = computed(
    () => items.value.filter((item: Dish) => item.active).length
  )

  const profitableDishCount = computed(
    () =>
      items.value.filter(
        (item: Dish) => (item.profitability?.expectedGrossProfit || 0) > 0
      ).length
  )

  const estimatedDailyServings = computed(() =>
    items.value.reduce(
      (sum: number, item: Dish) => sum + item.estimatedDailyServings,
      0
    )
  )

  const averageSuggestedPrice = computed(() => {
    if (dishCount.value === 0) {
      return 0
    }

    return (
      items.value.reduce(
        (sum: number, item: Dish) =>
          sum
          + (item.profitability?.suggestedPriceIncludingTax
            || item.profitability?.suggestedPrice
            || 0),
        0
      ) / dishCount.value
    )
  })

  const averageFoodCost = computed(() => {
    const pricedDishes = items.value.filter((item: Dish) => item.profitability)
    if (pricedDishes.length === 0) {
      return 0
    }

    return (
      pricedDishes.reduce(
        (sum: number, item: Dish) => sum + (item.profitability?.foodCost || 0),
        0
      ) / pricedDishes.length
    )
  })

  const recipeCoverage = computed(() => {
    if (dishCount.value === 0) {
      return 0
    }

    return Math.round(
      (items.value.filter(
        (item: Dish) => (item.profitability?.lines?.length || 0) > 0
      ).length
      / dishCount.value)
    * 100
    )
  })

  const topSuggestedDish = computed(
    () =>
      [...items.value].sort(
        (a: Dish, b: Dish) =>
          (b.profitability?.suggestedPriceIncludingTax
            || b.profitability?.suggestedPrice
            || 0)
          - (a.profitability?.suggestedPriceIncludingTax
            || a.profitability?.suggestedPrice
            || 0)
      )[0] ?? null
  )

  const pricingSignal = computed(() => {
    if (ingredientStore.items.length === 0) {
      return 'Ajoute des ingredients pour debloquer la creation des recettes.'
    }

    if (dishCount.value === 0) {
      return 'Compose les premiers plats pour faire apparaitre les prix conseilles.'
    }

    if (topSuggestedDish.value) {
      return `${topSuggestedDish.value.name} ressort actuellement comme le plat au prix conseille le plus haut.`
    }

    return 'La carte commence a raconter un niveau de prix coherent.'
  })

  return {
    dishCount,
    activeDishCount,
    profitableDishCount,
    estimatedDailyServings,
    averageSuggestedPrice,
    averageFoodCost,
    recipeCoverage,
    topSuggestedDish,
    pricingSignal
  }
}

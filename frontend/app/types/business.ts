export type Supplier = {
  _id: string
  name: string
  contactName?: string
  email?: string
  phone?: string
  notes?: string
  active: boolean
}

export type Ingredient = {
  _id: string
  name: string
  unit: 'g' | 'kg' | 'ml' | 'cl' | 'l' | 'piece'
  purchasePrice: number
  supplier?: Supplier | string | null
  active: boolean
}

export type DishIngredientLine = {
  ingredient: string
  quantity: number
  unit: Ingredient['unit']
}

export type DishProfitability = {
  dishId: string
  name: string
  category: string
  estimatedDailyServings: number
  targetMarginRate: number
  foodCost: number
  chargeCost: number
  totalCost: number
  suggestedPrice: number
  expectedGrossProfit: number
  lines: Array<{
    ingredientId: string
    ingredientName: string
    recipeQuantity: number
    recipeUnit: Ingredient['unit']
    purchaseUnit: Ingredient['unit']
    unitCost: number
    lineCost: number
  }>
}

export type Dish = {
  _id: string
  name: string
  category: string
  description?: string
  targetMarginRate: number
  estimatedDailyServings: number
  active: boolean
  ingredients: DishIngredientLine[]
  profitability?: DishProfitability
}

export type Charge = {
  _id: string
  name: string
  category: 'staff' | 'utilities' | 'rent' | 'equipment' | 'insurance' | 'subscriptions' | 'other'
  amount: number
  period: 'daily' | 'monthly'
  active: boolean
}

export type SaleItem = {
  dish: Dish | string
  quantity: number
  unitPrice: number
}

export type Sale = {
  _id: string
  serviceDate: string
  notes?: string
  totalAmount: number
  items: SaleItem[]
}

export type ForecastDish = {
  dishId: string
  dishName: string
  category: string
  recommendedQuantity: number
  baselineQuantity: number
  trend: 'up' | 'steady' | 'down'
  confidence: 'low' | 'medium' | 'high'
  historyDaysUsed: number
  weekdayAverage: number
  recentAverage: number
  longAverage: number
  suggestedPrice: number
  projectedRevenue: number
  projectedFoodCost: number
}

export type ForecastResponse = {
  targetDate: string
  dishes: ForecastDish[]
  ingredientNeeds: Array<{
    ingredientId: string
    ingredientName: string
    unit: string
    quantity: number
    estimatedCost: number
  }>
  totals: {
    totalProjectedRevenue: number
    totalProjectedPlates: number
    chargePerServing: number
  }
  alerts: Array<{
    dishId: string
    dishName: string
    message: string
  }>
}

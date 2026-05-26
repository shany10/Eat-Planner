export type Supplier = {
  _id: string
  owner?: string | null
  name: string
  contactName?: string
  email?: string
  phone?: string
  notes?: string
  active: boolean
}

export type Ingredient = {
  _id: string
  owner?: string | null
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
  targetMarginRate: number | null
  effectiveMarginRate: number
  marginSource: 'dish' | 'account' | 'system'
  vatRate: number
  foodCost: number
  chargeCost: number
  totalCost: number
  suggestedPriceExcludingTax: number
  suggestedVatAmount: number
  suggestedPriceIncludingTax: number
  actualPriceExcludingTax: number
  actualVatAmount: number
  actualPriceIncludingTax: number
  priceGapIncludingTax: number
  priceGapRate: number
  expectedMarginAmount: number
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
  owner?: string | null
  name: string
  category: string
  description?: string
  targetMarginRate: number | null
  actualPriceIncludingTax: number
  estimatedDailyServings: number
  active: boolean
  ingredients: DishIngredientLine[]
  profitability?: DishProfitability
}

export type Charge = {
  _id: string
  owner?: string | null
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
  owner?: string | null
  serviceDate: string
  notes?: string
  totalAmount: number
  items: SaleItem[]
}

export type ForecastDish = {
  dishId: string
  dishName: string
  category: string
  initialForecastQuantity: number
  recommendedQuantity: number
  baselineQuantity: number
  trend: 'up' | 'steady' | 'down'
  confidence: 'low' | 'medium' | 'high'
  historyDaysUsed: number
  weekdayAverage: number
  recentAverage: number
  longAverage: number
  suggestedPrice: number
  suggestedPriceIncludingTax?: number
  actualPriceIncludingTax?: number
  projectedRevenue: number
  projectedFoodCost: number
  comment?: string
  userCorrectionQuantity?: number | null
  correctionComment?: string
  correctedAt?: string | null
  correctedBy?: string | null
  actualQuantitySold?: number
  actualRevenue?: number
  productionGap?: number
}

export type ForecastResponse = {
  _id?: string
  persisted: boolean
  targetDate: string
  generatedAt?: string
  updatedAt?: string
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

export type SalesCsvImportResult = {
  importedRows: number
  createdSales: number
  skippedRows: number
  errors: string[]
}

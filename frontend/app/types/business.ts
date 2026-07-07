export type Supplier = {
  _id: string
  owner?: string | null
  name: string
  productTypes?: string[]
  deliveryLeadTimeDays?: number
  deliveryFee?: number
  minimumOrderAmount?: number
  contactName?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  portalUser?: string | null
  active: boolean
}

export type SupplierMessage = {
  _id: string
  supplier: Supplier | string
  owner?: string | null
  subject: string
  body: string
  direction?: 'outbound' | 'inbound'
  from?: string
  to: string
  status: 'sent' | 'failed'
  sentAt?: string | null
  errorMessage?: string
  created_at?: string
  updated_at?: string
}

export type BusinessUnit = 'g' | 'kg' | 'ml' | 'cl' | 'l' | 'piece' | 'carton' | 'sac' | 'bouteille' | 'barquette' | 'boite'

export type IngredientCategory
  = | 'Viandes'
    | 'Poissons'
    | 'Fruits et legumes'
    | 'Produits laitiers'
    | 'Epicerie seche'
    | 'Boissons'
    | 'Surgeles'
    | 'Boulangerie'
    | 'Condiments'
    | 'Produits d entretien'

export type Ingredient = {
  _id: string
  owner?: string | null
  name: string
  category: IngredientCategory
  unit: BusinessUnit
  orderUnit?: BusinessUnit
  purchasePrice: number
  stockQuantity: number
  minimumStock: number
  averageDailyUsage: number
  minimumOrderQuantity: number
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

export type PurchaseOrderStatus
  = | 'draft'
    | 'pending_validation'
    | 'validated'
    | 'pending_payment'
    | 'paid'
    | 'delivering'
    | 'delivered'
    | 'cancelled'
    | 'sent'
    | 'received'

export type PaymentMethod = 'bank_transfer' | 'payment_on_delivery' | 'purchase_order'

export type PurchaseOrderItem = {
  ingredient: Ingredient | string
  ingredientName: string
  category?: string
  supplier?: Supplier | string | null
  supplierName?: string
  quantity: number
  unit: Ingredient['unit']
  unitPrice: number
  stockQuantity?: number
  minimumStock?: number
  recommendedQuantity?: number
  lineTotal: number
}

export type PurchaseOrder = {
  _id: string
  orderNumber?: string
  owner?: string | null
  supplier: Supplier | string
  suppliers?: Supplier[] | string[]
  status: PurchaseOrderStatus
  requestedDeliveryDate?: string
  estimatedDeliveryDate?: string
  deliveryAddress?: string
  internalComment?: string
  notes?: string
  items: PurchaseOrderItem[]
  deliveryFee?: number
  vatRate?: number
  totalExclTax?: number
  vatAmount?: number
  totalInclTax?: number
  totalAmount: number
  paymentMethod?: PaymentMethod | ''
  paymentReference?: string
  paymentAccountHolder?: string
  paymentIbanLast4?: string
  paymentBic?: string
  paymentExecutionDate?: string
  paymentNote?: string
  paidAt?: string | null
  validatedAt?: string | null
  managementScoreDelta?: number
  badges?: string[]
  created_at?: string
  updated_at?: string
}

export type PurchaseRewards = {
  score: number
  level: string
  levelProgress: number
  badges: string[]
  tips: string[]
  lowStockCount: number
  paidOrderCount: number
}

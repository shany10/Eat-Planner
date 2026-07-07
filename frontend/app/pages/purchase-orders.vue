<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import StatCard from '~/components/common/StatCard.vue'
import type { Ingredient, PaymentMethod, PurchaseOrder, PurchaseOrderStatus, Supplier } from '~/types/business'
import { useIngredientStore } from '~/stores/ingredients'
import { usePurchaseOrderStore } from '~/stores/purchase-orders'
import { useSupplierStore } from '~/stores/suppliers'

definePageMeta({
  middleware: 'auth'
})

type PurchaseStep = 'forecast' | 'selection' | 'cart' | 'checkout' | 'payment' | 'confirmation' | 'history'

type CartLine = {
  ingredientId: string
  ingredientName: string
  category: Ingredient['category']
  supplierId: string
  supplierName: string
  unit: Ingredient['unit']
  orderUnit: Ingredient['unit']
  quantity: number
  unitPrice: number
  stockQuantity: number
  minimumStock: number
  averageDailyUsage: number
  minimumOrderQuantity: number
  recommendedQuantity: number
}

type ForecastLine = {
  ingredient: Ingredient
  supplierId: string
  supplierName: string
  forecastNeed: number
  recommendedQuantity: number
  projectedStock: number
  lowStock: boolean
}

type PageStat = {
  title: string
  value: string | number
  hint: string
}

const VAT_RATE = 0.1
const DEFAULT_DELIVERY_ADDRESS = 'Restaurant Eat Planner, 12 rue des Chefs, 75002 Paris'

const stepItems: Array<{ key: PurchaseStep, label: string, icon: string }> = [
  { key: 'forecast', label: 'Prevision', icon: 'i-lucide-chart-no-axes-combined' },
  { key: 'selection', label: 'Selection', icon: 'i-lucide-list-plus' },
  { key: 'cart', label: 'Panier', icon: 'i-lucide-shopping-cart' },
  { key: 'checkout', label: 'Validation', icon: 'i-lucide-clipboard-check' },
  { key: 'payment', label: 'Paiement', icon: 'i-lucide-credit-card' },
  { key: 'confirmation', label: 'Confirmation', icon: 'i-lucide-circle-check' },
  { key: 'history', label: 'Historique', icon: 'i-lucide-history' }
]

const statusOptions: PurchaseOrderStatus[] = [
  'draft',
  'pending_validation',
  'pending_payment',
  'paid',
  'delivering',
  'delivered',
  'cancelled'
]

const supplierStore = useSupplierStore()
const ingredientStore = useIngredientStore()
const purchaseOrderStore = usePurchaseOrderStore()
const appToast = useAppToast()

const loading = ref(true)
const errorMessage = ref('')
const activeStep = ref<PurchaseStep>('forecast')
const forecastHorizon = ref<3 | 7>(7)
const cartLines = ref<CartLine[]>([])
const deliveryAddress = ref(DEFAULT_DELIVERY_ADDRESS)
const internalComment = ref('')
const confirmedOrder = ref<PurchaseOrder | null>(null)
const sendingOrderEmailId = ref('')

const ingredientFilters = reactive({
  search: '',
  supplier: 'all',
  category: 'all',
  stock: 'all'
})

const orderFilters = reactive({
  search: '',
  supplier: 'all',
  status: 'all',
  period: 'all'
})

const paymentMethod = ref<PaymentMethod>('bank_transfer')
const paymentMethodLabel = computed(() => paymentMethod.value === 'bank_transfer' ? 'Virement bancaire' : 'Paiement fournisseur')
const paymentForm = reactive({
  accountHolder: '',
  iban: '',
  bic: '',
  reference: '',
  executionDate: new Date().toISOString().slice(0, 10),
  note: '',
  notifySupplier: true
})
const paymentErrors = ref<string[]>([])

const activeSuppliers = computed(() => supplierStore.items.filter(supplier => supplier.active))
const activeIngredients = computed(() => ingredientStore.items.filter(ingredient => ingredient.active))
const ingredientCategories = computed(() =>
  [...new Set(activeIngredients.value.map(ingredient => ingredient.category))]
)

const forecastLines = computed<ForecastLine[]>(() =>
  activeIngredients.value.map((ingredient) => {
    const recommendedQuantity = getRecommendedQuantity(ingredient, forecastHorizon.value)
    const forecastNeed = (ingredient.averageDailyUsage || 0) * forecastHorizon.value
    return {
      ingredient,
      supplierId: getIngredientSupplierId(ingredient),
      supplierName: getIngredientSupplierName(ingredient),
      forecastNeed,
      recommendedQuantity,
      projectedStock: Math.max(0, (ingredient.stockQuantity || 0) - forecastNeed),
      lowStock: (ingredient.stockQuantity || 0) <= (ingredient.minimumStock || 0)
    }
  })
)

const filteredForecastLines = computed(() => {
  const search = ingredientFilters.search.trim().toLowerCase()

  return forecastLines.value.filter((line) => {
    const searchableText = [
      line.ingredient.name,
      line.ingredient.category,
      line.supplierName,
      line.ingredient.unit
    ].filter(Boolean).join(' ').toLowerCase()

    const matchesSearch = !search || searchableText.includes(search)
    const matchesSupplier = ingredientFilters.supplier === 'all' || line.supplierId === ingredientFilters.supplier
    const matchesCategory = ingredientFilters.category === 'all' || line.ingredient.category === ingredientFilters.category
    const matchesStock = ingredientFilters.stock === 'all'
      || (ingredientFilters.stock === 'low' && line.recommendedQuantity > 0)
      || (ingredientFilters.stock === 'critical' && line.lowStock)

    return matchesSearch && matchesSupplier && matchesCategory && matchesStock
  })
})

const reorderLines = computed(() => forecastLines.value.filter(line => line.recommendedQuantity > 0))
const criticalLines = computed(() => forecastLines.value.filter(line => line.lowStock))
const forecastBudget = computed(() =>
  reorderLines.value.reduce((sum, line) => sum + line.recommendedQuantity * line.ingredient.purchasePrice, 0)
)

const cartSubtotal = computed(() =>
  cartLines.value.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
)

const selectedSuppliers = computed(() => {
  const supplierIds = [...new Set(cartLines.value.map(line => line.supplierId).filter(Boolean))]
  return supplierIds
    .map(id => supplierStore.items.find(supplier => supplier._id === id))
    .filter((supplier): supplier is Supplier => Boolean(supplier))
})

const deliveryFees = computed(() =>
  selectedSuppliers.value.reduce((sum, supplier) => sum + (supplier.deliveryFee || 0), 0)
)

const cartTotalExclTax = computed(() => roundMoney(cartSubtotal.value + deliveryFees.value))
const cartVatAmount = computed(() => roundMoney(cartTotalExclTax.value * VAT_RATE))
const cartTotalInclTax = computed(() => roundMoney(cartTotalExclTax.value + cartVatAmount.value))
const cartLineCount = computed(() => cartLines.value.length)
const primarySupplierId = computed(() => cartLines.value[0]?.supplierId || activeSuppliers.value[0]?._id || '')
const canCreateOrder = computed(() =>
  cartLines.value.length > 0
  && Boolean(primarySupplierId.value)
  && cartLines.value.every(line => line.quantity > 0 && line.unitPrice >= 0)
)

const supplierMinimumAlerts = computed(() =>
  selectedSuppliers.value
    .map((supplier) => {
      const amount = cartLines.value
        .filter(line => line.supplierId === supplier._id)
        .reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)

      return {
        supplier,
        amount,
        missing: Math.max(0, (supplier.minimumOrderAmount || 0) - amount)
      }
    })
    .filter(item => item.missing > 0)
)

const excessiveCartLines = computed(() =>
  cartLines.value.filter(line => line.recommendedQuantity > 0 && line.quantity > line.recommendedQuantity * 1.75)
)

const estimatedDeliveryDate = computed(() => {
  const maxLeadTime = selectedSuppliers.value.reduce((max, supplier) => Math.max(max, supplier.deliveryLeadTimeDays || 0), 0)
  return addDaysIso(maxLeadTime || 2)
})

const filteredOrders = computed(() => {
  const search = orderFilters.search.trim().toLowerCase()
  const now = Date.now()

  return purchaseOrderStore.items.filter((order) => {
    const orderDate = order.created_at ? new Date(order.created_at).getTime() : now
    const searchableText = [
      order.orderNumber,
      getOrderSupplierNames(order),
      order.status,
      order.internalComment,
      order.notes,
      ...order.items.map(item => item.ingredientName)
    ].filter(Boolean).join(' ').toLowerCase()

    const matchesSearch = !search || searchableText.includes(search)
    const matchesSupplier = orderFilters.supplier === 'all' || getOrderSupplierIds(order).includes(orderFilters.supplier)
    const matchesStatus = orderFilters.status === 'all' || order.status === orderFilters.status
    const matchesPeriod = orderFilters.period === 'all'
      || now - orderDate <= Number(orderFilters.period) * 24 * 60 * 60 * 1000

    return matchesSearch && matchesSupplier && matchesStatus && matchesPeriod
  })
})

const stats = computed<PageStat[]>(() => [
  { title: 'A reapprovisionner', value: reorderLines.value.length, hint: `${criticalLines.value.length} sous le seuil` },
  { title: 'Budget previsionnel', value: formatCurrency(forecastBudget.value), hint: `${forecastHorizon.value} jours de besoins` },
  { title: 'Panier TTC', value: formatCurrency(cartTotalInclTax.value), hint: `${cartLineCount.value} ligne(s)` },
  { title: 'Commandes payees', value: purchaseOrderStore.paidOrders.length, hint: purchaseOrderStore.rewards?.level || 'Score en attente' }
])

const rewards = computed(() => purchaseOrderStore.rewards)

async function loadPage() {
  loading.value = true
  errorMessage.value = ''

  try {
    await Promise.all([
      supplierStore.load(),
      ingredientStore.load(),
      purchaseOrderStore.load(),
      purchaseOrderStore.loadRewards()
    ])
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de charger le module achat')
    appToast.error('Chargement impossible', errorMessage.value)
  } finally {
    loading.value = false
  }
}

function roundMoney(value: number) {
  return Number(value.toFixed(2))
}

function addDaysIso(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function getIngredientSupplierId(item: Ingredient) {
  if (!item.supplier) {
    return ''
  }

  return typeof item.supplier === 'object' ? item.supplier._id : item.supplier
}

function getIngredientSupplierName(item: Ingredient) {
  if (!item.supplier) {
    return 'Sans fournisseur'
  }

  if (typeof item.supplier === 'object') {
    return item.supplier.name
  }

  return supplierStore.items.find(supplier => supplier._id === item.supplier)?.name ?? 'Fournisseur'
}

function getRecommendedQuantity(ingredient: Ingredient, days: number) {
  const need = (ingredient.averageDailyUsage || 0) * days + (ingredient.minimumStock || 0) - (ingredient.stockQuantity || 0)
  if (need <= 0) {
    return 0
  }

  return Math.max(Math.ceil(need), ingredient.minimumOrderQuantity || 0)
}

function addIngredientToCart(ingredient: Ingredient, quantity = getRecommendedQuantity(ingredient, forecastHorizon.value)) {
  const supplierId = getIngredientSupplierId(ingredient)
  if (!supplierId) {
    appToast.warning('Fournisseur manquant', `${ingredient.name} doit etre relie a un fournisseur avant commande.`)
    return
  }

  const safeQuantity = Math.max(quantity || ingredient.minimumOrderQuantity || 1, ingredient.minimumOrderQuantity || 0.01)
  const existing = cartLines.value.find(line => line.ingredientId === ingredient._id)

  if (existing) {
    existing.quantity = roundMoney(existing.quantity + safeQuantity)
    return
  }

  cartLines.value.push({
    ingredientId: ingredient._id,
    ingredientName: ingredient.name,
    category: ingredient.category,
    supplierId,
    supplierName: getIngredientSupplierName(ingredient),
    unit: ingredient.unit,
    orderUnit: ingredient.orderUnit || ingredient.unit,
    quantity: roundMoney(safeQuantity),
    unitPrice: ingredient.purchasePrice,
    stockQuantity: ingredient.stockQuantity || 0,
    minimumStock: ingredient.minimumStock || 0,
    averageDailyUsage: ingredient.averageDailyUsage || 0,
    minimumOrderQuantity: ingredient.minimumOrderQuantity || 0,
    recommendedQuantity: getRecommendedQuantity(ingredient, forecastHorizon.value)
  })
}

function addReplenishmentLines(criticalOnly = false) {
  const candidates = forecastLines.value.filter(line =>
    line.recommendedQuantity > 0 && (!criticalOnly || line.lowStock)
  )

  candidates.forEach(line => addIngredientToCart(line.ingredient, line.recommendedQuantity))
  activeStep.value = 'cart'
  appToast.success('Panier mis a jour', `${candidates.length} ingredient(s) ajoute(s) avec les quantites recommandees.`)
}

function applyRecommendedQuantities() {
  cartLines.value.forEach((line) => {
    if (line.recommendedQuantity > 0) {
      line.quantity = line.recommendedQuantity
    }
  })
  appToast.info('Quantites recalees', 'Le panier suit maintenant les recommandations de prevision.')
}

function removeCartLine(ingredientId: string) {
  cartLines.value = cartLines.value.filter(line => line.ingredientId !== ingredientId)
}

function clearCart() {
  cartLines.value = []
  internalComment.value = ''
  paymentErrors.value = []
}

function prepareBankTransferForm(order: PurchaseOrder) {
  paymentMethod.value = 'bank_transfer'
  paymentForm.reference = order.paymentReference || `VIR-${order.orderNumber || order._id}`
  paymentForm.accountHolder = order.paymentAccountHolder || getOrderSupplierNames(order)
  paymentForm.bic = order.paymentBic || paymentForm.bic
  paymentForm.executionDate = order.paymentExecutionDate || new Date().toISOString().slice(0, 10)
  paymentForm.note = order.paymentNote || paymentForm.note
}

function buildOrderPayload(status: PurchaseOrderStatus) {
  return {
    supplier: primarySupplierId.value,
    deliveryAddress: deliveryAddress.value,
    internalComment: internalComment.value,
    estimatedDeliveryDate: estimatedDeliveryDate.value,
    notes: internalComment.value,
    status,
    vatRate: VAT_RATE,
    items: cartLines.value.map(line => ({
      ingredient: line.ingredientId,
      quantity: Number(line.quantity),
      unit: line.unit,
      unitPrice: Number(line.unitPrice),
      recommendedQuantity: line.recommendedQuantity
    }))
  }
}

async function saveDraftOrder() {
  if (!canCreateOrder.value) {
    return
  }

  try {
    const order = await purchaseOrderStore.create(buildOrderPayload('draft'))
    confirmedOrder.value = order
    activeStep.value = 'history'
    appToast.success('Brouillon sauvegarde', `Commande ${order.orderNumber || ''} conservee dans l historique.`)
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de sauvegarder le panier')
    appToast.error('Sauvegarde impossible', errorMessage.value)
  }
}

async function validateOrder() {
  if (!canCreateOrder.value) {
    return
  }

  try {
    const order = await purchaseOrderStore.create(buildOrderPayload('pending_payment'))
    confirmedOrder.value = order
    prepareBankTransferForm(order)
    activeStep.value = 'payment'
    appToast.success('Commande validee', `Commande ${order.orderNumber || ''} en attente de virement fournisseur.`)
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de valider la commande')
    appToast.error('Validation impossible', errorMessage.value)
  }
}

function validateBankTransferFields() {
  const missing = [
    ['Titulaire beneficiaire', paymentForm.accountHolder],
    ['IBAN fournisseur', paymentForm.iban],
    ['Date execution', paymentForm.executionDate]
  ].filter(([, value]) => !String(value || '').trim())

  paymentErrors.value = missing.map(([label]) => `${label} requis`)

  const cleanIban = paymentForm.iban.replace(/\s+/g, '')
  if (cleanIban && !/^[A-Za-z]{2}[0-9A-Za-z]{12,32}$/.test(cleanIban)) {
    paymentErrors.value.push('IBAN invalide')
  }

  if (paymentForm.bic.trim() && !/^[A-Za-z0-9]{8,11}$/.test(paymentForm.bic.trim())) {
    paymentErrors.value.push('BIC invalide')
  }

  return paymentErrors.value.length === 0
}

async function submitBankTransferPayment() {
  if (!confirmedOrder.value || !validateBankTransferFields()) {
    return
  }

  try {
    const result = await purchaseOrderStore.payByBankTransfer(confirmedOrder.value._id, {
      accountHolder: paymentForm.accountHolder,
      iban: paymentForm.iban,
      bic: paymentForm.bic,
      reference: paymentForm.reference,
      executionDate: paymentForm.executionDate,
      note: paymentForm.note,
      notifySupplier: paymentForm.notifySupplier
    })
    const order = result.order
    confirmedOrder.value = order
    clearCart()
    activeStep.value = 'confirmation'
    const notificationLabel = result.sent.length > 0
      ? `${result.sent.length} confirmation(s) envoyee(s) au fournisseur.`
      : 'Aucun email fournisseur configure, paiement trace en interne.'
    appToast.success('Virement confirme', `${order.orderNumber || ''} marquee payee. ${notificationLabel}`)
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de confirmer le virement')
    appToast.error('Virement refuse', errorMessage.value)
  }
}

async function updateOrderStatus(order: PurchaseOrder, status: PurchaseOrderStatus) {
  try {
    await purchaseOrderStore.updateStatus(order._id, status)
    appToast.success('Statut mis a jour', `Commande ${order.orderNumber || ''}: ${getStatusLabel(status)}.`)
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de changer le statut')
    appToast.error('Mise a jour impossible', errorMessage.value)
  }
}

async function sendSupplierEmail(order: PurchaseOrder) {
  sendingOrderEmailId.value = order._id
  try {
    const result = await purchaseOrderStore.sendSupplierEmail(order._id)
    if (confirmedOrder.value?._id === order._id) {
      confirmedOrder.value = result.order
    }
    appToast.success('Email fournisseur envoye', `${result.sent.length} message(s) visible(s) dans Mailpit.`)
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible d envoyer le mail fournisseur')
    appToast.error('Envoi impossible', errorMessage.value)
  } finally {
    sendingOrderEmailId.value = ''
  }
}

function payExistingOrder(order: PurchaseOrder) {
  confirmedOrder.value = order
  prepareBankTransferForm(order)
  activeStep.value = 'payment'
}

async function removeOrder(order: PurchaseOrder) {
  try {
    await purchaseOrderStore.remove(order._id)
    appToast.success('Commande supprimee', `Commande ${order.orderNumber || ''} retiree.`)
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de supprimer la commande')
    appToast.error('Suppression impossible', errorMessage.value)
  }
}

function resetIngredientFilters() {
  ingredientFilters.search = ''
  ingredientFilters.supplier = 'all'
  ingredientFilters.category = 'all'
  ingredientFilters.stock = 'all'
}

function resetOrderFilters() {
  orderFilters.search = ''
  orderFilters.supplier = 'all'
  orderFilters.status = 'all'
  orderFilters.period = 'all'
}

function getOrderSupplierIds(order: PurchaseOrder) {
  const ids = (order.suppliers || [])
    .map(supplier => typeof supplier === 'object' ? supplier._id : supplier)
    .filter(Boolean)

  if (ids.length > 0) {
    return ids
  }

  return [typeof order.supplier === 'object' ? order.supplier._id : order.supplier]
}

function getOrderSupplierNames(order: PurchaseOrder) {
  const names = (order.suppliers || [])
    .map(supplier => typeof supplier === 'object' ? supplier.name : supplierStore.items.find(item => item._id === supplier)?.name)
    .filter(Boolean)

  if (names.length > 0) {
    return names.join(', ')
  }

  return typeof order.supplier === 'object' ? order.supplier.name : order.supplier
}

function getOrderSupplierEmails(order: PurchaseOrder) {
  const suppliers = (order.suppliers?.length ? order.suppliers : [order.supplier])

  return suppliers
    .map(supplier => typeof supplier === 'object' ? supplier.email : '')
    .filter((email): email is string => Boolean(email))
}

function canSendSupplierEmail(order: PurchaseOrder) {
  return getOrderSupplierEmails(order).length > 0 && !['cancelled', 'delivered', 'received'].includes(order.status)
}

function isSendingSupplierEmail(order: PurchaseOrder) {
  return sendingOrderEmailId.value === order._id
}

function getStatusLabel(status: PurchaseOrderStatus) {
  const labels: Record<PurchaseOrderStatus, string> = {
    draft: 'Brouillon',
    pending_validation: 'En attente de validation',
    validated: 'Validee',
    pending_payment: 'En attente de paiement',
    paid: 'Payee',
    delivering: 'En cours de livraison',
    delivered: 'Livree',
    cancelled: 'Annulee',
    sent: 'Envoyee',
    received: 'Receptionnee'
  }

  return labels[status]
}

function getStatusClass(status: PurchaseOrderStatus) {
  if (status === 'paid' || status === 'delivered' || status === 'received') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
  }

  if (status === 'pending_payment' || status === 'delivering' || status === 'sent') {
    return 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200'
  }

  if (status === 'cancelled') {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
  }

  return 'border-[#c0c9ba]/30 bg-[#f3f3f3] text-[#1a1c1c] dark:border-white/10 dark:bg-[#1a1c1c] dark:text-white'
}

function formatCurrency(value: number) {
  return `${Number(value || 0).toFixed(2)} EUR`
}

function formatQuantity(value: number, unit: Ingredient['unit']) {
  return `${Number(value || 0).toFixed(value % 1 === 0 ? 0 : 1)} ${unit}`
}

function formatDate(value?: string | null) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value))
}

onMounted(loadPage)
</script>

<template>
  <div class="space-y-5">
    <section class="app-page-header app-page-header--compact">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="app-eyebrow">
            Achats fournisseur
          </p>
          <h1 class="app-title mt-2">
            Panier manager restaurant
          </h1>
          <p class="app-subtitle mt-2">
            Un parcours achat adapte au stock restaurant: prevision, panier fournisseur, validation, virement et confirmation fournisseur.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="btn-primary"
            @click="addReplenishmentLines(true)"
          >
            <UIcon
              name="i-lucide-wand-sparkles"
              class="size-4"
            />
            Ajouter stock bas
          </button>
          <NuxtLink
            to="/suppliers"
            class="btn-secondary"
          >
            <UIcon
              name="i-lucide-truck"
              class="size-4"
            />
            Fournisseurs
          </NuxtLink>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <span class="app-pill">{{ activeSuppliers.length }} fournisseur(s)</span>
        <span class="app-pill">{{ activeIngredients.length }} ingredient(s)</span>
        <span class="app-pill">{{ reorderLines.length }} a commander</span>
        <span class="app-pill">{{ loading ? 'Synchronisation' : 'Achats a jour' }}</span>
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
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          v-for="stat in stats"
          :key="stat.title"
          :title="stat.title"
          :value="stat.value"
          :hint="stat.hint"
        />
      </div>

      <section class="grid gap-4 xl:grid-cols-[1fr_0.48fr]">
        <div class="app-section">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="step in stepItems"
              :key="step.key"
              type="button"
              class="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition"
              :class="activeStep === step.key
                ? 'border-[#feb236] bg-[#feb236] text-[#6d4700] dark:border-[#feb236] dark:bg-[#feb236] dark:text-[#6d4700]'
                : 'border-[#c0c9ba]/30 bg-white text-[#40493e] hover:bg-[#f3f3f3] dark:border-white/10 dark:bg-[#2f3131] dark:text-[#c0c9ba] dark:hover:bg-[#3a3d3d]'"
              @click="activeStep = step.key"
            >
              <UIcon
                :name="step.icon"
                class="size-4"
              />
              {{ step.label }}
            </button>
          </div>
        </div>

        <div class="app-section">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="app-eyebrow">
                Score achats
              </p>
              <h2 class="app-section-title mt-1">
                {{ rewards?.level || 'Gestion debutante' }}
              </h2>
            </div>
            <span class="app-pill">{{ rewards?.score || 0 }} pts</span>
          </div>
          <div class="mt-3 h-2 overflow-hidden rounded-full bg-[#e8e8e8] dark:bg-[#2f3131]">
            <div
              class="h-full rounded-full bg-[linear-gradient(90deg,#feb236,#005013)]"
              :style="{ width: `${rewards?.levelProgress || 0}%` }"
            />
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="badge in rewards?.badges || []"
              :key="badge"
              class="app-pill"
            >
              {{ badge }}
            </span>
            <span
              v-if="!rewards?.badges?.length"
              class="app-pill"
            >
              Premier badge a debloquer
            </span>
          </div>
        </div>
      </section>

      <section
        v-if="activeStep === 'forecast'"
        class="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]"
      >
        <div class="app-section">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p class="app-eyebrow">
                Prevision des besoins
              </p>
              <h2 class="app-section-title mt-1">
                Quantites recommandees avant achat
              </h2>
              <p class="mt-2 text-sm leading-6 text-[#40493e] dark:text-[#c0c9ba]">
                La recommandation calcule: consommation moyenne par jour x horizon + seuil minimum - stock actuel. Le minimum de commande fournisseur est applique si besoin.
              </p>
            </div>
            <div class="flex rounded-md border border-[#c0c9ba]/30 p-1 dark:border-white/10">
              <button
                type="button"
                class="rounded px-3 py-1.5 text-sm font-semibold"
                :class="forecastHorizon === 3 ? 'bg-[#feb236] text-[#6d4700] dark:bg-[#feb236] dark:text-[#6d4700]' : 'text-[#40493e] dark:text-[#c0c9ba]'"
                @click="forecastHorizon = 3"
              >
                3 jours
              </button>
              <button
                type="button"
                class="rounded px-3 py-1.5 text-sm font-semibold"
                :class="forecastHorizon === 7 ? 'bg-[#feb236] text-[#6d4700] dark:bg-[#feb236] dark:text-[#6d4700]' : 'text-[#40493e] dark:text-[#c0c9ba]'"
                @click="forecastHorizon = 7"
              >
                7 jours
              </button>
            </div>
          </div>

          <div class="mt-4 grid gap-3 md:grid-cols-4">
            <div class="app-inset">
              <p class="text-xs font-semibold uppercase text-[#40493e] dark:text-[#c0c9ba]">
                Stock bas
              </p>
              <p class="mt-1 text-2xl font-bold text-[#1a1c1c] dark:text-white">
                {{ criticalLines.length }}
              </p>
            </div>
            <div class="app-inset">
              <p class="text-xs font-semibold uppercase text-[#40493e] dark:text-[#c0c9ba]">
                A commander
              </p>
              <p class="mt-1 text-2xl font-bold text-[#1a1c1c] dark:text-white">
                {{ reorderLines.length }}
              </p>
            </div>
            <div class="app-inset md:col-span-2">
              <p class="text-xs font-semibold uppercase text-[#40493e] dark:text-[#c0c9ba]">
                Budget recommande
              </p>
              <p class="mt-1 text-2xl font-bold text-[#1a1c1c] dark:text-white">
                {{ formatCurrency(forecastBudget) }}
              </p>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              class="btn-primary"
              @click="addReplenishmentLines(false)"
            >
              Commander les quantites recommandees
            </button>
            <button
              type="button"
              class="btn-secondary"
              @click="addReplenishmentLines(true)"
            >
              Ajouter les ingredients critiques
            </button>
          </div>
        </div>

        <div class="app-section">
          <p class="app-eyebrow">
            Conseils manager
          </p>
          <h2 class="app-section-title mt-1">
            Lecture simple des donnees
          </h2>
          <div class="mt-4 grid gap-3">
            <div
              v-for="tip in rewards?.tips || []"
              :key="tip"
              class="app-inset"
            >
              <p class="text-sm leading-6 text-[#1a1c1c] dark:text-white">
                {{ tip }}
              </p>
            </div>
            <div class="app-inset">
              <p class="text-sm leading-6 text-[#1a1c1c] dark:text-white">
                Exemple: 5 kg/jour de farine sur 7 jours = 35 kg. Si le stock est a 18 kg et le seuil a 20 kg, le panier recommande environ 37 kg, puis respecte le minimum fournisseur.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        v-if="activeStep === 'selection'"
        class="app-section"
      >
        <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="app-eyebrow">
              Catalogue fournisseur
            </p>
            <h2 class="app-section-title mt-1">
              Ingredients disponibles a l achat
            </h2>
          </div>
          <span class="app-pill">{{ filteredForecastLines.length }} / {{ forecastLines.length }} ligne(s)</span>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
          <input
            v-model="ingredientFilters.search"
            class="app-input"
            type="search"
            placeholder="Rechercher ingredient, categorie, fournisseur"
            aria-label="Rechercher un ingredient"
          >
          <select
            v-model="ingredientFilters.supplier"
            class="app-input"
            aria-label="Filtrer par fournisseur"
          >
            <option value="all">
              Tous fournisseurs
            </option>
            <option
              v-for="supplier in activeSuppliers"
              :key="supplier._id"
              :value="supplier._id"
            >
              {{ supplier.name }}
            </option>
          </select>
          <select
            v-model="ingredientFilters.category"
            class="app-input"
            aria-label="Filtrer par categorie"
          >
            <option value="all">
              Toutes categories
            </option>
            <option
              v-for="category in ingredientCategories"
              :key="category"
              :value="category"
            >
              {{ category }}
            </option>
          </select>
          <select
            v-model="ingredientFilters.stock"
            class="app-input"
            aria-label="Filtrer par besoin"
          >
            <option value="all">
              Tous besoins
            </option>
            <option value="low">
              Avec quantite recommandee
            </option>
            <option value="critical">
              Stock sous seuil
            </option>
          </select>
          <button
            type="button"
            class="btn-secondary"
            @click="resetIngredientFilters"
          >
            Reset
          </button>
        </div>

        <div class="mt-4 overflow-x-auto rounded-lg border border-[#c0c9ba]/30 dark:border-white/10">
          <table class="min-w-full divide-y divide-[#c0c9ba]/30 text-sm dark:divide-white/10">
            <thead class="bg-[#f3f3f3] dark:bg-[#2f3131]/60">
              <tr>
                <th class="px-3 py-2 text-left font-medium text-[#40493e]">
                  Ingredient
                </th>
                <th class="px-3 py-2 text-left font-medium text-[#40493e]">
                  Fournisseur
                </th>
                <th class="px-3 py-2 text-left font-medium text-[#40493e]">
                  Stock
                </th>
                <th class="px-3 py-2 text-left font-medium text-[#40493e]">
                  Besoin {{ forecastHorizon }}j
                </th>
                <th class="px-3 py-2 text-left font-medium text-[#40493e]">
                  Recommande
                </th>
                <th class="px-3 py-2 text-right font-medium text-[#40493e]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#c0c9ba]/30 bg-white dark:divide-white/10 dark:bg-[#1a1c1c]">
              <tr
                v-for="line in filteredForecastLines"
                :key="line.ingredient._id"
              >
                <td class="px-3 py-3">
                  <p class="font-semibold text-[#1a1c1c] dark:text-white">
                    {{ line.ingredient.name }}
                  </p>
                  <p class="text-xs text-[#40493e] dark:text-[#c0c9ba]">
                    {{ line.ingredient.category }} - {{ formatCurrency(line.ingredient.purchasePrice) }} / {{ line.ingredient.unit }}
                  </p>
                </td>
                <td class="px-3 py-3 text-[#1a1c1c] dark:text-white">
                  {{ line.supplierName }}
                </td>
                <td
                  class="px-3 py-3 font-medium"
                  :class="line.lowStock ? 'text-amber-700 dark:text-amber-300' : 'text-[#1a1c1c] dark:text-white'"
                >
                  {{ formatQuantity(line.ingredient.stockQuantity, line.ingredient.unit) }}
                  <span class="block text-xs font-normal text-[#40493e] dark:text-[#c0c9ba]">
                    seuil {{ formatQuantity(line.ingredient.minimumStock, line.ingredient.unit) }}
                  </span>
                </td>
                <td class="px-3 py-3">
                  {{ formatQuantity(line.forecastNeed, line.ingredient.unit) }}
                </td>
                <td class="px-3 py-3 font-semibold text-[#1a1c1c] dark:text-white">
                  {{ formatQuantity(line.recommendedQuantity, line.ingredient.unit) }}
                </td>
                <td class="px-3 py-3 text-right">
                  <button
                    type="button"
                    class="btn-secondary px-3 py-1.5"
                    @click="addIngredientToCart(line.ingredient, line.recommendedQuantity)"
                  >
                    <UIcon
                      name="i-lucide-plus"
                      class="size-4"
                    />
                    Ajouter
                  </button>
                </td>
              </tr>
              <tr v-if="filteredForecastLines.length === 0">
                <td
                  colspan="6"
                  class="px-3 py-8 text-center text-sm text-[#40493e] dark:text-[#c0c9ba]"
                >
                  Aucun ingredient ne correspond aux filtres.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section
        v-if="activeStep === 'cart'"
        class="grid gap-4 xl:grid-cols-[1fr_0.36fr]"
      >
        <div class="app-section">
          <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p class="app-eyebrow">
                Panier fournisseur
              </p>
              <h2 class="app-section-title mt-1">
                Commande d approvisionnement
              </h2>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="btn-secondary"
                :disabled="cartLines.length === 0"
                @click="applyRecommendedQuantities"
              >
                Recaler sur recommande
              </button>
              <button
                type="button"
                class="btn-secondary"
                :disabled="cartLines.length === 0"
                @click="clearCart"
              >
                Vider
              </button>
            </div>
          </div>

          <div class="overflow-x-auto rounded-lg border border-[#c0c9ba]/30 dark:border-white/10">
            <table class="min-w-full divide-y divide-[#c0c9ba]/30 text-sm dark:divide-white/10">
              <thead class="bg-[#f3f3f3] dark:bg-[#2f3131]/60">
                <tr>
                  <th class="px-3 py-2 text-left font-medium text-[#40493e]">
                    Ingredient
                  </th>
                  <th class="px-3 py-2 text-left font-medium text-[#40493e]">
                    Fournisseur
                  </th>
                  <th class="px-3 py-2 text-left font-medium text-[#40493e]">
                    Stock / seuil
                  </th>
                  <th class="px-3 py-2 text-left font-medium text-[#40493e]">
                    Reco
                  </th>
                  <th class="px-3 py-2 text-left font-medium text-[#40493e]">
                    Quantite
                  </th>
                  <th class="px-3 py-2 text-left font-medium text-[#40493e]">
                    Prix
                  </th>
                  <th class="px-3 py-2 text-right font-medium text-[#40493e]">
                    Total
                  </th>
                  <th class="px-3 py-2 text-right font-medium text-[#40493e]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#c0c9ba]/30 bg-white dark:divide-white/10 dark:bg-[#1a1c1c]">
                <tr
                  v-for="line in cartLines"
                  :key="line.ingredientId"
                >
                  <td class="px-3 py-3">
                    <p class="font-semibold text-[#1a1c1c] dark:text-white">
                      {{ line.ingredientName }}
                    </p>
                    <p class="text-xs text-[#40493e] dark:text-[#c0c9ba]">
                      {{ line.category }} - {{ line.orderUnit }}
                    </p>
                  </td>
                  <td class="px-3 py-3 text-[#1a1c1c] dark:text-white">
                    {{ line.supplierName }}
                  </td>
                  <td class="px-3 py-3">
                    <span
                      class="font-medium"
                      :class="line.stockQuantity <= line.minimumStock ? 'text-amber-700 dark:text-amber-300' : 'text-[#1a1c1c] dark:text-white'"
                    >
                      {{ formatQuantity(line.stockQuantity, line.unit) }}
                    </span>
                    <span class="block text-xs text-[#40493e] dark:text-[#c0c9ba]">
                      seuil {{ formatQuantity(line.minimumStock, line.unit) }}
                    </span>
                  </td>
                  <td class="px-3 py-3 font-semibold text-[#1a1c1c] dark:text-white">
                    {{ formatQuantity(line.recommendedQuantity, line.unit) }}
                  </td>
                  <td class="px-3 py-3">
                    <input
                      v-model.number="line.quantity"
                      class="app-input max-w-28 py-1.5"
                      type="number"
                      min="0.01"
                      step="0.01"
                      aria-label="Quantite ligne panier"
                    >
                    <p
                      v-if="line.recommendedQuantity > 0 && line.quantity > line.recommendedQuantity * 1.75"
                      class="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-300"
                    >
                      Quantite excessive
                    </p>
                  </td>
                  <td class="px-3 py-3">
                    <input
                      v-model.number="line.unitPrice"
                      class="app-input max-w-28 py-1.5"
                      type="number"
                      min="0"
                      step="0.01"
                      aria-label="Prix unitaire ligne panier"
                    >
                  </td>
                  <td class="px-3 py-3 text-right font-semibold">
                    {{ formatCurrency(line.quantity * line.unitPrice) }}
                  </td>
                  <td class="px-3 py-3 text-right">
                    <button
                      type="button"
                      class="btn-danger px-3 py-1.5"
                      @click="removeCartLine(line.ingredientId)"
                    >
                      <UIcon
                        name="i-lucide-trash-2"
                        class="size-4"
                      />
                    </button>
                  </td>
                </tr>
                <tr v-if="cartLines.length === 0">
                  <td
                    colspan="8"
                    class="px-3 py-8 text-center text-sm text-[#40493e] dark:text-[#c0c9ba]"
                  >
                    Le panier est vide. Passe par la selection ou ajoute directement les ingredients a reapprovisionner.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            v-if="excessiveCartLines.length > 0 || supplierMinimumAlerts.length > 0"
            class="mt-4 grid gap-2"
          >
            <div
              v-for="alert in supplierMinimumAlerts"
              :key="alert.supplier._id"
              class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
            >
              Minimum {{ alert.supplier.name }} non atteint: il manque {{ formatCurrency(alert.missing) }}.
            </div>
            <div
              v-if="excessiveCartLines.length > 0"
              class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
            >
              {{ excessiveCartLines.length }} ligne(s) depassent fortement le besoin estime.
            </div>
          </div>
        </div>

        <aside class="app-section h-fit">
          <p class="app-eyebrow">
            Resume commande
          </p>
          <h2 class="app-section-title mt-1">
            Totaux fournisseur
          </h2>
          <div class="mt-4 grid gap-2 text-sm">
            <div class="flex justify-between gap-3">
              <span class="text-[#40493e] dark:text-[#c0c9ba]">Articles HT</span>
              <span class="font-semibold">{{ formatCurrency(cartSubtotal) }}</span>
            </div>
            <div class="flex justify-between gap-3">
              <span class="text-[#40493e] dark:text-[#c0c9ba]">Frais livraison</span>
              <span class="font-semibold">{{ formatCurrency(deliveryFees) }}</span>
            </div>
            <div class="flex justify-between gap-3">
              <span class="text-[#40493e] dark:text-[#c0c9ba]">TVA 10%</span>
              <span class="font-semibold">{{ formatCurrency(cartVatAmount) }}</span>
            </div>
            <div class="border-t border-[#c0c9ba]/30 pt-3 text-base dark:border-white/10">
              <div class="flex justify-between gap-3">
                <span class="font-semibold">Total TTC</span>
                <span class="font-bold">{{ formatCurrency(cartTotalInclTax) }}</span>
              </div>
            </div>
          </div>
          <div class="mt-4 grid gap-2">
            <button
              type="button"
              class="btn-secondary w-full"
              :disabled="!canCreateOrder"
              @click="saveDraftOrder"
            >
              Sauvegarder brouillon
            </button>
            <button
              type="button"
              class="btn-primary w-full"
              :disabled="!canCreateOrder"
              @click="activeStep = 'checkout'"
            >
              Passer a la validation
            </button>
          </div>
        </aside>
      </section>

      <section
        v-if="activeStep === 'checkout'"
        class="grid gap-4 xl:grid-cols-[1fr_0.4fr]"
      >
        <div class="app-section">
          <p class="app-eyebrow">
            Validation commande
          </p>
          <h2 class="app-section-title mt-1">
            Verifier avant virement fournisseur
          </h2>

          <div class="mt-4 grid gap-3 md:grid-cols-2">
            <div class="app-inset">
              <p class="text-xs font-semibold uppercase text-[#40493e] dark:text-[#c0c9ba]">
                Fournisseurs
              </p>
              <p class="mt-1 font-semibold text-[#1a1c1c] dark:text-white">
                {{ selectedSuppliers.map(supplier => supplier.name).join(', ') || '-' }}
              </p>
            </div>
            <div class="app-inset">
              <p class="text-xs font-semibold uppercase text-[#40493e] dark:text-[#c0c9ba]">
                Livraison estimee
              </p>
              <p class="mt-1 font-semibold text-[#1a1c1c] dark:text-white">
                {{ formatDate(estimatedDeliveryDate) }}
              </p>
            </div>
          </div>

          <div class="mt-4 grid gap-3">
            <textarea
              v-model="deliveryAddress"
              class="app-input min-h-24"
              placeholder="Adresse de livraison du restaurant"
            />
            <textarea
              v-model="internalComment"
              class="app-input min-h-24"
              placeholder="Commentaire interne: service, priorite, consigne fournisseur"
            />
          </div>

          <div class="mt-4 overflow-x-auto rounded-lg border border-[#c0c9ba]/30 dark:border-white/10">
            <table class="min-w-full divide-y divide-[#c0c9ba]/30 text-sm dark:divide-white/10">
              <thead class="bg-[#f3f3f3] dark:bg-[#2f3131]/60">
                <tr>
                  <th class="px-3 py-2 text-left font-medium text-[#40493e]">
                    Article
                  </th>
                  <th class="px-3 py-2 text-left font-medium text-[#40493e]">
                    Fournisseur
                  </th>
                  <th class="px-3 py-2 text-left font-medium text-[#40493e]">
                    Quantite
                  </th>
                  <th class="px-3 py-2 text-right font-medium text-[#40493e]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#c0c9ba]/30 bg-white dark:divide-white/10 dark:bg-[#1a1c1c]">
                <tr
                  v-for="line in cartLines"
                  :key="line.ingredientId"
                >
                  <td class="px-3 py-2 font-medium">
                    {{ line.ingredientName }}
                  </td>
                  <td class="px-3 py-2">
                    {{ line.supplierName }}
                  </td>
                  <td class="px-3 py-2">
                    {{ formatQuantity(line.quantity, line.unit) }}
                  </td>
                  <td class="px-3 py-2 text-right font-semibold">
                    {{ formatCurrency(line.quantity * line.unitPrice) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <aside class="app-section h-fit">
          <p class="app-eyebrow">
            Totaux
          </p>
          <div class="mt-3 grid gap-2 text-sm">
            <div class="flex justify-between gap-3">
              <span class="text-[#40493e] dark:text-[#c0c9ba]">Total HT</span>
              <span class="font-semibold">{{ formatCurrency(cartTotalExclTax) }}</span>
            </div>
            <div class="flex justify-between gap-3">
              <span class="text-[#40493e] dark:text-[#c0c9ba]">TVA</span>
              <span class="font-semibold">{{ formatCurrency(cartVatAmount) }}</span>
            </div>
            <div class="flex justify-between gap-3 text-base">
              <span class="font-semibold">Total TTC</span>
              <span class="font-bold">{{ formatCurrency(cartTotalInclTax) }}</span>
            </div>
          </div>
          <button
            type="button"
            class="btn-primary mt-4 w-full"
            :disabled="!canCreateOrder"
            @click="validateOrder"
          >
            Valider la commande
          </button>
        </aside>
      </section>

      <section
        v-if="activeStep === 'payment'"
        class="grid gap-4 xl:grid-cols-[0.95fr_0.55fr]"
      >
        <div class="app-section">
          <p class="app-eyebrow">
            Paiement fournisseur
          </p>
          <h2 class="app-section-title mt-1">
            Confirmer un virement
          </h2>
          <p class="mt-2 text-sm leading-6 text-[#40493e] dark:text-[#c0c9ba]">
            Enregistre la reference du virement effectue depuis ta banque, marque la commande comme payee et previent le fournisseur par email et messagerie.
          </p>

          <div class="mt-4 grid gap-3 md:grid-cols-2">
            <input
              v-model="paymentForm.accountHolder"
              class="app-input"
              placeholder="Titulaire beneficiaire"
            >
            <input
              v-model="paymentForm.iban"
              class="app-input"
              placeholder="IBAN / RIB fournisseur"
            >
            <input
              v-model="paymentForm.bic"
              class="app-input"
              placeholder="BIC fournisseur"
            >
            <input
              v-model="paymentForm.executionDate"
              class="app-input"
              type="date"
            >
            <input
              v-model="paymentForm.reference"
              class="app-input md:col-span-2"
              placeholder="Reference de virement"
            >
            <textarea
              v-model="paymentForm.note"
              class="app-input min-h-20 md:col-span-2"
              placeholder="Note paiement visible dans le dossier commande"
            />
          </div>

          <label class="app-inset mt-4 flex cursor-pointer items-start gap-3">
            <input
              v-model="paymentForm.notifySupplier"
              type="checkbox"
              class="mt-1"
            >
            <span>
              <span class="block font-semibold text-[#1a1c1c] dark:text-white">Notifier le fournisseur</span>
              <span class="mt-1 block text-sm text-[#40493e] dark:text-[#c0c9ba]">
                Envoie un email de confirmation et ajoute le message dans le portail fournisseur.
              </span>
            </span>
          </label>

          <div
            v-if="paymentErrors.length > 0"
            class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          >
            <p
              v-for="message in paymentErrors"
              :key="message"
            >
              {{ message }}
            </p>
          </div>

          <button
            type="button"
            class="btn-primary mt-4"
            :disabled="!confirmedOrder"
            @click="submitBankTransferPayment"
          >
            Confirmer le virement
          </button>
        </div>

        <aside class="app-section h-fit">
          <p class="app-eyebrow">
            Commande a payer
          </p>
          <h2 class="app-section-title mt-1">
            {{ confirmedOrder?.orderNumber || 'Aucune commande' }}
          </h2>
          <div class="mt-4 grid gap-2 text-sm">
            <div class="flex justify-between gap-3">
              <span class="text-[#40493e] dark:text-[#c0c9ba]">Fournisseur(s)</span>
              <span class="text-right font-semibold">{{ confirmedOrder ? getOrderSupplierNames(confirmedOrder) : '-' }}</span>
            </div>
            <div class="flex justify-between gap-3">
              <span class="text-[#40493e] dark:text-[#c0c9ba]">Total TTC</span>
              <span class="font-semibold">{{ formatCurrency(confirmedOrder?.totalInclTax || confirmedOrder?.totalAmount || 0) }}</span>
            </div>
            <div class="flex justify-between gap-3">
              <span class="text-[#40493e] dark:text-[#c0c9ba]">Moyen</span>
              <span class="font-semibold">{{ paymentMethodLabel }}</span>
            </div>
            <div class="flex justify-between gap-3">
              <span class="text-[#40493e] dark:text-[#c0c9ba]">Livraison estimee</span>
              <span class="font-semibold">{{ formatDate(confirmedOrder?.estimatedDeliveryDate) }}</span>
            </div>
          </div>
        </aside>
      </section>

      <section
        v-if="activeStep === 'confirmation'"
        class="app-section"
      >
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p class="app-eyebrow">
              Confirmation
            </p>
            <h2 class="app-section-title mt-1">
              Commande fournisseur confirmee
            </h2>
            <p class="mt-2 text-sm leading-6 text-[#40493e] dark:text-[#c0c9ba]">
              La commande est enregistree dans l historique avec une reference de virement et une confirmation fournisseur.
            </p>
          </div>
          <span
            v-if="confirmedOrder"
            class="inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold"
            :class="getStatusClass(confirmedOrder.status)"
          >
            {{ getStatusLabel(confirmedOrder.status) }}
          </span>
        </div>

        <div
          v-if="confirmedOrder"
          class="mt-5 grid gap-4 lg:grid-cols-[0.65fr_0.35fr]"
        >
          <div class="overflow-x-auto rounded-lg border border-[#c0c9ba]/30 dark:border-white/10">
            <table class="min-w-full divide-y divide-[#c0c9ba]/30 text-sm dark:divide-white/10">
              <thead class="bg-[#f3f3f3] dark:bg-[#2f3131]/60">
                <tr>
                  <th class="px-3 py-2 text-left font-medium text-[#40493e]">
                    Ingredient
                  </th>
                  <th class="px-3 py-2 text-left font-medium text-[#40493e]">
                    Quantite
                  </th>
                  <th class="px-3 py-2 text-right font-medium text-[#40493e]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#c0c9ba]/30 bg-white dark:divide-white/10 dark:bg-[#1a1c1c]">
                <tr
                  v-for="item in confirmedOrder.items"
                  :key="`${confirmedOrder._id}-${item.ingredientName}`"
                >
                  <td class="px-3 py-2 font-medium">
                    {{ item.ingredientName }}
                  </td>
                  <td class="px-3 py-2">
                    {{ formatQuantity(item.quantity, item.unit) }}
                  </td>
                  <td class="px-3 py-2 text-right font-semibold">
                    {{ formatCurrency(item.lineTotal) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="app-inset">
            <p class="text-sm font-semibold text-[#1a1c1c] dark:text-white">
              {{ confirmedOrder.orderNumber }}
            </p>
            <div class="mt-3 grid gap-2 text-sm">
              <div class="flex justify-between gap-3">
                <span class="text-[#40493e] dark:text-[#c0c9ba]">Date</span>
                <span class="font-semibold">{{ formatDate(confirmedOrder.created_at) }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-[#40493e] dark:text-[#c0c9ba]">Fournisseur</span>
                <span class="text-right font-semibold">{{ getOrderSupplierNames(confirmedOrder) }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-[#40493e] dark:text-[#c0c9ba]">Total paye</span>
                <span class="font-semibold">{{ formatCurrency(confirmedOrder.totalInclTax || confirmedOrder.totalAmount) }}</span>
              </div>
              <div
                v-if="confirmedOrder.paymentReference"
                class="flex justify-between gap-3"
              >
                <span class="text-[#40493e] dark:text-[#c0c9ba]">Reference</span>
                <span class="text-right font-semibold">{{ confirmedOrder.paymentReference }}</span>
              </div>
              <div
                v-if="confirmedOrder.paymentIbanLast4"
                class="flex justify-between gap-3"
              >
                <span class="text-[#40493e] dark:text-[#c0c9ba]">IBAN</span>
                <span class="font-semibold">****{{ confirmedOrder.paymentIbanLast4 }}</span>
              </div>
              <div class="flex justify-between gap-3">
                <span class="text-[#40493e] dark:text-[#c0c9ba]">Livraison</span>
                <span class="font-semibold">{{ formatDate(confirmedOrder.estimatedDeliveryDate) }}</span>
              </div>
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                class="btn-primary"
                :disabled="!canSendSupplierEmail(confirmedOrder) || isSendingSupplierEmail(confirmedOrder)"
                @click="sendSupplierEmail(confirmedOrder)"
              >
                <UIcon
                  name="i-lucide-send"
                  class="size-4"
                />
                {{ isSendingSupplierEmail(confirmedOrder) ? 'Envoi...' : 'Envoyer au fournisseur' }}
              </button>
              <a
                href="http://localhost:8025"
                target="_blank"
                rel="noreferrer"
                class="btn-secondary"
              >
                <UIcon
                  name="i-lucide-mail-open"
                  class="size-4"
                />
                Mailpit
              </a>
              <button
                type="button"
                class="btn-secondary"
                @click="activeStep = 'history'"
              >
                Voir historique
              </button>
              <NuxtLink
                to="/"
                class="btn-secondary"
              >
                Dashboard
              </NuxtLink>
            </div>
          </div>
        </div>
      </section>

      <section
        v-if="activeStep === 'history'"
        class="app-section"
      >
        <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="app-eyebrow">
              Historique achats
            </p>
            <h2 class="app-section-title mt-1">
              Commandes fournisseurs
            </h2>
          </div>
          <span class="app-pill">{{ filteredOrders.length }} / {{ purchaseOrderStore.items.length }} commande(s)</span>
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
          <input
            v-model="orderFilters.search"
            class="app-input"
            type="search"
            placeholder="Rechercher numero, fournisseur, ingredient"
            aria-label="Rechercher une commande"
          >
          <select
            v-model="orderFilters.supplier"
            class="app-input"
            aria-label="Filtrer historique par fournisseur"
          >
            <option value="all">
              Tous fournisseurs
            </option>
            <option
              v-for="supplier in supplierStore.items"
              :key="supplier._id"
              :value="supplier._id"
            >
              {{ supplier.name }}
            </option>
          </select>
          <select
            v-model="orderFilters.status"
            class="app-input"
            aria-label="Filtrer historique par statut"
          >
            <option value="all">
              Tous statuts
            </option>
            <option
              v-for="status in statusOptions"
              :key="status"
              :value="status"
            >
              {{ getStatusLabel(status) }}
            </option>
          </select>
          <select
            v-model="orderFilters.period"
            class="app-input"
            aria-label="Filtrer historique par periode"
          >
            <option value="all">
              Toute periode
            </option>
            <option value="7">
              7 derniers jours
            </option>
            <option value="30">
              30 derniers jours
            </option>
            <option value="90">
              90 derniers jours
            </option>
          </select>
          <button
            type="button"
            class="btn-secondary"
            @click="resetOrderFilters"
          >
            Reset
          </button>
        </div>

        <div class="mt-4 grid gap-3">
          <article
            v-for="order in filteredOrders"
            :key="order._id"
            class="rounded-lg border border-[#c0c9ba]/30 bg-white p-4 dark:border-white/10 dark:bg-[#1a1c1c]"
          >
            <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div class="flex flex-wrap gap-2">
                  <span
                    class="inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold"
                    :class="getStatusClass(order.status)"
                  >
                    {{ getStatusLabel(order.status) }}
                  </span>
                  <span class="app-pill">{{ order.orderNumber || order._id }}</span>
                  <span class="app-pill">{{ formatDate(order.created_at) }}</span>
                </div>
                <h3 class="mt-3 font-semibold text-[#1a1c1c] dark:text-white">
                  {{ getOrderSupplierNames(order) }}
                </h3>
                <p class="mt-1 text-sm text-[#40493e] dark:text-[#c0c9ba]">
                  {{ order.items.length }} article(s), total {{ formatCurrency(order.totalInclTax || order.totalAmount) }}
                </p>
                <p
                  v-if="order.internalComment || order.notes"
                  class="mt-1 text-sm text-[#40493e] dark:text-[#c0c9ba]"
                >
                  {{ order.internalComment || order.notes }}
                </p>
                <p
                  v-if="order.paymentReference"
                  class="mt-1 text-sm font-semibold text-[#005013] dark:text-[#8ad986]"
                >
                  Virement {{ order.paymentReference }}
                  <span v-if="order.paymentIbanLast4">- IBAN ****{{ order.paymentIbanLast4 }}</span>
                </p>
              </div>

              <div class="flex flex-wrap gap-2 lg:justify-end">
                <button
                  type="button"
                  class="btn-secondary"
                  :disabled="!canSendSupplierEmail(order) || isSendingSupplierEmail(order)"
                  @click="sendSupplierEmail(order)"
                >
                  <UIcon
                    name="i-lucide-send"
                    class="size-4"
                  />
                  {{ isSendingSupplierEmail(order) ? 'Envoi...' : 'Mail fournisseur' }}
                </button>
                <button
                  v-if="order.status === 'pending_payment'"
                  type="button"
                  class="btn-primary"
                  @click="payExistingOrder(order)"
                >
                  Payer
                </button>
                <button
                  v-if="order.status === 'paid'"
                  type="button"
                  class="btn-secondary"
                  @click="updateOrderStatus(order, 'delivering')"
                >
                  En livraison
                </button>
                <button
                  v-if="order.status === 'delivering'"
                  type="button"
                  class="btn-secondary"
                  @click="updateOrderStatus(order, 'delivered')"
                >
                  Livree
                </button>
                <button
                  type="button"
                  class="btn-danger"
                  @click="removeOrder(order)"
                >
                  Supprimer
                </button>
              </div>
            </div>

            <div class="mt-3 grid gap-2 md:grid-cols-2">
              <div
                v-for="item in order.items"
                :key="`${order._id}-${item.ingredientName}`"
                class="flex items-center justify-between gap-3 rounded-lg bg-[#f3f3f3] px-3 py-2 text-sm dark:bg-[#2f3131]"
              >
                <span class="font-medium text-[#1a1c1c] dark:text-white">{{ item.ingredientName }}</span>
                <span class="text-[#40493e] dark:text-[#c0c9ba]">
                  {{ formatQuantity(item.quantity, item.unit) }} - {{ formatCurrency(item.lineTotal) }}
                </span>
              </div>
            </div>
          </article>

          <div
            v-if="filteredOrders.length === 0"
            class="rounded-lg border border-dashed border-[#c0c9ba]/40 bg-[#f3f3f3] p-6 text-center text-sm text-[#40493e] dark:border-white/10 dark:bg-[#1a1c1c] dark:text-[#c0c9ba]"
          >
            Aucune commande fournisseur ne correspond aux filtres.
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

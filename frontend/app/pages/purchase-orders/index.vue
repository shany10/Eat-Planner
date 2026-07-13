<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import StatCard from '~/components/common/StatCard.vue'
import type { Ingredient, PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '~/types/business'
import { usePurchaseOrderStore } from '~/stores/purchase-orders'
import { useSupplierStore } from '~/stores/suppliers'

definePageMeta({
  middleware: 'manager'
})

const statusOptions: PurchaseOrderStatus[] = [
  'draft',
  'pending_validation',
  'validated',
  'pending_payment',
  'paid',
  'delivering',
  'delivered',
  'cancelled'
]

const supplierStore = useSupplierStore()
const purchaseOrderStore = usePurchaseOrderStore()
const appToast = useAppToast()
const route = useRoute()
const {
  formatCurrency,
  formatDate,
  formatQuantity,
  getStatusLabel,
  getStatusClass,
  getOrderSupplierNames,
  canSendSupplierEmail
} = usePurchaseHelpers()

const loading = ref(true)
const errorMessage = ref('')
const sendingOrderEmailId = ref('')

const orderFilters = reactive({
  search: '',
  supplier: 'all',
  status: 'all',
  period: 'all'
})

const payingOrder = ref<PurchaseOrder | null>(null)
const paymentSubmitting = ref(false)
const paymentErrors = ref<string[]>([])
const paymentForm = reactive({
  accountHolder: '',
  iban: '',
  bic: '',
  reference: '',
  executionDate: new Date().toISOString().slice(0, 10),
  note: '',
  notifySupplier: true
})

const receivingOrder = ref<PurchaseOrder | null>(null)
const receptionSubmitting = ref(false)
const receptionLines = ref<Array<{ ingredient: string, name: string, unit: Ingredient['unit'], ordered: number, received: number }>>([])

const rewards = computed(() => purchaseOrderStore.rewards)
const pendingPaymentOrders = computed(() => purchaseOrderStore.items.filter(order => order.status === 'pending_payment'))
const pendingPaymentAmount = computed(() =>
  pendingPaymentOrders.value.reduce((sum, order) => sum + (order.totalInclTax || order.totalAmount || 0), 0)
)

const stats = computed(() => [
  { title: 'A payer', value: pendingPaymentOrders.value.length, hint: formatCurrency(pendingPaymentAmount.value) },
  { title: 'Commandes ouvertes', value: purchaseOrderStore.openOrders.length, hint: formatCurrency(purchaseOrderStore.openAmount) },
  { title: 'Payees', value: purchaseOrderStore.paidOrders.length, hint: rewards.value?.level || 'Score en attente' },
  { title: 'Total commandes', value: purchaseOrderStore.items.length, hint: `${supplierStore.items.length} fournisseur(s)` }
])

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

function getOrderSupplierIds(order: PurchaseOrder) {
  const ids = (order.suppliers || [])
    .map(supplier => typeof supplier === 'object' ? supplier._id : supplier)
    .filter(Boolean)

  if (ids.length > 0) {
    return ids
  }

  return [typeof order.supplier === 'object' ? order.supplier._id : order.supplier]
}

function isPayable(order: PurchaseOrder) {
  return !['paid', 'delivering', 'delivered', 'cancelled', 'received'].includes(order.status)
}

async function loadPage() {
  loading.value = true
  errorMessage.value = ''

  try {
    const results = await Promise.allSettled([
      supplierStore.load(),
      purchaseOrderStore.load(),
      purchaseOrderStore.loadRewards()
    ])

    const firstFailure = results.find(result => result.status === 'rejected')

    if (firstFailure?.status === 'rejected') {
      errorMessage.value = getFetchErrorMessage(firstFailure.reason, 'Impossible de charger toutes les commandes')
      appToast.error('Chargement partiel', errorMessage.value)
    }

    const payId = Array.isArray(route.query.pay) ? route.query.pay[0] : route.query.pay
    if (payId) {
      const order = purchaseOrderStore.items.find(item => item._id === payId)
      if (order) {
        openPayment(order)
      }
    }
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de charger le module achat')
    appToast.error('Chargement impossible', errorMessage.value)
  } finally {
    loading.value = false
  }
}

function openPayment(order: PurchaseOrder) {
  payingOrder.value = order
  paymentErrors.value = []
  paymentForm.reference = order.paymentReference || `VIR-${order.orderNumber || order._id}`
  paymentForm.accountHolder = order.paymentAccountHolder || getOrderSupplierNames(order)
  paymentForm.iban = ''
  paymentForm.bic = order.paymentBic || ''
  paymentForm.executionDate = order.paymentExecutionDate || new Date().toISOString().slice(0, 10)
  paymentForm.note = order.paymentNote || ''
  paymentForm.notifySupplier = true
}

function closePayment() {
  payingOrder.value = null
  paymentErrors.value = []
  paymentSubmitting.value = false
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
  if (!payingOrder.value || paymentSubmitting.value || !validateBankTransferFields()) {
    return
  }

  paymentSubmitting.value = true
  try {
    const result = await purchaseOrderStore.payByBankTransfer(payingOrder.value._id, {
      accountHolder: paymentForm.accountHolder,
      iban: paymentForm.iban,
      bic: paymentForm.bic,
      reference: paymentForm.reference,
      executionDate: paymentForm.executionDate,
      note: paymentForm.note,
      notifySupplier: paymentForm.notifySupplier
    })
    const notificationLabel = result.sent.length > 0
      ? `${result.sent.length} confirmation(s) envoyee(s) au fournisseur.`
      : 'Aucun email fournisseur configure, paiement trace en interne.'
    appToast.success('Virement confirme', `${result.order.orderNumber || ''} marquee payee. ${notificationLabel}`)
    closePayment()
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de confirmer le virement')
    appToast.error('Virement refuse', errorMessage.value)
  } finally {
    paymentSubmitting.value = false
  }
}

function getItemIngredientId(item: PurchaseOrderItem) {
  return typeof item.ingredient === 'object' ? item.ingredient._id : item.ingredient
}

function canReceive(order: PurchaseOrder) {
  return !order.receivedAt && ['paid', 'delivering', 'delivered', 'sent'].includes(order.status)
}

function openReception(order: PurchaseOrder) {
  receivingOrder.value = order
  receptionLines.value = order.items.map(item => ({
    ingredient: getItemIngredientId(item),
    name: item.ingredientName,
    unit: item.unit,
    ordered: item.quantity,
    received: item.quantity
  }))
}

function closeReception() {
  receivingOrder.value = null
  receptionSubmitting.value = false
}

async function submitReception() {
  if (!receivingOrder.value || receptionSubmitting.value) {
    return
  }

  receptionSubmitting.value = true
  try {
    const result = await purchaseOrderStore.receive(
      receivingOrder.value._id,
      receptionLines.value.map(line => ({ ingredient: line.ingredient, receivedQuantity: Number(line.received) || 0 }))
    )
    appToast.success('Commande receptionnee', `${result.updatedIngredients} ingredient(s) mis a jour en stock.`)
    closeReception()
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de receptionner la commande')
    appToast.error('Reception impossible', errorMessage.value)
  } finally {
    receptionSubmitting.value = false
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
    appToast.success('Email fournisseur envoye', `${result.sent.length} message(s) visible(s) dans Mailpit.`)
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible d envoyer le mail fournisseur')
    appToast.error('Envoi impossible', errorMessage.value)
  } finally {
    sendingOrderEmailId.value = ''
  }
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

function resetOrderFilters() {
  orderFilters.search = ''
  orderFilters.supplier = 'all'
  orderFilters.status = 'all'
  orderFilters.period = 'all'
}

function isSendingSupplierEmail(order: PurchaseOrder) {
  return sendingOrderEmailId.value === order._id
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
            Commandes & paiements
          </h1>
          <p class="app-subtitle mt-2">
            Suis tes commandes fournisseurs, paie par virement et gere les livraisons en un seul endroit.
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
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
          <NuxtLink
            to="/purchase-orders/new"
            class="btn-primary"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-4"
            />
            Nouvel achat
          </NuxtLink>
        </div>
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

      <section class="app-section">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-3">
            <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--ep-primary-soft)] text-[color:var(--ep-primary)]">
              <UIcon
                name="i-lucide-trophy"
                class="size-5"
              />
            </div>
            <div>
              <p class="app-eyebrow">
                Score achats
              </p>
              <p class="font-semibold text-[color:var(--ep-text)]">
                {{ rewards?.level || 'Gestion debutante' }}
              </p>
            </div>
          </div>

          <div class="w-full md:max-w-xs">
            <div class="flex items-center justify-between text-xs text-[color:var(--ep-text-muted)]">
              <span>Progression</span>
              <span class="font-semibold text-[color:var(--ep-text)]">{{ rewards?.score || 0 }} pts</span>
            </div>
            <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-[color:var(--ep-surface-muted)]">
              <div
                class="h-full rounded-full bg-[linear-gradient(90deg,#feb236,#005013)]"
                :style="{ width: `${rewards?.levelProgress || 0}%` }"
              />
            </div>
          </div>

          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="badge in (rewards?.badges || []).slice(0, 3)"
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

      <section class="app-section">
        <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="app-eyebrow">
              Historique
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
            aria-label="Filtrer par fournisseur"
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
            aria-label="Filtrer par statut"
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
            aria-label="Filtrer par periode"
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
                <p
                  v-if="order.receivedAt"
                  class="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300"
                >
                  <UIcon
                    name="i-lucide-package-check"
                    class="size-4"
                  />
                  Receptionne le {{ formatDate(order.receivedAt) }} - stock mis a jour
                </p>
              </div>

              <div class="flex flex-wrap gap-2 lg:justify-end">
                <button
                  v-if="isPayable(order)"
                  type="button"
                  class="btn-primary"
                  @click="openPayment(order)"
                >
                  <UIcon
                    name="i-lucide-credit-card"
                    class="size-4"
                  />
                  Payer
                </button>
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
                  v-if="order.status === 'paid'"
                  type="button"
                  class="btn-secondary"
                  @click="updateOrderStatus(order, 'delivering')"
                >
                  En livraison
                </button>
                <button
                  v-if="canReceive(order)"
                  type="button"
                  class="btn-secondary"
                  @click="openReception(order)"
                >
                  <UIcon
                    name="i-lucide-package-check"
                    class="size-4"
                  />
                  Receptionner
                </button>
                <button
                  type="button"
                  class="btn-danger"
                  @click="removeOrder(order)"
                >
                  <UIcon
                    name="i-lucide-trash-2"
                    class="size-4"
                  />
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
            class="rounded-lg border border-dashed border-[#c0c9ba]/40 bg-[#f3f3f3] p-8 text-center dark:border-white/10 dark:bg-[#1a1c1c]"
          >
            <p class="text-sm text-[#40493e] dark:text-[#c0c9ba]">
              Aucune commande fournisseur pour l instant.
            </p>
            <NuxtLink
              to="/purchase-orders/new"
              class="btn-primary mt-4 inline-flex"
            >
              <UIcon
                name="i-lucide-plus"
                class="size-4"
              />
              Creer une commande
            </NuxtLink>
          </div>
        </div>
      </section>
    </template>

    <Teleport to="body">
      <div
        v-if="payingOrder"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
        @click.self="closePayment"
      >
        <div class="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-[#1a1c1c] sm:rounded-2xl">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="app-eyebrow">
                Paiement fournisseur
              </p>
              <h2 class="app-section-title mt-1">
                Payer {{ getOrderSupplierNames(payingOrder) }}
              </h2>
            </div>
            <button
              type="button"
              class="btn-secondary px-2 py-2"
              aria-label="Fermer"
              @click="closePayment"
            >
              <UIcon
                name="i-lucide-x"
                class="size-4"
              />
            </button>
          </div>

          <div class="mt-4 grid gap-2 rounded-lg bg-[#f3f3f3] p-4 text-sm dark:bg-[#2f3131]">
            <div class="flex justify-between gap-3">
              <span class="text-[#40493e] dark:text-[#c0c9ba]">Commande</span>
              <span class="font-semibold">{{ payingOrder.orderNumber || payingOrder._id }}</span>
            </div>
            <div class="flex justify-between gap-3">
              <span class="text-[#40493e] dark:text-[#c0c9ba]">Montant a payer TTC</span>
              <span class="text-lg font-bold text-[#005013] dark:text-[#8ad986]">
                {{ formatCurrency(payingOrder.totalInclTax || payingOrder.totalAmount || 0) }}
              </span>
            </div>
            <div class="flex justify-between gap-3">
              <span class="text-[#40493e] dark:text-[#c0c9ba]">Moyen de paiement</span>
              <span class="font-semibold">Virement bancaire</span>
            </div>
          </div>

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

          <div class="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              class="btn-secondary"
              @click="closePayment"
            >
              Annuler
            </button>
            <button
              type="button"
              class="btn-primary"
              :disabled="paymentSubmitting"
              @click="submitBankTransferPayment"
            >
              <UIcon
                name="i-lucide-check"
                class="size-4"
              />
              {{ paymentSubmitting ? 'Confirmation...' : 'Confirmer le virement' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="receivingOrder"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
        @click.self="closeReception"
      >
        <div class="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-[#1a1c1c] sm:rounded-2xl">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="app-eyebrow">
                Reception de commande
              </p>
              <h2 class="app-section-title mt-1">
                Receptionner {{ getOrderSupplierNames(receivingOrder) }}
              </h2>
            </div>
            <button
              type="button"
              class="btn-secondary px-2 py-2"
              aria-label="Fermer"
              @click="closeReception"
            >
              <UIcon
                name="i-lucide-x"
                class="size-4"
              />
            </button>
          </div>

          <p class="mt-2 text-sm leading-6 text-[#40493e] dark:text-[#c0c9ba]">
            Confirme les quantites reellement recues. Le stock des ingredients sera augmente en consequence
            et la commande passera en "Livree".
          </p>

          <div class="mt-4 overflow-x-auto rounded-lg border border-[#c0c9ba]/30 dark:border-white/10">
            <table class="min-w-full divide-y divide-[#c0c9ba]/30 text-sm dark:divide-white/10">
              <thead class="bg-[#f3f3f3] dark:bg-[#2f3131]/60">
                <tr>
                  <th class="px-3 py-2 text-left font-medium text-[#40493e]">
                    Ingredient
                  </th>
                  <th class="px-3 py-2 text-left font-medium text-[#40493e]">
                    Commande
                  </th>
                  <th class="px-3 py-2 text-left font-medium text-[#40493e]">
                    Recu
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#c0c9ba]/30 bg-white dark:divide-white/10 dark:bg-[#1a1c1c]">
                <tr
                  v-for="line in receptionLines"
                  :key="line.ingredient"
                >
                  <td class="px-3 py-2 font-medium text-[#1a1c1c] dark:text-white">
                    {{ line.name }}
                  </td>
                  <td class="px-3 py-2 text-[#40493e] dark:text-[#c0c9ba]">
                    {{ formatQuantity(line.ordered, line.unit) }}
                  </td>
                  <td class="px-3 py-2">
                    <input
                      v-model.number="line.received"
                      class="app-input max-w-28 py-1.5"
                      type="number"
                      min="0"
                      step="0.01"
                      aria-label="Quantite recue"
                    >
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="mt-5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              class="btn-secondary"
              @click="closeReception"
            >
              Annuler
            </button>
            <button
              type="button"
              class="btn-primary"
              :disabled="receptionSubmitting"
              @click="submitReception"
            >
              <UIcon
                name="i-lucide-package-check"
                class="size-4"
              />
              {{ receptionSubmitting ? 'Reception...' : 'Confirmer la reception' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

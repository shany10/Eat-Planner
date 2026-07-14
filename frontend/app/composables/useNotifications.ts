import { useAuthStore } from '~/stores/auth'
import { useDishStore } from '~/stores/dishes'
import { useForecastStore } from '~/stores/forecasts'
import { useIngredientStore } from '~/stores/ingredients'
import { usePricingAlertStore } from '~/stores/pricing-alerts'
import { usePurchaseOrderStore } from '~/stores/purchase-orders'
import { useSaleStore } from '~/stores/sales'
import { useSupplierMessageStore } from '~/stores/supplier-messages'
import { useSupplierStore } from '~/stores/suppliers'

export type NotificationSeverity = 'info' | 'warning' | 'critical'

export type AppNotification = {
  id: string
  severity: NotificationSeverity
  icon: string
  title: string
  description: string
  to: string
}

const STORAGE_KEY = 'eatplanner:notifications:read'

function toDateKey(value: Date | string) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function useNotifications() {
  const authStore = useAuthStore()
  const ingredientStore = useIngredientStore()
  const supplierStore = useSupplierStore()
  const dishStore = useDishStore()
  const saleStore = useSaleStore()
  const forecastStore = useForecastStore()
  const purchaseOrderStore = usePurchaseOrderStore()
  const supplierMessageStore = useSupplierMessageStore()
  const pricingAlertStore = usePricingAlertStore()

  const readIds = useState<string[]>('notifications:read', () => [])
  const loading = useState<boolean>('notifications:loading', () => false)
  const hydrated = useState<boolean>('notifications:hydrated', () => false)

  if (import.meta.client && !hydrated.value) {
    hydrated.value = true
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        readIds.value = JSON.parse(raw) as string[]
      }
    } catch {
      readIds.value = []
    }
  }

  function persist() {
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(readIds.value))
    }
  }

  const notifications = computed<AppNotification[]>(() => {
    const list: AppNotification[] = []

    const lowStock = ingredientStore.items.filter(item => item.active && item.stockQuantity <= item.minimumStock)
    if (lowStock.length > 0) {
      list.push({
        id: `low-stock:${lowStock.length}`,
        severity: 'critical',
        icon: 'i-lucide-package-x',
        title: `${lowStock.length} ingredient(s) en stock bas`,
        description: 'Sous le seuil minimum conseille, a reapprovisionner.',
        to: '/ingredients'
      })
    }

    const withoutSupplier = ingredientStore.items.filter(item => item.active && !item.supplier)
    if (withoutSupplier.length > 0) {
      list.push({
        id: `no-supplier:${withoutSupplier.length}`,
        severity: 'warning',
        icon: 'i-lucide-truck',
        title: `${withoutSupplier.length} ingredient(s) sans fournisseur`,
        description: 'Relie-les a un fournisseur pour fluidifier les achats.',
        to: '/ingredients'
      })
    }

    const toPay = purchaseOrderStore.items.filter(order => order.status === 'pending_payment')
    if (toPay.length > 0) {
      list.push({
        id: `po-pay:${toPay.length}`,
        severity: 'warning',
        icon: 'i-lucide-credit-card',
        title: `${toPay.length} commande(s) a payer`,
        description: 'Paiement fournisseur en attente de validation.',
        to: '/purchase-orders'
      })
    }

    const toReview = dishStore.items.filter(dish => dish.active && (!dish.profitability || (dish.profitability.expectedGrossProfit || 0) <= 0))
    if (toReview.length > 0) {
      list.push({
        id: `dish-review:${toReview.length}`,
        severity: 'warning',
        icon: 'i-lucide-utensils',
        title: `${toReview.length} plat(s) a revoir`,
        description: 'Marge brute faible ou recette incomplete.',
        to: '/dishes'
      })
    }

    const pricingReport = pricingAlertStore.report
    if (pricingReport && pricingReport.alerts.length > 0) {
      const severity: NotificationSeverity = pricingReport.counts.critical > 0
        ? 'critical'
        : pricingReport.counts.warning > 0 ? 'warning' : 'info'
      list.push({
        id: `pricing-alerts:${pricingReport.alerts.length}:${pricingReport.counts.critical}:${pricingReport.counts.warning}`,
        severity,
        icon: 'i-lucide-badge-euro',
        title: `${pricingReport.alerts.length} alerte(s) de rentabilite`,
        description: 'Marge sous objectif ou prix a revoir, prix conseille disponible.',
        to: '/dishes'
      })
    }

    const forecastAlerts = forecastStore.forecast?.alerts?.length ?? 0
    if (forecastAlerts > 0) {
      list.push({
        id: `forecast:${forecastAlerts}`,
        severity: 'info',
        icon: 'i-lucide-chart-no-axes-combined',
        title: `${forecastAlerts} alerte(s) de prevision`,
        description: 'A verifier sur le plan de production du jour.',
        to: '/forecasts'
      })
    }

    if (dishStore.items.length > 0) {
      const today = toDateKey(new Date())
      const hasSaleToday = saleStore.items.some(sale => toDateKey(sale.serviceDate) === today)
      if (!hasSaleToday) {
        list.push({
          id: `no-sale-today:${today}`,
          severity: 'info',
          icon: 'i-lucide-banknote',
          title: 'Aucune vente saisie aujourd hui',
          description: 'Pense a enregistrer les tickets du service.',
          to: '/sales'
        })
      }
    }

    if (authStore.profile && !authStore.profile.twoFactorEnabled) {
      list.push({
        id: '2fa-off',
        severity: 'info',
        icon: 'i-lucide-shield-alert',
        title: '2FA inactive',
        description: 'Active la double authentification pour securiser le compte.',
        to: '/security'
      })
    }

    const supplierMessages = supplierMessageStore.items.filter((message) => {
      if (authStore.profile?.role === 'supplier') {
        return message.direction === 'outbound'
      }

      return message.direction === 'inbound'
    })
    if (supplierMessages.length > 0) {
      list.push({
        id: `supplier-message:${supplierMessages[0]?._id ?? supplierMessages.length}`,
        severity: 'info',
        icon: 'i-lucide-message-circle',
        title: `${supplierMessages.length} message(s) fournisseur`,
        description: authStore.profile?.role === 'supplier'
          ? 'Un message restaurant attend une reponse.'
          : 'Un fournisseur a repondu dans la messagerie.',
        to: '/supplier-messages'
      })
    }

    return list
  })

  const unread = computed(() => notifications.value.filter(item => !readIds.value.includes(item.id)))
  const unreadCount = computed(() => unread.value.length)
  const hasUnread = computed(() => unreadCount.value > 0)

  function isRead(id: string) {
    return readIds.value.includes(id)
  }

  function markRead(id: string) {
    if (!readIds.value.includes(id)) {
      readIds.value = [...readIds.value, id]
      persist()
    }
  }

  function markAllRead() {
    readIds.value = Array.from(new Set([...readIds.value, ...notifications.value.map(item => item.id)]))
    persist()
  }

  async function refresh() {
    if (!authStore.isAuthenticated) {
      return
    }

    loading.value = true
    try {
      await Promise.allSettled([
        ingredientStore.load(),
        supplierStore.load(),
        dishStore.load(),
        saleStore.load(),
        purchaseOrderStore.load(),
        supplierMessageStore.load(),
        forecastStore.load(),
        pricingAlertStore.load(),
        authStore.profile ? Promise.resolve() : authStore.loadProfile()
      ])
    } finally {
      loading.value = false
    }
  }

  return {
    notifications,
    unread,
    unreadCount,
    hasUnread,
    loading,
    isRead,
    markRead,
    markAllRead,
    refresh
  }
}

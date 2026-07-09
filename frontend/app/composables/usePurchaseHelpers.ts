import type { Ingredient, PurchaseOrder, PurchaseOrderStatus } from '~/types/business'
import { useSupplierStore } from '~/stores/suppliers'

// Shared, presentation-only helpers for the purchasing module. Both the order
// list page and the guided order-creation page rely on these, so they live in a
// single composable instead of being duplicated across pages.
export function usePurchaseHelpers() {
  const supplierStore = useSupplierStore()

  const statusLabels: Record<PurchaseOrderStatus, string> = {
    draft: 'Brouillon',
    pending_validation: 'En attente de validation',
    validated: 'Validee',
    pending_payment: 'A payer',
    paid: 'Payee',
    delivering: 'En livraison',
    delivered: 'Livree',
    cancelled: 'Annulee',
    sent: 'Envoyee',
    received: 'Receptionnee'
  }

  function roundMoney(value: number) {
    return Number((value || 0).toFixed(2))
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(value || 0))
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

  function getStatusLabel(status: PurchaseOrderStatus) {
    return statusLabels[status] ?? status
  }

  function getStatusClass(status: PurchaseOrderStatus) {
    if (status === 'paid' || status === 'delivered' || status === 'received') {
      return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
    }

    if (status === 'pending_payment') {
      return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200'
    }

    if (status === 'delivering' || status === 'sent' || status === 'validated') {
      return 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200'
    }

    if (status === 'cancelled') {
      return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
    }

    return 'border-[#c0c9ba]/30 bg-[#f3f3f3] text-[#1a1c1c] dark:border-white/10 dark:bg-[#1a1c1c] dark:text-white'
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
    const suppliers = order.suppliers?.length ? order.suppliers : [order.supplier]

    return suppliers
      .map(supplier => typeof supplier === 'object' ? supplier.email : '')
      .filter((email): email is string => Boolean(email))
  }

  function canSendSupplierEmail(order: PurchaseOrder) {
    return getOrderSupplierEmails(order).length > 0 && !['cancelled', 'delivered', 'received'].includes(order.status)
  }

  return {
    roundMoney,
    formatCurrency,
    formatQuantity,
    formatDate,
    getStatusLabel,
    getStatusClass,
    getOrderSupplierIds,
    getOrderSupplierNames,
    getOrderSupplierEmails,
    canSendSupplierEmail
  }
}

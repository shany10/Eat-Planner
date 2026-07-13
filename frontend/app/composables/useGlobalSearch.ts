import { useChargeStore } from '~/stores/charges'
import { useDishStore } from '~/stores/dishes'
import { useIngredientStore } from '~/stores/ingredients'
import { usePurchaseOrderStore } from '~/stores/purchase-orders'
import { useSaleStore } from '~/stores/sales'
import { useSupplierStore } from '~/stores/suppliers'
import { useAuthStore } from '~/stores/auth'

export type SearchEntry = {
  id: string
  icon: string
  label: string
  sublabel: string
  to: string
}

export type SearchGroup = {
  key: string
  label: string
  items: SearchEntry[]
}

// Pages restaurant : reservees aux managers/employes (comme la nav et les
// middlewares). L admin ne doit pas les voir remonter dans la recherche.
const RESTAURANT_NAV_ITEMS: Array<{ label: string, icon: string, to: string }> = [
  { label: 'Dashboard', icon: 'i-lucide-layout-dashboard', to: '/' },
  { label: 'Ingredients', icon: 'i-lucide-wheat', to: '/ingredients' },
  { label: 'Fournisseurs', icon: 'i-lucide-truck', to: '/suppliers' },
  { label: 'Messagerie', icon: 'i-lucide-mails', to: '/supplier-messages' },
  { label: 'Plats', icon: 'i-lucide-utensils', to: '/dishes' },
  { label: 'Carte menu', icon: 'i-lucide-book-open-text', to: '/menu-card' },
  { label: 'Charges', icon: 'i-lucide-receipt', to: '/charges' },
  { label: 'Ventes', icon: 'i-lucide-banknote', to: '/sales' },
  { label: 'Previsions', icon: 'i-lucide-chart-no-axes-combined', to: '/forecasts' },
  { label: 'Achats', icon: 'i-lucide-shopping-cart', to: '/purchase-orders' }
]

const ACCOUNT_NAV_ITEMS: Array<{ label: string, icon: string, to: string }> = [
  { label: 'Mon compte', icon: 'i-lucide-user-round', to: '/account' },
  { label: 'Securite', icon: 'i-lucide-shield-check', to: '/security' }
]

const ADMIN_NAV_ITEMS: Array<{ label: string, icon: string, to: string }> = [
  { label: 'Panel admin', icon: 'i-lucide-users-round', to: '/admin' }
]

const PER_GROUP = 5

export function useGlobalSearch() {
  const authStore = useAuthStore()
  const ingredientStore = useIngredientStore()
  const supplierStore = useSupplierStore()
  const dishStore = useDishStore()
  const chargeStore = useChargeStore()
  const saleStore = useSaleStore()
  const purchaseOrderStore = usePurchaseOrderStore()

  const loading = useState<boolean>('search:loading', () => false)

  const isRestaurantRole = computed(() => {
    const role = authStore.profile?.role
    return role !== 'admin' && role !== 'supplier'
  })

  const navItemsForRole = computed(() => {
    if (authStore.profile?.role === 'admin') {
      return [...ADMIN_NAV_ITEMS, ...ACCOUNT_NAV_ITEMS]
    }

    return [...RESTAURANT_NAV_ITEMS, ...ACCOUNT_NAV_ITEMS]
  })

  function search(term: string): SearchGroup[] {
    const query = term.trim().toLowerCase()
    if (!query) {
      return []
    }

    const matches = (value?: string | null) => Boolean(value && value.toLowerCase().includes(query))
    const groups: SearchGroup[] = []

    const navItems = navItemsForRole.value
      .filter(item => matches(item.label))
      .map<SearchEntry>(item => ({ id: `nav:${item.to}`, icon: item.icon, label: item.label, sublabel: 'Page', to: item.to }))
    if (navItems.length > 0) {
      groups.push({ key: 'nav', label: 'Navigation', items: navItems })
    }

    // Les entites metier n existent que pour un resto : on ne les remonte jamais
    // pour l admin/fournisseur, meme si un store a garde des donnees en memoire.
    if (!isRestaurantRole.value) {
      return groups
    }

    const ingredients = ingredientStore.items
      .filter(item => matches(item.name) || matches(item.category))
      .slice(0, PER_GROUP)
      .map<SearchEntry>(item => ({ id: `ingredient:${item._id}`, icon: 'i-lucide-wheat', label: item.name, sublabel: item.category, to: '/ingredients' }))
    if (ingredients.length > 0) {
      groups.push({ key: 'ingredients', label: 'Ingredients', items: ingredients })
    }

    const suppliers = supplierStore.items
      .filter(item => matches(item.name) || matches(item.contactName) || matches(item.email))
      .slice(0, PER_GROUP)
      .map<SearchEntry>(item => ({ id: `supplier:${item._id}`, icon: 'i-lucide-truck', label: item.name, sublabel: item.contactName || 'Fournisseur', to: '/suppliers' }))
    if (suppliers.length > 0) {
      groups.push({ key: 'suppliers', label: 'Fournisseurs', items: suppliers })
    }

    const dishes = dishStore.items
      .filter(item => matches(item.name) || matches(item.category))
      .slice(0, PER_GROUP)
      .map<SearchEntry>(item => ({ id: `dish:${item._id}`, icon: 'i-lucide-utensils', label: item.name, sublabel: item.category || 'Plat', to: '/dishes' }))
    if (dishes.length > 0) {
      groups.push({ key: 'dishes', label: 'Plats', items: dishes })
    }

    const charges = chargeStore.items
      .filter(item => matches(item.name) || matches(item.category))
      .slice(0, PER_GROUP)
      .map<SearchEntry>(item => ({ id: `charge:${item._id}`, icon: 'i-lucide-receipt', label: item.name, sublabel: item.period === 'monthly' ? 'Mensuel' : 'Journalier', to: '/charges' }))
    if (charges.length > 0) {
      groups.push({ key: 'charges', label: 'Charges', items: charges })
    }

    const orders = purchaseOrderStore.items
      .filter(item => matches(item.orderNumber) || matches(item.status))
      .slice(0, PER_GROUP)
      .map<SearchEntry>(item => ({ id: `order:${item._id}`, icon: 'i-lucide-shopping-cart', label: item.orderNumber || 'Commande', sublabel: 'Achat fournisseur', to: '/purchase-orders' }))
    if (orders.length > 0) {
      groups.push({ key: 'orders', label: 'Achats', items: orders })
    }

    return groups
  }

  async function refresh() {
    if (!authStore.isAuthenticated || !isRestaurantRole.value) {
      return
    }

    loading.value = true
    try {
      await Promise.allSettled([
        ingredientStore.load(),
        supplierStore.load(),
        dishStore.load(),
        chargeStore.load(),
        saleStore.load(),
        purchaseOrderStore.load()
      ])
    } finally {
      loading.value = false
    }
  }

  return { search, refresh, loading }
}

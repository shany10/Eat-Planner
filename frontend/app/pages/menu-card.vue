<script setup lang="ts">
import MenuCardPreview from '~/components/menu-card/MenuCardPreview.vue'
import { getFetchErrorMessage } from '~/utils/fetch-error'
import type { MenuCardCategory, MenuCardDish, MenuCardSettings, MenuDishBadge, MenuTheme } from '~/types/menu-card'
import { useDishStore } from '~/stores/dishes'

definePageMeta({
  middleware: 'manager'
})

const dishStore = useDishStore()
const appToast = useAppToast()

// Largeur de reference du rendu A4 (210 mm a 96 dpi).
const CARD_WIDTH = 794

const settings = reactive<MenuCardSettings>({
  restaurantName: 'Mon restaurant',
  tagline: 'Cuisine maison — produits frais et de saison',
  footerNote: 'Prix nets TTC, service compris. Liste des allergènes disponible sur demande.',
  theme: 'elegant'
})

const categories = ref<MenuCardCategory[]>([])
const loading = ref(true)
const exporting = ref(false)
const errorMessage = ref('')

const themeOptions: Array<{ value: MenuTheme, label: string, description: string }> = [
  { value: 'elegant', label: 'Élégant', description: 'Classique, serif et filets dorés' },
  { value: 'modern', label: 'Moderne', description: 'Minimaliste, sans-serif, accent vert' },
  { value: 'rustic', label: 'Rustique', description: 'Chaleureux, tons bois et cadre' }
]

const badgeOptions: Array<{ value: MenuDishBadge, label: string }> = [
  { value: 'vegetarian', label: 'Végétarien' },
  { value: 'spicy', label: 'Épicé' }
]

// Ordre naturel d une carte pour le premier import ; les categories inconnues
// sont ajoutees a la suite, puis reordonnables a la main.
const CATEGORY_ORDER = ['entrée', 'entrees', 'entrée', 'plat', 'plats', 'dessert', 'desserts', 'boisson', 'boissons']

function categoryRank(name: string) {
  const normalized = name.trim().toLowerCase()
  const index = CATEGORY_ORDER.findIndex(candidate => normalized.startsWith(candidate.slice(0, 4)))
  return index === -1 ? CATEGORY_ORDER.length : index
}

function makeId() {
  return `mc-${Math.random().toString(36).slice(2, 10)}`
}

function blankDish(): MenuCardDish {
  return {
    id: makeId(),
    name: '',
    description: '',
    price: null,
    badges: [],
    allergens: ''
  }
}

/**
 * Construit les categories de la carte depuis les plats actifs de l API
 * (`/api/dishes`, charges par le store Pinia des plats).
 */
function buildCategoriesFromDishes(): MenuCardCategory[] {
  const groups = new Map<string, MenuCardDish[]>()

  for (const dish of dishStore.items) {
    if (!dish.active) {
      continue
    }

    const categoryName = dish.category?.trim() || 'Autres'
    const list = groups.get(categoryName) ?? []
    list.push({
      id: makeId(),
      name: dish.name,
      description: dish.description ?? '',
      price: dish.actualPriceIncludingTax ?? null,
      badges: [],
      allergens: ''
    })
    groups.set(categoryName, list)
  }

  return [...groups.entries()]
    .sort((a, b) => categoryRank(a[0]) - categoryRank(b[0]) || a[0].localeCompare(b[0], 'fr'))
    .map(([name, dishes]) => ({ id: makeId(), name, dishes }))
}

function importFromDishes() {
  categories.value = buildCategoriesFromDishes()

  if (categories.value.length === 0) {
    appToast.info('Aucun plat actif', 'Ajoute des plats actifs dans la page Plats, ou compose la carte a la main.')
  } else {
    appToast.success('Carte importée', `${categories.value.length} catégorie(s) reprises depuis tes plats.`)
  }
}

function addCategory() {
  categories.value.push({ id: makeId(), name: 'Nouvelle catégorie', dishes: [blankDish()] })
}

function removeCategory(index: number) {
  categories.value.splice(index, 1)
}

function moveCategory(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= categories.value.length) {
    return
  }

  const [category] = categories.value.splice(index, 1)
  categories.value.splice(target, 0, category!)
}

function addDish(category: MenuCardCategory) {
  category.dishes.push(blankDish())
}

function addDishFromStore(category: MenuCardCategory, dishId: string) {
  const dish = dishStore.items.find(item => item._id === dishId)
  if (!dish) {
    return
  }

  category.dishes.push({
    id: makeId(),
    name: dish.name,
    description: dish.description ?? '',
    price: dish.actualPriceIncludingTax ?? null,
    badges: [],
    allergens: ''
  })
}

function removeDish(category: MenuCardCategory, index: number) {
  category.dishes.splice(index, 1)
}

function moveDish(category: MenuCardCategory, index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= category.dishes.length) {
    return
  }

  const [dish] = category.dishes.splice(index, 1)
  category.dishes.splice(target, 0, dish!)
}

function toggleBadge(dish: MenuCardDish, badge: MenuDishBadge) {
  if (dish.badges.includes(badge)) {
    dish.badges = dish.badges.filter(item => item !== badge)
  } else {
    dish.badges = [...dish.badges, badge]
  }
}

// ---------- Apercu : mise a l echelle du format A4 dans la colonne ----------
const previewShell = ref<HTMLElement | null>(null)
const previewCard = ref<InstanceType<typeof MenuCardPreview> | null>(null)
const previewScale = ref(1)
const previewHeight = ref(1123)
let resizeObserver: ResizeObserver | null = null

function updatePreviewScale() {
  const shellWidth = previewShell.value?.clientWidth ?? CARD_WIDTH
  const cardHeight = previewCard.value?.root?.offsetHeight ?? 1123
  previewScale.value = Math.min(1, shellWidth / CARD_WIDTH)
  previewHeight.value = cardHeight * previewScale.value
}

// ---------- Export PDF ----------
const exportCard = ref<InstanceType<typeof MenuCardPreview> | null>(null)

async function exportPdf() {
  if (exporting.value) {
    return
  }

  exporting.value = true
  try {
    // La copie plein format (non mise a l echelle) est montee hors ecran
    // uniquement pendant l export, pour que le rendu PDF soit fidele au mm.
    await nextTick()
    const element = exportCard.value?.root
    if (!element) {
      throw new Error('Apercu introuvable')
    }

    // Import dynamique cote client uniquement : html2pdf.js touche `window`
    // des le chargement et casserait le SSR de Nuxt en import statique.
    const { default: html2pdf } = await import('html2pdf.js')

    const filename = `carte-${settings.restaurantName.trim().toLowerCase().replace(/\s+/g, '-') || 'menu'}.pdf`

    await html2pdf()
      .set({
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.97 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: null },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      })
      .from(element)
      .save()

    appToast.success('PDF exporté', `${filename} a été téléchargé.`)
  } catch (error) {
    appToast.error('Export impossible', getFetchErrorMessage(error, 'La génération du PDF a échoué.'))
  } finally {
    exporting.value = false
  }
}

onMounted(async () => {
  try {
    await dishStore.load()
    categories.value = buildCategoriesFromDishes()
  } catch (error) {
    errorMessage.value = getFetchErrorMessage(error, 'Impossible de charger les plats — compose la carte a la main.')
  } finally {
    loading.value = false
  }

  await nextTick()
  resizeObserver = new ResizeObserver(updatePreviewScale)
  if (previewShell.value) {
    resizeObserver.observe(previewShell.value)
  }
  if (previewCard.value?.root) {
    resizeObserver.observe(previewCard.value.root)
  }
  updatePreviewScale()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      eyebrow="Carte imprimable"
      title="Carte menu PDF"
      subtitle="Compose ta carte depuis tes plats, choisis un thème et exporte un PDF A4 prêt à imprimer."
    >
      <template #actions>
        <AppButton
          variant="secondary"
          icon="i-lucide-refresh-cw"
          :disabled="loading || dishStore.pending"
          @click="importFromDishes"
        >
          Réimporter mes plats
        </AppButton>
        <AppButton
          icon="i-lucide-file-down"
          :loading="exporting"
          :disabled="exporting"
          @click="exportPdf"
        >
          Exporter en PDF
        </AppButton>
      </template>
    </PageHeader>

    <p
      v-if="errorMessage"
      class="app-alert-error"
    >
      <UIcon
        name="i-lucide-circle-alert"
        class="mt-0.5 size-4 shrink-0"
      />
      <span>{{ errorMessage }}</span>
    </p>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <!-- ================= Editeur ================= -->
      <div class="space-y-4">
        <section class="app-section space-y-4">
          <h2 class="app-section-title">
            Identité de la carte
          </h2>

          <label class="block space-y-1.5">
            <span class="text-sm font-medium text-[color:var(--ep-text-muted)]">Nom du restaurant</span>
            <input
              v-model="settings.restaurantName"
              class="app-input"
              type="text"
              placeholder="Mon restaurant"
            >
          </label>

          <label class="block space-y-1.5">
            <span class="text-sm font-medium text-[color:var(--ep-text-muted)]">Accroche (sous le titre)</span>
            <input
              v-model="settings.tagline"
              class="app-input"
              type="text"
              placeholder="Cuisine maison — produits frais"
            >
          </label>

          <label class="block space-y-1.5">
            <span class="text-sm font-medium text-[color:var(--ep-text-muted)]">Note de bas de carte</span>
            <input
              v-model="settings.footerNote"
              class="app-input"
              type="text"
              placeholder="Prix nets TTC, service compris."
            >
          </label>

          <div class="space-y-1.5">
            <span class="text-sm font-medium text-[color:var(--ep-text-muted)]">Thème visuel</span>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                v-for="option in themeOptions"
                :key="option.value"
                type="button"
                class="rounded-[var(--ep-radius)] border p-3 text-left transition"
                :class="settings.theme === option.value
                  ? 'border-[color:var(--ep-primary)] bg-[color:var(--ep-primary-soft)]'
                  : 'border-[color:var(--ep-border)] hover:border-[color:var(--ep-border-strong)]'"
                @click="settings.theme = option.value"
              >
                <span class="block text-sm font-semibold text-[color:var(--ep-text)]">{{ option.label }}</span>
                <span class="mt-0.5 block text-xs text-[color:var(--ep-text-subtle)]">{{ option.description }}</span>
              </button>
            </div>
          </div>
        </section>

        <section class="app-section space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h2 class="app-section-title">
                Catégories & plats
              </h2>
              <AppBadge>{{ categories.length }}</AppBadge>
            </div>
            <button
              type="button"
              class="btn-secondary btn-sm"
              @click="addCategory"
            >
              <UIcon
                name="i-lucide-plus"
                class="size-4"
              />
              Catégorie
            </button>
          </div>

          <div
            v-if="loading"
            class="space-y-3"
          >
            <div
              v-for="index in 3"
              :key="index"
              class="h-20 animate-pulse rounded-[var(--ep-radius)] bg-[color:var(--ep-surface-muted)]"
            />
          </div>

          <p
            v-else-if="categories.length === 0"
            class="rounded-[var(--ep-radius)] border border-dashed border-[color:var(--ep-border-strong)] p-4 text-sm text-[color:var(--ep-text-muted)]"
          >
            Aucune catégorie. Importe tes plats ou ajoute une catégorie à la main.
          </p>

          <details
            v-for="(category, categoryIndex) in categories"
            :key="category.id"
            class="rounded-[var(--ep-radius)] border border-[color:var(--ep-border)]"
            open
          >
            <summary class="flex cursor-pointer items-center gap-2 p-3">
              <UIcon
                name="i-lucide-chevron-down"
                class="size-4 shrink-0 text-[color:var(--ep-text-subtle)]"
              />
              <input
                v-model="category.name"
                class="app-input flex-1"
                type="text"
                placeholder="Nom de la catégorie"
                aria-label="Nom de la catégorie"
                @click.stop
              >
              <span class="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  class="btn-ghost btn-sm"
                  :disabled="categoryIndex === 0"
                  aria-label="Monter la catégorie"
                  @click.prevent="moveCategory(categoryIndex, -1)"
                >
                  <UIcon
                    name="i-lucide-arrow-up"
                    class="size-4"
                  />
                </button>
                <button
                  type="button"
                  class="btn-ghost btn-sm"
                  :disabled="categoryIndex === categories.length - 1"
                  aria-label="Descendre la catégorie"
                  @click.prevent="moveCategory(categoryIndex, 1)"
                >
                  <UIcon
                    name="i-lucide-arrow-down"
                    class="size-4"
                  />
                </button>
                <button
                  type="button"
                  class="btn-ghost btn-sm text-[color:var(--ep-error)]"
                  aria-label="Supprimer la catégorie"
                  @click.prevent="removeCategory(categoryIndex)"
                >
                  <UIcon
                    name="i-lucide-trash-2"
                    class="size-4"
                  />
                </button>
              </span>
            </summary>

            <div class="space-y-3 border-t border-[color:var(--ep-border)] p-3">
              <div
                v-for="(dish, dishIndex) in category.dishes"
                :key="dish.id"
                class="space-y-2 rounded-[var(--ep-radius-sm)] bg-[color:var(--ep-surface-muted)] p-3"
              >
                <div class="flex items-center gap-2">
                  <input
                    v-model="dish.name"
                    class="app-input flex-1"
                    type="text"
                    placeholder="Nom du plat"
                    aria-label="Nom du plat"
                  >
                  <input
                    v-model.number="dish.price"
                    class="app-input w-24"
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Prix €"
                    aria-label="Prix TTC"
                  >
                  <span class="flex shrink-0 items-center">
                    <button
                      type="button"
                      class="btn-ghost btn-sm"
                      :disabled="dishIndex === 0"
                      aria-label="Monter le plat"
                      @click="moveDish(category, dishIndex, -1)"
                    >
                      <UIcon
                        name="i-lucide-arrow-up"
                        class="size-4"
                      />
                    </button>
                    <button
                      type="button"
                      class="btn-ghost btn-sm"
                      :disabled="dishIndex === category.dishes.length - 1"
                      aria-label="Descendre le plat"
                      @click="moveDish(category, dishIndex, 1)"
                    >
                      <UIcon
                        name="i-lucide-arrow-down"
                        class="size-4"
                      />
                    </button>
                    <button
                      type="button"
                      class="btn-ghost btn-sm text-[color:var(--ep-error)]"
                      aria-label="Retirer le plat"
                      @click="removeDish(category, dishIndex)"
                    >
                      <UIcon
                        name="i-lucide-x"
                        class="size-4"
                      />
                    </button>
                  </span>
                </div>

                <textarea
                  v-model="dish.description"
                  class="app-input"
                  rows="2"
                  placeholder="Description courte (ingrédients, cuisson…)"
                  aria-label="Description du plat"
                />

                <div class="flex flex-wrap items-center gap-2">
                  <button
                    v-for="badge in badgeOptions"
                    :key="badge.value"
                    type="button"
                    class="rounded-full border px-3 py-1 text-xs font-medium transition"
                    :class="dish.badges.includes(badge.value)
                      ? 'border-[color:var(--ep-primary)] bg-[color:var(--ep-primary-soft)] text-[color:var(--ep-primary-soft-text)]'
                      : 'border-[color:var(--ep-border)] text-[color:var(--ep-text-muted)] hover:border-[color:var(--ep-border-strong)]'"
                    :aria-pressed="dish.badges.includes(badge.value)"
                    @click="toggleBadge(dish, badge.value)"
                  >
                    {{ badge.label }}
                  </button>
                  <input
                    v-model="dish.allergens"
                    class="app-input min-w-40 flex-1"
                    type="text"
                    placeholder="Allergènes (ex : gluten, lactose)"
                    aria-label="Allergènes"
                  >
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="btn-secondary btn-sm"
                  @click="addDish(category)"
                >
                  <UIcon
                    name="i-lucide-plus"
                    class="size-4"
                  />
                  Plat vide
                </button>
                <select
                  v-if="dishStore.items.length > 0"
                  class="app-input flex-1"
                  aria-label="Ajouter un plat depuis mes recettes"
                  :value="''"
                  @change="addDishFromStore(category, ($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''"
                >
                  <option
                    value=""
                    disabled
                  >
                    — Ajouter depuis mes plats —
                  </option>
                  <option
                    v-for="item in dishStore.items"
                    :key="item._id"
                    :value="item._id"
                  >
                    {{ item.name }} ({{ item.category }})
                  </option>
                </select>
              </div>
            </div>
          </details>
        </section>
      </div>

      <!-- ================= Apercu ================= -->
      <section class="app-section space-y-3 xl:sticky xl:top-6 xl:self-start">
        <div class="flex items-center justify-between">
          <h2 class="app-section-title">
            Aperçu A4
          </h2>
          <AppBadge>{{ themeOptions.find(option => option.value === settings.theme)?.label }}</AppBadge>
        </div>

        <div
          ref="previewShell"
          class="overflow-hidden rounded-[var(--ep-radius)] border border-[color:var(--ep-border)] bg-[color:var(--ep-surface-muted)] p-0"
          :style="{ height: `${previewHeight}px` }"
        >
          <div
            class="origin-top-left shadow-lg"
            :style="{ transform: `scale(${previewScale})`, width: '794px' }"
          >
            <MenuCardPreview
              ref="previewCard"
              :settings="settings"
              :categories="categories"
            />
          </div>
        </div>
      </section>
    </div>

    <!--
      Copie plein format montee hors ecran uniquement pendant l export :
      html2canvas capture ce noeud non transforme pour un PDF fidele,
      sans dependre de l echelle d affichage de l apercu.
    -->
    <div
      v-if="exporting"
      aria-hidden="true"
      style="position: fixed; left: -10000px; top: 0;"
    >
      <MenuCardPreview
        ref="exportCard"
        :settings="settings"
        :categories="categories"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MenuCardCategory, MenuCardSettings, MenuDishBadge } from '~/types/menu-card'

/**
 * Rendu imprimable de la carte (format A4 : 794 x 1123 px a 96 dpi).
 *
 * IMPORTANT : tout le style est en CSS scope avec des couleurs hexadecimales.
 * Aucune classe Tailwind ici — html2canvas (utilise par html2pdf.js) ne sait
 * pas interpreter les couleurs oklch() generees par Tailwind 4 et ferait
 * echouer l export. La carte reste volontairement claire quel que soit le
 * theme sombre/clair de l app : c est un document papier.
 */
const props = defineProps<{
  settings: MenuCardSettings
  categories: MenuCardCategory[]
}>()

const root = ref<HTMLElement | null>(null)

const badgeLabels: Record<MenuDishBadge, string> = {
  vegetarian: 'Végétarien',
  spicy: 'Épicé'
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR'
})

const visibleCategories = computed(() =>
  props.categories
    .map(category => ({
      ...category,
      dishes: category.dishes.filter(dish => dish.name.trim().length > 0)
    }))
    .filter(category => category.name.trim().length > 0 && category.dishes.length > 0)
)

function formatPrice(price: number | null) {
  if (price === null || Number.isNaN(price)) {
    return ''
  }

  return currencyFormatter.format(price)
}

defineExpose({ root })
</script>

<template>
  <div
    ref="root"
    class="menu-card"
    :class="`theme-${settings.theme}`"
  >
    <div class="menu-inner">
      <header class="menu-header">
        <p
          v-if="settings.theme !== 'modern'"
          class="menu-ornament"
        >
          ◆
        </p>
        <h1 class="menu-title">
          {{ settings.restaurantName || 'Mon restaurant' }}
        </h1>
        <p
          v-if="settings.tagline"
          class="menu-tagline"
        >
          {{ settings.tagline }}
        </p>
        <div class="menu-header-rule" />
      </header>

      <section
        v-for="category in visibleCategories"
        :key="category.id"
        class="menu-category"
      >
        <h2 class="menu-category-title">
          <span>{{ category.name }}</span>
        </h2>

        <article
          v-for="dish in category.dishes"
          :key="dish.id"
          class="menu-dish"
        >
          <div class="menu-dish-row">
            <h3 class="menu-dish-name">
              {{ dish.name }}
              <span
                v-for="badge in dish.badges"
                :key="badge"
                class="menu-badge"
                :class="`menu-badge-${badge}`"
              >
                {{ badgeLabels[badge] }}
              </span>
            </h3>
            <span class="menu-dish-leader" />
            <span class="menu-dish-price">{{ formatPrice(dish.price) }}</span>
          </div>
          <p
            v-if="dish.description"
            class="menu-dish-description"
          >
            {{ dish.description }}
          </p>
          <p
            v-if="dish.allergens"
            class="menu-dish-allergens"
          >
            Allergènes : {{ dish.allergens }}
          </p>
        </article>
      </section>

      <p
        v-if="visibleCategories.length === 0"
        class="menu-empty"
      >
        Ajoute des catégories et des plats pour composer ta carte.
      </p>

      <footer
        v-if="settings.footerNote"
        class="menu-footer"
      >
        {{ settings.footerNote }}
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* ---------- Structure commune (A4 @ 96 dpi) ---------- */
.menu-card {
  box-sizing: border-box;
  width: 794px;
  min-height: 1123px;
  margin: 0;
  background: #ffffff;
  color: #1c1917;
}

.menu-card *,
.menu-card *::before,
.menu-card *::after {
  box-sizing: border-box;
}

.menu-inner {
  padding: 56px 64px;
}

.menu-header {
  text-align: center;
  margin-bottom: 40px;
}

.menu-title {
  margin: 0;
  font-size: 40px;
  line-height: 1.15;
}

.menu-tagline {
  margin: 10px 0 0;
  font-size: 15px;
}

.menu-ornament {
  margin: 0 0 12px;
  font-size: 12px;
  letter-spacing: 6px;
}

.menu-header-rule {
  margin: 24px auto 0;
}

.menu-category {
  margin-bottom: 34px;
}

.menu-category-title {
  margin: 0 0 18px;
  break-inside: avoid;
  page-break-inside: avoid;
}

.menu-dish {
  margin-bottom: 16px;
  break-inside: avoid;
  page-break-inside: avoid;
}

.menu-dish-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.menu-dish-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.menu-dish-leader {
  flex: 1;
  min-width: 24px;
  border-bottom: 1px dotted #a8a29e;
  transform: translateY(-4px);
}

.menu-dish-price {
  font-size: 16px;
  font-weight: 600;
  white-space: nowrap;
}

.menu-dish-description {
  margin: 4px 0 0;
  max-width: 540px;
  font-size: 13px;
  line-height: 1.5;
}

.menu-dish-allergens {
  margin: 3px 0 0;
  font-size: 11px;
  font-style: italic;
}

.menu-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 8px 2px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  vertical-align: 2px;
}

.menu-badge-vegetarian {
  color: #166534;
  border: 1px solid #16653466;
  background: #f0fdf4;
}

.menu-badge-spicy {
  color: #b91c1c;
  border: 1px solid #b91c1c66;
  background: #fef2f2;
}

.menu-empty {
  margin: 80px 0;
  text-align: center;
  font-size: 14px;
  color: #78716c;
}

.menu-footer {
  margin-top: 48px;
  padding-top: 16px;
  text-align: center;
  font-size: 11.5px;
}

/* ---------- Theme elegant / classique ---------- */
.theme-elegant {
  background: #fdfcf7;
  color: #26221c;
  font-family: Georgia, 'Times New Roman', serif;
}

.theme-elegant .menu-title {
  font-weight: 400;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #232019;
}

.theme-elegant .menu-ornament,
.theme-elegant .menu-tagline {
  color: #9c7c38;
}

.theme-elegant .menu-tagline {
  font-style: italic;
}

.theme-elegant .menu-header-rule {
  width: 180px;
  border-bottom: 1px solid #9c7c38;
}

.theme-elegant .menu-category-title {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 15px;
  font-weight: 400;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  text-align: center;
  color: #6d5a2e;
}

.theme-elegant .menu-category-title::before,
.theme-elegant .menu-category-title::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #d9cfae;
}

.theme-elegant .menu-dish-name {
  font-weight: 700;
  color: #2b261e;
}

.theme-elegant .menu-dish-price {
  color: #6d5a2e;
}

.theme-elegant .menu-dish-description {
  font-style: italic;
  color: #6b6355;
}

.theme-elegant .menu-dish-allergens {
  color: #948a76;
}

.theme-elegant .menu-footer {
  border-top: 1px solid #d9cfae;
  color: #8a7c58;
  font-style: italic;
}

/* ---------- Theme moderne / minimaliste ---------- */
.theme-modern {
  background: #ffffff;
  color: #171717;
  font-family: 'Public Sans', 'Segoe UI', Helvetica, Arial, sans-serif;
}

.theme-modern .menu-header {
  text-align: left;
  margin-bottom: 48px;
}

.theme-modern .menu-title {
  font-size: 44px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.theme-modern .menu-tagline {
  color: #737373;
}

.theme-modern .menu-header-rule {
  margin: 24px 0 0;
  width: 56px;
  border-bottom: 4px solid #005013;
}

.theme-modern .menu-category-title {
  padding-left: 12px;
  border-left: 4px solid #005013;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #005013;
}

.theme-modern .menu-dish-leader {
  border-bottom: none;
}

.theme-modern .menu-dish-price {
  color: #005013;
}

.theme-modern .menu-dish-description {
  color: #6f6f6f;
}

.theme-modern .menu-dish-allergens {
  color: #9c9c9c;
  font-style: normal;
}

.theme-modern .menu-footer {
  border-top: 1px solid #e5e5e5;
  text-align: left;
  color: #8a8a8a;
}

/* ---------- Theme rustique / chaleureux ---------- */
.theme-rustic {
  background: #f8f1e2;
  color: #4a3728;
  font-family: Georgia, 'Book Antiqua', serif;
  padding: 18px;
}

.theme-rustic .menu-inner {
  min-height: 1085px;
  border: 2px solid #8a6a4c;
  outline: 1px solid #c3a889;
  outline-offset: -8px;
  padding: 48px 56px;
}

.theme-rustic .menu-title {
  font-size: 38px;
  font-weight: 700;
  color: #5b4130;
}

.theme-rustic .menu-ornament {
  color: #a0703f;
}

.theme-rustic .menu-tagline {
  color: #8a6a4c;
  font-style: italic;
}

.theme-rustic .menu-header-rule {
  width: 220px;
  border-bottom: 2px dashed #c3a889;
}

.theme-rustic .menu-category-title {
  font-size: 20px;
  font-weight: 700;
  color: #7c5230;
  border-bottom: 2px dashed #c3a889;
  padding-bottom: 6px;
}

.theme-rustic .menu-dish-name {
  color: #4a3728;
}

.theme-rustic .menu-dish-leader {
  border-bottom-color: #b99c7d;
}

.theme-rustic .menu-dish-price {
  color: #a0703f;
  font-weight: 700;
}

.theme-rustic .menu-dish-description {
  color: #77604c;
}

.theme-rustic .menu-dish-allergens {
  color: #9a8368;
}

.theme-rustic .menu-badge-vegetarian {
  background: #eef3e2;
  border-color: #55702f66;
  color: #55702f;
}

.theme-rustic .menu-badge-spicy {
  background: #f9e8de;
  border-color: #a4441d66;
  color: #a4441d;
}

.theme-rustic .menu-footer {
  border-top: 2px dashed #c3a889;
  color: #8a6a4c;
  font-style: italic;
}
</style>

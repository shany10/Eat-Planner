<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import EmptyStateCard from '~/components/common/EmptyStateCard.vue'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth'
})

const authStore = useAuthStore()
const appToast = useAppToast()
const { handleLogout } = useBusinessNav()
const loading = ref(true)
const savingSettings = ref(false)
const errorMessage = ref('')
const settingsForm = reactive({
  restaurantName: '',
  defaultMarginPercent: 72,
  vatPercent: 10
})

const profile = computed(() => authStore.profile)
const fullName = computed(() => {
  if (!profile.value) {
    return 'Compte utilisateur'
  }

  return `${profile.value.firstname} ${profile.value.lastname}`
})

const initials = computed(() => {
  const first = profile.value?.firstname?.[0] || 'U'
  const last = profile.value?.lastname?.[0] || ''
  return `${first}${last}`.toUpperCase()
})

const securityStatus = computed(() => {
  return profile.value?.twoFactorEnabled ? 'Activee' : 'Inactive'
})

const identityFacts = computed(() => [
  { label: 'Role', value: profile.value?.role || '-', icon: 'i-lucide-badge-check' },
  { label: 'Connexion', value: profile.value?.authProvider || '-', icon: 'i-lucide-key-round' },
  { label: 'Compte actif', value: profile.value?.active ? 'Oui' : 'Non', icon: 'i-lucide-circle-check' },
  { label: 'Double auth.', value: securityStatus.value, icon: 'i-lucide-shield' }
])

watch(profile, (value) => {
  settingsForm.restaurantName = value?.restaurantName || 'Mon restaurant'
  settingsForm.defaultMarginPercent = Math.round((value?.defaultMarginRate ?? 0.72) * 100)
  settingsForm.vatPercent = Math.round((value?.vatRate ?? 0.1) * 100)
}, { immediate: true })

function getErrorMessage(error: unknown, fallback: string) {
  return getFetchErrorMessage(error, fallback)
}

async function loadPage() {
  loading.value = true
  errorMessage.value = ''

  try {
    await authStore.loadProfile()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Impossible de charger le profil')
    appToast.error('Profil indisponible', errorMessage.value)
  } finally {
    loading.value = false
  }
}

async function saveAccountSettings() {
  if (!settingsForm.restaurantName.trim()) {
    appToast.error('Nom manquant', 'Renseigne le nom du restaurant.')
    return
  }

  savingSettings.value = true
  errorMessage.value = ''

  try {
    await authStore.updateAccountSettings({
      restaurantName: settingsForm.restaurantName.trim(),
      defaultMarginRate: Number(settingsForm.defaultMarginPercent) / 100,
      vatRate: Number(settingsForm.vatPercent) / 100
    })
    appToast.success('Parametres enregistres', 'La marge globale et la TVA sont a jour.')
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Impossible de mettre a jour les parametres')
    appToast.error('Mise a jour impossible', errorMessage.value)
  } finally {
    savingSettings.value = false
  }
}

function formatPercent(value?: number) {
  return `${Math.round((value ?? 0) * 100)}%`
}

onMounted(loadPage)
</script>

<template>
  <div class="space-y-5">
    <section class="app-page-header app-page-header--compact">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p class="app-eyebrow">
            Profil
          </p>
          <h1 class="app-title mt-2">
            Mon compte
          </h1>
          <p class="app-subtitle mt-2">
            Retrouve ici les informations de connexion du compte, son niveau de securite et les raccourcis utiles pour le gerer proprement.
          </p>
        </div>

        <NuxtLink
          to="/security"
          class="btn-accent shrink-0"
        >
          <UIcon
            name="i-lucide-shield-check"
            class="size-4"
          />
          Gerer la 2FA
        </NuxtLink>
      </div>

      <div class="mt-4 flex flex-wrap gap-2">
        <span class="app-pill">{{ profile?.restaurantName || 'Mon restaurant' }}</span>
        <span class="app-pill">Marge {{ formatPercent(profile?.defaultMarginRate) }}</span>
        <span class="app-pill">TVA {{ formatPercent(profile?.vatRate) }}</span>
        <span class="app-pill">2FA {{ securityStatus }}</span>
      </div>
    </section>

    <div
      v-if="loading"
      class="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]"
    >
      <div class="h-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      <div class="h-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
    </div>

    <template v-else>
      <p
        v-if="errorMessage"
        class="app-alert-error"
      >
        <UIcon
          name="i-lucide-circle-alert"
          class="size-4 shrink-0"
        />
        {{ errorMessage }}
      </p>

      <section class="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="app-section">
          <div class="flex items-center gap-4">
            <div class="flex size-16 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#005013,#0b642a)] text-xl font-bold text-white shadow-sm">
              {{ initials }}
            </div>
            <div class="min-w-0">
              <p class="app-eyebrow">
                Identite
              </p>
              <h2 class="app-section-title mt-1 truncate">
                {{ fullName }}
              </h2>
              <p class="mt-1 truncate text-sm text-[color:var(--ep-text-muted)]">
                {{ profile?.email || 'Email indisponible' }}
              </p>
            </div>
          </div>

          <div class="mt-5 grid gap-2 sm:grid-cols-2">
            <div
              v-for="fact in identityFacts"
              :key="fact.label"
              class="app-inset flex items-center gap-3"
            >
              <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-[color:var(--ep-primary)] dark:bg-[#1a1c1c]">
                <UIcon
                  :name="fact.icon"
                  class="size-4"
                />
              </div>
              <div class="min-w-0">
                <p class="text-xs text-[color:var(--ep-text-muted)]">
                  {{ fact.label }}
                </p>
                <p class="truncate font-semibold text-[color:var(--ep-text)]">
                  {{ fact.value }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <form
          class="app-section"
          @submit.prevent="saveAccountSettings"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="app-eyebrow">
                Restaurant
              </p>
              <h2 class="app-section-title mt-1">
                Parametres de calcul
              </h2>
            </div>
            <span class="app-pill">Compte</span>
          </div>

          <div class="mt-4 grid gap-4">
            <div>
              <label
                for="account-restaurant"
                class="app-label"
              >Nom du restaurant</label>
              <input
                id="account-restaurant"
                v-model="settingsForm.restaurantName"
                class="app-input"
                type="text"
                required
              >
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  for="account-margin"
                  class="app-label"
                >Marge globale (%)</label>
                <input
                  id="account-margin"
                  v-model.number="settingsForm.defaultMarginPercent"
                  class="app-input"
                  type="number"
                  min="0"
                  max="95"
                  step="1"
                  required
                >
                <p class="app-hint">
                  Marge par defaut appliquee aux plats.
                </p>
              </div>

              <div>
                <label
                  for="account-vat"
                  class="app-label"
                >TVA (%)</label>
                <input
                  id="account-vat"
                  v-model.number="settingsForm.vatPercent"
                  class="app-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                >
                <p class="app-hint">
                  Taux utilise pour les calculs TTC.
                </p>
              </div>
            </div>
          </div>

          <button
            class="btn-primary mt-5 w-full"
            :disabled="savingSettings"
          >
            <UIcon
              v-if="savingSettings"
              name="i-lucide-loader-circle"
              class="size-4 animate-spin"
            />
            {{ savingSettings ? 'Enregistrement...' : 'Enregistrer les parametres' }}
          </button>
        </form>
      </section>

      <section class="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div class="app-section">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="app-eyebrow">
                Securite
              </p>
              <h2 class="app-section-title mt-1">
                Niveau de protection
              </h2>
            </div>
            <span
              class="ep-badge"
              :class="profile?.twoFactorEnabled ? 'ep-badge--success' : 'ep-badge--warning'"
            >
              {{ profile?.twoFactorEnabled ? '2FA active' : '2FA inactive' }}
            </span>
          </div>
          <p class="mt-3 text-sm leading-6 text-[color:var(--ep-text-muted)]">
            {{ profile?.twoFactorEnabled
              ? 'Ton compte est deja protege par un code TOTP en plus du mot de passe.'
              : 'Ton compte peut encore etre renforce avec une double authentification TOTP.' }}
          </p>
          <NuxtLink
            to="/security"
            class="btn-accent mt-4"
          >
            <UIcon
              name="i-lucide-shield-check"
              class="size-4"
            />
            {{ profile?.twoFactorEnabled ? 'Voir la securite' : 'Activer la 2FA' }}
          </NuxtLink>
        </div>

        <div class="app-section">
          <p class="app-eyebrow">
            Raccourcis
          </p>
          <h2 class="app-section-title mt-1">
            Gerer le compte
          </h2>
          <div class="mt-4 grid gap-2 sm:grid-cols-2">
            <NuxtLink
              to="/security"
              class="app-inset flex items-center gap-3 transition hover:border-[color:var(--ep-primary-soft-border)]"
            >
              <UIcon
                name="i-lucide-shield"
                class="size-4 shrink-0 text-[color:var(--ep-primary)]"
              />
              <span class="font-medium text-[color:var(--ep-text)]">Configurer la 2FA</span>
            </NuxtLink>
            <NuxtLink
              to="/login"
              class="app-inset flex items-center gap-3 transition hover:border-[color:var(--ep-primary-soft-border)]"
            >
              <UIcon
                name="i-lucide-log-in"
                class="size-4 shrink-0 text-[color:var(--ep-primary)]"
              />
              <span class="font-medium text-[color:var(--ep-text)]">Parcours de connexion</span>
            </NuxtLink>
            <NuxtLink
              to="/"
              class="app-inset flex items-center gap-3 transition hover:border-[color:var(--ep-primary-soft-border)]"
            >
              <UIcon
                name="i-lucide-layout-dashboard"
                class="size-4 shrink-0 text-[color:var(--ep-primary)]"
              />
              <span class="font-medium text-[color:var(--ep-text)]">Revenir au dashboard</span>
            </NuxtLink>
            <button
              type="button"
              class="app-inset flex items-center gap-3 border-[color:rgb(220_38_38/30%)] text-left transition hover:bg-[color:rgb(220_38_38/8%)]"
              @click="handleLogout"
            >
              <UIcon
                name="i-lucide-log-out"
                class="size-4 shrink-0 text-[color:var(--ep-error)]"
              />
              <span class="font-medium text-[color:var(--ep-error)]">Se deconnecter</span>
            </button>
          </div>
        </div>
      </section>

      <EmptyStateCard
        v-if="profile && !profile.twoFactorEnabled"
        eyebrow="Protection recommandee"
        title="La 2FA n est pas encore activee sur ce compte."
        description="Tu peux ajouter une verification TOTP pour proteger les connexions locales et Google. Le flow est deja pret dans la page securite."
        action-label="Configurer la 2FA"
        action-to="/security"
      />
    </template>
  </div>
</template>

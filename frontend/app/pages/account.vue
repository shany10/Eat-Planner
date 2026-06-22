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

const securityStatus = computed(() => {
  return profile.value?.twoFactorEnabled ? 'Activee' : 'Inactive'
})

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
  <div class="p-4 md:p-8 space-y-6 font-sans">
    <section>
      <span class="text-[10px] uppercase tracking-widest font-bold text-[#40493e]/60 dark:text-[#c0c9ba]">Profil</span>
      <h1 class="text-3xl md:text-[32px] md:leading-10 font-bold text-[#1a1c1c] dark:text-[#f1f1f1] font-['Be_Vietnam_Pro',sans-serif] mt-1">
        Mon compte
      </h1>
      <p class="mt-2 max-w-2xl text-sm text-[#40493e] dark:text-[#c0c9ba]">
        Retrouve ici les informations de connexion du compte, son niveau de securite et les raccourcis utiles pour le gerer proprement.
      </p>
      <div class="mt-4 flex flex-wrap gap-3 items-center">
        <NuxtLink
          to="/security"
          class="bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] font-bold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-2"
        >
          Gerer la 2FA
        </NuxtLink>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">{{ profile?.restaurantName || 'Mon restaurant' }}</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">Marge {{ formatPercent(profile?.defaultMarginRate) }}</span>
        <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">TVA {{ formatPercent(profile?.vatRate) }}</span>
      </div>
    </section>

    <div
      v-if="loading"
      class="grid gap-6 lg:grid-cols-3"
    >
      <div class="h-40 animate-pulse rounded-[2.5rem] bg-slate-200 dark:bg-slate-800" />
      <div class="h-40 animate-pulse rounded-[2.5rem] bg-slate-200 dark:bg-slate-800" />
      <div class="h-40 animate-pulse rounded-[2.5rem] bg-slate-200 dark:bg-slate-800" />
    </div>

    <template v-else>
      <p
        v-if="errorMessage"
        class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
      >
        {{ errorMessage }}
      </p>

      <section class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5 bg-white dark:bg-[#1a1c1c] p-6 shadow-sm">
          <div class="flex items-center justify-between gap-4">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-widest text-[#40493e]/60 dark:text-[#c0c9ba]/60">
                Identite
              </span>
              <h2 class="mt-2 text-2xl font-bold text-[#1a1c1c] dark:text-white">
                {{ fullName }}
              </h2>
              <p class="mt-2 text-sm text-[#40493e] dark:text-[#c0c9ba]">
                {{ profile?.email || 'Email indisponible' }}
              </p>
            </div>
            <div class="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-[#6b3414] text-xl font-bold text-white">
              {{ profile?.firstname?.[0] || 'U' }}{{ profile?.lastname?.[0] || '' }}
            </div>
          </div>

          <div class="mt-6 grid gap-3 md:grid-cols-2">
            <div class="rounded-3xl bg-[#f3f3f3] dark:bg-[#2f3131] p-4 border border-[#c0c9ba]/20 dark:border-white/5">
              <p class="text-sm text-[#40493e] dark:text-[#c0c9ba]">
                Role
              </p>
              <p class="mt-2 font-bold text-[#1a1c1c] dark:text-white">
                {{ profile?.role || '-' }}
              </p>
            </div>
            <div class="rounded-3xl bg-[#f3f3f3] dark:bg-[#2f3131] p-4 border border-[#c0c9ba]/20 dark:border-white/5">
              <p class="text-sm text-[#40493e] dark:text-[#c0c9ba]">
                Fournisseur de connexion
              </p>
              <p class="mt-2 font-bold text-[#1a1c1c] dark:text-white">
                {{ profile?.authProvider || '-' }}
              </p>
            </div>
            <div class="rounded-3xl bg-[#f3f3f3] dark:bg-[#2f3131] p-4 border border-[#c0c9ba]/20 dark:border-white/5">
              <p class="text-sm text-[#40493e] dark:text-[#c0c9ba]">
                Compte actif
              </p>
              <p class="mt-2 font-bold text-[#1a1c1c] dark:text-white">
                {{ profile?.active ? 'Oui' : 'Non' }}
              </p>
            </div>
            <div class="rounded-3xl bg-[#f3f3f3] dark:bg-[#2f3131] p-4 border border-[#c0c9ba]/20 dark:border-white/5">
              <p class="text-sm text-[#40493e] dark:text-[#c0c9ba]">
                Double authentification
              </p>
              <p class="mt-2 font-bold text-[#1a1c1c] dark:text-white">
                {{ securityStatus }}
              </p>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <form
            class="rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5 bg-white dark:bg-[#1a1c1c] p-6 shadow-sm"
            @submit.prevent="saveAccountSettings"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-widest text-[#40493e]/60 dark:text-[#c0c9ba]/60">
                  Restaurant
                </span>
                <h2 class="mt-2 text-xl font-bold text-[#1a1c1c] dark:text-white">
                  Parametres de calcul
                </h2>
              </div>
              <span class="px-3 py-1 bg-[#e8e8e8] dark:bg-[#2f3131] text-[#40493e] dark:text-[#c0c9ba] text-[11px] font-bold rounded-full border border-[#c0c9ba]/20 dark:border-white/10">Compte</span>
            </div>

            <div class="mt-5 grid gap-3">
              <label class="grid gap-2 text-sm">
                <span class="text-[#40493e] dark:text-[#c0c9ba] font-medium">Nom du restaurant</span>
                <input
                  v-model="settingsForm.restaurantName"
                  class="bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
                  type="text"
                  required
                >
              </label>

              <div class="grid gap-3 sm:grid-cols-2">
                <label class="grid gap-2 text-sm">
                  <span class="text-[#40493e] dark:text-[#c0c9ba] font-medium">Marge globale (%)</span>
                  <input
                    v-model.number="settingsForm.defaultMarginPercent"
                    class="bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
                    type="number"
                    min="0"
                    max="95"
                    step="1"
                    required
                  >
                </label>

                <label class="grid gap-2 text-sm">
                  <span class="text-[#40493e] dark:text-[#c0c9ba] font-medium">TVA (%)</span>
                  <input
                    v-model.number="settingsForm.vatPercent"
                    class="bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#feb236]"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                  >
                </label>
              </div>
            </div>

            <button
              class="mt-5 w-full bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] font-bold px-4 py-3 rounded-full shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="savingSettings"
            >
              {{ savingSettings ? 'Enregistrement...' : 'Enregistrer les parametres' }}
            </button>
          </form>

          <div class="rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5 bg-white dark:bg-[#1a1c1c] p-6 shadow-sm">
            <h2 class="text-xl font-bold text-[#1a1c1c] dark:text-white">
              Raccourcis compte
            </h2>
            <div class="mt-5 grid gap-3">
              <NuxtLink
                to="/security"
                class="rounded-3xl border border-[#c0c9ba]/20 dark:border-white/5 bg-[#f3f3f3] dark:bg-[#2f3131] px-4 py-4 font-medium text-[#1a1c1c] dark:text-white transition-all hover:shadow-md"
              >
                Configurer la securite 2FA
              </NuxtLink>
              <NuxtLink
                to="/login"
                class="rounded-3xl border border-[#c0c9ba]/20 dark:border-white/5 bg-[#f3f3f3] dark:bg-[#2f3131] px-4 py-4 font-medium text-[#1a1c1c] dark:text-white transition-all hover:shadow-md"
              >
                Retester le parcours de connexion
              </NuxtLink>
              <NuxtLink
                to="/"
                class="rounded-3xl border border-[#c0c9ba]/20 dark:border-white/5 bg-[#f3f3f3] dark:bg-[#2f3131] px-4 py-4 font-medium text-[#1a1c1c] dark:text-white transition-all hover:shadow-md"
              >
                Revenir au dashboard
              </NuxtLink>
              <button
                type="button"
                class="flex items-center gap-2 rounded-3xl border border-[#ba1a1a]/30 px-4 py-4 text-left font-medium text-[#ba1a1a] dark:text-[#ff897d] transition-all hover:bg-[#ba1a1a]/10"
                @click="handleLogout"
              >
                <UIcon
                  name="i-lucide-log-out"
                  class="size-4 shrink-0"
                />
                Se deconnecter
              </button>
            </div>
          </div>

          <div class="rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5 bg-white dark:bg-[#1a1c1c] p-6 shadow-sm">
            <h2 class="text-xl font-bold text-[#1a1c1c] dark:text-white">
              Niveau de securite
            </h2>
            <p class="mt-2 text-sm leading-6 text-[#40493e] dark:text-[#c0c9ba]">
              {{ profile?.twoFactorEnabled
                ? 'Ton compte est deja protege par un code TOTP en plus du mot de passe.'
                : 'Ton compte peut encore etre renforce avec une double authentification TOTP.' }}
            </p>
            <NuxtLink
              to="/security"
              class="mt-5 inline-flex rounded-full bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] px-6 py-2.5 text-sm font-bold transition-all shadow-sm hover:shadow-md"
            >
              {{ profile?.twoFactorEnabled ? 'Voir la securite' : 'Activer la 2FA' }}
            </NuxtLink>
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

<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import QRCode from 'qrcode'
import EmptyStateCard from '~/components/common/EmptyStateCard.vue'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth'
})

type SetupState = {
  issuer: string
  secret: string
  otpauthUrl: string
  qrCodeDataUrl: string
}

const authStore = useAuthStore()
const appToast = useAppToast()

const loading = ref(true)
const setupPending = ref(false)
const enablePending = ref(false)
const disablePending = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const setupState = ref<SetupState | null>(null)
const enableCode = ref('')
const disableCode = ref('')

const profile = computed(() => authStore.profile)
const twoFactorEnabled = computed(() => Boolean(profile.value?.twoFactorEnabled))

function getErrorMessage(error: unknown, fallback: string) {
  return getFetchErrorMessage(error, fallback)
}

function clearFeedback() {
  errorMessage.value = ''
  successMessage.value = ''
}

async function loadPage() {
  loading.value = true
  clearFeedback()

  try {
    await authStore.loadProfile()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Impossible de charger la securite du compte')
    appToast.error('Chargement impossible', errorMessage.value)
  } finally {
    loading.value = false
  }
}

async function initializeTwoFactor() {
  setupPending.value = true
  clearFeedback()

  try {
    const response = await authStore.setupTwoFactor()
    const qrCodeDataUrl = await QRCode.toDataURL(response.otpauthUrl, {
      width: 240,
      margin: 1
    })

    setupState.value = {
      issuer: response.issuer,
      secret: response.secret,
      otpauthUrl: response.otpauthUrl,
      qrCodeDataUrl
    }

    successMessage.value = 'Secret 2FA initialise. Scanne le QR code puis valide avec un code TOTP.'
    appToast.success('Secret 2FA pret', 'Scanne le QR code puis valide avec ton code TOTP.')
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Impossible d initialiser la 2FA')
    appToast.error('Initialisation impossible', errorMessage.value)
  } finally {
    setupPending.value = false
  }
}

async function enableTwoFactor() {
  enablePending.value = true
  clearFeedback()

  try {
    await authStore.enableTwoFactor(enableCode.value)
    setupState.value = null
    enableCode.value = ''
    successMessage.value = '2FA activee avec succes sur ce compte.'
    appToast.success('2FA activee', 'Ton compte est mieux protege.')
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Impossible d activer la 2FA')
    appToast.error('Activation impossible', errorMessage.value)
  } finally {
    enablePending.value = false
  }
}

async function disableTwoFactor() {
  disablePending.value = true
  clearFeedback()

  try {
    await authStore.disableTwoFactor(disableCode.value)
    disableCode.value = ''
    setupState.value = null
    successMessage.value = '2FA desactivee sur ce compte.'
    appToast.success('2FA desactivee', 'La connexion ne demandera plus de code TOTP.')
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Impossible de desactiver la 2FA')
    appToast.error('Desactivation impossible', errorMessage.value)
  } finally {
    disablePending.value = false
  }
}

async function copyText(value: string, label: string) {
  if (!import.meta.client || !navigator.clipboard) {
    appToast.warning('Copie indisponible', 'Le presse-papiers n est pas accessible dans ce contexte.')
    return
  }

  await navigator.clipboard.writeText(value)
  successMessage.value = `${label} copie dans le presse-papiers.`
  appToast.success('Copie effectuee', `${label} est dans le presse-papiers.`)
}

onMounted(loadPage)
</script>

<template>
  <div class="p-4 md:p-8 space-y-6 font-sans">
    <section>
      <span class="text-[10px] uppercase tracking-widest font-bold text-[#40493e]/60 dark:text-[#c0c9ba]">Compte</span>
      <h1 class="text-3xl md:text-[32px] md:leading-10 font-bold text-[#1a1c1c] dark:text-[#f1f1f1] font-['Be_Vietnam_Pro',sans-serif] mt-1">
        Securite et double authentification
      </h1>
      <p class="mt-2 max-w-2xl text-sm text-[#40493e] dark:text-[#c0c9ba]">
        Gere ici l etat de la 2FA TOTP pour ton compte. Le backend est deja pret, cette page remet simplement l option dans le produit.
      </p>
      <div class="mt-4 flex flex-wrap gap-3">
        <NuxtLink
          to="/account"
          class="border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white font-bold py-2.5 px-6 rounded-full hover:bg-[#f3f3f3] dark:hover:bg-[#2f3131] transition-all flex items-center gap-2"
        >
          Retour au compte
        </NuxtLink>
        <a
          v-if="!twoFactorEnabled"
          href="#setup-2fa"
          class="bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] font-bold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-2"
        >
          Activer la 2FA
        </a>
        <a
          v-else
          href="#disable-2fa"
          class="border border-[#707a6d] dark:border-[#c0c9ba] text-[#1a1c1c] dark:text-white font-bold py-2.5 px-6 rounded-full hover:bg-[#f3f3f3] dark:hover:bg-[#2f3131] transition-all flex items-center gap-2"
        >
          Desactiver la 2FA
        </a>
      </div>
    </section>

    <div
      v-if="loading"
      class="grid gap-6 lg:grid-cols-2"
    >
      <div class="h-48 animate-pulse rounded-[2.5rem] bg-slate-200 dark:bg-slate-800" />
      <div class="h-48 animate-pulse rounded-[2.5rem] bg-slate-200 dark:bg-slate-800" />
    </div>

    <template v-else>
      <p
        v-if="errorMessage"
        class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
      >
        {{ errorMessage }}
      </p>

      <p
        v-if="successMessage"
        class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
      >
        {{ successMessage }}
      </p>

      <section class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5 bg-white dark:bg-[#1a1c1c] p-6 shadow-sm">
          <h2 class="text-xl font-bold text-[#1a1c1c] dark:text-white">
            Etat du compte
          </h2>
          <div class="mt-5 grid gap-3 md:grid-cols-2">
            <div class="rounded-3xl bg-[#f3f3f3] dark:bg-[#2f3131] p-4 border border-[#c0c9ba]/20 dark:border-white/5">
              <p class="text-sm text-[#40493e] dark:text-[#c0c9ba]">
                Email
              </p>
              <p class="mt-2 font-bold text-[#1a1c1c] dark:text-white break-all">
                {{ profile?.email || '-' }}
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
                Role
              </p>
              <p class="mt-2 font-bold text-[#1a1c1c] dark:text-white">
                {{ profile?.role || '-' }}
              </p>
            </div>
            <div class="rounded-3xl bg-[#f3f3f3] dark:bg-[#2f3131] p-4 border border-[#c0c9ba]/20 dark:border-white/5">
              <p class="text-sm text-[#40493e] dark:text-[#c0c9ba]">
                2FA
              </p>
              <p class="mt-2 font-bold text-[#1a1c1c] dark:text-white">
                {{ twoFactorEnabled ? 'Activee' : 'Inactive' }}
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5 bg-white dark:bg-[#1a1c1c] p-6 shadow-sm">
          <h2 class="text-xl font-bold text-[#1a1c1c] dark:text-white">
            Liens utiles
          </h2>
          <div class="mt-5 grid gap-3">
            <NuxtLink
              to="/account"
              class="rounded-3xl border border-[#c0c9ba]/20 dark:border-white/5 bg-[#f3f3f3] dark:bg-[#2f3131] px-4 py-4 font-medium text-[#1a1c1c] dark:text-white transition-all hover:shadow-md"
            >
              Revenir a mon compte
            </NuxtLink>
            <NuxtLink
              to="/login"
              class="rounded-3xl border border-[#c0c9ba]/20 dark:border-white/5 bg-[#f3f3f3] dark:bg-[#2f3131] px-4 py-4 font-medium text-[#1a1c1c] dark:text-white transition-all hover:shadow-md"
            >
              Tester le login avec 2FA
            </NuxtLink>
            <NuxtLink
              to="/"
              class="rounded-3xl border border-[#c0c9ba]/20 dark:border-white/5 bg-[#f3f3f3] dark:bg-[#2f3131] px-4 py-4 font-medium text-[#1a1c1c] dark:text-white transition-all hover:shadow-md"
            >
              Revenir au dashboard
            </NuxtLink>
          </div>
        </div>
      </section>

      <section
        v-if="!twoFactorEnabled"
        id="setup-2fa"
        class="scroll-mt-28 space-y-6"
      >
        <div class="rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5 bg-white dark:bg-[#1a1c1c] p-6 shadow-sm">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 class="text-xl font-bold text-[#1a1c1c] dark:text-white">
                Activation de la 2FA
              </h2>
              <p class="mt-1 text-sm text-[#40493e] dark:text-[#c0c9ba]">
                Initialise un secret, scanne le QR code avec ton application TOTP, puis saisis le code a 6 chiffres.
              </p>
            </div>
            <button
              class="bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] font-bold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="setupPending"
              @click="initializeTwoFactor"
            >
              {{ setupPending ? 'Initialisation...' : (setupState ? 'Regenerer le secret' : 'Initialiser la 2FA') }}
            </button>
          </div>
        </div>

        <EmptyStateCard
          v-if="!setupState"
          eyebrow="Setup"
          title="La 2FA n est pas encore preparee pour ce compte."
          description="Clique sur Initialiser la 2FA pour generer un QR code localement et activer la verification TOTP."
        />

        <div
          v-else
          class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <div class="rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5 bg-white dark:bg-[#1a1c1c] p-6 shadow-sm">
            <h3 class="text-lg font-bold text-[#1a1c1c] dark:text-white">
              QR code TOTP
            </h3>
            <div class="mt-5 flex justify-center rounded-3xl bg-[#f3f3f3] dark:bg-[#2f3131] p-4">
              <img
                :src="setupState.qrCodeDataUrl"
                alt="QR code 2FA"
                class="h-56 w-56 rounded-2xl bg-white p-2"
              >
            </div>
          </div>

          <div class="rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5 bg-white dark:bg-[#1a1c1c] p-6 shadow-sm">
            <h3 class="text-lg font-bold text-[#1a1c1c] dark:text-white">
              Validation du secret
            </h3>
            <div class="mt-5 space-y-4">
              <div class="rounded-3xl bg-[#f3f3f3] dark:bg-[#2f3131] p-4 border border-[#c0c9ba]/20 dark:border-white/5">
                <p class="text-sm text-[#40493e] dark:text-[#c0c9ba]">
                  Secret manuel
                </p>
                <p class="mt-2 break-all font-mono text-sm text-[#1a1c1c] dark:text-white">
                  {{ setupState.secret }}
                </p>
                <button
                  class="mt-3 rounded-full border border-[#707a6d] dark:border-[#c0c9ba] px-4 py-1.5 text-xs font-bold text-[#1a1c1c] dark:text-white hover:bg-[#e8e8e8] dark:hover:bg-[#3a3d3d] transition-all"
                  @click="copyText(setupState.secret, 'Secret 2FA')"
                >
                  Copier le secret
                </button>
              </div>

              <div class="rounded-3xl bg-[#f3f3f3] dark:bg-[#2f3131] p-4 border border-[#c0c9ba]/20 dark:border-white/5">
                <p class="text-sm text-[#40493e] dark:text-[#c0c9ba]">
                  Lien otpauth
                </p>
                <p class="mt-2 break-all font-mono text-xs text-[#1a1c1c] dark:text-white">
                  {{ setupState.otpauthUrl }}
                </p>
                <button
                  class="mt-3 rounded-full border border-[#707a6d] dark:border-[#c0c9ba] px-4 py-1.5 text-xs font-bold text-[#1a1c1c] dark:text-white hover:bg-[#e8e8e8] dark:hover:bg-[#3a3d3d] transition-all"
                  @click="copyText(setupState.otpauthUrl, 'Lien otpauth')"
                >
                  Copier le lien
                </button>
              </div>

              <form
                class="space-y-3"
                @submit.prevent="enableTwoFactor"
              >
                <label class="block text-sm font-medium text-[#40493e] dark:text-[#c0c9ba]">
                  Code TOTP a 6 chiffres
                </label>
                <input
                  v-model.trim="enableCode"
                  class="w-full bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-[#feb236]"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]{6}"
                  maxlength="6"
                  minlength="6"
                  required
                >
                <button
                  class="bg-[#feb236] text-[#6d4700] hover:bg-[#ffc059] font-bold py-2.5 px-6 rounded-full shadow-sm hover:shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  :disabled="enablePending"
                >
                  {{ enablePending ? 'Activation...' : 'Activer la 2FA' }}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section
        v-else
        id="disable-2fa"
        class="scroll-mt-28 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
      >
        <div class="rounded-[2.5rem] border border-[#005013]/20 bg-[#005013]/5 p-6 dark:border-[#8ad986]/20 dark:bg-[#8ad986]/10">
          <h2 class="text-xl font-bold text-[#005013] dark:text-[#8ad986]">
            2FA activee
          </h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-[#40493e] dark:text-[#c0c9ba]">
            Ce compte demande maintenant un code TOTP apres la saisie du mot de passe ou apres un login Google.
          </p>
        </div>

        <div class="rounded-[2.5rem] border border-[#c0c9ba]/20 dark:border-white/5 bg-white dark:bg-[#1a1c1c] p-6 shadow-sm">
          <h2 class="text-xl font-bold text-[#1a1c1c] dark:text-white">
            Desactiver la 2FA
          </h2>
          <p class="mt-1 text-sm text-[#40493e] dark:text-[#c0c9ba]">
            Saisis un code valide de ton application TOTP pour confirmer la desactivation.
          </p>
          <form
            class="mt-5 space-y-3"
            @submit.prevent="disableTwoFactor"
          >
            <input
              v-model.trim="disableCode"
              class="w-full bg-[#f3f3f3] dark:bg-[#2f3131] border border-[#c0c9ba]/30 dark:border-white/10 text-[#1a1c1c] dark:text-white rounded-full px-4 py-2.5 text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-[#feb236]"
              type="text"
              inputmode="numeric"
              pattern="[0-9]{6}"
              maxlength="6"
              minlength="6"
              required
            >
            <button
              class="border border-[#ba1a1a]/40 text-[#ba1a1a] dark:text-[#ff897d] font-bold px-6 py-2.5 rounded-full hover:bg-[#ba1a1a]/10 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="disablePending"
            >
              {{ disablePending ? 'Desactivation...' : 'Desactiver la 2FA' }}
            </button>
          </form>
        </div>
      </section>
    </template>
  </div>
</template>

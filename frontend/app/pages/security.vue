<script setup lang="ts">
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

function getErrorMessage(error: any, fallback: string) {
  return error?.data?.message || error?.statusMessage || fallback
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
  } catch (error: any) {
    errorMessage.value = getErrorMessage(error, 'Impossible de charger la securite du compte')
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
  } catch (error: any) {
    errorMessage.value = getErrorMessage(error, 'Impossible d initialiser la 2FA')
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
  } catch (error: any) {
    errorMessage.value = getErrorMessage(error, 'Impossible d activer la 2FA')
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
  } catch (error: any) {
    errorMessage.value = getErrorMessage(error, 'Impossible de desactiver la 2FA')
  } finally {
    disablePending.value = false
  }
}

async function copyText(value: string, label: string) {
  if (!import.meta.client || !navigator.clipboard) {
    return
  }

  await navigator.clipboard.writeText(value)
  successMessage.value = `${label} copie dans le presse-papiers.`
}

onMounted(loadPage)
</script>

<template>
  <div class="space-y-8">
    <section class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p class="text-xs uppercase tracking-[0.3em] text-slate-500">
        Compte
      </p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight">
        Securite et double authentification
      </h1>
      <p class="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
        Gere ici l etat de la 2FA TOTP pour ton compte. Le backend est deja pret, cette page remet simplement l option dans le produit.
      </p>
      <div class="mt-6 flex flex-wrap gap-3">
        <NuxtLink
          to="/account"
          class="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Retour au compte
        </NuxtLink>
        <a
          v-if="!twoFactorEnabled"
          href="#setup-2fa"
          class="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Activer la 2FA
        </a>
        <a
          v-else
          href="#disable-2fa"
          class="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Desactiver la 2FA
        </a>
      </div>
    </section>

    <div
      v-if="loading"
      class="grid gap-4 lg:grid-cols-2"
    >
      <div class="h-48 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div class="h-48 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
    </div>

    <template v-else>
      <p
        v-if="errorMessage"
        class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
      >
        {{ errorMessage }}
      </p>

      <p
        v-if="successMessage"
        class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
      >
        {{ successMessage }}
      </p>

      <section class="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 class="text-xl font-semibold">
            Etat du compte
          </h2>
          <div class="mt-5 grid gap-3 md:grid-cols-2">
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                Email
              </p>
              <p class="mt-2 font-medium">
                {{ profile?.email || '-' }}
              </p>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                Fournisseur de connexion
              </p>
              <p class="mt-2 font-medium">
                {{ profile?.authProvider || '-' }}
              </p>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                Role
              </p>
              <p class="mt-2 font-medium">
                {{ profile?.role || '-' }}
              </p>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <p class="text-sm text-slate-500">
                2FA
              </p>
              <p class="mt-2 font-medium">
                {{ twoFactorEnabled ? 'Activee' : 'Inactive' }}
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 class="text-xl font-semibold">
            Liens utiles
          </h2>
          <div class="mt-5 grid gap-3">
            <NuxtLink
              to="/account"
              class="rounded-2xl border border-slate-200 px-4 py-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-950"
            >
              Revenir a mon compte
            </NuxtLink>
            <NuxtLink
              to="/login"
              class="rounded-2xl border border-slate-200 px-4 py-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-950"
            >
              Tester le login avec 2FA
            </NuxtLink>
            <NuxtLink
              to="/"
              class="rounded-2xl border border-slate-200 px-4 py-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-950"
            >
              Revenir au dashboard
            </NuxtLink>
          </div>
        </div>
      </section>

      <section
        v-if="!twoFactorEnabled"
        id="setup-2fa"
        class="scroll-mt-28 space-y-4"
      >
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 class="text-xl font-semibold">
                Activation de la 2FA
              </h2>
              <p class="mt-1 text-sm text-slate-500">
                Initialise un secret, scanne le QR code avec ton application TOTP, puis saisis le code a 6 chiffres.
              </p>
            </div>
            <button
              class="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
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
          class="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]"
        >
          <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 class="text-lg font-semibold">
              QR code TOTP
            </h3>
            <div class="mt-5 flex justify-center rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
              <img
                :src="setupState.qrCodeDataUrl"
                alt="QR code 2FA"
                class="h-56 w-56 rounded-xl bg-white p-2"
              >
            </div>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 class="text-lg font-semibold">
              Validation du secret
            </h3>
            <div class="mt-5 space-y-4">
              <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                <p class="text-sm text-slate-500">
                  Secret manuel
                </p>
                <p class="mt-2 break-all font-mono text-sm">
                  {{ setupState.secret }}
                </p>
                <button
                  class="mt-3 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  @click="copyText(setupState.secret, 'Secret 2FA')"
                >
                  Copier le secret
                </button>
              </div>

              <div class="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                <p class="text-sm text-slate-500">
                  Lien otpauth
                </p>
                <p class="mt-2 break-all font-mono text-xs">
                  {{ setupState.otpauthUrl }}
                </p>
                <button
                  class="mt-3 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  @click="copyText(setupState.otpauthUrl, 'Lien otpauth')"
                >
                  Copier le lien
                </button>
              </div>

              <form
                class="space-y-3"
                @submit.prevent="enableTwoFactor"
              >
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Code TOTP a 6 chiffres
                </label>
                <input
                  v-model.trim="enableCode"
                  class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]{6}"
                  maxlength="6"
                  minlength="6"
                  required
                >
                <button
                  class="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
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
        class="scroll-mt-28 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]"
      >
        <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <h2 class="text-xl font-semibold text-emerald-900 dark:text-emerald-100">
            2FA activee
          </h2>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-emerald-800 dark:text-emerald-200">
            Ce compte demande maintenant un code TOTP apres la saisie du mot de passe ou apres un login Google.
          </p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 class="text-xl font-semibold">
            Desactiver la 2FA
          </h2>
          <p class="mt-1 text-sm text-slate-500">
            Saisis un code valide de ton application TOTP pour confirmer la desactivation.
          </p>
          <form
            class="mt-5 space-y-3"
            @submit.prevent="disableTwoFactor"
          >
            <input
              v-model.trim="disableCode"
              class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              type="text"
              inputmode="numeric"
              pattern="[0-9]{6}"
              maxlength="6"
              minlength="6"
              required
            >
            <button
              class="rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
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

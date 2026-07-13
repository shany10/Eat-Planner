<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'guest'
})

type GoogleCredentialResponse = {
  credential?: string
}

type GoogleAccountsIdApi = {
  initialize: (options: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
  }) => void
  renderButton: (element: HTMLElement, options: Record<string, unknown>) => void
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsIdApi
      }
    }
  }
}

const runtimeConfig = useRuntimeConfig()
const googleClientId = runtimeConfig.public.googleClientId
const authStore = useAuthStore()
const appToast = useAppToast()
const requiresTwoFactor = computed(() => authStore.requiresTwoFactor)

const form = reactive({
  email: '',
  password: ''
})

const twoFactorForm = reactive({
  code: ''
})

const pending = ref(false)
const googlePending = ref(false)
const errorMessage = ref('')
const googleButtonRef = ref<HTMLElement | null>(null)

function getErrorMessage(error: unknown, fallback: string) {
  return getFetchErrorMessage(error, fallback)
}

async function navigateAfterLogin() {
  await authStore.loadProfile()
  const role = authStore.profile?.role
  const destination = role === 'supplier'
    ? '/supplier-messages'
    : role === 'admin'
      ? '/admin'
      : '/'
  await navigateTo(destination)
}

async function handleSubmit() {
  errorMessage.value = ''
  pending.value = true

  try {
    await authStore.login(form)
    if (authStore.isAuthenticated) {
      appToast.success('Connexion reussie', 'Bienvenue dans Eat Planner.')
      await navigateAfterLogin()
    } else if (authStore.requiresTwoFactor) {
      appToast.info('Code 2FA requis', 'Entre ton code de verification pour terminer la connexion.')
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Login failed')
    appToast.error('Connexion impossible', errorMessage.value)
  } finally {
    pending.value = false
  }
}

async function handleTwoFactorSubmit() {
  errorMessage.value = ''
  pending.value = true

  try {
    await authStore.verifyTwoFactor(twoFactorForm.code)
    appToast.success('Connexion confirmee', 'Le code 2FA est valide.')
    await navigateAfterLogin()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Code 2FA invalide')
    appToast.error('Code 2FA invalide', errorMessage.value)
  } finally {
    pending.value = false
  }
}

function cancelTwoFactorStep() {
  authStore.resetTwoFactor()
  twoFactorForm.code = ''
  errorMessage.value = ''
}

async function handleGoogleCredential(response: GoogleCredentialResponse) {
  const idToken = response.credential
  if (!idToken) {
    errorMessage.value = 'Google n a pas retourne de token'
    appToast.error('Google Sign-In incomplet', errorMessage.value)
    return
  }

  errorMessage.value = ''
  googlePending.value = true

  try {
    await authStore.loginWithGoogle({ idToken })
    if (authStore.isAuthenticated) {
      appToast.success('Connexion Google reussie', 'Bienvenue dans Eat Planner.')
      await navigateAfterLogin()
    } else if (authStore.requiresTwoFactor) {
      appToast.info('Code 2FA requis', 'Entre ton code de verification pour terminer la connexion.')
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Google login failed')
    appToast.error('Connexion Google impossible', errorMessage.value)
  } finally {
    googlePending.value = false
  }
}

async function loadGoogleScript() {
  if (window.google?.accounts?.id) return

  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('google-identity-script') as HTMLScriptElement | null
    if (existing) {
      if (window.google?.accounts?.id) {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Google script load failed')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = 'google-identity-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google script load failed'))

    document.head.appendChild(script)
  })
}

function setupGoogleButton() {
  const google = window.google?.accounts?.id
  if (!google || !googleButtonRef.value || !googleClientId) return

  google.initialize({
    client_id: googleClientId,
    callback: handleGoogleCredential
  })

  google.renderButton(googleButtonRef.value, {
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    width: 320
  })
}

onMounted(async () => {
  if (!googleClientId) return

  try {
    await loadGoogleScript()
    setupGoogleButton()
  } catch {
    errorMessage.value = 'Impossible de charger Google Sign-In'
    appToast.warning('Google Sign-In indisponible', errorMessage.value)
  }
})
</script>

<template>
  <section class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
    <aside class="app-panel hidden p-6 lg:block">
      <p class="app-eyebrow">
        Eat Planner
      </p>
      <h1 class="mt-4 text-3xl font-semibold text-slate-950 dark:text-white">
        Connexion equipe
      </h1>
      <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Accede au tableau de bord, aux recettes, aux charges et au suivi commercial.
      </p>

      <div class="mt-8 grid gap-3">
        <div class="app-inset">
          <p class="text-sm font-semibold text-slate-950 dark:text-white">
            Couts
          </p>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Ingredients, charges et prix conseilles.
          </p>
        </div>
        <div class="app-inset">
          <p class="text-sm font-semibold text-slate-950 dark:text-white">
            Production
          </p>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Plats, ventes et besoins matieres.
          </p>
        </div>
        <div class="app-inset">
          <p class="text-sm font-semibold text-slate-950 dark:text-white">
            Securite
          </p>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Connexion locale, Google et double authentification.
          </p>
        </div>
      </div>
    </aside>

    <div class="app-panel p-5 sm:p-8">
      <div class="mx-auto max-w-md">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="app-eyebrow">
              {{ requiresTwoFactor ? 'Etape 2FA' : 'Bienvenue' }}
            </p>
            <h2 class="mt-3 text-2xl font-semibold text-slate-950 dark:text-white">
              {{ requiresTwoFactor ? 'Entre ton code a 6 chiffres' : 'Connexion a ton compte' }}
            </h2>
          </div>

          <div class="hidden h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-sm font-semibold text-white sm:flex dark:bg-white dark:text-slate-950">
            EP
          </div>
        </div>

        <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {{ requiresTwoFactor
            ? 'Utilise le code genere par ton application d authentification pour finaliser la session.'
            : 'Connecte-toi pour reprendre la gestion de ton restaurant et retrouver toutes tes donnees.' }}
        </p>

        <p
          v-if="errorMessage"
          class="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200"
        >
          {{ errorMessage }}
        </p>

        <form
          v-if="!requiresTwoFactor"
          class="mt-6 space-y-5"
          @submit.prevent="handleSubmit"
        >
          <div>
            <label
              for="email"
              class="text-sm font-medium text-slate-700 dark:text-slate-200"
            >Email</label>
            <input
              id="email"
              v-model.trim="form.email"
              class="app-input mt-2"
              type="email"
              placeholder="ton@email.com"
              required
            >
          </div>

          <div>
            <div class="flex items-center justify-between gap-3">
              <label
                for="password"
                class="text-sm font-medium text-slate-700 dark:text-slate-200"
              >Mot de passe</label>
              <NuxtLink
                to="/forgot-password"
                class="text-sm font-semibold text-emerald-700 transition hover:text-emerald-600 dark:text-emerald-300 dark:hover:text-emerald-200"
              >
                Mot de passe oublie ?
              </NuxtLink>
            </div>
            <input
              id="password"
              v-model="form.password"
              class="app-input mt-2"
              type="password"
              placeholder="Entre ton mot de passe"
              required
            >
          </div>

          <button
            class="btn-primary w-full"
            type="submit"
            :disabled="pending || googlePending"
          >
            {{ pending ? 'Connexion...' : 'Se connecter' }}
          </button>
        </form>

        <form
          v-else
          class="mt-6 space-y-5"
          @submit.prevent="handleTwoFactorSubmit"
        >
          <div>
            <label
              for="two-factor-code"
              class="text-sm font-medium text-slate-700 dark:text-slate-200"
            >Code 2FA</label>
            <input
              id="two-factor-code"
              v-model.trim="twoFactorForm.code"
              class="app-input mt-2 text-center text-lg"
              type="text"
              inputmode="numeric"
              pattern="[0-9]{6}"
              maxlength="6"
              minlength="6"
              placeholder="000000"
              required
            >
          </div>

          <button
            class="btn-primary w-full"
            type="submit"
            :disabled="pending || googlePending"
          >
            {{ pending ? 'Verification...' : 'Verifier le code' }}
          </button>

          <button
            class="btn-secondary w-full"
            type="button"
            :disabled="pending || googlePending"
            @click="cancelTwoFactorStep"
          >
            Retour
          </button>
        </form>

        <section
          v-if="!requiresTwoFactor"
          class="mt-6 border-t border-slate-200 pt-6 dark:border-slate-800"
        >
          <p class="text-center text-sm text-slate-600 dark:text-slate-300">
            Ou continue avec Google
          </p>

          <div
            v-if="googleClientId"
            class="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 dark:border-slate-800 dark:bg-slate-950"
          >
            <div
              ref="googleButtonRef"
              class="flex justify-center"
            />
          </div>

          <p
            v-else
            class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
          >
            Google Sign-In non configure (ajoute GOOGLE_CLIENT_ID).
          </p>
        </section>

        <p
          v-if="!requiresTwoFactor"
          class="mt-6 text-sm text-slate-600 dark:text-slate-300"
        >
          Pas encore de compte ?
          <NuxtLink
            to="/register"
            class="font-semibold text-emerald-700 transition hover:text-emerald-600 dark:text-emerald-300 dark:hover:text-emerald-200"
          >
            Creer un compte
          </NuxtLink>
        </p>
      </div>
    </div>
  </section>
</template>

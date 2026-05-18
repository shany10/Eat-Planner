<script setup lang="ts">
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
const platformHighlights = [
  {
    value: 'Food cost',
    label: 'Visualise rapidement tes marges'
  },
  {
    value: 'Production',
    label: 'Pilote ingredients, plats et ventes'
  },
  {
    value: 'Previsions',
    label: 'Transforme l historique en action'
  }
]
const connectionBenefits = [
  'Vue claire sur tes couts et prix conseilles',
  'Raccourcis directs vers les modules utiles',
  'Connexion securisee avec Google ou 2FA'
]

function getErrorMessage(error: any, fallback: string) {
  return error?.data?.message || error?.statusMessage || fallback
}

async function handleSubmit() {
  errorMessage.value = ''
  pending.value = true

  try {
    await authStore.login(form)
    if (authStore.isAuthenticated) {
      await navigateTo('/')
    }
  } catch (error: any) {
    errorMessage.value = getErrorMessage(error, 'Login failed')
  } finally {
    pending.value = false
  }
}

async function handleTwoFactorSubmit() {
  errorMessage.value = ''
  pending.value = true

  try {
    await authStore.verifyTwoFactor(twoFactorForm.code)
    await navigateTo('/')
  } catch (error: any) {
    errorMessage.value = getErrorMessage(error, 'Code 2FA invalide')
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
    return
  }

  errorMessage.value = ''
  googlePending.value = true

  try {
    await authStore.loginWithGoogle({ idToken })
    if (authStore.isAuthenticated) {
      await navigateTo('/')
    }
  } catch (error: any) {
    errorMessage.value = getErrorMessage(error, 'Google login failed')
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
  }
})
</script>

<template>
  <section class="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.45)] dark:border-slate-800/80 dark:bg-slate-950/92">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute -left-12 top-8 h-28 w-28 rounded-full bg-emerald-300/25 dark:bg-emerald-500/12" />
      <div class="absolute right-4 top-4 h-36 w-36 rounded-full bg-amber-300/25 dark:bg-amber-400/12" />
      <div class="absolute bottom-6 left-1/3 h-28 w-28 rounded-full bg-cyan-300/20 dark:bg-cyan-500/10" />
    </div>

    <div class="relative grid lg:grid-cols-[1.05fr_0.95fr]">
      <div class="border-b border-white/50 bg-[linear-gradient(160deg,rgba(16,185,129,0.96),rgba(13,148,136,0.92),rgba(251,191,36,0.85))] p-8 text-white lg:border-b-0 lg:border-r lg:border-white/15 lg:p-10">
        <p class="inline-flex rounded-full border border-white/30 bg-white/12 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/90">
          {{ requiresTwoFactor ? 'Verification renforcee' : 'Connexion equipe' }}
        </p>

        <h1 class="mt-5 max-w-lg text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {{ requiresTwoFactor ? 'Valide ton acces en un instant.' : 'Retrouve ton espace Eat Planner avec plus de style.' }}
        </h1>

        <p class="mt-4 max-w-xl text-sm leading-7 text-white/85 sm:text-base">
          {{ requiresTwoFactor
            ? 'Ton compte est protege par la double authentification. Entre le code TOTP pour terminer la connexion.'
            : 'Une interface plus claire, plus lumineuse et plus confortable pour revenir directement sur tes couts, tes plats et tes previsions.' }}
        </p>

        <div class="mt-8 grid gap-3 sm:grid-cols-3">
          <div
            v-for="highlight in platformHighlights"
            :key="highlight.value"
            class="rounded-[1.5rem] border border-white/18 bg-white/14 p-4"
          >
            <p class="text-xs uppercase tracking-[0.25em] text-white/70">
              {{ highlight.value }}
            </p>
            <p class="mt-2 text-sm font-medium leading-6 text-white">
              {{ highlight.label }}
            </p>
          </div>
        </div>

        <div class="mt-8 rounded-[1.75rem] border border-white/18 bg-slate-950/15 p-5">
          <p class="text-sm font-semibold text-white">
            Ce que tu recuperes en te connectant
          </p>
          <div class="mt-4 space-y-3">
            <div
              v-for="benefit in connectionBenefits"
              :key="benefit"
              class="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3"
            >
              <span class="h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,0.9)]" />
              <span class="text-sm text-white/90">{{ benefit }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="p-5 sm:p-8">
        <div class="mx-auto max-w-md rounded-[1.75rem] border border-slate-200/80 bg-white/92 p-6 shadow-[0_20px_50px_-35px_rgba(16,185,129,0.8)] dark:border-slate-800 dark:bg-slate-950/88 dark:shadow-[0_20px_50px_-35px_rgba(0,0,0,0.9)] sm:p-8">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-300">
                {{ requiresTwoFactor ? 'Etape 2FA' : 'Bienvenue' }}
              </p>
              <h2 class="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                {{ requiresTwoFactor ? 'Entre ton code a 6 chiffres' : 'Connexion a ton compte' }}
              </h2>
            </div>

            <div class="hidden h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#34d399,#fbbf24)] text-sm font-semibold text-slate-950 shadow-lg sm:flex">
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
            class="mt-5 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200"
          >
            {{ errorMessage }}
          </p>

          <form
            v-if="!requiresTwoFactor"
            class="mt-6 space-y-5"
            @submit.prevent="handleSubmit"
          >
            <div>
              <label for="email" class="text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
              <input
                id="email"
                v-model.trim="form.email"
                class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:bg-slate-950 dark:focus:ring-emerald-500/20"
                type="email"
                placeholder="ton@email.com"
                required
              >
            </div>

            <div>
              <div class="flex items-center justify-between gap-3">
                <label for="password" class="text-sm font-medium text-slate-700 dark:text-slate-200">Mot de passe</label>
                <NuxtLink to="/forgot-password" class="text-sm font-semibold text-emerald-700 transition hover:text-emerald-600 dark:text-emerald-300 dark:hover:text-emerald-200">
                  Mot de passe oublie ?
                </NuxtLink>
              </div>
              <input
                id="password"
                v-model="form.password"
                class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:bg-slate-950 dark:focus:ring-emerald-500/20"
                type="password"
                placeholder="Entre ton mot de passe"
                required
              >
            </div>

            <button
              class="w-full rounded-2xl bg-[linear-gradient(135deg,#10b981,#14b8a6,#fbbf24)] px-4 py-3 font-semibold text-slate-950 shadow-[0_18px_35px_-20px_rgba(16,185,129,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-22px_rgba(16,185,129,0.95)] disabled:cursor-not-allowed disabled:opacity-60"
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
              <label for="two-factor-code" class="text-sm font-medium text-slate-700 dark:text-slate-200">Code 2FA</label>
              <input
                id="two-factor-code"
                v-model.trim="twoFactorForm.code"
                class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-center text-lg tracking-[0.35em] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-emerald-500 dark:focus:bg-slate-950 dark:focus:ring-emerald-500/20"
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
              class="w-full rounded-2xl bg-[linear-gradient(135deg,#10b981,#14b8a6,#fbbf24)] px-4 py-3 font-semibold text-slate-950 shadow-[0_18px_35px_-20px_rgba(16,185,129,0.9)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-22px_rgba(16,185,129,0.95)] disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              :disabled="pending || googlePending"
            >
              {{ pending ? 'Verification...' : 'Verifier le code' }}
            </button>

            <button
              class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-900"
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
              class="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 px-3 py-4 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div
                ref="googleButtonRef"
                class="flex justify-center"
              />
            </div>

            <p
              v-else
              class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
            >
              Google Sign-In non configure (ajoute GOOGLE_CLIENT_ID).
            </p>
          </section>

          <p
            v-if="!requiresTwoFactor"
            class="mt-6 text-sm text-slate-600 dark:text-slate-300"
          >
            Pas encore de compte ?
            <NuxtLink to="/register" class="font-semibold text-emerald-700 transition hover:text-emerald-600 dark:text-emerald-300 dark:hover:text-emerald-200">
              Creer un compte
            </NuxtLink>
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

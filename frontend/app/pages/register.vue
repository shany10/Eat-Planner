<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'guest'
})

const authStore = useAuthStore()

const form = reactive({
  firstname: '',
  lastname: '',
  email: '',
  password: ''
})

const pending = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const onboardingHighlights = [
  {
    value: 'Setup rapide',
    label: 'Creer ton espace en quelques champs'
  },
  {
    value: 'Equipe',
    label: 'Centralise tes donnees de gestion'
  },
  {
    value: 'Suivi',
    label: 'Passe vite aux ingredients et aux ventes'
  }
]
const onboardingBenefits = [
  'Ajoute tes ingredients, plats et charges au meme endroit',
  'Observe plus facilement les prix et la rentabilite',
  'Construis une base propre pour tes futures previsions'
]

async function handleSubmit() {
  errorMessage.value = ''
  successMessage.value = ''
  pending.value = true

  try {
    await authStore.register(form)
    successMessage.value = 'Compte cree. Tu peux maintenant te connecter.'
    await navigateTo('/login')
  } catch (error: any) {
    errorMessage.value = error?.data?.message || error?.statusMessage || 'Registration failed'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.45)] dark:border-slate-800/80 dark:bg-slate-950/92">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute left-2 top-2 h-32 w-32 rounded-full bg-orange-300/20 dark:bg-orange-500/10" />
      <div class="absolute right-10 top-14 h-28 w-28 rounded-full bg-rose-300/18 dark:bg-rose-500/10" />
      <div class="absolute bottom-6 right-1/4 h-32 w-32 rounded-full bg-emerald-300/16 dark:bg-emerald-500/8" />
    </div>

    <div class="relative grid lg:grid-cols-[1fr_0.98fr]">
      <div class="border-b border-white/50 bg-[linear-gradient(155deg,rgba(251,146,60,0.96),rgba(244,114,182,0.88),rgba(16,185,129,0.82))] p-8 text-white lg:border-b-0 lg:border-r lg:border-white/15 lg:p-10">
        <p class="inline-flex rounded-full border border-white/30 bg-white/12 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white/90">
          Creation de compte
        </p>

        <h1 class="mt-5 max-w-lg text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Lance un espace plus vivant pour suivre ton activite.
        </h1>

        <p class="mt-4 max-w-xl text-sm leading-7 text-white/85 sm:text-base">
          L inscription devient plus accueillante avec une vraie presence visuelle, tout en gardant un formulaire simple pour demarrer vite.
        </p>

        <div class="mt-8 grid gap-3 sm:grid-cols-3">
          <div
            v-for="highlight in onboardingHighlights"
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
            Pourquoi creer ton compte maintenant
          </p>
          <div class="mt-4 space-y-3">
            <div
              v-for="benefit in onboardingBenefits"
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
        <div class="mx-auto max-w-lg rounded-[1.75rem] border border-slate-200/80 bg-white/92 p-6 shadow-[0_20px_50px_-35px_rgba(251,146,60,0.85)] dark:border-slate-800 dark:bg-slate-950/88 dark:shadow-[0_20px_50px_-35px_rgba(0,0,0,0.9)] sm:p-8">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.3em] text-orange-600 dark:text-orange-300">
                Inscription
              </p>
              <h2 class="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Cree ton compte
              </h2>
            </div>

            <div class="hidden h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#fb923c,#f472b6,#34d399)] text-sm font-semibold text-slate-950 shadow-lg sm:flex">
              EP
            </div>
          </div>

          <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Renseigne tes informations pour acceder a une interface plus coloree et commencer a piloter tes donnees sereinement.
          </p>

          <div class="mt-5 rounded-2xl border border-orange-100 bg-orange-50/70 px-4 py-3 text-xs leading-6 text-orange-900 dark:border-orange-900/40 dark:bg-orange-950/25 dark:text-orange-100">
            Chaque nouvelle inscription cree automatiquement un compte manager. Le compte admin principal reste unique et se gere dans le panel admin.
          </div>

          <p
            v-if="errorMessage"
            class="mt-5 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-200"
          >
            {{ errorMessage }}
          </p>

          <p
            v-if="successMessage"
            class="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-200"
          >
            {{ successMessage }}
          </p>

          <form class="mt-6 space-y-5" @submit.prevent="handleSubmit">
            <div class="grid gap-5 md:grid-cols-2">
              <div>
                <label for="firstname" class="text-sm font-medium text-slate-700 dark:text-slate-200">Prenom</label>
                <input
                  id="firstname"
                  v-model.trim="form.firstname"
                  class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-orange-500 dark:focus:bg-slate-950 dark:focus:ring-orange-500/20"
                  type="text"
                  placeholder="Prenom"
                  required
                >
              </div>

              <div>
                <label for="lastname" class="text-sm font-medium text-slate-700 dark:text-slate-200">Nom</label>
                <input
                  id="lastname"
                  v-model.trim="form.lastname"
                  class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-orange-500 dark:focus:bg-slate-950 dark:focus:ring-orange-500/20"
                  type="text"
                  placeholder="Nom"
                  required
                >
              </div>
            </div>

            <div>
              <label for="email" class="text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
              <input
                id="email"
                v-model.trim="form.email"
                class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-orange-500 dark:focus:bg-slate-950 dark:focus:ring-orange-500/20"
                type="email"
                placeholder="ton@email.com"
                required
              >
            </div>

            <div>
              <label for="password" class="text-sm font-medium text-slate-700 dark:text-slate-200">Mot de passe</label>
              <input
                id="password"
                v-model="form.password"
                class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:border-orange-500 dark:focus:bg-slate-950 dark:focus:ring-orange-500/20"
                type="password"
                minlength="8"
                placeholder="Minimum 8 caracteres"
                required
              >

              <div class="mt-3 rounded-2xl border border-orange-100 bg-orange-50/70 px-4 py-3 text-xs leading-6 text-orange-900 dark:border-orange-900/40 dark:bg-orange-950/25 dark:text-orange-100">
                Choisis un mot de passe solide pour proteger l acces a tes prix, tes charges et tes donnees de production.
              </div>
            </div>

            <button
              class="w-full rounded-2xl bg-[linear-gradient(135deg,#fb923c,#f97316,#f472b6,#34d399)] px-4 py-3 font-semibold text-slate-950 shadow-[0_18px_35px_-20px_rgba(251,146,60,0.95)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-22px_rgba(251,146,60,0.95)] disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              :disabled="pending"
            >
              {{ pending ? 'Creation...' : 'Creer le compte' }}
            </button>
          </form>

          <p class="mt-6 text-sm text-slate-600 dark:text-slate-300">
            Deja un compte ?
            <NuxtLink to="/login" class="font-semibold text-orange-700 transition hover:text-orange-600 dark:text-orange-300 dark:hover:text-orange-200">
              Se connecter
            </NuxtLink>
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

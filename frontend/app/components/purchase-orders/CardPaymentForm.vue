<script setup lang="ts">
import { getFetchErrorMessage } from '~/utils/fetch-error'
import type { CardBrand, PaymentCard } from '~/types/business'
import { usePaymentCardStore } from '~/stores/payment-cards'

const props = withDefaults(defineProps<{
  amount: number
  defaultHolder?: string
  submitting?: boolean
}>(), {
  defaultHolder: '',
  submitting: false
})

export type CardPaymentFormPayload = {
  savedCardId?: string
  card?: {
    holder: string
    cardNumber: string
    expiryMonth: number
    expiryYear: number
    cvv: string
  }
  saveCard: boolean
}

const emit = defineEmits<{
  submit: [payload: CardPaymentFormPayload]
}>()

const paymentCardStore = usePaymentCardStore()
const appToast = useAppToast()

const mode = ref<'saved' | 'new'>('new')
const selectedCardId = ref('')
const removingCardId = ref('')
const cvvFocused = ref(false)
const errors = ref<string[]>([])

const form = reactive({
  holder: props.defaultHolder,
  number: '',
  expiry: '',
  cvv: '',
  saveCard: true
})

const brandIcons: Record<CardBrand, string> = {
  visa: 'i-simple-icons-visa',
  mastercard: 'i-simple-icons-mastercard',
  amex: 'i-simple-icons-americanexpress',
  cb: 'i-lucide-credit-card'
}

const brandLabels: Record<CardBrand, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  cb: 'CB'
}

const digits = computed(() => form.number.replace(/\D/g, '').slice(0, 19))

const brand = computed<CardBrand>(() => {
  const value = digits.value
  if (/^4/.test(value)) return 'visa'
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(value)) return 'mastercard'
  if (/^3[47]/.test(value)) return 'amex'
  return 'cb'
})

const displayNumber = computed(() => {
  const value = digits.value.padEnd(16, '•')
  return value.replace(/(.{4})/g, '$1 ').trim()
})

const displayHolder = computed(() => (form.holder.trim() || 'NOM DU TITULAIRE').toUpperCase())
const displayExpiry = computed(() => form.expiry || 'MM/AA')

const selectedSavedCard = computed(() =>
  paymentCardStore.items.find(card => card._id === selectedCardId.value) ?? null
)

const canSubmit = computed(() => {
  if (props.submitting) return false
  if (mode.value === 'saved') return Boolean(selectedSavedCard.value)
  return true
})

function formatCurrency(value: number) {
  return `${value.toFixed(2)} €`
}

function cardExpiryLabel(card: PaymentCard) {
  return `${String(card.expiryMonth).padStart(2, '0')}/${String(card.expiryYear).slice(-2)}`
}

function onNumberInput() {
  form.number = digits.value.replace(/(.{4})/g, '$1 ').trim()
}

function onExpiryInput() {
  const value = form.expiry.replace(/\D/g, '').slice(0, 4)
  form.expiry = value.length > 2 ? `${value.slice(0, 2)}/${value.slice(2)}` : value
}

function onCvvInput() {
  form.cvv = form.cvv.replace(/\D/g, '').slice(0, 4)
}

function isLuhnValid(value: string) {
  if (!/^\d{12,19}$/.test(value)) return false

  let sum = 0
  let double = false
  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index])
    if (double) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    double = !double
  }

  return sum % 10 === 0
}

function parseExpiry() {
  const match = /^(\d{2})\/(\d{2})$/.exec(form.expiry)
  if (!match) return null

  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  if (month < 1 || month > 12) return null

  return { month, year }
}

function validateNewCard() {
  errors.value = []

  if (form.holder.trim().length < 2) {
    errors.value.push('Nom du titulaire requis')
  }

  if (!isLuhnValid(digits.value)) {
    errors.value.push('Numero de carte invalide')
  }

  const expiry = parseExpiry()
  if (!expiry) {
    errors.value.push('Date d expiration invalide (MM/AA)')
  } else if (new Date(expiry.year, expiry.month, 1).getTime() <= Date.now()) {
    errors.value.push('Carte expiree')
  }

  if (!/^\d{3,4}$/.test(form.cvv)) {
    errors.value.push('Cryptogramme invalide')
  }

  return errors.value.length === 0 ? expiry : null
}

function submit() {
  if (props.submitting) return

  if (mode.value === 'saved') {
    if (!selectedSavedCard.value) {
      errors.value = ['Selectionne une carte enregistree']
      return
    }

    errors.value = []
    emit('submit', { savedCardId: selectedSavedCard.value._id, saveCard: false })
    return
  }

  const expiry = validateNewCard()
  if (!expiry) return

  emit('submit', {
    card: {
      holder: form.holder.trim(),
      cardNumber: digits.value,
      expiryMonth: expiry.month,
      expiryYear: expiry.year,
      cvv: form.cvv
    },
    saveCard: form.saveCard
  })
}

async function removeCard(card: PaymentCard) {
  removingCardId.value = card._id
  try {
    await paymentCardStore.remove(card._id)
    if (selectedCardId.value === card._id) {
      selectedCardId.value = paymentCardStore.items[0]?._id ?? ''
    }
    if (paymentCardStore.items.length === 0) {
      mode.value = 'new'
    }
    appToast.success('Carte supprimee', `La carte ****${card.last4} a ete retiree du compte.`)
  } catch (error) {
    appToast.error('Suppression impossible', getFetchErrorMessage(error, 'La carte n a pas pu etre supprimee'))
  } finally {
    removingCardId.value = ''
  }
}

onMounted(async () => {
  try {
    await paymentCardStore.load()
  } catch {
    // liste vide en cas d'erreur, le mode "nouvelle carte" reste disponible
  }

  if (paymentCardStore.items.length > 0) {
    mode.value = 'saved'
    selectedCardId.value = paymentCardStore.items[0]?._id ?? ''
  }
})
</script>

<template>
  <div class="space-y-4">
    <div
      v-if="paymentCardStore.items.length > 0"
      class="grid grid-cols-2 gap-2"
    >
      <button
        type="button"
        class="rounded-lg border px-3 py-2 text-sm font-semibold transition"
        :class="mode === 'saved'
          ? 'border-[#005013] bg-[#005013]/10 text-[#005013] dark:border-[#8ad986] dark:bg-[#8ad986]/10 dark:text-[#8ad986]'
          : 'border-[#c0c9ba]/40 text-[#40493e] hover:bg-[#f3f3f3] dark:border-white/10 dark:text-[#c0c9ba] dark:hover:bg-[#2f3131]'"
        @click="mode = 'saved'"
      >
        Mes cartes
      </button>
      <button
        type="button"
        class="rounded-lg border px-3 py-2 text-sm font-semibold transition"
        :class="mode === 'new'
          ? 'border-[#005013] bg-[#005013]/10 text-[#005013] dark:border-[#8ad986] dark:bg-[#8ad986]/10 dark:text-[#8ad986]'
          : 'border-[#c0c9ba]/40 text-[#40493e] hover:bg-[#f3f3f3] dark:border-white/10 dark:text-[#c0c9ba] dark:hover:bg-[#2f3131]'"
        @click="mode = 'new'"
      >
        Nouvelle carte
      </button>
    </div>

    <div
      v-if="mode === 'saved'"
      class="grid gap-2"
    >
      <label
        v-for="card in paymentCardStore.items"
        :key="card._id"
        class="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition"
        :class="selectedCardId === card._id
          ? 'border-[#005013] bg-[#005013]/5 dark:border-[#8ad986] dark:bg-[#8ad986]/10'
          : 'border-[#c0c9ba]/40 hover:bg-[#f3f3f3] dark:border-white/10 dark:hover:bg-[#2f3131]'"
      >
        <input
          v-model="selectedCardId"
          type="radio"
          :value="card._id"
          class="accent-[#005013]"
        >
        <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#1a1c1c] text-white dark:bg-[#2f3131]">
          <UIcon
            :name="brandIcons[card.brand]"
            class="size-5"
          />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-semibold text-[#1a1c1c] dark:text-white">
            {{ brandLabels[card.brand] }} •••• {{ card.last4 }}
          </span>
          <span class="block text-xs text-[#40493e] dark:text-[#c0c9ba]">
            {{ card.holder }} · expire {{ cardExpiryLabel(card) }}
          </span>
        </span>
        <button
          type="button"
          class="rounded-lg p-2 text-[#ba1a1a] transition hover:bg-[#ba1a1a]/10 disabled:opacity-50 dark:text-[#ff897d]"
          :disabled="removingCardId === card._id"
          aria-label="Supprimer la carte"
          @click.prevent="removeCard(card)"
        >
          <UIcon
            name="i-lucide-trash-2"
            class="size-4"
          />
        </button>
      </label>
    </div>

    <template v-else>
      <div class="cardpay-scene mx-auto w-full max-w-sm">
        <div
          class="cardpay-card"
          :class="{ 'cardpay-card--flipped': cvvFocused }"
        >
          <div class="cardpay-face cardpay-face--front">
            <div class="cardpay-shine" />
            <div class="flex items-start justify-between">
              <span class="cardpay-chip" />
              <UIcon
                :name="brandIcons[brand]"
                class="size-8 text-white/90"
              />
            </div>
            <p class="cardpay-number">
              {{ displayNumber }}
            </p>
            <div class="flex items-end justify-between gap-3">
              <div class="min-w-0">
                <p class="cardpay-label">
                  Titulaire
                </p>
                <p class="cardpay-value truncate">
                  {{ displayHolder }}
                </p>
              </div>
              <div class="text-right">
                <p class="cardpay-label">
                  Expire
                </p>
                <p class="cardpay-value">
                  {{ displayExpiry }}
                </p>
              </div>
            </div>
          </div>

          <div class="cardpay-face cardpay-face--back">
            <div class="cardpay-magstripe" />
            <div class="mt-4 flex items-center justify-end gap-2 px-5">
              <span class="cardpay-cvv-band" />
              <span class="cardpay-cvv">{{ form.cvv || '•••' }}</span>
            </div>
            <p class="mt-4 px-5 text-[10px] leading-4 text-white/60">
              Paiement simule Eat Planner. Seuls la marque et les 4 derniers chiffres sont conserves.
            </p>
          </div>
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <input
          v-model="form.holder"
          class="app-input md:col-span-2"
          placeholder="Titulaire de la carte"
          autocomplete="off"
        >
        <input
          v-model="form.number"
          class="app-input md:col-span-2"
          placeholder="Numero de carte"
          inputmode="numeric"
          autocomplete="off"
          @input="onNumberInput"
        >
        <input
          v-model="form.expiry"
          class="app-input"
          placeholder="MM/AA"
          inputmode="numeric"
          autocomplete="off"
          @input="onExpiryInput"
        >
        <input
          v-model="form.cvv"
          class="app-input"
          placeholder="CVV"
          inputmode="numeric"
          autocomplete="off"
          @focus="cvvFocused = true"
          @blur="cvvFocused = false"
          @input="onCvvInput"
        >
      </div>

      <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-[#c0c9ba]/40 px-4 py-3 dark:border-white/10">
        <input
          v-model="form.saveCard"
          type="checkbox"
          class="mt-1 accent-[#005013]"
        >
        <span>
          <span class="block text-sm font-semibold text-[#1a1c1c] dark:text-white">Enregistrer cette carte</span>
          <span class="mt-0.5 block text-xs text-[#40493e] dark:text-[#c0c9ba]">
            Seuls la marque, les 4 derniers chiffres et l expiration sont conserves.
          </span>
        </span>
      </label>
    </template>

    <div
      v-if="errors.length > 0"
      class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
    >
      <p
        v-for="message in errors"
        :key="message"
      >
        {{ message }}
      </p>
    </div>

    <button
      type="button"
      class="btn-primary w-full justify-center"
      :disabled="!canSubmit"
      @click="submit"
    >
      <UIcon
        name="i-lucide-lock"
        class="size-4"
      />
      Payer {{ formatCurrency(amount) }}
    </button>
  </div>
</template>

<style scoped>
.cardpay-scene {
  perspective: 1200px;
}

.cardpay-card {
  position: relative;
  aspect-ratio: 8 / 5;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1);
}

.cardpay-card--flipped {
  transform: rotateY(180deg);
}

.cardpay-face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
  border-radius: 1rem;
  background: linear-gradient(135deg, #005013 0%, #0c3f16 55%, #1a1c1c 100%);
  box-shadow: 0 20px 40px -18px rgba(0, 80, 19, 0.55);
  backface-visibility: hidden;
  color: #fff;
}

.cardpay-face--front {
  padding: 1.25rem;
}

.cardpay-face--back {
  transform: rotateY(180deg);
  padding: 1.25rem 0;
}

.cardpay-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.14) 45%, transparent 60%);
  background-size: 250% 100%;
  animation: cardpay-shine 3.5s ease-in-out infinite;
  pointer-events: none;
}

@keyframes cardpay-shine {
  0%, 100% { background-position: 120% 0; }
  50% { background-position: -20% 0; }
}

.cardpay-chip {
  display: block;
  height: 2rem;
  width: 2.6rem;
  border-radius: 0.4rem;
  background: linear-gradient(135deg, #feb236, #d99a24);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.25);
}

.cardpay-number {
  font-family: ui-monospace, monospace;
  font-size: 1.25rem;
  letter-spacing: 0.14em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

.cardpay-label {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.6);
}

.cardpay-value {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.06em;
}

.cardpay-magstripe {
  height: 2.4rem;
  background: #101211;
}

.cardpay-cvv-band {
  display: block;
  height: 1.8rem;
  flex: 1;
  border-radius: 0.25rem;
  background: repeating-linear-gradient(45deg, #e8e8e8, #e8e8e8 6px, #dcdcdc 6px, #dcdcdc 12px);
}

.cardpay-cvv {
  display: inline-flex;
  min-width: 3rem;
  justify-content: center;
  border-radius: 0.25rem;
  background: #fff;
  padding: 0.35rem 0.5rem;
  font-family: ui-monospace, monospace;
  font-weight: 700;
  color: #1a1c1c;
}
</style>

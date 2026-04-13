import type { AuthProfile } from '~/types/access'

type RegisterPayload = {
  firstname: string
  lastname: string
  email: string
  password: string
}

type LoginPayload = {
  email: string
  password: string
}

type GoogleLoginPayload = {
  idToken: string
}

type ForgotPasswordPayload = {
  email: string
}

type ResetPasswordPayload = {
  token: string
  password: string
}

type AccessAuthResponse = {
  ok: true
  token: string
  id: string
}

type MfaChallengeResponse = {
  ok: true
  requires2fa: true
  mfaToken: string
  id: string
}

type AuthResponse = AccessAuthResponse | MfaChallengeResponse

type SetupTwoFactorResponse = {
  ok: boolean
  issuer: string
  secret: string
  otpauthUrl: string
}

type ToggleTwoFactorResponse = {
  ok: boolean
  message: string
}

function isMfaChallenge(response: AuthResponse): response is MfaChallengeResponse {
  return 'requires2fa' in response && response.requires2fa === true
}

export const useAuthStore = defineStore('auth', () => {
  const token = useCookie<string | null>('auth_token', { sameSite: 'lax' })
  const userId = useCookie<string | null>('auth_user_id', { sameSite: 'lax' })
  const mfaToken = useCookie<string | null>('auth_mfa_token', {
    sameSite: 'lax',
    maxAge: 60 * 10
  })
  const pendingUserId = useCookie<string | null>('auth_pending_user_id', {
    sameSite: 'lax',
    maxAge: 60 * 10
  })

  const profile = ref<AuthProfile | null>(null)

  const isAuthenticated = computed(() => Boolean(token.value))
  const requiresTwoFactor = computed(() => Boolean(mfaToken.value))

  async function register(payload: RegisterPayload) {
    return await $fetch('/api/auth/register', {
      method: 'POST',
      body: payload
    })
  }

  async function requestPasswordReset(payload: ForgotPasswordPayload) {
    return await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: payload
    })
  }

  async function resetPassword(payload: ResetPasswordPayload) {
    return await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: payload
    })
  }

  async function loadProfile() {
    if (!token.value) {
      profile.value = null
      return null
    }

    profile.value = await $fetch<AuthProfile>('/api/auth/me')
    return profile.value
  }

  async function setupTwoFactor() {
    return await $fetch<SetupTwoFactorResponse>('/api/auth/2fa/setup', {
      method: 'POST'
    })
  }

  async function enableTwoFactor(code: string) {
    const response = await $fetch<ToggleTwoFactorResponse>('/api/auth/2fa/enable', {
      method: 'POST',
      body: { code }
    })

    await loadProfile()
    return response
  }

  async function disableTwoFactor(code: string) {
    const response = await $fetch<ToggleTwoFactorResponse>('/api/auth/2fa/disable', {
      method: 'POST',
      body: { code }
    })

    await loadProfile()
    return response
  }

  function setAuthenticated(response: AccessAuthResponse) {
    token.value = response.token
    userId.value = response.id
    mfaToken.value = null
    pendingUserId.value = null
    void loadProfile()
  }

  function setMfaChallenge(response: MfaChallengeResponse) {
    token.value = null
    userId.value = null
    mfaToken.value = response.mfaToken
    pendingUserId.value = response.id
    profile.value = null
  }

  function handleAuthResponse(response: AuthResponse): AuthResponse {
    if (isMfaChallenge(response)) {
      setMfaChallenge(response)
      return response
    }

    setAuthenticated(response)
    return response
  }

  async function login(payload: LoginPayload) {
    const response = await $fetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: payload
    })

    return handleAuthResponse(response)
  }

  async function loginWithGoogle(payload: GoogleLoginPayload) {
    const response = await $fetch<AuthResponse>('/api/auth/google', {
      method: 'POST',
      body: payload
    })

    return handleAuthResponse(response)
  }

  async function verifyTwoFactor(code: string) {
    if (!mfaToken.value) {
      throw new Error('MFA token missing')
    }

    const response = await $fetch<AccessAuthResponse>('/api/auth/login-2fa', {
      method: 'POST',
      body: {
        mfaToken: mfaToken.value,
        code
      }
    })

    setAuthenticated(response)
    return response
  }

  function resetTwoFactor() {
    mfaToken.value = null
    pendingUserId.value = null
  }

  function logout() {
    token.value = null
    userId.value = null
    mfaToken.value = null
    pendingUserId.value = null
    profile.value = null
  }

  return {
    token,
    userId,
    mfaToken,
    pendingUserId,
    profile,
    isAuthenticated,
    requiresTwoFactor,
    register,
    requestPasswordReset,
    resetPassword,
    loadProfile,
    setupTwoFactor,
    enableTwoFactor,
    disableTwoFactor,
    login,
    loginWithGoogle,
    verifyTwoFactor,
    resetTwoFactor,
    logout
  }
})

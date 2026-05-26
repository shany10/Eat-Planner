import { createBackendError } from '../../utils/errors'

type LoginBody = {
  email: string
  password: string
}

type AccessAuthResponse = {
  ok: boolean
  token: string
  id: string
}

type MfaChallengeResponse = {
  ok: boolean
  requires2fa: true
  mfaToken: string
  id: string
}

type LoginResponse = AccessAuthResponse | MfaChallengeResponse

export default defineEventHandler(async (event) => {
  const body = await readBody<LoginBody>(event)
  const config = useRuntimeConfig()

  try {
    return await $fetch<LoginResponse>(`${config.backendBaseUrl}/user/auth`, {
      method: 'POST',
      body
    })
  } catch (error) {
    throw createBackendError(error, 'Login failed')
  }
})

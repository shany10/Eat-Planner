import { createBackendError } from '../../utils/errors'

type GoogleLoginBody = {
  idToken: string
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

type GoogleLoginResponse = AccessAuthResponse | MfaChallengeResponse

export default defineEventHandler(async (event) => {
  const body = await readBody<GoogleLoginBody>(event)
  const config = useRuntimeConfig()

  try {
    return await $fetch<GoogleLoginResponse>(`${config.backendBaseUrl}/user/oauth/google`, {
      method: 'POST',
      body
    })
  } catch (error) {
    throw createBackendError(error, 'Google login failed')
  }
})

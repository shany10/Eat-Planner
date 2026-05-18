import { createError } from 'h3'

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
  } catch (error: any) {
    throw createError({
      statusCode: error?.response?.status || 500,
      statusMessage: error?.response?._data?.error || 'Google login failed'
    })
  }
})

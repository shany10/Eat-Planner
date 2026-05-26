import { createBackendError } from '../../utils/errors'

type Login2FaBody = {
  mfaToken: string
  code: string
}

type Login2FaResponse = {
  ok: boolean
  token: string
  id: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<Login2FaBody>(event)
  const config = useRuntimeConfig()

  try {
    return await $fetch<Login2FaResponse>(`${config.backendBaseUrl}/user/auth/2fa`, {
      method: 'POST',
      body
    })
  } catch (error) {
    throw createBackendError(error, '2FA verification failed')
  }
})

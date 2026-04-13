import { createError } from 'h3'

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
  } catch (error: any) {
    throw createError({
      statusCode: error?.response?.status || 500,
      statusMessage: error?.response?._data?.error || '2FA verification failed'
    })
  }
})

import { createError, getCookie } from 'h3'

type Setup2FaResponse = {
  ok: boolean
  issuer: string
  secret: string
  otpauthUrl: string
}

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth_token')
  const config = useRuntimeConfig()

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Not authenticated'
    })
  }

  try {
    return await $fetch<Setup2FaResponse>(`${config.backendBaseUrl}/user/2fa/setup`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
  } catch (error: any) {
    throw createError({
      statusCode: error?.response?.status || 500,
      statusMessage: error?.response?._data?.error || 'Unable to initialize 2FA setup'
    })
  }
})

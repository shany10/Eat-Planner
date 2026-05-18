import { createError, getCookie } from 'h3'

type Disable2FaBody = {
  code: string
}

type Disable2FaResponse = {
  ok: boolean
  message: string
}

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth_token')
  const config = useRuntimeConfig()
  const body = await readBody<Disable2FaBody>(event)

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Not authenticated'
    })
  }

  try {
    return await $fetch<Disable2FaResponse>(`${config.backendBaseUrl}/user/2fa/disable`, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
  } catch (error: any) {
    throw createError({
      statusCode: error?.response?.status || 500,
      statusMessage: error?.response?._data?.error || 'Unable to disable 2FA'
    })
  }
})

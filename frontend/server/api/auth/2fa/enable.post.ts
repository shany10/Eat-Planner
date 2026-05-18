import { createError, getCookie } from 'h3'

type Enable2FaBody = {
  code: string
}

type Enable2FaResponse = {
  ok: boolean
  message: string
}

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth_token')
  const config = useRuntimeConfig()
  const body = await readBody<Enable2FaBody>(event)

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Not authenticated'
    })
  }

  try {
    return await $fetch<Enable2FaResponse>(`${config.backendBaseUrl}/user/2fa/enable`, {
      method: 'POST',
      body,
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
  } catch (error: any) {
    throw createError({
      statusCode: error?.response?.status || 500,
      statusMessage: error?.response?._data?.error || 'Unable to enable 2FA'
    })
  }
})

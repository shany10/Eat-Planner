import { createError } from 'h3'

type ForgotPasswordBody = {
  email: string
}

type ForgotPasswordResponse = {
  ok: boolean
  message: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ForgotPasswordBody>(event)
  const config = useRuntimeConfig()

  try {
    return await $fetch<ForgotPasswordResponse>(`${config.backendBaseUrl}/user/password/forgot`, {
      method: 'POST',
      body
    })
  } catch (error: any) {
    throw createError({
      statusCode: error?.response?.status || 500,
      statusMessage: error?.response?._data?.error || 'Unable to request password reset'
    })
  }
})

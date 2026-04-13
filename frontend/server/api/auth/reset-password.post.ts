import { createError } from 'h3'

type ResetPasswordBody = {
  token: string
  password: string
}

type ResetPasswordResponse = {
  ok: boolean
  message: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ResetPasswordBody>(event)
  const config = useRuntimeConfig()

  try {
    return await $fetch<ResetPasswordResponse>(`${config.backendBaseUrl}/user/password/reset`, {
      method: 'POST',
      body
    })
  } catch (error: any) {
    throw createError({
      statusCode: error?.response?.status || 500,
      statusMessage: error?.response?._data?.error || 'Unable to reset password'
    })
  }
})

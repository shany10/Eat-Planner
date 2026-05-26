import { createBackendError } from '../../utils/errors'

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
  } catch (error) {
    throw createBackendError(error, 'Unable to reset password')
  }
})

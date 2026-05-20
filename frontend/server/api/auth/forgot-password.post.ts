import { createBackendError } from '../../utils/errors'

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
  } catch (error) {
    throw createBackendError(error, 'Unable to request password reset')
  }
})

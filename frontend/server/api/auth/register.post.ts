import { createError } from 'h3'

type RegisterBody = {
  firstname: string
  lastname: string
  email: string
  password: string
}

type RegisterResponse = {
  ok: boolean
  id: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<RegisterBody>(event)
  const config = useRuntimeConfig()

  try {
    return await $fetch<RegisterResponse>(`${config.backendBaseUrl}/user/register`, {
      method: 'POST',
      body
    })
  } catch (error: any) {
    throw createError({
      statusCode: error?.response?.status || 500,
      statusMessage: error?.response?._data?.error || 'Registration failed'
    })
  }
})

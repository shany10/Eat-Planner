import { createError, getCookie } from 'h3'
import { createBackendError } from '../../utils/errors'

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
    return await $fetch(`${config.backendBaseUrl}/user/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
  } catch (error) {
    throw createBackendError(error, 'Unable to load profile')
  }
})

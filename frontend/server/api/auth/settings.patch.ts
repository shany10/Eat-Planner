import { getCookie } from 'h3'
import { createBackendError } from '../../utils/errors'

type AccountSettingsBody = {
  restaurantName: string
  defaultMarginRate: number
  vatRate: number
}

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'auth_token')
  const config = useRuntimeConfig()
  const body = await readBody<AccountSettingsBody>(event)

  try {
    return await $fetch(`${config.backendBaseUrl}/user/settings`, {
      method: 'PATCH',
      headers: token
        ? {
            Authorization: `Bearer ${token}`
          }
        : undefined,
      body
    })
  } catch (error) {
    throw createBackendError(error, 'Unable to update account settings')
  }
})

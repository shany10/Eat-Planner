import { createError, getCookie, type H3Event } from 'h3'

type BackendFetchOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
}

export async function backendFetch<T>(event: H3Event, path: string, options: BackendFetchOptions = {}) {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'auth_token')

  try {
    return await $fetch<T>(`${config.backendBaseUrl}${path}`, {
      method: options.method ?? 'GET',
      body: options.body,
      headers: token
        ? {
            Authorization: `Bearer ${token}`
          }
        : undefined
    })
  } catch (error: any) {
    throw createError({
      statusCode: error?.response?.status || 500,
      statusMessage: error?.response?._data?.error || 'Backend request failed'
    })
  }
}

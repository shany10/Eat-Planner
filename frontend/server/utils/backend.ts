import { getCookie, type H3Event } from 'h3'
import { createBackendError } from './errors'

type BackendFetchOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
}

export async function backendFetch<T = unknown>(event: H3Event, path: string, options: BackendFetchOptions = {}): Promise<T> {
  const config = useRuntimeConfig()
  const token = getCookie(event, 'auth_token')

  try {
    const body = options.body as BodyInit | Record<string, unknown> | null | undefined

    return await $fetch<T>(`${config.backendBaseUrl}${path}`, {
      method: options.method ?? 'GET',
      body,
      headers: token
        ? {
            Authorization: `Bearer ${token}`
          }
        : undefined
    })
  } catch (error) {
    throw createBackendError(error, 'Backend request failed')
  }
}

import { createError } from 'h3'

type BackendErrorShape = {
  response?: {
    status?: number
    _data?: {
      error?: string
      message?: string
    }
  }
  statusCode?: number
  statusMessage?: string
  message?: string
}

function isBackendErrorShape(error: unknown): error is BackendErrorShape {
  return typeof error === 'object' && error !== null
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function createBackendError(error: unknown, fallback: string) {
  const backendError = isBackendErrorShape(error) ? error : null
  const statusCode = typeof backendError?.response?.status === 'number'
    ? backendError.response.status
    : typeof backendError?.statusCode === 'number'
      ? backendError.statusCode
      : 500

  return createError({
    statusCode,
    statusMessage: asString(backendError?.response?._data?.error)
      ?? asString(backendError?.response?._data?.message)
      ?? asString(backendError?.statusMessage)
      ?? asString(backendError?.message)
      ?? fallback
  })
}

type FetchErrorShape = {
  data?: {
    message?: string
  }
  statusMessage?: string
  message?: string
}

function isFetchErrorShape(error: unknown): error is FetchErrorShape {
  return typeof error === 'object' && error !== null
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

export function getFetchErrorMessage(error: unknown, fallback: string): string {
  if (!isFetchErrorShape(error)) {
    return fallback
  }

  return asString(error.data?.message)
    ?? asString(error.statusMessage)
    ?? asString(error.message)
    ?? fallback
}

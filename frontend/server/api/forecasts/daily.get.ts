import { backendFetch } from '../../utils/backend'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const date = typeof query.date === 'string' ? `?date=${encodeURIComponent(query.date)}` : ''
  return await backendFetch(event, `/forecasts/daily${date}`)
})

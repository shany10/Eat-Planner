import { backendFetch } from '../../utils/backend'

export default defineEventHandler(async (event) => {
  return await backendFetch(event, '/payment-cards')
})

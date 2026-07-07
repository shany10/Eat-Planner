import { backendFetch } from '../../../utils/backend'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  return await backendFetch(event, `/purchase-orders/${id}/send-supplier-email`, {
    method: 'POST'
  })
})

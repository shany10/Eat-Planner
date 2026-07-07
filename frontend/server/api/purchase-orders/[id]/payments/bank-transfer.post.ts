import { backendFetch } from '../../../../utils/backend'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  return await backendFetch(event, `/purchase-orders/${id}/payments/bank-transfer`, {
    method: 'POST',
    body
  })
})

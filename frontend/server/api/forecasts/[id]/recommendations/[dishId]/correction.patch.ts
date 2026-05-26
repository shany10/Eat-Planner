import { backendFetch } from '../../../../../utils/backend'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const dishId = getRouterParam(event, 'dishId')
  const body = await readBody(event)

  return await backendFetch(event, `/forecasts/${id}/recommendations/${dishId}/correction`, {
    method: 'PATCH',
    body
  })
})

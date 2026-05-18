import { backendFetch } from '../../utils/backend'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  return await backendFetch(event, `/dishes/${id}`, {
    method: 'DELETE'
  })
})

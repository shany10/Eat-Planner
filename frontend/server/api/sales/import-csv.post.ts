import { backendFetch } from '../../utils/backend'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return await backendFetch(event, '/sales/import-csv', {
    method: 'POST',
    body
  })
})

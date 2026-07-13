import { backendFetch } from '../../utils/backend'

// Relaie l'appel vers la route de test backend (/debug/error) pour declencher
// une erreur cote Express et valider le projet GlitchTip backend.
export default defineEventHandler(async (event) => {
  return await backendFetch(event, '/debug/error')
})

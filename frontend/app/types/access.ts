export type UserRole = 'admin' | 'manager' | 'employee' | 'supplier'

export type AuthProvider = 'local' | 'google'

export type AuthProfile = {
  _id: string
  firstname: string
  lastname: string
  email: string
  role: UserRole
  active: boolean
  authProvider: AuthProvider
  twoFactorEnabled: boolean
  restaurantName: string
  defaultMarginRate: number
  vatRate: number
}

export type ManagedUser = AuthProfile & {
  created_at: string
  updated_at: string
}

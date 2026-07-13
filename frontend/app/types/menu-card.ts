export type MenuTheme = 'elegant' | 'modern' | 'rustic'

export type MenuDishBadge = 'vegetarian' | 'spicy'

export type MenuCardDish = {
  id: string
  name: string
  description: string
  price: number | null
  badges: MenuDishBadge[]
  allergens: string
}

export type MenuCardCategory = {
  id: string
  name: string
  dishes: MenuCardDish[]
}

export type MenuCardSettings = {
  restaurantName: string
  tagline: string
  footerNote: string
  theme: MenuTheme
}

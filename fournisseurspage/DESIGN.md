---
name: Gourmet Planner Narrative
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#40493e'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#707a6d'
  outline-variant: '#c0c9ba'
  surface-tint: '#1f6c28'
  primary: '#005013'
  on-primary: '#ffffff'
  primary-container: '#1b6925'
  on-primary-container: '#97e692'
  inverse-primary: '#8ad986'
  secondary: '#825500'
  on-secondary: '#ffffff'
  secondary-container: '#feb236'
  on-secondary-container: '#6d4700'
  tertiary: '#6b3414'
  on-tertiary: '#ffffff'
  tertiary-container: '#884b29'
  on-tertiary-container: '#ffc7ac'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a5f6a0'
  primary-fixed-dim: '#8ad986'
  on-primary-fixed: '#002204'
  on-primary-fixed-variant: '#005314'
  secondary-fixed: '#ffddb2'
  secondary-fixed-dim: '#ffb94e'
  on-secondary-fixed: '#291800'
  on-secondary-fixed-variant: '#624000'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb691'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#6f3717'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Be Vietnam Pro
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  title-md:
    fontFamily: Be Vietnam Pro
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system is built to evoke a playful, energetic, and appetizing atmosphere. It targets food enthusiasts and meal planners who value efficiency without sacrificing the joy of cooking. The visual language is deeply rooted in **Modern Tactile** design—mixing the warmth of organic food-inspired colors with the precision of structured, high-contrast layouts.

The personality is friendly and approachable, much like a helpful kitchen assistant. We achieve this through the use of hyper-rounded "pill" shapes, high-saturation accents, and clear, bold typography that remains legible amidst a vibrant interface. The emotional response should be one of motivation and delight, transforming the chore of meal planning into a creative ritual.

## Colors

The palette is derived from natural, culinary elements:
- **Forest Green (Primary):** Used for primary branding, success states, and key navigational highlights.
- **Vibrant Orange-Yellow (Secondary):** Reserved for primary Call-to-Actions (CTAs) and interactive elements that require immediate attention.
- **Chocolate Brown (Tertiary):** Used for deep text contrast, secondary icons, and grounding the lighter elements.
- **Terracotta Accent:** Employed for secondary blocks and highlights in ingredients or menu items.
- **Pure White & Soft Gray:** The canvas of the design system, ensuring the vibrant brand colors pop while maintaining a clean, professional finish.

## Typography

This design system utilizes **Be Vietnam Pro** exclusively to maintain a contemporary, friendly, and geometric feel. 

- **Headlines:** Use heavy weights (Bold 700 to ExtraBold 800) for titles to create a strong visual hierarchy and reflect the robust nature of the mascot logo.
- **Body Text:** Use Regular (400) for readability in lists and descriptions.
- **Labels:** Small labels on ingredients or inputs should use Bold (700) to remain legible against colorful backgrounds.
- **Scale:** Larger displays utilize tighter letter-spacing to emphasize the "blocky" and structured feel of the brand.

## Layout & Spacing

The layout follows a **Fluid Grid** system based on an 8px rhythm. 
- **Grid:** A 12-column grid is used for desktop, 6-column for tablet, and 2-column for mobile.
- **Gutters:** Standardized at 16px to keep content tight but distinct.
- **Margins:** Large outer margins (32px on desktop) ensure the content feels like a focused "planner" centered in the viewport.
- **Rhythm:** Vertical spacing between cards and sections should be generous (24px or 40px) to prevent the vibrant colors from overwhelming the user.

## Elevation & Depth

This design system prioritizes **Tonal Layers** and **Sharp Separations** over heavy shadows. 

- **Surfaces:** Use high-contrast color blocking to show hierarchy (e.g., a white card top on an orange base).
- **Outlines:** Use thin, low-opacity Chocolate Brown outlines (1px, 10% opacity) for cards on white backgrounds to provide definition without adding visual weight.
- **Shadows:** Only used for floating elements like Modals or Fab buttons. When used, they should be soft, slightly tinted with the Tertiary Brown, and have a wide blur radius to simulate natural light.

## Shapes

The shape language is the defining characteristic of this design system. It is **Pill-shaped (Full Rounded)**.

- **Buttons & Inputs:** Must always use a border-radius that creates a "capsule" or pill effect.
- **Cards:** Use a `rounded-xl` (1.5rem / 24px) setting to maintain the friendly, soft aesthetic while accommodating nested content.
- **Icons:** Should feature rounded terminals and soft corners to match the mascot’s illustrative style.

## Components

### Buttons & Inputs
- **Primary Button:** Pill-shaped, Secondary Yellow background, White or Chocolate Brown text (Bold). High-contrast and oversized.
- **Inputs:** Pill-shaped with a thick White or Gray background. Placeholder text should be in a muted version of the Body font.

### Cards (Blocks)
- **Split-Tone Cards:** Feature a vertical or horizontal split. For example, a "Menu Block" has a White upper section for the icon/title and an Orange lower section for the description.
- **Ingredient Bars:** Full-width pill-shaped bars using the Terracotta accent, with text and numbers clearly aligned in a single row.

### Selection Controls
- **Checkboxes/Radios:** Use the Primary Green when selected, always maintaining a soft, rounded appearance.
- **Chips:** Small, fully rounded capsules used for food categories or dietary tags, alternating between Primary Green and Secondary Yellow.

### Navigation
- **Navbar:** A clean, White horizontal bar with the Mascot logo left-aligned. Use a subtle shadow or a 1px soft-gray bottom border to separate it from the content area.
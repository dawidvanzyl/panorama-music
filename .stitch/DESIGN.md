---
name: Sonic Academy System
colors:
  surface: '#11131b'
  surface-dim: '#11131b'
  surface-bright: '#373941'
  surface-container-lowest: '#0c0e15'
  surface-container-low: '#191b23'
  surface-container: '#1d1f27'
  surface-container-high: '#282a32'
  surface-container-highest: '#33343d'
  on-surface: '#e2e1ed'
  on-surface-variant: '#c3c5d7'
  inverse-surface: '#e2e1ed'
  inverse-on-surface: '#2e3038'
  outline: '#8d90a0'
  outline-variant: '#434654'
  surface-tint: '#b5c4ff'
  primary: '#b5c4ff'
  on-primary: '#00297b'
  primary-container: '#648aff'
  on-primary-container: '#00236d'
  inverse-primary: '#1a53d6'
  secondary: '#c4c6d3'
  on-secondary: '#2d303b'
  secondary-container: '#444652'
  on-secondary-container: '#b2b4c2'
  tertiary: '#c2c5df'
  on-tertiary: '#2b2f44'
  tertiary-container: '#8c8fa8'
  on-tertiary-container: '#25293d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b5c4ff'
  on-primary-fixed: '#00164d'
  on-primary-fixed-variant: '#003cad'
  secondary-fixed: '#e0e2f0'
  secondary-fixed-dim: '#c4c6d3'
  on-secondary-fixed: '#181b25'
  on-secondary-fixed-variant: '#444652'
  tertiary-fixed: '#dee1fc'
  tertiary-fixed-dim: '#c2c5df'
  on-tertiary-fixed: '#161a2e'
  on-tertiary-fixed-variant: '#42465b'
  background: '#11131b'
  on-background: '#e2e1ed'
  surface-variant: '#33343d'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '700'
    lineHeight: '1.4'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  label-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: '0'
  hint-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '400'
    lineHeight: '1.2'
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  max-width: 1400px
  header-height: 60px
  gutter: 1rem
  margin-mobile: 16px
  margin-desktop: 24px
---

## Brand & Style
The design system is engineered for a high-performance music education environment. It balances technical precision with a deep, immersive aesthetic suitable for long hours of practice, composition, and administrative management. 

The style is **Corporate / Modern** with a lean toward **Minimalism**, utilizing a dark, high-contrast interface to reduce eye strain while maintaining clear visual hierarchy. It evokes a sense of "digital studio" professionalism—clean, focused, and systematic. The emotional response is one of serious academic pursuit blended with modern creative technology.

## Colors
The palette is rooted in a deep "Midnight Navy" foundation to provide a sophisticated alternative to pure black.

- **Background:** A near-black blue tint (#0f1117) provides the base canvas.
- **Surface Tiers:** Primary surfaces like cards use a slightly lighter navy (#1a1d27), while interactive elements like buttons and inputs use a secondary tier (#22263a) to create a clear "raised" mental model.
- **Accent:** A vibrant Electric Blue (#4f7cff) is used sparingly for primary actions, focus states, and progress indicators.
- **Status:** Standard semantic colors for Danger and Success are tuned for high legibility against dark backgrounds.

## Typography
This design system utilizes **Inter** (as the modern equivalent for high-density system-ui scaling) to ensure maximum legibility in a data-rich environment. 

- **Headings:** Bold weights with tight letter-spacing (-0.02em) create an authoritative, "instrument-panel" feel.
- **Body & Labels:** Primary body text is set to 14px for density, while labels use a 13px medium weight to differentiate from content.
- **Hints:** Used for secondary metadata or instructional text, rendered in the muted text color at 11px.

## Layout & Spacing
The layout follows a **Fixed Grid** philosophy within a max-width container, transitioning to fluid behavior on smaller screens.

- **The Shell:** A sticky 60px header defines the top boundary. Directly below, a sticky controls toolbar allows for constant access to filters, search, and sorting.
- **Grid System:** Content utilizes a CSS Grid `auto-fill` pattern with a minimum item width of 240px. This ensures a responsive, masonry-like reflow without complex media queries.
- **Margins:** 24px padding on desktop, reducing to 16px on mobile.
- **Scrolling:** Custom thin 6px scrollbars with a 3px radius are required to maintain the sleek, technical aesthetic.

## Elevation & Depth
Depth is communicated through color-stepping and subtle shadows rather than heavy blurs.

- **Stacking Logic:** Background (#0f1117) → Card Surface (#1a1d27) → Interactive Surface (#22263a).
- **Shadows:** A soft, high-spread shadow `0 4px 24px rgba(0,0,0,0.45)` is reserved for floating elements like dropdowns, modals, and hovered cards.
- **Transitions:** All interactive states (hover, focus) must use a 0.15s linear transition.
- **Interaction:** Cards physically "lift" by -3px on hover to provide tactile feedback in the catalog view.

## Shapes
The design system uses a **Rounded** shape language to soften the technical dark theme. 

- **Cards & Inputs:** A consistent 10px (0.625rem) radius is applied to harmonize these large blocks.
- **Buttons & Chips:** Pill-shaped (fully rounded) profiles are used to clearly distinguish interactive triggers from static containers.
- **Tags:** A smaller 4px radius is used for tiny metadata tags to keep them legible and distinct from button-like chips.

## Components

- **Buttons:** 14px semibold text, pill-shaped. Primary buttons use the accent blue; secondary buttons use the tertiary surface color.
- **Inputs:** Utilize the #22263a background with a #2e3250 border. On focus, they must display a 2px accent blue ring.
- **Sort Chips:** Pill-shaped with an accent border. They include a direction toggle icon and a clear button.
- **Badges:** Small colored pills with a 1px border of the same color (at 20% opacity) for status tracking.
- **View Toggle:** A segmented button group where the active state is defined by a bottom accent border or a subtle fill change.
- **Modals:** Centered on a 65% black backdrop. They inherit the 10px radius and deep shadow.
- **Disabled State:** Any interactive component in a disabled state should have its opacity reduced to 0.65 and its cursor set to `not-allowed`.
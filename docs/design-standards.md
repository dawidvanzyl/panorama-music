---
name: Panorama Music UI Design Standard
version: 1.2
status: normative
theme: dark (default), print (light override)
colors:
  bg: "#0f1117"
  surface: "#1a1d27"
  surface-2: "#22263a"
  border: "#2e3250"
  text: "#e4e6f0"
  text-muted: "#8a8fa8"
  accent: "#4f7cff"
  accent-text: "#6b92ff"
  accent-solid: "#3a63e8"
  accent-solid-hover: "#2f55d4"
  accent-soft: "rgba(79, 124, 255, 0.10)"
  danger: "#e05252"
  danger-text: "#ea6a6a"
  danger-solid: "#c93c3c"
  danger-solid-hover: "#b83232"
  danger-soft: "rgba(224, 82, 82, 0.10)"
  success: "#8fd44e"
  success-soft: "rgba(143, 212, 78, 0.10)"
  scrim: "rgba(0, 0, 0, 0.60)"
  on-solid: "#ffffff"
colors-print:
  bg: "#ffffff"
  surface: "#ffffff"
  surface-2: "#f4f4f6"
  border: "#d4d4da"
  text: "#111111"
  text-muted: "#555555"
  accent-text: "#2f55d4"
  danger-text: "#b83232"
  success: "#3f7a10"
  success-soft: "rgba(63, 122, 16, 0.10)"
typography:
  font-family: "'Inter', system-ui, sans-serif"
  icon-font: "'Material Symbols Outlined'"
  title:        { size: 1.125rem, weight: 700, line-height: 1.3, letter-spacing: -0.01em }
  page-title:   { size: 1.25rem,  weight: 700, line-height: 1.3, letter-spacing: -0.02em }
  body:         { size: 14px, weight: 400, line-height: 1.6 }
  value:        { size: 14px, weight: 400, line-height: 1.5 }
  field-label:  { size: 13px, weight: 600, line-height: 1.4 }
  hint:         { size: 12px, weight: 400, line-height: 1.4 }
  table-head:   { size: 12px, weight: 600, line-height: 1.4, letter-spacing: 0.04em, transform: uppercase }
  button:       { size: 14px, weight: 600, line-height: 1 }
  button-compact: { size: 13px, weight: 600, line-height: 1 }
rounded:
  sm: 4px
  md: 10px
  lg: 12px
  full: 9999px
spacing:
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  8: 32px
  modal-padding: 24px
  modal-body-gap: 24px
  content-padding: 1cm
  sidebar-width: 240px
sizes:
  button-modal-height: 40px
  button-form-height: 44px
  button-compact-height: 32px
  input-height: 44px
  close-control: 32px
  modal-width-sm: 420px
  modal-width-md: 520px
  modal-width-lg: 720px
  modal-max-height: "calc(100vh - 64px)"
elevation:
  none: "none"
  dropdown: "0 4px 12px rgba(0, 0, 0, 0.30)"
  floating: "0 4px 24px rgba(0, 0, 0, 0.45)"
  modal: "0 8px 32px rgba(0, 0, 0, 0.40)"
motion:
  transition: "0.15s linear"
  transition-properties: "background-color, border-color, color, opacity"
  spin: "0.7s linear infinite"
  press-scale: 0.98
disabled:
  opacity: 0.65
  cursor: not-allowed
---

# Panorama Music UI Design Standard

## 0. How to use this document

This document is the rulebook for every button, form and modal in Panorama Music. Read it before you build or review one. It does not describe screens. It does not depend on any story.

**Keywords.** MUST and MUST NOT are mandatory. SHOULD is the default. A deviation from SHOULD needs a written reason in the pull request. Each rule can be tested by reading CSS, markup or copy.

**Terms.** Each term has one meaning.

| Term | Meaning |
|---|---|
| Modal | A dialog above a scrim. |
| Confirmation modal | A modal that asks the user to approve one action. It has no data-entry fields, except a typed-confirmation field or a scope choice. |
| Destructive confirmation | A confirmation modal for an action that cannot be undone in the interface. |
| Reversible confirmation | A confirmation modal for an action that loses no data and can be undone in the interface. |
| Form modal | A modal that holds fields, a wizard, or read-only content. |
| Form | Any group of fields with an action row. It can be on a page, in a card or in a form modal. |
| Action row | The row of buttons at the end of a form or modal. |
| Confirm action | The button that performs the action. |
| Dismiss action | The button that closes the form or modal without acting. Its label is always Cancel. |
| Table row action | A button inside a table row or list row. |
| Compact button | The button size used for table row actions and for record actions inside a card. |
| Page button | A button at page level: page header, card header, filter, section entry point, or auth page submit. |
| Entity name | The name, email or title of the record that the action changes. |

**Which button standard applies.** The content decides.

- Confirmation modals use the **modal button** standard.
- Every other action row uses the **form button** standard. This includes page forms, form modals and the wizard.
- Table row actions and record actions inside a card use the **compact button** standard.
- Page header, card header, filter and section entry-point buttons use the **page button** standard (Section 7.4A). The submit button of an auth page also follows PGB-4.

| ID | Rule |
|---|---|
| USE-1 | A button MUST follow exactly one standard: modal, form, compact or page. |
| USE-2 | A confirmation modal MUST use modal buttons only. |
| USE-3 | A form modal MUST use form buttons in its action row. |
| USE-4 | A table row action MUST use compact buttons. |
| USE-5 | A new button style MUST NOT be created. Add a variant to this document first. |
| USE-6 | A text link MUST NOT be styled as a button. A button MUST NOT be styled as a text link. |

---

## 1. Brand & Style

Panorama Music is an administrative tool for a school music department. The interface is serious, quiet and institutional.

| ID | Rule |
|---|---|
| BRD-1 | The interface MUST use flat colour fills. It MUST NOT use gradients, photographs, illustrations or textures in forms, tables or modals. |
| BRD-2 | Depth MUST come from the three surface steps (`--pm-bg`, `--pm-surface`, `--pm-surface-2`) and a 1px border. Shadow is reserved for floating layers (Section 5). |
| BRD-3 | Copy MUST be plain and factual. It MUST NOT contain exclamation marks, emoji, jokes or first-person words ("I", "we"). |
| BRD-4 | Icons MUST be Material Symbols Outlined ligatures with `font-variation-settings: 'FILL' 0`. The product MUST NOT use an icon library, SVG sprites or emoji. |
| BRD-5 | Colour MUST NOT be the only carrier of meaning. A destructive action MUST also have words (verb) or an icon. |
| BRD-6 | The app is mouse-driven. This standard MUST NOT add keyboard shortcuts, keyboard navigation patterns or Escape-to-close. These are permanent non-goals. Markup MUST NOT use a role that implies keyboard interaction (for example `menu`). Plain buttons are preferred. |

---

## 2. Colors

All colours are CSS custom properties on `:root`. Components read tokens. They do not write hex values.

### 2.1 Token table

| Token | Dark value | Print value | Use |
|---|---|---|---|
| `--pm-bg` | `#0f1117` | `#fff` | Page background. |
| `--pm-surface` | `#1a1d27` | `#fff` | Cards, modal card. |
| `--pm-surface-2` | `#22263a` | `#f4f4f6` | Inputs, hover fills, nested panels. |
| `--pm-border` | `#2e3250` | `#d4d4da` | All 1px borders. |
| `--pm-text` | `#e4e6f0` | `#111` | Primary text, titles, secondary-button text. |
| `--pm-text-muted` | `#8a8fa8` | `#555` | Body text in modals, hints, table heads. |
| `--pm-accent` | `#4f7cff` | `#4f7cff` | Icons, focus border, active indicators, outline borders. |
| `--pm-accent-text` | `#6b92ff` | `#2f55d4` | Accent-coloured text on dark surfaces. |
| `--pm-accent-solid` | `#3a63e8` | `#3a63e8` | Fill of primary buttons. |
| `--pm-accent-solid-hover` | `#2f55d4` | `#2f55d4` | Hover fill of primary buttons. |
| `--pm-accent-soft` | `rgba(79,124,255,.10)` | `rgba(79,124,255,.10)` | Hover tint of accent outline buttons. |
| `--pm-danger` | `#e05252` | `#e05252` | Icons, borders and focus on destructive elements. |
| `--pm-danger-text` | `#ea6a6a` | `#b83232` | Error text, destructive outline button text. |
| `--pm-danger-solid` | `#c93c3c` | `#c93c3c` | Fill of destructive buttons. |
| `--pm-danger-solid-hover` | `#b83232` | `#b83232` | Hover fill of destructive buttons. |
| `--pm-danger-soft` | `rgba(224,82,82,.10)` | `rgba(224,82,82,.10)` | Error banner fill, hover tint of destructive outline buttons. |
| `--pm-success` | `#8fd44e` | `#3f7a10` | Success text and icons. |
| `--pm-success-soft` | `rgba(143,212,78,.10)` | `rgba(63,122,16,.10)` | Success banner fill. |
| `--pm-scrim` | `rgba(0,0,0,.6)` | not printed | Modal backdrop. |
| `--pm-on-solid` | `#fff` | `#fff` | Text on solid button fills. |

### 2.2 Changes from the current tokens

| Change | Why |
|---|---|
| Add `--pm-accent-solid` (`#3a63e8`). White text on `#4f7cff` is 3.7:1. On `#3a63e8` it is 5.1:1. | Button text MUST reach 4.5:1. |
| Add `--pm-danger-solid` (`#c93c3c`). White text on `#e05252` is 3.8:1. On `#c93c3c` it is 5.0:1. | Same reason. |
| Add `--pm-danger-text` (`#ea6a6a`). `#e05252` text on `--pm-surface` is 4.4:1. `#ea6a6a` is 5.5:1. | Error text MUST reach 4.5:1. |
| Add `--pm-accent-text` (`#6b92ff`). `#4f7cff` text on `--pm-surface-2` is 4.0:1. `#6b92ff` is 5.1:1. | Outline button hover sits on `--pm-surface-2`. |
| Add `--pm-success`, `-soft`, `--pm-scrim`. | These values exist in the design spec and in inline code. They get names. |
| Remove all fallback values in `var()`. Current fallbacks are `#9194a6`, `#e2e1ed` and `#6c5ce7`. They differ from the token values. | One value for one token. |
| Add `--pm-radius-sm` (4px), `--pm-radius-lg` (12px), `--pm-radius-full` (9999px), `--pm-shadow-dropdown`, `--pm-shadow-modal`, `--pm-modal-width-sm`, `-md`, `-lg` (420, 520, 720px) and `--pm-modal-body-gap` (24px). | These values repeat in code as literals. Each gets a name. |
| Replace `--pm-accent-hover` with `--pm-accent-solid` (`#3a63e8`, same value). The hover fill is `--pm-accent-solid-hover`. | The name states that the token is a solid fill. |
| Remove danger colour from modal titles. | `#e05252` text is 4.4:1. Titles are the same in every family. The icon carries the family colour. |

### 2.3 Rules

| ID | Rule |
|---|---|
| COL-1 | A component MUST read colour from a `--pm-*` token. It MUST NOT contain a hex or `rgb()` value, except inside `:root`. |
| COL-2 | A `var(--pm-*)` call MUST NOT have a fallback value. |
| COL-3 | Text MUST have a contrast ratio of at least 4.5:1 against its background in dark and in print mode. |
| COL-4 | Text on a solid button fill MUST use `--pm-on-solid`. |
| COL-5 | `--pm-danger`, `--pm-danger-text`, `--pm-danger-solid` and `--pm-danger-soft` MUST appear only on destructive actions, destructive icons and error states. |
| COL-6 | A primary button MUST NOT use a danger token. A destructive button MUST NOT use an accent token. |
| COL-7 | Print mode MUST redefine the tokens in the Print column. Print mode MUST set the shadow tokens to `none` (ELV-6). Print mode MUST NOT redefine any other token. |

---

## 3. Typography

Inter is the only text font. Material Symbols Outlined is the only icon font.

| Role | Size | Weight | Line height | Tracking | Use |
|---|---|---|---|---|---|
| Page title | 1.25rem | 700 | 1.3 | −0.02em | One per page. |
| Title | 1.125rem | 700 | 1.3 | −0.01em | Modal title, card title. |
| Body | 14px | 400 | 1.6 | 0 | Modal body, notices. |
| Value | 14px | 400 | 1.5 | 0 | Input text, table cells. |
| Field label | 13px | 600 | 1.4 | 0 | Label above a field. |
| Hint | 12px | 400 | 1.4 | 0 | Help text under a field. |
| Table head | 12px | 600 | 1.4 | 0.04em | Uppercase. |
| Button | 14px | 600 | 1 | 0 | Modal and form buttons. |
| Compact button | 13px | 600 | 1 | 0 | Table row actions and record actions inside a card. |
| Icon in title | 24px | n/a | 1 | 0 | Beside a modal title. |

| ID | Rule |
|---|---|
| TYP-1 | Text MUST use one of the roles in this table. |
| TYP-2 | A modal title MUST use the Title role and `--pm-text`, in every family. |
| TYP-3 | A modal body MUST use the Body role and `--pm-text-muted`. |
| TYP-4 | In a modal body, an entity name MUST be wrapped in `<strong>` with `color: var(--pm-text)` and `font-weight: 700`. |
| TYP-5 | In a destructive modal body, the phrase "cannot be undone" MUST be wrapped in `<strong>` with the same style as TYP-4. |
| TYP-6 | Other words in a body MUST NOT be bold, italic or underlined. |
| TYP-7 | Error text MUST use 13px/400 and `--pm-danger-text`. |
| TYP-8 | A button label MUST NOT wrap. It MUST use `white-space: nowrap`. |
| TYP-9 | Titles and button labels MUST use Title Case. Body text MUST use sentence case. |

**Changes.** Field label weight is 600 (was 500 in one modal; the other forms use 600). Compact button size is 13px (was 12px in two tables and 13px in the banking section; 12px is under the readable minimum for a click target label).

---

## 4. Layout & Spacing

### 4.1 Scale

Use the spacing scale only: 4, 8, 12, 16, 20, 24, 32 px.

| ID | Rule |
|---|---|
| SPC-1 | `margin`, `padding` and `gap` values MUST come from the spacing scale. |
| SPC-2 | Sibling controls MUST be laid out with `display: flex` or `grid` and `gap`. They MUST NOT rely on margins between siblings or on whitespace. |
| SPC-3 | A card MUST have 24px padding. |
| SPC-4 | Gap between form fields MUST be 16px. Gap between a label and its field MUST be 8px. |

### 4.2 Modal geometry

| Item | Value | Why |
|---|---|---|
| Padding | 24px | Same as card padding. |
| Width small (`--pm-modal-width-sm`) | 420px | Confirmation modals. |
| Width medium (`--pm-modal-width-md`) | 520px | Form modals with up to two columns of fields. |
| Width large (`--pm-modal-width-lg`) | 720px | Form modals with a table or banking form. |
| Width fill | `calc(100% - var(--pm-sidebar-width) - 2 * var(--pm-content-padding))` | Wizard and session table only. |
| Gap, body to action row | 24px (`--pm-modal-body-gap`) | Was 16px. The extra space separates the decision from the text. |
| Max height | `calc(100vh - 64px)`; the card body scrolls, the action row stays | Long content must not push buttons off screen. |

**Changes.** Current widths are 420, 440, 520, 620 and 630px. They reduce to three fixed widths plus fill, so that dialogs line up.

| ID | Rule |
|---|---|
| LAY-1 | A modal card MUST have a width from the table above. No other width is allowed. |
| LAY-2 | A confirmation modal MUST use width small. |
| LAY-3 | The modal card MUST have `width: calc(100% - 32px)` as a narrow-screen limit. |
| LAY-4 | The action row MUST stay visible when the body scrolls. |
| LAY-5 | Page content MUST keep `--pm-content-padding` (1cm). Header height is 60px. Sidebar width is 240px. Content max width is 1400px. |

---

## 5. Elevation & Depth

| Layer | Token | Value |
|---|---|---|
| Card at rest | none | `box-shadow: none`; `1px solid var(--pm-border)` |
| Dropdown | `--pm-shadow-dropdown` | `0 4px 12px rgba(0,0,0,.30)` |
| Floating (account menu, toasts) | `--pm-shadow` | `0 4px 24px rgba(0,0,0,.45)` |
| Modal card | `--pm-shadow-modal` | `0 8px 32px rgba(0,0,0,.40)` |
| Modal backdrop | `--pm-scrim` | `rgba(0,0,0,.6)` with `backdrop-filter: blur(2px)` |

| ID | Rule |
|---|---|
| ELV-1 | A card at rest MUST NOT have a shadow. |
| ELV-2 | A modal card MUST use `--pm-shadow-modal`. |
| ELV-3 | A modal backdrop MUST use `--pm-scrim`, `backdrop-filter: blur(2px)`, `position: fixed`, `inset: 0` and `z-index: 100`. |
| ELV-4 | An error banner above a modal MUST use `z-index: 110`. |
| ELV-5 | Blur MUST NOT be used on cards, tables or navigation. |
| ELV-6 | Shadow tokens MUST be `none` in print mode. |
| ELV-7 | A confirmation modal opened above another modal MUST use `z-index: 120`. This is above the error banner (ELV-4). |

---

## 6. Shapes

| Token | Value | Use |
|---|---|---|
| `--pm-radius-sm` | 4px | Tags, small chips. |
| `--pm-radius` | 10px | Cards, modal card, inputs, form buttons, compact buttons. |
| `--pm-radius-lg` | 12px | Auth card. |
| `--pm-radius-full` | 9999px | Modal buttons, status badges, the close control. |

| ID | Rule |
|---|---|
| SHP-1 | Modal buttons MUST use `--pm-radius-full`. |
| SHP-2 | Form buttons and compact buttons MUST use `--pm-radius`. |
| SHP-3 | Inputs and selects MUST use `--pm-radius`. |
| SHP-4 | Borders MUST be 1px. A coloured border is allowed only for focus, error and destructive states. |

**Why two button shapes.** The modal pill marks a short decision. The form button shares its radius and height with the inputs next to it.

---

## 7. Components

### 7.1 Button states (all standards)

| State | Rule |
|---|---|
| Transition | `transition: background-color, border-color, color, opacity 0.15s linear`. No easing curve. |
| Press | Primary and destructive buttons: `transform: scale(0.98)` while pressed. Other variants: no change. |
| Disabled | `opacity: 0.65`; `cursor: not-allowed`; no hover change; the `disabled` attribute is set. |
| Loading | The button is disabled and has `aria-busy="true"`. Its label does not change. A 18px `progress_activity` icon is placed before the label with `gap: 8px` and `animation: spin 0.7s linear infinite`. The dismiss action in the same row is also disabled. |
| Cursor | `cursor: pointer` when enabled. |

| ID | Rule |
|---|---|
| BTN-1 | A confirm action that sends a request MUST enter the loading state when clicked and MUST leave it when the request ends. |
| BTN-2 | A button MUST NOT use any other opacity, filter or colour change for disabled. |
| BTN-3 | A button label MUST be text only. A button MUST NOT contain an icon, except the loading icon and the leading icon of a page button (PGB-3). |
| BTN-4 | A disabled confirm action MUST show the reason as text in the form or modal, or the reason MUST be obvious from an empty required field. |

### 7.2 Modal buttons

Used in confirmation modals only.

| Property | Primary (reversible confirm) | Destructive (destructive confirm) | Secondary (Cancel) |
|---|---|---|---|
| Height | 40px | 40px | 40px |
| Padding | `0 24px` | `0 24px` | `0 24px` |
| Radius | `--pm-radius-full` | `--pm-radius-full` | `--pm-radius-full` |
| Typography | Button role | Button role | Button role |
| Min width | 96px | 96px | 96px |
| Background | `--pm-accent-solid` | `--pm-danger-solid` | `transparent` |
| Border | `1px solid --pm-accent-solid` | `1px solid --pm-danger-solid` | `1px solid --pm-border` |
| Text | `--pm-on-solid` | `--pm-on-solid` | `--pm-text` |
| Hover | bg and border `--pm-accent-solid-hover` | bg and border `--pm-danger-solid-hover` | bg `--pm-surface-2` |
| Disabled | state table | state table | state table |
| Loading | state table | state table | state table |

**Changes.**

| Change | Current | Standard | Why |
|---|---|---|---|
| Height | Set by padding (about 41px) | 40px fixed | Testable value. |
| Padding | `10px 24px` | `0 24px` | Height now fixed. |
| Hover | `opacity: .9` | Darker fill | Opacity lowers contrast. |
| Cancel text | `--pm-text-muted` | `--pm-text` | Same as the form Cancel. One Cancel look. |
| Destructive fill | `#e05252` | `--pm-danger-solid` | Contrast 5.0:1. |

### 7.3 Form buttons

Used in every action row that is not in a confirmation modal.

| Property | Primary | Secondary |
|---|---|---|
| Height | 44px | 44px |
| Padding | `0 24px` | `0 24px` |
| Radius | `--pm-radius` | `--pm-radius` |
| Typography | Button role | Button role |
| Min width | 96px | 96px |
| Background | `--pm-accent-solid` | `transparent` |
| Border | `1px solid --pm-accent-solid` | `1px solid --pm-border` |
| Text | `--pm-on-solid` | `--pm-text` |
| Hover | bg and border `--pm-accent-solid-hover` | bg `--pm-surface-2` |
| Disabled / Loading | state table | state table |

There is no destructive form button. A destructive action MUST be confirmed in a destructive confirmation modal.

**Changes.**

| Change | Current | Standard | Why |
|---|---|---|---|
| Height | 44px (wizard, course), 40px (guardian), about 30px (banking) | 44px | Matches the input height (44px). |
| Padding | `0 24px`, `6px 16px`, other | `0 24px` | One value. |
| Primary border | none or 1px | 1px same colour | Equal box size for primary and secondary. |
| Hover | none, `opacity`, `brightness` | Darker fill | One hover. |

### 7.4 Compact buttons

Used for table row actions and for record actions inside a card (for example Edit and Delete beside saved details).

| Property | Default | Destructive |
|---|---|---|
| Height | 32px | 32px |
| Padding | `0 12px` | `0 12px` |
| Radius | `--pm-radius` | `--pm-radius` |
| Typography | Compact button role | Compact button role |
| Background | `transparent` | `transparent` |
| Border | `1px solid --pm-accent` | `1px solid --pm-danger` |
| Text | `--pm-accent-text` | `--pm-danger-text` |
| Hover | bg `--pm-accent-soft` | bg `--pm-danger-soft` |
| Disabled / Loading | state table | state table |

**Changes.**

| Change | Current | Standard | Why |
|---|---|---|---|
| Destructive row button is outline, not filled red | Filled `#e05252` in six tables | Outline | A filled red button repeats on every row and hides real danger. The filled button appears in the confirmation modal. |
| Height | `6px 12px` padding at 12px type | 32px fixed | Testable value. |
| Compact buttons have no filled variant | Filled accent in sessions and banking | Outline only | Filled is for confirm actions. |

### 7.4A Page buttons

Used for page header and card header buttons, filter buttons and section entry-point buttons (a button that opens a form or a modal). Status: awaiting owner approval (Appendix A.5 point 4). When approved, delete this sentence and A.5 point 4.

| Property | Primary | Secondary | Destructive |
|---|---|---|---|
| Height | 40px | 40px | 40px |
| Padding | `0 16px` | `0 16px` | `0 16px` |
| Radius | `--pm-radius` | `--pm-radius` | `--pm-radius` |
| Typography | Button role | Button role | Button role |
| Background | `--pm-accent-solid` | `transparent` | `transparent` |
| Border | `1px solid --pm-accent-solid` | `1px solid --pm-border` | `1px solid --pm-danger` |
| Text | `--pm-on-solid` | `--pm-text` | `--pm-danger-text` |
| Hover | bg and border `--pm-accent-solid-hover` | bg `--pm-surface-2` | bg `--pm-danger-soft` |
| Disabled / Loading | state table | state table | state table |

| ID | Rule |
|---|---|
| PGB-1 | A page button MUST match the table above. |
| PGB-2 | A page button that uses the destructive family MUST open a destructive confirmation modal. It MUST NOT act on the first click. |
| PGB-3 | A page button MAY have one leading icon: a 18px ligature, `gap: 8px` to the label. It MUST NOT have a trailing icon. It MUST NOT be icon-only. |
| PGB-4 | The submit button of an auth page MUST be the form primary button with `width: 100%`. An auth page has no Cancel. ACT-2 and ACT-7 do not apply to it. |
| PGB-5 | A group of page buttons MUST be a flex row with `gap: 12px`, right-aligned. Order, left to right: secondary, destructive, primary. |
| PGB-6 | A group MUST have at most one primary page button. |
| PGB-7 | A section entry-point label MUST be `{Verb} {Noun}` (LBL-5). |
| PGB-8 | Page buttons MUST NOT be printed (PRT-2). |

### 7.5 Modal anatomy

A modal has these parts in this order.

| Part | Spec |
|---|---|
| Backdrop | Section 5, ELV-3. |
| Card | `--pm-surface`; `1px solid --pm-border`; `--pm-radius`; padding 24px; `--pm-shadow-modal`; width from Section 4.2. |
| Header | `display: flex`; `align-items: center`; `gap: 12px`; `margin-bottom: 16px`. Title on the left. Close control on the right (`margin-left: auto`). |
| Icon | Confirmation modals only. 24px Material Symbols Outlined ligature. Left of the title. `aria-hidden="true"`. |
| Title | Title role. `--pm-text`. One line. No question mark. No full stop. |
| Subtitle | Optional. Body role, `--pm-text-muted`, under the title, `gap: 4px`. Form modals only. |
| Close control | A `<button type="button">` with `aria-label="Close"`. Ligature `close`, 22px. Box 32 × 32px. `--pm-radius-full`. `color: --pm-text-muted`. Hover: `color: --pm-text` and `background: --pm-surface-2`. No border. |
| Body | Body role. `--pm-text-muted`. |
| Error line | 13px, `--pm-danger-text`, `margin-top: 12px`, above the action row. Hidden when empty. |
| Action row | Section 7.9. Placed 24px below the body. |

| ID | Rule |
|---|---|
| MOD-1 | Every modal MUST have a close control in the header. |
| MOD-2 | The close control MUST do the same as the dismiss action. If the modal has unsaved fields, the close control MUST NOT save them. |
| MOD-3 | A modal MUST NOT close when the user clicks the backdrop. |
| MOD-4 | A modal MUST have one title. The title MUST be an `<h2>`. |
| MOD-5 | A confirmation modal MUST have an icon in the header. A form modal MUST NOT have an icon in the header. |
| MOD-6 | A confirmation modal MUST NOT open another modal. A form modal MAY open one confirmation modal above itself. |
| MOD-7 | A modal that only shows information (no confirm action) MUST NOT have an action row. The close control is its only dismiss control. |
| MOD-8 | A modal MUST NOT animate on open or close. |
| MOD-9 | A modal MUST be hidden in print mode (`display: none`). |
| MOD-10 | A modal MUST use `role="dialog"`, `aria-modal="true"` and `aria-labelledby` set to the title. A typed-confirmation modal MUST use `role="alertdialog"`. These attributes are labels only. The standard adds no focus management. |
| MOD-11 | A modal MUST NOT close on a key press. A modal MUST NOT have a key handler. |

### 7.6 Destructive confirmation modal

For any action that cannot be undone in the interface.

| Item | Spec |
|---|---|
| Width | Small (420px). |
| Icon | `delete_forever`, 24px, `color: --pm-danger`. |
| Title | `{Verb} {Noun}`. See Section 8. |
| Body | One paragraph. Starts with "This action **cannot be undone**." See Section 8. |
| Optional parts | A typed-confirmation field; a scope choice. |
| Action row | Cancel (modal secondary), then confirm (modal destructive). |
| Confirm label | The verb only. |

| ID | Rule |
|---|---|
| DES-1 | An action that cannot be undone in the interface MUST use this family. This includes any action that permanently deletes data, even when the verb is deactivate, withdraw or unlink. |
| DES-2 | The confirm button MUST be the modal destructive button. |
| DES-3 | The icon MUST be `delete_forever` in `--pm-danger`. |
| DES-4 | The body MUST state that the action cannot be undone, with the phrase "cannot be undone" in `<strong>`. |
| DES-5 | The body MUST name every kind of data that is deleted as a side effect. |
| DES-6 | A typed-confirmation field MUST keep the confirm button disabled until the typed text equals the required text exactly. |
| DES-7 | A typed-confirmation field MUST have 40px height, `--pm-radius`, `--pm-surface-2` fill and `1px solid --pm-border`. Its focus border MUST be `--pm-danger`. |
| DES-8 | The typed-confirmation instruction MUST appear once, as the field label: `Type "{required text}" to confirm`. The body MUST NOT repeat it. |
| DES-9 | A scope choice MUST use radio inputs. Each option MUST read `{Action} — {consequence}.` The safest option MUST be selected by default. |

### 7.7 Reversible confirmation modal

For an action that loses no data and can be undone later.

| Item | Spec |
|---|---|
| Width | Small (420px). |
| Icon | `info`, 24px, `color: --pm-accent`. |
| Title | `{Verb} {Noun}`. |
| Body | One paragraph. States the consequence and how to undo. |
| Action row | Cancel (modal secondary), then confirm (modal primary). |
| Confirm label | The verb only. |

| ID | Rule |
|---|---|
| REV-1 | An action MUST use this family only if no data is lost and the user can undo it in the interface. |
| REV-2 | The confirm button MUST be the modal primary button. It MUST NOT use a danger token. |
| REV-3 | The icon MUST be `info` in `--pm-accent`. |
| REV-4 | The body MUST state the consequence and MUST state how to undo it. |
| REV-5 | The body MUST NOT contain the phrase "cannot be undone". |
| REV-6 | A typed-confirmation field in this family MUST follow DES-6 to DES-8. Its focus border MUST be `--pm-accent`. |

### 7.8 Form modal

For modals that hold fields, a wizard, or information.

| Item | Spec |
|---|---|
| Width | Medium (520px), large (720px) or fill. |
| Icon | None. |
| Title | `{Verb} {Noun}` or `{Noun}` for an information modal. |
| Body | Fields in a grid. 16px gap. Input height 44px. |
| Action row | Cancel (form secondary), then confirm (form primary). |
| Confirm label | See Section 8.3. |

| ID | Rule |
|---|---|
| FMD-1 | A form modal MUST use form buttons. |
| FMD-2 | A form modal with a confirm action MUST have an action row with Cancel and the confirm action. |
| FMD-3 | Cancel MUST NOT save, send or validate. |
| FMD-4 | Inputs and selects MUST have 44px height, `0 12px` padding, `--pm-radius`, `--pm-surface-2` fill, `1px solid --pm-border`, Value role. Focus border MUST be `--pm-accent`. |
| FMD-5 | Each field MUST have a visible label above it in the Field label role. |
| FMD-6 | A modal that writes to the server MUST show errors in the error line. It MUST NOT close on error. |
| FMD-7 | A wizard step that saves by itself MUST have its own action row at the end of that step. |

### 7.9 Action rows

| ID | Rule |
|---|---|
| ACT-1 | An action row MUST be `display: flex` with `gap: 12px`. |
| ACT-2 | An action row MUST be right-aligned (`justify-content: flex-end`). The wizard row is the only exception (WIZ-3). |
| ACT-3 | Cancel MUST come before the confirm action. |
| ACT-4 | The confirm action MUST be the last control in the row, at the right edge. |
| ACT-5 | An action row MUST have at most one confirm action. |
| ACT-6 | An action row MUST have at most one primary or destructive button. |
| ACT-7 | If a form or modal has a confirm action, it MUST also have Cancel, unless MOD-7 applies. |
| ACT-8 | A button in the row MUST NOT change order, position or label when the form is busy. |
| ACT-9 | The dismiss action MUST be labelled "Cancel". It MUST NOT be labelled "Close", "Discard", "No", "Back" or "Dismiss". |
| ACT-10 | In a form that is not in a modal, the action row MUST be placed after the last field with a 24px gap. |
| ACT-11 | An action row MUST NOT be printed (`display: none` in print mode). |

### 7.10 Wizard Previous and Next

| ID | Rule |
|---|---|
| WIZ-1 | The wizard action row MUST contain, in this order: Cancel, Previous, Next. |
| WIZ-2 | On the last step, Next MUST be replaced by the confirm action, and its label MUST follow Section 8.3. |
| WIZ-3 | Cancel MUST be placed at the left edge of the row (`margin-right: auto`). Previous and Next MUST be right-aligned with `gap: 12px`. |
| WIZ-4 | Cancel and Previous MUST be form secondary buttons. Next MUST be the form primary button. |
| WIZ-5 | Previous MUST be hidden on the first step. Next MUST be hidden on the last step. |
| WIZ-6 | Previous, Next and the final confirm action MUST NOT contain arrows or icons. |
| WIZ-7 | A wizard step that is saved on its own (edit mode) MUST NOT show Previous or Next. |
| WIZ-8 | The wizard MUST NOT have a footer Cancel when a step has its own action row. The close control closes the wizard. |

**Why Cancel sits apart.** Cancel and Previous have the same look. A 12px gap is not enough to prevent a wrong click. The left edge separates "leave" from "move".

### 7.11 Forms (not in a modal)

| ID | Rule |
|---|---|
| FRM-1 | A form MUST end with an action row that follows Section 7.9 and uses form buttons. |
| FRM-2 | A form that creates a record MUST have Cancel and the confirm action. |
| FRM-3 | A form that edits a record MUST have Cancel and "Save". |
| FRM-4 | A form MUST show field errors under the field in the Hint role with `--pm-danger-text`. |
| FRM-5 | A form MUST show a request error in the error line above the action row. |
| FRM-6 | The confirm action MUST be disabled while the request is in progress. |
| FRM-7 | An action row of a form MUST NOT contain a destructive button. A compact destructive button MAY sit elsewhere in the same card. |

### 7.12 Table row actions

| ID | Rule |
|---|---|
| ROW-1 | A table row action MUST be a compact button. |
| ROW-2 | Row actions MUST be in the last column. The column head MUST read "Actions" and MUST be right-aligned. |
| ROW-3 | Row actions MUST be right-aligned in a flex row with `gap: 8px`. |
| ROW-4 | Order, left to right: non-destructive actions, then reversible state changes, then destructive actions. The destructive action MUST be last. |
| ROW-5 | The label MUST be the verb only, equal to the confirm label of the modal that it opens (Section 8). |
| ROW-6 | A row action that uses the destructive family MUST use the destructive compact variant. All other row actions MUST use the default variant. |
| ROW-7 | A row action that uses the destructive family MUST open a destructive confirmation modal. It MUST NOT act on the first click. |
| ROW-8 | A row action MAY act on the first click if it is reversible (reactivate, print). |
| ROW-9 | A row action MUST NOT contain an icon. |
| ROW-10 | Row actions MUST NOT be printed. The Actions column MUST be hidden in print mode. |
| ROW-11 | Two row actions in one row MUST NOT use the same label. |
| ROW-12 | A row action that the user is not allowed to use MUST be hidden. It MUST NOT be disabled. |

### 7.13 Print

| ID | Rule |
|---|---|
| PRT-1 | Print mode MUST set the tokens in the Print column of Section 2.1. |
| PRT-2 | Buttons, action rows, modals, backdrops and close controls MUST have `display: none` in print mode. |
| PRT-3 | Print mode MUST keep `print-color-adjust: exact` on `:root`. |
| PRT-4 | A printable view MUST NOT depend on a `--pm-scrim` or `--pm-shadow-*` value. |

---

## 8. Wording

### 8.1 General rules

| ID | Rule |
|---|---|
| WRD-1 | A title MUST be `{Verb} {Noun}` in Title Case. It MUST NOT be a question. |
| WRD-2 | A title MUST NOT contain an adverb such as "Permanently". |
| WRD-3 | A body MUST NOT start with "Are you sure". |
| WRD-4 | A destructive body MUST start with "This action **cannot be undone**." Then it MUST state the action and the consequence. A reversible body MUST state the action, then the consequence. |
| WRD-5 | A body MUST use the third person. Instructions use the second person ("You can reactivate this user later."). |
| WRD-6 | A body MUST use the same noun as the title. |
| WRD-7 | A body MUST NOT use a line break (`<br>`) to separate sentences. Use full stops in one paragraph. Use a second paragraph only for a scope choice. |
| WRD-8 | A word MUST have one meaning. Use only the verbs in Section 8.2. A synonym is not allowed. |
| WRD-9 | The unit of text is a short sentence. A sentence MUST have one idea. |

### 8.2 Wording matrix: confirmation verbs

`{Noun}` is the singular record type in Title Case in titles and in lower case in bodies. `{name}` is the entity name.

| Verb | Family | Title | Body | Confirm label | Icon | Reversible |
|---|---|---|---|---|---|---|
| delete | Destructive | `Delete {Noun}` | This action **cannot be undone**. The {noun} **{name}** will be permanently removed. | `Delete` | `delete_forever` | No |
| remove | Destructive | `Remove {Noun} from {Container}` | This action **cannot be undone**. The {noun} **{name}** will be removed from the {container}. {Side effect.} | `Remove` | `delete_forever` | No |
| withdraw | Destructive | `Withdraw {Noun}` | This action **cannot be undone**. **{name}** will be permanently withdrawn from **{target}**. | `Withdraw` | `delete_forever` | No |
| deactivate | Reversible | `Deactivate {Noun}` | The {noun} **{name}** will be deactivated. {Consequence.} You can reactivate this {noun} later. | `Deactivate` | `info` | Yes |
| reactivate | Reversible | `Reactivate {Noun}` | The {noun} **{name}** will be reactivated. {Consequence.} | `Reactivate` | `info` | Yes |
| unlink | Reversible | `Unlink {Noun}` | **{name}** will be unlinked from {target}. {Consequence.} You can link it again later. | `Unlink` | `info` | Yes |
| revoke | Destructive | `Revoke {Noun}` | This action **cannot be undone**. {Scope} will be ended. {Who} must sign in again. | `Revoke` | `delete_forever` | No |

**Notes.**

| ID | Rule |
|---|---|
| MTX-1 | Delete removes a record. Remove takes a record out of a list or a parent and deletes it. Both are permanent. Use "Unlink" when the record stays. |
| MTX-2 | If a deactivate action also deletes data, it MUST use the destructive family: icon `delete_forever`, destructive confirm button, "cannot be undone" in the body. The verb stays "Deactivate". The body MUST name the deleted data. The Reversible column then reads "No". |
| MTX-3 | An optional side-effect sentence in a delete body MUST read `{Dependents} will also be permanently removed.` |
| MTX-4 | A revoke action MAY carry a quantifier. The labels are `Revoke All` (all sessions of all users) and `Revoke All Others` (all other sessions of the signed-in user). The titles are `Revoke All Sessions` and `Revoke Other Sessions`. No other label has a quantifier. |
| MTX-5 | Reactivate MAY run without a modal (ROW-8). If a modal is used, it MUST follow this matrix. Revoke MUST use a destructive confirmation modal. |
| MTX-6 | The matrix applies in the same way to a modal opened from a table row, a card, a page header or a list. |

### 8.3 Wording matrix: form verbs

| Verb | Title | Body (optional) | Confirm label | Icon | Reversible |
|---|---|---|---|---|---|
| create | `Create {Noun}` | One sentence on what is created. | `Create {Noun}` | none | Yes (by delete) |
| edit | `Edit {Noun}: {name}` | None. | `Save` | none | Yes |
| save | `Save {Noun}` (see LBL-6) | One sentence on where the saved item appears. | `Save {Noun}` | none | Yes (by delete) |
| link | `Link {Noun}` | One sentence on the limits of the link. | `Link {Noun}` | none | Yes (by unlink) |
| enrol | `Enrol {Noun}` | One sentence on the consequence. | `Enrol {Noun}` | none | Yes (by withdraw) |
| assign | `Assign {Noun}` | One sentence on the consequence. | `Assign {Noun}` | none | Yes (by remove) |
| sign in | Page heading (not set by this standard) | None. | `Sign In` | none | Yes (by sign out) |
| request reset | Page heading (not set by this standard) | None. | `Send Reset Link` | none | n/a |
| register | Page heading (not set by this standard) | None. | `Complete Setup` | none | n/a |
| reset password | Page heading (not set by this standard) | None. | `Complete Password Reset` | none | n/a |

### 8.4 Label rules

| ID | Rule |
|---|---|
| LBL-1 | A label MUST be `{Verb}` or `{Verb} {Noun}`. It MUST NOT be a sentence, a question or a noun alone. |
| LBL-2 | A label MUST use Title Case. |
| LBL-3 | A label MUST NOT end with a full stop, ellipsis or colon. |
| LBL-4 | A confirm label in a confirmation modal MUST be the verb only. The title already names the noun. |
| LBL-5 | A confirm label in a form that creates, links, enrols or assigns MUST be `{Verb} {Noun}`. The noun is REQUIRED, because the page can hold several forms. The auth page submit labels in Section 8.3 ("Sign In", "Send Reset Link", "Complete Password Reset", "Complete Setup") are exempt from LBL-5, LBL-11 and LBL-12, because an auth page has one form. |
| LBL-6 | A confirm label in a form that edits MUST be "Save" with no noun. "Save {Noun}" is allowed only when the form saves a result that does not exist yet, for example a built report. |
| LBL-7 | A table row action label MUST be the verb only (ROW-5). |
| LBL-8 | The dismiss label MUST be "Cancel" (ACT-9). |
| LBL-9 | A label MUST NOT use these words: Add, Submit, OK, Yes, No, Confirm, Activate, Discard, Close, Done, except as LBL-14 allows. Use the verb in Section 8.2 or 8.3. |
| LBL-10 | The wizard labels MUST be "Previous" and "Next". |
| LBL-11 | A noun in a label MUST match the noun in the title of the same form or modal. |
| LBL-12 | The noun MUST be the product term for the record: Student, Guardian, Teacher, User, Course, Activity, Relationship, Report, Banking Details, Waiting List Entry, Account, Session, Practice Time. |
| LBL-13 | A label MUST have one verb and at most one noun. The noun is a product term from LBL-12 and can have several words. The revoke labels in MTX-4 are the only exception. |
| LBL-14 | "Add" is allowed only on a button that adds an item to a list without creating a record, for example a report filter. |

---

## 9. Checklist

A reviewer approves a change only if every item is "yes". One "no" rejects the change.

### 9.1 Any button

| # | Check |
|---|---|
| 1 | The button uses exactly one standard: modal, form, compact or page (USE-1). |
| 2 | Height, padding, radius and typography match the spec table of that standard. |
| 3 | The fill, border and text use tokens and not hex values (COL-1). |
| 4 | Hover, disabled and loading match Section 7.1. |
| 5 | Primary and secondary buttons of the same standard look the same as every other one in the app. |
| 6 | A destructive button uses danger tokens. A primary button does not (COL-6). |
| 7 | The label follows Section 8.4. |
| 8 | The button has no icon, except the leading icon of a page button (BTN-3, ROW-9, PGB-3). |
| 9 | The button is hidden in print mode (PRT-2). |

### 9.2 Any action row

| # | Check |
|---|---|
| 10 | Order is Cancel, then confirm (ACT-3). |
| 11 | The confirm action is the last control, at the right edge (ACT-4). |
| 12 | There is one confirm action (ACT-5). |
| 13 | Gap is 12px and the row is right-aligned. The wizard row follows WIZ-3 (ACT-1, ACT-2). |
| 14 | The dismiss label is "Cancel" (ACT-9). |
| 15 | The confirm action enters loading and the Cancel button is disabled while the request runs (BTN-1). |

### 9.3 Any form

| # | Check |
|---|---|
| 16 | Inputs are 44px high with `--pm-radius` (FMD-4). |
| 17 | Every field has a label (FMD-5). |
| 18 | The action row of the form has no destructive button (FRM-7). |
| 19 | The confirm label follows LBL-5 or LBL-6. |
| 20 | Wizard rows follow Section 7.10. |

### 9.4 Any modal

| # | Check |
|---|---|
| 21 | The modal is in one family: destructive, reversible or form (Sections 7.6 to 7.8). |
| 22 | The width is small, medium, large or fill (LAY-1). |
| 23 | There is a close control, and it matches Section 7.5 (MOD-1). |
| 24 | The title is `{Verb} {Noun}`, is not a question, and uses Title Case (WRD-1, TYP-9). |
| 25 | A confirmation modal has the icon of its family, and a form modal has no icon (MOD-5). |
| 26 | The body follows the template in Section 8.2 for its verb. |
| 27 | A destructive body has "cannot be undone" in `<strong>`. A reversible body does not (DES-4, REV-5). |
| 28 | The body names all data that is lost (DES-5) or states how to undo (REV-4). |
| 29 | An action that cannot be undone is in the destructive family, whatever its verb (DES-1). |
| 30 | No modal closes on a backdrop click or on a key press (MOD-3, MOD-11). |
| 31 | The modal is hidden in print mode (MOD-9). |

### 9.5 Any table row action

| # | Check |
|---|---|
| 32 | The button is compact (ROW-1). |
| 33 | The label is the verb of the modal that it opens (ROW-5). |
| 34 | The destructive action is last and uses the destructive variant (ROW-4, ROW-6). |
| 35 | An action that uses the destructive family opens a destructive confirmation modal (ROW-7). |
| 36 | The Actions column is hidden in print mode (ROW-10). |

### 9.6 Any page button

| # | Check |
|---|---|
| 37 | The button matches Section 7.4A (PGB-1). |
| 38 | A destructive page button opens a destructive confirmation modal (PGB-2). |

---

## Appendix A. Current components mapped to target families

This appendix is not part of the rules. It lists today's components, the target family and the changes needed. It will go out of date. Section 0 to Section 9 do not.

### A.1 Modals (22)

| Component | Target family | Changes needed |
|---|---|---|
| `pm-teacher-delete-modal` | Destructive | Title "Delete Teacher" stays. Icon `delete` → `delete_forever`. Body to the delete template. Add or conform the close control (MOD-1). |
| `pm-banking-delete-modal` | Destructive | Title "Delete these banking details?" → "Delete Banking Details". Icon `delete` → `delete_forever`. Add or conform the close control (MOD-1). |
| `pm-delete-student-modal` | Destructive | Body to the delete template. Add close control. |
| `pm-delete-relationship-modal` | Destructive | Bold "cannot be undone". Add or conform the close control (MOD-1). |
| `pm-delete-guardian-modal` | Destructive | Keep the scope choice. Bold entity name. Add or conform the close control (MOD-1). |
| `pm-delete-course-modal` | Destructive | Bold "cannot be undone". Add or conform the close control (MOD-1). |
| `pm-delete-user-modal` | Destructive | Title "Permanently Delete User" → "Delete User". Keep the typed-email field. Move the instruction to the field label (DES-8). Add or conform the close control (MOD-1). |
| `pm-delete-extra-curricular-modal` | Destructive | Title "Delete Activity" stays. Bold "cannot be undone". Dependents use MTX-3. Add or conform the close control (MOD-1). |
| `pm-delete-waiting-list-entry-modal` | Destructive | Title "Remove from Waiting List" → "Remove Student from Waiting List". Icon `warning` → `delete_forever`. Body to the remove template. Add or conform the close control (MOD-1). |
| `pm-withdraw-enrollment-modal` | Destructive | Icon `warning` → `delete_forever`. Body to the withdraw template. Add or conform the close control (MOD-1). |
| `pm-delete-report-modal` | Destructive | Title "Delete report" → "Delete Report". Icon `warning` in a circle → `delete_forever`, no circle. Use the standard body element. Bold "cannot be undone". Add or conform the close control (MOD-1). |
| `pm-teacher-deactivate-modal` | Destructive (MTX-2) | The action also permanently deletes banking details. Icon `warning` → `delete_forever`. Body names the banking details and says "cannot be undone". Verb and label stay "Deactivate". Add or conform the close control (MOD-1). |
| `pm-unlink-account-modal` | Reversible | Title "Unlink this account?" → "Unlink Account". Icon `link_off` → `info`. Confirm button red → primary. Body to the unlink template. Add or conform the close control (MOD-1). |
| `pm-deactivate-user-modal` | Reversible | Icon `warning` → `info`. Confirm button red → primary. Body to the deactivate template. Add or conform the close control (MOD-1). |
| `pm-revoke-all-sessions-modal` | Destructive | Title "Revoke All Sessions" stays. Icon `warning` → `delete_forever`. Confirm label "Revoke All" stays. Body starts with "This action cannot be undone." Keep the typed-confirmation field. Remove the backdrop click (MOD-3). Remove the Escape handler (MOD-11). Add or conform the close control (MOD-1). |
| `pm-student-wizard-modal` | Form (fill) | See A.2. Title "Create Student". Waiting list capture title → "Create Waiting List Entry". Edit titles keep "Edit {Noun}: {name}". Add or conform the close control (MOD-1). |
| `pm-enrol-waiting-list-student-modal` | Form (medium) | Title "Enrol Student" stays. Confirm "Enrol" → "Enrol Student". Add close control. Use the standard title element. |
| `pm-save-report-modal` | Form (medium) | Remove icon `save`. Title "Save report" → "Save Report". Confirm "Save report" → "Save Report". Title colour accent → `--pm-text`. Width 440px → 520px. Add or conform the close control (MOD-1). |
| `pm-link-account-modal` | Form (medium) | Remove icon `link`. Title "Link a login account" → "Link Account". Confirm "Link account" → "Link Account". Width 420px → 520px. Add or conform the close control (MOD-1). |
| `pm-my-details-modal` | Form (large) | Width 620px → 720px. Close control to the standard box. The Edit button becomes a compact button. |
| `pm-own-sessions-modal` | Form (fill), information | Remove the footer area. "Revoke all other sessions" is a section action, so it becomes a compact button in the header area or table head with label "Revoke All Others". Close control to the standard box. Title "Active Sessions" stays. The button opens a destructive confirmation modal titled "Revoke Other Sessions" (MOD-6, MTX-4, ROW-7). |
| `pm-banking-activity-modal` | Form (large), information | Remove the footer Close button (MOD-7). Width 630px → 720px. Add the close control. |

### A.2 Wizard

| Today | Target |
|---|---|
| Footer: Cancel, Previous, Next, Save. Create-mode Save label "Save". | Cancel at the left edge. Previous, Next right. On the last step: "Create Student". |
| Edit mode: Student tab has Cancel and Save inside the step. Other tabs have a footer "Close". | Student tab keeps Cancel and "Save". Other tabs have no footer. The close control closes the wizard (WIZ-8). |
| Waiting List tab edit: "Close" and "Save". | "Cancel" and "Save". |
| Buttons 44px, `--pm-radius`, primary has no border. | Form buttons (Section 7.3). |

### A.3 Forms

| Component | Current | Target |
|---|---|---|
| `pm-teacher-profile-form` | Own `save` / `cancel` rules. | Form buttons. Cancel, "Save". |
| `pm-guardian-form` | 40px. "Add Guardian". | Form buttons, 44px. "Create Guardian". |
| `pm-banking-section` (form part) | `6px 16px`, "Save banking details", ghost Cancel. | Form buttons. "Save". Cancel is form secondary. |
| `pm-course-form` | 44px. "Create Course". | Form buttons. Label stays. |
| `pm-relationship-form` | Own submit rule. | Form buttons. "Create Relationship". |
| `pm-teacher-create-section` | Own save rule. | Form buttons. "Create Teacher". |
| `pm-create-user-form` | Own submit rule. | Form buttons. "Create User". |
| `pm-extra-curricular-form` | Not reviewed. | Form buttons. "Create Activity" or "Save". |
| `pm-enrollment-form` | Not reviewed. | Form buttons. "Enrol Student" or "Save". |
| Login, registration, forgot-password and reset-password pages | Own button rules. A trailing icon (`login`, `arrow_forward`). The label is replaced while busy ("Authenticating...", "Sending...", "Activating..."). Hover uses `brightness`. | Form primary button, full width (PGB-4). Remove the icon (BTN-3). Keep the label while busy and show the loading icon (Section 7.1, LBL-3). Hover is a darker fill. Labels: "Sign In", "Send Reset Link", "Complete Password Reset", "Complete Setup". |
| Label "Add" (banking, other) | "Add" | "Create {Noun}" (LBL-9). |

### A.4 Table row and list row actions

| Component | Current labels | Target |
|---|---|---|
| `pm-students-table` | Edit, Print, Delete (filled red) | Edit, Print, Delete. Delete is outline destructive. |
| `pm-users-table` | Edit, Deactivate, Activate, Delete | Edit, Deactivate, Reactivate, Delete. |
| `pm-course-table` | Edit Cost, Delete | Edit, Delete. |
| `pm-extra-curricular-table` | Edit, Delete | Same labels. |
| `pm-saved-reports-table` | Edit, Delete | Same labels. |
| `pm-waiting-list-table` | Edit, Delete | Edit, Remove. The modal verb is "Remove". |
| `pm-sessions-table` | Revoke | Same label. Destructive compact button. Opens the revoke modal (ROW-7). |
| `pm-teacher-row` (in `pm-teacher-table`) | Not reviewed. | Check against Section 7.12. |
| `pm-relationship-list` | Edit, Delete | Same labels. Compact buttons. |
| `pm-enrollment-list` | Edit, Remove | Edit, Withdraw if it opens the withdraw modal. Check. |
| `pm-sibling-list`, `pm-extra-curricular-practice-times`, `pm-extra-curriculars-step` | Remove | Check the verb against MTX-1 and the modal that opens. |
| `pm-banking-section` (read actions) | Outline, filled red delete, filled accent | Compact buttons. Delete becomes outline destructive. |
| `pm-teacher-header` (page actions) | Icon and label, for example `person_check` Reactivate | Page buttons (Section 7.4A). |
| Users table filter button | Own style | Secondary page button. |
| Admin sessions page, "Revoke All (Global)" | Own style | Destructive page button. Opens the revoke modal. |
| `pm-banking-section` entry point, "Add banking details" | Own style, "Add" | Page button. Label "Create Banking Details". |

### A.5 Open points for the owner

| # | Point |
|---|---|
| 1 | Title Case for titles and labels (TYP-9) is the majority use today. A few labels use sentence case ("Save report", "Link account"). The design-system prose says sentence case. Confirm Title Case. |
| 2 | Print rules hide row actions and modals (ROW-10, MOD-9). Confirm that no printed page needs them. |
| 3 | `info` is the single icon for the reversible family (REV-3). Confirm. |
| 4 | The page button values in Section 7.4A (40px, `0 16px`, three variants, leading icon) are proposed. Review them. |
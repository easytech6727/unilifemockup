# UI Primitives Usage

This folder contains reusable primitives and should stay the first choice for new UI work.

## Use With Global Classes

Shared global primitives are defined in `app/globals.css`:

- `btn`, `btn-primary`, `btn-secondary`, `btn-outline`, `btn-danger`
- `btn-primary-lg`, `btn-ghost`
- `input`
- `surface-card`, `surface-card-sm`
- `badge` variants

## Principles

- Keep radius modest (`rounded-lg` / `rounded-card`)
- Prefer subtle borders + layered elevation
- Use `primary` as the only strong accent
- Keep motion subtle (150–250ms)
- Maintain accessibility on focus and contrast

## Do Not

- Reintroduce heavy gradients as default section backgrounds
- Use excessive rounded classes (`rounded-3xl`, giant custom radii) unless truly required
- Duplicate logos in page headers when layout/sidebar already provides branding

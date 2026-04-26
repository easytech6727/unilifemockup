# UniLife UI Refactor Guide

This project now uses a shared visual system to keep pages human-designed, modern, and consistent without changing business logic.

## What Changed

- Centralized visual tokens in `app/globals.css`
- Updated shared theme values in `tailwind.config.ts`
- Refined dashboard shell in `components/dashboard/DashboardLayout.tsx`
- Reduced excessive radii and normalized spacing/elevation patterns
- Removed duplicated page-level logo usage in trip planner top bars (sidebar branding remains primary)

## Design Rules

- 8px rhythm (`4/8/12/16/24/32` spacing cadence)
- Softer text hierarchy (`#111`, `#1f2937`, `#6b7280`)
- One accent system (`primary`)
- Reduced radius for premium/structured feel
- Border-first surfaces + layered shadows
- Tactile interactions:
  - hover lift (`-1px` to `-2px`)
  - active reset
  - 150–250ms transitions

## Reusable Classes

Use these shared classes whenever possible:

- Cards: `surface-card`, `surface-card-sm`, `shadow-card`
- Buttons: `btn`, `btn-primary`, `btn-secondary`, `btn-outline`, `btn-danger`, `btn-primary-lg`, `btn-ghost`
- Inputs: `input`, `focus-ring`
- Status: `badge`, `badge-primary`, `badge-success`, `badge-danger`, `badge-warning`

## Notes For Future Pages

- Prefer left-aligned content blocks over full-center layouts
- Keep hero sections restrained (minimal gradients, no decorative overload)
- Avoid creating one-off button/input styles when primitives already exist
- Keep logos in primary navigation contexts rather than repeating in each page header

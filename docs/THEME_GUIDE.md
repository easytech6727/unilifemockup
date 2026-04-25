# Theme Color Guide

## Main Theme Color System
This document ensures all pages and components use the same consistent theme colors across the entire UniLife project.

## Primary Theme Color
- **Main Color**: `#4f46e5` (Indigo/Purple)
- **CSS Variable**: `var(--color-primary)`
- Used for: Buttons, links, focus states, accent elements, and interactive components

## Color Palette

### Primary Colors
| Name | Value | CSS Variable | Usage |
|------|-------|--------------|-------|
| Primary | `#4f46e5` | `var(--color-primary)` | Main theme color for buttons & accents |
| Primary Dark | `#4338ca` | `var(--color-primary-dark)` | Hover states, darker accents |
| Primary Light | `#818cf8` | `var(--color-primary-light)` | Light variations, disabled states |
| Primary Lighter | `#a5b4fc` | `var(--color-primary-lighter)` | Very light backgrounds |

### Secondary Colors
| Name | Value | CSS Variable | Usage |
|------|-------|--------------|-------|
| Secondary | `#6366f1` | `var(--color-secondary)` | Secondary accents |
| Secondary Dark | `#4f46e5` | `var(--color-secondary-dark)` | Secondary hover states |

### Semantic Colors
| Name | Value | CSS Variable | Usage |
|------|-------|--------------|-------|
| Danger | `#EF4444` | `var(--color-danger)` | Error messages, destructive actions |
| Success | `#22c55e` | `var(--color-success)` | Success messages, positive feedback |
| Warning | `#f59e0b` | `var(--color-warning)` | Warning messages, caution states |
| Info | `#3b82f6` | `var(--color-info)` | Info messages, informational content |

## Light Mode Colors

### Background
| Name | Value | CSS Variable |
|------|-------|--------------|
| Background | `#ffffff` | `var(--color-bg-light)` |
| Background Secondary | `#f9fafb` | `var(--color-bg-light-secondary)` |

### Text
| Name | Value | CSS Variable |
|------|-------|--------------|
| Text Primary | `#000000` | `var(--color-text-light)` |
| Text Secondary | `#1f2937` | `var(--color-text-light-secondary)` |
| Text Tertiary | `#4b5563` | `var(--color-text-light-tertiary)` |

### Borders
| Name | Value | CSS Variable |
|------|-------|--------------|
| Border | `#e5e7eb` | `var(--color-border-light)` |
| Border Dark | `#d1d5db` | `var(--color-border-light-dark)` |

## Dark Mode Colors

### Background
| Name | Value | CSS Variable |
|------|-------|--------------|
| Background | `#0f172a` | `var(--color-bg-dark)` |
| Background Secondary | `#1e293b` | `var(--color-bg-dark-secondary)` |

### Text
| Name | Value | CSS Variable |
|------|-------|--------------|
| Text Primary | `#ffffff` | `var(--color-text-dark)` |
| Text Secondary | `#e5e7eb` | `var(--color-text-dark-secondary)` |
| Text Tertiary | `#d1d5db` | `var(--color-text-dark-tertiary)` |

### Borders
| Name | Value | CSS Variable |
|------|-------|--------------|
| Border | `#334155` | `var(--color-border-dark)` |
| Border Dark | `#475569` | `var(--color-border-dark-light)` |

## Usage Guide

### In Tailwind Classes
Use Tailwind utility classes with the theme colors:

```jsx
// Buttons
<button className="bg-primary text-white hover:bg-primaryDark">
  Click me
</button>

// Text
<p className="text-primary">Primary text</p>
<p className="text-primaryLight">Light text</p>

// Borders
<div className="border border-primaryLight">
  Bordered content
</div>

// Backgrounds
<div className="bg-primaryLighter">
  Light background
</div>
```

### In CSS/Inline Styles
Use CSS variables for direct styling:

```css
/* CSS */
.custom-button {
  background: var(--color-primary);
  color: white;
  border: 1px solid var(--color-primary-dark);
}

.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}
```

```jsx
// Inline styles (not recommended, prefer Tailwind)
<button style={{ backgroundColor: 'var(--color-primary)' }}>
  Click me
</button>
```

### Gradients
The primary gradient is available as a Tailwind class:

```jsx
<div className="bg-gradient-primary">
  Gradient background
</div>
```

## Light/Dark Mode Adaptive Styling

The theme automatically adjusts based on the current mode. No need to write mode-specific styles:

```jsx
// This automatically uses light values in light mode, dark values in dark mode
<div className="bg-secondary text-primary border border-gray-200">
  Content
</div>
```

To explicitly target a mode (avoid when possible):

```css
.light-mode .custom-element {
  color: #000000;
}

.dark-mode .custom-element {
  color: #ffffff;
}
```

## Best Practices

1. **Always use CSS variables or Tailwind classes** - Never hardcode colors like `#4f46e5` in components
2. **Use semantic colors** - Use `danger`, `success`, etc. for specific meanings
3. **Prefer Tailwind utilities** - Use `bg-primary`, `text-primary` instead of custom styles
4. **Consistent with theme** - All components should reflect the primary color hierarchy
5. **Test in both modes** - Verify appearance in light and dark modes
6. **Document custom colors** - If you must use a custom color, document why

## Color Change Guide

To change the entire theme color across the project:

1. **Update primary colors** in `app/globals.css`:
   ```css
   --color-primary: #YOUR_NEW_COLOR;
   --color-primary-dark: #YOUR_DARKER_SHADE;
   --color-primary-light: #YOUR_LIGHTER_SHADE;
   ```

2. **All pages and components will automatically update** since they reference the CSS variables

3. **Update box shadows and glows** in `tailwind.config.ts` if needed

That's it! The entire application theme updates automatically.

## Files to Check/Update

- `app/globals.css` - Core theme colors (CSS variables)
- `tailwind.config.ts` - Tailwind color configuration
- `public/light.css` - Light mode specific overrides
- `public/dark.css` - Dark mode specific overrides
- `components/ThemeProvider.tsx` - Theme context and mode switching

## Questions?

Refer to this guide when styling components. Ensure all pages use `bg-primary`, `text-primary`, or CSS variables instead of hardcoded color values.

// tailwind.config.ts
//
// BP-018 `## Module / boundary`: "tailwind.config.ts (the token-to-daisyUI
// mapping)". `BUILD.md` §2.1, verbatim: "Map these onto daisyUI's theme
// slots (`base-100`←surface, `base-200`←sunk, `base-300`←line,
// `base-content`←ink, `primary`←accent, `success/warning/error`←ok/warn/bad)
// in the Tailwind config so stock daisyUI classes just work."
//
// daisyUI 5's own `--color-*` custom properties are what its component CSS
// (`.btn`, `.card`, `.badge`, …) actually reads — registering the plugin
// bare would additionally inject its 32 bundled themes' hardcoded colours,
// a second copy of every value `src/ui/theme.css` already states. So the
// bare `daisyui` plugin runs with its own themes turned off (component and
// utility classes stay registered; no bundled theme is emitted), and the
// six-slot mapping is one custom theme, named `reachkit`, registered
// through daisyUI's own `daisyui/theme` plugin — each slot set to
// `var(--token)`, a reference to `src/ui/theme.css`'s own tokens, never a
// second literal. Because each daisyUI slot only points at our token and
// never restates its value, the same theme mapping serves all three of
// that file's states — light, the guarded dark media query, and the
// explicit `[data-theme="dark"]` toggle — with no daisyUI-side dark
// variant of its own.
import type { Config } from "tailwindcss";
// daisyUI 5 ships no type declarations for these two subpath exports, so
// each is cast where it is called below.
import daisyui from "daisyui";
import daisyuiTheme from "daisyui/theme";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  plugins: [
    // Registers daisyUI's base reset, components and utilities only —
    // `themes: false` means it emits none of its own bundled palettes.
    (daisyui as (options?: Record<string, unknown>) => unknown)({ themes: false }),
    // The one named theme BUILD.md §2.1 maps — default, so it applies at
    // bare `:root` with no `data-theme` attribute required.
    (daisyuiTheme as (options: Record<string, unknown>) => unknown)({
      name: "reachkit",
      default: true,
      "--color-base-100": "var(--surface)",
      "--color-base-200": "var(--sunk)",
      "--color-base-300": "var(--line)",
      "--color-base-content": "var(--ink)",
      "--color-primary": "var(--accent)",
      "--color-success": "var(--ok)",
      "--color-warning": "var(--warn)",
      "--color-error": "var(--bad)",
    }),
  ],
} satisfies Config;

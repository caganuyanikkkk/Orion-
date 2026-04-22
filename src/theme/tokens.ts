/**
 * Orion Design Tokens
 *
 * Single source of truth for all visual primitives.
 * Every screen, component, and style reads from here — never hardcode.
 *
 * Philosophy: editorial restraint (Whoop/Linear) with a subtle cosmic
 * signature (Orion's Belt). 90% discipline, 10% character.
 */

// ─────────────────────────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────────────────────────
// Three surface layers — never paint everything on one flat background.
// Ambient depth is how premium apps read without resorting to gradients.

export const colors = {
  // Surfaces — three tiers of elevation, all near-black but distinguishable
  bg: {
    base:     "#0A0A0B",  // app background (deepest)
    elevated: "#141417",  // cards, session blocks
    overlay:  "#1C1C21",  // nested inputs, expanded rows, modals
  },

  // Text — three tiers of hierarchy, never pure white
  text: {
    primary:   "#F5F5F7",  // headlines, interactive labels
    secondary: "#A1A1AA",  // supporting copy, timestamps
    tertiary:  "#52525B",  // metadata, disabled, placeholders
  },

  // Accent — deep amber. Cosmic, editorial, not "default iOS green".
  // Used sparingly: primary CTA, active nav, key stat values.
  accent: {
    DEFAULT: "#F5A524",                       // primary actions
    dim:     "#8B5E13",                       // muted accent backgrounds
    glow:    "rgba(245, 165, 36, 0.15)",      // box-shadow halo
    soft:    "rgba(245, 165, 36, 0.08)",      // hover tint
  },

  // Semantic — reserved for system feedback only, never decoration.
  semantic: {
    success: "#10B981",
    danger:  "#EF4444",
    warning: "#F59E0B",
  },

  // Borders — always translucent white on dark, never a flat hex.
  // This keeps them harmonized with whatever surface they sit on.
  border: {
    subtle:  "rgba(255, 255, 255, 0.06)",  // card outlines
    default: "rgba(255, 255, 255, 0.10)",  // inputs, dividers
    strong:  "rgba(255, 255, 255, 0.18)",  // focused inputs
  },
} as const;

// ─────────────────────────────────────────────────────────────
// TYPOGRAPHY
// ─────────────────────────────────────────────────────────────
// Inter for UI (variable, excellent at small sizes).
// JetBrains Mono for numbers (tabular alignment in stats/weights).
// Never use system default — lose identity instantly.

export const fontFamily = {
  sans: `"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif`,
  mono: `"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace`,
} as const;

// [fontSize, lineHeight, weight] tuples.
// Tight line-heights for display, looser for body.
export const typography = {
  display: { size: "32px", leading: "36px", weight: 700, tracking: "-0.02em" }, // streak number, hero stats
  h1:      { size: "24px", leading: "32px", weight: 600, tracking: "-0.01em" }, // screen titles, greeting
  h2:      { size: "18px", leading: "24px", weight: 600, tracking: "-0.005em"},// section headers, exercise names
  body:    { size: "15px", leading: "22px", weight: 400, tracking: "0"       }, // paragraphs, inputs
  caption: { size: "13px", leading: "18px", weight: 500, tracking: "0"       }, // metadata, timestamps
  micro:   { size: "11px", leading: "14px", weight: 600, tracking: "0.08em"  }, // uppercase labels, pill text
  mono:    { size: "15px", leading: "22px", weight: 500, tracking: "0"       }, // numbers in stats/weights
} as const;

// ─────────────────────────────────────────────────────────────
// SPACING
// ─────────────────────────────────────────────────────────────
// Strict 4pt scale. Deviating from this is how apps look amateur.

export const spacing = {
  0:  "0px",
  1:  "4px",
  2:  "8px",
  3:  "12px",
  4:  "16px",
  6:  "24px",
  8:  "32px",
  12: "48px",
  16: "64px",
} as const;

// ─────────────────────────────────────────────────────────────
// RADIUS
// ─────────────────────────────────────────────────────────────

export const radius = {
  sm:   "8px",   // small pills, tags
  md:   "12px",  // inputs, buttons
  lg:   "16px",  // cards
  xl:   "20px",  // hero cards
  full: "9999px",
} as const;

// ─────────────────────────────────────────────────────────────
// MOTION
// ─────────────────────────────────────────────────────────────
// Curve is a "confident ease-out" — snappy start, gentle settle.
// Matches Arc, Linear, Vercel. Durations: fast for feedback, medium
// for transitions, never slower than 300ms for interactive elements.

export const motion = {
  easing: {
    DEFAULT: "cubic-bezier(0.16, 1, 0.3, 1)", // confident ease-out
    spring:  "cubic-bezier(0.34, 1.56, 0.64, 1)", // slight overshoot (for scale-in)
    linear:  "linear",
  },
  duration: {
    fast:   "120ms",  // button press, tap feedback
    normal: "200ms",  // hover states, small transitions
    medium: "300ms",  // panel open, number count-up
    slow:   "500ms",  // hero entrances only
  },
  tap: {
    scale:      0.97,
    duration:   "120ms",
  },
} as const;

// ─────────────────────────────────────────────────────────────
// ELEVATION / SHADOWS
// ─────────────────────────────────────────────────────────────
// Shadows on dark UIs are subtle — mostly a whisper of glow from
// accent color on interactive elements, and layered borders.

export const elevation = {
  none:  "none",
  card:  "0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)",
  lift:  "0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)",
  glow:  "0 0 24px rgba(245, 165, 36, 0.25)",                 // primary CTA hover
  focus: "0 0 0 3px rgba(245, 165, 36, 0.25)",                // focused inputs
} as const;

// ─────────────────────────────────────────────────────────────
// LAYOUT
// ─────────────────────────────────────────────────────────────

export const layout = {
  maxContentWidth: "640px",   // single-column cap (mobile-first)
  navHeight:       "72px",    // bottom tab bar
  tapTargetMin:    "44px",    // WCAG / iOS HIG minimum
  safeAreaBottom:  "env(safe-area-inset-bottom, 0px)",
  safeAreaTop:     "env(safe-area-inset-top, 0px)",
} as const;

// ─────────────────────────────────────────────────────────────
// Z-INDEX
// ─────────────────────────────────────────────────────────────

export const zIndex = {
  base:     0,
  elevated: 10,
  overlay:  100,
  modal:    200,
  toast:    300,
} as const;

// ─────────────────────────────────────────────────────────────
// SIGNATURE — Orion's Belt
// ─────────────────────────────────────────────────────────────
// The three stars, in angular positions. Used in the logo and
// sparingly as a decorative glyph. Never animate, never colorize.

export const orionBelt = {
  stars: [
    { x: 0,    y: 0.2, size: 3.0 }, // Alnitak
    { x: 0.5,  y: 0,   size: 3.5 }, // Alnilam (brightest)
    { x: 1.0,  y: 0.3, size: 2.8 }, // Mintaka
  ],
  color: colors.accent.DEFAULT,
} as const;

// ─────────────────────────────────────────────────────────────
// Type exports for consumers
// ─────────────────────────────────────────────────────────────

export type ColorToken = typeof colors;
export type TypographyToken = keyof typeof typography;
export type SpacingToken = keyof typeof spacing;
export type RadiusToken = keyof typeof radius;

export const tokens = {
  colors,
  fontFamily,
  typography,
  spacing,
  radius,
  motion,
  elevation,
  layout,
  zIndex,
  orionBelt,
} as const;

export default tokens;

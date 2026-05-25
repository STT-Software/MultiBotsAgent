---
name: Obsidian Nexus
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#85948a'
  outline-variant: '#3c4a41'
  surface-tint: '#3be09d'
  primary: '#42e5a1'
  on-primary: '#003823'
  primary-container: '#00c887'
  on-primary-container: '#004d31'
  inverse-primary: '#006c47'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b5b4'
  tertiary: '#ffbb9f'
  on-tertiary: '#581e00'
  tertiary-container: '#ff9362'
  on-tertiary-container: '#762b00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#60fdb7'
  primary-fixed-dim: '#3be09d'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005235'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7b2f03'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
  emerald-glow: '#00FFAB'
  surface-border: '#262626'
  status-processing: '#3B82F6'
  status-warning: '#F59E0B'
  status-error: '#EF4444'
  text-muted: '#888888'
typography:
  headline-xl:
    fontFamily: Hanken Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  container-margin: 24px
  gutter: 16px
  card-padding: 20px
  max-content-width: 1440px
---

## Brand & Style

The design system is engineered for a high-tech, AI-native environment that feels sophisticated, precise, and authoritative. It targets technical administrators and data scientists who manage complex knowledge infrastructures. 

The aesthetic is a fusion of **Minimalism** and **Modern Corporate**, utilizing a "Terminal-Chic" approach. It prioritizes data density and clarity without sacrificing visual appeal. The mood is deep, focused, and futuristic—evoking the feeling of a command center where vast amounts of information are distilled into actionable intelligence. High-contrast accents are used sparingly to guide focus toward active states and critical system health indicators.

## Colors

The palette is anchored by an absolute black background (`#000000`) and a deep neutral foundation. The primary brand color is a vibrant **Emerald Green**, used exclusively for primary actions, active navigation states, and successful system statuses.

Surface levels are defined by subtle shifts in gray, moving from the true black background to slightly lighter container surfaces. Borders are used as primary separators rather than heavy shadows to maintain a crisp, technical look. Functional colors (Blue, Yellow, Red) are strictly reserved for system health, indexing status, and data visualization markers.

## Typography

The typography system utilizes a three-font strategy to differentiate roles clearly. **Hanken Grotesk** provides a sharp, contemporary feel for headlines and prominent UI titles. **Inter** handles all body copy and metadata for maximum legibility in data-heavy views. **JetBrains Mono** is employed for technical strings, IDs, status labels, and code fragments, reinforcing the AI-native, developer-friendly aesthetic.

Hierarchy is established through weight and color rather than excessive size differences, keeping the layout compact and professional.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy on desktop with a 12-column system, transitioning to a fluid stack on mobile devices. A strict 8px spacing rhythm ensures alignment across all modules.

To accommodate complex data like vector dimensions and status logs, the system uses "high-density padding" in tables and lists, allowing more information to be visible at once. Sidebars are docked and fixed, while main content areas utilize a centered maximum width of 1440px to maintain readability on ultra-wide monitors.

## Elevation & Depth

This system avoids traditional skeuomorphism. Instead, depth is communicated through **Tonal Layers** and **Subtle Outlines**.

1.  **Level 0 (Background):** Pure `#000000`.
2.  **Level 1 (Cards/Sidebar):** `#0F0F0F` with a 1px solid border of `#262626`.
3.  **Level 2 (Dropdowns/Modals):** `#1A1A1A` with a subtle emerald-tinted outer glow (`0 8px 24px rgba(0, 200, 135, 0.1)`).

Active elements may use a very soft backdrop blur (8px) when overlaying complex data visualizations to maintain focus.

## Shapes

The shape language is "Soft-Technical." UI elements use a small 4px (0.25rem) corner radius to feel modern but structured. Interactive elements like buttons and chips retain this subtle rounding, while status indicators (dots) are fully circular. This geometric precision aligns with the grid-based nature of vector data and AI model architectures.

## Components

-   **Buttons:** Primary buttons are solid Emerald Green with black text. Secondary buttons use a transparent background with a 1px emerald border.
-   **Cards:** Features a 1px `#262626` border. For high-priority AI agents, the card may feature a top-border accent in Emerald.
-   **Status Indicators:** Small, circular dots. Pulsing animations are used for `Processing` states. Failed states use a static red dot with a subtle red glow.
-   **Input Fields:** Deep black background with a gray border that turns Emerald Green on focus. Labels use the monospaced font for a "technical input" feel.
-   **Chips/Tags:** Used for "RAG," "Agent Type," and "Category." These have a low-opacity tinted background (e.g., 10% opacity of the category color) and matching text.
-   **Data Visualizations:** Charts use clean lines without fills. Grid lines are kept at ultra-low contrast (`#1A1A1A`) to ensure the data trend is the focal point.
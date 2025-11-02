/**
 * Design Tokens for VinylRig Vote
 * Theme: Vintage Hi-Fi (Deterministic seed-based selection)
 * Seed: SHA256("VinylRig Vote" + "Sepolia" + "202511" + "FHECounter.sol")
 */

// Color palette - Vintage Hi-Fi theme (warm, nostalgic, audiophile aesthetics)
export const colors = {
  light: {
    // Primary: Warm copper/gold (vintage audio panel finish)
    primary: "28 74% 58%", // #D4A574
    primaryForeground: "0 0% 100%",

    // Secondary: Deep wood brown (vinyl record edge)
    secondary: "25 56% 31%", // #8B4513
    secondaryForeground: "0 0% 100%",

    // Accent: Orange VU meter needle
    accent: "27 86% 52%", // #E67E22
    accentForeground: "0 0% 100%",

    // Background & Foreground
    background: "30 20% 96%", // #F5F3F0 (warm off-white)
    foreground: "30 15% 9%", // #1A1614 (deep charcoal)

    // Card
    card: "30 20% 98%",
    cardForeground: "30 15% 12%",

    // Muted
    muted: "30 15% 90%",
    mutedForeground: "30 10% 40%",

    // Border & Input
    border: "30 15% 85%",
    input: "30 15% 80%",
    ring: "28 74% 58%", // Same as primary

    // Semantic colors
    success: "142 71% 45%", // #27AE60
    warning: "38 92% 50%", // #F39C12
    error: "0 68% 57%", // #E74C3C
    info: "207 90% 54%", // #3498DB
  },
  dark: {
    // Primary: Lighter warm gold for dark mode
    primary: "28 70% 65%",
    primaryForeground: "30 15% 9%",

    // Secondary: Lighter wood tone
    secondary: "25 50% 40%",
    secondaryForeground: "0 0% 100%",

    // Accent: Slightly brighter orange for visibility
    accent: "27 80% 58%",
    accentForeground: "0 0% 100%",

    // Background & Foreground
    background: "30 15% 9%", // #1A1614
    foreground: "30 20% 95%", // #F2EEE9

    // Card
    card: "30 15% 12%",
    cardForeground: "30 20% 95%",

    // Muted
    muted: "30 10% 20%",
    mutedForeground: "30 15% 65%",

    // Border & Input
    border: "30 10% 25%",
    input: "30 10% 30%",
    ring: "28 70% 65%", // Same as primary

    // Semantic colors (adjusted for dark mode)
    success: "142 65% 50%",
    warning: "38 85% 55%",
    error: "0 65% 62%",
    info: "207 85% 60%",
  },
};

// Typography
export const typography = {
  fonts: {
    heading: "Playfair Display, Georgia, serif", // Classic serif for elegance
    body: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", // Modern sans for readability
    mono: "JetBrains Mono, 'Fira Code', 'Courier New', monospace", // For addresses/hashes
  },
  sizes: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    base: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem", // 36px
  },
  weights: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeights: {
    tight: "1.25",
    normal: "1.5",
    relaxed: "1.75",
  },
};

// Spacing scale (8px base unit)
export const spacing = {
  xs: "0.25rem", // 4px (0.5x)
  sm: "0.5rem", // 8px (1x)
  md: "0.75rem", // 12px (1.5x)
  lg: "1rem", // 16px (2x)
  xl: "1.5rem", // 24px (3x)
  "2xl": "2rem", // 32px (4x)
  "3xl": "3rem", // 48px (6x)
  "4xl": "4rem", // 64px (8x)
};

// Border radius
export const borderRadius = {
  sm: "0.25rem", // 4px
  md: "0.5rem", // 8px
  lg: "0.75rem", // 12px
  xl: "1rem", // 16px
  full: "9999px",
};

// Component density modes
export const density = {
  compact: {
    paddingScale: 0.75,
    spacingScale: 0.75,
  },
  comfortable: {
    paddingScale: 1.0,
    spacingScale: 1.0,
  },
};

// Responsive breakpoints
export const breakpoints = {
  mobile: "640px",
  tablet: "1024px",
  desktop: "1280px",
};

// Animation durations
export const animation = {
  fast: "150ms",
  normal: "200ms",
  slow: "300ms",
  slower: "500ms",
};

// Box shadows
export const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
};

// Z-index layers
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  modal: 1200,
  popover: 1300,
  tooltip: 1400,
};

/**
 * Applies theme CSS custom properties to the document
 * @param mode - 'light' or 'dark'
 */
export function applyTheme(mode: "light" | "dark") {
  const root = document.documentElement;
  const themeColors = colors[mode];

  // Apply color variables
  Object.entries(themeColors).forEach(([key, value]) => {
    root.style.setProperty(`--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`, value);
  });

  // Apply other variables
  root.style.setProperty("--font-heading", typography.fonts.heading);
  root.style.setProperty("--font-body", typography.fonts.body);
  root.style.setProperty("--font-mono", typography.fonts.mono);

  Object.entries(spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value);
  });

  root.style.setProperty("--radius", borderRadius.lg);
}

/**
 * Initialize theme on page load
 */
export function initTheme() {
  const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const mode = savedTheme || (prefersDark ? "dark" : "light");

  applyTheme(mode);
  document.documentElement.classList.toggle("dark", mode === "dark");
}

/**
 * Toggle between light and dark mode
 */
export function toggleTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  const newMode = isDark ? "light" : "dark";

  applyTheme(newMode);
  document.documentElement.classList.toggle("dark");
  localStorage.setItem("theme", newMode);

  return newMode;
}


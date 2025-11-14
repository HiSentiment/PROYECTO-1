// Ruta: src/utils/themeUtils.js

// 🎨 La constante de temas predefinidos
export const THEMES = {
  light: {
    "bg-login": "#4fd1c7",
    sidebar: "#3bb8a8",
    primary: "#8e44ad",
    text: "#1f2937",
    muted: "#6b7280",
    surface: "#ffffff",
    "surface-2": "#f7fafc",
  },
  medium: {
    "bg-login": "#f6d365",
    sidebar: "#f1923a",
    primary: "#ef6c00",
    text: "#111827",
    muted: "#6b7280",
    surface: "#ffffff",
    "surface-2": "#f3f4f6",
  },
  dark: {
    "bg-login": "#0f172a",
    sidebar: "#0b1220",
    primary: "#2563eb",
    text: "#e6eef8",
    muted: "#9aa6bf",
    surface: "#0b1220",
    "surface-2": "#071023",
  },
}

// 🎨 Valores por defecto para el tema personalizado
export const DEFAULT_CUSTOM_COLORS = {
  primary: "#009599",
  sidebar: "#3bb8a8",
  surface: "#ffffff",
  "surface-2": "#f7fafc",
  text: "#1f2937",
  muted: "#6b7280",
  // NOTA: 'bg-login' no está en tu estado original de customColors.
  // Si quieres que sea personalizable, añádelo aquí y en el panel de UsersPage.
}

/**
 * 🎨 Aplica un tema personalizado (desde un objeto de colores)
 * Esta función solo aplica estilos, no guarda nada.
 */
export const applyCustomTheme = (colors) => {
  const mapping = {
    primary: "--primary",
    sidebar: "--sidebar",
    surface: "--surface",
    "surface-2": "--surface-2",
    text: "--text",
    muted: "--muted",
    "bg-login": "--bg-login",
  }

  // Asegurarnos de que tenemos un objeto válido
  const validColors = colors || DEFAULT_CUSTOM_COLORS

  // Aplicar colores recibidos
  Object.entries(validColors).forEach(([k, v]) => {
    const varName = mapping[k] || `--${k}`
    if (varName) {
      document.documentElement.style.setProperty(varName, v)
    }
  })

  document.documentElement.setAttribute("data-theme", "custom")
}

/**
 * 🎨 Aplica un tema predefinido por nombre (light, medium, dark)
 * Esta función solo aplica estilos, no guarda nada.
 */
export const applyThemeByName = (name) => {
  const palette = THEMES[name]
  if (!palette) {
    // Fallback al tema 'light' si el nombre no es válido
    applyThemeByName("light")
    return
  }

  Object.entries(palette).forEach(([k, v]) => {
    document.documentElement.style.setProperty(`--${k}`, v)
  })

  document.documentElement.setAttribute("data-theme", name)
}
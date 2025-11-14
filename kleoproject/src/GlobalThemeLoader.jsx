// Ruta: src/GlobalThemeLoader.jsx
import { useEffect } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "./firebase" // Ajusta la ruta a tu config de firebase
import {
  applyThemeByName,
  applyCustomTheme,
  DEFAULT_CUSTOM_COLORS,
} from "./utils/themeUtils" // Ajusta la ruta

/**
 * Este componente no renderiza nada visible.
 * Su único propósito es cargar el tema desde Firestore
 * al iniciar la aplicación.
 */
function GlobalThemeLoader({ children }) {
  useEffect(() => {
    const fetchAndApplyTheme = async () => {
      try {
        const themeDocRef = doc(db, "configuracion", "temas")
        const docSnap = await getDoc(themeDocRef)

        if (docSnap.exists()) {
          const config = docSnap.data()
          const etiqueta = config.etiqueta // "light", "dark", "custom"

          if (etiqueta === "custom") {
            // Si es custom, aplica los colores guardados
            // Si no hay colores guardados, usa los defaults
            applyCustomTheme(config.customColors || DEFAULT_CUSTOM_COLORS)
          } else if (etiqueta && (etiqueta === "light" || etiqueta === "medium" || etiqueta === "dark")) {
            // Si es "light", "medium", o "dark"
            applyThemeByName(etiqueta)
          } else {
            // Fallback si la etiqueta está vacía o es inválida
            applyThemeByName("light")
          }
        } else {
          // Fallback si el documento 'temas' no existe
          console.warn("Documento 'configuracion/temas' no encontrado. Usando tema 'light' por defecto.")
          applyThemeByName("light")
        }
      } catch (error) {
        console.error("Error al cargar el tema desde Firestore:", error)
        // Fallback en caso de error de red o permisos
        applyThemeByName("light")
      }
    }

    fetchAndApplyTheme()
  }, []) // El array vacío asegura que se ejecute solo una vez

  // Simplemente renderiza los componentes hijos (tu app)
  return children
}

export default GlobalThemeLoader
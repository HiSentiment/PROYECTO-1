// Ruta: src/index.tsx
import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App.tsx"
import "./index.css" // tus estilos globales
// 🎨 Importamos el cargador de temas
import GlobalThemeLoader from "./GlobalThemeLoader" // Ajusta la ruta si lo pusiste en otra carpeta

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    
    <GlobalThemeLoader>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GlobalThemeLoader>
  </React.StrictMode>,
)
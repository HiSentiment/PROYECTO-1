// Ruta: src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom"
import { auth, db } from "./firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { useEffect, useState } from "react"
import { doc, getDoc } from "firebase/firestore"
import Login from "./pages/Login"
import CambiarPassword from "./pages/CambiarPassword"
import Layout from "./pages/layout/layout"
import Dashboard from "./pages/dashboard/dashboard"
import Surveys from "./pages/surveys/Surveys"
import NewSurvey from "./pages/surveys/ModalNewSurvey"
import UsersPage from "./pages/users/userspage"
import Casos from "./pages/cases/CasesPage"
import CaseDetail from "./pages/cases/CaseDetails"
import AuditLogPage from "./pages/audit_log/AuditLogPage"
import PagInicial from "./pages/pag_inicial/PagInicial"

function PrivateRoute({ children }: { children: JSX.Element }) {
  const [user, loading] = useAuthState(auth)

  if (loading) {
    return <p>Cargando...</p>
  }

  return user ? children : <Navigate to="/login" replace />
}

// Hook para obtener el rol real desde Firestore
function useRol() {
  const [user] = useAuthState(auth)
  const [rol, setRol] = useState("")
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loadingRol, setLoadingRol] = useState(true)

  useEffect(() => {
    const fetchRol = async () => {
      setLoadingRol(true)
      if (user) {
        let snap = await getDoc(doc(db, "usuariosWeb", user.uid))
        if (snap.exists()) {
          const data = snap.data()
          setRol(data.rol || "")
          setIsSuperAdmin(data.rol === "SuperAdmin" || user.email === "superadmin@mail.com")
        }
      }
      setLoadingRol(false)
    }
    fetchRol()
  }, [user])

  return { rol, isSuperAdmin, loadingRol }
}

export default function App() {
  const [user, loadingUser] = useAuthState(auth)
  const { rol, isSuperAdmin, loadingRol } = useRol()

  if (loadingUser || loadingRol) {
    return <p>Cargando...</p>
  }

  return (
    <Routes>
      {/* 1. Ruta Raíz (PÚBLICA) */}
      <Route path="/" element={<PagInicial />} />

      {/* 2. Ruta de Login (PÚBLICA) */}
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      {/* 3. Ruta de Cambiar Contraseña (PRIVADA) */}
      <Route
        path="/cambiar-password"
        element={
          <PrivateRoute>
            <CambiarPassword />
          </PrivateRoute>
        }
      />

      {/* 4. LAYOUT PROTEGIDO (PRIVADO) */}
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        {/* Tus rutas de admin */}
        <Route path="/dashboard" element={<Dashboard />} />

        {(rol === "Admin RRHH" || rol === "Usuario RRHH" || isSuperAdmin) && (
          <Route path="/usuarios" element={<UsersPage />} />
        )}

        {(rol === "Admin RRHH" || rol === "Usuario RRHH" || isSuperAdmin) && (
          <Route path="/encuestas" element={<Surveys />} />
        )}

        {(rol === "Admin RRHH" || rol === "Gestor Casos" || isSuperAdmin || rol === "Usuario RRHH") && (
          <Route path="/casos" element={<Casos />} />
        )}

        {(rol === "Admin RRHH" || isSuperAdmin) && <Route path="/auditoria" element={<AuditLogPage />} />}

        <Route path="/casos/:id" element={<CaseDetail />} />
        <Route
          path="/nueva-encuesta"
          element={<NewSurvey isOpen={true} onClose={() => {}} onSave={() => {}} initialData={null} />}
        />
      </Route>

      {/* 5. Fallback Global (Comodín) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
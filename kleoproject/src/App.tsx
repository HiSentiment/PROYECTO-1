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
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="loading-spinner"></div>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}

// Componente para proteger rutas por rol
function RoleProtectedRoute({ children, allowedRoles }: { children: JSX.Element; allowedRoles: string[] }) {
  const [user, loadingUser] = useAuthState(auth)
  const [rol, setRol] = useState<string | null>(null)
  const [loadingRol, setLoadingRol] = useState(true)

  useEffect(() => {
    const fetchRol = async () => {
      setLoadingRol(true)
      if (user) {
        const snap = await getDoc(doc(db, "usuariosWeb", user.uid))
        if (snap.exists()) {
          const data = snap.data()
          setRol(data.rol || null)
        } else {
          setRol(null)
        }
      } else {
        setRol(null)
      }
      setLoadingRol(false)
    }
    fetchRol()
  }, [user])

  if (loadingUser || loadingRol) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Verificar si es superadmin
  const isSuperAdmin = user.email === "superadmin@mail.com"

  // Verificar si tiene un rol permitido o es superadmin
  if (!isSuperAdmin && (!rol || !allowedRoles.includes(rol))) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

// Componente wrapper para la ruta de login
function LoginRoute() {
  const [user] = useAuthState(auth)
  return user ? <Navigate to="/dashboard" replace /> : <Login />
}

export default function App() {
  return (
    <Routes>
      {/* 1. Ruta Raíz (PÚBLICA) */}
      <Route path="/" element={<PagInicial />} />

      {/* 2. Ruta de Login (PÚBLICA) */}
      <Route path="/login" element={<LoginRoute />} />

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
        {/* Dashboard - Todos los usuarios autenticados */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Usuarios - Solo Admin RRHH y Usuario RRHH */}
        <Route
          path="/usuarios"
          element={
            <RoleProtectedRoute allowedRoles={["Admin RRHH", "Usuario RRHH"]}>
              <UsersPage />
            </RoleProtectedRoute>
          }
        />

        {/* Encuestas - Solo Admin RRHH y Usuario RRHH */}
        <Route
          path="/encuestas"
          element={
            <RoleProtectedRoute allowedRoles={["Admin RRHH", "Usuario RRHH"]}>
              <Surveys />
            </RoleProtectedRoute>
          }
        />

        {/* Casos - Admin RRHH, Usuario RRHH y Gestor Casos */}
        <Route
          path="/casos"
          element={
            <RoleProtectedRoute allowedRoles={["Admin RRHH", "Usuario RRHH", "Gestor Casos"]}>
              <Casos />
            </RoleProtectedRoute>
          }
        />

        {/* Detalle de Caso - SOLO Gestor Casos */}
        <Route
          path="/casos/:id"
          element={
            <RoleProtectedRoute allowedRoles={["Gestor Casos"]}>
              <CaseDetail />
            </RoleProtectedRoute>
          }
        />

        {/* Auditoría - Solo Admin RRHH */}
        <Route
          path="/auditoria"
          element={
            <RoleProtectedRoute allowedRoles={["Admin RRHH"]}>
              <AuditLogPage />
            </RoleProtectedRoute>
          }
        />

        {/* Nueva Encuesta - Solo Admin RRHH y Usuario RRHH */}
        <Route
          path="/nueva-encuesta"
          element={
            <RoleProtectedRoute allowedRoles={["Admin RRHH", "Usuario RRHH"]}>
              <NewSurvey isOpen={true} onClose={() => {}} onSave={() => {}} initialData={null} />
            </RoleProtectedRoute>
          }
        />
      </Route>

      {/* 5. Fallback Global (Comodín) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
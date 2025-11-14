"use client"

import { useState, useEffect, useCallback, useMemo } from "react" // 🎨 Eliminado useMemo de aquí
import "./users.css"
import AddUserModal from "./AddUserModal.jsx"
import EditUserModal from "./EditUserModal.jsx"
import ConfirmDeleteModal from "./ConfirmDeleteModal.jsx"
import BulkUploadModal from "./BulkUploadModal.jsx"
import AreaDeptoModal from "./AreaDeptoModal.jsx"
import AddWebUserModal from "./AddWebUserModal.jsx"
import EditWebUserModal from "./EditWebUserModal.jsx"
import TermsModal from "./TermsModal.jsx"

// --- IMPORTS AÑADIDOS ---
import logoLocal from "../../assets/logo_kleo.png"
import { storage } from "../../firebase"
// 🎨 'setDoc', 'serverTimestamp', 'doc', 'getDoc' ya estaban o son necesarios
import { setDoc, serverTimestamp, doc, getDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import LogoModal from "../../components/LogoModal.tsx"
// --- FIN IMPORTS AÑADIDOS ---

import {
  FaEdit,
  FaTrash,
  FaUsers,
  FaUserPlus,
  FaBuilding,
  FaUpload,
  FaDesktop,
  FaFileContract,
  FaCog,
} from "react-icons/fa"
import { auth, db } from "../../firebase"
import { API_ENDPOINTS, logApiCall } from "../../api/apiConfig"
// 'doc' y 'getDoc' ya están importados arriba

// --- 🎨 IMPORTS DE TEMA ---
import {
  THEMES,
  applyThemeByName as applyThemeGlobally,
  applyCustomTheme as applyCustomThemeGlobally,
  DEFAULT_CUSTOM_COLORS,
} from "../../utils/themeUtils" // Ajusta la ruta si es necesario

export default function UsersPage() {
  // --- ESTADO NUEVO PARA NAVEGACIÓN ---
  const [currentView, setCurrentView] = useState("usuarios")

  // --- Estados existentes ---
  const [query, setQuery] = useState("")
  // ... (todos los demás estados: rows, loading, etc. se mantienen)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [tipoLista, setTipoLista] = useState("movil")
  const [areas, setAreas] = useState([])
  const [openArea, setOpenArea] = useState(false)
  const [editingArea, setEditingArea] = useState(null)
  const [openConfirmArea, setOpenConfirmArea] = useState(false)
  const [deleteAreaId, setDeleteAreaId] = useState(null)
  const [openAdd, setOpenAdd] = useState(false)
  const [openAddWeb, setOpenAddWeb] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [openEditWeb, setOpenEditWeb] = useState(false)
  const [editingWebUser, setEditingWebUser] = useState(null)
  const [openConfirm, setOpenConfirm] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [openBulk, setOpenBulk] = useState(false)
  const [rol, setRol] = useState(null)
  const [logoUrl, setLogoUrl] = useState(logoLocal)
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false)
  const [loadingLogo, setLoadingLogo] = useState(true)
  const [openTerms, setOpenTerms] = useState(false)
  const [termsData, setTermsData] = useState({ title: "", content: "" })

  // --- Lógica de Admin ---
  const SUPER_ADMIN_EMAIL = "superadmin@mail.com"
  const isSuperAdmin = auth.currentUser?.email === SUPER_ADMIN_EMAIL
  const isAdmin = rol === "Admin RRHH" || isSuperAdmin

  // --- useEffects para cargar datos ---
  // ... (fetchRol, fetchLogo, useEffect de tipoLista, getAreaName, fetchUsers, fetchAreas, fetchTerms, useEffect de búsqueda...
  // ... toda esa lógica se mantiene exactamente igual que en tu archivo original) ...

  // [Tu lógica de fetchRol, fetchLogo, etc., va aquí...]
  // Obtener el rol
  useEffect(() => {
    const fetchRol = async () => {
      try {
        const user = auth.currentUser
        if (user) {
          const ref = doc(db, "usuariosWeb", user.uid)
          const snap = await getDoc(ref)
          setRol(snap.exists() ? snap.data().rol : null)
        }
      } catch {
        setRol(null)
      }
    }
    fetchRol()
  }, [])

  // Cargar logo (se carga siempre, no depende de la vista)
  const fetchLogo = useCallback(async () => {
    try {
      setLoadingLogo(true)
      const snap = await getDoc(doc(db, "configuracion", "logo"))
      if (snap.exists() && snap.data().logo_url) setLogoUrl(snap.data().logo_url)
      else setLogoUrl(logoLocal)
    } catch (err) {
      console.error("Error al obtener logo:", err)
      setLogoUrl(logoLocal)
    } finally {
      setLoadingLogo(false)
    }
  }, [])

  useEffect(() => {
    fetchLogo()
  }, [fetchLogo])

  // Forzar a "móvil" si no es Admin
  useEffect(() => {
    if (tipoLista === "web" && rol !== "Admin RRHH") {
      setTipoLista("movil")
    }
  }, [tipoLista, rol])

  // Helper para nombre de área
  const getAreaName = useCallback(
    (areaId) => {
      if (!areaId) return "Sin área"
      const area = areas.find((a) => a.id === areaId || a.areaId === areaId)
      return area ? area.nombreArea : `Área ${areaId}`
    },
    [areas],
  )

  // ================== USERS ==================
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const token = await auth.currentUser.getIdToken()
      let usuarios = []
      if (tipoLista === "movil") {
        logApiCall("GET", API_ENDPOINTS.USUARIOS_MOVIL)
        const res = await fetch(API_ENDPOINTS.USUARIOS_MOVIL, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        const currentUid = auth.currentUser.uid
        usuarios = Array.isArray(data)
          ? data.map((u) => ({
              ...u,
              id: u.uid || u.id,
              telefono: u.contacto || "",
              cargo: u.rol || u.cargo || "",
              tipo: "movil",
            }))
          : []
        usuarios = [...usuarios.filter((u) => u.id === currentUid), ...usuarios.filter((u) => u.id !== currentUid)]
      } else {
        logApiCall("GET", API_ENDPOINTS.USUARIOS_WEB)
        const res = await fetch(API_ENDPOINTS.USUARIOS_WEB, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        const currentUid = auth.currentUser.uid
        usuarios = Array.isArray(data)
          ? data.map((u) => ({
              ...u,
              id: u.uid || u.id,
              telefono: u.contacto || "",
              cargo: u.rol || "",
              tipo: "web",
            }))
          : []
        usuarios = [...usuarios.filter((u) => u.id === currentUid), ...usuarios.filter((u) => u.id !== currentUid)]
      }
      setRows(usuarios)
    } catch (error) {
      console.error("Error cargando usuarios:", error)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [tipoLista])

  useEffect(() => {
    // Solo carga usuarios si la vista es 'usuarios'
    if (currentView === "usuarios") {
      fetchUsers()
    }
  }, [fetchUsers, currentView])

  // ================== AREAS ==================
  const fetchAreas = useCallback(async () => {
    setLoading(true) // Usamos el loading general
    try {
      const token = await auth.currentUser.getIdToken()
      logApiCall("GET", API_ENDPOINTS.AREAS)
      const res = await fetch(API_ENDPOINTS.AREAS, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Error al obtener áreas")
      const data = await res.json()

      const areasConId = Array.isArray(data)
        ? data.map((a) => ({
            id: a.areaId || a.id,
            areaId: a.areaId || a.id,
            nombreArea: a.nombreArea,
            nombreEncargado: a.nombreEncargado,
            correoEncargado: a.correoEncargado,
            descripcion: a.descripcion,
          }))
        : []

      setAreas(areasConId)
    } catch (err) {
      console.error("❌ Error cargando áreas:", err)
      setAreas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Solo carga áreas si la vista es 'areas'
    if (currentView === "areas") {
      fetchAreas()
    }
  }, [fetchAreas, currentView])

  // Cargar los términos y condiciones
  useEffect(() => {
    // Solo carga términos si la vista es 'configuracion'
    if (currentView === "configuracion") {
      const fetchTerms = async () => {
        const termsRef = doc(db, "configuracion", "terminosYCondiciones")
        const docSnap = await getDoc(termsRef)
        if (docSnap.exists()) {
          setTermsData(docSnap.data())
        }
      }
      fetchTerms()
    }
  }, [currentView]) // Depende de currentView

  // Efecto para la búsqueda
  useEffect(() => {
    if (query.trim()) {
      setIsSearching(true)
      const timer = setTimeout(() => setIsSearching(false), 300)
      return () => clearTimeout(timer)
    } else {
      setIsSearching(false)
    }
  }, [query])

  // --- Todas las funciones (handleSaveLogo, handleSaveNew, etc.) ---
  // ... (Tu lógica de handleSaveLogo, handleSaveNew, handleSaveWebUser, filtered, handleSaveArea, onEditArea, onDeleteAreaAsk,
  // ... onDeleteAreaConfirm, onEdit, onDeleteAsk, onDeleteConfirm, onEditSave, handleBulkImport, getBadgeClass, handleSaveTerms
  // ... se mantiene exactamente igual) ...

  // [Tu lógica de handleSaveLogo, handleSaveNew, etc., va aquí...]
  const handleSaveLogo = async (file) => {
    if (!file) return
    setLoadingLogo(true)
    try {
      const storageRef = ref(storage, `configuracion/logo_empresa`)
      await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(storageRef)
      await setDoc(
        doc(db, "configuracion", "logo"),
        { logo_url: downloadURL, updated_at: serverTimestamp() },
        { merge: true },
      )
      setLogoUrl(downloadURL)
      setIsLogoModalOpen(false)
    } catch (err) {
      console.error("Error al guardar logo:", err)
      alert("Hubo un error al guardar el logo.")
    } finally {
      setLoadingLogo(false)
    }
  }

  const handleSaveNew = async (userData) => {
    try {
      const token = await auth.currentUser.getIdToken()
      logApiCall("POST", API_ENDPOINTS.USUARIOS_MOVIL)
      const resp = await fetch(API_ENDPOINTS.USUARIOS_MOVIL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      })
      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.error || "Error creando usuario")
      }
      await fetchUsers()
    } catch (e) {
      console.error("❌ Error creando usuario:", e)
      alert(e.message || "Error creando usuario.")
    }
  }

  const handleSaveWebUser = async () => {
    setOpenAddWeb(false)
    await fetchUsers()
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.nombres, r.apellidos, r.correo, r.telefono, r.cargo, getAreaName(r.area)].some((v) =>
        (v || "").toLowerCase().includes(q),
      ),
    )
  }, [query, rows, getAreaName])

  const handleSaveArea = async (formData) => {
    try {
      const token = await auth.currentUser.getIdToken()
      const method = editingArea ? "PATCH" : "POST"
      const url = editingArea
        ? API_ENDPOINTS.AREA_DETAIL(editingArea.id)
        : API_ENDPOINTS.AREAS
      logApiCall(method, url, editingArea)
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error("Error guardando área")
      await fetchAreas()
      setOpenArea(false)
      setEditingArea(null)
    } catch (err) {
      console.error("❌ Error guardando área:", err)
      alert(err.message)
    }
  }

  const onEditArea = (area) => {
    setEditingArea(area)
    setOpenArea(true)
  }

  const onDeleteAreaAsk = (id) => {
    setDeleteAreaId(id)
    setOpenConfirmArea(true)
  }

  const onDeleteAreaConfirm = async () => {
    if (!deleteAreaId) return
    try {
      const token = await auth.currentUser.getIdToken()
      logApiCall("DELETE", API_ENDPOINTS.AREA_DETAIL(deleteAreaId))
      await fetch(API_ENDPOINTS.AREA_DETAIL(deleteAreaId), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      setAreas((prev) => prev.filter((a) => a.id !== deleteAreaId))
      await fetchUsers()
    } catch (err) {
      console.error("❌ Error eliminando área:", err)
    } finally {
      setOpenConfirmArea(false)
      setDeleteAreaId(null)
    }
  }

  const onEdit = (id) => {
    const u = rows.find((r) => r.id === id)
    if (!u) return
    if (u.tipo === "web") {
      setEditingWebUser(u)
      setOpenEditWeb(true)
    } else {
      setEditingUser(u)
      setOpenEdit(true)
    }
  }

  const onDeleteAsk = (id) => {
    setDeleteId(id)
    setOpenConfirm(true)
  }

  const onDeleteConfirm = async () => {
    if (!deleteId) return
    try {
      const token = await auth.currentUser.getIdToken()
      const endpoint =
        tipoLista === "movil"
          ? API_ENDPOINTS.USUARIO_MOVIL_DETAIL(deleteId)
          : API_ENDPOINTS.USUARIO_WEB_DETAIL(deleteId)
      logApiCall("DELETE", endpoint)
      await fetch(endpoint, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      setRows((prev) => prev.filter((r) => r.id !== deleteId))
    } catch (error) {
      console.error("Error eliminando usuario:", error)
    } finally {
      setOpenConfirm(false)
      setDeleteId(null)
    }
  }

  const onEditSave = async (u) => {
    try {
      const token = await auth.currentUser.getIdToken()
      const endpoint =
        u.tipo === "web"
          ? API_ENDPOINTS.USUARIO_WEB_DETAIL(u.id)
          : API_ENDPOINTS.USUARIO_MOVIL_DETAIL(u.id)
      logApiCall("PATCH", endpoint, u)
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(u),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Error actualizando usuario")
      await fetchUsers()
      setOpenEdit(false)
      setEditingUser(null)
      setOpenEditWeb(false)
      setEditingWebUser(null)
    } catch (error) {
      alert(error.message || "Error actualizando usuario")
    }
  }

  const handleBulkImport = async (list, selectedArea) => {
    try {
      const token = await auth.currentUser.getIdToken()
      logApiCall("POST", API_ENDPOINTS.USUARIO_MOVIL_BULK, { count: list.length })
      const resp = await fetch(API_ENDPOINTS.USUARIO_MOVIL_BULK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ usuarios: list, area: selectedArea }),
      })
      const result = await resp.json()
      if (!resp.ok) {
        throw new Error(result.error || "Error importando usuarios")
      }
      await fetchUsers()
      return result
    } catch (e) {
      console.error("❌ Error importando usuarios:", e)
      alert(e.message || "Error importando usuarios.")
      throw e
    } finally {
      setOpenBulk(false)
    }
  }

  const getBadgeClass = (cargo) => {
    const normalized = (cargo || "").toLowerCase().replace(/\s+/g, "-")
    return `badge badge--${normalized}`
  }

  const handleSaveTerms = async (data) => {
    const termsRef = doc(db, "configuracion", "terminosYCondiciones")
    await setDoc(termsRef, data)
    setTermsData(data) // Actualiza el estado local
  }

  // ----------------- THEME: estados y utilidades -----------------
  // 🎨 ELIMINADO: const THEMES = useMemo(...)
  // 🎨 La constante THEMES se importa de themeUtils

  // 🎨 Estado tema seleccionado (sin localStorage)
  const [theme, setTheme] = useState("light")
  const [loadingTheme, setLoadingTheme] = useState(true) // 🎨 NUEVO: Estado de carga

  // 🎨 Estado para tema personalizado (sin localStorage)
  const [customColors, setCustomColors] = useState(DEFAULT_CUSTOM_COLORS)

  // 🎨 ELIMINADO: applyCustomTheme y applyThemeByName (se importan)

  // 🎨 NUEVO: Cargar config del tema desde Firestore para el panel de admin
  useEffect(() => {
    // Solo carga la config del tema si estamos en la vista de configuración
    if (currentView === "configuracion") {
      const fetchThemeConfig = async () => {
        setLoadingTheme(true)
        try {
          const themeDocRef = doc(db, "configuracion", "temas")
          const docSnap = await getDoc(themeDocRef)

          if (docSnap.exists()) {
            const config = docSnap.data()
            setTheme(config.etiqueta || "light")
            setCustomColors(config.customColors || DEFAULT_CUSTOM_COLORS)
          } else {
            // Si no existe, usamos valores por defecto
            setTheme("light")
            setCustomColors(DEFAULT_CUSTOM_COLORS)
          }
        } catch (error) {
          console.error("Error cargando config de tema:", error)
          // Usar valores por defecto en caso de error
          setTheme("light")
          setCustomColors(DEFAULT_CUSTOM_COLORS)
        } finally {
          setLoadingTheme(false)
        }
      }

      fetchThemeConfig()
    }
  }, [currentView]) // Se ejecuta cada vez que entras a 'configuracion'

  // 🎨 MODIFICADO: Cuando cambia customColors y el tema es 'custom', aplicar en vivo
  useEffect(() => {
    if (theme === "custom") {
      applyCustomThemeGlobally(customColors)
      // Ya NO guardamos en localStorage.
    }
  }, [customColors, theme])

  // 🎨 ELIMINADO: useEffect de "Al montar, aplicar tema guardado"
  // (Esta lógica ahora vive en GlobalThemeLoader.jsx)

  // Handlers para inputs del tema personalizado (sin cambios)
  const handleCustomColorChange = (key, value) => {
    setCustomColors((prev) => ({ ...prev, [key]: value }))
  }

  // 🎨 NUEVO: Handler para guardar temas predefinidos (light/medium/dark)
  const handleSaveThemeByName = async (name) => {
    const palette = THEMES[name]
    if (!palette) return

    // 1. Aplicar visualmente
    applyThemeGlobally(name)
    // 2. Actualizar estado local (UI)
    setTheme(name)
    // 3. Guardar en Firestore
    try {
      await setDoc(
        doc(db, "configuracion", "temas"),
        {
          etiqueta: name,
          updated_at: serverTimestamp(),
        },
        { merge: true }, // merge para no borrar customColors si existen
      )
    } catch (e) {
      console.error("Error al guardar tema:", e)
      alert("Error al guardar el tema.")
    }
  }

  // 🎨 NUEVO: Handler para activar la PESTAÑA custom (no guarda)
  const handleActivateCustomTab = () => {
    setTheme("custom")
    applyCustomThemeGlobally(customColors)
  }

  // 🎨 MODIFICADO: Guardar explícitamente tema personalizado EN FIRESTORE
  const saveCustomThemeToDb = async () => {
    // 1. Aplicar visualmente
    applyCustomThemeGlobally(customColors)
    // 2. Actualizar estado local
    setTheme("custom")
    // 3. Guardar en Firestore
    try {
      await setDoc(doc(db, "configuracion", "temas"), {
        etiqueta: "custom",
        customColors: customColors,
        updated_at: serverTimestamp(),
      })
      alert("¡Tema personalizado guardado!")
    } catch (e) {
      console.error("Error al guardar tema custom:", e)
      alert("Error al guardar el tema.")
    }
  }

  // 🎨 MODIFICADO: Resetear a valores por defecto EN FIRESTORE
  const resetCustomThemeInDb = async () => {
    const defaults = DEFAULT_CUSTOM_COLORS
    // 1. Aplicar visualmente
    applyCustomThemeGlobally(defaults)
    // 2. Actualizar estado local
    setCustomColors(defaults)
    setTheme("custom") // Seguir en la pestaña custom
    // 3. Guardar en Firestore
    try {
      await setDoc(doc(db, "configuracion", "temas"), {
        etiqueta: "custom",
        customColors: defaults,
        updated_at: serverTimestamp(),
      })
      alert("¡Tema restablecido y guardado!")
    } catch (e) {
      console.error("Error al resetear tema:", e)
      alert("Error al guardar el tema.")
    }
  }

  // --- RENDERIZADO PRINCIPAL ---
  return (
    <div className="users">
      {/* --- 1. NAVEGACIÓN PRINCIPAL DE PESTAÑAS --- */}
      <div className="admin-nav">
        {/* ... (Botones de navegación de pestañas se mantienen igual) ... */}
        <button
          className={`admin-nav-btn ${currentView === "usuarios" ? "active" : ""}`}
          onClick={() => setCurrentView("usuarios")}
        >
          <FaUsers /> Usuarios
        </button>
        <button
          className={`admin-nav-btn ${currentView === "areas" ? "active" : ""}`}
          onClick={() => setCurrentView("areas")}
        >
          <FaBuilding /> Áreas y Deptos
        </button>
        {isAdmin && (
          <button
            className={`admin-nav-btn ${currentView === "configuracion" ? "active" : ""}`}
            onClick={() => setCurrentView("configuracion")}
          >
            <FaCog /> Configuración
          </button>
        )}
      </div>

      {/* --- 2. VISTA DE USUARIOS --- */}
      {currentView === "usuarios" && (
        <>
          {/* ... (Toda la UI de Vista Usuarios se mantiene igual) ... */}
          {/* Estadísticas */}
          <div className="users__stats">
            <div className="stat-card">
              <div className="stat-number">{rows.length}</div>
              <div className="stat-label">{tipoLista === "movil" ? "Usuarios Móvil" : "Usuarios Web"}</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{areas.length}</div>
              <div className="stat-label">Áreas/Deptos</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{filtered.length}</div>
              <div className="stat-label">Resultados</div>
            </div>
          </div>

          <h1 className="users__title">Administración de Usuarios</h1>

          {/* Selector de lista */}
          <div className="users__toggle">
            <button
              className={`btn ${tipoLista === "movil" ? "btn--primary" : "btn--secondary"}`}
              onClick={() => setTipoLista("movil")}
              aria-pressed={tipoLista === "movil"}
            >
              Usuarios Móvil
            </button>
            {rol === "Admin RRHH" && (
              <button
                className={`btn ${tipoLista === "web" ? "btn--primary" : "btn--secondary"}`}
                onClick={() => setTipoLista("web")}
                aria-pressed={tipoLista === "web"}
              >
                Usuarios Web
              </button>
            )}
          </div>

          {/* Toolbar de Usuarios */}
          <div className="users__toolbar">
            <div className={`users__search ${isSearching ? "searching" : ""}`}>
              <svg className="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Buscar por nombre, correo, teléfono, cargo o área..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Buscar usuarios"
              />
              {query && (
                <button
                  className="clear-search"
                  onClick={() => setQuery("")}
                  aria-label="Limpiar búsqueda"
                  title="Limpiar búsqueda"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="users__actions">
              <button
                className="btn btn--secondary"
                onClick={() => setOpenBulk(true)}
                title="Importar múltiples usuarios desde archivo"
              >
                <FaUpload aria-hidden="true" /> <span>Carga masiva</span>
              </button>
              {tipoLista === "movil" ? (
                <button
                  className="btn btn--primary"
                  onClick={() => setOpenAdd(true)}
                  title="Agregar nuevo usuario móvil"
                >
                  <FaUserPlus aria-hidden="true" /> <span>Agregar usuario</span>
                </button>
              ) : (
                rol === "Admin RRHH" && (
                  <button
                    className="btn btn--primary"
                    onClick={() => setOpenAddWeb(true)}
                    title="Agregar nuevo usuario web"
                  >
                    <FaDesktop aria-hidden="true" /> <span>Agregar Usuario Web</span>
                  </button>
                )
              )}
            </div>
          </div>

          {query && (
            <div className="search-indicator">
              <span>
                Mostrando {filtered.length} de {rows.length} usuarios
              </span>
              {filtered.length === 0 && <span className="no-results">No se encontraron resultados</span>}
            </div>
          )}

          {/* --- TABLA USUARIOS --- */}
          <div className="users-card">
            <div className="table-container">
              {loading ? (
                <div className="table-skeleton">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="skeleton-row" />
                  ))}
                </div>
              ) : (
                <table className="users__table">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Contacto</th>
                      <th>Cargo</th>
                      <th>Área</th>
                      <th className="col-actions">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u, index) => (
                      <tr key={u.id} style={{ animationDelay: `${index * 0.03}s` }} className="table-row-animated">
                        <td>
                          <div className="user-info">
                            <div className="user-avatar">{(u.nombres || u.nombre || "").charAt(0).toUpperCase()}</div>
                            <div>
                              <div className="user-name">
                                {u.nombres ? `${u.nombres} ${u.apellidos || ""}` : u.nombre}
                              </div>
                              <div className="user-email">{u.correo}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="contact-info">
                            <div className="phone">{u.telefono || "—"}</div>
                          </div>
                        </td>
                        <td>
                          <span className={getBadgeClass(u.cargo)}>{u.cargo || "Sin cargo"}</span>
                        </td>
                        <td>
                          <span className="area-name">{getAreaName(u.area)}</span>
                        </td>
                        <td className="col-actions">
                          <button
                            className="iconBtn iconBtn--edit"
                            title="Editar usuario"
                            onClick={() => onEdit(u.id)}
                            aria-label={`Editar ${u.nombres || u.nombre}`}
                          >
                            <FaEdit aria-hidden="true" />
                          </button>
                          {u.id !== auth.currentUser.uid && (
                            <button
                              className="iconBtn iconBtn--delete"
                              title="Eliminar usuario"
                              onClick={() => onDeleteAsk(u.id)}
                              aria-label={`Eliminar ${u.nombres || u.nombre}`}
                            >
                              <FaTrash aria-hidden="true" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={5} className="empty">
                          <div className="empty-state">
                            <FaUsers aria-hidden="true" />
                            <p>No se encontraron usuarios</p>
                            <small>Intenta con otros términos de búsqueda</small>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* --- 3. VISTA DE ÁREAS --- */}
      {currentView === "areas" && (
        <>
          {/* ... (Toda la UI de Vista Áreas se mantiene igual) ... */}
          <h1 className="users__title">Administración de Áreas</h1>
          <div className="users__toolbar" style={{ justifyContent: "flex-end" }}>
            <div className="users__actions">
              <button
                className="btn btn--primary"
                onClick={() => {
                  setEditingArea(null)
                  setOpenArea(true)
                }}
                title="Agregar nueva área o departamento"
              >
                <FaBuilding aria-hidden="true" /> <span>Agregar área</span>
              </button>
            </div>
          </div>

          <div className="users-card">
            <div className="table-container">
              {loading ? (
                <div className="table-skeleton">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="skeleton-row" />
                  ))}
                </div>
              ) : (
                <table className="users__table">
                  <thead>
                    <tr>
                      <th>Área</th>
                      <th>Encargado</th>
                      <th>Correo</th>
                      <th>Descripción</th>
                      <th className="col-actions">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {areas.length > 0 ? (
                      areas.map((a, index) => (
                        <tr key={a.id} style={{ animationDelay: `${index * 0.03}s` }} className="table-row-animated">
                          <td>
                            <div className="dept-name">
                              <FaBuilding style={{ marginRight: "8px", color: "var(--muted)" }} aria-hidden="true" />
                              {a.nombreArea}
                            </div>
                          </td>
                          <td>{a.nombreEncargado}</td>
                          <td>{a.correoEncargado}</td>
                          <td>{a.descripcion || "—"}</td>
                          <td className="col-actions">
                            <button
                              className="iconBtn iconBtn--edit"
                              title="Editar área"
                              onClick={() => onEditArea(a)}
                              aria-label={`Editar área ${a.nombreArea}`}
                            >
                              <FaEdit aria-hidden="true" />
                            </button>
                            <button
                              className="iconBtn iconBtn--delete"
                              title="Eliminar área"
                              onClick={() => onDeleteAreaAsk(a.id)}
                              aria-label={`Eliminar área ${a.nombreArea}`}
                            >
                              <FaTrash aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="empty">
                          <div className="empty-state">
                            <FaBuilding aria-hidden="true" />
                            <p>No hay áreas existentes</p>
                            <small>Agrega una nueva para comenzar</small>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* --- 4. VISTA DE CONFIGURACIÓN --- */}
      {currentView === "configuracion" && isAdmin && (
        <>
          <h1 className="users__title">Configuración General</h1>

          <div className="users-card thems-card">
            <h2 className="config-section-title">Tema de la Aplicación</h2>
            <p className="config-section-description">
              Selecciona la paleta de colores que prefieras para personalizar la interfaz.
            </p>

            {/* 🎨 AÑADIDO: Estado de carga para los temas */}
            {loadingTheme ? (
              <div className="table-skeleton" style={{ marginTop: "20px" }}>
                <div className="skeleton-row" style={{ height: "150px", width: "100%" }} />
              </div>
            ) : (
              <>
                <div className="theme-cards-grid">
                  {/* Card Tema Claro */}
                  <button
                    className={`theme-card ${theme === "light" ? "active" : ""}`}
                    onClick={() => handleSaveThemeByName("light")} // 🎨 MODIFICADO
                  >
                    <div className="theme-card-header">
                      <span className="theme-icon">☀️</span>
                      <span className="theme-name">Modo Claro</span>
                    </div>
                    <div className="theme-preview">
                      <div className="theme-color-row">
                        <div className="theme-color" style={{ backgroundColor: "#4fd1c7" }} title="Fondo Login" />
                        <div className="theme-color" style={{ backgroundColor: "#3bb8a8" }} title="Sidebar" />
                        <div className="theme-color" style={{ backgroundColor: "#8e44ad" }} title="Primary" />
                      </div>
                      <div className="theme-color-row">
                        <div className="theme-color" style={{ backgroundColor: "#ffffff" }} title="Surface" />
                        <div className="theme-color" style={{ backgroundColor: "#f7fafc" }} title="Surface 2" />
                        <div className="theme-color" style={{ backgroundColor: "#1f2937" }} title="Text" />
                      </div>
                    </div>
                    {theme === "light" && <div className="theme-badge">Activo</div>}
                  </button>

                  {/* Card Tema Medio */}
                  <button
                    className={`theme-card ${theme === "medium" ? "active" : ""}`}
                    onClick={() => handleSaveThemeByName("medium")} // 🎨 MODIFICADO
                  >
                    <div className="theme-card-header">
                      <span className="theme-icon">🌤️</span>
                      <span className="theme-name">Modo Medio</span>
                    </div>
                    <div className="theme-preview">
                      <div className="theme-color-row">
                        <div className="theme-color" style={{ backgroundColor: "#f6d365" }} title="Fondo Login" />
                        <div className="theme-color" style={{ backgroundColor: "#f1923a" }} title="Sidebar" />
                        <div className="theme-color" style={{ backgroundColor: "#ef6c00" }} title="Primary" />
                      </div>
                      <div className="theme-color-row">
                        <div className="theme-color" style={{ backgroundColor: "#ffffff" }} title="Surface" />
                        <div className="theme-color" style={{ backgroundColor: "#f3f4f6" }} title="Surface 2" />
                        <div className="theme-color" style={{ backgroundColor: "#111827" }} title="Text" />
                      </div>
                    </div>
                    {theme === "medium" && <div className="theme-badge">Activo</div>}
                  </button>

                  {/* Card Tema Oscuro */}
                  <button
                    className={`theme-card ${theme === "dark" ? "active" : ""}`}
                    onClick={() => handleSaveThemeByName("dark")} // 🎨 MODIFICADO
                  >
                    <div className="theme-card-header">
                      <span className="theme-icon">🌙</span>
                      <span className="theme-name">Modo Oscuro</span>
                    </div>
                    <div className="theme-preview">
                      <div className="theme-color-row">
                        <div className="theme-color" style={{ backgroundColor: "#0f172a" }} title="Fondo Login" />
                        <div className="theme-color" style={{ backgroundColor: "#0b1220" }} title="Sidebar" />
                        <div className="theme-color" style={{ backgroundColor: "#2563eb" }} title="Primary" />
                      </div>
                      <div className="theme-color-row">
                        <div className="theme-color" style={{ backgroundColor: "#0b1220" }} title="Surface" />
                        <div className="theme-color" style={{ backgroundColor: "#071023" }} title="Surface 2" />
                        <div className="theme-color" style={{ backgroundColor: "#e6eef8" }} title="Text" />
                      </div>
                    </div>
                    {theme === "dark" && <div className="theme-badge">Activo</div>}
                  </button>

                  {/* Card Tema Personalizado */}
                  <button
                    className={`theme-card ${theme === "custom" ? "active" : ""}`}
                    onClick={handleActivateCustomTab} // 🎨 MODIFICADO
                  >
                    <div className="theme-card-header">
                      <span className="theme-icon">🎨</span>
                      <span className="theme-name">Personalizado</span>
                    </div>
                    <div className="theme-preview">
                      <div className="theme-color-row">
                        <div
                          className="theme-color"
                          style={{ backgroundColor: customColors.primary }}
                          title="Primary"
                        />
                        <div
                          className="theme-color"
                          style={{ backgroundColor: customColors.sidebar }}
                          title="Sidebar"
                        />
                        <div
                          className="theme-color"
                          style={{ backgroundColor: customColors.surface }}
                          title="Surface"
                        />
                      </div>
                      <div className="theme-color-row">
                        <div
                          className="theme-color"
                          style={{ backgroundColor: customColors["surface-2"] }}
                          title="Surface 2"
                        />
                        <div className="theme-color" style={{ backgroundColor: customColors.text }} title="Text" />
                        <div className="theme-color" style={{ backgroundColor: customColors.muted }} title="Muted" />
                      </div>
                    </div>
                    {theme === "custom" && <div className="theme-badge">Activo</div>}
                  </button>
                </div>

                {theme === "custom" && (
                  <div className="thems-card">
                    <h3 className="custom-theme-title">Personaliza tu Tema</h3>
                    <p className="custom-theme-description">
                      Ajusta cada color individualmente. Los cambios se reflejan en tiempo real, pero debes
                      guardarlos.
                    </p>

                    <div className="custom-controls">
                      {/* ... (Todas las etiquetas <label> y los <input> se mantienen igual) ... */}
                      <label className="control-row">
                        <span className="control-label">
                          <span className="color-dot" style={{ backgroundColor: customColors.primary }} />
                          Color Principal
                        </span>
                        <div className="control-inputs">
                          <input
                            type="color"
                            value={customColors.primary}
                            onChange={(e) => handleCustomColorChange("primary", e.target.value)}
                            className="color-picker"
                          />
                          <input
                            type="text"
                            value={customColors.primary}
                            onChange={(e) => handleCustomColorChange("primary", e.target.value)}
                            className="hex-input"
                            placeholder="#000000"
                          />
                        </div>
                      </label>

                      <label className="control-row">
                        <span className="control-label">
                          <span className="color-dot" style={{ backgroundColor: customColors.sidebar }} />
                          Sidebar
                        </span>
                        <div className="control-inputs">
                          <input
                            type="color"
                            value={customColors.sidebar}
                            onChange={(e) => handleCustomColorChange("sidebar", e.target.value)}
                            className="color-picker"
                          />
                          <input
                            type="text"
                            value={customColors.sidebar}
                            onChange={(e) => handleCustomColorChange("sidebar", e.target.value)}
                            className="hex-input"
                            placeholder="#000000"
                          />
                        </div>
                      </label>

                      <label className="control-row">
                        <span className="control-label">
                          <span className="color-dot" style={{ backgroundColor: customColors.surface }} />
                          Fondo Principal
                        </span>
                        <div className="control-inputs">
                          <input
                            type="color"
                            value={customColors.surface}
                            onChange={(e) => handleCustomColorChange("surface", e.target.value)}
                            className="color-picker"
                          />
                          <input
                            type="text"
                            value={customColors.surface}
                            onChange={(e) => handleCustomColorChange("surface", e.target.value)}
                            className="hex-input"
                            placeholder="#000000"
                          />
                        </div>
                      </label>

                      <label className="control-row">
                        <span className="control-label">
                          <span className="color-dot" style={{ backgroundColor: customColors["surface-2"] }} />
                          Fondo Secundario
                        </span>
                        <div className="control-inputs">
                          <input
                            type="color"
                            value={customColors["surface-2"]}
                            onChange={(e) => handleCustomColorChange("surface-2", e.target.value)}
                            className="color-picker"
                          />
                          <input
                            type="text"
                            value={customColors["surface-2"]}
                            onChange={(e) => handleCustomColorChange("surface-2", e.target.value)}
                            className="hex-input"
                            placeholder="#000000"
                          />
                        </div>
                      </label>

                      <label className="control-row">
                        <span className="control-label">
                          <span className="color-dot" style={{ backgroundColor: customColors.text }} />
                          Texto Principal
                        </span>
                        <div className="control-inputs">
                          <input
                            type="color"
                            value={customColors.text}
                            onChange={(e) => handleCustomColorChange("text", e.target.value)}
                            className="color-picker"
                          />
                          <input
                            type="text"
                            value={customColors.text}
                            onChange={(e) => handleCustomColorChange("text", e.target.value)}
                            className="hex-input"
                            placeholder="#000000"
                          />
                        </div>
                      </label>

                      <label className="control-row">
                        <span className="control-label">
                          <span className="color-dot" style={{ backgroundColor: customColors.muted }} />
                          Texto Secundario
                        </span>
                        <div className="control-inputs">
                          <input
                            type="color"
                            value={customColors.muted}
                            onChange={(e) => handleCustomColorChange("muted", e.target.value)}
                            className="color-picker"
                          />
                          <input
                            type="text"
                            value={customColors.muted}
                            onChange={(e) => handleCustomColorChange("muted", e.target.value)}
                            className="hex-input"
                            placeholder="#000000"
                          />
                        </div>
                      </label>
                    </div>

                    <div className="custom-actions">
                      <button className="btn btn--primary" onClick={saveCustomThemeToDb}>
                        {" "}
                        {/* 🎨 MODIFICADO */}
                        Guardar Tema Personalizado
                      </button>
                      <button className="btn btn--secondary" onClick={resetCustomThemeInDb}>
                        {" "}
                        {/* 🎨 MODIFICADO */}
                        Restablecer Valores
                      </button>
                    </div>

                    <div className="custom-preview">
                      {/* ... (La vista previa se mantiene igual) ... */}
                      <h4 className="preview-title">Vista Previa en Tiempo Real</h4>
                      <div className="preview-card">
                        <div className="preview-sidebar">
                          <div className="preview-sidebar-item">📊 Dashboard</div>
                          <div className="preview-sidebar-item active">⚙️ Configuración</div>
                          <div className="preview-sidebar-item">👥 Usuarios</div>
                        </div>
                        <div className="preview-main">
                          <div className="preview-header">
                            <span>Panel de Control</span>
                            <button className="preview-btn">Acción</button>
                          </div>
                          <div className="preview-body">
                            <div className="preview-card-item">
                              <div className="preview-card-title">Tarjeta de Ejemplo</div>
                              <div className="preview-card-text">
                                Este es un ejemplo de cómo se verá el contenido con tus colores personalizados.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Logo de la Empresa */}
          {/* ... (Esta sección se mantiene igual) ... */}
          <div className="users__logo-header">
            <p>Logo de la Empresa</p>
            <div
              className="logo-container editable"
              onClick={() => setIsLogoModalOpen(true)}
              title="Cambiar logo"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setIsLogoModalOpen(true)
              }}
            >
              {loadingLogo ? (
                <div className="logo-skeleton">
                  <div className="skeleton-pulse"></div>
                </div>
              ) : (
                <>
                  <img src={logoUrl || "/placeholder.svg"} alt="Logo de la Empresa" className="admin-logo-preview" />
                  <FaEdit className="logo-edit-icon" aria-hidden="true" />
                </>
              )}
            </div>
          </div>

          {/* Términos y Condiciones */}
          {/* ... (Esta sección se mantiene igual) ... */}
          <div className="users-card terms-card">
            <h2 className="users__title terms-title">Términos y Condiciones</h2>
            <p className="terms-description">
              Edita el contenido de los Términos y Condiciones que se muestran a los usuarios en la aplicación móvil.
            </p>
            <div className="users__actions">
              <button
                className="btn btn--secondary"
                onClick={() => setOpenTerms(true)}
                title="Configurar términos y condiciones"
              >
                <FaFileContract aria-hidden="true" /> <span>Editar Términos</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* --- 5. MODALES --- */}
      {/* ... (Todos tus modales se mantienen igual) ... */}
      <AddUserModal isOpen={openAdd} onClose={() => setOpenAdd(false)} onSave={handleSaveNew} />
      <AddWebUserModal isOpen={openAddWeb} onClose={() => setOpenAddWeb(false)} onSave={handleSaveWebUser} />
      <EditUserModal isOpen={openEdit} onClose={() => setOpenEdit(false)} user={editingUser} onSave={onEditSave} />
      <EditWebUserModal
        isOpen={openEditWeb}
        onClose={() => setOpenEditWeb(false)}
        user={editingWebUser}
        onSave={onEditSave}
      />
      <ConfirmDeleteModal
        isOpen={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={onDeleteConfirm}
        title="Eliminar usuario"
        message="¿Seguro que deseas eliminar este usuario?"
      />
      <AreaDeptoModal
        isOpen={openArea}
        onClose={() => {
          setOpenArea(false)
          setEditingArea(null)
        }}
        onSave={handleSaveArea}
        initialData={editingArea}
      />
      <ConfirmDeleteModal
        isOpen={openConfirmArea}
        onClose={() => setOpenConfirmArea(false)}
        onConfirm={onDeleteAreaConfirm}
        title="Eliminar área"
        message="¿Seguro que deseas eliminar esta área?"
      />
      <BulkUploadModal isOpen={openBulk} onClose={() => setOpenBulk(false)} onImport={handleBulkImport} />
      <TermsModal
        isOpen={openTerms}
        onClose={() => setOpenTerms(false)}
        onSave={handleSaveTerms}
        initialData={termsData}
      />
      {isAdmin && (
        <LogoModal
          isOpen={isLogoModalOpen}
          onClose={() => setIsLogoModalOpen(false)}
          onSave={handleSaveLogo}
          currentLogoUrl={logoUrl}
        />
      )}
    </div>
  )
}
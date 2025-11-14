"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import logoLocal from "../assets/logo_kleo.png"
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"
import { auth, db } from "../firebase"
import { doc, getDoc } from "firebase/firestore"

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showReset, setShowReset] = useState(false)
  const [logoUrl, setLogoUrl] = useState(logoLocal)
  const [loadingLogo, setLoadingLogo] = useState(true)

  const [showPassword, setShowPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    const fetchLogo = async () => {
      setLoadingLogo(true)
      try {
        const snap = await getDoc(doc(db, "configuracion", "logo"))
        if (snap.exists() && snap.data().logo_url) {
          setLogoUrl(snap.data().logo_url)
        } else {
          setLogoUrl(logoLocal)
        }
      } catch (err) {
        console.error("Error al obtener logo:", err)
        setLogoUrl(logoLocal)
      } finally {
        setLoadingLogo(false)
      }
    }
    fetchLogo()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccessMessage("")

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const userDoc = await getDoc(doc(db, "usuariosWeb", cred.user.uid))

      if (!userDoc.exists()) {
        setError("No tienes permisos para acceder a esta plataforma.")
        await auth.signOut()
        setLoading(false)
        return
      }

      const userData = userDoc.data()
      if (userData.requiereCambioPassword === true) {
        navigate("/cambiar-password", { replace: true })
      } else {
        navigate("/dashboard", { replace: true })
      }
    } catch (err) {
      console.error("Error en login:", err)
      setError("Credenciales incorrectas o usuario no existe.")
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!email) {
      setError("Ingresa tu correo para recuperar la contraseña.")
      return
    }
    setLoading(true)
    setError("")
    setSuccessMessage("")

    try {
      await sendPasswordResetEmail(auth, email)
      setSuccessMessage("Se ha enviado un correo para restablecer tu contraseña.")
    } catch (err) {
      setError("No se pudo enviar el correo de recuperación.")
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {loadingLogo ? (
          <div className="logo-skeleton">
            <div className="skeleton-pulse"></div>
          </div>
        ) : (
          <img src={logoUrl || "/placeholder.svg"} alt="Kleo Logo" className="login-logo" />
        )}

        {!showReset ? (
          <>
            <h2 className="login-title">Iniciar Sesión</h2>
            <form onSubmit={handleSubmit} className="login-form">
              <div className="input-group">
                <label className="label" htmlFor="email">
                  Correo Electrónico
                </label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                  <input
                    id="email"
                    type="email"
                    className="input input-with-icon"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="label" htmlFor="password">
                  Contraseña
                </label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="input input-with-icon input-with-action"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="input-action-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                        <line x1="2" y1="2" x2="22" y2="22" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button className="btn-primary" type="submit" disabled={loading || loadingLogo}>
                {loading ? (
                  <>
                    <span className="btn-spinner"></span>
                    Entrando...
                  </>
                ) : (
                  "Iniciar Sesión"
                )}
              </button>
            </form>

            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setShowReset(true)
                setError("")
                setSuccessMessage("")
              }}
              disabled={loading}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </>
        ) : (
          <>
            <h2 className="login-title">Recuperar Contraseña</h2>
            <p className="login-subtitle">
              Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
            </p>
            <form onSubmit={handleResetPassword} className="login-form">
              <div className="input-group">
                <label className="label" htmlFor="reset-email">
                  Correo Electrónico
                </label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                  <input
                    id="reset-email"
                    type="email"
                    className="input input-with-icon"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <button className="btn-primary" type="submit" disabled={loading || loadingLogo}>
                {loading ? (
                  <>
                    <span className="btn-spinner"></span>
                    Enviando...
                  </>
                ) : (
                  "Enviar correo de recuperación"
                )}
              </button>
            </form>

            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setShowReset(false)
                setError("")
                setSuccessMessage("")
              }}
              disabled={loading}
            >
              ← Volver al inicio de sesión
            </button>
          </>
        )}

        {error && (
          <div className="login-message login-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}
        {successMessage && (
          <div className="login-message login-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            {successMessage}
          </div>
        )}
      </div>
    </div>
  )
}

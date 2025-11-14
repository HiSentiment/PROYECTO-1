"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { auth } from "../firebase"
import { updatePassword } from "firebase/auth"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "../firebase"

export default function CambiarPassword() {
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showRepeatPassword, setShowRepeatPassword] = useState(false)

  const getPasswordStrength = (password) => {
    if (!password) return { level: 0, text: "", color: "" }

    let strength = 0
    if (password.length >= 6) strength++
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[^a-zA-Z0-9]/.test(password)) strength++

    if (strength <= 1) return { level: 1, text: "Débil", color: "#ef4444" }
    if (strength <= 3) return { level: 2, text: "Media", color: "#f59e0b" }
    return { level: 3, text: "Fuerte", color: "#10b981" }
  }

  const passwordStrength = getPasswordStrength(newPassword)
  const passwordsMatch = newPassword && repeatPassword && newPassword === repeatPassword

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setError("")

    if (!newPassword || !repeatPassword) {
      setError("Completa ambos campos.")
      return
    }
    if (newPassword !== repeatPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }
    if (!auth.currentUser) {
      setError("No hay usuario autenticado.")
      return
    }
    if (newPassword === auth.currentUser.email) {
      setError("La nueva contraseña no puede ser igual al correo.")
      return
    }
    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.")
      return
    }

    setLoading(true)
    try {
      await updatePassword(auth.currentUser, newPassword)
      await updateDoc(doc(db, "usuariosWeb", auth.currentUser.uid), {
        requiereCambioPassword: false,
      })
      navigate("/dashboard", { replace: true })
    } catch (err) {
      setError("Error al cambiar la contraseña. Intenta de nuevo.")
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="password-change-header">
          <div className="password-change-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h2 className="login-title">Cambiar Contraseña</h2>
          <p className="login-subtitle">Por seguridad, necesitas establecer una nueva contraseña.</p>
        </div>

        <form onSubmit={handleChangePassword} className="login-form">
          <div className="input-group">
            <label className="label" htmlFor="new-password">
              Nueva Contraseña
            </label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                className="input input-with-icon input-with-action"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                className="input-action-btn"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={loading}
                aria-label={showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showNewPassword ? (
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

            {newPassword && (
              <div className="password-strength">
                <div className="password-strength-bars">
                  <div
                    className={`password-strength-bar ${passwordStrength.level >= 1 ? "active" : ""}`}
                    style={{ backgroundColor: passwordStrength.level >= 1 ? passwordStrength.color : "" }}
                  ></div>
                  <div
                    className={`password-strength-bar ${passwordStrength.level >= 2 ? "active" : ""}`}
                    style={{ backgroundColor: passwordStrength.level >= 2 ? passwordStrength.color : "" }}
                  ></div>
                  <div
                    className={`password-strength-bar ${passwordStrength.level >= 3 ? "active" : ""}`}
                    style={{ backgroundColor: passwordStrength.level >= 3 ? passwordStrength.color : "" }}
                  ></div>
                </div>
                <span className="password-strength-text" style={{ color: passwordStrength.color }}>
                  {passwordStrength.text}
                </span>
              </div>
            )}
          </div>

          <div className="input-group">
            <label className="label" htmlFor="repeat-password">
              Repetir Contraseña
            </label>
            <div className="input-wrapper">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="repeat-password"
                type={showRepeatPassword ? "text" : "password"}
                className="input input-with-icon input-with-action"
                placeholder="••••••••"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                className="input-action-btn"
                onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                disabled={loading}
                aria-label={showRepeatPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showRepeatPassword ? (
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

            {repeatPassword && (
              <div className="password-match">
                {passwordsMatch ? (
                  <span className="password-match-success">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Las contraseñas coinciden
                  </span>
                ) : (
                  <span className="password-match-error">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Las contraseñas no coinciden
                  </span>
                )}
              </div>
            )}
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="btn-spinner"></span>
                Cambiando...
              </>
            ) : (
              "Cambiar Contraseña"
            )}
          </button>
        </form>

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
      </div>
    </div>
  )
}

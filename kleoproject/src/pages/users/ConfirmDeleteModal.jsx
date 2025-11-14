"use client"

import "./modal.css"

/**
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onConfirm: () => void
 * - title?: string
 * - message?: string
 */
export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Eliminar usuario",
  message = "¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.",
}) {
  if (!isOpen) return null

  return (
    <div className="modal__overlay" onMouseDown={(e) => e.target.classList.contains("modal__overlay") && onClose()}>
      <div className="modal confirm-delete-modal">
        <button className="modal__close" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div className="confirm-delete-header">
          <div className="confirm-delete-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="m12 17 .01 0" />
            </svg>
          </div>
          <h2 className="modal__title modal__title--danger">{title}</h2>
        </div>

        <div className="confirm-delete-message">
          <p>{message}</p>
        </div>

        <div className="modal__actions confirm-delete-actions">
          <button className="btn btn--secondary" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m3 3 18 18" />
              <path d="M6 6h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6" />
              <path d="M6 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
            </svg>
            Cancelar
          </button>
          <button className="btn btn--danger" onClick={onConfirm}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3,6 5,6 21,6" />
              <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

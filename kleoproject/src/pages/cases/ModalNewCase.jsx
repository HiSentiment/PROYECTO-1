import { useState, useEffect, useCallback } from "react";
import { auth } from "../../firebase";
import { API_ENDPOINTS, logApiCall } from "../../api/apiConfig";
import "../users/modal.css";
import "./casos.css";

export default function ModalNewCase({ isOpen, onClose, onSave, initialData }) {
  const [usuarioId, setUsuarioId] = useState("");
  const [fecha, setFecha] = useState("");
  const [estado, setEstado] = useState("Pendiente");
  const [observaciones, setObservaciones] = useState("");
  const [gestorAsignado, setGestorAsignado] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔹 Listas
  const [gestores, setGestores] = useState([]);
  const [loadingGestores, setLoadingGestores] = useState(true);
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);

  // 🔹 Control de dropdowns personalizados
  const [showEstadoMenu, setShowEstadoMenu] = useState(false);
  const [showGestorMenu, setShowGestorMenu] = useState(false);
  const [showUsuarioMenu, setShowUsuarioMenu] = useState(false);

  // helper para normalizar id de usuario (uid / usuarioId / id / _id)
  const getUserId = (u) => u?.uid ?? u?.usuarioId ?? u?.id ?? u?._id ?? "";

  // Convertir formato DD-MM-YYYY a YYYY-MM-DD para el input date
  const convertirAFormatoInput = useCallback((value) => {
    if (!value) return "";
    try {
      if (typeof value === "string" && value.includes("-")) {
        // Si es DD-MM-YYYY, convertir a YYYY-MM-DD
        const partes = value.split("-");
        if (partes.length === 3 && partes[0].length === 2) {
          return `${partes[2]}-${partes[1]}-${partes[0]}`; // YYYY-MM-DD
        }
        // Si ya es YYYY-MM-DD, devolverlo tal cual
        if (partes.length === 3 && partes[0].length === 4) {
          return value;
        }
      }
      
      if (typeof value.toDate === "function") {
        const d = value.toDate();
        if (!isNaN(d)) return d.toISOString().split("T")[0];
      }
      if (typeof value?.seconds === "number") {
        const d = new Date(value.seconds * 1000);
        if (!isNaN(d)) return d.toISOString().split("T")[0];
      }
      if (typeof value?._seconds === "number") {
        const d = new Date(value._seconds * 1000);
        if (!isNaN(d)) return d.toISOString().split("T")[0];
      }
      if (value instanceof Date && !isNaN(value)) {
        return value.toISOString().split("T")[0];
      }
      if (typeof value === "string") {
        const d = new Date(value);
        if (!isNaN(d)) return d.toISOString().split("T")[0];
      }
    } catch (err) {
      console.warn("⚠️ Fecha inválida recibida:", value, err);
    }
    return "";
  }, []);

  const parseFechaSegura = useCallback((value) => {
    return convertirAFormatoInput(value);
  }, [convertirAFormatoInput]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setUsuarioId(initialData.usuarioId || "");
        setFecha(parseFechaSegura(initialData.fecha));
        setEstado(initialData.estado || "Pendiente");
        setObservaciones(initialData.observaciones || "");
        setGestorAsignado(initialData.gestorAsignado || "");
      } else {
        setUsuarioId("");
        setFecha("");
        setEstado("Pendiente");
        setObservaciones("");
        setGestorAsignado("");
      }
      setIsSubmitting(false);
    }
  }, [isOpen, initialData, parseFechaSegura]);

  // 🔹 Cargar gestores y usuarios
  useEffect(() => {
    const fetchLists = async () => {
      const user = auth.currentUser;
      if (!user) {
        setLoadingGestores(false);
        setLoadingUsuarios(false);
        return;
      }
      const token = await user.getIdToken();

      // Gestores (usuariosWeb)
      try {
        logApiCall("GET", API_ENDPOINTS.USUARIOS_WEB);
        const res = await fetch(API_ENDPOINTS.USUARIOS_WEB, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const gestoresFiltrados = data.filter(
            (u) => u.rol === "Gestor Casos"
          );
          setGestores(gestoresFiltrados);
        } else {
          console.error("Error cargando usuariosWeb:", res.status);
        }
      } catch (err) {
        console.error("❌ Error cargando usuariosWeb:", err);
      } finally {
        setLoadingGestores(false);
      }

      // Usuarios vulnerables (UsuarioMovil)
      try {
        logApiCall("GET", API_ENDPOINTS.USUARIOS_MOVIL);
        const res2 = await fetch(API_ENDPOINTS.USUARIOS_MOVIL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res2.ok) {
          const data2 = await res2.json();
          const vulnerables = Array.isArray(data2)
            ? data2.filter((u) => u.esVulnerado === true)
            : [];
          setUsuarios(vulnerables);
        } else {
          console.error("Error cargando UsuarioMovil:", res2.status);
          setUsuarios([]);
        }
      } catch (err) {
        console.error("❌ Error cargando UsuarioMovil:", err);
        setUsuarios([]);
      } finally {
        setLoadingUsuarios(false);
      }
    };

    fetchLists();
  }, []);

  useEffect(() => {
    if (loadingGestores) setShowGestorMenu(false);
  }, [loadingGestores]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".custom-select")) {
        setShowEstadoMenu(false);
        setShowGestorMenu(false);
        setShowUsuarioMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    // El input type="date" devuelve formato YYYY-MM-DD
    // El backend lo procesa considerando zona horaria Chile
    const nuevoCaso = {
      usuarioId,
      fecha: fecha, // YYYY-MM-DD
      estado,
      observaciones,
      gestorAsignado, // ✅ solo el UID del gestor
    };

    console.log("🟢 Enviando al padre (Casos.jsx):", nuevoCaso);
    if (onSave) onSave(nuevoCaso);
  };

  const selectedUsuario = usuarios.find((u) => getUserId(u) === usuarioId);
  const initialUsuarioLabel = initialData
    ? initialData.nombres && initialData.apellidos
      ? `${initialData.nombres} ${initialData.apellidos}`
      : initialData.usuarioNombre ||
        initialData.usuarioId ||
        initialData.uid ||
        null
    : null;

  const usuarioDisplay = selectedUsuario
    ? `${selectedUsuario.nombres} ${selectedUsuario.apellidos}`
    : initialData && loadingUsuarios
    ? "Cargando usuario..."
    : initialUsuarioLabel ||
      usuarioId ||
      (loadingUsuarios ? "Cargando usuarios..." : "Seleccionar Usuario");

  return (
    <div
      className="modal__overlay"
      onMouseDown={(e) =>
        e.target.classList.contains("modal__overlay") && onClose()
      }
    >
      <div className="modal">
        <h2 className="modal__title">
          {initialData ? "Editar Caso" : "Nuevo Caso"}
        </h2>

        <div className="modal__body">
          <form onSubmit={handleSubmit}>
            {/* 🔹 Usuario (vulnerable) */}
            <label>Usuario (vulnerable) *</label>
            <div
              className={`custom-select ${loadingUsuarios ? "loading" : ""}`}
              onClick={() => {
                if (!loadingUsuarios) setShowUsuarioMenu((prev) => !prev);
              }}
              aria-busy={loadingUsuarios}
              role="button"
            >
              <div className="selected-option">{usuarioDisplay}</div>

              {showUsuarioMenu && (
                <div className="options-menu">
                  {loadingUsuarios ? (
                    <div className="option-item loading">Cargando usuarios...</div>
                  ) : usuarios.length === 0 ? (
                    <div className="option-item">No hay usuarios disponibles</div>
                  ) : (
                    usuarios.map((u) => (
                      <div
                        key={u.uid}
                        className="option-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUsuarioId(u.uid);
                          setShowUsuarioMenu(false);
                        }}
                      >
                        {u.nombres} {u.apellidos}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <label>Fecha *</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="input"
            />

            {/* 🔹 Estado */}
            <label>Estado</label>
            <div
              className="custom-select"
              onClick={() => setShowEstadoMenu((prev) => !prev)}
            >
              <div className="selected-option">
                {estado || "Seleccionar estado"}
              </div>
              {showEstadoMenu && (
                <div className="options-menu">
                  {["Pendiente", "En proceso", "Finalizado"].map((opcion) => (
                    <div
                      key={opcion}
                      className="option-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEstado(opcion);
                        setShowEstadoMenu(false);
                      }}
                    >
                      {opcion}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 🔹 Gestor Asignado */}
            <label>Gestor Asignado</label>
            <div
              className={`custom-select ${loadingGestores ? "loading" : ""}`}
              onClick={() => {
                if (!loadingGestores) setShowGestorMenu((prev) => !prev);
              }}
              aria-busy={loadingGestores}
              role="button"
            >
              <div className="selected-option">
                {loadingGestores
                  ? "Cargando gestores..."
                  : gestores.find((g) => g.uid === gestorAsignado)
                  ? `${gestores.find((g) => g.uid === gestorAsignado).nombres} ${
                      gestores.find((g) => g.uid === gestorAsignado).apellidos
                    }`
                  : "Seleccionar Gestor"}
              </div>

              {showGestorMenu && (
                <div className="options-menu">
                  {loadingGestores ? (
                    <div className="option-item loading">Cargando gestores...</div>
                  ) : gestores.length === 0 ? (
                    <div className="option-item">No hay gestores disponibles</div>
                  ) : (
                    gestores.map((g) => (
                      <div
                        key={g.uid}
                        className="option-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGestorAsignado(g.uid); // ✅ solo el UID
                          setShowGestorMenu(false);
                        }}
                      >
                        {g.nombres} {g.apellidos}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <label>Observaciones</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows="3"
              className="input"
            ></textarea>
          </form>
        </div>

        <div className="modal__actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? initialData
                ? "Guardando cambios..."
                : "Guardando..."
              : initialData
              ? "Guardar Cambios"
              : "Guardar Caso"}
          </button>
        </div>
      </div>
    </div>
  );
}

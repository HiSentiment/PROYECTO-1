import { useState, useEffect } from "react";
import { auth } from "../../firebase";
import { API_ENDPOINTS, logApiCall } from "../../api/apiConfig";
import PreguntaModal from "./PreguntaModal";
import { FaEdit, FaTrash } from "react-icons/fa";
import "../users/modal.css";



export default function NewSurveyModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}) {
  const [titulo, setTitulo] = useState("");
  const [areas, setAreas] = useState([]); // IDs seleccionados
  const [areasDisponibles, setAreasDisponibles] = useState([]); // lista desde API
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [activa, setActiva] = useState(true);
  const [preguntas, setPreguntas] = useState([]);

  const [genero, setGenero] = useState("todos"); // 'todos', 'masculino', 'femenino', 'otro'
  const [edadMinima, setEdadMinima] = useState("");
  const [edadMaxima, setEdadMaxima] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreguntaModalOpen, setIsPreguntaModalOpen] = useState(false);
  const [editingPreguntaIndex, setEditingPreguntaIndex] = useState(null);

  const [errors, setErrors] = useState({});

  const formatDateTimeForInput = (value) => {
    if (!value) return "";

    try {
      let d;

      // Firestore Timestamp con método toDate()
      if (typeof value.toDate === "function") {
        d = value.toDate();

      // Firestore Timestamp crudo: {_seconds, _nanoseconds}
      } else if (value._seconds !== undefined) {
        d = new Date(value._seconds * 1000);

      // String o Date nativo
      } else if (typeof value === "string" || value instanceof Date) {
        d = new Date(value);

      } else {
        console.warn("⚠️ Valor inesperado en formatDateTimeForInput:", value);
        return "";
      }

      if (isNaN(d.getTime())) return "";

      const pad = (n) => n.toString().padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
      )}:${pad(d.getMinutes())}`;
    } catch (err) {
      console.error("❌ Error parseando fecha:", value, err);
      return "";
    }
  };


  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("Debes iniciar sesión");

        const token = await user.getIdToken();

        logApiCall("GET", API_ENDPOINTS.AREAS);
        const res = await fetch(
          API_ENDPOINTS.AREAS,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) throw new Error("Error al cargar áreas");

        const data = await res.json();
        console.log("📌 Áreas desde API:", data);
        setAreasDisponibles(data);
      } catch (err) {
        console.error("❌ Error cargando áreas:", err);
      }
    };

    fetchAreas();
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitulo(initialData.titulo || "");
        setAreas(initialData.area || []);
        setFechaInicio(formatDateTimeForInput(initialData.fechaInicio));
        setFechaFin(formatDateTimeForInput(initialData.fechaFin));
        setActiva(initialData.activa ?? true);
        setPreguntas(initialData.preguntas || []);

        // Normalizar género
        if (Array.isArray(initialData.genero)) {
          const generos = initialData.genero.map((g) => g.toLowerCase());
          
          // Define las combinaciones
          const isTodos = generos.includes("masculino") && generos.includes("femenino") && generos.includes("otro");
          const isAmbos = generos.length === 2 && generos.includes("masculino") && generos.includes("femenino");
          const isMasculino = generos.length === 1 && generos.includes("masculino");
          const isFemenino = generos.length === 1 && generos.includes("femenino");
          const isOtro = generos.length === 1 && generos.includes("otro");

          if (isTodos || generos.length === 0) {
            setGenero("todos-opcion"); // Mapea a la opción "Todos"
          } else if (isAmbos) {
            setGenero("ambos");
          } else if (isMasculino) {
            setGenero("masculino");
          } else if (isFemenino) {
            setGenero("femenino");
          } else if (isOtro) {
            setGenero("otro");
          } else {
            // Caso por defecto o inesperado
            setGenero("todos-opcion");
          }
        } else {
          // Si no es un array, se asume el valor por defecto si no existe
          setGenero(initialData.genero || "todos-opcion"); // Usamos "todos-opcion" como fallback
        }

        setEdadMinima(initialData.edadMinima ?? "");
        setEdadMaxima(initialData.edadMaxima ?? "");
      } else {
        // Resetear todo
        setTitulo("");
        setAreas([]);
        setFechaInicio("");
        setFechaFin("");
        setActiva(true);
        setPreguntas([]);
        setGenero("todos");
        setEdadMinima("");
        setEdadMaxima("");
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const toggleArea = (id) => {
    if (areas.includes(id)) {
      setAreas(areas.filter((a) => a !== id));
    } else {
      setAreas([...areas, id]);
    }
  };

  const handleAddPregunta = () => {
    setEditingPreguntaIndex(null);
    setIsPreguntaModalOpen(true);
  };

  const handleEditPregunta = (index) => {
    setEditingPreguntaIndex(index);
    setIsPreguntaModalOpen(true);
  };

  const handleSavePregunta = (pregunta) => {
    if (editingPreguntaIndex !== null) {
      const nuevas = [...preguntas];
      nuevas[editingPreguntaIndex] = pregunta;
      setPreguntas(nuevas);
    } else {
      setPreguntas([...preguntas, pregunta]);
    }
  };

  const eliminarPregunta = (index) => {
    setPreguntas(preguntas.filter((_, i) => i !== index));
  };

 const handleSubmit = async (e) => {
  e.preventDefault();

  const now = formatDateTimeForInput(new Date()); 
  const newErrors = {};

  // --- Validaciones obligatorias ---
  if (!titulo) newErrors.titulo = "El título es obligatorio";
  if (preguntas.length === 0)
    newErrors.preguntas = "Debes ingresar al menos una pregunta";

  if (!fechaInicio) newErrors.fechaInicio = "La fecha de inicio es obligatoria";
  if (!fechaFin) newErrors.fechaFin = "La fecha de término es obligatoria";

  // --- Validación de rango etario ---
  const numEdadMinima = parseInt(edadMinima, 10);
  const numEdadMaxima = parseInt(edadMaxima, 10);
  if (edadMinima && edadMaxima && numEdadMinima > numEdadMaxima) {
    newErrors.rangoEtario = "La edad mínima no puede ser mayor que la máxima.";
  }

  // --- Validación de fechas ---
  if (!initialData) { // Solo al crear, no al editar
    if (fechaInicio && fechaInicio < now) {
      newErrors.fechaInicio = "La fecha de inicio no puede ser anterior a la actual.";
    }
    if (fechaFin && fechaFin < now) {
      newErrors.fechaFin = "La fecha de término no puede ser anterior a la actual.";
    }
  }

  if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
    newErrors.fechaFin = "La fecha de fin no puede ser anterior a la fecha de inicio.";
  }

  setErrors(newErrors);
  if (Object.keys(newErrors).length > 0) return;

  // --- Normalización del género para enviar al backend ---
  let generoParaEnvio = genero;
  if (genero === "todos-opcion") generoParaEnvio = "todos";
  else if (genero === "ambos") generoParaEnvio = "ambos";

  try {
    setIsSubmitting(true);

    const user = auth.currentUser;
    if (!user) throw new Error("Debes iniciar sesión");

    const token = await user.getIdToken();

    const url = initialData
      ? API_ENDPOINTS.ENCUESTA_DETAIL(initialData.id || initialData.encuestaId || initialData._id)
      : API_ENDPOINTS.ENCUESTAS;

    const method = initialData ? "PATCH" : "POST";

    const body = {
      titulo,
      preguntas,
      area: areas,
      ...(fechaInicio && { fechaInicio }),
      ...(fechaFin && { fechaFin }),
      activa: !!activa,
      genero: generoParaEnvio,
      edadMinima: edadMinima ? numEdadMinima : null,
      edadMaxima: edadMaxima ? numEdadMaxima : null,
    };

    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        initialData
          ? `Error al editar encuesta: ${errorText}`
          : `Error al crear encuesta: ${errorText}`
      );
    }

    
    const data = await res.json();
    console.log("✅ Respuesta del servidor:", data);

    
    if (onSave) onSave(data);

 

  
    onClose();

  } catch (err) {
    console.error("❌ Error al guardar encuesta:", err);
    alert(err.message || "Ocurrió un error al guardar la encuesta.");
  } finally {
    setIsSubmitting(false);
  }
};


  return (
    <div
      className="modal__overlay"
      onMouseDown={(e) =>
        e.target.classList.contains("modal__overlay") && onClose()
      }
    >
      <div className="modal">
        <h2 className="modal__title">
          {initialData ? "Editar Encuesta" : "Crear Encuesta"}
        </h2>

        <div className="modal__body">
          <form onSubmit={handleSubmit}>
            <label>Título Encuesta *</label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="input"
              placeholder="Ej: Encuesta de clima laboral"
            />
            {errors.titulo && <p className="error-text">{errors.titulo}</p>}

            {/* Preguntas */}
            <label>Preguntas *</label>
            <div className="preguntas-section">
              {preguntas.map((p, i) => (
                <div key={i} className="pregunta-item">
                  <span>
                    {i + 1}. {p.texto}{" "}
                    <em>
                      ({p.tipo.charAt(0).toUpperCase() + p.tipo.slice(1)})
                    </em>
                  </span>
                  <div className="pregunta-actions">
                    <button
                      type="button"
                      className="icon-btn edit"
                      onClick={() => handleEditPregunta(i)}
                    >
                      <FaEdit />
                    </button>
                    <button
                      type="button"
                      className="icon-btn delete"
                      onClick={() => eliminarPregunta(i)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="btn btn--primary small"
                onClick={handleAddPregunta}
              >
                + Agregar Pregunta
              </button>
            </div>
            {errors.preguntas && (
              <p className="error-text">{errors.preguntas}</p>
            )}

            {/* Áreas dinámicas */}
            <label>Áreas</label>
            <div className="areas-options">
              {areasDisponibles.map((a) => (
                <label key={a.areaId}>
                  <input
                    type="checkbox"
                    checked={areas.includes(a.areaId)}
                    onChange={() => toggleArea(a.areaId)}
                  />{" "}
                  {a.nombreArea}
                </label>
              ))}
            </div>
            {/* Dirección a público específico */}
              <label>Dirigido a Género</label>
              <select
                value={genero}
                onChange={(e) => setGenero(e.target.value)}
                className="input"
              >
                <option value="todos-opcion">Todos</option> {/* <-- Cambiado a 'todos-opcion' */}
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="ambos">Ambos</option> {/* <-- Ahora es 'ambos' */}
                <option value="otro">Otro</option>
              </select>

            <label>Rango Etario (Opcional)</label>
            <div style={{ display: "flex", gap: "10px" }}>
              <input
                type="number"
                placeholder="Edad Mínima"
                value={edadMinima}
                onChange={(e) => setEdadMinima(e.target.value)}
                className="input"
                min="0"
              />
              <input
                type="number"
                placeholder="Edad Máxima"
                value={edadMaxima}
                onChange={(e) => setEdadMaxima(e.target.value)}
                className="input"
                min={edadMinima || "0"}
              />
            </div>
            {errors.rangoEtario && (
              <p className="error-text">{errors.rangoEtario}</p>
            )}

            {/* Fechas */}
            <label>Fecha y hora de inicio</label>
            <input
              type="datetime-local"
              value={fechaInicio}
              min={!initialData ? formatDateTimeForInput(new Date()) : undefined}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="input"
            />
            {errors.fechaInicio && (
              <p className="error-text">{errors.fechaInicio}</p>
            )}

            <label>Fecha y hora de fin</label>
            <input
              type="datetime-local" // 👈 ahora incluye hora también
              value={fechaFin}
              min={fechaInicio || formatDateTimeForInput(new Date())} // evita seleccionar antes del inicio
              onChange={(e) => setFechaFin(e.target.value)}
              className="input"
            />
            {errors.fechaFin && <p className="error-text">{errors.fechaFin}</p>}

            <label>Estado</label>
            <div className="estado-options">
              <label>
                <input
                  type="radio"
                  checked={activa}
                  onChange={() => setActiva(true)}
                />{" "}
                Activa
              </label>
              <label>
                <input
                  type="radio"
                  checked={!activa}
                  onChange={() => setActiva(false)}
                />{" "}
                Inactiva
              </label>
            </div>
          </form>
        </div>

        <div className="modal__actions">
          <button
            className="btn btn--secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
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
              : "Guardar Encuesta"}
          </button>
        </div>
      </div>

      {/* Modal de Pregunta */}
      <PreguntaModal
        isOpen={isPreguntaModalOpen}
        onClose={() => setIsPreguntaModalOpen(false)}
        onSave={handleSavePregunta}
        initialData={
          editingPreguntaIndex !== null ? preguntas[editingPreguntaIndex] : null
        }
      />
    </div>
  );
}

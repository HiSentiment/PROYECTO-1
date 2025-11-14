// src/pages/surveys/PreguntaModal.jsx
import { useState, useEffect } from "react";
import "./encuestas.css";

export default function PreguntaModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}) {
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState("texto");
  const [opciones, setOpciones] = useState([""]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTexto(initialData.texto || "");
        setTipo(initialData.tipo || "texto");
        setOpciones(initialData.opciones || [""]);
      } else {
        setTexto("");
        setTipo("texto");
        setOpciones([""]);
      }
      setIsSubmitting(false);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const agregarOpcion = () => {
    setOpciones([...opciones, ""]);
  };

  const actualizarOpcion = (index, valor) => {
    const nuevas = [...opciones];
    nuevas[index] = valor;
    setOpciones(nuevas);
  };

  const eliminarOpcion = (index) => {
    setOpciones(opciones.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!texto) {
      alert("Debes ingresar el texto de la pregunta");
      return;
    }

    if (tipo === "alternativas" && opciones.length === 0) {
      alert("Debes agregar al menos una opción");
      return;
    }

    setIsSubmitting(true);
    onSave({
      texto,
      tipo,
      opciones: tipo === "alternativas" ? opciones : [],
    });
    onClose();
    setIsSubmitting(false);
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
          {initialData ? "Editar Pregunta" : "Nueva Pregunta"}
        </h2>

        <div className="modal__body">
          <form onSubmit={handleSubmit}>
            {/* Texto de la pregunta */}
            <label>Texto de la Pregunta *</label>
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="pregunta-texto-input"
              placeholder="Ej: ¿Cuál es tu área de trabajo?"
            />

            {/* Tipo */}
            <label>Tipo de Pregunta</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="input"
            >
              <option value="texto">Texto</option>
              <option value="alternativas">Alternativas</option>
            </select>

            {/* Opciones */}
            {tipo === "alternativas" && (
              <div className="opciones-box">
                {opciones.map((op, i) => (
                  <div key={i} className="opcion-wrapper">
                    <input
                      className="input opcion-input"
                      value={op}
                      onChange={(e) => actualizarOpcion(i, e.target.value)}
                      placeholder={`Opción ${i + 1}`}
                    />
                    <button
                      type="button"
                      className="btn-icon-inside"
                      onClick={() => eliminarOpcion(i)}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn btn--secondary small"
                  onClick={agregarOpcion}
                >
                  + Opción
                </button>
              </div>
            )}
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
              ? "Guardando..."
              : initialData
              ? "Guardar Cambios"
              : "Guardar Pregunta"}
          </button>
        </div>
      </div>
    </div>
  );
}

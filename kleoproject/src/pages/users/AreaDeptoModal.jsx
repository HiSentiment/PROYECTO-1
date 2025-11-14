// src/pages/users/AreaDeptoModal.jsx
import { useEffect, useState } from "react";
import "./users.css";

// 1. Mueve 'initialState' aquí, fuera del componente
const initialState = {
  areaId: "",
  nombreArea: "",
  nombreEncargado: "",
  correoEncargado: "",
  descripcion: "",
};

export default function AreaModal({ isOpen, onClose, onSave, initialData }) {
  // 2. 'initialState' ya no se define aquí
  
  const [formData, setFormData] = useState(initialState);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          areaId: initialData.areaId || initialData.id || "",
          nombreArea: initialData.nombreArea || "",
          nombreEncargado: initialData.nombreEncargado || "",
          correoEncargado: initialData.correoEncargado || "",
          descripcion: initialData.descripcion || "",
        });
      } else {
        setFormData(initialState); // 3. Esto ahora usa la constante global
      }
      setError("");
    }
  }, [isOpen, initialData]); // 4. El array de dependencias ahora es correcto

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const { nombreArea, nombreEncargado, correoEncargado } = formData;

    if (!nombreArea.trim()) {
      setError("El nombre del área es obligatorio.");
      return false;
    }
    if (!nombreEncargado.trim()) {
      setError("El nombre del encargado es obligatorio.");
      return false;
    }
    if (!correoEncargado.trim()) {
      setError("El correo del encargado es obligatorio.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correoEncargado)) {
      setError("El formato del correo electrónico no es válido.");
      return false;
    }

    setError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      await onSave?.(formData);
      onClose();
    } catch (err) {
      console.error("❌ Error guardando área:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal__overlay"
      onMouseDown={(e) =>
        e.target.classList.contains("modal__overlay") && onClose()
      }
    >
      <div className="modal" role="dialog" aria-modal="true">
        <button className="modal__close" onClick={onClose}>
          &times;
        </button>
        <h2 className="modal__title">
          {formData.areaId ? "Editar Área" : "Crear Nueva Área"}
        </h2>

        <form className="modal__form" onSubmit={handleSubmit} noValidate>
          <div className="modal__body">
            <div className="form-group">
              <label htmlFor="nombreArea">Nombre del Área</label>
              <input
                id="nombreArea"
                name="nombreArea"
                value={formData.nombreArea}
                onChange={handleChange}
                className="input--teal"
                placeholder="Ej: Recursos Humanos"
              />
            </div>

            <div className="form-group">
              <label htmlFor="nombreEncargado">Nombre del Encargado</label>
              <input
                id="nombreEncargado"
                name="nombreEncargado"
                value={formData.nombreEncargado}
                onChange={handleChange}
                className="input--teal"
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div className="form-group">
              <label htmlFor="correoEncargado">Correo del Encargado</label>
              <input
                id="correoEncargado"
                type="email"
                name="correoEncargado"
                value={formData.correoEncargado}
                onChange={handleChange}
                className="input--teal"
                placeholder="encargado@empresa.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="descripcion">Descripción (Opcional)</label>
              <textarea
                id="descripcion"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                className="input--teal"
                placeholder="Breve descripción de las funciones del área..."
                rows="3"
              />
            </div>

            {error && (
              <div className="bulk__error" style={{ marginTop: 12 }}>
                {error}
              </div>
            )}
          </div>

          <div className="modal__actions">
            <button
              type="submit"
              className="btn btn--primary"
              disabled={loading}
            >
              {loading ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
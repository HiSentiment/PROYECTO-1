"use client"

import { useState, useEffect } from "react"
import "./modal.css" // Reutiliza los mismos estilos del modal anterior
import { auth } from "../../firebase"
import { API_ENDPOINTS, logApiCall } from "../../api/apiConfig"

// --- FUNCIONES DE AYUDA PARA TELÉFONOS ---

// Validación del formato de teléfono (+56 9xxxxxxxx)
const validarTelefono = (telefono) => {
  const trimmed = telefono.trim();
  // Para un campo obligatorio, solo el prefijo no es válido
  if (trimmed === "+56" || trimmed === "+56 ") {
    return false;
  }
  const regex = /^\+56 \d{9}$/;
  return regex.test(trimmed);
};

// Función para manejar el prefijo fijo en los inputs de teléfono
const handlePhoneInputChange = (currentValue) => {
    const prefix = "+56 ";
    if (!currentValue.startsWith(prefix)) return prefix;
    let digits = currentValue.substring(prefix.length).replace(/\D/g, '');
    digits = digits.substring(0, 9);
    return prefix + digits;
};


export default function AddWebUserModal({ isOpen, onClose, onSave }) {
  const getInitialState = () => ({
    nombres: "",
    apellidos: "",
    rut: "",
    telefono: "+56 ", 
    correo: "",
    area: "RRHH", 
    rol: "Admin RRHH",
  });

  const [formData, setFormData] = useState(getInitialState());
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialState());
      setErrors({});
      setGeneralError("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 2. Validación ajustada para incluir el teléfono
  const validateForm = () => {
    const newErrors = {};
    if (!formData.nombres.trim()) newErrors.nombres = "El nombre es requerido";
    if (!formData.apellidos.trim()) newErrors.apellidos = "El apellido es requerido";
    if (!formData.rut.trim()) newErrors.rut = "El RUT es requerido";
    if (!validarTelefono(formData.telefono)) newErrors.telefono = "El teléfono es requerido y debe tener 9 dígitos."; // <-- NUEVA VALIDACIÓN
    if (!formData.rol) newErrors.rol = "El rol es requerido";
    if (!formData.correo.trim()) {
      newErrors.correo = "El correo es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
      newErrors.correo = "Formato de correo inválido";
    }
    return newErrors;
  };

  // 3. Manejador de cambios actualizado para el formato de teléfono
  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    if (name === 'telefono') {
        finalValue = handlePhoneInputChange(value);
    }
    
    setFormData((prev) => ({ ...prev, [name]: finalValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (generalError) setGeneralError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    setIsSubmitting(true);
    setGeneralError("");
    try {
      const token = await auth.currentUser.getIdToken();
      // Mapeamos el campo 'telefono' a 'contacto' para el backend si es necesario
      const dataToSend = {
          ...formData,
          contacto: formData.telefono,
      };

      logApiCall("POST", API_ENDPOINTS.USUARIOS_WEB, dataToSend);
      const response = await fetch(
        API_ENDPOINTS.USUARIOS_WEB,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(dataToSend),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error creando usuario");
      if (onSave) await onSave(formData);
      onClose();
    } catch (error) {
      setGeneralError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal__overlay"
      onMouseDown={(e) => e.target.classList.contains("modal__overlay") && onClose()}
    >
      <div className="modal">
        <h2 className="modal__title">Crear Usuario Web</h2>
        <div className="modal__body">
          <form className="modal__form" onSubmit={handleSubmit}>
            {generalError && (
              <div className="form__error form__error--general">{generalError}</div>
            )}

            {/* --- DATOS PERSONALES --- */}
            <div className="form__row">
              <div className="form__group">
                <label htmlFor="nombres">Nombre Completo *</label>
                <input id="nombres" name="nombres" value={formData.nombres} onChange={handleChange} className={errors.nombres ? "input--error" : ""} />
                {errors.nombres && <span className="form__error">{errors.nombres}</span>}
              </div>
              <div className="form__group">
                <label htmlFor="apellidos">Apellidos *</label>
                <input id="apellidos" name="apellidos" value={formData.apellidos} onChange={handleChange} className={errors.apellidos ? "input--error" : ""} />
                {errors.apellidos && <span className="form__error">{errors.apellidos}</span>}
              </div>
            </div>

            <div className="form__row">
               <div className="form__group">
                <label htmlFor="rut">RUT *</label>
                <input id="rut" name="rut" value={formData.rut} onChange={handleChange} className={errors.rut ? "input--error" : ""} />
                {errors.rut && <span className="form__error">{errors.rut}</span>}
              </div>
               {/* 4. CAMPO DE TELÉFONO AÑADIDO */}
               <div className="form__group">
                <label htmlFor="telefono">Teléfono *</label>
                <input id="telefono" name="telefono" value={formData.telefono} onChange={handleChange} className={errors.telefono ? "input--error" : ""} />
                {errors.telefono && <span className="form__error">{errors.telefono}</span>}
              </div>
            </div>

            <div className="form__row">
              <div className="form__group">
                <label htmlFor="correo">Correo Electrónico *</label>
                <input id="correo" type="email" name="correo" value={formData.correo} onChange={handleChange} className={errors.correo ? "input--error" : ""} />
                {errors.correo && <span className="form__error">{errors.correo}</span>}
              </div>
            </div>

            {/* --- DATOS LABORALES --- */}
            <div className="form__row">
              <div className="form__group">
                <label htmlFor="area">Área *</label>
                <select id="area" name="area" value={formData.area} onChange={handleChange} disabled>
                    <option value="RRHH">Recursos Humanos</option>
                </select>
              </div>
               <div className="form__group">
                <label htmlFor="rol">Rol *</label>
                <select id="rol" name="rol" value={formData.rol} onChange={handleChange} className={errors.rol ? "input--error" : ""}>
                    <option value="Admin RRHH">Admin RRHH</option>
                    <option value="Gestor Casos">Gestor de Casos Vulnerados</option>
                    <option value="Usuario RRHH">Usuario Normal de RRHH</option>
                </select>
                {errors.rol && <span className="form__error">{errors.rol}</span>}
              </div>
            </div>
          </form>
        </div>

        <div className="modal__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
          <button type="submit" className="btn btn--primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar Usuario"}
          </button>
        </div>
        <button className="modal__close" onClick={onClose} aria-label="Cerrar modal">&times;</button>
      </div>
    </div>
  );
}
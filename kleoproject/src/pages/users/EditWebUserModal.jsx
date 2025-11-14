"use client"

import { useEffect, useState } from "react";
import "./modal.css";

// --- FUNCIONES DE AYUDA PARA TELÉFONOS ---

// Validación del formato de teléfono (+56 9xxxxxxxx)
const validarTelefono = (telefono) => {
    const trimmed = String(telefono || "").trim();
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
    if (!String(currentValue).startsWith(prefix)) return prefix;
    let digits = String(currentValue).substring(prefix.length).replace(/\D/g, '');
    digits = digits.substring(0, 9);
    return prefix + digits;
};

export default function EditWebUserModal({ isOpen, onClose, user, onSave }) {
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
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            setFormData({
                nombres: user.nombres || "",
                apellidos: user.apellidos || "",
                rut: user.rut || "",
                // Carga el teléfono del usuario, compatible con campos antiguos ('contacto')
                telefono: handlePhoneInputChange(user.telefono || user.contacto || ""),
                correo: user.correo || "",
                area: user.area || "RRHH",
                rol: user.rol || "Admin RRHH",
            });
            setErrors({});
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const validateForm = () => {
        const newErrors = {};
        if (!formData.nombres.trim()) newErrors.nombres = "El nombre es requerido";
        if (!formData.apellidos.trim()) newErrors.apellidos = "El apellido es requerido";
        if (!formData.rut.trim()) newErrors.rut = "El RUT es requerido";
        if (!validarTelefono(formData.telefono)) newErrors.telefono = "El teléfono es requerido y debe tener 9 dígitos."; // <-- NUEVA VALIDACIÓN
        if (!formData.area) newErrors.area = "El área es requerida";
        if (!formData.rol) newErrors.rol = "El rol es requerido";
        return newErrors;
    };

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
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formErrors = validateForm();
        if (Object.keys(formErrors).length > 0) {
            setErrors(formErrors);
            return;
        }
        setIsSubmitting(true);
        // Mapea el campo 'telefono' a 'contacto' para el backend si es necesario
        const dataToSend = {
            ...formData,
            contacto: formData.telefono
        };
        await onSave({ ...user, ...dataToSend });
        setIsSubmitting(false);
        onClose();
    };

    return (
        <div className="modal__overlay" onMouseDown={(e) => e.target.classList.contains("modal__overlay") && onClose()}>
            <div className="modal" role="dialog" aria-modal="true">
                <button className="modal__close" onClick={onClose}>✖</button>
                <h2 className="modal__title">Editar Usuario Web</h2>
                <form className="modal__form" onSubmit={handleSubmit}>
                    <div className="modal__body">
                        <div className="form__row">
                            <div className="form__group">
                                <label htmlFor="nombres">Nombre *</label>
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
                            <div className="form__group">
                                <label htmlFor="telefono">Teléfono *</label>
                                <input id="telefono" name="telefono" value={formData.telefono} onChange={handleChange} className={errors.telefono ? "input--error" : ""} />
                                {errors.telefono && <span className="form__error">{errors.telefono}</span>}
                            </div>
                        </div>

                        <div className="form__row">
                           <div className="form__group">
                                <label htmlFor="correo">Correo Electrónico (no se puede cambiar)</label>
                                <input id="correo" type="email" name="correo" value={formData.correo} disabled />
                            </div>
                        </div>

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
                    </div>
                    <div className="modal__actions">
                        <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
                            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                        </button>
                        <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
"use client"

import { useEffect, useState } from "react";
import "./modal.css";
import { auth } from "../../firebase";
import { API_ENDPOINTS, logApiCall } from "../../api/apiConfig";

// --- FUNCIONES DE AYUDA PARA TELÉFONOS ---

const validarTelefono = (telefono, esOpcional = false) => {
    const trimmed = String(telefono || "").trim();
    if (trimmed === "+56" || trimmed === "+56 ") {
        return esOpcional;
    }
    const regex = /^\+56 \d{9}$/;
    return regex.test(trimmed);
};

const handlePhoneInputChange = (currentValue) => {
    const prefix = "+56 ";
    const value = String(currentValue || "");
    if (!value.startsWith(prefix)) return prefix;
    let digits = value.substring(prefix.length).replace(/\D/g, '');
    digits = digits.substring(0, 9);
    return prefix + digits;
};


export default function EditUserModal({ isOpen, onClose, user, onSave }) {
    const getInitialState = () => ({
        nombres: "",
        apellidos: "",
        rut: "",
        telefono: "+56 ",
        correo: "",
        genero: "",
        fechaNacimiento: "",
        rol: "UsuarioAppMovil",
        area: "",
        recibeEncuesta: false, 
        esVulnerado: false,
        firmoContratoPrivacidad: false,
        contactosEmergencia: [],
        contactoRRHH: { nombre: "", telefono: "+56 " },
    });

    const [formData, setFormData] = useState(getInitialState());
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [areas, setAreas] = useState([]);
    const [loadingAreas, setLoadingAreas] = useState(false);

    // Función para cargar áreas
    const loadAreas = async () => {
        setLoadingAreas(true);
        try {
            const token = await auth.currentUser.getIdToken();
            logApiCall("GET", API_ENDPOINTS.AREAS);
            const response = await fetch(API_ENDPOINTS.AREAS, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                setAreas(data);
            } else {
                console.error("Error cargando áreas:", data.error);
                setAreas([]);
            }
        } catch (error) {
            console.error("Error cargando áreas:", error);
            setAreas([]);
        } finally {
            setLoadingAreas(false);
        }
    };

    useEffect(() => {
        if (isOpen && user) {
            setFormData({
                nombres: user.nombres || user.nombre || "",
                apellidos: user.apellidos || "",
                rut: user.rut || "",
                telefono: handlePhoneInputChange(user.telefono || user.contacto),
                correo: user.correo || "",
                genero: user.genero || "",
                fechaNacimiento: user.fechaNacimiento || user.nacimiento || "",
                rol: user.rol || user.cargo || "UsuarioAppMovil",
                area: user.area || "",
                recibeEncuesta: user.recibeEncuesta || false,
                esVulnerado: user.esVulnerado || false,
                firmoContratoPrivacidad: user.firmoContratoPrivacidad || false,
                contactosEmergencia: Array.isArray(user.contactosEmergencia) ? user.contactosEmergencia.map(c => ({...c, telefono: handlePhoneInputChange(c.telefono)})) : [],
                contactoRRHH: (user.contactoRRHH && typeof user.contactoRRHH === 'object')
                    ? { nombre: user.contactoRRHH.nombre || "", telefono: handlePhoneInputChange(user.contactoRRHH.telefono) }
                    : { nombre: "", telefono: "+56 " },
            });
            setErrors({});
            loadAreas();
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const validateForm = () => {
        const newErrors = {};
        if (!formData.nombres.trim()) newErrors.nombres = "El nombre es requerido";
        if (!formData.apellidos.trim()) newErrors.apellidos = "El apellido es requerido";
        if (!formData.rut.trim()) newErrors.rut = "El RUT es requerido";
        if (!validarTelefono(formData.telefono, false)) newErrors.telefono = "El teléfono es requerido y debe tener 9 dígitos.";
        // área opcional
        if (!formData.rol) newErrors.rol = "El rol es requerido";

        // Nueva regla de validación de permisos
        if (!formData.recibeEncuesta && !formData.esVulnerado) {
            newErrors.permisos = "Debe seleccionar al menos un permiso (Visualizar Encuestas o Usuario Vulnerado).";
        }
        
        if (formData.esVulnerado && !formData.firmoContratoPrivacidad) {
            newErrors.firmoContratoPrivacidad = "Debe confirmar la firma del contrato.";
        }
        
        const telefonoEmergenciaInvalido = formData.contactosEmergencia.some(
            (contact) => !validarTelefono(contact.telefono, true)
        );
        if (telefonoEmergenciaInvalido) {
            newErrors.contactosEmergencia = "El número debe tener 9 dígitos.";
        }

        if (!validarTelefono(formData.contactoRRHH.telefono, true)) {
            newErrors.contactoRRHH = "El número debe tener 9 dígitos.";
        }
        return newErrors;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const finalValue = type === "checkbox" ? checked : value;
        
        if (errors.permisos && (name === 'recibeEncuesta' || name === 'esVulnerado')) {
            setErrors(prev => ({...prev, permisos: ""}));
        }
        if (errors[name]) {
            setErrors(prev => ({...prev, [name]: ""}));
        }

        setFormData((prev) => ({ ...prev, [name]: finalValue }));
    };

    const handlePhoneChange = (e) => {
        const { name, value } = e.target;
        if (errors[name]) {
             setErrors(prev => ({...prev, [name]: ""}));
        }
        setFormData((prev) => ({ ...prev, [name]: handlePhoneInputChange(value) }));
    };

    const handleVulneradoChange = (e) => {
        const isChecked = e.target.checked;
        if (errors.permisos) {
            setErrors(prev => ({...prev, permisos: ""}));
        }
        
        if (isChecked) {
            const confirmed = window.confirm(
                "ADVERTENCIA: ¿Está seguro de que desea marcar a este usuario como vulnerado?"
            );
            if (confirmed) {
                setFormData((prev) => ({ ...prev, esVulnerado: true }));
            }
        } else {
            setFormData((prev) => ({
                ...prev,
                esVulnerado: false,
                firmoContratoPrivacidad: false,
            }));
        }
    };
    
    const addEmergencyContact = () => {
        if (formData.contactosEmergencia.length < 3) {
            setFormData((prev) => ({
                ...prev,
                contactosEmergencia: [...prev.contactosEmergencia, { id: Date.now(), nombre: "", telefono: "+56 " }],
            }));
        }
    };

    const removeEmergencyContact = (id) => {
        setFormData((prev) => ({
            ...prev,
            contactosEmergencia: prev.contactosEmergencia.filter((contact) => contact.id !== id),
        }));
    };

    const handleEmergencyContactChange = (id, e) => {
        const { name, value } = e.target;
        const updatedValue = name === 'telefono' ? handlePhoneInputChange(value) : value;
        const updatedContacts = formData.contactosEmergencia.map((contact) =>
            contact.id === id ? { ...contact, [name]: updatedValue } : contact
        );
        setFormData((prev) => ({ ...prev, contactosEmergencia: updatedContacts }));
    };

    const handleRRHHChange = (e) => {
        const { name, value } = e.target;
        const updatedValue = name === 'telefono' ? handlePhoneInputChange(value) : value;
        setFormData((prev) => ({
            ...prev,
            contactoRRHH: { ...prev.contactoRRHH, [name]: updatedValue },
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formErrors = validateForm();
        if (Object.keys(formErrors).length > 0) {
            setErrors(formErrors);
            return;
        }
        setIsSubmitting(true);

        try {
            const dataToSend = {
                ...formData,
                contacto: formData.telefono,
                contactosEmergencia: formData.contactosEmergencia.map(c => ({
                    ...c,
                    telefono: String(c.telefono || "").trim() === "+56 " ? "" : c.telefono,
                })),
                contactoRRHH: {
                    ...formData.contactoRRHH,
                    telefono: String(formData.contactoRRHH.telefono || "").trim() === "+56 " ? "" : formData.contactoRRHH.telefono,
                }
            };
            
            await onSave({ ...user, ...dataToSend });
             
            onClose();
        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Hubo un error al guardar los cambios.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal__overlay" onMouseDown={(e) => e.target.classList.contains("modal__overlay") && onClose()}>
            <div className="modal" role="dialog" aria-modal="true">
                <button className="modal__close" onClick={onClose}>✖</button>
                <h2 className="modal__title">Editar Usuario Móvil</h2>
                <div className="modal__body">
                    <form id="edit-user-form" className="modal__form" onSubmit={handleSubmit}>
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
                            <div className="form__group">
                                <label htmlFor="telefono">Teléfono del Usuario *</label>
                                <input id="telefono" name="telefono" value={formData.telefono} onChange={handlePhoneChange} className={errors.telefono ? "input--error" : ""} />
                                {errors.telefono && <span className="form__error">{errors.telefono}</span>}
                            </div>
                        </div>

                        <div className="form__row">
                           <div className="form__group">
                                <label htmlFor="correo">Correo Electrónico (no se puede cambiar)</label>
                                <input id="correo" type="email" name="correo" value={formData.correo} disabled />
                            </div>
                           <div className="form__group">
                                <label htmlFor="fechaNacimiento">Fecha de Nacimiento</label>
                                <input id="fechaNacimiento" type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="form__row">
                            <div className="form__group">
                                <label htmlFor="genero">Género</label>
                                <select id="genero" name="genero" value={formData.genero} onChange={handleChange}>
                                    <option value="">Seleccionar...</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Femenino">Femenino</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div className="form__group">
                                <label htmlFor="area">Área (opcional)</label>
                                <select 
                                    id="area" 
                                    name="area" 
                                    value={formData.area} 
                                    onChange={handleChange} 
                                    className={errors.area ? "input--error" : ""}
                                    disabled={loadingAreas}
                                >
                                    <option value="">
                                        {loadingAreas ? "Cargando áreas..." : "Sin área"}
                                    </option>
                                    {areas.map((area) => (
                                        <option key={area.areaId} value={area.areaId}>
                                            {area.nombreArea}
                                        </option>
                                    ))}
                                </select>
                                {errors.area && <span className="form__error">{errors.area}</span>}
                            </div>
                        </div>
                        
                         <div className="form__group">
                            <label htmlFor="rol">Rol *</label>
                            <select id="rol" name="rol" value={formData.rol} onChange={handleChange} className={errors.rol ? "input--error" : ""}>
                                <option value="Gerente">Gerente</option>
                                <option value="Sub Gerente">Sub Gerente</option>
                                <option value="Encargado">Encargado</option>
                                <option value="Normal">Normal</option>
                            </select>
                            {errors.rol && <span className="form__error">{errors.rol}</span>}
                        </div>

                        <div className="form__section">
                            <h4>Permisos del Usuario *</h4>
                            <div className="form__group form__group--checkbox">
                                <input id="recibeEncuesta" type="checkbox" name="recibeEncuesta" checked={formData.recibeEncuesta} onChange={handleChange} />
                                <label htmlFor="recibeEncuesta">Puede visualizar encuestas</label>
                            </div>
                            <div className="form__group form__group--checkbox">
                                <input id="esVulnerado" type="checkbox" name="esVulnerado" checked={formData.esVulnerado} onChange={handleVulneradoChange} />
                                <label htmlFor="esVulnerado">Marcar como usuario vulnerado</label>
                            </div>
                            {formData.esVulnerado && (
                                <div className="form__group form__group--checkbox" style={{ paddingLeft: '20px' }}>
                                    <input id="firmoContratoPrivacidad" type="checkbox" name="firmoContratoPrivacidad" checked={formData.firmoContratoPrivacidad} onChange={handleChange} className={errors.firmoContratoPrivacidad ? "input--error" : ""}/>
                                    <label htmlFor="firmoContratoPrivacidad">Firmó Contrato de Privacidad *</label>
                                </div>
                            )}
                            {errors.permisos && <span className="form__error">{errors.permisos}</span>}
                            {errors.firmoContratoPrivacidad && <span className="form__error" style={{paddingLeft: '20px'}}>{errors.firmoContratoPrivacidad}</span>}
                        </div>

                        <div className="form__section">
                            <h4>Contactos de Emergencia (Máx. 3)</h4>
                            {formData.contactosEmergencia.map((contact) => (
                                <div key={contact.id} className="form__row form__row--dynamic">
                                    <input name="nombre" placeholder="Nombre" value={contact.nombre} onChange={(e) => handleEmergencyContactChange(contact.id, e)} />
                                    <input name="telefono" value={contact.telefono} onChange={(e) => handleEmergencyContactChange(contact.id, e)} className={errors.contactosEmergencia ? "input--error" : ""} />
                                    <button type="button" className="btn-remove" onClick={() => removeEmergencyContact(contact.id)}>&times;</button>
                                </div>
                            ))}
                            {formData.contactosEmergencia.length < 3 && (
                                <button type="button" className="btn-add" onClick={addEmergencyContact}>+ Agregar Contacto</button>
                            )}
                             {errors.contactosEmergencia && <span className="form__error">{errors.contactosEmergencia}</span>}
                        </div>
                        
                        <div className="form__group">
                            <label>Contacto Encargado RRHH (Opcional)</label>
                            <div className="form__row">
                                <div className="form__group">
                                    <input name="nombre" value={formData.contactoRRHH.nombre} onChange={handleRRHHChange} placeholder="Nombre"/>
                                </div>
                                <div className="form__group">
                                    <input name="telefono" value={formData.contactoRRHH.telefono} onChange={handleRRHHChange} className={errors.contactoRRHH ? "input--error" : ""} />
                                </div>
                            </div>
                            {errors.contactoRRHH && <span className="form__error">{errors.contactoRRHH}</span>}
                        </div>
                    </form>
                </div>
                <div className="modal__actions">
                    <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
                    <button type="submit" form="edit-user-form" className="btn btn--primary" disabled={isSubmitting}>
                        {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                    </button>
                </div>
            </div>
        </div>
    );
}
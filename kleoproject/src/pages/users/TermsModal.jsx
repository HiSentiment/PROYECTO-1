"use client"

import { useState, useEffect } from "react";
import "./modal.css";
// 1. --- Importar lo necesario de Firebase ---
import { db } from "../../firebase"; // (Ajusta esta ruta si tu archivo firebase.js está en otro lugar)
import { doc, getDoc, setDoc } from "firebase/firestore";

// 2. --- Quitamos onSave e initialData de las props ---
export default function TermsModal({ isOpen, onClose }) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [activo, setActivo] = useState(true); // 3. --- Añadimos el estado para "activo" ---
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // Para mostrar "Cargando..."

    // 4. --- useEffect modificado para LEER desde Firestore ---
    useEffect(() => {
        if (isOpen) {
            const fetchTerms = async () => {
                setIsLoading(true);
                try {
                    // Apuntamos al documento correcto
                    const docRef = doc(db, "TerminosCondiciones", "actual2");
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        // Si el documento existe, cargamos sus datos
                        const data = docSnap.data();
                        setTitle(data.titulo || "Términos y Condiciones");
                        setContent(data.contenido || "");
                        // Aseguramos que 'activo' sea un booleano, con 'true' como defecto
                        setActivo(data.activo === undefined ? true : data.activo);
                    } else {
                        // Si no existe, usamos los valores por defecto que diste
                        setTitle("Términos y Condiciones");
                        setContent("Escribe el contenido aquí...");
                        setActivo(true);
                    }
                } catch (error) {
                    console.error("Error al cargar términos: ", error);
                    alert("No se pudieron cargar los términos.");
                } finally {
                    setIsLoading(false);
                }
            };

            fetchTerms();
        }
    }, [isOpen]); // Se ejecuta cada vez que se abre el modal

    if (!isOpen) return null;

    // 5. --- handleSubmit modificado para GUARDAR en Firestore ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Apuntamos al documento correcto
            const docRef = doc(db, "TerminosCondiciones", "actual2");
            
            // Creamos el objeto con los datos a guardar
            const dataToSave = {
                titulo: title,
                contenido: content,
                activo: activo
            };
            
            // Usamos setDoc con merge:true para crear o actualizar el documento
            await setDoc(docRef, dataToSave, { merge: true });
            
            onClose(); // Cerrar modal al guardar
        } catch (error) {
            console.error("Error guardando términos:", error);
            alert("No se pudieron guardar los cambios.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal__overlay" onMouseDown={(e) => e.target.classList.contains("modal__overlay") && onClose()}>
            <div className="modal" style={{ maxWidth: '800px' }}>
                <h2 className="modal__title">Configurar Términos y Condiciones</h2>
                <div className="modal__body">
                    {/* 6. --- Añadimos un estado de Carga --- */}
                    {isLoading ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>
                    ) : (
                        <form id="terms-form" className="modal__form" onSubmit={handleSubmit}>
                            <div className="form__group">
                                <label htmlFor="termsTitle">Título del Documento</label>
                                <input
                                    id="termsTitle"
                                    name="termsTitle"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Ej: Términos de Servicio"
                                />
                            </div>
                            <div className="form__group">
                                <label htmlFor="termsContent">Contenido de los Términos</label>
                                <textarea
                                    id="termsContent"
                                    name="termsContent"
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    rows={15}
                                    placeholder="Escribe aquí el contenido..."
                                />
                            </div>
                            {/* 7. --- Añadimos el Checkbox para "activo" --- */}
                            <div className="form__group form__group--checkbox" style={{marginTop: '15px'}}>
                                <input
                                    type="checkbox"
                                    id="termsActive"
                                    name="termsActive"
                                    checked={activo}
                                    onChange={(e) => setActivo(e.target.checked)}
                                />
                                <label htmlFor="termsActive" style={{ marginLeft: '10px' }}>
                                    Hacer que estos términos sean los activos
                                </label>
                            </div>
                        </form>
                    )}
                </div>
                <div className="modal__actions">
                    <button type="button" className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>
                        Cancelar
                    </button>
                    <button type="submit" form="terms-form" className="btn btn--primary" disabled={isSubmitting || isLoading}>
                        {isSubmitting ? "Guardando..." : "Guardar Términos"}
                    </button>
                </div>
            </div>
        </div>
    );
}
"use client"

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { FaEdit, FaTrash, FaFilePdf } from "react-icons/fa"
import { auth } from "../../firebase"
import { API_ENDPOINTS, logApiCall } from "../../api/apiConfig"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import "./casos.css"

export default function CaseDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [caso, setCaso] = useState(null)
  const [usuario, setUsuario] = useState(null)
  const [protocolos, setProtocolos] = useState([])
  const [selectedProtocolo, setSelectedProtocolo] = useState(null)
  const [observaciones, setObservaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [addingObs, setAddingObs] = useState(false)
  const [editingObs, setEditingObs] = useState(null)
  const [textoObs, setTextoObs] = useState("")

  const parseFechaSegura = (value) => {
    if (!value) return "—";
    try {
      // Si la fecha viene como string YYYY-MM-DD, convertir directamente
      if (typeof value === "string") {
        const partes = value.split("-");
        if (partes.length === 3 && partes[0].length === 4) {
          // Es YYYY-MM-DD
          return `${partes[2]}-${partes[1]}-${partes[0]}`; // DD-MM-YYYY
        }
      }

      // Si viene como timestamp Firestore
      let d;
      if (typeof value.toDate === "function") {
        d = value.toDate();
      } else if (value.seconds !== undefined) {
        d = new Date(value.seconds * 1000);
      } else if (value._seconds !== undefined) {
        d = new Date(value._seconds * 1000);
      } else if (value instanceof Date) {
        d = value;
      } else {
        return "—";
      }

      if (isNaN(d.getTime())) return "—";

      // Formatear con zona horaria Chile (DD-MM-YYYY)
      const dia = String(d.getDate()).padStart(2, "0");
      const mes = String(d.getMonth() + 1).padStart(2, "0");
      const anio = d.getFullYear();
      return `${dia}-${mes}-${anio}`;
    } catch {
      return "—";
    }
  };

  // 🧱 Verificar rol
  useEffect(() => {
    const verificarRol = async () => {
      try {
        const user = auth.currentUser
        if (!user) {
          navigate("/login")
          return
        }

        const token = await user.getIdToken()
        logApiCall("GET", API_ENDPOINTS.USUARIOS_WEB_BASIC)
        const resUsuariosWeb = await fetch(API_ENDPOINTS.USUARIOS_WEB_BASIC, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!resUsuariosWeb.ok) {
          navigate("/casos")
          return
        }

        const dataUsuarios = await resUsuariosWeb.json()
        const usuarioActual = dataUsuarios.find((u) => u.id === user.uid)
        const rolActual = usuarioActual?.rol || "Desconocido"

        if (rolActual !== "Gestor Casos") {
          alert("No tienes permiso para acceder al detalle de casos.")
          navigate("/casos")
          return
        }
      } catch (err) {
        console.error("❌ Error verificando rol:", err)
        navigate("/casos")
      }
    }

    verificarRol()
  }, [navigate])

  // 🔹 Cargar datos del caso (Limpio y con Apellido)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const user = auth.currentUser
        if (!user) throw new Error("Debes iniciar sesión")
        const token = await user.getIdToken()

        // --- 1. Obtener el Caso Principal PRIMERO ---
        // Necesitamos el caso para saber qué 'usuarioId' buscar.
        logApiCall("GET", API_ENDPOINTS.ABUSO_DETAIL(id))
        const resCaso = await fetch(API_ENDPOINTS.ABUSO_DETAIL(id), {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!resCaso.ok) throw new Error("Error al obtener detalles del caso")
        const dataCaso = await resCaso.json() // 'let' para poder modificarlo

        // --- 🔒 VALIDACIÓN: Solo Gestor Casos puede ver detalles ---
        // Obtener rol del usuario actual
        logApiCall("GET", API_ENDPOINTS.USUARIOS_WEB_BASIC)
        const resUsuariosWebCheck = await fetch(API_ENDPOINTS.USUARIOS_WEB_BASIC, {
          headers: { Authorization: `Bearer ${token}` },
        })
        
        if (resUsuariosWebCheck.ok) {
          const dataUsuarios = await resUsuariosWebCheck.json()
          const usuarioActual = dataUsuarios.find((u) => u.id === user.uid)
          const rolActual = usuarioActual?.rol || "Desconocido"
          
          // Solo Gestor Casos puede ver detalles
          if (rolActual !== "Gestor Casos") {
            alert("Solo los Gestores de Casos pueden ver los detalles de un caso.")
            navigate("/casos")
            return
          }
          
          // Verificar que el caso le pertenece
          if (dataCaso.gestorAsignado !== user.uid) {
            alert("No tienes permiso para ver este caso. Solo puedes ver los casos asignados a ti.")
            navigate("/casos")
            return
          }
        }
        // --- FIN VALIDACIÓN ---

        // --- 2. Obtener el usuarioId del caso ---
        const usuarioDelCasoId = dataCaso.usuarioId
        if (!usuarioDelCasoId) {
          // Si el caso no tiene usuario, no podemos buscar protocolos.
          console.warn("Este caso no tiene un usuarioId asociado.")
          setLoading(false)
          // Establecemos el caso y terminamos
          setCaso(dataCaso)
          return
        }

        // --- 3. Ejecutar el resto de las peticiones en paralelo ---
        // Ahora que tenemos el 'usuarioDelCasoId', podemos buscar todo lo demás.
        logApiCall("GET", API_ENDPOINTS.USUARIOS_MOVIL)
        logApiCall("GET", API_ENDPOINTS.USUARIOS_WEB_BASIC)
        logApiCall("GET", API_ENDPOINTS.OBSERVACIONES(id))
        logApiCall("GET", API_ENDPOINTS.PROTOCOLOS(usuarioDelCasoId))
        const [
          resUsuariosMovil,
          resGestores,
          resObs,
          resProtocolos, // <-- NUEVA PETICIÓN
        ] = await Promise.all([
          fetch(API_ENDPOINTS.USUARIOS_MOVIL, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(API_ENDPOINTS.USUARIOS_WEB_BASIC, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(API_ENDPOINTS.OBSERVACIONES(id), { headers: { Authorization: `Bearer ${token}` } }),

          // <-- NUEVA PETICIÓN: Busca protocolos por usuarioId
          // Asumimos que tu API soporta este filtro (ej: /protocolos?usuarioId=USER_ID)
          fetch(API_ENDPOINTS.PROTOCOLOS(usuarioDelCasoId), {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        // --- 4. Procesar Gestores y Usuarios (como antes) ---

        // Gestor
        let gestorNombre = "--"
        if (dataCaso.gestorAsignado && resGestores.ok) {
          const dataGestores = await resGestores.json()
          const gestorData = dataGestores.find(
            (g) => g.uid === dataCaso.gestorAsignado || g.id === dataCaso.gestorAsignado,
          )
          if (gestorData && gestorData.nombres) {
            gestorNombre = gestorData.nombres
            if (gestorData.apellidos) {
              gestorNombre += ` ${gestorData.apellidos}`
            }
          }
        }

        // Usuario Móvil
        if (resUsuariosMovil.ok) {
          const dataUsuarios = await resUsuariosMovil.json()
          const u = dataUsuarios.find((us) => us.uid === dataCaso.usuarioId || us.id === dataCaso.usuarioId)
          setUsuario(u || null)
        } else {
          setUsuario(null)
        }

        // Observaciones
        const dataObs = resObs.ok ? await resObs.json() : []
        setObservaciones(Array.isArray(dataObs) ? dataObs : [])

        // --- 5. Lógica NUEVA: Sincronizar Protocolos ---

        // Obtenemos los protocolos encontrados para ese usuario
        const protocolosDelUsuario = resProtocolos.ok ? await resProtocolos.json() : []
        const idsProtocolosDelUsuario = Array.isArray(protocolosDelUsuario)
          ? protocolosDelUsuario.map((p) => p.protocoloId).sort()
          : []

        // Obtenemos los protocolos que el caso YA TENÍA registrados
        const idsProtocolosEnCaso = Array.isArray(dataCaso.protocolosAsociados)
          ? dataCaso.protocolosAsociados.sort()
          : []

        // Comprobar si son diferentes (convirtiéndolos a JSON para una comparación simple)
        const necesitaActualizacion = JSON.stringify(idsProtocolosDelUsuario) !== JSON.stringify(idsProtocolosEnCaso)

        if (necesitaActualizacion) {
          console.log("Sincronizando protocolos: Se encontraron nuevos protocolos para este usuario.")
          // Actualizar en Firestore
          logApiCall("PATCH", API_ENDPOINTS.ABUSO_DETAIL(id))
          await fetch(API_ENDPOINTS.ABUSO_DETAIL(id), {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ protocolosAsociados: idsProtocolosDelUsuario }),
          })
          // Actualizar la data local para que el resto del componente la use
          dataCaso.protocolosAsociados = idsProtocolosDelUsuario
        }

        // --- 6. Establecer estados (Lógica modificada) ---

        // Establecer el caso (ahora sincronizado)
        setCaso({
          ...dataCaso,
          gestorAsignadoNombre: gestorNombre,
        })

        // Establecer los protocolos (ya los tenemos, no hay que volver a buscarlos 1 por 1)
        setProtocolos(protocolosDelUsuario) // Usamos los protocolos completos que ya buscamos
        if (protocolosDelUsuario.length > 0) {
          setSelectedProtocolo(protocolosDelUsuario[0]) // Seleccionamos el primero
        }
      } catch (err) {
        console.error("❌ Error cargando detalle:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, navigate]) // Dejé 'id' y 'navigate' como dependencias

  // ✏️ Editar observación
  const handleEditObservation = (obs) => {
    setEditingObs(obs.observacionId)
    setTextoObs(obs.texto)
  }

  // 🗑️ Eliminar observación
  const handleDeleteObservation = async (obsId) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta observación?")) return

    try {
      const user = auth.currentUser
      if (!user) throw new Error("Usuario no autenticado")
      if (user.uid !== caso.gestorAsignado) {
        window.alert("Solo el gestor puede crear/editar/eliminar observaciones")
        return
      }

      const token = await user.getIdToken()
      logApiCall("DELETE", API_ENDPOINTS.OBSERVACION_DETAIL(obsId))
      const res = await fetch(API_ENDPOINTS.OBSERVACION_DETAIL(obsId), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error("Error al eliminar observación")
      setObservaciones((prev) => prev.filter((o) => o.observacionId !== obsId))
    } catch (err) {
      console.error("❌ Error eliminando observación:", err)
      alert("No se pudo eliminar la observación")
    }
  }

  // 📄 Generar PDF (Versión Detallada)
  const handleExportPDF = () => {
    const val = (data) => data || "—"
    const doc = new jsPDF()
    let startY = 22

    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("Informe Detallado de Caso", 14, 15)
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")

    // --- 1. Resumen del Caso ---
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("1. Resumen del Caso", 14, (startY += 5))
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    autoTable(doc, {
      startY: (startY += 3),
      theme: "striped",
      head: [["Campo", "Valor"]],
      body: [
        ["ID del Caso", val(caso.abusoId)],
        ["Estado", val(caso.estado)],
        ["Gestor Asignado", val(caso.gestorAsignadoNombre)],
        ["Fecha del Evento", parseFechaSegura(caso.fecha)],
        ["Fecha de Registro", parseFechaSegura(caso.creadoEn)],
        ["Última Actualización", parseFechaSegura(caso.actualizadoEn)],
        ["Observaciones Iniciales", val(caso.observaciones)],
      ],
      headStyles: { fillColor: [41, 128, 185] },
    })
    startY = doc.lastAutoTable.finalY

    // --- 2. Información del Usuario ---
    if (usuario) {
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("2. Información del Usuario Afectado", 14, (startY += 10))
      doc.setFontSize(12)
      doc.setFont("helvetica", "normal")
      autoTable(doc, {
        startY: (startY += 4),
        theme: "striped",
        head: [["Campo", "Valor"]],
        body: [
          ["Nombre Completo", `${val(usuario.nombres)} ${val(usuario.apellidos)}`],
          ["RUT", val(usuario.rut)],
          ["Correo Electrónico", val(usuario.correo)],
          ["Teléfono", val(usuario.contacto)],
          ["Fecha de Nacimiento", val(usuario.fechaNacimiento)],
          ["Género", val(usuario.genero)],
          ["Cargo (Rol)", val(usuario.rol)],
        ],
        headStyles: { fillColor: [41, 128, 185] },
      })
      startY = doc.lastAutoTable.finalY

      // --- 3. Contactos de Emergencia ---
      if (usuario.contactosEmergencia && usuario.contactosEmergencia.length > 0) {
        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.text("3. Contactos de Emergencia (Usuario)", 14, (startY += 10))
        doc.setFontSize(12)
        doc.setFont("helvetica", "normal")
        autoTable(doc, {
          startY: (startY += 3),
          theme: "grid",
          head: [["Nombre", "Teléfono", "Favorito"]],
          body: usuario.contactosEmergencia.map((c) => [
            val(c.nombre),
            val(c.numero || c.telefono),
            c.favorito ? "Sí" : "No",
          ]),
          headStyles: { fillColor: [80, 80, 80] },
        })
        startY = doc.lastAutoTable.finalY
      }
    }

    // --- 4. Bitácora de Observaciones ---
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("4. Bitácora de Observaciones del Gestor", 14, (startY += 10))
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    autoTable(doc, {
      startY: (startY += 3),
      theme: "grid",
      head: [["Fecha", "Autor", "Observación"]],
      body:
        observaciones.length > 0
          ? observaciones.map((o) => {
              const autor = o.gestorId === caso.gestorAsignado ? val(caso.gestorAsignadoNombre) : val(o.gestorId)
              return [parseFechaSegura(o.fecha), autor, val(o.texto)]
            })
          : [["No hay observaciones registradas", "—", "—"]],
      headStyles: { fillColor: [80, 80, 80] },
      columnStyles: { 2: { cellWidth: 100 } },
    })
    startY = doc.lastAutoTable.finalY

    // --- 5. Protocolos de Activación (CON TRANSCRIPCIÓN) ---
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("5. Protocolos de Activación Asociados", 14, (startY += 10))
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")

    // 👇 --- INICIO DE LA MODIFICACIÓN --- 👇
    // Preparamos el 'body' de la tabla con filas anidadas
    const protocolBody =
      protocolos.length > 0
        ? protocolos.flatMap((p) => [ // Usamos flatMap para crear un array de filas
            // Fila 1: Datos principales del protocolo
            [
              val(p.protocoloId).substring(0, 15) + "...",
              parseFechaSegura(p.timestampActivacion),
              val(p.metodoActivacion),
              p.latitud ? `${p.latitud.toFixed(6)}, ${p.longitud.toFixed(6)}` : "—",
            ],
            // Fila 2: Transcripción (ocupa las 4 columnas)
            [
              {
                content: `Transcripción: ${val(p.analisisIA?.transcript || "No disponible")}`,
                colSpan: 4, // Ocupa todo el ancho de la tabla
                styles: {
                  fillColor: [248, 248, 248], // Un fondo gris claro
                  textColor: [50, 50, 50],
                  fontStyle: 'normal',
                  fontSize: 9,
                },
              },
            ],
          ])
        : [["No hay protocolos asociados", "—", "—", "—"]] // Fila por defecto si no hay protocolos

    autoTable(doc, {
      startY: (startY += 3),
      theme: "grid",
      head: [["ID Protocolo (corto)", "Fecha Activación", "Método", "Ubicación (Lat, Lng)"]],
      body: protocolBody, // Usamos el 'body' que acabamos de crear
      headStyles: { fillColor: [80, 80, 80] },
    })
    // 👆 --- FIN DE LA MODIFICACIÓN --- 👆

    // 7. Guardar el PDF
    doc.save(`Informe_Caso_${val(caso.abusoId)}.pdf`)
  }

  if (loading)
    return (
      <div className="casos-container">
        <p>Cargando detalles del caso...</p>
      </div>
    )

  if (error)
    return (
      <div className="casos-container">
        <p style={{ color: "red" }}>Error: {error}</p>
        <button onClick={() => navigate("/casos")} className="btn-volver">
          ← Volver
        </button>
      </div>
    )

  if (!caso)
    return (
      <div className="casos-container">
        <p>No se encontró el caso</p>
        <button onClick={() => navigate("/casos")} className="btn-volver">
          ← Volver
        </button>
      </div>
    )

  return (
    <div className="casos-container">
      <div className="casos-header">
        <h1 className="casos-title">Detalles del Caso</h1>
        {caso && (
          <span className={`estado-badge ${caso.estado?.toLowerCase() || "pendiente"}`}>
            {caso.estado || "Pendiente"}
          </span>
        )}
      </div>

      {/* === 🟦 PRIMERA FILA: Detalles + Observaciones === */}
      <div className="casos-row">
        <div className="detalles-card">
          <button id="btn-volver-casos" onClick={() => navigate("/casos")} className="btn-volver">
            ← Volver a la lista
          </button>

          <div className="detalle-item">
            <strong>ID del caso:</strong> <span>{caso.abusoId}</span>
          </div>
          <div className="detalle-item">
            <strong>Estado:</strong> <span>{caso.estado || "—"}</span>
          </div>
          <div className="detalle-item">
            <strong>Gestor Asignado:</strong> <span>{caso.gestorAsignadoNombre || "—"}</span>
          </div>
          <div className="detalle-item">
            <strong>Usuario:</strong>{" "}
            <span>{usuario ? `${usuario.nombres} ${usuario.apellidos}` : caso.usuarioId || "—"}</span>
          </div>
          <div className="detalle-item">
            <strong>Observaciones iniciales:</strong> <span>{caso.observaciones || "—"}</span>
          </div>
          <div className="detalle-item">
            <strong>Fecha de Creación:</strong> <span>{parseFechaSegura(caso.fecha)}</span>
          </div>
        </div>

        <div className="observaciones-card">
          <h2>Observaciones</h2>
          {observaciones.length === 0 ? (
            <div className="empty-state">
              <p>No hay observaciones registradas.</p>
              <small>Agrega la primera observación abajo</small>
            </div>
          ) : (
            <ul className="obs-list">
              {observaciones.map((o) => (
                <li key={o.observacionId} className="obs-item">
                  <div className="obs-text">
                    <span>{o.texto}</span>
                    <small>{parseFechaSegura(o.fecha)}</small>
                  </div>
                  <div className="obs-actions">
                    <button className="iconBtn iconBtn--edit" title="Editar" onClick={() => handleEditObservation(o)}>
                      <FaEdit />
                    </button>
                    <button
                      className="iconBtn iconBtn--delete"
                      title="Eliminar"
                      onClick={() => handleDeleteObservation(o.observacionId)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="obs-form">
            <textarea
              value={textoObs}
              onChange={(e) => setTextoObs(e.target.value)}
              placeholder={editingObs ? "Editando observación..." : "Escribe una nueva observación..."}
              rows={3}
            />
            <button
              className="btn-guardar"
              disabled={addingObs || !textoObs.trim()}
              onClick={async () => {
                if (!textoObs.trim()) return
                try {
                  const user = auth.currentUser
                  if (!user) throw new Error("Usuario no autenticado")

                  if (user.uid !== caso.gestorAsignado) {
                    alert("Solo el gestor puede modificar observaciones")
                    return
                  }

                  setAddingObs(true)
                  const token = await user.getIdToken()

                  const url = editingObs ? API_ENDPOINTS.OBSERVACION_DETAIL(editingObs) : API_ENDPOINTS.OBSERVACIONES(id)
                  const method = editingObs ? "PATCH" : "POST"
                  const body = editingObs ? { texto: textoObs } : { texto: textoObs, casoId: id, gestorId: user.uid }

                  logApiCall(method, url)

                  const res = await fetch(url, {
                    method,
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(body),
                  })

                  if (res.ok) {
                    setTextoObs("")
                    setEditingObs(null)
                    const updated = await fetch(API_ENDPOINTS.OBSERVACIONES(id), {
                      headers: { Authorization: `Bearer ${token}` },
                    })
                    const data = await updated.json()
                    setObservaciones(Array.isArray(data) ? data : [])
                  }
                } catch (err) {
                  console.error("❌ Error guardando observación:", err)
                } finally {
                  setAddingObs(false)
                }
              }}
            >
              {addingObs ? "Guardando..." : editingObs ? "Guardar cambios" : "Agregar observación"}
            </button>
          </div>
        </div>
      </div>

      {/* === 🟪 SEGUNDA FILA: Protocolos === */}
      <div className="casos-row">
        <div className="protocolos-list">
          <h2>Protocolos Asociados</h2>
          {protocolos.length === 0 ? (
            <div className="empty-state">
              <p>No hay protocolos asociados todavía.</p>
              <small>Los protocolos aparecerán aquí cuando se activen</small>
            </div>
          ) : (
            <table className="casos-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha de Activación</th>
                </tr>
              </thead>
              <tbody>
                {protocolos.map((p) => (
                  <tr
                    key={p.protocoloId}
                    className={selectedProtocolo?.protocoloId === p.protocoloId ? "selected-row" : ""}
                    onClick={() => setSelectedProtocolo(p)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{p.protocoloId}</td>
                    <td>{parseFechaSegura(p.timestampActivacion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="protocolo-detalle">
          <h2>Detalles del Protocolo</h2>
          {selectedProtocolo ? (
            <>
              <div className="detalle-item">
                <strong>ID:</strong> <span>{selectedProtocolo.protocoloId}</span>
              </div>
              <div className="detalle-item">
                <strong>Método de Activación:</strong> <span>{selectedProtocolo.metodoActivacion || "—"}</span>
              </div>
              <div className="detalle-item">
                <strong>Fecha de Activación:</strong>{" "}
                <span>{parseFechaSegura(selectedProtocolo.timestampActivacion)}</span>
              </div>
              <div className="detalle-item">
                <strong>Audio asociado:</strong>{" "}
                {selectedProtocolo.audioUrl ? (
                  <audio controls src={selectedProtocolo.audioUrl} style={{ width: "100%", marginTop: "0.5rem" }} />
                ) : (
                  <span>Sin audio disponible</span>
                )}
              </div>

              <div className="detalle-item">
                <strong>Transcripción:</strong>
                {selectedProtocolo?.analisisIA?.transcript ? (
                  <blockquote className="transcripcion-bloque">{selectedProtocolo.analisisIA.transcript}</blockquote>
                ) : (
                  <span>
                    <small>Transcripción no disponible.</small>
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>Selecciona un protocolo para ver sus detalles.</p>
              <small>Haz clic en cualquier fila de la tabla</small>
            </div>
          )}
        </div>
      </div>

      {/* === 🔴 BOTÓN DE EXPORTACIÓN === */}
      <div className="boton-rojo-container">
        <button className="boton-rojo" onClick={handleExportPDF}>
          <FaFilePdf />
          Descargar Informe PDF
        </button>
      </div>
    </div>
  )
}

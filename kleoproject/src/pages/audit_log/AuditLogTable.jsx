import { useEffect, useState } from "react";
import { auth } from "../../firebase";
import { API_ENDPOINTS, logApiCall } from "../../api/apiConfig";
import { FaEye } from "react-icons/fa";

export default function AuditLogTable({ search }) {
  const [logs, setLogs] = useState([]);
  const [usuariosWeb, setUsuariosWeb] = useState({});
  const [loading, setLoading] = useState(true);
  const [detalleActual, setDetalleActual] = useState(null);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        const token = await user.getIdToken();

        // === Cargar registros de auditoría
        logApiCall("GET", API_ENDPOINTS.AUDITORIA);
        const res = await fetch(
          API_ENDPOINTS.AUDITORIA,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);

        // === Cargar usuarios web
        logApiCall("GET", API_ENDPOINTS.USUARIOS_WEB);
        const resUsuarios = await fetch(
          API_ENDPOINTS.USUARIOS_WEB,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const usuarios = await resUsuarios.json();

        const usuariosDict = {};
        usuarios.forEach(u => {
          usuariosDict[u.uid] = u;
        });
        setUsuariosWeb(usuariosDict);
      } catch {
        setLogs([]);
        setUsuariosWeb({});
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, []);

  // === Conversión de timestamps
  function getTime(log) {
    if (typeof log.timestamp === "string") {
      return new Date(log.timestamp).getTime();
    }
    if (log.timestamp && (log.timestamp._seconds || log.timestamp.seconds)) {
      return (log.timestamp._seconds || log.timestamp.seconds) * 1000;
    }
    return 0;
  }

  // Filtrar logs según búsqueda (usa `search` pasado desde el padre)
  const filteredLogs = logs.filter(log => {
    const usuario = usuariosWeb[log.usuarioUid] || {};
    const nombreCompleto = usuario.nombres
      ? `${usuario.nombres} ${usuario.apellidos}`.toLowerCase()
      : "";
    const rut = (usuario.rut || "").toLowerCase();
    const accion = (log.accion || "").toLowerCase();
    const entidad = (log.entidad || "").toLowerCase();
    const entidadId = (log.entidadId || "").toLowerCase();
    
    const searchLower = (search || "").toLowerCase();
    
    return (
      nombreCompleto.includes(searchLower) ||
      rut.includes(searchLower) ||
      accion.includes(searchLower) ||
      entidad.includes(searchLower) ||
      entidadId.includes(searchLower)
    );
  });

  return (
    <>
      {/* === TABLA === */}
      <table className="casos-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Usuario</th>
            <th>Rut</th>
            <th>Acción</th>
            <th>Entidad</th>
            <th>ID Entidad</th>
            <th>Detalle</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan={7}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                  <div className="loading-spinner"></div>
                </div>
              </td>
            </tr>
          ) : filteredLogs.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: "center" }}>
                {logs.length === 0 ? "Sin registros" : "No se encontraron resultados"}
              </td>
            </tr>
          ) : (
            [...filteredLogs]
              .sort((a, b) => getTime(b) - getTime(a))
              .map(log => {
                const usuario = usuariosWeb[log.usuarioUid] || {};

                return (
                  <tr key={log.id}>
                    <td>
                      {typeof log.timestamp === "string"
                        ? log.timestamp
                        : log.timestamp &&
                          (log.timestamp._seconds || log.timestamp.seconds)
                        ? new Date(
                            (log.timestamp._seconds ||
                              log.timestamp.seconds) * 1000
                          ).toLocaleString()
                        : "-"}
                    </td>

                    <td>
                      {usuario.nombres
                        ? `${usuario.nombres} ${usuario.apellidos}`
                        : "-"}
                    </td>

                    <td>{usuario.rut || "-"}</td>

                    <td>{log.accion}</td>

                    <td>{log.entidad}</td>

                    <td>{log.entidadId}</td>

                    <td>
                      <button
                        className="iconBtn iconBtn--edit"
                        onClick={() => setDetalleActual(log.detalle)}
                        style={{
                          background: "transparent",
                          border: 0,
                          cursor: "pointer",
                        }}
                      >
                        <FaEye style={{ color: "var(--primary)" }} />
                      </button>
                    </td>
                  </tr>
                );
              })
          )}
        </tbody>
      </table>
      {/* === MODAL DETALLE === */}
      {detalleActual && (
        <div className="modal__overlay" onClick={() => setDetalleActual(null)}>
          <div
            className="modal"
            style={{
              maxWidth: 990,
              maxHeight: "90vh",
              overflow: "auto",
              paddingBottom: "3rem",
              position: "relative",
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Detalle de Auditoría</h3>

            <div className="audit-detail-content">
              {renderDetalle(detalleActual)}
            </div>

            <button
              className="btn btn--secondary"
              style={{ position: "absolute", bottom: "1rem", right: "1rem" }}
              onClick={() => setDetalleActual(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function renderDetalle(detalle) {
  if (!detalle) return <div>-</div>;

  // === Cambios antes / después ===
  if (detalle.antes || detalle.despues) {
    const antes = detalle.antes || {};
    const despues = detalle.despues || {};
    const allKeys = Array.from(new Set([...Object.keys(antes), ...Object.keys(despues)]));

    return (
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "4px" }}>Campo</th>
            <th style={{ textAlign: "left", padding: "4px" }}>Antes</th>
            <th style={{ textAlign: "left", padding: "4px" }}>Después</th>
          </tr>
        </thead>
        <tbody>
          {allKeys.map(key => {
            const valorAntes =
              typeof antes[key] === "object"
                ? JSON.stringify(antes[key])
                : String(antes[key] ?? "-");

            const valorDespues =
              typeof despues[key] === "object"
                ? JSON.stringify(despues[key])
                : String(despues[key] ?? "-");

            const cambio = valorAntes !== valorDespues;

            return (
              <tr key={key}>
                <td style={{ padding: "4px", fontWeight: 500 }}>{key}</td>

                <td
                  style={{
                    padding: "4px",
                    color: "#888",
                    background: cambio ? "#fff3cd" : undefined,
                  }}
                >
                  {valorAntes || "-"}
                </td>

                <td
                  style={{
                    padding: "4px",
                    background: cambio ? "#d1e7dd" : undefined,
                  }}
                >
                  {valorDespues}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  // === Registro simple ===
  if (detalle.datos) {
    return (
      <ul style={{ fontSize: 13, paddingLeft: 16 }}>
        {Object.entries(detalle.datos).map(([key, value]) => (
          <li key={key}>
            <strong>{key}:</strong>{" "}
            {typeof value === "object" ? JSON.stringify(value) : String(value)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul style={{ fontSize: 13, paddingLeft: 16 }}>
      {Object.entries(detalle).map(([key, value]) => (
        <li key={key}>
          <strong>{key}:</strong>{" "}
          {typeof value === "object" ? JSON.stringify(value) : String(value)}
        </li>
      ))}
    </ul>
  );
}

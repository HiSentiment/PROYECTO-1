import { useState, useEffect } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { API_ENDPOINTS, logApiCall } from "../../api/apiConfig";
import ModalNewCase from "./ModalNewCase";
import "./casos.css";

export default function Casos() {
  const [abusos, setAbusos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCaso, setEditingCaso] = useState(null);
  const [search, setSearch] = useState("");
  const [rol, setRol] = useState("");
  const navigate = useNavigate();

  const fetchAbusos = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setError("Debes iniciar sesión para ver los casos");
        setLoading(false);
        return;
      }

      const token = await user.getIdToken();

      // 🔹 Obtener el usuario actual (para conocer su rol)
      logApiCall("GET", API_ENDPOINTS.USUARIOS_WEB_BASIC);
      const resUsuariosWeb = await fetch(API_ENDPOINTS.USUARIOS_WEB_BASIC, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resUsuariosWeb.ok)
        throw new Error("Error al cargar usuarios web básicos");

      const dataUsuariosWeb = await resUsuariosWeb.json();
      const usuarioActual = dataUsuariosWeb.find((u) => u.id === user.uid);
      const rolActual = usuarioActual?.rol || "Desconocido";
      setRol(rolActual);

      // 🔸 Cargar todos los casos
      logApiCall("GET", API_ENDPOINTS.ABUSOS);
      const resCasos = await fetch(API_ENDPOINTS.ABUSOS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resCasos.ok) throw new Error("Error al cargar casos");
      const dataCasos = await resCasos.json();

      // 🔸 Cargar usuarios móviles
      logApiCall("GET", API_ENDPOINTS.USUARIOS_MOVIL);
      const resUsuariosMovil = await fetch(API_ENDPOINTS.USUARIOS_MOVIL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resUsuariosMovil.ok)
        throw new Error("Error al cargar usuarios móviles");
      const dataUsuariosMovil = await resUsuariosMovil.json();

      // 🔸 Crear mapas
      const mapaUsuariosMovil = dataUsuariosMovil.reduce((acc, u) => {
        acc[u.uid || u.id] = `${u.nombres || ""} ${u.apellidos || ""}`.trim();
        return acc;
      }, {});
      const mapaUsuariosWeb = dataUsuariosWeb.reduce((acc, u) => {
        acc[u.uid || u.id] = `${u.nombres || ""} ${u.apellidos || ""}`.trim();
        return acc;
      }, {});

      // 🔸 Combinar todo
      let casosEnriquecidos = dataCasos.map((c) => ({
        ...c,
        nombreUsuario:
          mapaUsuariosMovil[c.usuarioId] ||
          "(Usuario desconocido o eliminado)",
        nombreGestor:
          mapaUsuariosWeb[c.gestorAsignado] ||
          "(Gestor no asignado o eliminado)",
      }));

      // 🔒 Filtro por rol
      if (rolActual === "Gestor Casos") {
        casosEnriquecidos = casosEnriquecidos.filter(
          (c) => c.gestorAsignado === user.uid
        );
      } // Admin RRHH y Usuario RRHH ven todo
      setAbusos(casosEnriquecidos);
    } catch (err) {
      console.error("❌ Error cargando abusos:", err);
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbusos();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este caso?")) return;
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Debes iniciar sesión");
      const token = await user.getIdToken();

      logApiCall("DELETE", API_ENDPOINTS.ABUSO_DETAIL(id));
      const res = await fetch(API_ENDPOINTS.ABUSO_DETAIL(id), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Error eliminando caso");
      setAbusos((prev) => prev.filter((a) => a.abusoId !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenModal = async (caso = null) => {
    if (!caso) {
      setEditingCaso(null);
      setIsModalOpen(true);
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Debes iniciar sesión");
      const token = await user.getIdToken();

      const res = await fetch(API_ENDPOINTS.ABUSO_DETAIL(caso.abusoId), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Error al obtener los datos del caso");
      const data = await res.json();
      setEditingCaso(data);
      setIsModalOpen(true);
    } catch (err) {
      console.error("❌ Error al abrir caso:", err);
      alert("No se pudo cargar la información del caso.");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCaso(null);
  };

  const handleSave = async (nuevoCaso) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Debes iniciar sesión");
      const token = await user.getIdToken();

      const method = editingCaso ? "PATCH" : "POST";
      const url = editingCaso
        ? API_ENDPOINTS.ABUSO_DETAIL(editingCaso.abusoId)
        : API_ENDPOINTS.ABUSOS;
      logApiCall(method, url, nuevoCaso);

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(nuevoCaso),
      });

      if (!res.ok) throw new Error("Error guardando caso");
      fetchAbusos();
      handleCloseModal();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredAbusos = abusos.filter(
    (a) =>
      a.estado?.toLowerCase().includes(search.toLowerCase()) ||
      a.gestorAsignado?.toLowerCase().includes(search.toLowerCase()) ||
      a.usuarioId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="casos-container">
      <div className="casos-header">
        <h1 className="casos-title">Gestión de Casos</h1>
      </div>

      <div className="casos-card">
        <form className="casos-controls" onSubmit={(e) => e.preventDefault()}>
          <div className="search-container">
            <input
              type="text"
              placeholder="Buscar por estado, gestor, usuario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>

          {/* 🔹 Solo Admin RRHH y Usuario RRHH pueden crear casos */}
          {(rol === "Admin RRHH" || rol === "Usuario RRHH") && (
            <button
              type="button"
              className="btn-new-survey"
              onClick={() => handleOpenModal()}
            >
              <span>➕</span> Nuevo Caso
            </button>
          )}
        </form>

        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando casos...</p>
          </div>
        )}

        {error && (
          <div className="error-container">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && !error && (
          <div className="casos__tableWrap">
            <table className="casos-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Gestor Asignado</th>
                  <th>Usuario</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAbusos.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "#555" }}>
                      No hay casos registrados
                    </td>
                  </tr>
                ) : (
                  filteredAbusos.map((a) => (
                    <tr key={a.abusoId}>
                      <td>
                        {(() => {
                          try {
                            if (!a.fecha) return "—";
                            if (a.fecha.toDate)
                              return a.fecha.toDate().toLocaleDateString();
                            if (a.fecha.seconds || a.fecha._seconds)
                              return new Date(
                                (a.fecha.seconds || a.fecha._seconds) * 1000
                              ).toLocaleDateString();
                            const d = new Date(a.fecha);
                            return isNaN(d.getTime())
                              ? "—"
                              : d.toLocaleDateString();
                          } catch {
                            return "—";
                          }
                        })()}
                      </td>
                      <td>{a.estado}</td>
                      <td>{a.nombreGestor || "-"}</td>
                      <td>{a.nombreUsuario}</td>
                      <td className="acciones">
                        
                        {/* 🔹 Gestor Casos: solo puede ver el caso (sin editar ni borrar) */}
                        {rol === "Gestor Casos" && (
                          <button onClick={() => navigate(`/casos/${a.abusoId}`)}>
                            Ver
                          </button>
                        )}

                        {/* 🔹 Admin RRHH: puede editar y eliminar */}
                        {rol === "Admin RRHH" && (
                          <>
                            <button onClick={() => handleOpenModal(a)}>
                              <FaEdit />
                            </button>
                            <button onClick={() => handleDelete(a.abusoId)}>
                              <FaTrash />
                            </button>
                          </>
                        )}

                        {/* 🔹 Usuario RRHH: solo eliminar */}
                        {rol === "Usuario RRHH" && (
                          <button onClick={() => handleDelete(a.abusoId)}>
                            <FaTrash />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <ModalNewCase
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          initialData={editingCaso}
        />
      )}
    </div>
  );
}

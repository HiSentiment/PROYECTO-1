import { useState, useEffect } from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { auth } from "../../firebase";
import { API_ENDPOINTS, logApiCall } from "../../api/apiConfig";
import "./encuestas.css";
import NewSurveyModal from "./ModalNewSurvey";

export default function Encuestas() {
  const [search, setSearch] = useState("");

  const [filterArea, setFilterArea] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [filterFechaInicio, setFilterFechaInicio] = useState("");
  const [filterFechaFin, setFilterFechaFin] = useState("");




  const [surveys, setSurveys] = useState([]);
  const [areasDisponibles, setAreasDisponibles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState(null);

  useEffect(() => {
    fetchSurveys();
    fetchAreas();
  }, []);

  const fetchSurveys = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setError("Debes iniciar sesión para ver las encuestas");
        setLoading(false);
        return;
      }

      const token = await user.getIdToken();
      logApiCall("GET", API_ENDPOINTS.ENCUESTAS);
      const res = await fetch(
        API_ENDPOINTS.ENCUESTAS,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error("Error al obtener encuestas");

      const data = await res.json();
      setSurveys(data);
    } catch (err) {
      console.error("❌ Error cargando encuestas:", err);
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  const fetchAreas = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();

      logApiCall("GET", API_ENDPOINTS.AREAS);
      const res = await fetch(
        API_ENDPOINTS.AREAS,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error("Error al obtener áreas");

      const data = await res.json();
      setAreasDisponibles(data);
    } catch (err) {
      console.error("❌ Error cargando áreas:", err);
    }
  };

  const areaMap = areasDisponibles.reduce((acc, a) => {
    acc[a.areaId] = a.nombreArea;
    return acc;
  }, {});

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta encuesta?")) return;
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Debes iniciar sesión");
      const token = await user.getIdToken();

      const res = await fetch(
        API_ENDPOINTS.ENCUESTA_DETAIL(id),
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error("Error al eliminar encuesta");

      setSurveys((prev) => prev.filter((s) => s.encuestaId !== id));
    } catch (err) {
      console.error("❌ Error eliminando encuesta:", err);
      alert(err.message);
    }
  };

  const formatDate = (date) => {
    if (!date) return "—";
    try {
      let d;

      if (typeof date.toDate === "function") {
        d = date.toDate();
      } else if (
        typeof date.seconds === "number" ||
        typeof date._seconds === "number"
      ) {
        d = new Date((date.seconds || date._seconds) * 1000);
      } else {
        d = new Date(date);
      }

      if (isNaN(d.getTime())) return "—";

      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (err) {
      console.error("❌ Error formateando fecha:", date, err);
      return "—";
    }
  };

  // 🧠 Filtro avanzado
  const filtered = surveys.filter((s) => {
    const matchesSearch =
      (s.encuestaId &&
        s.encuestaId.toLowerCase().includes(search.toLowerCase())) ||
      (s.titulo && s.titulo.toLowerCase().includes(search.toLowerCase())) ||
      (Array.isArray(s.area) &&
        s.area.some((a) => a.toLowerCase().includes(search.toLowerCase())));

    const matchesArea =
      !filterArea ||
      (Array.isArray(s.area) && s.area.includes(filterArea));

    const matchesEstado =
      !filterEstado ||
      (filterEstado === "activa" && s.activa) ||
      (filterEstado === "inactiva" && !s.activa);

    const matchesFechaInicio =
      !filterFechaInicio || new Date(s.fechaInicio) >= new Date(filterFechaInicio);
    const matchesFechaFin =
      !filterFechaFin || new Date(s.fechaFin) <= new Date(filterFechaFin);

    return (
      matchesSearch &&
      matchesArea &&
      matchesEstado &&
      matchesFechaInicio &&
      matchesFechaFin
    );
  });

  return (
    <div className="encuestas-container">
      <div className="encuestas-header">
        <h1 className="encuestas-title">Gestión de Encuestas</h1>
      </div>

      <div className="encuestas-card">
        <div className="encuestas-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Buscar por ID o título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>

          {/* 🔹 Filtros adicionales */}
          <div className="filters">
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className={`filter-select ${filterArea ? 'filter-active' : ''}`}
            >
              <option value="">Todas las áreas</option>
              {areasDisponibles.map((a) => (
                <option key={a.areaId} value={a.areaId}>
                  {a.nombreArea}
                </option>
              ))}
            </select>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className={`filter-select ${filterEstado ? 'filter-active' : ''}`}
            >
              <option value="">Todos los estados</option>
              <option value="activa">Activas</option>
              <option value="inactiva">Inactivas</option>
            </select>

            <input
              type="date"
              value={filterFechaInicio}
              onChange={(e) => setFilterFechaInicio(e.target.value)}
              className={`filter-date ${filterFechaInicio ? 'filter-active' : ''}`}
              title="Desde"
            />
            <input
              type="date"
              value={filterFechaFin}
              onChange={(e) => setFilterFechaFin(e.target.value)}
              className={`filter-date ${filterFechaFin ? 'filter-active' : ''}`}
              title="Hasta"
            />
          </div>

          <button
            className="btn-new-survey"
            onClick={() => {
              setEditingSurvey(null);
              setIsModalOpen(true);
            }}
          >
            <span>➕</span> Nueva Encuesta
          </button>
        </div>

        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando encuestas...</p>
          </div>
        )}

        {error && (
          <div className="error-container">
            <strong>Error:</strong> {error}
          </div>
        )}

        {!loading && !error && (
          <div className="table-container">
            <div className="encuestas__tableWrap">
              <table className="encuestas__table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Título</th>
                    <th>Preguntas</th>
                    <th>Áreas</th>
                    <th>Fecha Inicio</th>
                    <th>Fecha Fin</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty">
                        <div className="empty-state">
                          <p>No hay encuestas que coincidan con los filtros</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((s) => (
                      <tr key={s.encuestaId}>
                        <td>
                          <code>{s.encuestaId}</code>
                        </td>
                        <td>
                          <strong>{s.titulo}</strong>
                        </td>
                        <td>
                          {Array.isArray(s.preguntas) && s.preguntas.length > 0 ? (
                            <ol className="questions-list">
                              {s.preguntas.map((p, index) => (
                                <li key={index}>
                                  <strong>{p.texto}</strong> <em>({p.tipo})</em>
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <span style={{ color: "var(--gray-400)" }}>
                              Sin preguntas
                            </span>
                          )}
                        </td>
                        <td>
                          {Array.isArray(s.area) && s.area.length > 0 ? (
                            <ul className="areas-list">
                              {s.area.map((id) => (
                                <li key={id}>{areaMap[id] || id}</li>
                              ))}
                            </ul>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{formatDate(s.fechaInicio)}</td>
                        <td>{formatDate(s.fechaFin)}</td>
                        <td>
                          <span
                            className={`status-badge ${
                              s.activa ? "status-active" : "status-inactive"
                            }`}
                          >
                            {s.activa ? "Activa" : "Inactiva"}
                          </span>
                        </td>
                        <td className="col-actions">
                          <button
                            title="Editar encuesta"
                            className="iconBtn iconBtn--edit"
                            onClick={() => {
                              setEditingSurvey(s);
                              setIsModalOpen(true);
                            }}
                          >
                            <FaEdit />
                          </button>
                          <button
                            title="Eliminar encuesta"
                            className="iconBtn iconBtn--delete"
                            onClick={() => handleDelete(s.encuestaId)}
                          >
                            <FaTrash />
                          </button>
                          
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <NewSurveyModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingSurvey(null);
          }}
          onSave={fetchSurveys}
          initialData={editingSurvey}
        />
      </div>
    </div>
  );
}

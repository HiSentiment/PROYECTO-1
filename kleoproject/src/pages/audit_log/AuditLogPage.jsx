import AuditLogTable from "./AuditLogTable";
import "../cases/casos.css"; // Usamos los mismos estilos visuales que CasosPage
import { useState } from "react";

export default function AuditLogPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="casos-container">
      <div className="casos-header">
        <h1 className="casos-title">Registro de Auditoría</h1>
      </div>

      <div className="casos-card">
        <div className="casos-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Buscar por usuario, rut, acción, entidad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="casos__tableWrap">
          <AuditLogTable search={search} />
        </div>
      </div>
    </div>
  );
}

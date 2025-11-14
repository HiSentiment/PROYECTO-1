import AuditLogTable from "./AuditLogTable";
import "../cases/casos.css"; // Usamos los mismos estilos visuales que CasosPage

export default function AuditLogPage() {
  return (
    <div className="casos-container">
      <div className="casos-header">
        <h1 className="casos-title">Registro de Auditoría</h1>
      </div>

      <div className="casos-card">
        <div className="casos__tableWrap">
          <AuditLogTable />
        </div>
      </div>
    </div>
  );
}

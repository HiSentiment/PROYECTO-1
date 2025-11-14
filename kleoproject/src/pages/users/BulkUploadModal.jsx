"use client";

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import "./modal.css";
import { auth } from "../../firebase";
import { API_ENDPOINTS, logApiCall } from "../../api/apiConfig";

// Encabezados requeridos para usuarios móviles
const REQUIRED_HEADERS = [
  "nombres",
  "apellidos",
  "rut",
  "correo",
  "genero",
  "fechanacimiento",
  "recibeencuesta",
  "contacto",
];

// Encabezados opcionales (hasta 3 contactos de emergencia y RRHH)
const OPTIONAL_HEADERS = [
  "contactoemergencia1nombre",
  "contactoemergencia1telefono",
  "contactoemergencia2nombre",
  "contactoemergencia2telefono",
  "contactoemergencia3nombre",
  "contactoemergencia3telefono",
  "contactorrhhnombre",
  "contactorrhhtelefono",
];

// Una sola fila de ejemplo (la fila 2 del archivo), será ignorada al importar
const TEMPLATE_ROWS = [
  {
    nombres: "Nombre",
    apellidos: "Apellido",
    rut: "12345678-5",
    correo: "correo@ejemplo.com",
    genero: "Masculino",
    fechaNacimiento: "1990-05-12",
    recibeEncuesta: "Si", // Si/No
    contacto: "+56 912345678",
    contactoEmergencia1Nombre: "Nombre Emergencia",
    contactoEmergencia1Telefono: "+56 976543210",
    contactoRRHHNombre: "RRHH NOMBRE",
    contactoRRHHTelefono: "+56 922233344",
  },
];

export default function BulkUploadModal({ isOpen, onClose, onImport }) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const [selectedArea, setSelectedArea] = useState("");
  const [areas, setAreas] = useState([]);
  const [loadingAreas, setLoadingAreas] = useState(true);

  // Cargar áreas desde el backend
  const loadAreas = useCallback(async () => {
    setLoadingAreas(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      logApiCall("GET", API_ENDPOINTS.AREAS);
      const response = await fetch(API_ENDPOINTS.AREAS, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Error al obtener áreas");
      const data = await response.json();
      setAreas(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando áreas:", e);
      setError("No se pudieron cargar las áreas.");
      setAreas([]);
    } finally {
      setLoadingAreas(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadAreas();
      setSelectedArea(""); // Resetear selección al abrir
      setRows([]);
      setError("");
      setFileName("");
    }
  }, [isOpen, loadAreas]);

  // Validar encabezados requeridos
  const validateHeaders = useCallback(() => {
    return (headers) => {
      const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
      if (missing.length) {
        throw new Error(`Faltan columnas requeridas: ${missing.join(", ")}`);
      }
    };
  }, []);

  // Parse CSV, detectar delimitador; ignora fila 1 (header) y fila 2 (ejemplo)
  const parseCSV = useCallback(() => {
    return (text) => {
      const clean = String(text || "").replace(/\r/g, "");
      const lines = clean.split("\n").filter((l) => l.trim().length);
      if (!lines.length) throw new Error("CSV vacío.");

      const firstLineRaw = lines[0].replace(/^\uFEFF/, "");
      const commaCount = (firstLineRaw.match(/,/g) || []).length;
      const semiCount = (firstLineRaw.match(/;/g) || []).length;
      const delim = semiCount > commaCount ? ";" : ",";

      const headersRaw = firstLineRaw.split(delim).map((h) => h.trim());
      const headers = headersRaw.map((h) => h.toLowerCase());

      // Ignorar encabezado (0) y ejemplo (1)
      const bodyLines = lines.slice(2);

      const parsedRows = bodyLines.map((line) => {
        const cols = line.split(delim).map((c) => c.trim());
        const obj = {};
        headers.forEach((h, i) => (obj[h] = cols[i] ?? ""));
        return obj;
      });

      return { headers, rows: parsedRows };
    };
  }, []);

  // Si/No -> boolean
  const boolFrom = useCallback(() => {
    return (v) => {
      const s = String(v || "").trim().toLowerCase();
      return ["1", "true", "sí", "si", "x", "yes", "y", "s"].includes(s);
    };
  }, []);

  // Normalizar teléfono a +56 9xxxxxxxx si hay 9 dígitos
  const normalizePhone = useCallback(() => {
    return (v) => {
      const digits = String(v || "").replace(/\D/g, "").slice(-9);
      return digits ? `+56 ${digits}` : "";
    };
  }, []);

  // Mapear fila CSV al objeto de usuario esperado por el backend
  const mapCsvRowToUser = useCallback(() => {
    return (r) => {
      const lower = {};
      Object.keys(r).forEach((k) => (lower[k.toLowerCase()] = r[k]));

      const contactoEmergencia = [];
      for (let i = 1; i <= 3; i++) {
        const n = lower[`contactoemergencia${i}nombre`] || "";
        const t = lower[`contactoemergencia${i}telefono`] || "";
        if (String(n).trim() || String(t).trim()) {
          contactoEmergencia.push({
            nombre: String(n).trim(),
            telefono: normalizePhone()(t),
          });
        }
      }

      const rrhh = {
        nombre: String(lower["contactorrhhnombre"] || "").trim(),
        telefono: normalizePhone()(lower["contactorrhhtelefono"] || ""),
      };

      return {
        nombres: String(lower["nombres"] || "").trim(),
        apellidos: String(lower["apellidos"] || "").trim(),
        rut: String(lower["rut"] || "").trim(),
        correo: String(lower["correo"] || "").trim(),
        genero: String(lower["genero"] || "").trim(),
        fechaNacimiento: String(lower["fechanacimiento"] || "").trim(), // YYYY-MM-DD
        recibeEncuesta: boolFrom()(lower["recibeencuesta"]), // Si/No
        contacto: normalizePhone()(lower["contacto"] || ""),
        contactosEmergencia: contactoEmergencia,
        contactoRRHH: rrhh,
      };
    };
  }, [normalizePhone, boolFrom]);

  // Cargar archivo
  const handleFile = useCallback(
    (file) => {
      setError("");
      setFileName(file?.name || "");
      setIsLoading(true);

      const ext = (file?.name || "").toLowerCase();
      if (!ext.endsWith(".csv")) {
        setError("❌ Formato no soportado. Sube un archivo .csv");
        setRows([]);
        setIsLoading(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = String(reader.result || "");
          const parsed = parseCSV()(text);
          validateHeaders()(parsed.headers);

          const data = parsed.rows
            .map((r) => mapCsvRowToUser()(r))
            .filter(
              (r) => r.nombres && r.apellidos && r.rut && r.correo && r.contacto
            );

          if (!data.length)
            throw new Error("No se encontraron filas válidas en el archivo.");
          setRows(data);
          setError("");
        } catch (err) {
          setError(`❌ ${err.message || "Error al leer el archivo."}`);
          setRows([]);
        } finally {
          setIsLoading(false);
        }
      };
      reader.onerror = () => {
        setError("❌ No se pudo leer el archivo.");
        setRows([]);
        setIsLoading(false);
      };
      reader.readAsText(file, "utf-8");
    },
    [parseCSV, validateHeaders, mapCsvRowToUser]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      if (!e.dataTransfer.files?.length) return;
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const onBrowseClick = () => inputRef.current?.click();

  // Guardar usuarios
  const handleSave = async () => {
  if (!rows.length) {
    setError("❌ Primero sube un archivo válido.");
    return;
  }
  if (!selectedArea) {
    setError("❌ Selecciona un área para los usuarios.");
    return;
  }
  setIsLoading(true);
  try {
    // Recibe el resultado de la importación
    const result = await onImport(rows, selectedArea);

    // Si hubo errores, muéstralos
    if (result && result.error > 0) {
      const errores = result.results
        .filter(r => r.status === "error")
        .map(r => `• ${r.correo}: ${r.error}`)
        .join("\n");
      alert(
        `Se importaron ${result.ok} usuarios correctamente.\n` +
        `Errores (${result.error}):\n${errores}`
      );
    } else {
      alert(`Se importaron ${result.ok} usuarios correctamente.`);
    }
    onClose();
  } catch (err) {
    setError(`❌ Error al importar: ${err.message}`);
  } finally {
    setIsLoading(false);
  }
};

  // Carga XLSX desde CDN (sin dependencia NPM). Fallback: null.
  const loadXLSX = async () => {
    if (typeof window === "undefined") return null;
    if (window.XLSX) return window.XLSX;
    try {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
        s.async = true;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      return window.XLSX || null;
    } catch {
      return null;
    }
  };

  // Descarga plantilla en Excel con columnas anchas (fallback a CSV si falla)
  const handleDownloadTemplate = async () => {
    // Construye headers y la fila de ejemplo en el orden exacto esperado
    const headers = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];

    const getFromTemplate = (rowObj, ...keys) => {
      for (const k of keys) {
        const v = rowObj[k];
        if (v !== undefined && v !== null) return v;
      }
      return "";
    };

    // Usamos la primera fila de TEMPLATE_ROWS como ejemplo (fila 2 del archivo)
    const sample = TEMPLATE_ROWS[0] || {};
    const requiredRow = [
      getFromTemplate(sample, "nombres"),
      getFromTemplate(sample, "apellidos"),
      getFromTemplate(sample, "rut"),
      getFromTemplate(sample, "correo"),
      getFromTemplate(sample, "genero"),
      getFromTemplate(sample, "fechaNacimiento", "fechanacimiento"),
      getFromTemplate(sample, "recibeEncuesta", "recibeencuesta"), // Si/No
      getFromTemplate(sample, "contacto"),
    ];
    const optionalRow = [
      getFromTemplate(
        sample,
        "contactoEmergencia1Nombre",
        "contactoemergencia1nombre"
      ),
      getFromTemplate(
        sample,
        "contactoEmergencia1Telefono",
        "contactoemergencia1telefono"
      ),
      getFromTemplate(
        sample,
        "contactoEmergencia2Nombre",
        "contactoemergencia2nombre"
      ),
      getFromTemplate(
        sample,
        "contactoEmergencia2Telefono",
        "contactoemergencia2telefono"
      ),
      getFromTemplate(
        sample,
        "contactoEmergencia3Nombre",
        "contactoemergencia3nombre"
      ),
      getFromTemplate(
        sample,
        "contactoEmergencia3Telefono",
        "contactoemergencia3telefono"
      ),
      getFromTemplate(sample, "contactoRRHHNombre", "contactorrhhnombre"),
      getFromTemplate(sample, "contactoRRHHTelefono", "contactorrhhtelefono"),
    ];
    const exampleRow = [...requiredRow, ...optionalRow];

    // Intenta generar XLSX (mejor presentación). Si falla, usa CSV.
    try {
      const XLSX = await loadXLSX();
      if (XLSX) {
        const aoa = [headers, exampleRow];
        const ws = XLSX.utils.aoa_to_sheet(aoa);

        // Ajustar anchos de columna en función del contenido (header / ejemplo)
        const minWch = 14;
        ws["!cols"] = headers.map((h, i) => {
          const hLen = String(h).length;
          const sLen = String(exampleRow[i] ?? "").length;
          const wch = Math.max(minWch, hLen + 2, sLen + 2);
          return { wch };
        });

        // Fijar la primera fila (encabezados)
        ws["!freeze"] = { xSplit: 0, ySplit: 1 };

        // Auto filtro en la fila de encabezados
        ws["!autofilter"] = {
          ref: XLSX.utils.encode_range({
            s: { r: 0, c: 0 },
            e: { r: 0, c: headers.length - 1 },
          }),
        };

        // Crear workbook y descargar
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "UsuariosMovil");

        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([wbout], {
          type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "plantilla_usuarios_movil.xlsx";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
      }
    } catch (e) {
      console.warn("No se pudo generar XLSX, usando CSV. Detalle:", e);
    }

    // Fallback CSV (como antes)
    const DELIM = ";";
    const csvEscape = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return s.includes('"') || s.includes(DELIM) || /\r|\n/.test(s)
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const csvHeader = headers.join(DELIM);
    const csvBody = [exampleRow.map(csvEscape).join(DELIM)].join("\n");
    const csv = `${csvHeader}\n${csvBody}\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_usuarios_movil.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const preview = useMemo(() => rows.slice(0, 5), [rows]);

  if (!isOpen) return null;

  return (
    <div
      className="modal__overlay"
      onMouseDown={(e) =>
        e.target.classList.contains("modal__overlay") && onClose()
      }
    >
      <div className="modal bulk-modal" role="dialog" aria-modal="true">
        <div className="bulk-modal-handle"></div>

        <div className="bulk-modal-header">
          <h2 className="bulk-modal-title">📁 Carga Masiva Usuarios Móvil (CSV)</h2>
          <button className="bulk-modal-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className="bulk-modal-body">
          {/* Selector de área */}
          <div className="form__group">
            <label htmlFor="area">Área para todos los usuarios</label>
            <select
              id="area"
              name="area"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              disabled={loadingAreas}
              className="modal__form select"
            >
              <option value="">
                {loadingAreas ? "Cargando áreas..." : "Seleccionar área"}
              </option>
              {areas.map((area) => (
                <option key={area.areaId} value={area.areaId}>
                  {area.nombreArea}
                </option>
              ))}
            </select>
          </div>

          <div
            className={`bulk-dropzone ${dragOver ? "bulk-dropzone--dragover" : ""} ${isLoading ? "bulk-dropzone--loading" : ""
              }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={onBrowseClick}
            role="button"
            tabIndex={0}
          >
            {isLoading ? (
              <div className="bulk-loading">
                <div className="bulk-spinner"></div>
                <p>Procesando archivo...</p>
              </div>
            ) : (
              <>
                <div className="bulk-upload-icon">📤</div>
                <p className="bulk-upload-title">Arrastra tu archivo CSV aquí</p>
                <p className="bulk-upload-subtitle">o haz clic para seleccionar</p>
                <button type="button" className="bulk-browse-btn">
                  Seleccionar Archivo
                </button>
              </>
            )}

            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="bulk-file-input"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {fileName && (
            <div className="bulk-file-info">
              <span className="bulk-file-icon">📄</span>
              <span className="bulk-file-name">{fileName}</span>
            </div>
          )}

          {error && <div className="bulk-error">{error}</div>}

          {!!rows.length && (
            <div className="bulk-preview">
              <div className="bulk-summary">
                <span className="bulk-summary-icon">✅</span>
                <span className="bulk-summary-text">
                  {rows.length} usuario{rows.length !== 1 ? "s" : ""} listo{rows.length !== 1 ? "s" : ""} para
                  importar
                </span>
              </div>

              <div className="bulk-table-container">
                <table className="bulk-table">
                  <thead>
                    <tr>
                      <th>Nombres</th>
                      <th>Apellidos</th>
                      <th>RUT</th>
                      <th>Correo</th>
                      <th>Contacto</th>
                      <th>Recibe Encuesta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i}>
                        <td>{r.nombres}</td>
                        <td>{r.apellidos}</td>
                        <td>{r.rut}</td>
                        <td>{r.correo}</td>
                        <td>{r.contacto}</td>
                        <td>{r.recibeEncuesta ? "Sí" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {rows.length > preview.length && (
                <div className="bulk-more">
                  ... y {rows.length - preview.length} usuario{rows.length - preview.length !== 1 ? "s" : ""}{" "}
                  más
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bulk-modal-actions">
          <button
            className="bulk-btn bulk-btn--template"
            onClick={handleDownloadTemplate}
            type="button"
          >
            📥 Descargar Plantilla
          </button>
          <button className="bulk-btn bulk-btn--secondary" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="bulk-btn bulk-btn--primary"
            onClick={handleSave}
            disabled={!rows.length || isLoading || loadingAreas || !selectedArea}
            type="button"
          >
            {isLoading ? (
              <>
                <span className="bulk-btn-spinner"></span>
                Importando...
              </>
            ) : (
              <>💾 Importar Usuarios</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
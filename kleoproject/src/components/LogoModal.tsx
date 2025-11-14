import { useState, useEffect } from "react";
import "../pages/users/modal.css"; // tu CSS de modales

export default function LogoModal({ isOpen, onClose, onSave, currentLogoUrl }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(currentLogoUrl);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file) setPreview(currentLogoUrl);
  }, [currentLogoUrl, file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSave = async () => {
    if (!file) return;
    setLoading(true);
    await onSave(file);
    setLoading(false);
  };

  const handleClose = () => {
    setFile(null);
    setPreview(currentLogoUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal__overlay"
      onMouseDown={(e) =>
        e.target.classList.contains("modal__overlay") && handleClose()
      }
    >
      <div className="modal">
        <h2 className="modal__title">Actualizar Logo de la Empresa</h2>
        <div className="modal__body">
          <p>Selecciona una nueva imagen para el logo. Se actualizará en todo el sitio.</p>

          <div className="logo-preview-container">
            {preview && <img src={preview} alt="Vista previa del logo" className="logo-preview" />}
          </div>

          <label>Seleccionar archivo (PNG, JPG, SVG)</label>
          <input
            type="file"
            accept="image/png, image/jpeg, image/svg+xml"
            onChange={handleFileChange}
            className="input"
            style={{ paddingTop: "10px" }}
          />
        </div>

        <div className="modal__actions">
          <button className="btn btn--secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </button>
          <button className="btn btn--primary" onClick={handleSave} disabled={!file || loading}>
            {loading ? "Guardando..." : "Guardar Logo"}
          </button>
        </div>
      </div>
    </div>
  );
}

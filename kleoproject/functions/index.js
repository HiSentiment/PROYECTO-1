const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions");

admin.initializeApp();

const db = admin.firestore();
const app = express();

// CORS configuration from environment or defaults
const ALLOWED_ORIGINS = [
  "http://localhost:3000",      // Development
  "http://localhost:3002",      // Development alternative
  "https://proyecto-1-roan.vercel.app", // Production
  process.env.REACT_APP_ORIGIN, // Custom origin if provided
].filter(Boolean); // Remove undefined values

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  })
);
app.options("*", cors());

app.use(express.json());

app.use((req, res, next) => {
  console.log(`👉 ${req.method} ${req.originalUrl}`);
  next();
});

app.use(async (req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  const auth = req.headers.authorization || "";
  console.log("🔎 Header Authorization recibido:", auth);
  const token = auth.startsWith("Bearer ") ? auth.split(" ")[1] : null;
  if (!token) return res.status(401).json({ error: "No token" });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    console.log("✅ Token decodificado:", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ Error verificando token:", err);
    return res
      .status(401)
      .json({ error: "Invalid token", details: err.message });
  }
});

async function esAdmin(uid) {
  const userDoc = await db.collection("UsuarioMovil").doc(uid).get();
  const userData = userDoc.exists ? userDoc.data() : null;
  if (!userData) return false;
  return (
    userData.cargo === "Administrador RRHH" || userData.cargo === "SuperAdmin"
  );
}

// Guardar solo la fecha como string YYYY-MM-DD (sin complicaciones de zona horaria)
function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  try {
    // Si viene como string YYYY-MM-DD, devolverlo tal cual
    if (typeof dateStr === "string" && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateStr;
    }
    
    // Si viene con hora (ej: "2025-10-22T21:30"), extraer solo la fecha
    if (typeof dateStr === "string" && dateStr.includes("T")) {
      return dateStr.split("T")[0];
    }
    
    return null;
  } catch (err) {
    console.error("❌ Error parseando fecha:", dateStr, err);
    return null;
  }
}
// ========================== ENCUESTAS ==========================

// Crear nueva encuesta
app.post("/encuestas", async (req, res) => {
  const { uid } = req.user || {};
  const data = req.body;
  console.log("📦 Datos recibidos en /encuestas:", JSON.stringify(data));
  if (!data.titulo || !Array.isArray(data.preguntas)) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  // Normalizar género
  let generos = [];
  if (Array.isArray(data.genero)) {
    generos = data.genero;
  } else if (typeof data.genero === "string" && data.genero.trim()) {
    // Permitir enviar un string como "masculino", "todos", "ambos", etc.
    const generoLower = data.genero.toLowerCase();

    if (generoLower === "todos") {
      generos = ["Masculino", "Femenino", "Otro"]; // Opción "Cualquiera" del Modal
    } else if (generoLower === "ambos") {
      generos = ["Masculino", "Femenino"]; // Opción "Ambos" del Modal
    } else if (generoLower === "masculino") {
      generos = ["Masculino"];
    } else if (generoLower === "femenino") {
      generos = ["Femenino"];
    } else if (generoLower === "otro") {
      generos = ["Otro"];
    } else {
      generos = []; // Por defecto, si el string no coincide con ninguno
    }
  }

  const doc = {
    titulo: data.titulo,
    preguntas: data.preguntas || [],
    area: Array.isArray(data.area) ? data.area : data.area ? [data.area] : [],
    fechaInicio: data.fechaInicio ? parseLocalDate(data.fechaInicio) : null,
    fechaFin: data.fechaFin ? parseLocalDate(data.fechaFin) : null,
    creadaPor: uid || "anon",
    fechaCreacion: admin.firestore.FieldValue.serverTimestamp(),
    activa: data.activa !== undefined ? data.activa : true,
    genero: generos,
    edadMinima: data.edadMinima ?? null,
    edadMaxima: data.edadMaxima ?? null,
  };

  try {
    const ref = await db.collection("encuestas").add(doc);
    const snap = await ref.get();
    res.status(201).json({ encuestaId: ref.id, ...snap.data() });
  } catch (err) {
    console.error("❌ Error creando encuesta:", err);
    res.status(500).json({
      error: err.message || "Error interno",
      stack: err.stack || null,
    });
  }
});

// Obtener todas las encuestas
app.get("/encuestas", async (req, res) => {
  try {
    const snapshot = await db.collection("encuestas").get();
    const encuestas = snapshot.docs.map((doc) => ({
      encuestaId: doc.id,
      ...doc.data(),
    }));
    res.json(encuestas);
  } catch (err) {
    console.error("❌ Error obteniendo encuestas:", err);
    res.status(500).json({ error: err.message, stack: err.stack || null });
  }
});

// Obtener encuesta por ID
app.get("/encuestas/:id", async (req, res) => {
  try {
    const ref = db.collection("encuestas").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Encuesta no encontrada" });
    }
    res.json({ encuestaId: snap.id, ...snap.data() });
  } catch (err) {
    console.error("❌ Error obteniendo encuesta:", err);
    res.status(500).json({ error: err.message, stack: err.stack || null });
  }
});

// Editar encuesta
app.patch("/encuestas/:id", async (req, res) => {
  const { uid } = req.user || {};
  const data = req.body;

  try {
    const ref = db.collection("encuestas").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Encuesta no encontrada" });
    }

    const encuesta = snap.data();
    const adminOK = await esAdmin(uid);

    if (encuesta.creadaPor !== uid && !adminOK) {
      return res.status(403).json({ error: "No autorizado para editar" });
    }

    // Normalizar género igual que en POST
    let generos = [];
    if (Array.isArray(data.genero)) {
      generos = data.genero;
    } else if (typeof data.genero === "string" && data.genero.trim()) {
      const generoLower = data.genero.toLowerCase();

      if (generoLower === "todos") {
        generos = ["Masculino", "Femenino", "Otro"]; // Opción "Cualquiera" del Modal
      } else if (generoLower === "ambos") {
        generos = ["Masculino", "Femenino"]; // Opción "Ambos" del Modal
      } else if (generoLower === "masculino") {
        generos = ["Masculino"];
      } else if (generoLower === "femenino") {
        generos = ["Femenino"];
      } else if (generoLower === "otro") {
        generos = ["Otro"];
      } else {
        generos = [];
      }
    }

    await ref.update({
      ...data,
      genero: generos,
      edadMinima: data.edadMinima ?? null,
      edadMaxima: data.edadMaxima ?? null,
      area: Array.isArray(data.area) ? data.area : data.area ? [data.area] : [],
      fechaInicio: data.fechaInicio ? parseLocalDate(data.fechaInicio) : null,
      fechaFin: data.fechaFin ? parseLocalDate(data.fechaFin) : null,
      fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updated = await ref.get();
    res.json({ encuestaId: updated.id, ...updated.data() });
  } catch (err) {
    console.error("❌ Error actualizando encuesta:", err);
    res.status(500).json({ error: err.message, stack: err.stack || null });
  }
});

// Eliminar encuesta
app.delete("/encuestas/:id", async (req, res) => {
  const { uid } = req.user || {};

  try {
    const ref = db.collection("encuestas").doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Encuesta no encontrada" });
    }

    const encuesta = snap.data();
    const adminOK = await esAdmin(uid);

    if (encuesta.creadaPor !== uid && !adminOK) {
      return res
        .status(403)
        .json({ error: "No autorizado para eliminar esta encuesta" });
    }

    await ref.delete();
    res.json({ message: "Encuesta eliminada con éxito" });
  } catch (err) {
    console.error("❌ Error eliminando encuesta:", err);
    res.status(500).json({ error: err.message, stack: err.stack || null });
  }
});

// ========================== ÁREAS ==========================

// Crear nueva área
app.post("/areas", async (req, res) => {
  try {
    const { nombreArea, nombreEncargado, correoEncargado, descripcion } =
      req.body;

    if (!nombreArea || !nombreEncargado || !correoEncargado) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    const doc = {
      nombreArea,
      nombreEncargado,
      correoEncargado,
      descripcion: descripcion || "",
      creadaPor: req.user?.uid || "anon",
      creadoEn: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await db.collection("areas").add(doc);
    const snap = await ref.get();

    res.status(201).json({ areaId: ref.id, ...snap.data() });
  } catch (err) {
    console.error("❌ Error creando área:", err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener todas las áreas
app.get("/areas", async (req, res) => {
  try {
    const snapshot = await db
      .collection("areas")
      .orderBy("creadoEn", "desc")
      .get();
    const areas = snapshot.docs.map((doc) => ({
      areaId: doc.id,
      ...doc.data(),
    }));
    res.json(areas);
  } catch (err) {
    console.error("❌ Error obteniendo áreas:", err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener área por ID
app.get("/areas/:id", async (req, res) => {
  try {
    const ref = db.collection("areas").doc(req.params.id);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Área no encontrada" });
    }

    res.json({ areaId: snap.id, ...snap.data() });
  } catch (err) {
    console.error("❌ Error obteniendo área:", err);
    res.status(500).json({ error: err.message });
  }
});

// Editar área
app.patch("/areas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nombreArea, nombreEncargado, correoEncargado, descripcion } =
      req.body;

    const ref = db.collection("areas").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Área no encontrada" });
    }

    await ref.update({
      nombreArea,
      nombreEncargado,
      correoEncargado,
      descripcion: descripcion || "",
      actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updated = await ref.get();
    res.json({ areaId: updated.id, ...updated.data() });
  } catch (err) {
    console.error("❌ Error actualizando área:", err);
    res.status(500).json({ error: err.message });
  }
});

// Eliminar área y limpiar encuestas relacionadas
app.delete("/areas/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const ref = db.collection("areas").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Área no encontrada" });
    }

    // 1. Eliminar el área
    await ref.delete();

    // 2. Buscar encuestas que tengan este área asignada
    const encuestasSnap = await db
      .collection("encuestas")
      .where("area", "array-contains", id)
      .get();

    // 3. Buscar usuarios móviles que tengan este área asignada
    const usuariosSnap = await db
      .collection("UsuarioMovil")
      .where("area", "==", id)
      .get();

    // 4. Actualizar en lotes
    const batch = db.batch();
    
    // Remover área de encuestas
    encuestasSnap.forEach((doc) => {
      batch.update(doc.ref, {
        area: admin.firestore.FieldValue.arrayRemove(id),
      });
    });

    // 🔥 Limpiar área de usuarios móviles (dejar vacío)
    usuariosSnap.forEach((doc) => {
      batch.update(doc.ref, {
        area: "", // Dejar área vacía
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();

    res.json({
      message: "Área eliminada correctamente y referencias limpiadas",
      encuestasActualizadas: encuestasSnap.size,
      usuariosActualizados: usuariosSnap.size, // 🔥 Reportar usuarios actualizados
    });
  } catch (err) {
    console.error("❌ Error eliminando área:", err);
    res.status(500).json({ error: err.message });
  }
});

// ========================== USUARIOS ==========================

// Middleware para permitir solo Admin RRHH y SuperAdmin
async function soloAdminWeb(req, res, next) {
  try {
    const uid = req.user.uid;
    const userDoc = await db.collection("usuariosWeb").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    if (!userData || !["SuperAdmin", "Admin RRHH"].includes(userData.rol)) {
      return res.status(403).json({ error: "Acceso solo Admin RRHH" });
    }
    next();
  } catch (error) {
    return res.status(500).json({ error: "Error verificando permisos" });
  }
}

async function soloGestor_Admin(req, res, next) {
  try {
    const uid = req.user.uid;
    const userDoc = await db.collection("usuariosWeb").doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    if (!userData || !["SuperAdmin", "Admin RRHH", "Gestor Casos"].includes(userData.rol)) {
      return res.status(403).json({ error: "Acceso solo Admin RRHH" });
    }
    next();
  } catch (error) {
    return res.status(500).json({ error: "Error verificando permisos" });
  }
}

// Añadir nuevo usuario
app.post("/UsuarioMovil", async (req, res) => {
  const {
    nombres,
    apellidos,
    rut,
    correo,
    genero,
    fechaNacimiento,
    rol,
    area,
    recibeEncuesta,
    esVulnerado,
    firmoContratoPrivacidad,
    contacto,
    contactosEmergencia,
    contactoRRHH,
  } = req.body;
  const tempPassword = correo;

  // Validaciones básicas (área ya no es requerida)
  if (!nombres || !apellidos || !rut || !correo || !rol) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  if (!validarRut(rut)) {
    return res.status(400).json({
      error: "RUT inválido. Debe tener formato 12345678-9 y dígito verificador correcto.",
    });
  }

  try {
    // Validar correo único
    let existeCorreo = false;
    try {
      await admin.auth().getUserByEmail(correo);
      existeCorreo = true;
    } catch (e) {
      existeCorreo = false;
    }
    if (existeCorreo) {
      return res.status(400).json({ error: "El correo ya está registrado." });
    }

    // Validar RUT único
    const rutSnap = await db.collection("UsuarioMovil").where("rut", "==", rut).get();
    if (!rutSnap.empty) {
      return res.status(400).json({ error: "El RUT ya está registrado." });
    }

    // Crear usuario en Auth
    const userRecord = await admin.auth().createUser({
      email: correo,
      password: tempPassword,
      displayName: `${nombres} ${apellidos}`,
    });

    // Guardar en Firestore
    await db.collection("UsuarioMovil").doc(userRecord.uid).set({
      nombres,
      apellidos,
      rut,
      correo,
      genero: genero || "",
      fechaNacimiento: fechaNacimiento || "",
      rol,
      area: area || "",
      esVulnerado: !!esVulnerado,
      recibeEncuesta: !!recibeEncuesta,
      firmoContratoPrivacidad: !!firmoContratoPrivacidad,
      contacto,
      tipoUsuario: "UsuarioMovil",
      contactosEmergencia: Array.isArray(contactosEmergencia) ? contactosEmergencia : [],
      contactoRRHH: contactoRRHH || { nombre: "", telefono: "" },
      uid: userRecord.uid,
      creadoEn: admin.firestore.FieldValue.serverTimestamp(),
    });

    await registrarAuditoria({
      req,
      accion: "Crear usuario",
      entidad: "UsuarioMovil",
      entidadId: userRecord.uid,
      detalle: { datos: req.body }
    });

    // Enviar correo con credenciales
    await enviarCorreoNuevoUsuario({
      to: correo,
      usuario: correo,
      password: tempPassword,
    });

    res.status(201).json({ uid: userRecord.uid, correo, tempPassword });
  } catch (error) {
    console.error("Error creando usuario:", error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener todos los UsuarioMovil
app.get("/UsuarioMovil", async (req, res) => {
  try {
    const snapshot = await db.collection("UsuarioMovil").get();
    const UsuarioMovil = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(UsuarioMovil);
  } catch (error) {
    console.error("Error obteniendo UsuarioMovil:", error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar usuario
app.delete("/UsuarioMovil/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Obtener datos previos para auditoría
    const prevSnap = await db.collection("UsuarioMovil").doc(id).get();
    const datosPrevios = prevSnap.exists ? prevSnap.data() : {};

    await admin.auth().deleteUser(id);
    await db.collection("UsuarioMovil").doc(id).delete();

    // Registrar auditoría
    await registrarAuditoria({
      req,
      accion: "Eliminar Usuario",
      entidad: "UsuarioMovil",
      entidadId: id,
      detalle: { datos: datosPrevios }
    });

    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando usuario:", error);
    res.status(500).json({ error: error.message });
  }
});
// Editar usuario
app.patch("/UsuarioMovil/:id", async (req, res) => {
  const { id } = req.params;
  const {
    nombres,           
    apellidos,         
    correo,
    contacto,
    rut,
    fechaNacimiento,
    recibeEncuesta,
    esVulnerado,
    firmoContratoPrivacidad,
    genero,
    contactosEmergencia,    
    contactoRRHH,
    area,               
    rol,
  } = req.body;

  // Validaciones básicas (área ya no es requerida)
  if (!nombres || !apellidos || !correo || !contacto || !rut || !rol) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  if (!validarRut(rut)) {
    return res.status(400).json({
      error: "RUT inválido. Debe tener formato 12345678-9 y dígito verificador correcto.",
    });
  }

  try {
    // Obtener datos previos para auditoría
    const prevSnap = await db.collection("UsuarioMovil").doc(id).get();
    const datosPrevios = prevSnap.exists ? prevSnap.data() : {};

    // Validar correo único (excepto el propio)
    const userSnap = await db.collection("UsuarioMovil").where("correo", "==", correo).get();
    if (!userSnap.empty && userSnap.docs[0].id !== id) {
      return res.status(400).json({ error: "El correo ya está registrado." });
    }

    // Validar RUT único (excepto el propio)
    const rutSnap = await db.collection("UsuarioMovil").where("rut", "==", rut).get();
    if (!rutSnap.empty && rutSnap.docs[0].id !== id) {
      return res.status(400).json({ error: "El RUT ya está registrado." });
    }

    // Actualizar en Auth
    await admin.auth().updateUser(id, {
      email: correo,
      displayName: `${nombres} ${apellidos}`,
    });

    // Actualizar en Firestore
    await db.collection("UsuarioMovil").doc(id).update({
      nombres,                    
      apellidos,                  
      correo,
      contacto,
      rut,
      fechaNacimiento: fechaNacimiento || "",
      genero,
      esVulnerado: !!esVulnerado,
      recibeEncuesta: !!recibeEncuesta,
      firmoContratoPrivacidad: !!firmoContratoPrivacidad, 
      contactosEmergencia: Array.isArray(contactosEmergencia) ? contactosEmergencia : [],
      contactoRRHH: contactoRRHH || { nombre: "", telefono: "" },
      area: area || "",           
      rol,
      actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Obtener datos después del update
    const afterSnap = await db.collection("UsuarioMovil").doc(id).get();
    const datosDespues = afterSnap.exists ? afterSnap.data() : {};

    // Registrar auditoría con datos antes y después
    await registrarAuditoria({
      req,
      accion: "Editar usuario",
      entidad: "UsuarioMovil",
      entidadId: id,
      detalle: {
        antes: datosPrevios,
        despues: datosDespues
      }
    });

    res.json({ message: "Usuario actualizado correctamente" });
  } catch (error) {
    console.error("Error actualizando usuario:", error);
    res.status(500).json({ error: error.message });
  }
});

// Carga masiva de usuarios móviles desde JSON (parseado en el frontend)
app.post("/UsuarioMovil/bulk", async (req, res) => {
  try {
    const { usuarios, area } = req.body; // Recibe area para asignar a todos
    if (!Array.isArray(usuarios) || usuarios.length === 0) {
      return res.status(400).json({ error: "Formato inválido. Debe enviar 'usuarios' como array." });
    }

    const results = [];
    let ok = 0;
    let error = 0;

    for (let i = 0; i < usuarios.length; i++) {
      const u = usuarios[i] || {};
      const nombres = (u.nombres || "").trim();
      const apellidos = (u.apellidos || "").trim();
      const rut = (u.rut || "").trim();
      const correo = (u.correo || "").trim().toLowerCase();
      const genero = (u.genero || "").trim();
      const fechaNacimiento = (u.fechaNacimiento || "").trim();
      const recibeEncuesta = !!u.recibeEncuesta;
      const contacto = (u.contacto || "").trim();
      const firmoContratoPrivacidad = !!u.firmoContratoPrivacidad;
      const contactosEmergencia = Array.isArray(u.contactosEmergencia) ? u.contactosEmergencia : [];
      const contactoRRHH = u.contactoRRHH && typeof u.contactoRRHH === "object" ? u.contactoRRHH : { nombre: "", telefono: "" };
      const rol = (u.rol || "UsuarioAppMovil").trim();

      // Validaciones mínimas
      if (!nombres || !apellidos || !rut || !correo || !contacto) {
        results.push({ index: i, correo, status: "error", error: "Faltan campos requeridos (nombres, apellidos, rut, correo, contacto)" });
        error++;
        continue;
      }
      if (!validarRut(rut)) {
        results.push({ index: i, correo, status: "error", error: "RUT inválido (formato y DV)" });
        error++;
        continue;
      }

      try {
        // Unicidad correo y rut
        let correoEnUso = false;
        try {
          await admin.auth().getUserByEmail(correo);
          correoEnUso = true;
        } catch (_) {
          correoEnUso = false;
        }
        if (correoEnUso) {
          results.push({ index: i, correo, status: "error", error: "Correo ya registrado" });
          error++;
          continue;
        }

        const rutSnap = await db.collection("UsuarioMovil").where("rut", "==", rut).limit(1).get();
        if (!rutSnap.empty) {
          results.push({ index: i, correo, status: "error", error: "RUT ya registrado" });
          error++;
          continue;
        }

        // Crear en Auth
        const tempPassword = correo;
        const userRecord = await admin.auth().createUser({
          email: correo,
          password: tempPassword,
          displayName: `${nombres} ${apellidos}`,
        });

        // Normalizar opcionales
        const contactosEmergenciaOk = (contactosEmergencia || [])
          .filter(c => c && (c.nombre || c.telefono))
          .map((c) => ({
            nombre: String(c.nombre || "").trim(),
            telefono: String(c.telefono || "").trim(),
          }))
          .slice(0, 3);

        const contactoRRHHOk = {
          nombre: String(contactoRRHH.nombre || "").trim(),
          telefono: String(contactoRRHH.telefono || "").trim(),
        };

        // Guardar FDB
        await db.collection("UsuarioMovil").doc(userRecord.uid).set({
          uid: userRecord.uid,
          nombres,
          apellidos,
          rut,
          correo,
          genero,
          fechaNacimiento: fechaNacimiento || "", //
          rol,
          cargo: "UsuarioAppMovil",
          area: area || "",
          esVulnerado: !!u.esVulnerado,
          recibeEncuesta: !!recibeEncuesta,
          firmoContratoPrivacidad: !!firmoContratoPrivacidad,
          contacto,
          tipoUsuario: "UsuarioMovil",
          contactosEmergencia: contactosEmergenciaOk,
          contactoRRHH: contactoRRHHOk,
          creadoEn: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Registrar auditoría
        await registrarAuditoria({
          req,
          accion: "Carga Masiva Usuarios",
          entidad: "UsuarioMovil",
          entidadId: userRecord.uid,
          detalle: { datos: { ...u, area: area || "" } }
        });

        // Enviar correo con credenciales
        await enviarCorreoNuevoUsuario({
        to: correo,
        usuario: correo,
        password: tempPassword,
      });

        results.push({ index: i, correo, uid: userRecord.uid, status: "ok" });
        ok++;
      } catch (e) {
        console.error(`❌ Error en fila ${i}:`, e);
        results.push({ index: i, correo, status: "error", error: e.message || "Error desconocido" });
        error++;
      }
    }

    res.json({ total: usuarios.length, ok, error, results });
  } catch (e) {
    console.error("❌ Error en /UsuarioMovil/bulk:", e);
    res.status(500).json({ error: e.message || "Error interno" });
  }
});


function validarRut(rut) {
  if (!/^(\d{7,8})-([\dkK])$/.test(rut)) return false;
  const [, num, dv] = rut.match(/^(\d{7,8})-([\dkK])$/);
  let suma = 0,
    mul = 2;
  for (let i = num.length - 1; i >= 0; i--) {
    suma += parseInt(num[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const res = 11 - (suma % 11);
  const dvEsperado = res === 11 ? "0" : res === 10 ? "K" : String(res);
  return dvEsperado === dv.toUpperCase();
}

/* ===========================================================
    USUARIOS WEB
   =========================================================== */

// Crear usuario web
app.post("/usuariosWeb", soloAdminWeb, async (req, res) => {
  const { nombres, apellidos, rut, correo, area, rol, contacto } = req.body;
  const tempPassword = correo;

  // Validaciones básicas
  if (!nombres || !apellidos || !rut || !correo || !area || !rol) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }
  if (!validarRut(rut)) {
    return res.status(400).json({ error: "RUT inválido." });
  }

  try {
    // Validar correo único
    let existeCorreo = false;
    try {
      await admin.auth().getUserByEmail(correo);
      existeCorreo = true;
    } catch (e) {
      existeCorreo = false;
    }
    if (existeCorreo) {
      return res.status(400).json({ error: "El correo ya está registrado." });
    }

    // Validar RUT único en usuariosWeb
    const rutSnap = await db
      .collection("usuariosWeb")
      .where("rut", "==", rut)
      .get();
    if (!rutSnap.empty) {
      return res.status(400).json({ error: "El RUT ya está registrado." });
    }

    // Crear usuario en Auth
    const userRecord = await admin.auth().createUser({
      email: correo,
      password: tempPassword,
      displayName: `${nombres} ${apellidos}`,
    });

    // Guardar en Firestore (usuariosWeb)
    await db.collection("usuariosWeb").doc(userRecord.uid).set({
      nombres,
      apellidos,
      rut,
      correo,
      area,
      rol,
      contacto,
      uid: userRecord.uid,
      requiereCambioPassword: true,
      creadoEn: admin.firestore.FieldValue.serverTimestamp(),
    });

    //  Registrar auditoría
    await registrarAuditoria({
      req,
      accion: "Crear usuario web",
      entidad: "UsuarioWeb",
      entidadId: userRecord.uid,
      detalle: { datos: req.body }
    });

    // enviar correo con credenciales
    await enviarCorreoNuevoUsuario({
      to: correo,
      usuario: correo,
      password: tempPassword,
    });

    res.status(201).json({ uid: userRecord.uid, correo, tempPassword });
  } catch (error) {
    console.error("Error creando usuario web:", error);
    res.status(500).json({ error: error.message });
  }
});


// Obtener todos los UsuarioMovil web
app.get("/usuariosWeb", soloGestor_Admin, async (req, res) => {
  try {
    const snapshot = await db.collection("usuariosWeb").get();
    const UsuarioMovil = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(UsuarioMovil);
  } catch (error) {
    console.error("Error obteniendo UsuarioMovil web:", error);
    res.status(500).json({ error: error.message });
  }
});


app.get("/usuariosWeb/basic", async (req, res) => {
  try {
    const snapshot = await db.collection("usuariosWeb").get();
    const usuarios = snapshot.docs.map((doc) => ({
      id: doc.id,
      nombres: doc.data().nombres,
      apellidos: doc.data().apellidos,
      rol: doc.data().rol,
    }));
    res.json(usuarios);
  } catch (error) {
    console.error("Error obteniendo usuarios básicos:", error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar usuario web
app.delete("/usuariosWeb/:id", soloAdminWeb, async (req, res) => {
  const { id } = req.params;
  try {
    // Obtener datos previos para auditoría
    const prevSnap = await db.collection("usuariosWeb").doc(id).get();
    const datosPrevios = prevSnap.exists ? prevSnap.data() : {};

    await admin.auth().deleteUser(id);
    await db.collection("usuariosWeb").doc(id).delete();

    // Registrar auditoría
    await registrarAuditoria({
      req,
      accion: "Eliminar Usuario web",
      entidad: "UsuarioWeb",
      entidadId: id,
      detalle: { datos: datosPrevios }
    });

    res.json({ message: "Usuario web eliminado correctamente" });
  } catch (error) {
    console.error("Error eliminando usuario web:", error);
    res.status(500).json({ error: error.message });
  }
});
// Editar usuario web
app.patch("/usuariosWeb/:id", soloAdminWeb, async (req, res) => {
  const { id } = req.params;
  const { nombres, apellidos, rut, correo, area, rol, contacto } = req.body;

  if (!nombres || !apellidos || !rut || !correo || !area || !rol) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }
  if (!validarRut(rut)) {
    return res.status(400).json({ error: "RUT inválido." });
  }

  try {
    // Obtener datos previos para auditoría
    const prevSnap = await db.collection("usuariosWeb").doc(id).get();
    const datosPrevios = prevSnap.exists ? prevSnap.data() : {};

    // Validar correo único (excepto el propio)
    const userSnap = await db
      .collection("usuariosWeb")
      .where("correo", "==", correo)
      .get();

    if (!userSnap.empty) {
      // Busca si hay algún usuario con ese correo que NO sea el actual
      const otro = userSnap.docs.find(doc => doc.id !== id);
      if (otro) {
        return res.status(400).json({ error: "El correo ya está registrado." });
      }
    }
        // Validar RUT único (excepto el propio)
    const rutSnap = await db
      .collection("usuariosWeb")
      .where("rut", "==", rut)
      .get();
    if (!rutSnap.empty && rutSnap.docs[0].id !== id) {
      return res.status(400).json({ error: "El RUT ya está registrado." });
    }

    // Actualizar en Auth
    await admin.auth().updateUser(id, {
      email: correo,
      displayName: `${nombres} ${apellidos}`,
    });

    // Actualizar en Firestore
    await db.collection("usuariosWeb").doc(id).update({
      nombres,
      apellidos,
      rut,
      correo,
      area,
      rol,
      contacto,
      actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Obtener datos después del update
    const afterSnap = await db.collection("usuariosWeb").doc(id).get();
    const datosDespues = afterSnap.exists ? afterSnap.data() : {};

    //  Registrar auditoría
    await registrarAuditoria({
      req,
      accion: "Editar usuario web",
      entidad: "UsuarioWeb",
      entidadId: id,
      detalle: {
        antes: datosPrevios,
        despues: datosDespues
      }
    });

    res.json({ message: "Usuario web actualizado correctamente" });
  } catch (error) {
    console.error("Error actualizando usuario web:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/usuariosWeb/check/:uid", async (req, res) => {
  try {
    const ref = db.collection("usuariosWeb").doc(req.params.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      return res
        .status(404)
        .json({ error: "No tienes permisos para acceder a esta plataforma." });
    }
    const data = snap.data();
    res.json({
      requiereCambioPassword: !!data.requiereCambioPassword,
      // puedes devolver más info si quieres
    });
  } catch (error) {
    res.status(500).json({ error: "Error verificando usuario." });
  }
});

/* ===========================================================
   📌 ABUSOS
   =========================================================== */

// Crear nuevo abuso
app.post("/abusos", async (req, res) => {
  try {
    console.log("📦 Body recibido:", req.body);
    const { usuarioId, fecha, estado, observaciones, gestorAsignado } = req.body; 
    const { uid } = req.user || {};

    if (!usuarioId) {
      return res.status(400).json({
        error: "Falta campo requerido: usuarioId",
      });
    }

    const parsedFecha =
      fecha && !isNaN(new Date(fecha).getTime())
        ? parseLocalDate(fecha)
        : admin.firestore.FieldValue.serverTimestamp();

    let protocolosPrevios = [];
    try {
      const protocolosSnap = await db
        .collection("protocolos")
        .where("usuarioId", "==", usuarioId)
        .get();

      if (!protocolosSnap.empty) {
        protocolosPrevios = protocolosSnap.docs.map((doc) => doc.id);
        console.log(
          `🔎 Se encontraron ${protocolosPrevios.length} protocolos previos para el usuario ${usuarioId}`
        );
      } else {
        console.log(`ℹ️ No hay protocolos previos para el usuario ${usuarioId}`);
      }
    } catch (err) {
      console.warn("⚠️ Error al buscar protocolos previos:", err);
    }

    // Crear el documento 
    const doc = {
      usuarioId,
      fecha: parsedFecha,
      estado: estado || "Pendiente",
      observaciones: observaciones || "",
      gestorAsignado: gestorAsignado || null, 
      protocolosAsociados: protocolosPrevios,
      creadoEn: admin.firestore.FieldValue.serverTimestamp(),
      creadaPor: uid || "anon", 
    };

    const ref = await db.collection("abusos").add(doc);
    const snap = await ref.get();

    // Registrar auditoría
    await registrarAuditoria({
      req,
      accion: "Crear abuso",
      entidad: "Abuso",
      entidadId: ref.id,
      detalle: { datos: doc }
    });

    console.log(`✅ Nuevo abuso creado: ${ref.id} (gestor: ${doc.gestorAsignado})`);

    res.status(201).json({ abusoId: ref.id, ...snap.data() });
  } catch (err) {
    console.error("❌ Error creando abuso:", err);
    res.status(500).json({ error: err.message });
  }
});


// Obtener todos los abusos
app.get("/abusos", async (req, res) => {
  try {
    const snapshot = await db
      .collection("abusos")
      .orderBy("creadoEn", "desc")
      .get();

    const abusos = snapshot.docs.map((doc) => ({
      abusoId: doc.id,
      ...doc.data(),
    }));

    res.json(abusos);
  } catch (err) {
    console.error("❌ Error obteniendo abusos:", err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener abuso por ID
app.get("/abusos/:id", async (req, res) => {
  try {
    const ref = db.collection("abusos").doc(req.params.id);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Abuso no encontrado" });
    }
    // Registrar auditoría
    await registrarAuditoria({
      req,
      accion: "Ver detalle abuso",
      entidad: "Abuso",
      entidadId: req.params.id,
      detalle: {datos: snap.data()}
    });


    res.json({ abusoId: snap.id, ...snap.data() });
  } catch (err) {
    console.error("❌ Error obteniendo abuso:", err);
    res.status(500).json({ error: err.message });
  }
});

// Editar abuso
app.patch("/abusos/:id", async (req, res) => {
  const { uid } = req.user || {};
  try {
    const ref = db.collection("abusos").doc(req.params.id);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Abuso no encontrado" });
    }

    const datosPrevios = snap.data();
    const adminOK = await esAdmin(uid);
    // Permitir edición solo si es creador, gestor asignado o admin
    if (
      datosPrevios.creadaPor !== uid &&
      datosPrevios.gestorAsignado !== uid &&
      !adminOK
    ) {
      return res.status(403).json({ error: "No autorizado para editar abuso" });
    }
    const data = req.body;
    await ref.update({
      ...data,
      actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Obtener datos después del update
    const afterSnap = await ref.get();
    const datosDespues = afterSnap.exists ? afterSnap.data() : {};

    // Registrar auditoría
    await registrarAuditoria({
      req,
      accion: "Editar abuso",
      entidad: "Abuso",
      entidadId: req.params.id,
      detalle: {
        antes: datosPrevios,
        despues: datosDespues
      }
    });

    console.log(`🟢 Abuso actualizado: ${afterSnap.id}`);
    res.json({ abusoId: afterSnap.id, ...afterSnap.data() });
  } catch (err) {
    console.error("❌ Error actualizando abuso:", err);
    res.status(500).json({ error: err.message });
  }
});

// Eliminar abuso
app.delete("/abusos/:id", async (req, res) => {
  const { uid } = req.user || {};
  try {
    const ref = db.collection("abusos").doc(req.params.id);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Abuso no encontrado" });
    }

    const abuso = snap.data();
    const adminOK = await esAdmin(uid);

    if (abuso.creadaPor !== uid && !adminOK) {
      return res
        .status(403)
        .json({ error: "No autorizado para eliminar abuso" });
    }

    await ref.delete();
    // Registrar auditoría
    await registrarAuditoria({
      req,
      accion: "Eliminar abuso",
      entidad: "Abuso",
      entidadId: req.params.id,
      detalle: { datos: abuso }
    });
    console.log(`🗑️ Abuso eliminado: ${req.params.id}`);
    res.json({ message: "Abuso eliminado con éxito" });
  } catch (err) {
    console.error("❌ Error eliminando abuso:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
//  TRIGGER: Vincular protocolo recién creado con abuso activo
// ============================================================

exports.onProtocoloCreated = onDocumentCreated(
  "protocolos/{protocoloId}",
  async (event) => {
    const snap = event.data;
    if (!snap) {
      logger.warn("⚠️ Evento sin datos (snapshot vacío)");
      return;
    }

    const newProtocolo = snap.data();
    const protocoloId = event.params.protocoloId;
    const usuarioId = newProtocolo?.usuarioId;

    if (!usuarioId) {
      logger.warn("⚠️ Protocolo sin usuarioId, se omite asociación.");
      return;
    }

    try {
      // Buscar abuso activo del usuario
      const abusosSnap = await db
        .collection("abusos")
        .where("usuarioId", "==", usuarioId)
        .where("estado", "in", ["Pendiente", "En proceso"]) // solo casos abiertos
        .orderBy("creadoEn", "desc")
        .limit(1)
        .get();

      if (abusosSnap.empty) {
        logger.info(`ℹ️ No se encontró abuso activo para usuario ${usuarioId}`);
        return;
      }

      const abusoRef = abusosSnap.docs[0].ref;
      await abusoRef.update({
        protocolosAsociados: admin.firestore.FieldValue.arrayUnion(protocoloId),
        actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(
        `✅ Protocolo ${protocoloId} asociado automáticamente al abuso ${abusoRef.id}`
      );
    } catch (err) {
      logger.error("❌ Error asociando protocolo a abuso:", err);
    }
  }
);

// ========================== PROTOCOLOS ==========================

app.get("/protocolos", async (req, res) => {
  try {
    const { usuarioId } = req.query;

    let ref = db.collection("protocolos");

    // Si se envía usuarioId como query param, filtramos
    if (usuarioId) {
      ref = ref.where("usuarioId", "==", usuarioId);
    }

    const snapshot = await ref.get();

    if (snapshot.empty) {
      return res.status(200).json([]); // No es error, solo lista vacía
    }

    const data = snapshot.docs.map((doc) => ({
      protocoloId: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(data);
  } catch (err) {
    console.error("❌ Error obteniendo protocolos:", err);
    res.status(500).json({ error: "Error obteniendo protocolos" });
  }
});

// Obtener un protocolo por ID
app.get("/protocolos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const ref = db.collection("protocolos").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Protocolo no encontrado" });
    }

    res.status(200).json({ protocoloId: snap.id, ...snap.data() });
  } catch (err) {
    console.error("❌ Error obteniendo protocolo:", err);
    res.status(500).json({ error: "Error obteniendo protocolo" });
  }
});
// ===========================================================
//  OBSERVACIONES
// ===========================================================

// Obtener observaciones por casoId
app.get("/observaciones", async (req, res) => {
  try {
    const { casoId } = req.query;

    if (!casoId) {
      return res.status(400).json({ error: "Falta el parámetro 'casoId'" });
    }

    const ref = db.collection("observaciones").where("casoId", "==", casoId);
    const snapshot = await ref.get();

    if (snapshot.empty) {
      return res.status(200).json([]); // sin error
    }

    const observaciones = snapshot.docs.map((doc) => ({
      observacionId: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(observaciones);
  } catch (err) {
    console.error("❌ Error obteniendo observaciones:", err);
    res.status(500).json({
      error: "Error interno al obtener observaciones",
      details: err.message,
    });
  }
});


// Crear observación (solo gestor asignado)
app.post("/observaciones", async (req, res) => {
  try {
    const { uid } = req.user || {};
    const { casoId, gestorId, texto } = req.body;

    if (!casoId || !gestorId || !texto) {
      return res.status(400).json({
        error: "Campos requeridos: casoId, gestorId, texto",
      });
    }

    // Verificar si el usuario actual es el gestor asignado en el caso (colección 'abusos')
    const abusoSnap = await db.collection("abusos").doc(casoId).get();
    if (!abusoSnap.exists) {
      return res.status(404).json({ error: "Caso no encontrado" });
    }

    const abusoData = abusoSnap.data();
    const esGestorAsignado = abusoData.gestorAsignado === uid;

    if (!esGestorAsignado) {
      return res.status(403).json({
        error: "No autorizado: solo el gestor asignado puede agregar observaciones",
      });
    }

    // Crear la observación
    const nuevaObs = {
      casoId,
      gestorId: uid,
      texto,
      fecha: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ref = await db.collection("observaciones").add(nuevaObs);
    const snap = await ref.get();

    // Registrar Auditoría
    await registrarAuditoria({
      req,
      accion: "Crear observación",
      entidad: "Observacion",
      entidadId: ref.id,
      detalle: { datos: nuevaObs }
    });

    res.status(201).json({ observacionId: ref.id, ...snap.data() });
  } catch (err) {
    console.error("❌ Error creando observación:", err);
    res.status(500).json({ error: err.message });
  }
});


// Editar observación (solo gestor asignado del caso o admin)
app.patch("/observaciones/:id", async (req, res) => {
  const { uid } = req.user || {};
  try {
    const ref = db.collection("observaciones").doc(req.params.id);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Observación no encontrada" });
    }

    const obs = snap.data();
    const { texto } = req.body;
    if (!texto) {
      return res.status(400).json({ error: "Campo 'texto' requerido." });
    }

    //  Validamos que el usuario sea gestor asignado del caso en abusos
    const abusoSnap = await db.collection("abusos").doc(obs.casoId).get();
    if (!abusoSnap.exists) {
      return res.status(404).json({ error: "Caso no encontrado" });
    }

    const abusoData = abusoSnap.data();
    const esGestorAsignado = abusoData.gestorAsignado === uid;
    const adminOK = await esAdmin(uid);

    if (!esGestorAsignado && !adminOK) {
      return res
        .status(403)
        .json({ error: "No autorizado para editar esta observación" });
    }

    await ref.update({
      texto,
      fechaActualizacion: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updated = await ref.get();
    // Obtener datos para auditoría
    const obsDespues = updated.exists ? updated.data() : {};

    // Registrar auditoría
    await registrarAuditoria({
      req,
      accion: "Editar observación",
      entidad: "Observacion",
      entidadId: req.params.id,
      detalle: {
        antes: obs,
        despues: obsDespues
      }
    });
    res.status(200).json({ observacionId: updated.id, ...updated.data() });
  } catch (err) {
    console.error("❌ Error actualizando observación:", err);
    res.status(500).json({ error: err.message });
  }
});


// Eliminar observación (solo gestor asignado del caso o admin)
app.delete("/observaciones/:id", async (req, res) => {
  const { uid } = req.user || {};
  try {
    const ref = db.collection("observaciones").doc(req.params.id);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Observación no encontrada" });
    }

    const obs = snap.data();

    
    const abusoSnap = await db.collection("abusos").doc(obs.casoId).get();
    if (!abusoSnap.exists) {
      return res.status(404).json({ error: "Caso no encontrado" });
    }

    const abusoData = abusoSnap.data();
    const esGestorAsignado = abusoData.gestorAsignado === uid;
    const adminOK = await esAdmin(uid);

    if (!esGestorAsignado && !adminOK) {
      return res
        .status(403)
        .json({ error: "No autorizado para eliminar esta observación" });
    }

    await ref.delete();

    // Registrar auditoría
    await registrarAuditoria({
      req,
      accion: "Eliminar observación",
      entidad: "Observacion",
      entidadId: req.params.id,
      detalle: { datos: obs }
    });


    console.log(`🗑️ Observación eliminada: ${req.params.id}`);
    res.json({ message: "Observación eliminada con éxito" });
  } catch (err) {
    console.error("❌ Error eliminando observación:", err);
    res.status(500).json({ error: err.message });
  }
});

exports.api = functions.https.onRequest(app);


// Auditoria
async function registrarAuditoria({ req, accion, entidad, entidadId, detalle = {} }) {
  try {
    const usuarioUid = req.user?.uid || null;
    const usuarioEmail = req.user?.email || null;
    await db.collection("auditoria").add({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      usuarioUid,
      usuarioEmail,
      accion,
      entidad,
      entidadId,
      detalle,
    });
  } catch (e) {
    console.error("Error registrando auditoría:", e);
  }
}
// Obtener logs de auditoría
app.get("/auditoria", async (req, res) => {
  try {
    const snap = await db.collection("auditoria").orderBy("timestamp", "desc").limit(100).get();
    const logs = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(logs);
  } catch (e) {
    res.status(500).json({ error: "Error obteniendo auditoría" });
  }
});

// ========================== EMAILS ==========================
const nodemailer = require("nodemailer");

// Configuración SMTP
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "correos.goodjob@gmail.com", 
    pass: "duha xrhs pgus tguw",
  },
});

// Enviar correo de bienvenida
async function enviarCorreoNuevoUsuario({ to, usuario, password }) {
  const mailOptions = {
    from: '"GoodJob Soporte" <TUCORREO@gmail.com>',
    to,
    subject: "Bienvenido a GoodJob",
    html: `
      <h2>Bienvenido/a a GoodJob</h2>
      <p>Tu usuario ha sido registrado en la plataforma.</p>
      <p><b>Usuario:</b> ${usuario}</p>
      <p><b>Contraseña:</b> ${password}</p>
      <p>Descarga la aplicación movil en el siguiente enlace: https://firebasestorage.googleapis.com/v0/b/proyecto-1-2e960.firebasestorage.app/o/app%2FGoodJob.apk?alt=media&token=c870ee58-ea7c-43ff-8746-9cfacac249e6.</p>
      <p>Por favor, cambia tu contraseña al ingresar por primera vez.</p>
      <br>
    `,
  };
  await transporter.sendMail(mailOptions);
}
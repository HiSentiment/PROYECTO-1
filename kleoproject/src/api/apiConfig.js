/**
 * API Configuration Centralized
 * This file centralizes all API endpoints and configuration
 * to avoid hardcoding URLs across the application
 */

// API Base URL from environment variables (REQUIRED)
const API_URL = process.env.REACT_APP_API_URL;

if (!API_URL) {
  throw new Error('❌ REACT_APP_API_URL no está configurada en .env. Por favor, configura esta variable de entorno.');
}

// Environment
const ENV = process.env.REACT_APP_ENV || 'development';

// API Endpoints
export const API_ENDPOINTS = {
  // Cases/Abusos
  ABUSOS: `${API_URL}/abusos`,
  ABUSO_DETAIL: (id) => `${API_URL}/abusos/${id}`,
  
  // Users - Móvil
  USUARIOS_MOVIL: `${API_URL}/UsuarioMovil`,
  USUARIO_MOVIL_DETAIL: (id) => `${API_URL}/UsuarioMovil/${id}`,
  USUARIO_MOVIL_BULK: `${API_URL}/UsuarioMovil/bulk`,
  
  // Users - Web
  USUARIOS_WEB: `${API_URL}/usuariosWeb`,
  USUARIOS_WEB_BASIC: `${API_URL}/usuariosWeb/basic`,
  USUARIO_WEB_DETAIL: (id) => `${API_URL}/usuariosWeb/${id}`,
  
  // Areas/Departments
  AREAS: `${API_URL}/areas`,
  AREA_DETAIL: (id) => `${API_URL}/areas/${id}`,
  
  // Surveys/Encuestas
  ENCUESTAS: `${API_URL}/encuestas`,
  ENCUESTA_DETAIL: (id) => `${API_URL}/encuestas/${id}`,
  
  // Observations/Observaciones
  OBSERVACIONES: (casoId) => `${API_URL}/observaciones?casoId=${casoId}`,
  OBSERVACION_DETAIL: (id) => `${API_URL}/observaciones/${id}`,
  
  // Protocols/Protocolos
  PROTOCOLOS: (usuarioId) => `${API_URL}/protocolos?usuarioId=${usuarioId}`,
  PROTOCOLO_DETAIL: (id) => `${API_URL}/protocolos/${id}`,
  
  // Audit Log/Auditoría
  AUDITORIA: `${API_URL}/auditoria`,
  AUDITORIA_DETAIL: (id) => `${API_URL}/auditoria/${id}`,
};

/**
 * Fetch wrapper with automatic token injection
 * @param {string} url - The endpoint URL
 * @param {Object} options - Fetch options (method, headers, body, etc.)
 * @param {string} token - Firebase auth token
 * @returns {Promise<Response>}
 */
export const apiFetch = async (url, options = {}, token = null) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add authorization header if token is provided
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
};

/**
 * Log fetch request/response for debugging (development only)
 * @param {string} method
 * @param {string} url
 * @param {Object} data
 */
export const logApiCall = (method, url, data = null) => {
  if (ENV === 'development') {
    const shortUrl = url.replace(API_URL, '');
    console.log(`📡 [${method}] ${shortUrl}`, data || '');
  }
};

export default API_ENDPOINTS;

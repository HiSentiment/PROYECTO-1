"use client"

import { useEffect, useState } from "react"
import { collection, getDocs, doc, getDoc } from "firebase/firestore"
import { auth, db } from "../../firebase"
import "./dashboard.css"

// --- Iconos (Componentes SVG) ---
const FileTextIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
)
const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const TrendingUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
)
const BarChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </svg>
)
const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
)
const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
  	<polyline points="12 6 12 12 16 14" />
  </svg>
)
const LayersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
)
const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)
const AlertTriangleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  	<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
  	<line x1="12" y1="9" x2="12" y2="13" />
  	<line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)
const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  	<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)
// --- Fin Iconos ---

export default function Dashboard() {
  const [rol, setRol] = useState(null)
  const [rolLoading, setRolLoading] = useState(true)
  const [appLoading, setAppLoading] = useState(true)

  const [metrics, setMetrics] = useState({
    totalEncuestas: 0,
    encuestasActivas: 0,
    totalRespuestas: 0,
    promedioParticipacion: 0,
    respuestasPorArea: {},
    encuestasDetalle: [],
    cargando: true,
  })

  const [abusosMetrics, setAbusosMetrics] = useState({
    totalCasos: 0,
    casosPendientes: 0,
    casosEnProceso: 0,
    casosFinalizados: 0,
    casosActivos: 0,
    casosPorMes: {},
    gestores: {},
    cargando: true,
  })

  const [areasMap, setAreasMap] = useState({})
  
  const [expandedSurveys, setExpandedSurveys] = useState({})

  // Obtener el ROL del usuario al cargar
  useEffect(() => {
    const fetchRol = async () => {
      setRolLoading(true)
      try {
        const user = auth.currentUser
        if (user) {
          const ref = doc(db, "usuariosWeb", user.uid)
          const snap = await getDoc(ref)
          if (snap.exists()) {
            setRol(snap.data().rol)
          } else {
            setRol(null) // Usuario autenticado pero sin rol en la BD
          }
        }
      } catch (error) {
        console.error("Error fetching user role:", error)
        setRol(null)
      } finally {
        setRolLoading(false)
      }
    }
    fetchRol()
  }, [])

  // Cargar datos condicionalmente según el ROL
  useEffect(() => {
    // Si el rol aún no se ha cargado, no hacemos nada
    if (rolLoading || !rol) return

    setAppLoading(true)

    // Función para cargar métricas de Encuestas
    const fetchData = async () => {
      try {
        const encuestasSnapshot = await getDocs(collection(db, "encuestas"))
        const respuestasSnapshot = await getDocs(collection(db, "respuestas_encuestas"))
        const areasSnapshot = await getDocs(collection(db, "areas"))

        const areasData = {}
        areasSnapshot.docs.forEach((doc) => {
          areasData[doc.id] = doc.data().nombreArea
        })
        setAreasMap(areasData)

        const encuestas = encuestasSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        const respuestas = respuestasSnapshot.docs.map((doc) => doc.data())

        const totalEncuestas = encuestas.length
        const encuestasActivas = encuestas.filter((e) => e.activa === true).length
        const totalRespuestas = respuestas.length
        const promedioParticipacion = totalEncuestas > 0 ? (totalRespuestas / totalEncuestas).toFixed(2) : 0

        const respuestasPorArea = {}
        respuestas.forEach((respuesta) => {
          const encuesta = encuestas.find((e) => e.id === respuesta.surveyId)
          if (encuesta && Array.isArray(encuesta.area)) {
            encuesta.area.forEach((area) => {
              respuestasPorArea[area] = (respuestasPorArea[area] || 0) + 1
            })
          }
        })

        const encuestasDetalle = encuestas.map((encuesta) => {
          const respuestasEncuesta = respuestas.filter((r) => r.surveyId === encuesta.id)

          const preguntasAnalisis = Array.isArray(encuesta.preguntas)
            ? encuesta.preguntas.map((pregunta, index) => {
          	  const preguntaKey = `pregunta_${index}`
  	  const respuestasPregunta = {}

  	  respuestasEncuesta.forEach((respuesta) => {
  	    if (respuesta.respuestas && respuesta.respuestas[preguntaKey]) {
  	      const valor = respuesta.respuestas[preguntaKey]
  	      respuestasPregunta[valor] = (respuestasPregunta[valor] || 0) + 1
  	    }
  	  })

  	  const totalRespuestasPregunta = Object.values(respuestasPregunta).reduce((a, b) => a + b, 0)
  	  const respuestasConPorcentaje = Object.entries(respuestasPregunta)
  	    .map(([opcion, count]) => ({
  	      opcion,
  	      count,
  	      porcentaje: totalRespuestasPregunta > 0 ? ((count / totalRespuestasPregunta) * 100).toFixed(1) : 0,
  	    }))
  	    .sort((a, b) => b.count - a.count)

  	  return {
  	    texto: pregunta.texto || `Pregunta ${index + 1}`,
  	    tipo: pregunta.tipo || "texto",
  	    opciones: pregunta.opciones || [],
  	    respuestas: respuestasConPorcentaje,
  	    totalRespuestas: totalRespuestasPregunta,
  	  }
  	})
  	: []

          return {
        	id: encuesta.id,
        	titulo: encuesta.titulo || "Sin título",
        	activa: encuesta.activa,
        	fechaCreacion: encuesta.fechaCreacion,
    	fechaInicio: encuesta.fechaInicio,
    	fechaFin: encuesta.fechaFin,
    	areas: Array.isArray(encuesta.area) ? encuesta.area : [],
    	numPreguntas: Array.isArray(encuesta.preguntas) ? encuesta.preguntas.length : 0,
    	numRespuestas: respuestasEncuesta.length,
    	preguntasAnalisis,
      }
  	})

        setMetrics({
        	totalEncuestas,
        	encuestasActivas,
        	totalRespuestas,
        	promedioParticipacion,
  	respuestasPorArea,
  	encuestasDetalle,
  	cargando: false,
    })
    } catch (error) {
      console.error("Error obteniendo métricas:", error)
      setMetrics(prev => ({ ...prev, cargando: false }))
    }
  }

    // Función para cargar métricas de Abusos/Vulneraciones
    const fetchAbusos = async () => {
      try {
        const abusosSnapshot = await getDocs(collection(db, "abusos"));
        const usuariosSnapshot = await getDocs(collection(db, "usuariosWeb"));

        const usuariosMap = {};
        usuariosSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          usuariosMap[doc.id] = data.nombres || "Sin nombre";
        });
        

        const abusos = abusosSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        const totalCasos = abusos.length;
        const casosPendientes = abusos.filter((a) => a.estado === "Pendiente").length;
        const casosEnProceso = abusos.filter((a) => a.estado === "En proceso").length;
        const casosFinalizados = abusos.filter((a) => a.estado === "Finalizado").length;
        const casosActivos = casosPendientes + casosEnProceso;

        const casosPorMes = {};
  	const gestores = {};

  	abusos.forEach((abuso) => {
  	  if (abuso.fecha) {
        const fechaObj = abuso.fecha.toDate ? abuso.fecha.toDate() : new Date(abuso.fecha);
  	    const mesAnio = fechaObj.toLocaleDateString("es-ES", { month: "short", year: "numeric" });
  	    casosPorMes[mesAnio] = (casosPorMes[mesAnio] || 0) + 1;
  	  }

  	  if (abuso.gestorAsignado) {
  	    const nombreGestor = usuariosMap[abuso.gestorAsignado] || "Desconocido";
  	    gestores[nombreGestor] = (gestores[nombreGestor] || 0) + 1;
  	  }
  	});

        setAbusosMetrics({
          totalCasos,
          casosPendientes,
          casosEnProceso,
          casosFinalizados,
          casosActivos,
          casosPorMes,
  	  gestores,
  	  cargando: false,
  	});
    } catch (error) {
      console.error("Error obteniendo métricas de abusos:", error);
      setAbusosMetrics((prev) => ({ ...prev, cargando: false }));
    }
  }

    // Controlador para ejecutar las cargas de datos según el rol
    const loadData = async () => {
      const promises = []
      // Cargar encuestas solo para Admin y RRHH
      if (rol === "Admin RRHH" || rol === "Usuario RRHH") {
        promises.push(fetchData())
      }
      // Cargar abusos para Admin, RRHH y Gestor
      if (rol === "Admin RRHH" || rol === "Usuario RRHH" || rol === "Gestor Casos") {
        promises.push(fetchAbusos())
      }
      
      await Promise.all(promises)
      setAppLoading(false) // Termina la carga de la app
    }

    loadData()

  }, [rol, rolLoading]) // Depende del rol

  const toggleSurvey = (surveyId) => {
    setExpandedSurveys((prev) => ({
  	...prev,
  	[surveyId]: !prev[surveyId],
    }))
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A"
    try {
  	const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  	return date.toLocaleDateString("es-ES", {
  	  day: "2-digit",
  	  month: "short",
  	  year: "numeric",
  	})
    } catch (error) {
  	return "N/A"
    }
  }

  // --- Lógica de Carga y Permisos ---

  // 1. Esperar a que el rol se verifique
  if (rolLoading) {
    return (
  	<div className="loading-container">
  	  <div className="loading-content">
  	    <div className="loading-spinner" />
  	    <p className="loading-text">Verificando permisos...</p>
  	  </div>
  	</div>
    )
  }

  // 2. Si no hay rol (o no autorizado), mostrar Acceso Denegado
  if (!rol) {
    return (
      <div className="dashboard-container">
        <h1 className="dashboard-title">Acceso Denegado</h1>
        <p className="dashboard-subtitle">No tienes un rol asignado para ver este panel.</p>
      </div>
    )
  }

  // 3. Si hay rol, esperar a que carguen las métricas permitidas
  if (appLoading) {
    return (
  	<div className="loading-container">
  	  <div className="loading-content">
  	    <div className="loading-spinner" />
  	    <p className="loading-text">Cargando métricas...</p>
  	  </div>
  	</div>
    )
  }
  
  // --- Definición de Tarjetas (Data) ---
  const metricCards = [
    {
  	title: "Total de Encuestas",
  	value: metrics.totalEncuestas,
  	icon: FileTextIcon,
  	colorClass: "metric-blue",
    },
    {
  	title: "Encuestas Activas",
  	value: metrics.encuestasActivas,
  	icon: CheckCircleIcon,
  	colorClass: "metric-green",
    },
    {
  	title: "Total de Respuestas",
  	value: metrics.totalRespuestas,
  	icon: UsersIcon,
  	colorClass: "metric-violet",
    },
    {
  	title: "Promedio por Encuesta",
  	value: metrics.promedioParticipacion,
  	icon: TrendingUpIcon,
  	colorClass: "metric-orange",
    },
  ]

  const abusosCards = [
    {
  	title: "Total de Casos",
  	value: abusosMetrics.totalCasos,
  	icon: ShieldIcon,
  	colorClass: "metric-blue",
    },
    {
  	title: "Casos Activos",
  	value: abusosMetrics.casosActivos,
  	icon: AlertTriangleIcon,
  	colorClass: "metric-orange",
    },
    {
  	title: "Pendientes",
  	value: abusosMetrics.casosPendientes,
  	icon: ClockIcon,
  	colorClass: "metric-violet",
    },
    {
  	title: "En Proceso",
  	value: abusosMetrics.casosEnProceso,
  	icon: ActivityIcon,
  	colorClass: "metric-green",
    },
    {
  	title: "Finalizados",
  	value: abusosMetrics.casosFinalizados,
  	icon: CheckCircleIcon,
  	colorClass: "metric-green",
    },
  ]

  // --- Renderizado del Dashboard ---
  return (
    <div className="dashboard-container">
  	  {/* Header (Personalizado por Rol) */}
  	  <div className="dashboard-header">
          {rol === "Gestor Casos" ? (
            <h1 className="dashboard-title">Panel de Gestión de Casos</h1>
          ) : (
            <h1 className="dashboard-title">Panel de Métricas</h1>
          )}
  	  </div>      {/* === SECCIÓN DE ENCUESTAS (SOLO PARA ADMIN Y RRHH) === */}
      {(rol === "Admin RRHH" || rol === "Usuario RRHH") && (
        <>
    	  {/* Metrics Grid */}
    	  <div className="metrics-grid">
    	    {metricCards.map((card, index) => {
    	      const Icon = card.icon
    	      return (
    		<div key={index} className={`metric-card ${card.colorClass}`}>
    		  <div className="metric-card-gradient" />
    		  <div className="metric-card-content">
    		    <div className="metric-card-header">
    		      <div className="metric-icon-box">
    			<div className="metric-icon"><Icon /></div>
    		      </div>
    		      <div className="metric-activity-icon"><ActivityIcon /></div>
    		    </div>
    		    <h3 className="metric-title">{card.title}</h3>
    		    <p className="metric-value">{card.value}</p>
    		  </div>
    		  <div className="metric-accent-line" />
    		</div>
    	      )
    	    })}
    	  </div>

    	  {/* Area Distribution */}
    	  <div className="area-section">
    	    <div className="area-header">
    	      <div className="area-icon-box">
    		<div className="area-icon"><BarChartIcon /></div>
    	      </div>
    	      <h2 className="area-title">Respuestas por Área</h2>
    	    </div>
            {Object.keys(metrics.respuestasPorArea).length === 0 ? (
    	      <div className="empty-state">
    		<div className="empty-icon-box"><div className="empty-icon"><FileTextIcon /></div></div>
    		<p className="empty-text">No hay datos de áreas disponibles</p>
    	      </div>
    	    ) : (
    	      <div className="area-list">
    		{Object.entries(metrics.respuestasPorArea)
    		  .sort(([, a], [, b]) => Number(b) - Number(a))
    		  .map(([area, count], index) => {
    		    const maxCount = Math.max(...Object.values(metrics.respuestasPorArea).map(Number))
    		    const percentage = (Number(count) / maxCount) * 100
    		    return (
    		      <div key={area} className="area-item">
    			<div className="area-item-header">
    			  <span className="area-name">{areasMap[area] || area}</span>
    			  <span className="area-count">{count} respuestas</span>
    			</div>
    			<div className="area-progress-bar">
    			  <div className="area-progress-fill" style={{ width: `${percentage}%`, transitionDelay: `${index * 50}ms` }} />
    			</div>
    		      </div>
    		    )
    		  })}
    	      </div>
    	    )}
    	  </div>

    	  {/* Individual Survey Statistics */}
    	  <div className="surveys-section">
    	    <div className="surveys-header">
    	      <div className="surveys-icon-box">
    		<div className="surveys-icon"><LayersIcon /></div>
    	      </div>
    	      <h2 className="surveys-title">Estadísticas por Encuesta</h2>
    	    </div>
            {metrics.encuestasDetalle.length === 0 ? (
    	      <div className="empty-state">
    		<div className="empty-icon-box"><div className="empty-icon"><FileTextIcon /></div></div>
    		<p className="empty-text">No hay encuestas disponibles</p>
    	      </div>
    	    ) : (
    	      <div className="surveys-grid">
    		{metrics.encuestasDetalle.map((encuesta, index) => (
    		  <div key={encuesta.id} className="survey-card">
    		    <div className="survey-card-header clickable" onClick={() => toggleSurvey(encuesta.id)}>
    		      <div className="survey-title-wrapper">
    			<h3 className="survey-title">{encuesta.titulo}</h3>
    			<span className={`survey-status ${encuesta.activa ? "status-active" : "status-inactive"}`}>
    			  {encuesta.activa ? "Activa" : "Inactiva"}
    			</span>
    		      </div>
    		      <div className={`survey-expand-icon ${expandedSurveys[encuesta.id] ? "expanded" : ""}`}>
    			<ChevronDownIcon />
    		      </div>
    		    </div>
    		    <div className="survey-stats">
    		      <div className="survey-stat">
    			<div className="survey-stat-icon"><UsersIcon /></div>
    			<div className="survey-stat-content">
    			  <p className="survey-stat-label">Respuestas</p>
    			  <p className="survey-stat-value">{encuesta.numRespuestas}</p>
    			</div>
    		      </div>
    		      <div className="survey-stat">
    			<div className="survey-stat-icon"><FileTextIcon /></div>
    			<div className="survey-stat-content">
    			  <p className="survey-stat-label">Preguntas</p>
    			  <p className="survey-stat-value">{encuesta.numPreguntas}</p>
    			</div>
    		      </div>
    		    </div>
                <div className="survey-dates">
    		      <div className="survey-date-item">
    			<CalendarIcon />
    			<div className="survey-date-content">
    			  <p className="survey-date-label">Creación</p>
    			  <p className="survey-date-value">{formatDate(encuesta.fechaCreacion)}</p>
    			</div>
    		      </div>
    		      <div className="survey-date-item">
    			<ClockIcon />
    			<div className="survey-date-content">
    			  <p className="survey-date-label">Inicio</p>
    			  <p className="survey-date-value">{formatDate(encuesta.fechaInicio)}</p>
    			</div>
    		      </div>
    		      <div className="survey-date-item">
    			<ClockIcon />
    			<div className="survey-date-content">
    			  <p className="survey-date-label">Fin</p>
    			  <p className="survey-date-value">{formatDate(encuesta.fechaFin)}</p>
    			</div>
    		      </div>
    		    </div>
    		    {encuesta.areas.length > 0 && (
    		      <div className="survey-areas">
    			<p className="survey-areas-label">Áreas:</p>
    			<div className="survey-areas-tags">
    			  {encuesta.areas.map((area, areaIndex) => (
    			    <span key={areaIndex} className="survey-area-tag">
    			      {areasMap[area] || area}
    			    </span>
    			  ))}
    			</div>
    		      </div>
    		    )}
    		    {expandedSurveys[encuesta.id] && (
    		      <div className="survey-details">
    			<div className="survey-details-header">
    			  <h4 className="survey-details-title">Análisis Detallado de Respuestas</h4>
    			</div>
    		    {encuesta.numRespuestas === 0 ? (
    		      <div className="survey-no-responses">
    			<p>No hay respuestas para esta encuesta aún</p>
    		      </div>
    		    ) : (
    		      <div className="questions-analysis">
    			{encuesta.preguntasAnalisis.map((pregunta, qIndex) => (
    			  <div key={qIndex} className="question-analysis">
    			    <div className="question-header">
    			      <h5 className="question-title">{qIndex + 1}. {pregunta.texto}</h5>
    			      <span className="question-responses-count">{pregunta.totalRespuestas} respuestas</span>
    			    </div>
    			    {pregunta.respuestas.length === 0 ? (
    			      <p className="no-responses-text">Sin respuestas</p>
    			    ) : (
    			      <div className="responses-list">
    				{pregunta.respuestas.map((respuesta, rIndex) => (
    				  <div key={rIndex} className="response-item">
    				    <div className="response-header">
    				      <span className="response-option">{respuesta.opcion}</span>
    				      <div className="response-stats">
    					<span className="response-count">{respuesta.count}</span>
    					<span className="response-percentage">{respuesta.porcentaje}%</span>
    				      </div>
    				    </div>
    				    <div className="response-bar">
    				      <div className="response-bar-fill" style={{ width: `${respuesta.porcentaje}%`, transitionDelay: `${rIndex * 50}ms` }} />
    				    </div>
    				  </div>
    				))}
    			      </div>
    			    )}
    			  </div>
    			))}
    		      </div>
    		    )}
    		      </div>
    		    )}
    		  </div>
    		))}
    	      </div>
    	    )}
    	  </div>
        </>
      )}
      {/* === FIN SECCIÓN DE ENCUESTAS === */}


      {/* === SECCIÓN DE VULNERACIONES (PARA TODOS LOS ROLES PERMITIDOS) === */}
      {(rol === "Admin RRHH" || rol === "Usuario RRHH" || rol === "Gestor Casos") && (
  	  <div className="vulneraciones-section">
  	    <div className="vulneraciones-header">
  	      <div className="vulneraciones-icon-box">
  		<div className="vulneraciones-icon"><ShieldIcon /></div>
  	      </div>
  	      <div className="vulneraciones-title-wrapper">
  		<h2 className="vulneraciones-title">Métricas de Vulneraciones</h2>
  		<p className="vulneraciones-subtitle">Información general de casos registrados</p>
  	      </div>
  	    </div>

  	    {/* Abusos Metrics Grid (Visible para todos) */}
  	    <div className="abusos-metrics-grid">
  	      {abusosCards.map((card, index) => {
  		const Icon = card.icon
  		return (
  		  <div key={index} className={`abuso-metric-card ${card.colorClass}`}>
  		    <div className="abuso-card-gradient" />
  		    <div className="abuso-card-content">
  		      <div className="abuso-icon-box">
  			<div className="abuso-icon"><Icon /></div>
  		      </div>
  		      <h3 className="abuso-title">{card.title}</h3>
  		      <p className="abuso-value">{card.value}</p>
  		    </div>
  		    <div className="abuso-accent-line" />
  		  </div>
  		)
  	      })}
  	    </div>

        {/* === DETALLES DE VULNERACIONES (SOLO PARA ADMIN Y GESTOR) === */}
        {(rol === "Admin RRHH" || rol === "Gestor Casos") && (
          <>
    	    {/* Abusos Timeline */}
    	    {Object.keys(abusosMetrics.casosPorMes).length > 0 && (
    	      <div className="abusos-timeline">
    		<h3 className="abusos-timeline-title">Distribución Temporal</h3>
    		<div className="timeline-list">
    		  {Object.entries(abusosMetrics.casosPorMes)
    		    .sort(([a], [b]) => {
                      // Corrección de fechas para ordenar
                      const dateA = new Date(a.replace(/(\w+)\. (\d+)/, '$1 1, $2'));
                      const dateB = new Date(b.replace(/(\w+)\. (\d+)/, '$1 1, $2'));
    		      return dateB - dateA
    		    })
    		    .slice(0, 6)
    		    .map(([mes, count], index) => {
    		      const maxCount = Math.max(...Object.values(abusosMetrics.casosPorMes).map(Number))
    		      const percentage = (Number(count) / maxCount) * 100
    		      return (
    			<div key={mes} className="timeline-item">
    			  <div className="timeline-item-header">
    			    <span className="timeline-month">{mes}</span>
    			    <span className="timeline-count">{count} casos</span>
    			  </div>
    			  <div className="timeline-progress-bar">
    			    <div className="timeline-progress-fill" style={{ width: `${percentage}%`, transitionDelay: `${index * 50}ms` }} />
    			  </div>
    			</div>
    		      )
    		    })}
    		</div>
    	      </div>
    	    )}

    	    {/* Abusos Gestores */}
    	    {Object.keys(abusosMetrics.gestores).length > 0 && (
    	      <div className="abusos-gestores">
    		<h3 className="abusos-gestores-title">Casos por Gestor</h3>
    		<div className="gestores-list">
    		  {Object.entries(abusosMetrics.gestores)
    		    .sort(([, a], [, b]) => Number(b) - Number(a))
    		    .map(([gestor, count], index) => {
    		      const maxCount = Math.max(...Object.values(abusosMetrics.gestores).map(Number))
    		      const percentage = (Number(count) / maxCount) * 100
    		      return (
    			<div key={gestor} className="gestor-item">
    			  <div className="gestor-item-header">
    			    <span className="gestor-name">{gestor}</span>
    			    <span className="gestor-count">{count} casos</span>
    			  </div>
    			  <div className="gestor-progress-bar">
    			    <div className="gestor-progress-fill" style={{ width: `${percentage}%`, transitionDelay: `${index * 50}ms` }} />
    			  </div>
    			</div>
    		      )
    		    })}
    		</div>
    	      </div>
    	    )}
          </>
        )}
        {/* === FIN DETALLES DE VULNERACIONES === */}
  	  </div>
      )}
      {/* === FIN SECCIÓN DE VULNERACIONES === */}

    </div>
  )
}
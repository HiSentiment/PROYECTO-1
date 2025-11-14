"use client"

import { useState } from "react"
import { useNavigate } from "react-router-dom"
import "./PagInicial.css"

export default function PagInicial() {
  const navigate = useNavigate()
  const [activeFeature, setActiveFeature] = useState(0)

  const irAlPanel = () => {
    navigate("/login")
  }


  const APP_DOWNLOAD_URL = "https://firebasestorage.googleapis.com/v0/b/proyecto-1-2e960.firebasestorage.app/o/app%2FGoodJob.apk?alt=media&token=c870ee58-ea7c-43ff-8746-9cfacac249e6";


  const features = [
    {
      title: "Dashboards Interactivos",
      description: "Visualiza métricas en tiempo real del clima laboral con gráficos intuitivos y personalizables.",
      icon: (
        <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
      ),
    },
    {
      title: "Encuestas Inteligentes",
      description: "Crea y gestiona encuestas diarias personalizadas con múltiples formatos de respuesta.",
      icon: (
        <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
    {
      title: "Gestión de Usuarios",
      description: "Administra usuarios web y móviles, áreas y permisos desde un solo lugar.",
      icon: (
        <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      title: "Estadísticas Avanzadas",
      description: "Analiza datos por rango etario, género, áreas y más con reportes detallados.",
      icon: (
        <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="20" x2="12" y2="10" />
          <line x1="18" y1="20" x2="18" y2="4" />
          <line x1="6" y1="20" x2="6" y2="16" />
        </svg>
      ),
    },
    {
      title: "Cargas Masivas",
      description: "Importa grandes volúmenes de datos de usuarios y encuestas de forma rápida y segura.",
      icon: (
        <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
    },
    {
      title: "App Móvil Integrada",
      description: "Los empleados responden encuestas desde cualquier lugar con nuestra app móvil.",
      icon: (
        <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      ),
    },
  ]

  return (
    <div className="landing-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <svg className="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span>Gestión de Clima Laboral</span>
          </div>

          <h1 className="hero-title">
            Transforma el Ambiente Laboral de tu Empresa con <span className="hero-highlight">GoodJob</span>
          </h1>

          <p className="hero-description">
            Plataforma integral que combina encuestas inteligentes, análisis en tiempo real y dashboards interactivos
            para mejorar el clima laboral de tu organización.
          </p>

          <div className="hero-buttons">
            <button className="btn-primary" onClick={irAlPanel}>
              Acceder al Panel de Control
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            

            <a
              href={APP_DOWNLOAD_URL}
              className="btn-secondary"
              target="_blank"
              rel="noopener noreferrer"
              download
            >
              Descargar App Móvil
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </a>
           
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">98%</div>
              <div className="stat-label">Satisfacción</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">50K+</div>
              <div className="stat-label">Usuarios Activos</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">500+</div>
              <div className="stat-label">Empresas</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Soporte</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-header">
          <h2 className="section-title">Funcionalidades del Panel de Control</h2>
          <p className="section-description">
            Todo lo que necesitas para gestionar y mejorar el clima laboral en un solo lugar
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`feature-card ${activeFeature === index ? "active" : ""}`}
              onMouseEnter={() => setActiveFeature(index)}
            >
              <div className="feature-icon-wrapper">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Platform Section */}
      <section className="platform-section">
        <div className="platform-content">
          <div className="platform-text">
            <h2 className="platform-title">Plataforma Web y Móvil Integrada</h2>
            <p className="platform-description">
              GoodJob funciona perfectamente en todos los dispositivos. Los administradores gestionan todo desde el
              panel web, mientras los empleados responden encuestas desde la app móvil.
            </p>

            <div className="platform-features">
              <div className="platform-feature">
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Sincronización en tiempo real con Firebase</span>
              </div>
              <div className="platform-feature">
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Notificaciones push para nuevas encuestas</span>
              </div>
              <div className="platform-feature">
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Interfaz intuitiva y fácil de usar</span>
              </div>
              <div className="platform-feature">
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Seguridad y privacidad garantizada</span>
              </div>
            </div>
          </div>

          <div className="platform-visual">
            <div className="device-mockup">
              <div className="mockup-screen">
                <div className="mockup-header">
                  <div className="mockup-dot"></div>
                  <div className="mockup-dot"></div>
                  <div className="mockup-dot"></div>
                </div>
                <div className="mockup-content">
                  <div className="mockup-chart">
                    <div className="chart-bar" style={{ height: "60%" }}></div>
                    <div className="chart-bar" style={{ height: "85%" }}></div>
                    <div className="chart-bar" style={{ height: "45%" }}></div>
                    <div className="chart-bar" style={{ height: "70%" }}></div>
                    <div className="chart-bar" style={{ height: "90%" }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="section-header">
          <h2 className="section-title">¿Por qué elegir GoodJob?</h2>
          <p className="section-description">Mejora el ambiente laboral con datos reales y accionables</p>
        </div>

        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-number">01</div>
            <h3 className="benefit-title">Decisiones Basadas en Datos</h3>
            <p className="benefit-description">
              Toma decisiones informadas con métricas precisas sobre el clima laboral de tu organización.
            </p>
          </div>

          <div className="benefit-card">
            <div className="benefit-number">02</div>
            <h3 className="benefit-title">Mejora Continua</h3>
            <p className="benefit-description">
              Identifica áreas de mejora y mide el impacto de tus acciones en tiempo real.
            </p>
          </div>

          <div className="benefit-card">
            <div className="benefit-number">03</div>
            <h3 className="benefit-title">Empleados Más Felices</h3>
            <p className="benefit-description">Escucha a tu equipo y crea un ambiente donde todos quieran trabajar.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">¿Listo para transformar tu empresa?</h2>
          <p className="cta-description">
            Únete a las 500+ empresas que ya están mejorando su clima laboral con GoodJob
          </p>
          <button className="btn-cta" onClick={irAlPanel}>
            Comenzar Ahora
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3 className="footer-logo">GoodJob</h3>
            <p className="footer-tagline">Mejorando el clima laboral, un día a la vez</p>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <h4 className="footer-heading">Producto</h4>
              <button className="footer-link" onClick={() => navigate("/features")}>
                Características
              </button>
              <button className="footer-link" onClick={() => navigate("/pricing")}>
                Precios
              </button>
              <button className="footer-link" onClick={() => navigate("/demo")}>
                Demo
              </button>
            </div>
            <div className="footer-column">
              <h4 className="footer-heading">Empresa</h4>
              <button className="footer-link" onClick={() => navigate("/about")}>
                Sobre Nosotros
              </button>
              <button className="footer-link" onClick={() => navigate("/contact")}>
                Contacto
              </button>
              <button className="footer-link" onClick={() => navigate("/blog")}>
                Blog
              </button>
            </div>
            <div className="footer-column">
              <h4 className="footer-heading">Legal</h4>
              <button className="footer-link" onClick={() => navigate("/privacy")}>
                Privacidad
              </button>
              <button className="footer-link" onClick={() => navigate("/terms")}>
                Términos
              </button>
              <button className="footer-link" onClick={() => navigate("/security")}>
                Seguridad
              </button>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 GoodJob. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
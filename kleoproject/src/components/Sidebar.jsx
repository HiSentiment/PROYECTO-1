import { useState, useEffect, useCallback } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import logoLocal from "../assets/logo_kleo.png";
import { auth, db } from "../firebase"; // Se eliminó 'storage'
import { doc, getDoc } from "firebase/firestore"; // Se eliminó 'setDoc' y 'serverTimestamp'
// Se eliminó FaEdit y LogoModal

export default function Sidebar({ rol }) {
  const navigate = useNavigate();

  const [logoUrl, setLogoUrl] = useState(logoLocal);
  const [loadingLogo, setLoadingLogo] = useState(true);

  // Se eliminó toda la lógica de isAdmin, isSuperAdmin y isLogoModalOpen
  // Se eliminó la función handleSaveLogo

  // Cargar logo desde Firestore (esta lógica se mantiene)
  const fetchLogo = useCallback(async () => {
  	try {
  	  setLoadingLogo(true);
  	  const snap = await getDoc(doc(db, "configuracion", "logo"));
  	  if (snap.exists() && snap.data().logo_url) setLogoUrl(snap.data().logo_url);
  	  else setLogoUrl(logoLocal);
  	} catch (err) {
  	  console.error("Error al obtener logo:", err);
  	  setLogoUrl(logoLocal);
  	} finally {
  	  setLoadingLogo(false);
  	}
  }, []);

  useEffect(() => {
  	fetchLogo();
  }, [fetchLogo]);

  const handleLogout = async () => {
  	await auth.signOut();
  	navigate("/login", { replace: true });
  };

  return (
  	<aside className="sidebar">
  	  <div className="sidebar__brand">
        {/* LÓGICA DE CLICK ELIMINADA */}
  		<div className="logo-container">
  		  {loadingLogo ? (
  			<div className="logo-skeleton">Cargando...</div>
  		  ) : (
  			<img src={logoUrl} alt="Kleo Logo" className="login-logo" />
  		  )}
          {/* Icono de editar eliminado */}
  		</div>
  	  </div>

  	  <nav className="sidebar__nav">
        {/* (Tus NavLinks quedan igual) */}
  		<NavLink to="/dashboard" className="sidebar__link">Dashboard</NavLink>

  		{(rol === "Admin RRHH" || rol === "Usuario RRHH" || auth.currentUser?.email === "superadmin@mail.com") && (
  		  <NavLink to="/usuarios" className="sidebar__link">Administración</NavLink>
  		)}

  		{(rol === "Admin RRHH" || rol === "Usuario RRHH" || auth.currentUser?.email === "superadmin@mail.com") && (
  		  <NavLink to="/encuestas" className="sidebar__link">Encuestas</NavLink>
  		)}

  		{(rol === "Admin RRHH" || rol === "Gestor Casos" || auth.currentUser?.email === "superadmin@mail.com" || rol === "Usuario RRHH") && (
  		  <NavLink to="/casos" className="sidebar__link">Casos</NavLink>
  		)}
  		{(rol === "Admin RRHH" || auth.currentUser?.email === "superadmin@mail.com" ) && (
  		  <NavLink to="/auditoria" className="sidebar__link">Registro de Auditoría</NavLink>
  		)}

  		<button
  		  className="sidebar__link logout-btn"
  		  onClick={(e) => {
  			e.preventDefault();
  			handleLogout();
  		  }}
  		>
  		  <strong>Cerrar sesión</strong>
  		</button>
  	  </nav>

      {/* El modal ha sido eliminado de aquí */}
  	</aside>
  );
}
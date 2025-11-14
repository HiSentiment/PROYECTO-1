import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { Outlet } from "react-router-dom";
import { auth } from "../../firebase";
import { getFirestore, doc, getDoc } from "firebase/firestore";

export default function Layout() {
  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRol = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (user) {
          const db = getFirestore();
          const ref = doc(db, "usuariosWeb", user.uid);
          const snap = await getDoc(ref);
          setRol(snap.exists() ? snap.data().rol : null);
        }
      } catch (error) {
        console.error("Error obteniendo rol:", error);
        setRol(null);
      }
      setLoading(false);
    };
    fetchRol();
  }, []);

  if (loading) {
    return (
      <div className="layout" style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="layout">
      <Sidebar rol={rol} />
      <main className="content">
        <section className="content__body">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
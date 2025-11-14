import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import { Navigate } from "react-router-dom";

export default function PrivateRoute({ children }) {
  const [user, loading] = useAuthState(auth);
  if (loading) return <div>Cargando...</div>;
  return user ? children : <Navigate to="/login" />;
}
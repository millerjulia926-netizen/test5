import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "./AuthContext";
import { LoadingState } from "../components/LoadingState";

export function GuestRoute() {
  const { isAuthenticated, isRestoring } = useAuth();

  if (isRestoring) {
    return <LoadingState message="Restoring session..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/notes" replace />;
  }

  return <Outlet />;
}

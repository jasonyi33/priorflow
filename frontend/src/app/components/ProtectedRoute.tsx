import { Navigate, Outlet } from 'react-router';

export function ProtectedRoute() {
  const isAuthed = localStorage.getItem('priorflow_authed') === 'true';
  if (!isAuthed) {
    return <Navigate to="/signin" replace />;
  }
  return <Outlet />;
}

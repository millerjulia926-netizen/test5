import { Link, Outlet } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export function AppShell() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          Notes
        </Link>
        <nav className="app-nav" aria-label="Main navigation">
          {isAuthenticated ? (
            <>
              <Link to="/notes">All notes</Link>
              <Link to="/notes/archived">Archived</Link>
              <Link to="/organize">Organize</Link>
              <Link to="/notes/new">New note</Link>
              <button type="button" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <Link to="/login">Log in</Link>
          )}
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

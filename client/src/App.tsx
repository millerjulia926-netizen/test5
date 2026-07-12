import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import { GuestRoute } from "./auth/GuestRoute";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AppShell } from "./components/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { NoteDetailPage } from "./pages/NoteDetailPage";
import { NoteEditorPage } from "./pages/NoteEditorPage";
import { NotesListPage } from "./pages/NotesListPage";
import { OrganizePage } from "./pages/OrganizePage";

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/notes" replace />} />
          <Route element={<GuestRoute />}>
            <Route path="login" element={<LoginPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="organize" element={<OrganizePage />} />
            <Route path="notes/archived" element={<NotesListPage archived />} />
            <Route path="notes" element={<NotesListPage />} />
            <Route path="notes/new" element={<NoteEditorPage />} />
            <Route path="notes/:id/edit" element={<NoteEditorPage />} />
            <Route path="notes/:id" element={<NoteDetailPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

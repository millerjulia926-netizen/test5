import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
import { AppShell } from "./components/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { NoteEditorPlaceholderPage } from "./pages/NoteEditorPlaceholderPage";
import { NotesPage } from "./pages/NotesPage";
import { OrganizePage } from "./pages/OrganizePage";

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/notes" replace />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="organize" element={<OrganizePage />} />
          <Route path="notes/archived" element={<NotesPage archived />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="notes/new" element={<NoteEditorPlaceholderPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

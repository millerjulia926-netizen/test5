import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthContext";
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
          <Route path="login" element={<LoginPage />} />
          <Route path="organize" element={<OrganizePage />} />
          <Route path="notes/archived" element={<NotesListPage archived />} />
          <Route path="notes" element={<NotesListPage />} />
          <Route path="notes/new" element={<NoteEditorPage />} />
          <Route path="notes/:id/edit" element={<NoteEditorPage />} />
          <Route path="notes/:id" element={<NoteDetailPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

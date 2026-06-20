import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import WorkspaceLayout from "../layouts/WorkspaceLayout.jsx";
import AccountPage from "../pages/AccountPage.jsx";
import AdminPage from "../pages/AdminPage.jsx";
import ConfigurationPage from "../pages/ConfigurationPage.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import FilingPage from "../pages/FilingPage.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import ObligationsPage from "../pages/ObligationsPage.jsx";
import RegistryPage from "../pages/RegistryPage.jsx";
import UnauthorizedPage from "../pages/UnauthorizedPage.jsx";

function LoadingScreen() {
  return (
    <main className="boot-screen">
      <div className="boot-mark">MORIS</div>
      <div className="boot-line" />
    </main>
  );
}

function ProtectedRoute({ children }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "loading") {
    return <LoadingScreen />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <WorkspaceLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="registry" element={<RegistryPage />} />
        <Route path="configuration" element={<ConfigurationPage />} />
        <Route path="obligations" element={<ObligationsPage />} />
        <Route path="filing" element={<FilingPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

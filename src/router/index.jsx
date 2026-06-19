import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import WorkspaceLayout from "../layouts/WorkspaceLayout.jsx";
import AccountPage from "../pages/AccountPage.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import ModulesPage from "../pages/ModulesPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import SecurityPage from "../pages/SecurityPage.jsx";
import SystemPage from "../pages/SystemPage.jsx";
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
        <Route path="system" element={<SystemPage />} />
        <Route path="security" element={<SecurityPage />} />
        <Route path="modules" element={<ModulesPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

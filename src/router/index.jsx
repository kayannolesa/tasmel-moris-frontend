import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import MorisWordmark from "../components/common/MorisWordmark.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import WorkspaceLayout from "../layouts/WorkspaceLayout.jsx";
import AccountPage from "../pages/AccountPage.jsx";
import ActivateAccountPage from "../pages/ActivateAccountPage.jsx";
import AdminPage from "../pages/AdminPage.jsx";
import AssessmentPage from "../pages/AssessmentPage.jsx";
import CollectionsPage from "../pages/CollectionsPage.jsx";
import CompliancePage from "../pages/CompliancePage.jsx";
import ConfigurationPage from "../pages/ConfigurationPage.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import DisputesPage from "../pages/DisputesPage.jsx";
import DocumentsPage from "../pages/DocumentsPage.jsx";
import FinancePage from "../pages/FinancePage.jsx";
import FilingPage from "../pages/FilingPage.jsx";
import IntegrationsPage from "../pages/IntegrationsPage.jsx";
import LicensingPage from "../pages/LicensingPage.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import MigrationQualityPage from "../pages/MigrationQualityPage.jsx";
import NotFoundPage from "../pages/NotFoundPage.jsx";
import ObligationsPage from "../pages/ObligationsPage.jsx";
import PortalServicesPage from "../pages/PortalServicesPage.jsx";
import RegistryPage from "../pages/RegistryPage.jsx";
import ReportingPage from "../pages/ReportingPage.jsx";
import UnauthorizedPage from "../pages/UnauthorizedPage.jsx";
import WorkflowPage from "../pages/WorkflowPage.jsx";

function LoadingScreen() {
  return (
    <main className="boot-screen">
      <div className="boot-brand">
        <MorisWordmark className="boot-brand__mark" />
        <span>Preparing secure workspace</span>
        <div className="boot-line" />
      </div>
    </main>
  );
}

function ProtectedRoute({ children, allowPasswordChange = false }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === "loading") {
    return <LoadingScreen />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (auth.requiresPasswordChange && !allowPasswordChange) {
    return <Navigate to="/activate-account" replace state={{ from: location }} />;
  }

  if (!auth.requiresPasswordChange && allowPasswordChange) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/activate-account"
        element={
          <ProtectedRoute allowPasswordChange>
            <ActivateAccountPage />
          </ProtectedRoute>
        }
      />
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
        <Route path="assessment" element={<AssessmentPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="workflow" element={<WorkflowPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="collections" element={<CollectionsPage />} />
        <Route path="compliance" element={<CompliancePage />} />
        <Route path="disputes" element={<DisputesPage />} />
        <Route path="licensing" element={<LicensingPage />} />
        <Route path="portal" element={<PortalServicesPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="reporting" element={<ReportingPage />} />
        <Route path="migration" element={<MigrationQualityPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="unauthorized" element={<UnauthorizedPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

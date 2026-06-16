import { Navigate, Route, Routes } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import NewsPage, { NewsDetailPage, AppNewsPage, AppNewsDetailPage } from "./pages/NewsPage";
import AuthPage from "./pages/AuthPage";
import AppLayout from "./components/Layout/AppLayout";
import DashboardRouter from "./pages/DashboardRouter";
import AppFeedbackPage from "./pages/AppFeedbackPage";
import ProfilePage from "./pages/ProfilePage";
import CommunitiesPage from "./pages/CommunitiesPage";
import AppIssuesPage from "./pages/AppIssuesPage";
import AdminDashboard from "./AdminDashboard";
import SuperAdminDashboard from "./SuperAdminDashboard";
import FeedbackStats from "./FeedbackStats";
import { getToken, getRole } from "./api/client";
import "./index.css";

function ProtectedRole({ role, children }) {
  const jwt = getToken();
  const userRole = getRole();
  if (!jwt) return <Navigate to="/login" replace />;
  if (role && userRole !== role) return <Navigate to="/app/dashboard" replace />;
  return children;
}

function ProtectedAdminPanel({ children }) {
  const jwt = getToken();
  const userRole = getRole();
  if (!jwt) return <Navigate to="/login" replace />;
  if (userRole !== "admin" && userRole !== "superadmin")
    return <Navigate to="/app/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/news" element={<NewsPage />} />
      <Route path="/news/:topicId" element={<NewsDetailPage />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/register" element={<AuthPage mode="register" />} />

      <Route path="/app" element={<AppLayout />}>
        <Route path="dashboard" element={<DashboardRouter />} />
        <Route path="issues" element={<AppIssuesPage />} />
        <Route path="feedback" element={<AppFeedbackPage />} />
        <Route path="news" element={<AppNewsPage />} />
        <Route path="news/:topicId" element={<AppNewsDetailPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="communities" element={<CommunitiesPage />} />
        <Route
          path="admin"
          element={
            <ProtectedRole role="admin">
              <AdminDashboard />
            </ProtectedRole>
          }
        />
        <Route
          path="superadmin"
          element={
            <ProtectedRole role="superadmin">
              <SuperAdminDashboard />
            </ProtectedRole>
          }
        />
        <Route path="feedback-stats" element={<ProtectedAdminPanel><FeedbackStats /></ProtectedAdminPanel>} />
      </Route>

      {/* Legacy redirects */}
      <Route path="/user-dashboard" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/admin-dashboard" element={<Navigate to="/app/admin" replace />} />
      <Route path="/superadmin-dashboard" element={<Navigate to="/app/superadmin" replace />} />
      <Route path="/feedback" element={<Navigate to="/app/feedback" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

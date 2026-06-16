import { Navigate } from "react-router-dom";
import { getRole } from "../api/client";
import UserDashboard from "./UserDashboard";
import AdminDashboard from "../AdminDashboard";
import SuperAdminDashboard from "../SuperAdminDashboard";

export default function DashboardRouter() {
  const role = getRole();
  if (role === "superadmin") return <SuperAdminDashboard />;
  if (role === "admin") return <AdminDashboard />;
  if (role === "user") return <UserDashboard />;
  return <Navigate to="/login" replace />;
}

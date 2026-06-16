import { Outlet, Navigate } from "react-router-dom";
import { AppHeader } from "./Header";
import { getToken } from "../../api/client";

export default function AppLayout() {
  if (!getToken()) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export function PublicLayout({ children }) {
  return <div className="min-h-screen flex flex-col">{children}</div>;
}

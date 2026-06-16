import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Button from "../ui/Button";
import { logout, apiFetch, fileUrl } from "../../api/client";

export default function PublicHeader() {
  const jwt = localStorage.getItem("jwt");

  return (
    <header className="sticky top-0 z-50 border-b border-civic-800/20 bg-civic-900 text-white shadow-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link to="/" className="text-xl font-bold tracking-tight">
          Civic Review Portal
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4" aria-label="Main navigation">
          <Link to="/" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10">
            Home
          </Link>
          <Link to="/news" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10">
            News
          </Link>
          <Button to="/login" size="sm" className="!bg-white !text-civic-900 hover:!bg-civic-50">
            Login
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem("role");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    apiFetch("/users/me")
      .then((p) => setProfile(p))
      .catch(() => {});
  }, []);

  const links = [
    { to: "/app/dashboard", label: "Dashboard" },
    { to: "/app/issues", label: "Issues" },
    { to: "/app/feedback", label: "Feedback" },
    { to: "/app/news", label: "News" },
    { to: "/app/communities", label: "Communities" },
  ];

  if (role === "admin") links.push({ to: "/app/admin", label: "Admin" });
  if (role === "superadmin") links.push({ to: "/app/superadmin", label: "Super Admin" });

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/app/dashboard" className="text-lg font-bold text-civic-800">
          Civic Review
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`rounded-lg px-2 py-1.5 text-sm font-medium transition-all ${
                location.pathname === l.to
                  ? "bg-civic-50 text-civic-800 font-semibold"
                  : "text-slate-600 hover:bg-civic-50 hover:text-civic-800"
              } sm:px-3`}
            >
              {l.label}
            </Link>
          ))}
          {/* Circular Profile Avatar */}
          <Link
            to="/app/profile"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-civic-100 font-bold text-civic-700 hover:ring-2 hover:ring-civic-600 transition-all overflow-hidden shadow-inner ml-2 ${
              location.pathname === "/app/profile" ? "ring-2 ring-civic-600" : ""
            }`}
            title="View Profile"
          >
            {profile?.avatarDriveId ? (
              <img src={fileUrl(profile.avatarDriveId)} alt="" className="h-full w-full object-cover" />
            ) : (
              (profile?.name || "?")[0].toUpperCase()
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-civic-900 text-slate-300">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-lg font-bold text-white">Civic Review Portal</p>
            <p className="mt-2 text-sm">Building a cleaner society through community action and accountability.</p>
          </div>
          <div>
            <p className="font-semibold text-white">Explore</p>
            <div className="mt-2 flex flex-col gap-1 text-sm">
              <Link to="/news" className="hover:text-white">News</Link>
              <Link to="/login" className="hover:text-white">Login</Link>
              <Link to="/register" className="hover:text-white">Register</Link>
            </div>
          </div>
          <div>
            <p className="font-semibold text-white">Mission</p>
            <p className="mt-2 text-sm">For the betterment of society and cleanliness of our surroundings and country.</p>
          </div>
        </div>
        <p className="mt-8 border-t border-white/10 pt-6 text-center text-xs">
          © {new Date().getFullYear()} Civic Review Portal. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

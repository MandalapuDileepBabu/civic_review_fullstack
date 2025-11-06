import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Hero from "./Hero";
import Auth from "./Auth";
import News from "./News"; // import your news component
import UserDashboard from "./UserDashboard";
import AdminDashboard from "./AdminDashboard";
import SuperAdminDashboard from "./SuperAdminDashboard";
import "./index.css";
import FeedbackUser from './pages/FeedbackUser.jsx';
import FeedbackStats from "./FeedbackStats";

function App() {
  const jwt = localStorage.getItem("jwt");
  const role = localStorage.getItem("role");

  return (
    <Router>
      <Routes>
        {/* Home page */}
        <Route path="/" element={<Hero />} />

        {/* News page */}
        <Route path="/news" element={<News />} />

        {/* Login / Auth page */}
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />

        {/* Protected routes */}
        <Route
          path="/user-dashboard"
          element={jwt && role === "user" ? <UserDashboard /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin-dashboard"
          element={jwt && role === "admin" ? <AdminDashboard /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/superadmin-dashboard"
          element={jwt && role === "superadmin" ? <SuperAdminDashboard /> : <Navigate to="/login" replace />}
        />
        <Route path="/feedback" element={<FeedbackUser />} />

        {/* Catch all - redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" />} />
        <Route path="/feedback-stats" element={<FeedbackStats />} />
      </Routes>
    </Router>
  );
}

export default App;

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const combinedWavePathD =
  "M0,40 C360,55 720,25 1080,40 C1440,55 1800,25 2160,40 L2160,160 L0,160 Z";

const CombinedWave = () => (
  <svg
    viewBox="0 0 2160 160"
    preserveAspectRatio="none"
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "200%",
      height: "100%",
      opacity: 0.55,
      borderRadius: "8px",
      mixBlendMode: "screen",
      pointerEvents: "none",
      animation: `waveHorizontal 18s ease-in-out infinite`,
      transformOrigin: "center bottom",
      zIndex: -1,
    }}
  >
    <defs>
      <linearGradient id="combinedWaveGradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="rgba(200, 220, 255, 0.4)" />
        <stop offset="50%" stopColor="rgba(200, 220, 255, 0)" />
        <stop offset="100%" stopColor="rgba(200, 220, 255, 0.4)" />
      </linearGradient>
    </defs>
    <path fill="url(#combinedWaveGradient)" d={combinedWavePathD} />
  </svg>
);

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const jwt = localStorage.getItem("jwt");

  const fetchStats = async () => {
    try {
      const res = await fetch("http://localhost:4000/superadmin/dashboard", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const data = await res.json();
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error("Stats fetch error:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("http://localhost:4000/superadmin/users", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error("Users fetch error:", err);
    }
  };

  const createAdmin = async () => {
    if (!adminName || !adminEmail || !adminPassword) {
      setMessage("❌ Fill all fields");
      return;
    }
    try {
      const res = await fetch("http://localhost:4000/superadmin/create-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          name: adminName,
          email: adminEmail,
          password: adminPassword,
        }),
      });
      const data = await res.json();
      if (data.error) setMessage(`❌ ${data.error}`);
      else {
        setMessage("✅ Admin created successfully!");
        fetchUsers();
        setAdminName("");
        setAdminEmail("");
        setAdminPassword("");
      }
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const containerStyle = {
    minHeight: "100vh",
    width: "100vw",
    backgroundColor: "#2a3b57",
    padding: 20,
    boxSizing: "border-box",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    color: "#eee",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  };

  const headerBarStyle = {
    position: "sticky",
    top: 0,
    zIndex: 1000,
    backgroundColor: "#2a3b57",
    width: "100%",
    maxWidth: 900,
    margin: "0 auto 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 20px",
    boxSizing: "border-box",
    color: "#eee",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  };

  const adminTitleStyle = {
    margin: 0,
    paddingLeft: 14,
    alignSelf: "flex-start",
  };

  const buttonBaseStyle = {
    position: "relative",
    overflow: "hidden",
    padding: "12px 24px",
    fontWeight: "600",
    fontSize: 16,
    borderRadius: 16,
    border: "1px solid #fff",
    backgroundColor: "transparent",
    color: "#eee",
    cursor: "pointer",
    transition: "background-color 0.3s",
  };

  const logoutHoverStyle = {
    backgroundColor: "rgba(42, 59, 87, 1)",
  };

  const createAdminButtonStyle = {
    ...buttonBaseStyle,
    borderRadius: 25,
    marginTop: 16,
  };

  const sectionStyle = {
    maxWidth: 700,
    width: "100%",
    backgroundColor: "transparent",
    borderRadius: 8,
    padding: "20px 20px 30px 20px",
    marginBottom: 40,
    overflowWrap: "break-word",
  };

  const inputStyle = {
    display: "block",
    width: "95%",
    padding: "8px 12px",
    marginTop: 12,
    borderRadius: 12,
    border: "1.5px solid rgba(255,255,255,0.3)",
    backgroundColor: "transparent",
    color: "#eee",
    fontSize: 16,
    outline: "none",
    boxSizing: "border-box",
  };

  const tableContainerStyle = {
    maxWidth: 900,
    width: "100%",
    backgroundColor: "transparent",
    borderRadius: 8,
    padding: 20,
    boxShadow: "none",
    overflowX: "auto",
  };

  const thStyle = {
    borderBottom: "2px solid #ddd",
    padding: "12px",
    borderLeft: "2px solid rgba(255,255,255,0.6)",
    borderRight: "2px solid rgba(255,255,255,0.6)",
    borderTop: "2px solid rgba(255,255,255,0.6)",
    transition: "box-shadow 0.3s ease",
    whiteSpace: "nowrap",
  };

  const tdStyle = {
    padding: 12,
    verticalAlign: "top",
    borderBottom: "1px solid #eee",
    borderLeft: "2px solid rgba(255,255,255,0.6)",
    borderRight: "2px solid rgba(255,255,255,0.6)",
    borderTop: "2px solid rgba(255,255,255,0.6)",
    transition: "box-shadow 0.3s ease",
  };

  const onButtonHover = (e) => {
    e.currentTarget.style.backgroundColor = "transparent";
    e.currentTarget.style.color = "#000";
  };

  const onButtonLeave = (e) => {
    e.currentTarget.style.backgroundColor = "tranasparent";
    e.currentTarget.style.color = "#eee";
  };

  return (
    <>
      <style>{`
        @keyframes waveHorizontal {
          0% { transform: translateX(0); }
          50% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }

        tbody tr:nth-child(even) {
          background-color: rgba(255, 255, 255, 0.05);
        }

        tbody tr:hover {
          background-color: rgba(100, 130, 180, 0.15);
          cursor: pointer;
        }

        input:focus, textarea:focus {
          outline: none;
          border-color: #6490b4;
          box-shadow: 0 0 5px rgba(100, 144, 180, 0.6);
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }

        button:hover {
          transform: scale(1.03);
          transition: transform 0.3s ease;
        }

        .message-success {
          color: lightgreen;
          font-weight: 600;
          margin-top: 12px;
        }

        .message-error {
          color: #f88;
          font-weight: 600;
          margin-top: 12px;
        }
      `}</style>

      <div style={containerStyle}>
        <header style={headerBarStyle}>
          <h2 style={adminTitleStyle}>👑 SuperAdmin Dashboard</h2>

          <button
            onClick={logout}
            style={buttonBaseStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = logoutHoverStyle.backgroundColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = buttonBaseStyle.backgroundColor;
            }}
          >
            Logout
            <span
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "200%",
                height: "100%",
                opacity: 0.75,
                borderRadius: "16px",
                mixBlendMode: "screen",
                pointerEvents: "none",
                animation: "waveHorizontal 18s ease-in-out infinite",
                transformOrigin: "center bottom",
                zIndex: -1,
              }}
            >
              <CombinedWave />
            </span>
          </button>
        </header>

        <section style={sectionStyle}>
          <h3>📊 Stats</h3>
          <pre
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: 8,
              padding: 12,
              whiteSpace: "pre-wrap",
              maxHeight: 200,
              overflowY: "auto",
              color: "#ddd",
            }}
          >
            {JSON.stringify(stats, null, 2)}
          </pre>
        </section>

        <section style={sectionStyle}>
          <h3>➕ Create New Admin</h3>
          <input
            style={inputStyle}
            type="text"
            placeholder="Name"
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
          />
          <input
            style={inputStyle}
            type="email"
            placeholder="Email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
          />
          <input
            style={inputStyle}
            type="password"
            placeholder="Password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
          />
          <button
            style={createAdminButtonStyle}
            onClick={createAdmin}
            onMouseEnter={onButtonHover}
            onMouseLeave={onButtonLeave}
          >
            Create Admin
            <span
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "200%",
                height: "100%",
                opacity: 0.75,
                borderRadius: "25px",
                mixBlendMode: "screen",
                pointerEvents: "none",
                animation: "waveHorizontal 18s ease-in-out infinite",
                transformOrigin: "center bottom",
                zIndex: -1,
              }}
            >
              <CombinedWave />
            </span>
          </button>
          {message && (
            <p
              className={message.startsWith("✅") ? "message-success" : "message-error"}
            >
              {message}
            </p>
          )}
        </section>

        <section style={tableContainerStyle}>
          <h3>👥 All Users</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", color: "#eee" }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, borderLeft: "2px solid rgba(255,255,255,0.6)" }}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Role</th>
                <th style={{ ...thStyle, borderRight: "2px solid rgba(255,255,255,0.6)" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.uid}>
                  <td style={{ ...tdStyle, borderLeft: "2px solid rgba(255,255,255,0.6)" }}>{u.name || "—"}</td>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>{u.role}</td>
                  <td style={{ ...tdStyle, borderRight: "2px solid rgba(255,255,255,0.6)" }}>
                    {new Date(u.createdAt?._seconds * 1000).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}

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
        <stop offset="0%" stopColor="rgba(200, 220, 255, 0.6)" />
        <stop offset="50%" stopColor="rgba(200, 220, 255, 0.2)" />
        <stop offset="100%" stopColor="rgba(200, 220, 255, 0.6)" />
      </linearGradient>
    </defs>
    <path fill="url(#combinedWaveGradient)" d={combinedWavePathD} />
  </svg>
);

export default function AdminDashboard() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const jwt = localStorage.getItem("jwt");
  const [logoutHover, setLogoutHover] = useState(false);

  const fetchIssues = async () => {
    try {
      const res = await fetch("http://localhost:4000/issues", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else setIssues(data.issues);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const updateStatus = async (issueId, status) => {
    try {
      const res = await fetch(`http://localhost:4000/issues/${issueId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else fetchIssues();
    } catch (err) {
      console.error(err);
    }
  };

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
    backgroundColor: "rgba(42, 59, 87, 0.8)",
    color: "#eee",
    cursor: "pointer",
    transition: "background-color 0.3s, box-shadow 0.3s",
  };

  const buttonHoverStyle = {
    backgroundColor: "rgba(42, 59, 87, 1)",
    boxShadow: "0 0 8px rgba(100, 130, 180, 0.6)",
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

        button:hover {
          transform: scale(1.03);
          transition: transform 0.3s ease;
        }
      `}</style>

      <div style={containerStyle}>
      <header style={headerBarStyle}>
  <h2 style={adminTitleStyle}>🛠️ Admin Dashboard</h2>
  <div style={{ display: "flex", gap: "10px" }}>
    {/* Feedback Stats Button */}
    <button
      onClick={() => navigate("/feedback-stats")}
      style={logoutHover ? { ...buttonBaseStyle, ...buttonHoverStyle } : buttonBaseStyle}
      onMouseEnter={() => setLogoutHover(true)}
      onMouseLeave={() => setLogoutHover(false)}
    >
      Feedback Stats
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: logoutHover ? "220%" : "200%",
          height: "100%",
          opacity: logoutHover ? 0.85 : 0.75,
          borderRadius: "16px",
          mixBlendMode: "screen",
          pointerEvents: "none",
          animation: "waveHorizontal 18s ease-in-out infinite",
          transformOrigin: "center bottom",
          transition: "opacity 0.3s ease, width 0.3s ease",
          zIndex: -1,
        }}
      >
        <CombinedWave />
      </span>
    </button>

    {/* Logout Button */}
    <button
      onClick={logout}
      style={logoutHover ? { ...buttonBaseStyle, ...buttonHoverStyle } : buttonBaseStyle}
      onMouseEnter={() => setLogoutHover(true)}
      onMouseLeave={() => setLogoutHover(false)}
    >
      Logout
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: logoutHover ? "220%" : "200%",
          height: "100%",
          opacity: logoutHover ? 0.85 : 0.75,
          borderRadius: "16px",
          mixBlendMode: "screen",
          pointerEvents: "none",
          animation: "waveHorizontal 18s ease-in-out infinite",
          transformOrigin: "center bottom",
          transition: "opacity 0.3s ease, width 0.3s ease",
          zIndex: -1,
        }}
      >
        <CombinedWave />
      </span>
    </button>
  </div>
</header>

        <div style={tableContainerStyle}>
          <h3>All Issues</h3>
          {loading ? (
            <p>Loading...</p>
          ) : issues.length === 0 ? (
            <p>No issues reported.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", color: "#eee" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, borderLeft: "2px solid rgba(255,255,255,0.6)" }}>Issue Name</th>
                  <th style={thStyle}>Location</th>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Image</th>
                  <th style={{ ...thStyle, borderRight: "2px solid rgba(255,255,255,0.6)" }}>Change Status</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.issue_id}>
                    <td style={{ ...tdStyle, borderLeft: "2px solid rgba(255,255,255,0.6)" }}>{issue.issue_name}</td>
                    <td style={tdStyle}>{issue.location}</td>
                    <td style={{ ...tdStyle, whiteSpace: "pre-wrap" }}>{issue.description}</td>
                    <td style={tdStyle}>{issue.date ? new Date(issue.date).toLocaleString() : "N/A"}</td>
                    <td style={tdStyle}>{issue.status}</td>
                    <td style={tdStyle}>
                      {issue.image ? (
                        <img src={issue.image} alt="issue" style={{ width: 80, borderRadius: 4 }} />
                      ) : (
                        "No Image"
                      )}
                    </td>
                    <td style={{ ...tdStyle, borderRight: "2px solid rgba(255,255,255,0.6)" }}>
                      {issue.status === "pending" && (
                        <button onClick={() => updateStatus(issue.issue_id, "on process")}>Start</button>
                      )}
                      {issue.status === "on process" && (
                        <button onClick={() => updateStatus(issue.issue_id, "solved")}>Solve</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function FeedbackStats() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const jwt = localStorage.getItem("jwt");

  // Fetch all feedbacks
  const fetchFeedbacks = async () => {
    try {
      const res = await fetch("http://localhost:4000/feedback", {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else setFeedbacks(data.feedbacks);
    } catch (err) {
      console.error("Error fetching feedbacks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  // Basic stats
  const totalFeedbacks = feedbacks.length;
  const avgRating =
    totalFeedbacks > 0
      ? (
          feedbacks.reduce((sum, fb) => sum + (fb.rating || 0), 0) /
          totalFeedbacks
        ).toFixed(2)
      : 0;

  // Styling
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
  };

  const buttonStyle = {
    padding: "10px 20px",
    borderRadius: 12,
    border: "1px solid #fff",
    backgroundColor: "rgba(255,255,255,0.1)",
    color: "#fff",
    cursor: "pointer",
    transition: "0.3s",
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
    whiteSpace: "nowrap",
  };

  const tdStyle = {
    padding: 12,
    verticalAlign: "top",
    borderBottom: "1px solid #eee",
    borderLeft: "2px solid rgba(255,255,255,0.6)",
    borderRight: "2px solid rgba(255,255,255,0.6)",
    borderTop: "2px solid rgba(255,255,255,0.6)",
  };

  return (
    <div style={containerStyle}>
      <header style={headerBarStyle}>
        <h2>📊 Feedback Statistics</h2>
        <button style={buttonStyle} onClick={() => navigate("/admin-dashboard")}>
          ← Back to Dashboard
        </button>
      </header>

      <div style={{ maxWidth: 900, textAlign: "center", marginBottom: 20 }}>
        <h3>Total Feedbacks: {totalFeedbacks}</h3>
        <h3>Average Rating: ⭐ {avgRating}</h3>
      </div>

      <div style={tableContainerStyle}>
        {loading ? (
          <p>Loading...</p>
        ) : feedbacks.length === 0 ? (
          <p>No feedbacks yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", color: "#eee" }}>
            <thead>
              <tr>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Rating</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Date</th>
              </tr>
            </thead>
            <tbody>
              {feedbacks.map((fb) => (
                <tr key={fb.id}>
                  <td style={tdStyle}>{fb.userName || "Anonymous"}</td>
                  <td style={tdStyle}>{fb.location || "N/A"}</td>
                  <td style={tdStyle}>{fb.rating || 0}</td>
                  <td style={tdStyle}>{fb.category || "General"}</td>
                  <td style={{ ...tdStyle, whiteSpace: "pre-wrap" }}>{fb.description}</td>
                  <td style={tdStyle}>
                    {fb.createdAt
                      ? new Date(fb.createdAt._seconds * 1000).toLocaleString()
                      : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// SVG wave animation component
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

export default function UserDashboard() {
  const [issues, setIssues] = useState([]);
  const [issueName, setIssueName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutHover, setLogoutHover] = useState(false);
  const [postHover, setPostHover] = useState(false);
  const [coords, setCoords] = useState(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const navigate = useNavigate();
  const jwt = localStorage.getItem("jwt");

  const fetchMyIssues = async () => {
    try {
      const res = await fetch("http://localhost:4000/my-issues", {
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
    fetchMyIssues();
  }, []);

  // ✅ Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map("map", { zoomControl: true }).setView([20.5937, 78.9629], 5);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapRef.current);

      // Try to get user current location (browser-based)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            mapRef.current.setView([lat, lon], 13);
            setCoords({ lat, lon });

            // Add marker
            markerRef.current = L.marker([lat, lon]).addTo(mapRef.current);
            reverseGeocode(lat, lon);
          },
          (err) => console.warn("Geolocation not available:", err)
        );
      }

      // When user clicks on map, update marker + location input
      mapRef.current.on("click", (e) => {
        const { lat, lng } = e.latlng;
        setCoords({ lat, lon: lng });
        reverseGeocode(lat, lng);

        if (markerRef.current) markerRef.current.remove();
        markerRef.current = L.marker([lat, lng]).addTo(mapRef.current);
      });
    }
  }, []);

  // ✅ Reverse geocode (get address from coordinates)
  const reverseGeocode = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const data = await res.json();
      if (data && data.display_name) setLocation(data.display_name);
    } catch (err) {
      console.error("Reverse geocoding failed:", err);
    }
  };

  const postIssue = async () => {
    if (!issueName || !location || !description) {
      alert("Please fill all fields");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("issue_name", issueName);
      formData.append("location", location);
      formData.append("description", description);
      if (coords) {
        formData.append("latitude", coords.lat);
        formData.append("longitude", coords.lon);
      }
      if (image) formData.append("image", image);

      const res = await fetch("http://localhost:4000/issues", {
        method: "POST",
        headers: { Authorization: `Bearer ${jwt}` },
        body: formData,
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else {
        alert("✅ Issue posted successfully!");
        setIssueName("");
        setLocation("");
        setDescription("");
        setImage(null);
        fetchMyIssues();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateStatus = async (issueId, status) => {
    if (!["pending", "issue resolved"].includes(status)) {
      alert("❌ Invalid status update.");
      return;
    }
    try {
      const res = await fetch(`http://localhost:4000/issues/${issueId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else fetchMyIssues();
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
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 20px",
    boxSizing: "border-box",
    color: "#eee",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
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

  const tableContainerStyle = {
    maxWidth: 900,
    width: "100%",
    backgroundColor: "transparent",
    borderRadius: 8,
    padding: 20,
    boxShadow: "none",
    overflowX: "auto",
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

  const textareaStyle = { ...inputStyle, height: 80, resize: "vertical" };

  const fileButtonStyle = {
    marginTop: 12,
    padding: "10px 24px",
    borderRadius: 20,
    border: "1.5px solid rgba(255, 255, 255, 0.3)",
    backgroundColor: "transparent",
    color: "#eee",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-block",
  };

  const buttonBaseStyle = {
    position: "relative",
    overflow: "hidden",
    padding: "12px 24px",
    fontWeight: "600",
    fontSize: 16,
    borderRadius: 25,
    border: "1.5px solid rgba(255,255,255,0.5)",
    backgroundColor: "rgba(42, 59, 87, 0.8)",
    color: "#eee",
    cursor: "pointer",
    transition: "background-color 0.3s, box-shadow 0.3s",
  };

  const buttonHoverStyle = {
    backgroundColor: "rgba(42, 59, 87, 1)",
    boxShadow: "0 0 8px rgba(100, 130, 180, 0.6)",
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

        #map {
          width: 100%;
          height: 300px;
          border-radius: 10px;
          margin-top: 12px;
        }
      `}</style>

      <div style={containerStyle}>
        <header style={headerBarStyle}>
          <h2 style={{ margin: 0, paddingLeft: 14 }}>👤 User Dashboard</h2>
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
                borderRadius: "25px",
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
          <button
  onClick={() => navigate("/feedback")}
  style={postHover ? { ...buttonBaseStyle, ...buttonHoverStyle } : buttonBaseStyle}
  onMouseEnter={() => setPostHover(true)}
  onMouseLeave={() => setPostHover(false)}
>
  Feedback
  <span
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: postHover ? "220%" : "200%",
      height: "100%",
      opacity: postHover ? 0.85 : 0.75,
      borderRadius: "25px",
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

        </header>

        <div style={sectionStyle}>
          <h3 style={{ marginBottom: 10 }}>Report a New Issue</h3>
          <input
            style={inputStyle}
            type="text"
            placeholder="Issue Name"
            value={issueName}
            onChange={(e) => setIssueName(e.target.value)}
          />
          <input
            style={inputStyle}
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <div id="map"></div>
          <textarea
            style={textareaStyle}
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            id="fileInput"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => setImage(e.target.files ? e.target.files[0] : null)}
          />
          <div
            style={fileButtonStyle}
            onClick={() => document.getElementById("fileInput").click()}
            tabIndex={0}
            role="button"
            onKeyPress={(e) => (e.key === "Enter" ? document.getElementById("fileInput").click() : null)}
          >
            {image ? image.name : "Choose File"}
          </div>
          <button
            onClick={postIssue}
            style={postHover ? { ...buttonBaseStyle, ...buttonHoverStyle } : buttonBaseStyle}
            onMouseEnter={() => setPostHover(true)}
            onMouseLeave={() => setPostHover(false)}
          >
            Post Issue
            <span
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: postHover ? "220%" : "200%",
                height: "100%",
                opacity: postHover ? 0.85 : 0.75,
                borderRadius: "25px",
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

        <div style={tableContainerStyle}>
          <h3>My Issues</h3>
          {loading ? (
            <p>Loading...</p>
          ) : issues.length === 0 ? (
            <p>No issues reported yet.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", color: "#eee" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, borderLeft: "2px solid rgba(255,255,255,0.6)" }}>Issue Name</th>
                  <th style={thStyle}>Location</th>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Image</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, borderRight: "2px solid rgba(255,255,255,0.6)" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.issue_id}>
                    <td style={{ ...tdStyle, borderLeft: "2px solid rgba(255,255,255,0.6)" }}>{issue.issue_name}</td>
                    <td style={tdStyle}>{issue.location}</td>
                    <td style={{ ...tdStyle, whiteSpace: "pre-wrap" }}>{issue.description}</td>
                    <td style={tdStyle}>{issue.date ? new Date(issue.date).toLocaleString() : "No date"}</td>
                    <td style={tdStyle}>
                      {issue.image ? (
                        <img src={issue.image} alt="issue" style={{ width: 100, borderRadius: 4 }} />
                      ) : (
                        "No image"
                      )}
                    </td>
                    <td style={tdStyle}>{issue.status}</td>
                    <td style={{ ...tdStyle, borderRight: "2px solid rgba(255,255,255,0.6)" }}>
                      <span
                        onClick={() => updateStatus(issue.issue_id, "pending")}
                        style={{
                          cursor: issue.status === "pending" ? "default" : "pointer",
                          marginRight: 12,
                          fontSize: 20,
                        }}
                        title="Mark as Pending"
                      >
                        ⏳
                      </span>
                      <span
                        onClick={() => updateStatus(issue.issue_id, "issue resolved")}
                        style={{
                          cursor: issue.status === "issue resolved" ? "default" : "pointer",
                          fontSize: 20,
                        }}
                        title="Mark as Issue Resolved"
                      >
                        ✅
                      </span>
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

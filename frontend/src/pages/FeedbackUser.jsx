import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function FeedbackUser() {
  const [location, setLocation] = useState("");
  const [sector, setSector] = useState(""); // ✅ new field
  const [rating, setRating] = useState(0);
  const [description, setDescription] = useState("");
  const [myFeedbacks, setMyFeedbacks] = useState([]);
  const jwt = localStorage.getItem("jwt");
  const navigate = useNavigate();

  // Fetch user's previous feedbacks
  const fetchMyFeedbacks = async () => {
    try {
      const res = await fetch("http://localhost:4000/my-feedback", {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });
      const data = await res.json();
      if (data.feedbacks) setMyFeedbacks(data.feedbacks);
    } catch (err) {
      console.error("Error fetching feedbacks:", err);
    }
  };

  useEffect(() => {
    fetchMyFeedbacks();
  }, []);

  const handleSubmit = async () => {
    if (!location || !sector || !rating || !description.trim()) {
      alert("Please fill in all fields");
      return;
    }

    try {
      const res = await fetch("http://localhost:4000/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ location, rating, description, sector }), // ✅ added sector
      });

      const data = await res.json();
      if (data.error) alert(data.error);
      else {
        alert("✅ Feedback submitted successfully!");
        setLocation("");
        setSector(""); // ✅ reset
        setRating(0);
        setDescription("");
        fetchMyFeedbacks(); // refresh list
      }
    } catch (err) {
      console.error("Error submitting feedback:", err);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        backgroundColor: "#1e293b",
        color: "#eee",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "40px 0",
        overflowY: "auto",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      <h2 style={{ marginBottom: 20, fontSize: 28 }}>📝 User Feedback</h2>

      <div
        style={{
          width: "90%",
          maxWidth: 600,
          backgroundColor: "rgba(255,255,255,0.08)",
          padding: 20,
          borderRadius: 12,
          boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
          marginBottom: 30,
        }}
      >
        <input
          type="text"
          placeholder="Enter location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1.5px solid rgba(255,255,255,0.3)",
            backgroundColor: "transparent",
            color: "#eee",
            marginBottom: 10,
          }}
        />

        {/* ✅ Sector Dropdown */}
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1.5px solid rgba(255,255,255,0.3)",
            backgroundColor: "transparent",
            color: "#eee",
            marginBottom: 10,
          }}
        >
          <option value="">Select Sector</option>
          <option value="Roads">Roads</option>
          <option value="Water Supply">Water Supply</option>
          <option value="Electricity">Electricity</option>
          <option value="Sanitation">Sanitation</option>
          <option value="Waste Management">Waste Management</option>
          <option value="Public Safety">Public Safety</option>
          <option value="Parks and Greenery">Parks and Greenery</option>
          <option value="Health and Hygiene">Health and Hygiene</option>
          <option value="Other">Other</option>
        </select>

        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1.5px solid rgba(255,255,255,0.3)",
            backgroundColor: "transparent",
            color: "#eee",
            marginBottom: 10,
          }}
        >
          <option value={0}>Select Rating</option>
          {[1, 2, 3, 4, 5].map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <textarea
          placeholder="Write your feedback..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{
            width: "100%",
            height: 120,
            borderRadius: 8,
            padding: 10,
            backgroundColor: "transparent",
            border: "1.5px solid rgba(255,255,255,0.3)",
            color: "#eee",
            fontSize: 16,
            resize: "vertical",
            marginBottom: 15,
          }}
        />

        <button
          onClick={handleSubmit}
          style={{
            padding: "10px 24px",
            borderRadius: 20,
            backgroundColor: "#334155",
            color: "#eee",
            border: "1.5px solid rgba(255,255,255,0.5)",
            cursor: "pointer",
            fontWeight: "600",
            width: "100%",
          }}
        >
          Submit Feedback
        </button>
      </div>

      {/* Display Previous Feedbacks */}
      <div style={{ width: "90%", maxWidth: 700 }}>
        <h3 style={{ marginBottom: 10, textAlign: "center" }}>
          🗂️ My Previous Feedbacks
        </h3>
        {myFeedbacks.length === 0 ? (
          <p style={{ textAlign: "center", opacity: 0.8 }}>
            No feedback submitted yet.
          </p>
        ) : (
          myFeedbacks.map((f) => (
            <div
              key={f.id}
              style={{
                backgroundColor: "rgba(255,255,255,0.08)",
                padding: 15,
                borderRadius: 10,
                marginBottom: 12,
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <p><strong>📍 Location:</strong> {f.location}</p>
              <p><strong>🏢 Sector:</strong> {f.sector}</p> {/* ✅ new display */}
              <p><strong>⭐ Rating:</strong> {f.rating}</p>
              <p><strong>💬 Feedback:</strong> {f.description}</p>
              <p style={{ fontSize: 12, opacity: 0.6 }}>
                {f.createdAt?.toDate
                  ? new Date(f.createdAt.toDate()).toLocaleString()
                  : new Date(f.createdAt._seconds * 1000).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => navigate("/dashboard")}
        style={{
          marginTop: 30,
          padding: "8px 18px",
          borderRadius: 20,
          backgroundColor: "transparent",
          color: "#eee",
          border: "1px solid rgba(255,255,255,0.4)",
          cursor: "pointer",
        }}
      >
        ← Back to Dashboard
      </button>
    </div>
  );
}

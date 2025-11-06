import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";

const heroSectionStyle = {
  position: "relative",
  width: "100vw",
  height: "100vh",
  paddingTop: "50px",
  paddingBottom: "40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
  backgroundColor: "#283e4a", // Header background color
  boxSizing: "border-box",
  overflow: "hidden",
};

const breezeContainerStyle = {
  position: "absolute",
  top: "50%",
  left: "-70%",
  width: "240%",
  height: "40%",
  pointerEvents: "none",
  opacity: 0.15,
  zIndex: 1,
  overflow: "visible",
  animation: "breezeMove 30s ease-in-out infinite",
};

const diamondsContainerStyle = {
  position: "absolute",
  top: "50%",
  left: "-70%",
  width: "240%",
  height: "40%",
  pointerEvents: "none",
  zIndex: 2,
  display: "flex",
  justifyContent: "space-around",
  animation: "diamondsMove 10s linear infinite",
};

const diamondStyleBase = {
  width: 20,
  height: 20,
  backgroundColor: "rgba(255, 255, 255, 0.25)",
  transform: "rotate(45deg)",
  borderRadius: 3,
  filter: "drop-shadow(0 0 2px rgba(255, 255, 255, 0.5))",
};

const textContainerStyle = {
  position: "relative",
  maxWidth: 900,
  textAlign: "center",
  zIndex: 3,
  margin: "0 auto",
  padding: "0 20px",
};

const headlineStyle = {
  fontSize: "3rem",
  fontWeight: 900,
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  justifyContent: "center",
  alignItems: "center",
  lineHeight: 1.1,
  color: "#fff",
  opacity: 0,
  transform: "translateY(20px)",
  transition: "opacity 2s ease, transform 2s ease",
};

const headlineVisibleStyle = {
  opacity: 1,
  transform: "translateY(0)",
};

const subheadingStyles = {
  fontSize: "1.2rem",
  maxWidth: 800,
  margin: "28px auto 32px auto",
  color: "#ccc",
  fontWeight: 400,
  opacity: 0.9,
  position: "relative",
  zIndex: 3,
};

const buttonsRow = {
  display: "flex",
  gap: "20px",
  justifyContent: "center",
  marginBottom: "3vh",
  position: "relative",
  zIndex: 3,
};

const buttonBaseStyles = {
  border: "1px solid #fff",
  borderRadius: 6,
  fontWeight: 700,
  fontSize: "1rem",
  padding: "14px 36px",
  cursor: "pointer",
  userSelect: "none",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "transparent",
  color: "#fff",
  transition: "background-color 0.3s ease, color 0.3s ease",
};

const BreezeAnimation = () => (
  <>
    <svg
      style={breezeContainerStyle}
      viewBox="0 0 1440 320"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="whiteBreezeGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="20%" stopColor="white" stopOpacity="0.2" />
          <stop offset="40%" stopColor="white" stopOpacity="0.1" />
          <stop offset="60%" stopColor="white" stopOpacity="0.1" />
          <stop offset="80%" stopColor="white" stopOpacity="0.2" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        fill="url(#whiteBreezeGradient)"
        d="M0,160 C150,100 300,120 450,140 C600,160 750,80 900,140 C1050,200 1200,140 1350,160 L1440,160 L1440,320 L0,320 Z"
      />
    </svg>
    <div style={diamondsContainerStyle}>
      <div
        style={{
          ...diamondStyleBase,
          animation: "diamondFloat1 10s ease-in-out infinite",
        }}
      />
      <div
        style={{
          ...diamondStyleBase,
          animation: "diamondFloat2 12s ease-in-out infinite",
        }}
      />
      <div
        style={{
          ...diamondStyleBase,
          animation: "diamondFloat3 11s ease-in-out infinite",
        }}
      />
    </div>
  </>
);

const Hero = () => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleStartReviewing = () => {
    navigate("/login");
  };

  const handleLearnMore = () => {
    navigate("/#about");
  };

  return (
    <>
      <Header />
      <section style={heroSectionStyle}>
        <BreezeAnimation />
        <div style={textContainerStyle}>
          <div
            style={{
              ...headlineStyle,
              ...(visible ? headlineVisibleStyle : {}),
            }}
          >
            <span>Let's Create a</span>
            <span>Pollution-Free World</span>
            <span>for Future Generations</span>
          </div>
          <div style={subheadingStyles}>
            Together, let’s build a pollution-free world to secure a cleaner,
            healthier future for generations to come.
          </div>
          <div style={buttonsRow}>
            <button
              onClick={handleStartReviewing}
              style={{
                ...buttonBaseStyles,
                backgroundColor: "#fff",
                color: "#1e2a38",
                borderColor: "#fff",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#fff";
                e.currentTarget.style.color = "#1e2a38";
              }}
            >
              Start Reviewing →
            </button>
            <button
              onClick={handleLearnMore}
              style={buttonBaseStyles}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#fff";
                e.currentTarget.style.color = "#1e2a38";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#fff";
              }}
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes breezeMove {
          0%, 100% {
            transform: translateX(0%);
          }
          50% {
            transform: translateX(-25%);
          }
        }
        @keyframes diamondFloat1 {
          0%, 100% {
            transform: translateY(0);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-15px);
            opacity: 0.8;
          }
        }
        @keyframes diamondFloat2 {
          0%, 100% {
            transform: translateY(-5px);
            opacity: 0.25;
          }
          50% {
            transform: translateY(10px);
            opacity: 0.7;
          }
        }
        @keyframes diamondFloat3 {
          0%, 100% {
            transform: translateY(5px);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-10px);
            opacity: 0.7;
          }
        }
      `}</style>
    </>
  );
};

export default Hero;

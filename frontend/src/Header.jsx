import React from "react";
import { Link, useNavigate } from "react-router-dom";

const navyPrimary = "#283e4a"; // header background
const textOnNavy = "#ffffff";

const headerStyles = {
  background: navyPrimary,
  color: textOnNavy,
  padding: "14px 20px",
  position: "sticky",
  top: 0,
  zIndex: 1000,
};

const containerStyles = {
  maxWidth: "1200px",
  margin: "0 auto",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexDirection: "row-reverse",
};

const brandTextStyles = {
  color: textOnNavy,
  fontWeight: "700",
  fontSize: "1.5rem",
  userSelect: "none",
  padding: "6px 12px",
};

const navStyles = {
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const navLinkStyles = {
  position: "relative",
  padding: "4px 14px", // slimmer padding
  borderRadius: 5, // slimmer border radius
  cursor: "pointer",
  overflow: "hidden",
  textDecoration: "none",
  color: textOnNavy,
  fontWeight: 600,
  WebkitTapHighlightColor: "transparent",
  userSelect: "none",
  display: "inline-block",
  transition: "color 0.3s ease",
};

const buttonColors = {
  home: "#33475b", // slightly lighter/dusty blue-gray
  news: "#3a5870",
  dashboard: "#416682",
  feedback: "#497a95",
  leaderboard: "#5187a3",
  profile: "#59a0b1",
  login: "#2f5168",
};

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
      borderRadius: "5px",
      mixBlendMode: "screen",
      pointerEvents: "none",
      animation: `waveHorizontal 18s ease-in-out infinite`,
      transformOrigin: "center bottom",
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

const Header = ({ loggedInUser, onLogout, hideLoginLink, hideNewsButton }) => {
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    if (onLogout) onLogout();
    navigate("/");
  };

  const navItems = loggedInUser
    ? []
    : [
        { to: "/", label: "Home" },
        ...(hideNewsButton ? [] : [{ to: "/news", label: "News" }]),
      ];

  const renderWaveLayers = () => <CombinedWave />;

  return (
    <>
      <header style={headerStyles}>
        <div style={containerStyles}>
          <nav style={navStyles} aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                style={{ ...navLinkStyles, backgroundColor: buttonColors[item.label.toLowerCase()] }}
                className="water-button"
              >
                {item.label}
                <span className="wave-container">{renderWaveLayers()}</span>
              </Link>
            ))}
            {!loggedInUser && !hideLoginLink && (
              <Link
                to="/login"
                style={{ ...navLinkStyles, backgroundColor: buttonColors["login"] }}
                className="water-button"
              >
                Login
                <span className="wave-container">{renderWaveLayers()}</span>
              </Link>
            )}
            {loggedInUser ? (
              <>
                {["dashboard", "feedback", "leaderboard", "profile"].map((route) => (
                  <Link
                    key={route}
                    to={`/${route}`}
                    style={{ ...navLinkStyles, backgroundColor: buttonColors[route] || "transparent" }}
                    className="water-button"
                  >
                    {route.charAt(0).toUpperCase() + route.slice(1)}
                    <span className="wave-container">{renderWaveLayers()}</span>
                  </Link>
                ))}
                <button
                  onClick={handleLogoutClick}
                  style={{
                    ...navLinkStyles,
                    backgroundColor: buttonColors["login"],
                    border: "1px solid #fff",
                    padding: "4px 14px",
                    fontWeight: 600,
                    borderRadius: 5,
                    color: "#fff",
                    overflow: "hidden",
                  }}
                  className="water-button"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#000";
                    e.currentTarget.style.backgroundColor = "#a4bfff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.backgroundColor = buttonColors["login"];
                  }}
                >
                  Logout
                  <span className="wave-container">{renderWaveLayers()}</span>
                </button>
              </>
            ) : null}
          </nav>
          <div style={brandTextStyles}>Civic Review Portal</div>
        </div>
      </header>

      <style>{`
        .water-button {
          position: relative;
          color: white;
          transition: color 0.1s ease;
          z-index: 0;
          border-radius: 5px;
        }
        .water-button .wave-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: 5px;
          pointer-events: none;
          z-index: -1;
        }
        .water-button:hover {
          color: white !important;
        }
        @keyframes waveHorizontal {
          0% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
};

export default Header;

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider } from "./firebase";
import { signInWithPopup, getRedirectResult } from "firebase/auth";
import Header from "./Header";

const GREEN_ACCENT = "#4caf50";

export default function Auth() {
  const navigate = useNavigate();

  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [response, setResponse] = useState("");

  const [name, setName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regResponse, setRegResponse] = useState("");

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user) console.log("🔵 Google redirect login:", result.user);
      })
      .catch((err) => console.error("Redirect Error:", err));
  }, []);

  const redirectToDashboard = (role, navigate) => {
    if (role === "superadmin") navigate("/superadmin-dashboard");
    else if (role === "admin") navigate("/admin-dashboard");
    else navigate("/user-dashboard");
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setResponse("Please fill in all fields");
      return;
    }
    try {
      const res = await fetch("http://localhost:4000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.error) setResponse(`❌ ${data.error}`);
      else {
        localStorage.setItem("jwt", data.jwt);
        localStorage.setItem("role", data.role || "user");
        redirectToDashboard(data.role || "user", navigate);
        window.location.reload();
      }
    } catch (error) {
      setResponse(`❌ ${error.message}`);
    }
  };

  const handleRegister = async () => {
    if (!name || !regEmail || !regPassword) {
      setRegResponse("Please fill in all fields");
      return;
    }
    try {
      const res = await fetch("http://localhost:4000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: regEmail, password: regPassword }),
      });
      const data = await res.json();
      if (data.error) setRegResponse(`❌ ${data.error}`);
      else {
        localStorage.setItem("jwt", data.jwt);
        localStorage.setItem("role", data.role || "user");
        redirectToDashboard(data.role || "user", navigate);
        window.location.reload();
      }
    } catch (error) {
      setRegResponse(`❌ ${error.message}`);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const res = await fetch("http://localhost:4000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleUid: user.uid }),
      });
      const data = await res.json();
      if (data.error) {
        if (isLogin) setResponse(`❌ ${data.error}`);
        else setRegResponse(`❌ ${data.error}`);
      } else {
        localStorage.setItem("jwt", data.jwt);
        localStorage.setItem("role", data.role || "user");
        redirectToDashboard(data.role || "user", navigate);
        window.location.reload();
      }
    } catch (error) {
      if (isLogin) setResponse(`❌ ${error.message}`);
      else setRegResponse(`❌ ${error.message}`);
    }
  };

  return (
    <>
      <Header loggedInUser={null} hideLoginLink={true} />
      <style>{`
        * {
  box-sizing: border-box;
}
body, html, #root {
  margin: 0;
  height: 100%;
  width: 100%;
  background-color: #283e4a; /* Deep navy blue */
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  display: flex;
  flex-direction: column;      /* Stack children vertically */
  justify-content: flex-start; /* Align to top */
  align-items: center;         /* Center horizontally */
  color: white;
  overflow-x: hidden;          /* Prevent horizontal scroll */
}

/* HEADER CONTAINER ADJUSTMENT */
header {
  width: 100%;                 /* Ensure header is full width */
  box-sizing: border-box;
}

/* Main auth container */
.auth-container {
  width: 950px;
  height: 600px;
  border-radius: 20px;
  background-color: transparent; /* fully transparent */
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.1); /* subtle white glow */
  overflow: hidden;
  position: relative;
  display: flex;
  user-select: none;
  transition: all 0.8s ease;
  margin-top: 20px;             /* Space below header */
}

/* Panels */
.welcome-panel, .form-panel {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
  padding: 60px 40px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transition: all 0.8s ease;
}
.welcome-panel {
  left: 0;
  background-color: transparent;
  color: white;
  border-top-left-radius: 20px;
  border-bottom-left-radius: 20px;
  text-shadow: 0 0 8px rgba(0,0,0,0.5);
}
.form-panel {
  right: 0;
  background-color: rgba(30, 42, 56, 0.25); /* subtle transparent navy overlay */
  border-top-right-radius: 20px;
  border-bottom-right-radius: 20px;
}
.auth-container.signup .welcome-panel {
  left: 50%;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border-top-right-radius: 20px;
  border-bottom-right-radius: 20px;
}
.auth-container.signup .form-panel {
  right: 50%;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-top-left-radius: 20px;
  border-bottom-left-radius: 20px;
}

/* Headings and text */
h1 {
  font-size: 42px;
  font-weight: 700;
  margin-bottom: 12px;
  user-select: none;
  line-height: 1.1;
  text-shadow: 0 0 7px rgba(0,0,0,0.5);
}
p {
  font-size: 18px;
  line-height: 1.5;
  user-select: none;
  text-shadow: 0 0 5px rgba(0,0,0,0.3);
}
h2 {
  font-weight: 700;
  margin-bottom: 30px;
  user-select: none;
  text-shadow: 0 0 7px rgba(0,0,0,0.5);
  color: white;
}

/* Inputs */
input {
  background-color: transparent !important; /* no fill color at all */
  color: white !important;                   /* text stays white */
  padding: 14px 18px;
  margin-bottom: 18px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.6); /* visible outline */
  font-size: 16px;
  outline: none;
  transition: border-color 0.3s;
  width: 100%;
  box-sizing: border-box;
  text-shadow: none;                        /* remove shadow inside text */
}

/* Autofill fix: keep transparent background with white text in Chrome */
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus {
  box-shadow: none !important;               /* remove autofill box-shadow */
  -webkit-text-fill-color: white !important; /* keep text white */
  transition: background-color 5000s ease-in-out 0s;
}


input::placeholder {
  color: rgba(255,255,255,0.7);
}
input:focus {
  border-color: rgba(255, 255, 255, 0.8);
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.7);
  outline: none;
  background-color: rgba(255, 255, 255, 0.3);
  color: white;
}

/* Buttons */
button.submit-btn {
  width: 100%;
  height: 48px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0 14px;
  border-radius: 10px;
  border: none;
  font-weight: 700;
  font-size: 16px;
  cursor: pointer;
  user-select: none;
  background-color: #4169e1; /* solid royal blue */
  color: white;
  box-shadow: none;
  transition: background-color 0.3s;
}
button.submit-btn:hover {
  background-color: #3353a4;
  box-shadow: none;
}
button.submit-btn:focus {
  outline: none;
  box-shadow: none;
  border-color: initial;
}
button.google-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #4169e1; /* solid royal blue */
  margin-top: 20px;
  cursor: pointer;
  border: none;
  border-radius: 10px;
  color: white;
  font-weight: 700;
  font-size: 16px;
  transition: background-color 0.3s;
  user-select: none;
  width: 100%;
  height: 48px;
  box-shadow: none;
}
button.google-btn:hover {
  background-color: #3353a4;
  box-shadow: none;
}

/* Icon style */
svg {
  margin-right: 12px;
  filter: drop-shadow(0 0 1px rgba(0,0,0,0.3));
}

/* Mode switch */
.switch-mode {
  margin-top: 20px;
  font-size: 14px;
  user-select: none;
  color: rgba(255,255,255,0.8);
  text-shadow: 0 0 5px rgba(0,0,0,0.3);
}
.switch-mode button {
  background: none;
  border: none;
  color: #aaddff;
  font-weight: 700;
  cursor: pointer;
  margin-left: 5px;
  user-select: none;
  padding: 0;
  text-shadow: none;
}
.switch-mode button:hover {
  text-decoration: underline;
}

/* Error message */
.error-text {
  color: #ff5555;
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 12px;
  user-select: none;
  text-shadow: 0 0 5px rgba(0,0,0,0.5);
}

      `}</style>

       <div className={`auth-container${isLogin ? "" : " signup"}`}>
          <div className="welcome-panel" aria-label="Welcome panel">
            <h1>Welcome Back!</h1>
            <p>
              Discover your next opportunities with Civic Review Portal. Stay
              connected and informed with real-time insights.
            </p>
          </div>
          <div
            className="form-panel"
            aria-label={isLogin ? "Login form" : "Register form"}
          >
            {isLogin ? (
              <>
                <h2>Sign in to your account</h2>
                {response && <div className="error-text">{response}</div>}
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button className="submit-btn" onClick={handleLogin}>
                  Login
                </button>
                <button
                  className="google-btn"
                  onClick={handleGoogleLogin}
                  aria-label="Login with Google"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      fill="#4285F4"
                      d="M24 9.5c3.6 0 6.7 1.2 8.8 3.3l6.6-6.6C34 3.6 29.4 2 24 2 14.8 2 7 8.3 4.8 16.2l7.7 6c1.6-4.6 6-8.7 11.5-8.7z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 38c-4.9 0-9-3.1-10.5-7.5l-7.7 6c3.6 7.7 12 11.7 18.2 11.7 5.6 0 10.5-4 12.3-9.3h-12z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M38.4 26H24v-4h7.2c-.3-1.1-.8-2.1-1.4-3.2l5.4-4.2c1.4 2.3 2.4 4.9 2.4 7.4 0 1.2-.2 2.4-.4 3.5z"
                    />
                  </svg>
                  Login with Google
                </button>
                <div className="switch-mode">
                  Don't have an account?
                  <button
                    onClick={() => {
                      setIsLogin(false);
                      setResponse("");
                      setRegResponse("");
                    }}
                  >
                    Register
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>Create your account</h2>
                {regResponse && <div className="error-text">{regResponse}</div>}
                <input
                  type="text"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  autoComplete="email"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button className="submit-btn" onClick={handleRegister}>
                  Register
                </button>
                <button
                  className="google-btn"
                  onClick={handleGoogleLogin}
                  aria-label="Register with Google"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      fill="#4285F4"
                      d="M24 9.5c3.6 0 6.7 1.2 8.8 3.3l6.6-6.6C34 3.6 29.4 2 24 2 14.8 2 7 8.3 4.8 16.2l7.7 6c1.6-4.6 6-8.7 11.5-8.7z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 38c-4.9 0-9-3.1-10.5-7.5l-7.7 6c3.6 7.7 12 11.7 18.2 11.7 5.6 0 10.5-4 12.3-9.3h-12z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M38.4 26H24v-4h7.2c-.3-1.1-.8-2.1-1.4-3.2l5.4-4.2c1.4 2.3 2.4 4.9 2.4 7.4 0 1.2-.2 2.4-.4 3.5z"
                    />
                  </svg>
                  Register with Google
                </button>
                <div className="switch-mode">
                  Already have an account?
                  <button
                    onClick={() => {
                      setIsLogin(true);
                      setResponse("");
                      setRegResponse("");
                    }}
                  >
                    Login
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
    </>
  );
}


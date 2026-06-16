import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup, getRedirectResult } from "firebase/auth";
import PublicHeader, { Footer } from "../components/Layout/Header";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { API_URL } from "../api/client";
import { siteImages } from "../data/images";

export default function AuthPage({ mode = "login" }) {
  const navigate = useNavigate();
  const isLogin = mode === "login";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getRedirectResult(auth).catch(console.error);
  }, []);

  const redirectByRole = (role) => {
    if (role === "superadmin") navigate("/app/superadmin");
    else if (role === "admin") navigate("/app/admin");
    else navigate("/app/dashboard");
    window.location.reload();
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return setMsg("Please fill in all fields");
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include", // Store the session cookie in browser
      });
      const data = await res.json();
      if (data.error) setMsg(data.error);
      else {
        if (data.jwt) localStorage.setItem("jwt", data.jwt);
        localStorage.setItem("role", data.role || "user");
        if (data.uid) localStorage.setItem("uid", data.uid);
        redirectByRole(data.role || "user");
      }
    } catch (err) {
      setMsg(err.message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) return setMsg("Please fill in all fields");
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
        credentials: "include", // Store the session cookie in browser
      });
      const data = await res.json();
      if (data.error) setMsg(data.error);
      else {
        if (data.jwt) localStorage.setItem("jwt", data.jwt);
        localStorage.setItem("role", data.role || "user");
        if (data.uid) localStorage.setItem("uid", data.uid);
        redirectByRole(data.role || "user");
      }
    } catch (err) {
      setMsg(err.message);
    }
  };

  const handleGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleUid: result.user.uid }),
        credentials: "include", // Store the session cookie in browser
      });
      const data = await res.json();
      if (data.error) setMsg(data.error);
      else {
        if (data.jwt) localStorage.setItem("jwt", data.jwt);
        localStorage.setItem("role", data.role || "user");
        if (data.uid) localStorage.setItem("uid", data.uid);
        redirectByRole(data.role || "user");
      }
    } catch (err) {
      setMsg(err.message);
    }
  };

  return (
    <>
      <PublicHeader />
      <div className="mx-auto grid min-h-[70vh] max-w-4xl items-center gap-8 px-4 py-12 lg:grid-cols-2">
        <div className="hidden lg:block">
          <img
            src={siteImages.authPanel.src}
            alt=""
            className="rounded-2xl shadow-lg"
            onError={(e) => {
              if (e.target.src !== siteImages.authPanel.fallback)
                e.target.src = siteImages.authPanel.fallback;
            }}
          />
          <p className="mt-4 text-lg font-semibold text-civic-800">Join the movement for a cleaner society.</p>
          <p className="mt-2 text-sm text-slate-600">Report issues, connect with similar interests, and improve your community.</p>
        </div>
        <Card>
          <h1 className="text-2xl font-bold text-slate-900">{isLogin ? "Welcome back" : "Create account"}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {isLogin ? "Login to report issues and join communities." : "Join the movement for a cleaner society."}
          </p>

          <form onSubmit={isLogin ? handleLogin : handleRegister} className="mt-6 space-y-4">
            {!isLogin && (
              <Input label="Full Name" value={name} onChange={(e) => setName(e.target.value)} required />
            )}
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {msg && <p className="text-sm text-red-600">{msg}</p>}
            <Button type="submit" className="w-full">{isLogin ? "Login" : "Register"}</Button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">OR</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <Button type="button" variant="secondary" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>

          <p className="mt-4 text-center text-sm text-slate-600">
            {isLogin ? (
              <>No account? <button type="button" className="font-semibold text-civic-600" onClick={() => navigate("/register")}>Register</button></>
            ) : (
              <>Have an account? <button type="button" className="font-semibold text-civic-600" onClick={() => navigate("/login")}>Login</button></>
            )}
          </p>
        </Card>
      </div>
      <Footer />
    </>
  );
}

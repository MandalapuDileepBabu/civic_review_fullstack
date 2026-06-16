const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function getToken() {
  return localStorage.getItem("jwt");
}

export function getRole() {
  return localStorage.getItem("role");
}

export function logout() {
  localStorage.removeItem("jwt");
  localStorage.removeItem("role");
  localStorage.removeItem("uid");
  // Call backend to clear HttpOnly cookie
  fetch(`${API_URL}/logout`, { method: "POST", credentials: "include" })
    .catch(err => console.error("Logout failed on backend:", err));
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  
  const res = await fetch(`${API_URL}${path}`, { 
    credentials: "include", // Enforce credentials to send cookies cross-origin
    ...options, 
    headers 
  });

  // Read renewed token from Authorization response header
  const authHeader = res.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const newToken = authHeader.split(" ")[1];
    localStorage.setItem("jwt", newToken);
  }

  const data = await res.json().catch(() => ({}));

  // Auto-logout if token is expired/invalid
  if (res.status === 401 || res.status === 403) {
    if (data.error && (
      data.error.toLowerCase().includes("expired") || 
      data.error.toLowerCase().includes("token") || 
      data.error.toLowerCase().includes("unauthorized")
    )) {
      logout();
      window.location.href = "/login";
      return;
    }
  }

  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export function fileUrl(fileId) {
  if (!fileId) return null;
  if (fileId.startsWith("http")) return fileId;
  return `${API_URL}/files/${fileId}`;
}

export { API_URL };

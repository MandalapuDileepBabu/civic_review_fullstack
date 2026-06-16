import { useEffect, useState } from "react";
import { apiFetch, fileUrl } from "./api/client";
import Card from "./components/ui/Card";
import Button from "./components/ui/Button";
import Input from "./components/ui/Input";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [msg, setMsg] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState("");

  const load = async () => {
    try {
      const [s, u] = await Promise.all([
        apiFetch("/superadmin/dashboard"),
        apiFetch("/superadmin/users"),
      ]);
      setStats(s.stats || {});
      setUsers(u.users || []);
    } catch (err) {
      setMsg(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createAdmin = async (e) => {
    e.preventDefault();
    try {
      await apiFetch("/superadmin/create-admin", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMsg("Admin created successfully.");
      setForm({ name: "", email: "", password: "" });
      load();
    } catch (err) {
      setMsg(err.message);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setUploadResult(null);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      const res = await apiFetch("/files/upload", {
        method: "POST",
        body: formData,
      });
      setUploadResult(res);
      setMsg("File uploaded successfully.");
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteUser = async (uid, email) => {
    if (!window.confirm(`Are you sure you want to permanently delete user ${email}?\nThis will remove all their auth details, Firestore profile, user files in Google Drive, feedbacks, issues, messages, and communities owned by them.`)) {
      return;
    }
    try {
      setMsg(`Deleting user ${email}...`);
      const res = await apiFetch(`/deleteUser/${uid}`, {
        method: "DELETE",
      });
      if (res && res.success) {
        setMsg(`Successfully deleted user ${email}`);
        load();
      } else {
        setMsg(`Failed to delete user.`);
      }
    } catch (err) {
      setMsg(err.message);
    }
  };

  const statCards = [
    { label: "Users", value: stats.user ?? 0 },
    { label: "Admins", value: stats.admin ?? 0 },
    { label: "Super Admins", value: stats.superadmin ?? 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Super Admin</h1>
      <p className="mt-1 text-slate-600">Platform overview and admin management.</p>
      {msg && <p className="mt-4 text-sm text-civic-700">{msg}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {statCards.map((s) => (
          <Card key={s.label} className="text-center">
            <p className="text-3xl font-bold text-civic-700">{s.value}</p>
            <p className="text-sm text-slate-600">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6 max-w-md">
        <h2 className="text-lg font-bold">Create Admin</h2>
        <form onSubmit={createAdmin} className="mt-4 space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <Button type="submit">Create Admin</Button>
        </form>
      </Card>

      <Card className="mt-6 max-w-md">
        <h2 className="text-lg font-bold">Test File Upload</h2>
        <p className="mt-1 text-sm text-slate-500">Verify file uploading functionality for superadmins.</p>
        <form onSubmit={handleUpload} className="mt-4 space-y-4">
          <Input
            type="file"
            label="Select File"
            onChange={(e) => setUploadFile(e.target.files[0])}
            required
          />
          <Button type="submit" disabled={uploading}>
            {uploading ? "Uploading..." : "Upload File"}
          </Button>
        </form>

        {uploadResult && (
          <div className="mt-4 rounded-lg bg-green-50 p-3 text-xs text-green-800">
            <p className="font-semibold">Upload Success!</p>
            <p className="mt-1"><strong>File ID:</strong> {uploadResult.fileId}</p>
            <p><strong>Storage:</strong> {uploadResult.storage}</p>
            <p className="mt-2">
              <a
                href={fileUrl(uploadResult.fileId)}
                target="_blank"
                rel="noreferrer"
                className="font-medium underline hover:text-green-950"
              >
                View Uploaded File
              </a>
            </p>
          </div>
        )}
        {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
      </Card>

      <Card className="mt-6 overflow-x-auto p-0">
        <h2 className="border-b border-slate-200 px-4 py-3 text-lg font-bold">All Users</h2>
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Name", "Email", "Role", "Created", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold text-slate-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uid} className="border-t border-slate-100">
                <td className="px-4 py-3">{u.name || "—"}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3 capitalize">{u.role}</td>
                <td className="px-4 py-3">
                  {u.createdAt?.toMillis
                    ? new Date(u.createdAt.toMillis()).toLocaleString()
                    : u.createdAt?._seconds
                      ? new Date(u.createdAt._seconds * 1000).toLocaleString()
                      : "—"}
                </td>
                <td className="px-4 py-3">
                  {u.uid !== localStorage.getItem("uid") ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="!bg-red-600 hover:!bg-red-700 !text-white text-xs font-semibold px-2 py-1 rounded"
                      onClick={() => handleDeleteUser(u.uid, u.email)}
                    >
                      🗑️ Delete
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Self</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

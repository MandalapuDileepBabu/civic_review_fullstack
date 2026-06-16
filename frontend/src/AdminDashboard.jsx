import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, fileUrl } from "./api/client";
import Card from "./components/ui/Card";
import Button from "./components/ui/Button";
import Input from "./components/ui/Input";

const statusClass = (s) => {
  if (s === "pending") return "bg-amber-100 text-amber-800";
  if (s === "on process" || s === "in_progress") return "bg-blue-100 text-blue-800";
  if (s === "solved" || s === "resolved" || s === "issue resolved") return "bg-green-100 text-green-800";
  if (s === "resolved pending approval") return "bg-purple-100 text-purple-800 font-bold";
  return "bg-slate-100 text-slate-700";
};

export default function AdminDashboard() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState("");

  const load = async () => {
    try {
      const data = await apiFetch("/issues");
      setIssues(data.issues || []);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (issueId, status) => {
    try {
      await apiFetch(`/issues/${issueId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="mt-1 text-slate-600">Manage and resolve reported civic issues.</p>
        </div>
        <Button to="/app/feedback-stats" variant="secondary" size="sm">
          Feedback Stats
        </Button>
      </div>

      {msg && <p className="mt-4 text-sm text-red-600">{msg}</p>}

      <Card className="mt-6 overflow-x-auto p-0">
        {loading ? (
          <p className="p-6 text-slate-500">Loading...</p>
        ) : issues.length === 0 ? (
          <p className="p-6 text-slate-500">No issues reported.</p>
        ) : (
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {["Issue", "Location", "Description", "Date", "Status", "Image", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-slate-700">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr key={issue.issue_id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{issue.issue_name}</td>
                  <td className="px-4 py-3">{issue.location}</td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">{issue.description}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {issue.date ? new Date(issue.date).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${statusClass(issue.status)}`}>
                      {issue.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {issue.image ? (
                      <img src={issue.image} alt="" className="h-14 w-14 rounded-lg object-cover" />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {issue.status === "pending" && (
                      <Button size="sm" onClick={() => updateStatus(issue.issue_id, "on process")}>
                        Start
                      </Button>
                    )}
                    {issue.status === "on process" && (
                      <Button size="sm" onClick={() => updateStatus(issue.issue_id, "solved")}>
                        Solve
                      </Button>
                    )}
                    {issue.status === "resolved pending approval" && (
                      <div className="flex gap-1.5">
                        <Button size="sm" className="!bg-green-600 hover:!bg-green-700 !text-white" onClick={() => updateStatus(issue.issue_id, "solved")}>
                          Approve
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => updateStatus(issue.issue_id, "pending")}>
                          Decline
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="mt-6 max-w-md">
        <h2 className="text-lg font-bold">Test File Upload</h2>
        <p className="mt-1 text-sm text-slate-500">Verify file uploading functionality for admins.</p>
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
    </div>
  );
}

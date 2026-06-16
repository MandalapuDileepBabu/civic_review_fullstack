import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "./api/client";
import Card from "./components/ui/Card";

export default function FeedbackStats() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/feedback")
      .then((d) => setFeedbacks(d.feedbacks || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const total = feedbacks.length;
  const avg =
    total > 0
      ? (feedbacks.reduce((s, f) => s + (f.rating || 0), 0) / total).toFixed(1)
      : "0";

  const formatDate = (ts) => {
    if (!ts) return "—";
    if (ts.toMillis) return new Date(ts.toMillis()).toLocaleString();
    if (ts._seconds) return new Date(ts._seconds * 1000).toLocaleString();
    return "—";
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Feedback Statistics</h1>
          <p className="mt-1 text-slate-600">Citizen ratings across public service sectors.</p>
        </div>
        <Link to="/app/admin" className="text-sm font-semibold text-civic-600 hover:text-civic-800">
          ← Back to Admin
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="text-center">
          <p className="text-3xl font-bold text-civic-700">{total}</p>
          <p className="text-sm text-slate-600">Total Feedbacks</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-civic-700">{avg} / 5</p>
          <p className="text-sm text-slate-600">Average Rating</p>
        </Card>
      </div>

      <Card className="mt-6 overflow-x-auto p-0">
        {loading ? (
          <p className="p-6 text-slate-500">Loading...</p>
        ) : feedbacks.length === 0 ? (
          <p className="p-6 text-slate-500">No feedback yet.</p>
        ) : (
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Location", "Sector", "Rating", "Description", "Date"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-slate-700">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {feedbacks.map((fb) => (
                <tr key={fb.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{fb.location}</td>
                  <td className="px-4 py-3">{fb.sector}</td>
                  <td className="px-4 py-3">{fb.rating}/5</td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">{fb.description}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(fb.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

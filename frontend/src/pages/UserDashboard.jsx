import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import Card from "../components/ui/Card";
import { Link } from "react-router-dom";

export default function UserDashboard() {
  const [stats, setStats] = useState({ localities: [], sectors: [] });
  const [selectedLocality, setSelectedLocality] = useState("");
  const [selectedSector, setSelectedSector] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/stats/dashboard")
      .then((data) => {
        setStats(data);
        if (data.localities?.length > 0) setSelectedLocality(data.localities[0].name);
        if (data.sectors?.length > 0) setSelectedSector(data.sectors[0].name);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const currentLocalityData = stats.localities?.find(
    (l) => l.name.toLowerCase() === selectedLocality.toLowerCase()
  );

  const currentSectorData = stats.sectors?.find(
    (s) => s.name.toLowerCase() === selectedSector.toLowerCase()
  );

  const renderStars = (ratingStr) => {
    const rating = parseFloat(ratingStr) || 0;
    const fullStars = Math.round(rating);
    return (
      <div className="flex gap-0.5 text-xl text-amber-400 justify-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i}>{i < fullStars ? "★" : "☆"}</span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-slate-600">Citizen rating analytics and area statistics.</p>
      </div>

      {loading ? (
        <Card className="text-center py-12">
          <p className="text-slate-500 text-sm">Loading statistics...</p>
        </Card>
      ) : error ? (
        <Card className="text-center py-12 border-red-100 bg-red-50 text-red-700">
          <p className="text-sm">Error loading stats: {error}</p>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Locality Statistics Selector */}
          <Card className="shadow-md border border-slate-100 p-6 flex flex-col justify-between min-h-[300px]">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Locality Performance</h2>
              <p className="text-xs text-slate-500 mb-4">Select a region to check its average public service score.</p>
              
              {stats.localities?.length === 0 ? (
                <p className="text-sm text-slate-400">No locality data available yet.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-500 font-semibold block mb-1">Locality</label>
                    <select
                      value={selectedLocality}
                      onChange={(e) => setSelectedLocality(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 p-2.5 text-sm bg-white focus:border-civic-500 focus:outline-none"
                    >
                      {stats.localities.map((loc) => (
                        <option key={loc.name} value={loc.name}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {currentLocalityData && (
              <div className="mt-6 text-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Average Rating</p>
                <div className="flex items-baseline justify-center gap-1 mt-1">
                  <p className="text-4xl font-black text-civic-700">{currentLocalityData.avgRating}</p>
                  <p className="text-sm text-slate-500">/ 5</p>
                </div>
                <div className="mt-2">{renderStars(currentLocalityData.avgRating)}</div>
                <p className="text-xs text-slate-400 mt-2">Based on {currentLocalityData.count} review(s)</p>
              </div>
            )}
          </Card>

          {/* Sector Statistics Selector */}
          <Card className="shadow-md border border-slate-100 p-6 flex flex-col justify-between min-h-[300px]">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Sector / Category Performance</h2>
              <p className="text-xs text-slate-500 mb-4">Select a service sector to monitor its average performance.</p>

              {stats.sectors?.length === 0 ? (
                <p className="text-sm text-slate-400">No sector data available yet.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-500 font-semibold block mb-1">Service Sector</label>
                    <select
                      value={selectedSector}
                      onChange={(e) => setSelectedSector(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 p-2.5 text-sm bg-white focus:border-civic-500 focus:outline-none"
                    >
                      {stats.sectors.map((sec) => (
                        <option key={sec.name} value={sec.name}>
                          {sec.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {currentSectorData && (
              <div className="mt-6 text-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Average Rating</p>
                <div className="flex items-baseline justify-center gap-1 mt-1">
                  <p className="text-4xl font-black text-civic-700">{currentSectorData.avgRating}</p>
                  <p className="text-sm text-slate-500">/ 5</p>
                </div>
                <div className="mt-2">{renderStars(currentSectorData.avgRating)}</div>
                <p className="text-xs text-slate-400 mt-2">Based on {currentSectorData.count} review(s)</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Helpful Shortcuts */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/app/issues" className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-civic-500 transition-colors group">
          <span className="text-2xl">🚨</span>
          <div>
            <p className="font-semibold text-slate-800 group-hover:text-civic-600 transition-colors">Report an Issue</p>
            <p className="text-xs text-slate-500">Report trash, streetlights, sanitation issues</p>
          </div>
        </Link>
        <Link to="/app/feedback" className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-civic-500 transition-colors group">
          <span className="text-2xl">✍️</span>
          <div>
            <p className="font-semibold text-slate-800 group-hover:text-civic-600 transition-colors">Submit Feedback</p>
            <p className="text-xs text-slate-500">Rate local administrations and services</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

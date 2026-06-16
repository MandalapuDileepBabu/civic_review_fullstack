import { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input, { Textarea, Select } from "../components/ui/Input";

const sectors = [
  "Roads", "Water Supply", "Electricity", "Sanitation",
  "Waste Management", "Public Safety", "Parks and Greenery", "Health and Hygiene", "Other",
];

export default function AppFeedbackPage() {
  const [location, setLocation] = useState("");
  const [sector, setSector] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [description, setDescription] = useState("");
  const [myFeedbacks, setMyFeedbacks] = useState([]);
  const [msg, setMsg] = useState("");

  const fetchMyFeedbacks = async () => {
    try {
      const data = await apiFetch("/my-feedback");
      setMyFeedbacks(data.feedbacks || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMyFeedbacks();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!location || !sector || !rating || !description.trim()) {
      setMsg("Please fill in all fields and provide a rating.");
      return;
    }
    try {
      await apiFetch("/feedback", {
        method: "POST",
        body: JSON.stringify({ location, rating, description, sector }),
      });
      setMsg("Feedback submitted successfully!");
      setLocation("");
      setSector("");
      setRating(0);
      setDescription("");
      fetchMyFeedbacks();
    } catch (err) {
      setMsg(err.message);
    }
  };

  const totalMyFeedback = myFeedbacks.length;
  const avgMyRating = totalMyFeedback > 0
    ? (myFeedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / totalMyFeedback).toFixed(1)
    : "0.0";

  return (
    <div>
      <h1 className="text-2xl font-bold">Submit Feedback</h1>
      <p className="mt-1 text-slate-600">Rate public utilities and services to help local administrations maintain standards.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-12 items-start">
        
        {/* Left Column: Form (Takes 5 cols on lg) */}
        <div className="lg:col-span-5">
          <Card className="shadow-md border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Rate Public Services</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input label="Location / Area" placeholder="e.g. Bangalore North" value={location} onChange={(e) => setLocation(e.target.value)} required />
              
              <Select label="Sector" value={sector} onChange={(e) => setSector(e.target.value)} required>
                <option value="">Select sector</option>
                {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Rating</p>
                <div className="flex gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 w-fit">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="text-3xl transition-transform duration-150 hover:scale-125 focus:outline-none"
                    >
                      <span className={(hoverRating || rating) >= n ? "text-amber-400" : "text-slate-200"}>
                        ★
                      </span>
                    </button>
                  ))}
                  {rating > 0 && (
                    <span className="text-sm font-bold text-slate-500 ml-2 self-center">
                      ({rating}/5)
                    </span>
                  )}
                </div>
              </div>
              
              <Textarea label="Description / Experience" placeholder="Briefly describe what works well or what needs improvement..." value={description} onChange={(e) => setDescription(e.target.value)} required />
              
              {msg && <p className="text-sm text-civic-700 font-medium">{msg}</p>}
              
              <Button type="submit" className="w-full py-2.5">Submit Feedback</Button>
            </form>
          </Card>
        </div>

        {/* Right Column: User Stats + Previous Feedback (Takes 7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* User Feedback Statistics */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="text-center shadow-sm border border-slate-100 bg-white p-4">
              <p className="text-sm font-semibold text-slate-500">Your Reports</p>
              <p className="text-4xl font-bold text-civic-700 mt-1">{totalMyFeedback}</p>
              <p className="text-xs text-slate-400 mt-2">Feedbacks submitted by you</p>
            </Card>
            
            <Card className="text-center shadow-sm border border-slate-100 bg-white p-4">
              <p className="text-sm font-semibold text-slate-500">Your Avg Rating</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <p className="text-4xl font-bold text-civic-700">{avgMyRating}</p>
                <span className="text-xl text-amber-400">★</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Out of 5 stars average</p>
            </Card>
          </div>

          {/* User Feedback History */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Your Feedback History</h2>
            
            {myFeedbacks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm">No feedback submitted yet.</p>
                <p className="text-slate-400 text-xs mt-1">Your reviews will appear here once submitted.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2">
                {myFeedbacks.map((f) => (
                  <Card key={f.id} className="shadow-sm border border-slate-100 bg-white hover:border-civic-200 transition-colors duration-200">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="inline-block text-xs font-semibold px-2 py-0.5 bg-civic-50 text-civic-700 rounded-md mb-2">
                          {f.sector}
                        </span>
                        <p className="font-semibold text-slate-800 text-sm">📍 {f.location}</p>
                      </div>
                      <div className="flex text-amber-400 text-lg">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i}>{i < (f.rating || 0) ? "★" : "☆"}</span>
                        ))}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                      "{f.description}"
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

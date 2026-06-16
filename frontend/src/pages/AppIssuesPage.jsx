import { useEffect, useState, useRef } from "react";
import { apiFetch, API_URL, getToken } from "../api/client";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input, { Textarea, Select } from "../components/ui/Input";

export default function AppIssuesPage() {
  const [issues, setIssues] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [myCommunityIds, setMyCommunityIds] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [form, setForm] = useState({
    issue_name: "",
    pincode: "",
    street: "",
    area: "",
    state: "",
    communityId: "",
  });
  
  const [image, setImage] = useState(null);
  const [msg, setMsg] = useState("");
  const [editingId, setEditingId] = useState(null);

  const mapInstance = useRef(null);
  const markerInstance = useRef(null);

  const load = async () => {
    try {
      const [issueData, commData, profile] = await Promise.all([
        apiFetch("/my-issues"),
        apiFetch("/communities"),
        apiFetch("/users/me").catch(() => ({})),
      ]);
      setIssues(issueData.issues || []);
      setCommunities(commData.communities || []);
      setMyCommunityIds(profile.communityIds || []);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!window.L) return;

    // Check if container exists
    const container = document.getElementById("issue-map");
    if (!container) return;

    // Destroy existing instance to prevent errors
    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const defaultLat = 12.9716;
    const defaultLng = 77.5946;

    const map = window.L.map("issue-map").setView([defaultLat, defaultLng], 13);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const marker = window.L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);

    mapInstance.current = map;
    markerInstance.current = marker;

    const onLocationChange = async (lat, lng) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          const detectedArea = (addr.suburb || addr.neighbourhood || addr.city_district || addr.subdistrict || "") + 
                               (addr.city || addr.town || addr.village ? ", " + (addr.city || addr.town || addr.village) : "");
          setForm(prev => ({
            ...prev,
            pincode: addr.postcode || prev.pincode,
            area: detectedArea,
            state: addr.state || prev.state,
            street: addr.road || addr.suburb || prev.street
          }));
        }
      } catch (err) {
        console.error("Reverse geocoding error:", err);
      }
    };

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onLocationChange(pos.lat, pos.lng);
    });

    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      onLocationChange(lat, lng);
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const updateMapLocation = (lat, lng) => {
    if (markerInstance.current) {
      markerInstance.current.setLatLng([lat, lng]);
    }
    if (mapInstance.current) {
      mapInstance.current.setView([lat, lng], 15);
    }
  };

  // Autodetect from PIN Code
  const handlePincodeChange = async (val) => {
    // Keep only numeric and limit to 6 digits
    const cleaned = val.replace(/\D/g, "").slice(0, 6);
    setForm(prev => ({ ...prev, pincode: cleaned }));

    if (cleaned.length === 6) {
      try {
        setMsg("Auto-detecting location from PIN Code...");
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === "Success") {
          const po = data[0].PostOffice[0];
          setForm(prev => ({
            ...prev,
            area: `${po.Name}, ${po.District}`,
            state: po.State
          }));
          setMsg("");

          // Geocode PIN to move map
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${cleaned}+India`);
          const geoData = await geoRes.json();
          if (geoData && geoData[0]) {
            const lat = parseFloat(geoData[0].lat);
            const lon = parseFloat(geoData[0].lon);
            updateMapLocation(lat, lon);
          }
        } else {
          setMsg("PIN code details not found. Please fill manually.");
        }
      } catch (err) {
        console.error("PIN lookup failed:", err);
        setMsg("Location detection failed. Please type manually.");
      }
    }
  };

  // Locate current position using GPS
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setMsg("Geolocation is not supported by your browser");
      return;
    }
    setMsg("Fetching your GPS coordinates...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        updateMapLocation(lat, lng);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          if (data && data.address) {
            const addr = data.address;
            const detectedArea = (addr.suburb || addr.neighbourhood || addr.city_district || addr.subdistrict || "") + 
                                 (addr.city || addr.town || addr.village ? ", " + (addr.city || addr.town || addr.village) : "");
            setForm(prev => ({
              ...prev,
              pincode: addr.postcode || "",
              area: detectedArea,
              state: addr.state || "",
              street: addr.road || addr.suburb || ""
            }));
            setMsg("GPS location loaded successfully!");
          }
        } catch (err) {
          console.error("GPS Reverse geocode failed:", err);
          setMsg("GPS loaded but address lookup failed. Please fill manually.");
        }
      },
      (err) => {
        setMsg(`GPS failed: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({ issue_name: "", pincode: "", street: "", area: "", state: "", communityId: "" });
    setImage(null);
    setMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.issue_name || !form.street || !form.area || !form.state) {
      setMsg("Please enter the issue name, street, area, and state.");
      return;
    }
    
    // Compile address
    const fullLocation = `${form.street}, ${form.area}, ${form.state}${form.pincode ? " - " + form.pincode : ""}`;

    try {
      const fd = new FormData();
      fd.append("issue_name", form.issue_name);
      fd.append("location", fullLocation);
      fd.append("description", form.street); // set street in description or full description
      fd.append("description", `Reported at: ${form.street}. Area details: ${form.area}, ${form.state}.`);
      if (form.communityId) fd.append("communityId", form.communityId);
      if (image) fd.append("image", image);

      let res;
      if (editingId) {
        // Edit mode
        res = await fetch(`${API_URL}/issues/${editingId}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: fd,
        });
      } else {
        // Create mode
        res = await fetch(`${API_URL}/issues`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: fd,
        });
      }

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setMsg(editingId ? "Issue updated successfully!" : "Issue reported successfully!");
      handleCancelEdit();
      load();
    } catch (err) {
      setMsg(err.message);
    }
  };

  const handleEditClick = (issue) => {
    setEditingId(issue.issue_id);
    
    // Parse location parts (split by comma or best effort)
    const parts = issue.location.split(",").map(p => p.trim());
    let streetPart = "";
    let areaPart = "";
    let statePart = "";
    let pinPart = "";

    // Robust parsing logic: format is "Street, Area, District, State - PIN" or short version
    if (parts.length >= 3) {
      streetPart = parts[0];
      const last = parts[parts.length - 1];
      if (last.includes("-")) {
        const lastSub = last.split("-").map(s => s.trim());
        statePart = lastSub[0];
        pinPart = lastSub[1];
      } else {
        statePart = last;
      }
      areaPart = parts.slice(1, parts.length - 1).join(", ");
    } else if (parts.length === 2) {
      streetPart = parts[0];
      statePart = parts[1];
    } else {
      streetPart = issue.location;
    }

    setForm({
      issue_name: issue.issue_name,
      pincode: pinPart,
      street: streetPart,
      area: areaPart,
      state: statePart,
      communityId: issue.communityId || "",
    });

    // Extract coordinates if leaflet geocodes it, or look up Nominatim
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${issue.location}`)
      .then(r => r.json())
      .then(geoData => {
        if (geoData && geoData[0]) {
          const lat = parseFloat(geoData[0].lat);
          const lon = parseFloat(geoData[0].lon);
          updateMapLocation(lat, lon);
        }
      })
      .catch(console.error);

    // Scroll to form container
    const formEl = document.getElementById("issue-form-card");
    if (formEl) formEl.scrollIntoView({ behavior: "smooth" });
  };

  const toggleResolved = async (issueId, current) => {
    const next = current === "resolved pending approval" ? "pending" : "resolved pending approval";
    try {
      await apiFetch(`/issues/${issueId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      load();
    } catch (err) {
      setMsg(err.message);
    }
  };

  const handleDeleteIssue = async (issueId) => {
    if (!window.confirm("Are you sure you want to delete this issue?")) return;
    try {
      await apiFetch(`/issues/${issueId}`, {
        method: "DELETE",
      });
      setMsg("Issue deleted successfully.");
      load();
    } catch (err) {
      setMsg(err.message);
    }
  };

  const statusBadge = (s) => {
    const map = {
      pending: "bg-amber-100 text-amber-800",
      "on process": "bg-blue-100 text-blue-800",
      in_progress: "bg-blue-100 text-blue-800",
      solved: "bg-green-100 text-green-800",
      resolved: "bg-green-100 text-green-800",
      "issue resolved": "bg-green-100 text-green-800",
    };
    return map[s] || "bg-slate-100 text-slate-700";
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Report Issues</h1>
      <p className="mt-1 text-slate-600">Help keep your community clean by reporting problems with GPS mapping.</p>

      <Card id="issue-form-card" className="mt-6">
        <h2 className="text-lg font-bold">{editingId ? "Edit Issue" : "New Issue"}</h2>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Issue Name" value={form.issue_name} onChange={(e) => setForm({ ...form, issue_name: e.target.value })} required />
          
          <Select label="Community (optional)" value={form.communityId} onChange={(e) => setForm({ ...form, communityId: e.target.value })}>
            <option value="">None</option>
            {communities.filter((c) => myCommunityIds.includes(c.id)).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>

          {/* Location Autodetection Fields */}
          <div className="sm:col-span-2 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Location & GPS Pin</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="relative">
                <Input label="PIN Code (India)" placeholder="Enter 6-digit PIN" value={form.pincode} onChange={(e) => handlePincodeChange(e.target.value)} />
              </div>
              <div className="sm:col-span-2 flex items-end">
                <Button type="button" variant="secondary" className="w-full flex items-center justify-center gap-2 mb-1" onClick={handleLocateMe}>
                  📍 Locate Me (GPS)
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Input label="Area / District" placeholder="Enter area or district" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} required />
              <Input label="State" placeholder="Enter state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required />
              <Input label="Street / Landmark Address" placeholder="Enter street name or landmark" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} required />
            </div>
          </div>

          {/* Interactive Map */}
          <div className="sm:col-span-2">
            <p className="text-xs text-slate-500 font-medium mb-1">Interactive Map Marker (Drag/click to adjust pin)</p>
            <div id="issue-map" className="w-full h-64 rounded-xl border border-slate-200 z-0 shadow-inner" style={{ minHeight: '250px' }}></div>
          </div>

          <div className="sm:col-span-2">
            <Input type="file" label={editingId ? "Replace Image (optional)" : "Photo"} accept="image/*" onChange={(e) => setImage(e.target.files[0])} />
          </div>

          {msg && <p className="sm:col-span-2 text-sm text-civic-700 font-medium">{msg}</p>}

          <div className="sm:col-span-2 flex gap-3">
            <Button type="submit">{editingId ? "Save Changes" : "Submit Issue"}</Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={handleCancelEdit}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div className="mt-8">
        <h2 className="text-lg font-bold">My Issues</h2>
        {loading ? (
          <p className="mt-4 text-slate-500">Loading...</p>
        ) : issues.length === 0 ? (
          <p className="mt-4 text-slate-500">No issues reported yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {issues.map((issue) => (
              <Card key={issue.issue_id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-[280px]">
                    <h3 className="font-bold text-lg text-slate-900">{issue.issue_name}</h3>
                    <p className="text-sm text-civic-700 mt-1 flex items-center gap-1">
                      <span>📍</span> {issue.location}
                    </p>
                    <p className="mt-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {issue.description}
                    </p>
                    {issue.image && (
                      <div className="mt-3 relative group overflow-hidden rounded-lg w-48 h-32 shadow-md">
                        <img src={issue.image} alt="Issue evidence" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusBadge(issue.status)}`}>
                      {issue.status}
                    </span>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Button size="sm" variant="secondary" onClick={() => handleEditClick(issue)}>
                        ✏️ Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="!bg-red-600 hover:!bg-red-700 !text-white" onClick={() => handleDeleteIssue(issue.issue_id)}>
                        🗑️ Delete
                      </Button>
                      {issue.status !== "solved" && issue.status !== "resolved" && (
                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => toggleResolved(issue.issue_id, issue.status)}>
                          {issue.status === "resolved pending approval" ? "⏳ Cancel Resolve Request" : "✅ Request Resolve"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

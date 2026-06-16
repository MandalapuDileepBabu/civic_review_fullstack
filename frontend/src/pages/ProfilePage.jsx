import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, fileUrl, logout } from "../api/client";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input, { Textarea, Select } from "../components/ui/Input";
import { interestTags } from "../data/newsTopics";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [tab, setTab] = useState("profile");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    bio: "",
    city: "",
    state: "",
    pincode: "",
    profileVisibility: "community",
    interests: [],
  });
  const [avatarFile, setAvatarFile] = useState(null);

  useEffect(() => {
    apiFetch("/users/me")
      .then((p) => {
        setProfile(p);
        setForm({
          name: p.name || "",
          phone: p.phone || "",
          bio: p.bio || "",
          city: p.address?.city || "",
          state: p.address?.state || "",
          pincode: p.address?.pincode || "",
          profileVisibility: p.profileVisibility || "community",
          interests: p.interests || [],
        });
      })
      .catch((e) => setMsg(e.message));
  }, []);

  const toggleInterest = (tag) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(tag)
        ? f.interests.filter((t) => t !== tag)
        : [...f.interests, tag],
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      let avatarDriveId = profile?.avatarDriveId;
      if (avatarFile) {
        const fd = new FormData();
        fd.append("file", avatarFile);
        const up = await apiFetch("/files/upload", { method: "POST", body: fd, headers: {} });
        avatarDriveId = up.fileId;
      }
      const updated = await apiFetch("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          bio: form.bio,
          address: { city: form.city, state: form.state, pincode: form.pincode },
          profileVisibility: form.profileVisibility,
          interests: form.interests,
          avatarDriveId,
        }),
      });
      setProfile(updated);
      setMsg("Profile saved successfully.");
    } catch (err) {
      setMsg(err.message);
    }
  };

  const handleDeleteAccount = async () => {
    const isWilling = window.confirm("Are you sure you want to delete your account? This action is permanent and cannot be undone.");
    if (!isWilling) return;

    const confirmation = window.prompt("To confirm deletion, please type 'delete my account' below:");
    if (confirmation !== "delete my account") {
      alert("Account deletion cancelled. Confirmation text did not match.");
      return;
    }

    try {
      setMsg("Deleting account...");
      await apiFetch(`/deleteUser/${profile.uid}`, { method: "DELETE" });
      setMsg("Account deleted successfully.");
      logout();
      navigate("/");
      window.location.reload();
    } catch (err) {
      setMsg(`Failed to delete account: ${err.message}`);
    }
  };

  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    try {
      const data = await apiFetch(`/users/search?q=${encodeURIComponent(searchQ)}`);
      setSearchResults(data.users || []);
    } catch (err) {
      setMsg(err.message);
    }
  };

  if (!profile) {
    return (
      <div className="max-w-xl py-6">
        {msg ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-800">
            <h3 className="text-lg font-bold text-red-900">Failed to Load Profile</h3>
            <p className="mt-2 text-sm text-red-700">{msg}</p>
            <div className="mt-4 text-xs text-red-600 space-y-1">
              <p className="font-semibold">Possible troubleshooting steps:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Make sure the backend server is running and accessible on port 4000.</li>
                <li>Ensure the Cloud Firestore database has been created in the Firebase console for your project.</li>
                <li>Verify your service account and environment configuration.</li>
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-slate-600">Loading profile...</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">My Profile</h1>
      <p className="mt-1 text-slate-600">Manage your details and find people with similar interests.</p>

      <div className="mt-6 flex gap-2 border-b border-slate-200">
        {["profile", "search"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold capitalize ${tab === t ? "border-b-2 border-civic-600 text-civic-700" : "text-slate-500"}`}
          >
            {t === "search" ? "Find People" : "Edit Profile"}
          </button>
        ))}
      </div>

      {msg && <p className="mt-4 text-sm text-civic-700">{msg}</p>}

      {tab === "profile" && (
        <form onSubmit={handleSave} className="mt-6 grid gap-8 md:grid-cols-12 items-start">
          {/* Left Column: Avatar upload, bio, and profile settings */}
          <div className="md:col-span-5 space-y-6">
            <Card className="p-6 border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <h2 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Profile Picture</h2>
              <div className="relative overflow-hidden rounded-full w-32 h-32 bg-civic-50 border-4 border-white shadow-md flex items-center justify-center text-4xl font-extrabold text-civic-700 mb-4">
                {profile.avatarDriveId ? (
                  <img src={fileUrl(profile.avatarDriveId)} alt="" className="h-full w-full object-cover" />
                ) : (
                  (form.name || "?")[0].toUpperCase()
                )}
              </div>
              <Input type="file" accept="image/*" className="w-full text-xs" onChange={(e) => setAvatarFile(e.target.files[0])} />
              <p className="mt-2 text-xs text-slate-400">Supported formats: JPG, PNG. Max size: 10MB.</p>
            </Card>

            <Card className="p-6 border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Settings & Bio</h2>
              <Select label="Profile Visibility" value={form.profileVisibility} onChange={(e) => setForm({ ...form, profileVisibility: e.target.value })}>
                <option value="public">Public (Everyone)</option>
                <option value="community">Community members only</option>
                <option value="private">Private (Only me)</option>
              </Select>
              <Textarea label="Short Bio" placeholder="Tell us about yourself..." value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </Card>

            <Card className="p-6 border border-red-100 shadow-sm space-y-4 bg-red-50/30">
              <h2 className="text-sm font-bold text-red-800 uppercase tracking-wider">Danger Zone</h2>
              <div className="flex flex-col gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate("/");
                    window.location.reload();
                  }}
                  variant="secondary"
                  className="w-full justify-center shadow-sm"
                >
                  🚪 Logout
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteAccount}
                  variant="danger"
                  className="w-full justify-center shadow-sm"
                >
                  ⚠️ Delete Account
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Column: Contact info, location, interests, and action */}
          <div className="md:col-span-7 space-y-6">
            <Card className="p-6 border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Personal Information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Input label="Phone Number" placeholder="e.g. +91 9988776655" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <Input label="Email Address" value={profile.email || ""} disabled className="bg-slate-50 cursor-not-allowed" />
            </Card>

            <Card className="p-6 border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Location</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                <Input label="Pincode" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
              </div>
            </Card>

            <Card className="p-6 border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">My Interests</h2>
              <p className="text-xs text-slate-500 mb-2">Select topics to get tailored recommendations.</p>
              <div className="flex flex-wrap gap-2">
                {interestTags.map((tag) => {
                  const selected = form.interests.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleInterest(tag)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                        selected
                          ? "bg-civic-600 text-white shadow-sm scale-105"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </Card>

            <div className="flex justify-end pt-2">
              <Button type="submit" className="w-full sm:w-auto px-8 py-3 shadow-md hover:shadow-lg transition-shadow">
                💾 Save Changes
              </Button>
            </div>
          </div>
        </form>
      )}

      {tab === "search" && (
        <div className="mt-6">
          <div className="flex max-w-md gap-2">
            <Input placeholder="Search by name or phone..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} />
            <Button type="button" onClick={handleSearch}>Search</Button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {searchResults.map((u) => (
              <Card key={u.uid}>
                <div className="flex gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-civic-100 font-bold text-civic-700">
                    {u.avatarDriveId ? (
                      <img src={fileUrl(u.avatarDriveId)} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      (u.name || "?")[0].toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{u.name}</p>
                    {u.phone && <p className="text-sm text-slate-500">{u.phone}</p>}
                    {u.interests?.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {u.interests.slice(0, 3).map((i) => (
                          <span key={i} className="rounded bg-civic-50 px-2 py-0.5 text-xs text-civic-700">{i}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {searchResults.length === 0 && searchQ && <p className="mt-4 text-sm text-slate-500">No users found.</p>}
        </div>
      )}

    </div>
  );
}

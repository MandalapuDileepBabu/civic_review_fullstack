import { useEffect, useState } from "react";
import { apiFetch, API_URL } from "../api/client";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input, { Textarea, Select } from "../components/ui/Input";
import { interestTags } from "../data/newsTopics";

const TYPE_LABELS = {
  cleaning: "Cleaning Community",
  gated: "Gated Society",
  interest: "Similar Interests Group",
};

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState([]);
  const [myIds, setMyIds] = useState([]);
  const [myInterests, setMyInterests] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    name: "",
    type: "cleaning",
    description: "",
    city: "",
    area: "",
    joinPolicy: "open",
    interests: [],
  });

  const load = () => {
    const q = filter === "all" ? "" : `?type=${filter}`;
    apiFetch(`/communities${q}`)
      .then((d) => setCommunities(d.communities || []))
      .catch((e) => setMsg(e.message));
    apiFetch("/users/me")
      .then((p) => {
        setMyIds(p.communityIds || []);
        setMyInterests(p.interests || []);
      })
      .catch(() => {});
  };

  useEffect(() => { load(); }, [filter]);

  const toggleInterest = (tag) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(tag) ? f.interests.filter((t) => t !== tag) : [...f.interests, tag],
    }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiFetch("/communities", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          description: form.description,
          location: { city: form.city, area: form.area },
          joinPolicy: form.joinPolicy,
          interests: form.interests,
        }),
      });
      setShowCreate(false);
      setForm({ name: "", type: "cleaning", description: "", city: "", area: "", joinPolicy: "open", interests: [] });
      setMsg("Community created!");
      load();
    } catch (err) {
      setMsg(err.message);
    }
  };

  const handleJoin = async (id, needsInvite) => {
    try {
      const body = needsInvite ? { inviteCode } : {};
      await apiFetch(`/communities/${id}/join`, { method: "POST", body: JSON.stringify(body) });
      setMsg("Joined community!");
      setInviteCode("");
      load();
    } catch (err) {
      setMsg(err.message);
    }
  };

  const recommended = communities.filter((c) => {
    if (myIds.includes(c.id)) return false;
    if (!c.interests?.length || !myInterests.length) return false;
    return c.interests.some((i) => myInterests.includes(i));
  });

  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsgText, setNewMsgText] = useState("");
  const [newMsgImage, setNewMsgImage] = useState(null);
  const [chatError, setChatError] = useState("");
  const [sending, setSending] = useState(false);

  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [newChannelName, setNewChannelName] = useState("");
  const [showCreateChannel, setShowCreateChannel] = useState(false);

  // Fetch channels when activeChat changes
  useEffect(() => {
    if (!activeChat) {
      setChannels([]);
      setActiveChannel(null);
      return;
    }
    const loadChannels = async () => {
      try {
        const data = await apiFetch(`/communities/${activeChat.id}/channels`);
        const chs = data.channels || [];
        setChannels(chs);
        if (chs.length > 0) {
          setActiveChannel(chs[0]);
        }
      } catch (err) {
        setChatError(err.message);
      }
    };
    loadChannels();
  }, [activeChat]);

  // Load and poll messages based on activeChannel
  useEffect(() => {
    if (!activeChat || !activeChannel) {
      setMessages([]);
      return;
    }
    
    const fetchMessages = () => {
      apiFetch(`/communities/${activeChat.id}/messages?channelId=${activeChannel.id}`)
        .then(data => {
          setMessages(data.messages || []);
          setChatError("");
        })
        .catch(err => setChatError(err.message));
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [activeChat, activeChannel]);

  useEffect(() => {
    const container = document.getElementById("chat-messages-container");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMsgText.trim() && !newMsgImage) return;
    if (!activeChannel) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("text", newMsgText);
      fd.append("channelId", activeChannel.id);
      if (newMsgImage) fd.append("image", newMsgImage);

      const res = await apiFetch(`/communities/${activeChat.id}/messages`, {
        method: "POST",
        body: fd,
      });
      
      setMessages(prev => [...prev, res]);
      setNewMsgText("");
      setNewMsgImage(null);
      
      const fileInput = document.getElementById("chat-file-input");
      if (fileInput) fileInput.value = "";
    } catch (err) {
      setChatError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    try {
      const res = await apiFetch(`/communities/${activeChat.id}/channels`, {
        method: "POST",
        body: JSON.stringify({ name: newChannelName.trim() }),
      });
      setChannels(prev => [...prev, res]);
      setActiveChannel(res);
      setNewChannelName("");
      setShowCreateChannel(false);
    } catch (err) {
      setChatError(err.message);
    }
  };

  const handleDeleteChannel = async (channelId) => {
    if (!window.confirm("Are you sure you want to delete this channel and all its messages?")) return;
    try {
      await apiFetch(`/communities/${activeChat.id}/channels/${channelId}`, {
        method: "DELETE",
      });
      const updatedChannels = channels.filter(c => c.id !== channelId);
      setChannels(updatedChannels);
      if (activeChannel?.id === channelId) {
        setActiveChannel(updatedChannels[0] || null);
      }
    } catch (err) {
      setChatError(err.message);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      await apiFetch(`/communities/${activeChat.id}/messages/${messageId}`, {
        method: "DELETE",
      });
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      setChatError(err.message);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Communities</h1>
          <p className="mt-1 text-slate-600">Join cleaning groups, gated societies, or people with similar interests.</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? "Cancel" : "Create Community"}</Button>
      </div>

      {msg && <p className="mt-4 text-sm text-civic-700">{msg}</p>}

      {recommended.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold text-civic-800">Recommended — Similar Interests</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {recommended.slice(0, 4).map((c) => (
              <Card key={c.id} className="border-civic-200 bg-civic-50">
                <span className="text-xs font-medium text-civic-600">Matches your interests</span>
                <h3 className="mt-1 font-bold">{c.name}</h3>
                <p className="text-sm text-slate-600">{c.description}</p>
                <Button size="sm" className="mt-3" onClick={() => handleJoin(c.id, c.joinPolicy === "invite")}>Join</Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {showCreate && (
        <Card className="mt-6">
          <h2 className="text-lg font-bold">Create a Community</h2>
          <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="cleaning">Cleaning Community</option>
              <option value="gated">Gated Society</option>
              <option value="interest">Similar Interests Group</option>
            </Select>
            <div className="sm:col-span-2">
              <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </div>
            <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input label="Area / Locality" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
            <Select label="Join Policy" value={form.joinPolicy} onChange={(e) => setForm({ ...form, joinPolicy: e.target.value })}>
              <option value="open">Open — anyone can join</option>
              <option value="invite">Invite code required</option>
            </Select>
            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-medium">Shared Interests</p>
              <div className="flex flex-wrap gap-2">
                {interestTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleInterest(tag)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${form.interests.includes(tag) ? "bg-civic-600 text-white" : "bg-slate-100"}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit">Create</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {["all", "cleaning", "gated", "interest"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize ${filter === f ? "bg-civic-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}
          >
            {f === "all" ? "All" : TYPE_LABELS[f] || f}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {communities.map((c) => {
          const joined = myIds.includes(c.id);
          const needsInvite = c.joinPolicy === "invite";
          return (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="rounded-full bg-civic-50 px-2 py-0.5 text-xs font-medium text-civic-700">
                    {TYPE_LABELS[c.type] || c.type}
                  </span>
                  <h3 className="mt-2 text-lg font-bold">{c.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{c.description}</p>
                  {c.location && (
                    <p className="mt-1 text-xs text-slate-500">{c.location.area}, {c.location.city}</p>
                  )}
                  {c.interests?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.interests.map((i) => (
                        <span key={i} className="rounded bg-slate-100 px-2 py-0.5 text-xs">{i}</span>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-slate-400">{c.memberIds?.length || 0} members</p>
                </div>
              </div>
              {!joined && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {needsInvite && (
                    <Input
                      placeholder="Invite code"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="max-w-[140px]"
                    />
                  )}
                  <Button size="sm" onClick={() => handleJoin(c.id, needsInvite)}>Join</Button>
                </div>
              )}
              {joined && (
                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-civic-600">✓ You are a member</p>
                    {c.inviteCode && (
                      <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                        Invite Code: <strong className="font-mono text-slate-700 select-all">{c.inviteCode}</strong>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-slate-50 pt-2">
                    <span className="text-xs text-slate-400 italic">
                      {c.adminUid === localStorage.getItem("uid") ? "👑 Group Creator & Admin" : "👥 Group Member"}
                    </span>
                    <Button size="sm" onClick={() => setActiveChat(c)}>
                      💬 Open Group Chat
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      {communities.length === 0 && <p className="mt-8 text-slate-500">No communities yet. Create the first one!</p>}

      {activeChat && (
        <Card className="mt-8 border-civic-500 border bg-white shadow-lg overflow-hidden flex flex-col h-[600px]">
          {/* Header */}
          <div className="bg-civic-700 p-4 text-white flex items-center justify-between shrink-0">
            <div>
              <h2 className="font-extrabold text-lg flex items-center gap-2">
                💬 {activeChat.name} Portal
              </h2>
              <p className="text-xs text-civic-200">
                Created by {activeChat.adminUid === localStorage.getItem("uid") ? "You" : "Group Creator"}
              </p>
            </div>
            <button
              onClick={() => setActiveChat(null)}
              className="text-white hover:text-civic-100 font-bold text-sm bg-civic-800/40 hover:bg-civic-800/60 px-3 py-1.5 rounded-lg transition-colors"
            >
              ✕ Close Chat
            </button>
          </div>

          {/* Body Layout: Sidebar + Message Area */}
          <div className="flex flex-1 overflow-hidden min-h-[350px]">
            {/* Sidebar: Channels */}
            <div className="w-1/4 min-w-[180px] border-r border-slate-200 flex flex-col bg-slate-100/50 shrink-0">
              <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-100 shrink-0">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">💬 Channels</span>
                <button 
                  onClick={() => setShowCreateChannel(!showCreateChannel)} 
                  className="text-civic-600 hover:text-civic-800 text-xs font-black bg-white hover:bg-slate-50 border border-slate-200 w-6 h-6 flex items-center justify-center rounded-full shadow-sm transition-all"
                  title="Create New Channel"
                >
                  +
                </button>
              </div>

              {showCreateChannel && (
                <form onSubmit={handleCreateChannel} className="p-2 border-b border-slate-200 bg-white space-y-2 shrink-0">
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={e => setNewChannelName(e.target.value)}
                    placeholder="Channel name..."
                    className="w-full text-xs rounded border border-slate-200 px-2 py-1.5 focus:outline-none focus:border-civic-500"
                    required
                  />
                  <div className="flex gap-1">
                    <button type="submit" className="flex-1 bg-civic-600 text-white text-[10px] font-bold py-1 rounded">Create</button>
                    <button type="button" onClick={() => setShowCreateChannel(false)} className="flex-1 bg-slate-200 text-slate-700 text-[10px] font-bold py-1 rounded">Cancel</button>
                  </div>
                </form>
              )}

              <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                {channels.map(chan => {
                  const isActive = activeChannel?.id === chan.id;
                  const isDefaultGeneral = chan.name === "General Chat";
                  const isCreator = activeChat.adminUid === localStorage.getItem("uid");
                  
                  return (
                    <div 
                      key={chan.id} 
                      onClick={() => setActiveChannel(chan)}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        isActive 
                          ? "bg-civic-600 text-white shadow-sm" 
                          : "text-slate-600 hover:bg-slate-200/60"
                      }`}
                    >
                      <span className="truncate"># {chan.name}</span>
                      {isCreator && !isDefaultGeneral && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChannel(chan.id);
                          }}
                          className={`text-[10px] p-1 rounded hover:bg-red-100 hover:text-red-700 leading-none transition-colors ${
                            isActive ? "text-civic-200 hover:bg-civic-700 hover:text-white" : "text-slate-400 opacity-0 group-hover:opacity-100"
                          }`}
                          title="Delete channel"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-slate-50 min-w-0">
              {/* Active Channel Header */}
              <div className="bg-white px-4 py-2.5 border-b border-slate-200 flex items-center justify-between shrink-0">
                <span className="text-sm font-black text-slate-800">
                  # {activeChannel ? activeChannel.name : "Select a channel"}
                </span>
                <span className="text-xs text-slate-400">
                  {messages.length} messages
                </span>
              </div>

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" id="chat-messages-container" style={{ minHeight: '200px' }}>
                {messages.length === 0 ? (
                  <p className="text-slate-400 text-xs text-center py-12">No messages yet. Say hi in #{activeChannel?.name || "this channel"}!</p>
                ) : (
                  messages.map(m => {
                    const isMe = m.uid === localStorage.getItem("uid");
                    const isAdmin = m.role === "Group Admin";
                    const canDelete = isMe || activeChat.adminUid === localStorage.getItem("uid");
                    
                    return (
                      <div key={m.id} className={`group flex flex-col max-w-[85%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-bold text-slate-500">{m.userName}</span>
                          {isAdmin && (
                            <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                              👑 Creator
                            </span>
                          )}
                          <span className="text-[9px] text-slate-400">
                            {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full">
                          {isMe && canDelete && (
                            <button
                              onClick={() => handleDeleteMessage(m.id)}
                              className="text-[10px] text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold shrink-0 self-center"
                              title="Delete message"
                            >
                              ✕ Delete
                            </button>
                          )}
                          <div className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                            isMe 
                              ? "bg-civic-600 text-white rounded-tr-none" 
                              : "bg-white text-slate-800 rounded-tl-none border border-slate-200"
                          }`}>
                            {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                            {m.image && (
                              <div className="mt-2 rounded-lg overflow-hidden max-w-xs max-h-48 border border-slate-100">
                                <img 
                                  src={`${API_URL}/files/${m.image}`} 
                                  alt="Chat attachment" 
                                  className="w-full h-full object-cover cursor-pointer hover:scale-102 transition-transform"
                                  onClick={() => window.open(`${API_URL}/files/${m.image}`, "_blank")}
                                />
                              </div>
                            )}
                          </div>
                          {!isMe && canDelete && (
                            <button
                              onClick={() => handleDeleteMessage(m.id)}
                              className="text-[10px] text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity font-bold shrink-0 self-center"
                              title="Delete message"
                            >
                              ✕ Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                {chatError && <p className="text-xs text-red-600 text-center">{chatError}</p>}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="border-t border-slate-100 p-4 bg-white flex flex-col gap-2 shrink-0">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={newMsgText}
                    onChange={e => setNewMsgText(e.target.value)}
                    placeholder={`Message #${activeChannel?.name || ""}`}
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-civic-500 focus:outline-none bg-slate-50 focus:bg-white transition-colors"
                    disabled={sending || !activeChannel}
                  />
                  <button
                    type="submit"
                    disabled={sending || !activeChannel || (!newMsgText.trim() && !newMsgImage)}
                    className="bg-civic-600 hover:bg-civic-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {sending ? "Sending..." : "Send 🚀"}
                  </button>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-civic-700 transition-colors bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200">
                    <span>📷 Attach Image</span>
                    <input
                      id="chat-file-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => setNewMsgImage(e.target.files[0])}
                      disabled={sending || !activeChannel}
                    />
                  </label>
                  {newMsgImage && (
                    <span className="font-semibold text-civic-600 flex items-center gap-1">
                      ✓ {newMsgImage.name} 
                      <button type="button" className="text-red-500 hover:text-red-700 font-bold ml-1" onClick={() => {
                        setNewMsgImage(null);
                        const fileInput = document.getElementById("chat-file-input");
                        if (fileInput) fileInput.value = "";
                      }}>✕</button>
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

const crypto = require("crypto");

function generateInviteCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function sanitizeUser(doc, includePrivate = false) {
  if (!doc) return null;
  const data = doc.data ? doc.data() : doc;
  const uid = doc.id || data.uid;
  if (data.profileVisibility === "private" && !includePrivate) {
    return { uid, name: data.name, profileVisibility: "private" };
  }
  return {
    uid,
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    bio: data.bio || "",
    avatarDriveId: data.avatarDriveId || null,
    interests: data.interests || [],
    address: data.address || {},
    profileVisibility: data.profileVisibility || "community",
    communityIds: data.communityIds || [],
    role: data.role,
  };
}

module.exports = { generateInviteCode, sanitizeUser };

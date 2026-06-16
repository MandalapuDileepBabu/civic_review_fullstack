const multer = require("multer");
const driveService = require("../services/driveService");
const { generateInviteCode, sanitizeUser } = require("../services/helpers");

const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function registerExtendedRoutes(app, { db, admin, verifyJWT }) {
  // ========================
  // FILES (Drive + local fallback with user subfolders)
  // ========================
  app.post("/files/upload", verifyJWT, memoryUpload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const { fileId, storage } = await driveService.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        req.user.uid
      );
      return res.json({ fileId, storage, url: `/files/${fileId}` });
    } catch (err) {
      console.error("upload error", err);
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/files/*fileId", async (req, res) => {
    try {
      let fileId = req.params.fileId;
      if (Array.isArray(fileId)) {
        fileId = fileId.join("/");
      }
      const result = await driveService.getFileStream(fileId);
      if (!result) return res.status(404).json({ error: "File not found" });
      result.stream.pipe(res);
    } catch (err) {
      console.error("file get error", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // ========================
  // PUBLIC STATS
  // ========================
  app.get("/stats/public", async (_req, res) => {
    try {
      const [issuesSnap, commSnap] = await Promise.all([
        db.collection("issues").get(),
        db.collection("communities").get(),
      ]);
      let issuesInProgress = 0;
      let issuesResolved = 0;
      issuesSnap.docs.forEach((d) => {
        const s = d.data().status;
        if (s === "on process" || s === "in_progress") issuesInProgress++;
        if (s === "solved" || s === "resolved" || s === "issue resolved") issuesResolved++;
      });
      return res.json({
        issuesTotal: issuesSnap.size,
        issuesInProgress,
        issuesResolved,
        communitiesTotal: commSnap.size,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ========================
  // USER PROFILE
  // ========================
  app.get("/users/me", verifyJWT, async (req, res) => {
    try {
      const docRef = db.collection("users").doc(req.user.uid);
      let doc = await docRef.get();
      if (!doc.exists) {
        try {
          const authUser = await admin.auth().getUser(req.user.uid);
          const userData = {
            uid: req.user.uid,
            name: authUser.displayName || authUser.email.split("@")[0],
            email: authUser.email,
            role: req.user.role || "user",
            phone: "",
            bio: "",
            address: {},
            interests: [],
            communityIds: [],
            profileVisibility: "community",
            avatarDriveId: null,
            createdAt: admin.firestore.Timestamp.now(),
          };
          await docRef.set(userData);
          doc = await docRef.get();
        } catch (authErr) {
          console.error("Auto-creation of user doc failed", authErr);
          return res.status(404).json({ error: "User not found" });
        }
      }
      return res.json(sanitizeUser(doc, true));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.patch("/users/me", verifyJWT, async (req, res) => {
    try {
      const { name, phone, bio, address, profileVisibility, interests, avatarDriveId } = req.body;
      const ref = db.collection("users").doc(req.user.uid);
      const doc = await ref.get();
      if (!doc.exists) {
        try {
          const authUser = await admin.auth().getUser(req.user.uid);
          await ref.set({
            uid: req.user.uid,
            name: authUser.displayName || authUser.email.split("@")[0],
            email: authUser.email,
            role: req.user.role || "user",
            phone: "",
            bio: "",
            address: {},
            interests: [],
            communityIds: [],
            profileVisibility: "community",
            avatarDriveId: null,
            createdAt: admin.firestore.Timestamp.now(),
          });
        } catch (authErr) {
          console.error("Auto-creation of user doc failed in PATCH", authErr);
        }
      }
      const updates = { updatedAt: admin.firestore.Timestamp.now() };
      if (name !== undefined) updates.name = name;
      if (phone !== undefined) updates.phone = phone;
      if (bio !== undefined) updates.bio = bio;
      if (address !== undefined) updates.address = address;
      if (profileVisibility !== undefined) updates.profileVisibility = profileVisibility;
      if (interests !== undefined) updates.interests = interests;
      if (avatarDriveId !== undefined) updates.avatarDriveId = avatarDriveId;
      await ref.update(updates);
      const updatedDoc = await ref.get();
      return res.json(sanitizeUser(updatedDoc, true));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/users/search", verifyJWT, async (req, res) => {
    try {
      const q = (req.query.q || "").toLowerCase().trim();
      if (!q) return res.json({ users: [] });
      const snapshot = await db.collection("users").get();
      const users = snapshot.docs
        .map((d) => sanitizeUser(d))
        .filter((u) => {
          if (u.uid === req.user.uid) return false;
          if (u.profileVisibility === "private") return false;
          const nameMatch = (u.name || "").toLowerCase().includes(q);
          const phoneMatch = (u.phone || "").includes(q);
          const interestMatch = (u.interests || []).some((i) => i.toLowerCase().includes(q));
          return nameMatch || phoneMatch || interestMatch;
        })
        .slice(0, 20);
      return res.json({ users });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ========================
  // COMMUNITIES
  // ========================
  app.post("/communities", verifyJWT, async (req, res) => {
    try {
      const { name, type, description, location, joinPolicy, interests } = req.body;
      if (!name || !type || !description)
        return res.status(400).json({ error: "name, type, and description required" });
      
      let inviteCode = null;
      if (joinPolicy === "invite") {
        let unique = false;
        while (!unique) {
          const code = generateInviteCode();
          const dupSnap = await db.collection("communities").where("inviteCode", "==", code).get();
          if (dupSnap.empty) {
            inviteCode = code;
            unique = true;
          }
        }
      }

      const community = {
        name,
        type,
        description,
        location: location || {},
        adminUid: req.user.uid,
        memberIds: [req.user.uid],
        joinPolicy: joinPolicy || "open",
        inviteCode,
        interests: interests || [],
        createdAt: admin.firestore.Timestamp.now(),
      };
      const docRef = await db.collection("communities").add(community);
      const userRef = db.collection("users").doc(req.user.uid);
      const userDoc = await userRef.get();
      const ids = userDoc.exists ? userDoc.data().communityIds || [] : [];
      if (!ids.includes(docRef.id)) {
        await userRef.update({ communityIds: [...ids, docRef.id] });
      }
      return res.json({ id: docRef.id, ...community, inviteCode });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/communities", verifyJWT, async (req, res) => {
    try {
      const { type } = req.query;
      const snapshot = await db.collection("communities").get();
      let communities = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      communities.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || 0;
        const tb = b.createdAt?.toMillis?.() || 0;
        return tb - ta;
      });
      if (type) communities = communities.filter((c) => c.type === type);
      return res.json({ communities });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get("/communities/:id", verifyJWT, async (req, res) => {
    try {
      const doc = await db.collection("communities").doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: "Not found" });
      return res.json({ id: doc.id, ...doc.data() });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post("/communities/:id/join", verifyJWT, async (req, res) => {
    try {
      const ref = db.collection("communities").doc(req.params.id);
      const doc = await ref.get();
      if (!doc.exists) return res.status(404).json({ error: "Not found" });
      const data = doc.data();
      if (data.memberIds.includes(req.user.uid))
        return res.status(400).json({ error: "Already a member" });
      if (data.joinPolicy === "invite") {
        const { inviteCode } = req.body;
        if (inviteCode !== data.inviteCode)
          return res.status(403).json({ error: "Invalid invite code" });
      }
      await ref.update({ memberIds: [...data.memberIds, req.user.uid] });
      const userRef = db.collection("users").doc(req.user.uid);
      const userDoc = await userRef.get();
      const ids = userDoc.data()?.communityIds || [];
      if (!ids.includes(req.params.id)) {
        await userRef.update({ communityIds: [...ids, req.params.id] });
      }
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ========================
  // COMMUNITY CHAT & MULTIPLE CHANNELS
  // ========================
  const path = require("path");

  // GET /communities/:id/channels
  app.get("/communities/:id/channels", verifyJWT, async (req, res) => {
    try {
      const { id: communityId } = req.params;
      const commDoc = await db.collection("communities").doc(communityId).get();
      if (!commDoc.exists) return res.status(404).json({ error: "Community not found" });
      const commData = commDoc.data();
      if (!commData.memberIds.includes(req.user.uid)) {
        return res.status(403).json({ error: "Access denied: You must be a member to view channels" });
      }
      
      const snapshot = await db.collection("community_channels").where("communityId", "==", communityId).get();
      let channels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // If no channels exist yet, auto-create a default 'General Chat' channel
      if (channels.length === 0) {
        const defaultChannel = {
          communityId,
          name: "General Chat",
          createdAt: admin.firestore.Timestamp.now(),
        };
        const docRef = await db.collection("community_channels").add(defaultChannel);
        channels = [{ id: docRef.id, ...defaultChannel }];
      } else {
        channels.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
      }
      
      return res.json({ channels });
    } catch (err) {
      console.error("Error fetching channels:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /communities/:id/channels
  app.post("/communities/:id/channels", verifyJWT, async (req, res) => {
    try {
      const { id: communityId } = req.params;
      const { name } = req.body;
      if (!name || !name.trim()) return res.status(400).json({ error: "Channel name is required" });
      
      const commDoc = await db.collection("communities").doc(communityId).get();
      if (!commDoc.exists) return res.status(404).json({ error: "Community not found" });
      const commData = commDoc.data();
      
      // Only community members can create channels
      if (!commData.memberIds.includes(req.user.uid)) {
        return res.status(403).json({ error: "Access denied: You must be a member to create channels" });
      }
      
      const newChannel = {
        communityId,
        name: name.trim(),
        createdAt: admin.firestore.Timestamp.now(),
      };
      const docRef = await db.collection("community_channels").add(newChannel);
      return res.json({ id: docRef.id, ...newChannel });
    } catch (err) {
      console.error("Error creating channel:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // DELETE /communities/:id/channels/:channelId
  app.delete("/communities/:id/channels/:channelId", verifyJWT, async (req, res) => {
    try {
      const { id: communityId, channelId } = req.params;
      const commDoc = await db.collection("communities").doc(communityId).get();
      if (!commDoc.exists) return res.status(404).json({ error: "Community not found" });
      const commData = commDoc.data();
      
      // Only community admin/creator can delete channels
      if (commData.adminUid !== req.user.uid) {
        return res.status(403).json({ error: "Access denied: Only group creator can delete channels" });
      }
      
      // Delete the channel
      await db.collection("community_channels").doc(channelId).delete();
      
      // Delete all messages associated with this channel
      const msgSnapshot = await db.collection("community_messages").where("channelId", "==", channelId).get();
      const batch = db.batch();
      msgSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      return res.json({ success: true });
    } catch (err) {
      console.error("Error deleting channel:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // GET /communities/:id/messages
  app.get("/communities/:id/messages", verifyJWT, async (req, res) => {
    try {
      const { id } = req.params;
      let { channelId } = req.query;
      
      // Verify user is member of community
      const commDoc = await db.collection("communities").doc(id).get();
      if (!commDoc.exists) return res.status(404).json({ error: "Community not found" });
      const commData = commDoc.data();
      if (!commData.memberIds.includes(req.user.uid)) {
        return res.status(403).json({ error: "Access denied: You must be a member to view messages" });
      }
      
      // If no channelId is specified, find the default (oldest) channel
      if (!channelId) {
        const chanSnapshot = await db.collection("community_channels")
          .where("communityId", "==", id)
          .get();
        if (chanSnapshot.empty) {
          const defaultChannel = {
            communityId: id,
            name: "General Chat",
            createdAt: admin.firestore.Timestamp.now(),
          };
          const docRef = await db.collection("community_channels").add(defaultChannel);
          channelId = docRef.id;
        } else {
          const channels = chanSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          channels.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
          channelId = channels[0].id;
        }
      }
      
      // Fetch messages filtered by communityId and channelId
      const snapshot = await db.collection("community_messages")
        .where("communityId", "==", id)
        .where("channelId", "==", channelId)
        .get();
        
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toMillis() || null,
      }));
      
      messages.sort((a, b) => {
        const valA = a.createdAt || 0;
        const valB = b.createdAt || 0;
        return valA - valB;
      });
      
      return res.json({ messages, channelId });
    } catch (err) {
      console.error("Error fetching messages:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // POST /communities/:id/messages
  app.post("/communities/:id/messages", verifyJWT, memoryUpload.single("image"), async (req, res) => {
    try {
      const { id } = req.params;
      const { text, channelId } = req.body;
      
      if (!channelId) return res.status(400).json({ error: "channelId is required to post a message" });
      
      // Verify user is member of community
      const commDoc = await db.collection("communities").doc(id).get();
      if (!commDoc.exists) return res.status(404).json({ error: "Community not found" });
      const commData = commDoc.data();
      if (!commData.memberIds.includes(req.user.uid)) {
        return res.status(403).json({ error: "Access denied: You must be a member to send messages" });
      }

      // Find user's display name from Firestore
      const userDoc = await db.collection("users").doc(req.user.uid).get();
      const userName = userDoc.exists ? userDoc.data().name : (req.user.name || "User");
      
      let imageId = null;
      if (req.file) {
        // Upload image to Drive (or local storage fallback)
        const ext = path.extname(req.file.originalname) || ".jpg";
        const filename = `chat_${id}_${Date.now()}${ext}`;
        const uploaded = await driveService.uploadFile(
          req.file.buffer,
          filename,
          req.file.mimetype,
          "chats"
        );
        imageId = uploaded.fileId;
      }
      
      const isCreator = commData.adminUid === req.user.uid;
      const messageData = {
        communityId: id,
        channelId,
        uid: req.user.uid,
        userName,
        role: isCreator ? "Group Admin" : "Member",
        text: text || "",
        image: imageId,
        createdAt: admin.firestore.Timestamp.now(),
      };
      
      const docRef = await db.collection("community_messages").add(messageData);
      
      return res.json({
        id: docRef.id,
        ...messageData,
        createdAt: messageData.createdAt.toMillis(),
      });
    } catch (err) {
      console.error("Error sending message:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // DELETE /communities/:id/messages/:messageId
  app.delete("/communities/:id/messages/:messageId", verifyJWT, async (req, res) => {
    try {
      const { id: communityId, messageId } = req.params;
      
      const msgRef = db.collection("community_messages").doc(messageId);
      const msgDoc = await msgRef.get();
      if (!msgDoc.exists) return res.status(404).json({ error: "Message not found" });
      const msgData = msgDoc.data();
      
      // Verify user is either message author OR community admin (creator)
      const commDoc = await db.collection("communities").doc(communityId).get();
      if (!commDoc.exists) return res.status(404).json({ error: "Community not found" });
      const commData = commDoc.data();
      
      const isAuthor = msgData.uid === req.user.uid;
      const isAdmin = commData.adminUid === req.user.uid;
      
      if (!isAuthor && !isAdmin) {
        return res.status(403).json({ error: "Unauthorized: You can only delete your own messages or messages in your created community" });
      }
      
      // Delete attached file if any
      if (msgData.image) {
        await driveService.deleteFile(msgData.image);
      }
      
      await msgRef.delete();
      return res.json({ success: true });
    } catch (err) {
      console.error("Error deleting message:", err);
      return res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { registerExtendedRoutes, memoryUpload };

const { Readable } = require("stream");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const UPLOADS_DIR = path.join(__dirname, "../uploads");
const TOKEN_PATH = path.join(__dirname, "../token.json");
const CREDENTIALS_PATH = path.join(__dirname, "../credentials.json");

// Ensure local uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let driveClient = null;

function initDrive() {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    console.log("Google Drive folder ID not set (GOOGLE_DRIVE_FOLDER_ID missing) — file uploads will fall back to local storage");
    return null;
  }

  let credentials = null;
  let token = null;

  // 1. Try reading from environment variables
  if (process.env.GOOGLE_DRIVE_CREDENTIALS && process.env.GOOGLE_DRIVE_TOKEN) {
    try {
      credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
      token = JSON.parse(process.env.GOOGLE_DRIVE_TOKEN);
      console.log("Google Drive credentials and token loaded from environment variables");
    } catch (err) {
      console.warn("Failed to parse Google Drive OAuth2 from env variables:", err.message);
    }
  }

  // 2. Fall back to local files
  if ((!credentials || !token) && fs.existsSync(CREDENTIALS_PATH) && fs.existsSync(TOKEN_PATH)) {
    try {
      credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
      token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
      console.log("Google Drive credentials and token loaded from files");
    } catch (err) {
      console.warn("Failed to read credentials.json or token.json files:", err.message);
    }
  }

  if (credentials && token) {
    try {
      const clientInfo = credentials.web || credentials.installed;
      if (clientInfo) {
        const { client_secret, client_id, redirect_uris } = clientInfo;
        const redirectUri = redirect_uris ? redirect_uris[0] : 'http://localhost:5000/oauth2callback';
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);
        oAuth2Client.setCredentials(token);
        
        // Automatically save refreshed tokens back to token.json if file exists
        oAuth2Client.on('tokens', (newTokens) => {
          try {
            const updatedToken = { ...token, ...newTokens };
            if (fs.existsSync(TOKEN_PATH)) {
              fs.writeFileSync(TOKEN_PATH, JSON.stringify(updatedToken, null, 2), "utf8");
              console.log("ℹ️ Google Drive OAuth tokens automatically refreshed and saved to token.json");
            } else {
              console.log("ℹ️ Google Drive OAuth tokens automatically refreshed in memory");
            }
          } catch (writeErr) {
            console.warn("⚠️ Failed to auto-save refreshed OAuth token:", writeErr.message);
          }
        });

        driveClient = google.drive({ version: "v3", auth: oAuth2Client });
        console.log("Google Drive storage enabled via User OAuth2");
        return { driveClient, folderId };
      }
    } catch (err) {
      console.warn("User OAuth2 initialization failed:", err.message);
    }
  }

  // 2. Fall back to Service Account keyFile
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
  if (keyPath && fs.existsSync(keyPath)) {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: keyPath,
        scopes: ["https://www.googleapis.com/auth/drive.file"],
      });
      driveClient = google.drive({ version: "v3", auth });
      console.log("Google Drive storage enabled via Service Account");
      return { driveClient, folderId };
    } catch (err) {
      console.warn("Service Account Drive init failed:", err.message);
    }
  }

  console.log("Google Drive not configured (no valid OAuth2 token or Service Account found) — file uploads will fall back to local storage");
  return null;
}

const driveConfig = initDrive();

async function getOrCreateUserFolder(drive, parentFolderId, userId) {
  try {
    const q = `name = '${userId}' and mimeType = 'application/vnd.google-apps.folder' and '${parentFolderId}' in parents and trashed = false`;
    const response = await drive.files.list({
      q,
      fields: "files(id)",
      spaces: "drive",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    const files = response.data.files;
    if (files && files.length > 0) {
      return files[0].id;
    }
    
    const folderMetadata = {
      name: userId,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId]
    };
    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: "id",
      supportsAllDrives: true
    });
    console.log(`Created new Google Drive folder for user ${userId}: ${folder.data.id}`);
    return folder.data.id;
  } catch (err) {
    console.error("Error in getOrCreateUserFolder:", err.message);
    return parentFolderId;
  }
}

async function uploadToDrive(buffer, filename, mimeType, userId) {
  if (!driveConfig) return null;
  const { driveClient: drive, folderId } = driveConfig;
  
  let targetFolderId = folderId;
  if (userId) {
    targetFolderId = await getOrCreateUserFolder(drive, folderId, userId);
  }

  const res = await drive.files.create({
    requestBody: { name: filename, parents: [targetFolderId] },
    media: { mimeType: mimeType || "application/octet-stream", body: Readable.from(buffer) },
    fields: "id",
    supportsAllDrives: true,
  });
  try {
    await drive.permissions.create({
      fileId: res.data.id,
      requestBody: { role: "reader", type: "anyone" },
      supportsAllDrives: true,
    });
  } catch (permErr) {
    console.warn("Google Drive: Failed to set public reader permissions for file:", permErr.message);
  }
  return res.data.id;
}

async function getDriveStream(fileId) {
  if (!driveConfig) return null;
  const res = await driveConfig.driveClient.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "stream" }
  );
  return res.data;
}

async function deleteFromDrive(fileId) {
  if (!driveConfig) return null;
  try {
    await driveConfig.driveClient.files.delete({ fileId, supportsAllDrives: true });
    console.log(`Deleted file ${fileId} from Google Drive`);
    return true;
  } catch (err) {
    console.warn(`Failed to delete file ${fileId} from Google Drive:`, err.message);
    return false;
  }
}

module.exports = {
  uploadFile: async (buffer, filename, mimetype, userId) => {
    if (driveConfig) {
      try {
        const driveId = await uploadToDrive(buffer, filename, mimetype, userId);
        if (driveId) {
          return { fileId: driveId, storage: "drive" };
        }
      } catch (err) {
        console.warn("Google Drive upload failed, falling back to local storage:", err.message);
      }
    }

    try {
      const ext = path.extname(filename) || ".jpg";
      const base = path.basename(filename, ext);
      const uniqueName = `${base}-${Date.now()}${ext}`;
      
      const relativePath = userId ? `${userId}/${uniqueName}` : uniqueName;
      const filePath = path.join(UPLOADS_DIR, relativePath);
      
      // Prevent path traversal
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(path.resolve(UPLOADS_DIR))) {
        throw new Error("Path traversal attempt detected");
      }
      
      const fileDir = path.dirname(filePath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      
      await fs.promises.writeFile(filePath, buffer);
      console.log(`Saved file locally: ${relativePath}`);
      return { fileId: relativePath, storage: "local" };
    } catch (localErr) {
      console.error("Local file storage failed:", localErr);
      throw new Error("File upload failed on both Google Drive and local storage");
    }
  },

  getFileStream: async (fileId) => {
    // Prevent path traversal
    const filePath = path.join(UPLOADS_DIR, fileId);
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(UPLOADS_DIR))) {
      console.error("Path traversal attempt detected:", fileId);
      return null;
    }

    if (fs.existsSync(filePath)) {
      try {
        const stream = fs.createReadStream(filePath);
        return { stream, storage: "local" };
      } catch (err) {
        console.error("Failed to read local file stream:", err.message);
      }
    }

    if (driveConfig) {
      try {
        const stream = await getDriveStream(fileId);
        return { stream, storage: "drive" };
      } catch (err) {
        console.error("Failed to fetch stream from Drive:", err.message);
        return null;
      }
    }
    return null;
  },

  deleteFile: async (fileId) => {
    const filePath = path.join(UPLOADS_DIR, fileId);
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(UPLOADS_DIR))) {
      console.error("Path traversal attempt detected:", fileId);
      return false;
    }

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted local file: ${fileId}`);
        return true;
      } catch (err) {
        console.warn(`Failed to delete local file ${fileId}:`, err.message);
      }
    }
    return await deleteFromDrive(fileId);
  },

  createUserFolder: async (userId) => {
    if (driveConfig) {
      try {
        const { driveClient: drive, folderId } = driveConfig;
        await getOrCreateUserFolder(drive, folderId, userId);
      } catch (err) {
        console.warn(`Failed to pre-create Google Drive folder for user ${userId}:`, err.message);
      }
    }
  },

  deleteUserFolder: async (userId) => {
    // 1. Delete local folder if exists
    const userDirPath = path.join(UPLOADS_DIR, userId);
    const resolvedPath = path.resolve(userDirPath);
    if (resolvedPath.startsWith(path.resolve(UPLOADS_DIR)) && fs.existsSync(userDirPath)) {
      try {
        fs.rmSync(userDirPath, { recursive: true, force: true });
        console.log(`Deleted local folder for user: ${userId}`);
      } catch (err) {
        console.warn(`Failed to delete local folder for user ${userId}:`, err.message);
      }
    }

    // 2. Delete folder in Google Drive if configured
    if (driveConfig) {
      try {
        const { driveClient: drive, folderId } = driveConfig;
        const q = `name = '${userId}' and mimeType = 'application/vnd.google-apps.folder' and '${folderId}' in parents and trashed = false`;
        const response = await drive.files.list({
          q,
          fields: "files(id)",
          spaces: "drive",
          supportsAllDrives: true,
          includeItemsFromAllDrives: true
        });
        const files = response.data.files;
        if (files && files.length > 0) {
          for (const folder of files) {
            await drive.files.delete({ fileId: folder.id, supportsAllDrives: true });
            console.log(`Deleted Google Drive folder for user ${userId}: ${folder.id}`);
          }
        }
      } catch (err) {
        console.warn(`Failed to delete Google Drive folder for user ${userId}:`, err.message);
      }
    }
  }
};



const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

// Scopes required to interact with Google Drive
const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = 'token.json';
const CREDENTIALS_PATH = 'credentials.json';

// Load client secrets from a local file.
fs.readFile(CREDENTIALS_PATH, (err, content) => {
  if (err) {
    console.log('❌ Error loading client secret file:', err.message);
    console.log(`👉 Please make sure you download the OAuth credentials JSON from Google Cloud Console, rename it to '${CREDENTIALS_PATH}', and place it in the backend directory.`);
    return;
  }
  
  try {
    const credentials = JSON.parse(content);
    authorize(credentials, getNewToken);
  } catch (parseErr) {
    console.error('❌ Failed to parse credentials.json:', parseErr.message);
  }
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback.
 * @param {Object} credentials The client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const clientInfo = credentials.web || credentials.installed;
  if (!clientInfo) {
    console.error('❌ Invalid credentials.json format. The file must contain a "web" or "installed" object.');
    return;
  }

  const { client_secret, client_id, redirect_uris } = clientInfo;
  if (!client_id || !client_secret) {
    console.error('❌ Missing client_id or client_secret in credentials.json.');
    return;
  }

  // Use redirect URI if specified in client credentials, otherwise default
  const redirectUri = (redirect_uris && redirect_uris.length > 0) 
    ? redirect_uris[0] 
    : 'http://localhost:5000/oauth2callback';

  console.log(`Using redirect URI: ${redirectUri}`);
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirectUri);

  // Check if we already have a token stored
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) {
      return callback(oAuth2Client);
    }
    console.log(`ℹ️ A token already exists at '${TOKEN_PATH}'.`);
    console.log('If you want to generate a new token, please delete token.json and run this script again.');
  });
}

/**
 * Get and store new token after prompting for user authorization.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 */
function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent screen to guarantee refresh token is returned
  });

  console.log('\n🔑 Authorize this app by visiting this URL:');
  console.log('===========================================');
  console.log(authUrl);
  console.log('===========================================\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('👉 Paste the code from the redirected URL callback here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code.trim(), (err, token) => {
      if (err) {
        return console.error('💥 Error retrieving access token:', err.message);
      }
      oAuth2Client.setCredentials(token);
      
      // Store the token to disk
      fs.writeFile(TOKEN_PATH, JSON.stringify(token, null, 2), (writeErr) => {
        if (writeErr) return console.error('💥 Error saving token.json:', writeErr.message);
        console.log(`\n✅ Success! Token stored to '${TOKEN_PATH}'.`);
      });
    });
  });
}

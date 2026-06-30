const { app, BrowserWindow, dialog } = require('electron');
// const remoteMain = require('@electron/remote/main');

const path = require("path");
const fs = require('fs');

let mainWindow

let env = 'dev'

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 1000,
    minWidth: 900,
    minHeight: 900,
    webPreferences: {
      nodeIntegration: true, // Enable Node.js integration in the Angular app
      contextIsolation: true,  // Disable context isolation for easier IPC
      enableRemoteModule: false, // Ensure this is false
      // webSecurity: false,
      // enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  })

// mainWindow.loadURL(`file://${__dirname}/index.html`);
// debugging opens with localhost
let debugging = false;
  if (debugging) {
    mainWindow.loadURL('http://localhost:4200');
    // mainWindow.loadURL('./src/index.html');
  } else {
    const indexPath = path.join(__dirname, 'dist', 'video-notes', 'index.html');

    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      console.error('Renderer index.html not found at:', indexPath);
      mainWindow.loadURL('data:text/html;charset=utf-8,<h2>Build missing</h2><p>Run: npm run build:prod</p>');
    }
  }
  const openDevTools = process.env.OPEN_DEVTOOLS === 'true';
  if (!app.isPackaged && openDevTools) {
    mainWindow.webContents.openDevTools()
  }
}

// Define IPC handlers in the main process
const { ipcMain } = require('electron');

// Open Dialog
ipcMain.handle('openDialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections']
  });
  return result.filePaths; // Returns selected file paths to Angular
});

ipcMain.handle('save-file-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: options?.title || 'Save File',
    defaultPath: options?.defaultPath,
    filters: options?.filters || []
  });

  return {
    canceled: result.canceled,
    filePath: result.filePath || null
  };
});

ipcMain.handle('write-file', async (event, payload) => {
  try {
    const filePath = payload?.filePath;
    const data = payload?.data;
    const encoding = payload?.encoding || 'utf8';

    if (!filePath) {
      return { success: false, error: 'Missing file path.' };
    }

    if (encoding === 'base64') {
      fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
    } else {
      fs.writeFileSync(filePath, data, { encoding });
    }

    return { success: true };
  } catch (error) {
    console.error('write-file failed:', error);
    return { success: false, error: error?.message || 'Unknown write error.' };
  }
});

// Payments
const axios = require('axios'); // For API requests

function extractYouTubeVideoId(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('youtu.be')) {
      return parsed.pathname.replace(/^\//, '').trim();
    }

    if (host.includes('youtube.com')) {
      return parsed.searchParams.get('v') || '';
    }

    return '';
  } catch {
    return '';
  }
}

function parseTrackAttributes(attributeText) {
  const attributes = {};
  const attrRegex = /(\w+)="([^"]*)"/g;
  let match;

  while ((match = attrRegex.exec(attributeText)) !== null) {
    attributes[match[1]] = match[2];
  }

  return attributes;
}

function parseTrackListXml(xmlText) {
  const tracks = [];
  const trackRegex = /<track\b([^>]*)\/>/g;
  let match;

  while ((match = trackRegex.exec(xmlText)) !== null) {
    tracks.push(parseTrackAttributes(match[1]));
  }

  return tracks;
}

function sanitizeCaptionText(text) {
  return (text || '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseJson3Events(jsonPayload) {
  const events = Array.isArray(jsonPayload?.events) ? jsonPayload.events : [];

  return events
    .map((event) => {
      const startMs = Number(event?.tStartMs || 0);
      const durationMs = Number(event?.dDurationMs || 0);
      const segs = Array.isArray(event?.segs) ? event.segs : [];
      const text = sanitizeCaptionText(segs.map((segment) => segment?.utf8 || '').join(''));

      if (!text) {
        return null;
      }

      return {
        startSec: Math.max(0, Math.floor(startMs / 1000)),
        endSec: Math.max(0, Math.floor((startMs + durationMs) / 1000)),
        text
      };
    })
    .filter(Boolean);
}

async function fetchYouTubeTranscriptSegments(sourceUrl) {
  const videoId = extractYouTubeVideoId(sourceUrl);
  if (!videoId) {
    return { success: false, error: 'Invalid YouTube URL.' };
  }

  const listUrl = `https://video.google.com/timedtext?type=list&v=${encodeURIComponent(videoId)}`;
  const listResponse = await axios.get(listUrl);
  const tracks = parseTrackListXml(listResponse?.data || '');

  if (!tracks.length) {
    return { success: false, error: 'No caption tracks available for this video.' };
  }

  const englishTrack = tracks.find((track) => (track.lang_code || '').toLowerCase().startsWith('en'));
  const selectedTrack = englishTrack || tracks[0];

  const params = new URLSearchParams({
    v: videoId,
    lang: selectedTrack.lang_code || 'en',
    fmt: 'json3'
  });

  if (selectedTrack.name) {
    params.set('name', selectedTrack.name);
  }

  const transcriptUrl = `https://www.youtube.com/api/timedtext?${params.toString()}`;
  const transcriptResponse = await axios.get(transcriptUrl);
  const segments = parseJson3Events(transcriptResponse?.data || {});

  if (!segments.length) {
    return { success: false, error: 'Transcript was fetched but contained no readable text.' };
  }

  return {
    success: true,
    source: 'caption',
    videoId,
    language: selectedTrack.lang_code || 'unknown',
    segments
  };
}


// Load Premium Status function
const premiumFilePath = path.join(app.getPath('userData'), 'premium.json');
function loadPremiumStatus() {
  if (!fs.existsSync(premiumFilePath)) {
    return false; // Default to non-premium
  }

  try {
    const data = JSON.parse(fs.readFileSync(premiumFilePath, 'utf8'));
    return data.premium === true; // Return true if premium
  } catch (error) {
    console.error('Error loading premium status:', error);
    return false; // Default to non-premium on error
  }
}

// Function to activate the key
function activateKey(key) {
  // Simulated list of valid keys
  const validKeys = ['VALID-KEY-123', 'ANOTHER-KEY-456'];
  if (validKeys.includes(key)) {
    
    const premiumData = { premium: true, activatedAt: new Date().toISOString() };
    fs.writeFileSync(premiumFilePath, JSON.stringify(premiumData, null, 2));
    return { success: true, message: 'Activation successful!' };
  } else {
    return { success: false, message: 'Invalid activation key.' };
  }
}

// IPC handler for activating the key
ipcMain.handle('activate-key', (event, key) => {
  return activateKey(key);
});

ipcMain.handle('fetch-youtube-transcript', async (_event, sourceUrl) => {
  try {
    return await fetchYouTubeTranscriptSegments(sourceUrl);
  } catch (error) {
    console.error('fetch-youtube-transcript failed:', error);
    return {
      success: false,
      error: error?.message || 'Unknown transcript fetch error.'
    };
  }
});


// app.on('ready', createWindow)
app.whenReady().then(() => {
  createWindow();

  // Register the IPC handler
  ipcMain.handle('load-premium-status', async () => {
    return loadPremiumStatus();
  });
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (mainWindow === null) createWindow()
  // mainWindow.loadURL('http://localhost:4200');
})
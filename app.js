const { app, BrowserWindow, dialog } = require('electron');
// const remoteMain = require('@electron/remote/main');

const path = require("path");
const fs = require('fs');
const { spawn } = require('child_process');

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
  if (!app.isPackaged) {
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

function sanitizeCaptionText(text) {
  return (text || '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk || '');
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk || '');
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const commandError = new Error(`${command} failed with code ${code}`);
      commandError.stdout = stdout;
      commandError.stderr = stderr;
      commandError.exitCode = code;
      reject(commandError);
    });
  });
}

function getPlatformArchFolder() {
  return `${process.platform}-${process.arch}`;
}

function getBundledToolsRootCandidates() {
  const platformArch = getPlatformArchFolder();

  // In development, binaries live in the repository under local-binaries.
  // In packaged app, binaries are copied into app resources.
  return [
    path.join(__dirname, 'local-binaries', platformArch),
    path.join(__dirname, 'app.asar.unpacked', 'local-binaries', platformArch),
    path.join(process.resourcesPath || '', 'local-binaries', platformArch),
    path.join(process.resourcesPath || '', 'app', 'local-binaries', platformArch),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'local-binaries', platformArch)
  ];
}

function resolveBundledCommand(commandNames) {
  const roots = getBundledToolsRootCandidates();

  for (const rootDir of roots) {
    for (const commandName of commandNames) {
      const candidatePath = path.join(rootDir, commandName);
      if (fs.existsSync(candidatePath)) {
        return candidatePath;
      }
    }
  }

  return null;
}

function getBundledCommandLookupCandidates(commandNames) {
  const roots = getBundledToolsRootCandidates();
  const candidates = [];

  for (const rootDir of roots) {
    for (const commandName of commandNames) {
      candidates.push(path.join(rootDir, commandName));
    }
  }

  return candidates;
}

function resolveBundledModel(modelNames) {
  const roots = getBundledToolsRootCandidates();

  for (const rootDir of roots) {
    for (const modelName of modelNames) {
      const directPath = path.join(rootDir, modelName);
      if (fs.existsSync(directPath)) {
        return directPath;
      }

      const nestedPath = path.join(rootDir, 'models', modelName);
      if (fs.existsSync(nestedPath)) {
        return nestedPath;
      }
    }
  }

  return null;
}

function getBundledLibDirectory() {
  const roots = getBundledToolsRootCandidates();
  for (const rootDir of roots) {
    const libDir = path.join(rootDir, 'lib');
    if (fs.existsSync(libDir)) {
      return libDir;
    }
  }

  return null;
}

function getLocalTranscribeReadiness() {
  const platformArch = getPlatformArchFolder();
  const roots = getBundledToolsRootCandidates();
  const whisperCandidates = ['whisper-cli', 'main', 'whisper'];
  const modelCandidates = ['ggml-base.en.bin', 'ggml-base.bin', 'ggml-tiny.en.bin', 'ggml-tiny.bin'];

  const ytDlpPath = resolveBundledCommand(['yt-dlp']);
  const ffmpegPath = resolveBundledCommand(['ffmpeg']);
  const whisperPath = resolveBundledCommand(whisperCandidates);
  const modelPath = resolveBundledModel(modelCandidates);
  const libDir = getBundledLibDirectory();

  const missing = [];

  if (!ytDlpPath) {
    missing.push('yt-dlp binary');
  }

  if (!ffmpegPath) {
    missing.push('ffmpeg binary');
  }

  if (!whisperPath) {
    missing.push('whisper binary');
  }

  if (!modelPath) {
    missing.push(`whisper model (${modelCandidates.join(', ')})`);
  }

  if (process.platform === 'darwin') {
    const requiredLibs = ['libwhisper.1.dylib', 'libggml.0.dylib', 'libggml-base.0.dylib'];
    for (const libName of requiredLibs) {
      const libFound = roots.some((rootDir) => fs.existsSync(path.join(rootDir, 'lib', libName)));
      if (!libFound) {
        missing.push(`macOS whisper library ${libName}`);
      }
    }
  }

  const siblingArchs = ['arm64', 'x64'].filter((arch) => arch !== process.arch);
  const siblingHints = [];
  if (!whisperPath) {
    for (const siblingArch of siblingArchs) {
      const siblingRoot = path.join(__dirname, 'local-binaries', `${process.platform}-${siblingArch}`);
      const siblingWhisper = whisperCandidates
        .map((name) => path.join(siblingRoot, name))
        .find((candidatePath) => fs.existsSync(candidatePath));
      if (siblingWhisper) {
        siblingHints.push(`Found ${siblingWhisper}, but runtime expects ${platformArch}`);
      }
    }
  }

  return {
    ready: missing.length === 0,
    platform: process.platform,
    arch: process.arch,
    platformArch,
    isPackaged: app.isPackaged,
    roots,
    resolved: {
      ytDlpPath,
      ffmpegPath,
      whisperPath,
      modelPath,
      libDir
    },
    missing,
    siblingHints
  };
}

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function parseWhisperJsonSegments(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return [];
  }

  const pythonSegments = Array.isArray(parsed?.segments) ? parsed.segments : [];
  if (pythonSegments.length) {
    return pythonSegments
      .map((segment) => {
        const text = sanitizeCaptionText(segment?.text || '');
        if (!text) {
          return null;
        }

        return {
          startSec: Math.max(0, Math.floor(Number(segment?.start || 0))),
          endSec: Math.max(0, Math.floor(Number(segment?.end || 0))),
          text
        };
      })
      .filter(Boolean);
  }

  // whisper.cpp JSON format
  const cppSegments = Array.isArray(parsed?.transcription) ? parsed.transcription : [];
  return cppSegments
    .map((segment) => {
      const text = sanitizeCaptionText(segment?.text || '');
      if (!text) {
        return null;
      }

      const fromMs = Number(segment?.offsets?.from ?? 0);
      const toMs = Number(segment?.offsets?.to ?? fromMs);

      return {
        startSec: Math.max(0, Math.floor(fromMs / 1000)),
        endSec: Math.max(0, Math.floor(toMs / 1000)),
        text
      };
    })
    .filter(Boolean);
}

function getWhisperDetectedLanguage(jsonText) {
  try {
    const parsed = JSON.parse(jsonText);
    const language = (parsed && parsed.result && parsed.result.language) ? String(parsed.result.language).trim() : '';
    return language || 'unknown';
  } catch {
    return 'unknown';
  }
}

async function fetchLocalTranscriptFromUrl(sourceUrl) {
  const platformArch = getPlatformArchFolder();
  const bundledRootCandidates = getBundledToolsRootCandidates();

  console.info('[local-transcribe] Runtime:', {
    platform: process.platform,
    arch: process.arch,
    isPackaged: app.isPackaged,
    platformArch
  });
  console.info('[local-transcribe] Bundled roots:', bundledRootCandidates);

  const tempRoot = path.join(app.getPath('temp'), 'video-notes-transcribe');
  const jobId = `job-${Date.now()}`;
  const jobDir = path.join(tempRoot, jobId);
  ensureDirectory(jobDir);

  const audioTemplate = path.join(jobDir, 'audio.%(ext)s');

  const ytDlpCommand = resolveBundledCommand(['yt-dlp']);
  const ffmpegCommand = resolveBundledCommand(['ffmpeg']);

  if (!ytDlpCommand) {
    throw new Error('Missing bundled yt-dlp binary. Add it to local-binaries/<platform>-<arch>/yt-dlp before running transcription.');
  }

  if (!ffmpegCommand) {
    throw new Error('Missing bundled ffmpeg binary. Add it to local-binaries/<platform>-<arch>/ffmpeg before running transcription.');
  }

  try {
    const ytdlpArgs = [
      '--no-playlist',
      '--extract-audio',
      '--audio-format',
      'wav',
      '--ffmpeg-location',
      path.dirname(ffmpegCommand),
      '--output',
      audioTemplate,
      sourceUrl
    ];

    await runCommand(ytDlpCommand, ytdlpArgs);
  } catch (error) {
    const stderr = (error && error.stderr) ? ` ${error.stderr}` : '';
    throw new Error(`Could not download audio locally using bundled yt-dlp.${stderr}`.trim());
  }

  const downloadedAudio = fs
    .readdirSync(jobDir)
    .find((fileName) => fileName.startsWith('audio.') && !fileName.endsWith('.json'));

  if (!downloadedAudio) {
    throw new Error('Audio download succeeded but no local audio file was found.');
  }

  const audioPath = path.join(jobDir, downloadedAudio);

  const whisperCommand = resolveBundledCommand(['whisper-cli', 'main', 'whisper']);
  if (!whisperCommand) {
    const lookupPaths = getBundledCommandLookupCandidates(['whisper-cli', 'main', 'whisper']);
    const lookupSummary = lookupPaths.map((candidatePath) => `${candidatePath}${fs.existsSync(candidatePath) ? ' (exists)' : ' (missing)'}`);
    const siblingArchs = ['arm64', 'x64'].filter((arch) => arch !== process.arch);
    const siblingHints = [];

    for (const siblingArch of siblingArchs) {
      const siblingRoot = path.join(__dirname, 'local-binaries', `${process.platform}-${siblingArch}`);
      const siblingWhisperCandidates = ['whisper-cli', 'whisper', 'main'].map((name) => path.join(siblingRoot, name));
      const foundSibling = siblingWhisperCandidates.find((candidatePath) => fs.existsSync(candidatePath));

      if (foundSibling) {
        siblingHints.push(`found ${foundSibling} but runtime expects ${platformArch}`);
      }
    }

    console.error('[local-transcribe] Missing whisper binary for runtime', {
      platform: process.platform,
      arch: process.arch,
      platformArch,
      lookupSummary,
      siblingHints
    });

    const siblingHintText = siblingHints.length
      ? ` Hint: ${siblingHints.join('; ')}.`
      : '';
    throw new Error(`Missing bundled whisper binary for runtime ${platformArch}. Checked: ${lookupSummary.join(', ')}. Add whisper-cli (or whisper/main) to local-binaries/<platform>-<arch>/.${siblingHintText}`);
  }

  const whisperModelPath = resolveBundledModel([
    'ggml-base.en.bin',
    'ggml-base.bin',
    'ggml-tiny.en.bin',
    'ggml-tiny.bin'
  ]);
  if (!whisperModelPath) {
    throw new Error('Missing bundled whisper model file. Add one of: ggml-base.en.bin, ggml-base.bin, ggml-tiny.en.bin, or ggml-tiny.bin under local-binaries/<platform>-<arch>/models/.');
  }

  const whisperOutputBase = path.join(jobDir, 'whisper-output');
  const bundledLibDir = getBundledLibDirectory();

  const whisperEnv = {
    ...process.env,
    DYLD_LIBRARY_PATH: bundledLibDir
      ? [bundledLibDir, process.env.DYLD_LIBRARY_PATH || ''].filter(Boolean).join(':')
      : process.env.DYLD_LIBRARY_PATH
  };

  try {
    const whisperArgs = [
      '-f',
      audioPath,
      '-m',
      whisperModelPath,
      '-oj',
      '-of',
      whisperOutputBase,
      '-l',
      'auto'
    ];

    await runCommand(whisperCommand, whisperArgs, { env: whisperEnv });
  } catch (error) {
    const stderr = (error && error.stderr) ? ` ${error.stderr}` : '';
    throw new Error(`Could not run local speech-to-text using bundled whisper binary.${stderr}`.trim());
  }

  const whisperOutputPath = `${whisperOutputBase}.json`;
  if (!fs.existsSync(whisperOutputPath)) {
    throw new Error('Local transcription completed but no JSON output file was produced.');
  }

  const jsonContent = fs.readFileSync(whisperOutputPath, 'utf8');
  let segments = parseWhisperJsonSegments(jsonContent);
  let detectedLanguage = getWhisperDetectedLanguage(jsonContent);

  // whisper auto language detection can occasionally yield zero segments.
  // Retry once with explicit English and relaxed no-speech threshold.
  if (!segments.length) {
    const fallbackOutputBase = path.join(jobDir, 'whisper-output-en-fallback');
    const fallbackOutputPath = `${fallbackOutputBase}.json`;

    try {
      const fallbackArgs = [
        '-f',
        audioPath,
        '-m',
        whisperModelPath,
        '-oj',
        '-of',
        fallbackOutputBase,
        '-l',
        'en',
        '-nth',
        '1.0'
      ];

      await runCommand(whisperCommand, fallbackArgs, { env: whisperEnv });

      if (fs.existsSync(fallbackOutputPath)) {
        const fallbackJson = fs.readFileSync(fallbackOutputPath, 'utf8');
        const fallbackSegments = parseWhisperJsonSegments(fallbackJson);
        if (fallbackSegments.length) {
          segments = fallbackSegments;
          detectedLanguage = getWhisperDetectedLanguage(fallbackJson);
        }
      }
    } catch {
      // Keep original behavior and error below if fallback fails.
    }
  }

  if (!segments.length) {
    throw new Error(`Local transcription completed but produced no readable segments (detected language: ${detectedLanguage}). Try a clip with clearer speech.`);
  }

  return {
    success: true,
    source: 'asr',
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

ipcMain.handle('fetch-local-url-transcript', async (_event, sourceUrl) => {
  try {
    return await fetchLocalTranscriptFromUrl(sourceUrl);
  } catch (error) {
    console.error('fetch-local-url-transcript failed:', error);
    return {
      success: false,
      error: error?.message || 'Unknown local transcript error.'
    };
  }
});

ipcMain.handle('check-local-transcribe-readiness', async () => {
  try {
    return getLocalTranscribeReadiness();
  } catch (error) {
    console.error('check-local-transcribe-readiness failed:', error);
    return {
      ready: false,
      error: error?.message || 'Unknown readiness check error.'
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
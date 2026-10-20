const fs = require('fs');
const path = require('path');

const platformArch = `${process.platform}-${process.arch}`;
const root = path.join(__dirname, '..', 'local-binaries', platformArch);

function isExecutable(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

const requiredNames = process.platform === 'win32'
  ? ['yt-dlp.exe', 'ffmpeg.exe']
  : ['yt-dlp', 'ffmpeg'];

const whisperCandidateNames = process.platform === 'win32'
  ? ['whisper.exe']
  : ['whisper-cli', 'whisper', 'main'];

const requiredModelNames = ['ggml-base.en.bin', 'ggml-base.bin', 'ggml-tiny.en.bin', 'ggml-tiny.bin'];

const missing = [];
const notExecutable = [];

for (const name of requiredNames) {
  const filePath = path.join(root, name);
  if (!fs.existsSync(filePath)) {
    missing.push(filePath);
    continue;
  }

  if (process.platform !== 'win32' && !isExecutable(filePath)) {
    notExecutable.push(filePath);
  }
}

const hasWhisperBinary = whisperCandidateNames.some((name) => fs.existsSync(path.join(root, name)));
if (!hasWhisperBinary) {
  missing.push(path.join(root, whisperCandidateNames[0]));
}

const modelDirectory = path.join(root, 'models');
const hasModel = requiredModelNames.some((name) => fs.existsSync(path.join(root, name)) || fs.existsSync(path.join(modelDirectory, name)));
if (!hasModel) {
  missing.push(`${modelDirectory}/ggml-base.en.bin`);
}

if (process.platform === 'darwin') {
  const libDir = path.join(root, 'lib');
  const requiredLibs = ['libwhisper.1.dylib', 'libggml.0.dylib', 'libggml-base.0.dylib'];
  for (const libName of requiredLibs) {
    const libPath = path.join(libDir, libName);
    if (!fs.existsSync(libPath)) {
      missing.push(libPath);
    }
  }
}

if (missing.length || notExecutable.length) {
  console.error(`Local binaries check failed for ${platformArch}.`);
  console.error(`Checked root: ${root}`);

  if (missing.length) {
    console.error('\nMissing files:');
    for (const filePath of missing) {
      console.error(`- ${filePath}`);
    }
  }

  if (!hasWhisperBinary) {
    console.error('\nWhisper candidates checked:');
    for (const name of whisperCandidateNames) {
      const candidatePath = path.join(root, name);
      console.error(`- ${candidatePath} (${fs.existsSync(candidatePath) ? 'exists' : 'missing'})`);
    }
  }

  if (notExecutable.length) {
    console.error('\nNon-executable files (run chmod +x):');
    for (const filePath of notExecutable) {
      console.error(`- ${filePath}`);
    }
  }

  process.exit(1);
}

console.log(`Local binaries check passed for ${platformArch}.`);

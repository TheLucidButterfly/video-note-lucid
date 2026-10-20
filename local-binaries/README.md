# Local Bundled Binaries

This app runs transcript parsing fully locally and expects bundled binaries per platform.

Create a folder for each target platform architecture:

- local-binaries/darwin-arm64/
- local-binaries/darwin-x64/
- local-binaries/linux-x64/
- local-binaries/win32-x64/

Required file names:

- macOS/Linux: yt-dlp, ffmpeg, whisper-cli (or whisper)
- Windows: yt-dlp.exe, ffmpeg.exe, whisper.exe

Required model file (either name):

- local-binaries/<platform>-<arch>/models/ggml-base.en.bin
- local-binaries/<platform>-<arch>/models/ggml-base.bin
- local-binaries/<platform>-<arch>/models/ggml-tiny.en.bin
- local-binaries/<platform>-<arch>/models/ggml-tiny.bin

Notes:

- Mark macOS/Linux binaries executable with chmod +x.
- Keep file names exact.
- The app resolves binaries from local-binaries/<platform>-<arch>/ in development and packaged builds.
- On macOS, also include runtime libs under local-binaries/<platform>-<arch>/lib/: libwhisper.1.dylib, libggml.0.dylib, libggml-base.0.dylib.

Quick verification:

npm run check:local-binaries

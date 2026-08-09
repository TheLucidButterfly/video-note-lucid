# VideoNotes

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.2.1.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

### Trial Build Flag

Trial mode is now a dedicated Angular build configuration: `trial`.

- Build trial web assets:

```bash
npm run build:trial
```

- Build trial macOS DMG (Apple Silicon, unsigned):

```bash
npm run make:mac:m-series:trial
```

- Build trial macOS DMG (Apple Silicon, signed):

```bash
npm run make:mac:m-series:trial:signed
```

Trial settings are centralized in `src/environments/environment.trial.ts`.

Recommended trial limits:

- `maxVideos: 2`
- `maxNotesPerVideo: 5`

These limits are enforced in app logic:

- Upload flow caps total saved videos.
- Annotation flow caps notes per video.

### Available Flags

| Flag | What it does | Default |
| --- | --- | --- |
| `signed` | Enables signing/notarization for release scripts ending in `:signed`. | `false` (unsigned) |
| `trial` | Uses `environment.trial.ts` and applies trial restrictions. | `false` (full mode) |
| `prod` (production) | Uses `environment.prod.ts`, enables production mode, and keeps developer tools hidden by default. | `false` in dev runs |

### Static False Flags

These UI feature toggles are currently hard-coded to `false`:

- `homeDevButtonsDeveloped` in `src/app/views/home-view/home-view.component.ts`:
  hides `Delete All` and `View Saved Data` on Home.
- `extendedMetricsDeveloped` in `src/app/views/info/info.component.ts`:
  hides `Uploads Tracked` and `Storage Used (bytes)` on Info.

## Video-to-Text Parsing Functionality Rules

These rules define how transcript import/parsing should behave so output stays readable and useful.

### Core Principle

- Never create one note per word/time tick. Word-level entries are too noisy.
- Parse into readable chunks (sentence/phrase/topic), then optionally generate concise notes from those chunks.

### Input + Source Priority

- Accept link input (for example YouTube or direct media links).
- Prefer existing captions/subtitles first when available.
- Fall back to speech-to-text only when captions are unavailable.

### Parsing + Chunking Rules

- Normalize whitespace and punctuation before chunking.
- Create chunks based on pause and sentence boundaries, not single words.
- Recommended defaults:
  - `maxChunkDurationSec`: `20`
  - `minWordsPerChunk`: `6`
  - `maxWordsPerChunk`: `40`
  - `pauseBoundaryMs`: `700`
- Merge very short fragments forward so each chunk is readable.

### Transcript vs Notes

- Store transcript segments separately from manual notes.
- Transcript segment model should include:
  - `startSec`
  - `endSec`
  - `text`
  - `confidence` (if available)
  - `source` (`caption` | `asr`)
- Smart notes (optional) should reference chunked transcript and remain low-density.

### Readability + Density Guardrails

- Do not render every timestamp as a visible note item.
- Render transcript in blocks with click-to-seek behavior.
- If auto-generating notes, target summary-level cadence (topic/idea), not per sentence unless explicitly requested.

### UX Rules

- Provide separate modes:
  - `Manual Notes`
  - `Transcript`
  - `Smart Notes`
- Keep transcript and notes independently toggleable to avoid clutter.

### Compliance + Safety

- Respect source/platform terms for link-based ingestion.
- Prefer legal caption retrieval paths over raw media extraction when possible.

## TODO

- Improve keyboard shortcuts:
  - Shift + Left/Right Arrow should seek by 15-second intervals.
  - Left/Right Arrow behavior should still allow text cursor movement while typing in notes.
  - Add a shortcut to go back to the previous screen.
- Settings page.
- More video details on the Info page.
- Mass delete selection option.

## Build-Time Note Transform Replacement

The note stress transform uses compile-time module replacement so release builds do not include the mock-note implementation.

- Main implementation:
  - `src/app/views/video/note-transform.ts`
- Stub implementation:
  - `src/app/views/video/note-transform.stub.ts`

`VideoComponent` imports a stable function (`prepareLoadedNotes`) from `note-transform.ts`.
For production and trial configurations, Angular file replacements swap that module for the stub during build.

Result by build target:

- `development`: mock notes implementation is included (for local stress testing).
- `production`: stub (passthrough) is included.
- `trial`: stub (passthrough) is included.

## Build and Run Electron packaging

$npm run deploy

(https://github.com/electron/packager)

or 

for DMG:

$electron-builder

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.


## App Signing (macOS Trusted Build)

To avoid the **"Unknown Developer"** warning, build with a valid Apple Developer ID certificate and notarization credentials.

### 1) Required local setup (one-time)

- Install your **Developer ID Application** certificate into Keychain Access (login keychain).
- Export these environment variables in your shell:

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="YOUR_TEAM_ID"
```

### 2) Build commands

- Apple Silicon DMG (M-series):

```bash
npm run make:mac:m-series:signed
```

- Intel DMG:

```bash
npm run make:mac:intel:signed
```

- Universal DMG:

```bash
npm run make:mac:universal:signed
```

### 3) Output

Artifacts are created in `release/`.

If signing credentials are missing, electron-builder falls back to ad-hoc signing and macOS may still show the privacy warning.


# How to use
The best way to use this product is in the Electron format. You can do this by running `npm run start:electron`. This builds and runs it in Electron. Electron have a different engine than the browser based application. 

Browser: You upload videos as files and the engine converts these files into base64 and saves them to indexDB which is localstorage. When you view the files, you retrieve and copy the base64 for each file. This is very cumbersome on the browser and is not a long term solution. This is only suitable for quick browser applications and for demos.

Electron: This is the proper way to use the application. This engine works by file paths. Because the browser does not support file system traversal, you must use the Electron app to run videos via path. Uploading videos on this application only saves path records and when you view the video, it refers to the video already on your system. This saves significant space and does not require duplicate video storage by having only one reference on your machine, vs one on your machine and one on your browser (like with the Browser engine). The only consideration is you need to have a folder on your machine where you put all your videos for this application. This application then points to that folder and it will reference all videos by this base path plus the relative paths when you uploaded the videos.


TECHNOTES FOR MINIFYING


ignore: [
      'src/',       // Ignore the 'src' folder
      'node_modules',
      '.git/',        // Ignore git
      '.vscode/', 
      '.angular/',
      'forge.config.js'
    ],
    asar: true,
    strip: true,
  },

  the above code, turn off the asar and strip and inspect the out to see if app/* has those files in the ignore. run `npx electron-forge package`# video-note-lucid

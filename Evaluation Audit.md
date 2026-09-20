# Evaluation Audit
_September 17, 2026 — current status_

## Overall Status: Functional beta; not ready for public commercial launch

The app builds and packages, and the current automated suite passes. Core video, notes,
pagination, persistence, export, and trial-limit paths are present. Public launch still
requires completing and validating the paid entitlement service, confirming the release
UX, and addressing the deferred reliability and coverage items below.

---

## What's Working Well

| Area | Detail |
|---|---|
| Bundle size | The September 17 trial build was 436.69 kB initial load, below the 500 kB budget. jsPDF remains lazy-loaded for PDF export |
| Security | Release builds hide developer tools. The Electron development renderer still reports an insecure CSP warning; verify the packaged renderer policy before release |
| Code signing | Preflight script guards all `*:signed` builds; signing and notarization still require release-environment validation |
| Unsaved changes guard | Intercepts Home button, per-note dirty tracking via `Set<string>`, only fires on real input events |
| Dialog component | General-purpose (`app-dialog`), reusable across limit/activate/confirm/unsaved flows |
| Tests | 35/35 passing in ChromeHeadless; persistence, Home delete flow, and AppComponent save/discard paths remain untested |
| Build pipeline | Signed builds run `preflight → test:ci → build → package` in order |
| Dev tools panel | Hidden in production builds via `environment.production`; visible in dev/`start:electron` |
| Template type safety | All strict-mode template type errors resolved |
| Dead code | Legacy commented-out `annotate()`, `getScrubBar()`, `setDomElement()` bodies, and unused `foundTimeSignature()` removed |

---

## Issues

### HIGH — Paid launch readiness

**Entitlement service is not configured for production**
- `checkoutUrl` and `entitlementApiBaseUrl` are empty in the environment files.
- A trial build can report `premium: true` when a saved paid entitlement exists, even when
	the entitlement API is not configured. This is expected by the current code, but it must
	be explicitly tested and documented before selling the app.

**Product features remain incomplete**
- AI Summary and AI Chat are not implemented.
- Settings and some Info-page functionality remain unfinished.
- End-to-end coverage is not present.

### MEDIUM — Code correctness / reliability (deferred)

**`TimeSignatureComponent` injects `VideoComponent` directly**
- File: `src/app/plugins/time-signature/time-signature.component.ts`
- A plugin component taking a direct constructor dependency on a specific view component is tight coupling. If `VideoComponent` ever gets renamed or split, this silently breaks.
- Fix: pass data via `@Input()` props instead.

**`deleteNoteHelper` Promise is fragile**
- File: `src/app/views/video/video.component.ts` ~line 148
- `resolve()` is called inside `Array.filter()` — fires prematurely on the first matching element, not when filtering is complete. `filter()` is synchronous; the Promise wrapper is unnecessary.
- Fix: remove the Promise, call `this.loader.hide()` inline after filtering.

---

### LOW — Test coverage gaps

| Uncovered area | Why it matters |
|---|---|
| `StorageService` | Handles all persistence; worth smoke-testing the idb-keyval wrappers with a mock |
| `HomeViewComponent` | Delete confirmation dialog flow has no test |
| `AppComponent.onUnsavedDialogConfirmed()` | The Save and Discard paths of the unsaved-changes dialog are untested |

---

## Resolved

| Issue | Resolution |
|---|---|
| Dev tools panel visible in production | Gated on `!environment.production`; `environment.prod.ts` created and wired via `fileReplacements` |
| Template strict-mode type errors | `api?.state` and `api?.time?.current` replaced with explicit null guards; `userData!` changed to `userData?` |
| Dead commented-out code | Removed legacy `annotate()` comment block, `getScrubBar()` block comment, `setDomElement()` body, `foundTimeSignature()` stub |
| Dead Material CSS in test config | Removed `@angular/material/prebuilt-themes/purple-green.css` from `angular.json` test styles |


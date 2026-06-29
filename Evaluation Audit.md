# Evaluation Audit
_April 5, 2026 — updated after LOW fixes_

## Overall Grade: A-

The app is functionally solid, well-optimized, and production-ready for distribution.
One medium-severity architectural issue remains (documented below, deferred by choice).

---

## What's Working Well

| Area | Detail |
|---|---|
| Bundle size | 388kb initial load, well under 500kb budget. jsPDF lazy-loaded (~402kb) only on PDF export |
| Security | No sensitive data (file paths, notes, activation keys) in console logs |
| Code signing | Preflight script guards all `*:signed` builds; notarization passing |
| Unsaved changes guard | Intercepts Home button, per-note dirty tracking via `Set<string>`, only fires on real input events |
| Dialog component | General-purpose (`app-dialog`), reusable across limit/activate/confirm/unsaved flows |
| Tests | 35/35 passing; covers pipes, services, component logic, and navigation guard |
| Build pipeline | Signed builds run `preflight → test:ci → build → package` in order |
| Dev tools panel | Hidden in production builds via `environment.production`; visible in dev/`start:electron` |
| Template type safety | All strict-mode template type errors resolved |
| Dead code | Legacy commented-out `annotate()`, `getScrubBar()`, `setDomElement()` bodies, and unused `foundTimeSignature()` removed |

---

## Issues

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


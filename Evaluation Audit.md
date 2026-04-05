# Evaluation Audit
_April 5, 2026_

## Overall Grade: B+

The app is functionally solid, well-optimized, and production-ready for distribution.
The issues below are technical debt and cleanup items, not correctness problems.

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

---

## Issues

### HIGH — Visible in production

**Dev tools panel always rendered in home view**
- File: `src/app/views/home-view/home-view.component.html` line 29
- `*ngIf="true"` is a placeholder that renders "Delete All" and "View Saved Data" controls for all users
- Should be gated behind an environment flag (`!environment.production`) or removed entirely

---

### MEDIUM — Code correctness / reliability

**`deleteNoteHelper` Promise is fragile**
- File: `src/app/views/video/video.component.ts` ~line 160
- `resolve()` is called inside `Array.filter()` — it fires prematurely on the first matching element, not when filtering is actually complete. The loader hide depends on this Promise, so delete animations can flicker incorrectly.
- Fix: remove the Promise wrapper entirely. `filter()` is synchronous; just do the work directly and call `this.loader.hide()` inline.

**`TimeSignatureComponent` injects `VideoComponent` directly**
- File: `src/app/plugins/time-signature/time-signature.component.ts`
- A plugin component taking a direct constructor dependency on a specific view component is tight coupling. If `VideoComponent` ever gets renamed or split, this silently breaks.
- Fix: pass data via `@Input()` props instead.

---

### LOW — Dead code / cleanliness

**Large commented-out legacy `annotate()` block**
- File: `src/app/views/video/video.component.ts` ~lines 296–320
- Dead code that should be deleted. It adds noise and was already superseded.

**Pre-existing template strict-mode type errors**
- Files: `src/app/views/info/info.component.html`, `src/app/views/video/video.component.html`
- TypeScript strict template checking flags `userData?.videoLengthUsed` and `api?.state` as unsafe optional chains. These don't prevent the build but count as suppressed errors.
- Fix: add proper null guards or type the properties correctly.

---

### LOW — Test coverage gaps

| Uncovered area | Why it matters |
|---|---|
| `StorageService` | Handles all persistence; worth smoke-testing the idb-keyval wrappers with a mock |
| `HomeViewComponent` | Delete confirmation dialog flow has no test |
| `AppComponent.onUnsavedDialogConfirmed()` | The Save and Discard paths of the unsaved-changes dialog are untested |

---

## Summary

No security vulnerabilities. No data leaks. Distribution pipeline is clean.
The B+ ceiling is entirely the dev panel in production, the fragile delete Promise,
and the coverage gaps — all fixable in an afternoon.

import { TimeSignatureObject } from 'src/app/interfaces/time-signature-object.interface';

// Build-time stub used by production and trial builds via angular.json fileReplacements.
// Keep this function signature identical to note-transform.ts, but do not inject mock notes.
export function prepareLoadedNotes(
  existingNotes: TimeSignatureObject[],
  _targetCount: number
): TimeSignatureObject[] {
  // Pass-through behavior: return real user notes exactly as loaded.
  return existingNotes || [];
}

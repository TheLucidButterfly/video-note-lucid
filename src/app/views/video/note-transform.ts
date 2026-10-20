import { TimeSignatureObject } from 'src/app/interfaces/time-signature-object.interface';

/**
 * Development-only note transform used for pagination stress testing.
 *
 * Behavior:
 * - Preserves all existing notes.
 * - Injects synthetic mock notes until `targetCount` is reached.
 * - Returns notes sorted by numeric `timeSignature`.
 *
 * Build behavior:
 * - Development builds use this implementation.
 * - Production and trial builds replace this file with
 *   `note-transform.stub.ts` via Angular fileReplacements.
 */
export function prepareLoadedNotes(
  existingNotes: TimeSignatureObject[],
  targetCount: number
): TimeSignatureObject[] {
  const noteMap = new Map<string, TimeSignatureObject>();

  (existingNotes || []).forEach((note) => {
    if (!note?.timeSignature) {
      return;
    }

    noteMap.set(String(note.timeSignature), {
      timeSignature: String(note.timeSignature),
      notes: note.notes || ''
    });
  });

  let secondMarker = 0;
  while (noteMap.size < targetCount) {
    const timeSignature = String(secondMarker);
    if (!noteMap.has(timeSignature)) {
      noteMap.set(timeSignature, {
        timeSignature,
        notes: `Mock pagination note ${noteMap.size + 1}`
      });
    }
    secondMarker += 1;
  }

  return Array.from(noteMap.values()).sort((a, b) => Number(a.timeSignature) - Number(b.timeSignature));
}

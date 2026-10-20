import { Injectable } from '@angular/core';

export interface ParsedTranscriptSegment {
  startSec: number;
  endSec: number;
  text: string;
  source: 'caption' | 'asr';
}

export interface SmartTranscriptNote {
  startSec: number;
  summary: string;
  segmentIndexes: number[];
}

export interface ParsedTranscriptResult {
  sourceUrl: string;
  sourceType: string;
  source: 'caption' | 'asr';
  fullTranscript: string;
  segments: ParsedTranscriptSegment[];
  smartNotes: SmartTranscriptNote[];
}

@Injectable({
  providedIn: 'root'
})
export class VideoTextParserService {
  private readonly maxWordsPerChunk = 28;
  private readonly minWordsPerChunk = 8;
  private readonly maxChunkDurationSec = 20;

  async parseUrlToReadableTranscript(sourceUrl: string): Promise<ParsedTranscriptResult> {
    const sourceType = this.detectSourceType(sourceUrl);
    const transcriptApi = (window as any)?.transcriptAPI;

    if (!transcriptApi?.fetchLocalUrlTranscript) {
      throw new Error('Local transcript API is not available in this runtime.');
    }

    if (transcriptApi?.checkLocalTranscribeReadiness) {
      const readiness = await transcriptApi.checkLocalTranscribeReadiness();
      if (!readiness?.ready) {
        const runtimeLabel = readiness?.platformArch || `${readiness?.platform || 'unknown'}-${readiness?.arch || 'unknown'}`;
        const missingText = Array.isArray(readiness?.missing) && readiness.missing.length
          ? readiness.missing.join(', ')
          : 'unknown dependencies';
        const hintText = Array.isArray(readiness?.siblingHints) && readiness.siblingHints.length
          ? ` Hint: ${readiness.siblingHints.join(' | ')}`
          : '';
        throw new Error(`Local transcription is not ready for ${runtimeLabel}. Missing: ${missingText}.${hintText}`);
      }
    }

    const localResponse = await transcriptApi.fetchLocalUrlTranscript(sourceUrl);
    if (!localResponse?.success) {
      throw new Error(localResponse?.error || 'Failed to create local transcript.');
    }

    const localSource: 'caption' | 'asr' = localResponse?.source === 'caption' ? 'caption' : 'asr';
    const mergedSegments = this.mergeCaptionSegments(localResponse.segments || [], localSource);
    const fullTranscript = mergedSegments.map(segment => segment.text).join(' ');
    const smartNotes = this.buildSmartNotes(mergedSegments);

    return {
      sourceUrl,
      sourceType,
      source: localSource,
      fullTranscript,
      segments: mergedSegments,
      smartNotes
    };
  }

  private detectSourceType(url: string): string {
    const lowercase = url.toLowerCase();

    if (lowercase.includes('youtube.com') || lowercase.includes('youtu.be')) {
      return 'youtube';
    }

    return 'direct-link';
  }

  private mergeCaptionSegments(
    segments: Array<{ startSec: number; endSec: number; text: string }>,
    source: 'caption' | 'asr'
  ): ParsedTranscriptSegment[] {
    const merged: ParsedTranscriptSegment[] = [];

    let currentWords: string[] = [];
    let currentStart = 0;
    let currentEnd = 0;

    const flushCurrent = () => {
      if (!currentWords.length) {
        return;
      }

      merged.push({
        startSec: currentStart,
        endSec: currentEnd,
        text: currentWords.join(' ').trim(),
        source
      });

      currentWords = [];
      currentStart = 0;
      currentEnd = 0;
    };

    for (const segment of segments) {
      const text = (segment?.text || '').replace(/\s+/g, ' ').trim();
      if (!text) {
        continue;
      }

      const words = text.split(' ').filter(Boolean);
      if (!currentWords.length) {
        currentStart = Math.max(0, Number(segment.startSec || 0));
        currentEnd = Math.max(currentStart, Number(segment.endSec || currentStart));
        currentWords = [...words];
        continue;
      }

      const nextEnd = Math.max(currentEnd, Number(segment.endSec || currentEnd));
      const nextWordsLength = currentWords.length + words.length;
      const nextDuration = nextEnd - currentStart;
      const shouldFlush =
        nextWordsLength > this.maxWordsPerChunk ||
        nextDuration > this.maxChunkDurationSec;

      if (shouldFlush && currentWords.length >= this.minWordsPerChunk) {
        flushCurrent();
        currentStart = Math.max(0, Number(segment.startSec || 0));
        currentEnd = Math.max(currentStart, Number(segment.endSec || currentStart));
        currentWords = [...words];
        continue;
      }

      currentWords.push(...words);
      currentEnd = nextEnd;
    }

    flushCurrent();

    if (!merged.length) {
      return [];
    }

    return merged;
  }

  private buildSmartNotes(segments: ParsedTranscriptSegment[]): SmartTranscriptNote[] {
    const notes: SmartTranscriptNote[] = [];

    for (let i = 0; i < segments.length; i += 2) {
      const batch = segments.slice(i, i + 2);
      const segmentIndexes = batch.map((_segment, batchIndex) => i + batchIndex);
      const summaryText = batch
        .map(segment => segment.text)
        .join(' ')
        .split(' ')
        .slice(0, 20)
        .join(' ')
        .trim();

      notes.push({
        startSec: batch[0]?.startSec ?? 0,
        summary: summaryText.length > 0 ? `${summaryText}...` : '(empty summary)',
        segmentIndexes
      });
    }

    return notes;
  }
}

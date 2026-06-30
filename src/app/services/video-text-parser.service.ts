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

    if (sourceType === 'youtube') {
      const transcriptApi = (window as any)?.transcriptAPI;
      if (!transcriptApi?.fetchYouTubeTranscript) {
        throw new Error('Transcript API is not available in this runtime.');
      }

      const response = await transcriptApi.fetchYouTubeTranscript(sourceUrl);
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to fetch YouTube transcript.');
      }

      const mergedSegments = this.mergeCaptionSegments(response.segments || []);
      const fullTranscript = mergedSegments.map(segment => segment.text).join(' ');
      const smartNotes = this.buildSmartNotes(mergedSegments);

      return {
        sourceUrl,
        sourceType,
        source: 'caption',
        fullTranscript,
        segments: mergedSegments,
        smartNotes
      };
    }

    const fullTranscript = this.buildPrototypeTranscript(sourceUrl, sourceType);
    const words = this.tokenizeTranscript(fullTranscript);
    const segments = this.chunkWords(words);
    const smartNotes = this.buildSmartNotes(segments);

    return {
      sourceUrl,
      sourceType,
      source: 'asr',
      fullTranscript,
      segments,
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

  private buildPrototypeTranscript(url: string, sourceType: string): string {
    return [
      `Prototype transcript for ${sourceType} source: ${url}.`,
      'This mode is intentionally chunked for readability so notes do not explode into one timestamp per word.',
      'Transcript chunks are grouped by phrase and sentence boundaries and can later be replaced with a provider-backed caption or ASR pipeline.',
      'Smart notes summarize groups of transcript segments and remain low-density compared to raw transcript output.',
      'As provider integrations are added, this same chunking and summarization model should remain consistent with the video-to-text parsing rules.'
    ].join(' ');
  }

  private tokenizeTranscript(transcript: string): string[] {
    return transcript
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(Boolean);
  }

  private chunkWords(words: string[]): ParsedTranscriptSegment[] {
    const segments: ParsedTranscriptSegment[] = [];
    let cursor = 0;
    let startSec = 0;

    while (cursor < words.length) {
      const maxCursor = Math.min(cursor + this.maxWordsPerChunk, words.length);
      let endCursor = maxCursor;

      if (maxCursor < words.length) {
        for (let i = maxCursor - 1; i >= cursor + this.minWordsPerChunk; i--) {
          if (/[.!?]$/.test(words[i])) {
            endCursor = i + 1;
            break;
          }
        }
      }

      const chunkWords = words.slice(cursor, endCursor);
      const duration = Math.min(this.maxChunkDurationSec, Math.max(8, Math.ceil(chunkWords.length / 2.5)));

      segments.push({
        startSec,
        endSec: startSec + duration,
        text: chunkWords.join(' '),
        source: 'asr'
      });

      startSec += duration;
      cursor = endCursor;
    }

    return segments;
  }

  private mergeCaptionSegments(
    segments: Array<{ startSec: number; endSec: number; text: string }>
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
        source: 'caption'
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

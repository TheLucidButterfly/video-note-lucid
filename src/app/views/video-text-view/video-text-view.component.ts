import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ParsedTranscriptResult, VideoTextParserService } from 'src/app/services/video-text-parser.service';

@Component({
  selector: 'app-video-text-view',
  templateUrl: './video-text-view.component.html',
  styleUrls: ['./video-text-view.component.css']
})
export class VideoTextViewComponent {
  sourceUrl = '';
  modeLabel = 'Transcript';
  isProcessing = false;
  parseError = '';
  parsedResult: ParsedTranscriptResult | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private videoTextParserService: VideoTextParserService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.sourceUrl = (params['url'] || '').toString();
      if (!this.sourceUrl) {
        this.parseError = 'No URL supplied. Go back and input a link.';
        this.parsedResult = null;
        return;
      }

      this.runParse();
    });
  }

  async runParse() {
    this.isProcessing = true;
    this.parseError = '';

    try {
      this.parsedResult = await this.videoTextParserService.parseUrlToReadableTranscript(this.sourceUrl);
    } catch (error) {
      console.error('video-text parse failed', error);
      this.parseError = (error as any)?.message || 'Failed to parse transcript from this URL.';
      this.parsedResult = null;
    } finally {
      this.isProcessing = false;
    }
  }

  formatTime(totalSeconds: number): string {
    const safe = Math.max(0, Math.floor(totalSeconds || 0));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  backHome() {
    this.router.navigate(['home']);
  }
}

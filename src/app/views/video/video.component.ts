import { Component, HostListener, OnInit, Renderer2, ViewChild, ViewContainerRef, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { StorageService } from 'src/app/services/storage-service.service';
import { VgApiService } from '@videogular/ngx-videogular/core';
import { TimeSignatureObject } from 'src/app/interfaces/time-signature-object.interface';
import { interval, of, switchMap, takeWhile } from 'rxjs';
import { LoadingNotificationService } from 'src/app/services/loading-notification/loading-notification.service';
import { CentralService } from 'src/app/services/central.service';
import { environment, uploadModes } from '../../../environments/environment';
import { jsPDF } from 'jspdf';


@Component({
  selector: 'app-video',
  templateUrl: './video.component.html',
  styleUrls: ['./video.component.css']
})
export class VideoComponent implements OnInit {
  @ViewChild('scrubBar') scrubBar: any;
  @ViewChild('noteBar', { read: ViewContainerRef }) vcRef!: ViewContainerRef;

  viewRef!: ViewContainerRef;

  src: any = undefined;
  currentVideoPath = '';
  api!: VgApiService;
  // *legacy
  // savedVideoIndex!: number;
  savedVideoUrlIndex!: number
  initialNotesObject: TimeSignatureObject = {
    timeSignature: '0',
    notes: ''
  };
  notesArray: TimeSignatureObject[] = [];
  textArea = '';

  selectedSignatureObject: TimeSignatureObject = this.initialNotesObject;
  adjustTimeFloat = false;
  onKnownSignature = false;

  private alive = true;
  private isDragging = false;

  showDialog = false;
  premiumAccount = false;
  showExportDialog = false;

  constructor(
    private route: ActivatedRoute,
    private storageService: StorageService,
    private loader: LoadingNotificationService,
    private centralService: CentralService,
    private renderer: Renderer2) { }

  // All subscriptions: this.api.getDefaultMedia() 

  ngOnDestroy(): void {
    this.alive = false;
  }

  ngOnInit(): void {
    this.setVideoSrc()
  }

  // Dragging logic
  onMouseDown(event: MouseEvent) {
    this.isDragging = true;
    event.preventDefault();
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    this.isDragging = false;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.isDragging) return;

    const container = document.querySelector('.video-text-container') as HTMLElement;
    const player = document.querySelector('.vg-player') as HTMLElement;
    const textArea = document.querySelector('.text-area') as HTMLElement;

    const containerRect = container.getBoundingClientRect();
    const mouseX = event.clientX;

    // Calculate new widths
    const newPlayerWidth = mouseX - containerRect.left;
    const newTextAreaWidth = containerRect.width - newPlayerWidth - 5; // Subtract resizer width

    // Set new widths
    if (newPlayerWidth > 100 && newTextAreaWidth > 100) { // Set minimum widths
      this.renderer.setStyle(player, 'width', `${newPlayerWidth}px`);
      this.renderer.setStyle(textArea, 'width', `${newTextAreaWidth}px`);
    }
  }

  setVideoSrc() {
    if (environment.uploadMode == uploadModes.pathed) {
      this.populateSrcFromLocalPath();
    } else if (environment.uploadMode == uploadModes.saved) {
      // *legacy
      // this.populateSrcFromLocalStorage();
    }
  }

  populateSrcFromLocalPath() {
    this.route.queryParams.pipe(
      takeWhile(() => this.alive),
      switchMap(queryParams => {
        return this.storageService.getVideoPaths().pipe(
          switchMap(storedPaths => {
            this.currentVideoPath = storedPaths[queryParams['index']].path;
            this.src = `file://${this.currentVideoPath}`
            this.savedVideoUrlIndex = queryParams['index'];
            this.centralService.setTitle(storedPaths[queryParams['index']]?.path);
            if (storedPaths[this.savedVideoUrlIndex]?.notes) {
              this.notesArray = storedPaths[this.savedVideoUrlIndex].notes;
            }
            return of()
          })
        )
      })
    ).subscribe()


    // this.src = environment.defaultBasePath + `${encodeURI(someValue)}`
  }


  deleteButton() {
    this.deleteNoteHelper().then((_) => {
      this.loader.hide()
    })
  }

  async deleteNoteHelper() {
    this.loader.show()
    let timeSignatureNumberToRemove = this.selectedSignatureObject.timeSignature;
    if (this.notesArray.length > 0) {
      // If more object, pick the one next to it (behind)
      this.selectedSignatureObject = this.notesArray[Number(this.selectedSignatureObject.timeSignature) - 1]
    } else {
      // If no more saved signatures, set to original
      this.selectedSignatureObject = JSON.parse(JSON.stringify(this.initialNotesObject))
    }
    return new Promise((resolve, reject) => {
      this.notesArray = this.notesArray.filter((timeSignature, index) => {
        if (index + 1 == this.notesArray.length) {
          resolve(true);
        }
        if (timeSignature.timeSignature != timeSignatureNumberToRemove) {
          resolve(true);
          return true;
        } else {
          return false;
        }
      });
    })
  }


  handleDrag() {
    this.api.getDefaultMedia().subscriptions.seeking.subscribe((res: Event) => {

      this.adjustTimeAndPreventLoop()
    })
  }

  adjustTimeAndPreventLoop() {
    if (this.adjustTimeFloat) {
      this.seekTo(Number(this.formatSignature(this.api.time.current)))
      this.adjustTimeFloat = false;
    } else {
      this.adjustTimeFloat = true;
    }
  }

  onPlayerReady(api: VgApiService) {
    this.api = api;

    this.api.getDefaultMedia().subscriptions.ended.subscribe(
      () => {
        // Set the video to the beginning
        this.api.getDefaultMedia().currentTime = 0;
      }
    );
  }

  selectSignature(signatureObject: any) {
    this.selectedSignatureObject = signatureObject as TimeSignatureObject;
    this.seekTo(this.selectedSignatureObject?.timeSignature)
  }

  seekTo(input: any) {
    let signature = Number(input);
    this.api.seekTime(signature)
    this.adjustTimeFloat = false;
    let foundSignatureObject: TimeSignatureObject;
    foundSignatureObject = this.setCurrentTimeSignature(signature);
    if (foundSignatureObject) {
      this.selectedSignatureObject = foundSignatureObject;
      this.onKnownSignature = true;
    } else {
      // this.selectedSignatureObject = JSON.parse(JSON.stringify({
      //   timeSignature: '-1',
      //   notes: ''
      // }));
      this.onKnownSignature = false;
    }
  }

  printSignature() {
    console.log(this.selectedSignatureObject)
  }

  printAllNotes() {
    console.log(this.notesArray)
  }

  formatSignature(signature: any) {
    return String(this.normalizeToSeconds(signature))
  }

  formatSignatureDisplay(signature: any) {
    return this.formatNoteTimestamp(this.normalizeToSeconds(signature));
  }

  private normalizeToSeconds(signature: any): number {
    const numericSignature = Number(signature) || 0;
    return Math.max(0, Math.floor(numericSignature / 1000));
  }

  setDomElement() {
    //   const viewContainerRef = this.vcRef;
    //   const component = viewContainerRef.createComponent(TimeSignatureComponent);
    //   component.instance.videoComponentRef = this;
    //   component.instance.assignedId = locationMetadata.currentSecond;
    //   component.instance.locationMetadata = locationMetadata;
  }



  /* 
    getScrubBar() {
      // Get dimensions
      let barWidth = this.scrubBar.elem.clientWidth;
      console.log('barWidth', barWidth)
      let duration = this.api.duration;
      console.log('duration:', duration)
      let pixelsPerSecond = barWidth / duration;
      console.log('pixelsPerSecond:', pixelsPerSecond)
  
      let slider = this.api.videogularElement.getElementsByClassName("slider")[0]
      let sliderLocation = slider.getBoundingClientRect();
  
      // Set to html
      return sliderLocation
    }
  */


  annotate() {
    this.api.pause();
    let currentTime = this.formatSignature(this.api?.time?.current | 0);
    let foundSignatureObject: TimeSignatureObject;
    foundSignatureObject = this.setCurrentTimeSignature(currentTime)

    // Premium check
    if(this.notesArray.length > 2 && !this.centralService.isPremiumUser()){ 
      this.showDialog = true; 
      return;
    }
    if (!foundSignatureObject) {
      this.selectedSignatureObject = {
        timeSignature: currentTime,
        notes: this.textArea
      } as TimeSignatureObject;
      this.notesArray.push(this.selectedSignatureObject);
      this.notesArray = this.sortNotesObject(this.notesArray);
    } else {
      this.selectedSignatureObject = foundSignatureObject;
    }
    this.onKnownSignature = true;
  }

  // *legacy
  // annotate() {
  //   this.api.pause();
  //   let currentTime = this.formatSignature(this.api?.time?.current | 0);
  //   let foundSignatureObject: TimeSignatureObject;
  //   foundSignatureObject = this.setCurrentTimeSignature(currentTime)
  //   if (!foundSignatureObject) {
  //     this.selectedSignatureObject = {
  //       timeSignature: currentTime,
  //       notes: this.textArea
  //     } as TimeSignatureObject;
  //     this.notesArray.push(this.selectedSignatureObject);
  //     this.notesArray = this.sortNotesObject(this.notesArray);
  //   } else {
  //     this.selectedSignatureObject = foundSignatureObject;
  //   }
  //   this.onKnownSignature = true;
  // }

  // TODO: Can we put this in annotate and condense it?
  foundTimeSignature(currentTime: any) {
    let foundSignatureObject: TimeSignatureObject;
    foundSignatureObject = this.setCurrentTimeSignature(currentTime)
    if (!foundSignatureObject) {
      return false;
    } else {
      return true;
    }
  }
  // TODO: Improve this function 
  handleUpdatedCurrentTime(time?: any) {
    let currentTime = this.formatSignature(this.api?.time?.current | 0);
    let foundSignatureObject = this.setCurrentTimeSignature(currentTime)
    if (foundSignatureObject) {
      this.onKnownSignature = true;
      this.selectedSignatureObject = foundSignatureObject;
    } else {
      this.onKnownSignature = false;
      this.selectedSignatureObject = {
        timeSignature: this.formatSignature(this.api.time.current),
        notes: ''
      };
    }
  }

  sortNotesObject(notesArray: any[]) {
    return notesArray.sort((a, b) => Number(a.timeSignature) < Number(b.timeSignature) ? -1 : Number(a.timeSignature) > Number(b.timeSignature) ? 1 : 0);
  }

  setCurrentTimeSignature(currentTime: any) {
    return this.notesArray.find((savedNotesSignatured: TimeSignatureObject) => {
      return String(currentTime) === savedNotesSignatured.timeSignature;
    }) as TimeSignatureObject;
  }

  // Legacy
  // saveAllNotes() {
  //   this.api.pause();
  //   this.storageService.saveNotesToVideoObject(this.savedVideoIndex, this.notesArray);
  // }

  saveAllNotes() {
    this.api.pause();
    this.storageService.saveNotesToVideoObject(this.savedVideoUrlIndex, this.notesArray);
  }

  //TODO: Fill in the below functions
  fileOver(idkYet: any) {

  }

  fileLeave(idkYet: any) {

  }

  playOrPause() {
    if (this.api.state === 'paused') {
      this.api.play();
    }
    if (this.api.state === 'playing') {
      this.api.pause();
    }

  }

  async exportNotes(format: 'txt' | 'md' | 'csv' | 'pdf') {
    const sortedNotes = [...this.notesArray].sort((a, b) => Number(a.timeSignature) - Number(b.timeSignature));

    if (!sortedNotes.length) {
      alert('No notes to export.');
      return;
    }

    const fileBaseName = this.buildExportFileBaseName();

    if (format === 'pdf') {
      await this.downloadPdfFile(`${fileBaseName}.pdf`, sortedNotes);
      return;
    }

    const payload = this.buildExportPayload(sortedNotes, format);
    this.downloadTextFile(`${fileBaseName}.${payload.extension}`, payload.content, payload.mimeType);
  }

  openExportDialog() {
    this.showExportDialog = true;
  }

  closeExportDialog() {
    this.showExportDialog = false;
  }

  handleExportFormat(format: 'txt' | 'md' | 'csv' | 'pdf') {
    void this.exportNotes(format);
    this.closeExportDialog();
  }

  private buildExportFileBaseName(): string {
    const fallbackName = 'video-notes';
    const fileName = this.currentVideoPath ? this.getFileNameFromPath(this.currentVideoPath) : fallbackName;
    const withoutExtension = fileName.replace(/\.[^/.]+$/, '');
    const sanitized = withoutExtension.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
    return `${sanitized || fallbackName}-notes`;
  }

  private getFileNameFromPath(path: string): string {
    const pathParts = path.split(/[/\\]/);
    return pathParts[pathParts.length - 1] || path;
  }

  private buildExportPayload(notes: TimeSignatureObject[], format: 'txt' | 'md' | 'csv') {
    const exportTitle = this.getExportTitle();

    if (format === 'txt') {
      return {
        extension: 'txt',
        mimeType: 'text/plain;charset=utf-8',
        content: [
          exportTitle,
          '',
          ...notes.map(note => `${this.formatNoteTimestamp(note.timeSignature)} – ${note.notes}`)
        ]
          .join('\n')
      };
    }

    if (format === 'md') {
      return {
        extension: 'md',
        mimeType: 'text/markdown;charset=utf-8',
        content: [
          `# ${exportTitle}`,
          '',
          ...notes.map(note => `- ${this.formatNoteTimestamp(note.timeSignature)} – ${note.notes}`)
        ]
          .join('\n')
      };
    }

    return {
      extension: 'csv',
      mimeType: 'text/csv;charset=utf-8',
      content: [
        `file_name,${this.escapeCsv(exportTitle)}`,
        'timestamp,note'
      ]
        .concat(notes.map(note => `${this.escapeCsv(this.formatNoteTimestamp(note.timeSignature))},${this.escapeCsv(note.notes || '')}`))
        .join('\n')
    };
  }

  private getExportTitle(): string {
    if (this.currentVideoPath) {
      return this.getFileNameFromPath(this.currentVideoPath);
    }

    return 'video-notes';
  }

  private formatNoteTimestamp(timeSignature: string | number): string {
    const totalSeconds = Math.max(0, Math.floor(Number(timeSignature) || 0));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  private escapeCsv(value: string): string {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private downloadTextFile(fileName: string, content: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
  }

  private async downloadPdfFile(fileName: string, notes: TimeSignatureObject[]): Promise<void> {
    const document = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = document.internal.pageSize.getWidth();
    const pageHeight = document.internal.pageSize.getHeight();
    const margin = 40;
    const maxLineWidth = pageWidth - (margin * 2);
    const lineHeight = 16;
    let currentY = margin;

    document.setFont('helvetica', 'bold');
    document.setFontSize(16);
    const pdfTitle = this.currentVideoPath
      ? this.getFileNameFromPath(this.currentVideoPath)
      : fileName.replace(/\.pdf$/i, '');
    document.text(pdfTitle, margin, currentY);
    currentY += 24;

    document.setFont('helvetica', 'normal');
    document.setFontSize(11);

    notes.forEach((note, index) => {
      const entry = `${this.formatNoteTimestamp(note.timeSignature)} - ${note.notes || ''}`;
      const wrappedLines = document.splitTextToSize(entry, maxLineWidth);

      if (currentY + (wrappedLines.length * lineHeight) > pageHeight - margin) {
        document.addPage();
        currentY = margin;
      }

      document.text(wrappedLines, margin, currentY);
      currentY += (wrappedLines.length * lineHeight);

      if (index < notes.length - 1) {
        currentY += 4;
      }
    });

    if (this.canUseNativeSaveDialog()) {
      const saveResult = await (window as any).fileAPI.showSaveDialog({
        title: 'Export Notes as PDF',
        defaultPath: fileName,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });

      if (saveResult?.canceled || !saveResult?.filePath) {
        return;
      }

      const pdfArrayBuffer = document.output('arraybuffer');
      const writeResult = await (window as any).fileAPI.writeFile({
        filePath: saveResult.filePath,
        data: this.arrayBufferToBase64(pdfArrayBuffer),
        encoding: 'base64'
      });

      if (!writeResult?.success) {
        alert('Unable to save PDF file.');
      }

      return;
    }

    document.save(fileName);
  }

  private canUseNativeSaveDialog(): boolean {
    return typeof (window as any)?.fileAPI?.showSaveDialog === 'function' &&
      typeof (window as any)?.fileAPI?.writeFile === 'function';
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binaryString = '';
    bytes.forEach((byte) => {
      binaryString += String.fromCharCode(byte);
    });
    return btoa(binaryString);
  }

}

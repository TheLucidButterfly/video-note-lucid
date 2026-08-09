import { Component, HostListener } from '@angular/core';
import { StorageService } from '../../services/storage-service.service';
import { Router } from '@angular/router';
import { LoadingNotificationService } from 'src/app/services/loading-notification/loading-notification.service';
import { Observable } from 'rxjs';
import { CentralService } from 'src/app/services/central.service';
import { VideoUploadService } from 'src/app/services/video-upload.service';

@Component({
  selector: 'app-home-view',
  templateUrl: './home-view.component.html',
  styleUrls: ['./home-view.component.css']
})
export class HomeViewComponent {
  readonly videosPerPage = 24;
  private homeDragDepth = 0;

  // URL import intentionally disabled for legal/compliance reasons.
  // readonly allowUrlInput = environment.allowUrlInput;
  readonly homeDevButtonsDeveloped = false;
  storedPaths: any[] = [];
  homePage = 1;
  totalHomePages = 1;
  loading = false;
  showDialog = false;
  showDeleteDialog = false;
  isDragOverHome = false;
  // URL import intentionally disabled for legal/compliance reasons.
  // showUrlImportDialog = false;
  // importUrlInput = '';
  // importUrlError = '';
  pendingDeleteIndex: number | null = null;
  pendingDeleteTitle = '';

  constructor(
    public storageService: StorageService,
    public router: Router,
    private loader: LoadingNotificationService,
    public centralService: CentralService,
    private videoUploadService: VideoUploadService) { }

  ngOnInit(): void {
    this.loadStoredPaths();
  }

  private loadStoredPaths() {
    this.refreshVideoPathList().subscribe({
      next: (storedPaths) => {
        this.storedPaths = storedPaths ?? [];

        this.totalHomePages = Math.max(1, Math.ceil(this.storedPaths.length / this.videosPerPage));
        this.homePage = Math.min(this.homePage, this.totalHomePages);
        this.isLoading(false);
      },
      error: (error) => {
        console.error('Failed to load stored paths', error);
        this.storedPaths = [];
        this.homePage = 1;
        this.totalHomePages = 1;
        this.isLoading(false);
      }
    })
  }

  /**
   * Starts loading and returns saved video paths.
   *
   * Usage note:
   * This method sets loading to true via isLoading(true).
   * After the async work finishes, you must call isLoading(false)
   * (for example in subscribe/complete/finalize) to stop the spinner.
   */
  refreshVideoPathList(): Observable<any> {
    this.isLoading(true);
    return this.storageService.getSavedPaths()
  }

  nagivateToUrlScreen(videoUrlIndex: any) {
    let index = { index: videoUrlIndex }
    this.router.navigate(['video'], { queryParams: index })
  }

  buildVideoFileUrl(path: string): string {
    if (!path) {
      return '';
    }
    return `file://${encodeURI(path)}`;
  }

  seekTilePreviewFrame(event: Event) {
    const video = event.target as HTMLVideoElement | null;
    if (!video) {
      return;
    }

    if (Number.isFinite(video.duration) && video.duration > 1) {
      video.currentTime = 1;
      return;
    }

    if (Number.isFinite(video.duration) && video.duration > 0.1) {
      video.currentTime = 0.1;
    }
  }

  navigateToDevTools() {
    this.router.navigate(['developer-tools']);
  }

  navigateToInfoPage() {
    this.router.navigate(['info']);
  }

  async openUploader() {
    const uploadResult = await this.videoUploadService.selectVideoAndPersist();
    if (!uploadResult) {
      return;
    }

    this.loadStoredPaths();
  }

  onHomeDragEnter(event: DragEvent) {
    if (!this.hasFileDragPayload(event)) {
      return;
    }

    event.preventDefault();
    this.homeDragDepth += 1;
    this.isDragOverHome = true;
  }

  onHomeDragOver(event: DragEvent) {
    if (!this.hasFileDragPayload(event)) {
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    this.isDragOverHome = true;
  }

  onHomeDragLeave(event: DragEvent) {
    if (!this.hasFileDragPayload(event)) {
      return;
    }

    event.preventDefault();
    this.homeDragDepth = Math.max(0, this.homeDragDepth - 1);
    if (this.homeDragDepth === 0) {
      this.isDragOverHome = false;
    }
  }

  async onHomeDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    await this.handleDropEvent(event);
  }

  @HostListener('document:dragover', ['$event'])
  onDocumentDragOver(event: DragEvent) {
    if (!this.hasFileDragPayload(event)) {
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
    this.isDragOverHome = true;
  }

  @HostListener('document:drop', ['$event'])
  async onDocumentDrop(event: DragEvent) {
    if (event.defaultPrevented) {
      return;
    }

    event.preventDefault();
    await this.handleDropEvent(event);
  }

  @HostListener('document:dragleave', ['$event'])
  onDocumentDragLeave(event: DragEvent) {
    if (!this.hasFileDragPayload(event)) {
      return;
    }

    const leavingWindow = event.clientX <= 0 || event.clientY <= 0;
    if (leavingWindow) {
      this.homeDragDepth = 0;
      this.isDragOverHome = false;
    }
  }

  private async handleDropEvent(event: DragEvent) {
    this.homeDragDepth = 0;
    this.isDragOverHome = false;

    const filePaths = this.getDroppedFilePaths(event);

    if (!filePaths.length) {
      return;
    }

    const uploadResult = await this.videoUploadService.persistVideoPaths(filePaths);

    if (!uploadResult) {
      return;
    }

    this.loadStoredPaths();
  }

  private hasFileDragPayload(event: DragEvent): boolean {
    const dragTypes = event.dataTransfer?.types;
    if (!dragTypes || dragTypes.length === 0) {
      return false;
    }

    const typeSet = new Set(Array.from(dragTypes));
    const result = typeSet.has('Files') || typeSet.has('text/uri-list') || typeSet.has('public.file-url');
    return result;
  }

  private getDroppedFilePaths(event: DragEvent): string[] {
    const seenPaths = new Set<string>();
    const pushPath = (maybePath: string | undefined | null) => {
      if (typeof maybePath !== 'string') {
        return;
      }
      const trimmed = maybePath.trim();
      if (!trimmed) {
        return;
      }
      seenPaths.add(trimmed);
    };

    const droppedItems = event.dataTransfer?.items;
    if (droppedItems?.length) {
      for (const item of Array.from(droppedItems)) {
        const itemFile = item.getAsFile();
        const itemPath = this.resolveDroppedFilePath(itemFile);
        pushPath(itemPath);
      }
    }

    const droppedFiles = event.dataTransfer?.files;
    if (droppedFiles?.length) {
      for (const file of Array.from(droppedFiles)) {
        const filePath = this.resolveDroppedFilePath(file);
        pushPath(filePath);
      }
    }

    // Fallback for platforms/browsers that provide dropped paths via URI text.
    const uriList = event.dataTransfer?.getData('text/uri-list') || event.dataTransfer?.getData('text/plain') || '';
    if (uriList.trim().length > 0) {
      const uriLines = uriList
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'));

      for (const uri of uriLines) {
        const normalizedPath = this.tryParseFileUri(uri);
        if (normalizedPath) {
          pushPath(normalizedPath);
        }
      }
    }

    return Array.from(seenPaths);
  }

  private resolveDroppedFilePath(file: File | null): string {
    if (!file) {
      return '';
    }

    const directPath = (file as any)?.path;
    if (typeof directPath === 'string' && directPath.trim().length > 0) {
      return directPath.trim();
    }

    const resolvedPath = (window as any)?.electron?.webUtils?.getPathForFile?.(file);
    if (typeof resolvedPath === 'string' && resolvedPath.trim().length > 0) {
      return resolvedPath.trim();
    }

    console.warn('Unable to resolve dropped file path', {
      name: file.name,
      type: file.type,
      size: file.size,
    });
    return '';
  }

  private tryParseFileUri(value: string): string {
    try {
      const maybeUrl = new URL(value);
      if (maybeUrl.protocol !== 'file:') {
        return '';
      }

      return decodeURIComponent(maybeUrl.pathname || '');
    } catch {
      return '';
    }
  }

  isLoading(loading: boolean) {
    if (loading) {
      this.loading = true;
      this.loader.show();
    } else {
      this.loading = false;
      this.loader.hide();
    }
  }

  deleteVideoPath(index: number) {
    this.storageService.deleteVideoPathAtIndex(index).subscribe(res => {
      this.loadStoredPaths();
    })
  }

  requestDeleteVideoPath(index: number, path: string) {
    this.pendingDeleteIndex = index;
    this.pendingDeleteTitle = this.getFileNameFromPath(path);
    this.showDeleteDialog = true;
  }

  handleDeleteConfirmation(confirmed: boolean) {
    const indexToDelete = this.pendingDeleteIndex;
    this.showDeleteDialog = false;

    if (confirmed && indexToDelete !== null) {
      this.deleteVideoPath(indexToDelete);
    }

    this.pendingDeleteIndex = null;
    this.pendingDeleteTitle = '';
  }

  private getFileNameFromPath(path: string): string {
    const pathParts = path.split(/[/\\]/);
    return pathParts[pathParts.length - 1] || path;
  }

  deleteAllVideoPaths() {
    this.storageService.clearAllVideoPaths();
    this.loadStoredPaths();
  }

  // TODO: unlock the feature
  unlockPremiumFeatures() {

  }

}

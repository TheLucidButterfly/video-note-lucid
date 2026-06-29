import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { StorageService } from './storage-service.service';
import { environment } from 'src/environments/environment';

interface VideoUploadResult {
  selectedFileNames: string[];
  firstNewPathIndex: number;
}

@Injectable({
  providedIn: 'root'
})
export class VideoUploadService {

  constructor(
    private storageService: StorageService
  ) { }

  /**
   * Opens the native file picker, saves selected paths, and returns metadata
   * about the newly uploaded files. Returns null when user cancels.
   */
  async selectVideoAndPersist(): Promise<VideoUploadResult | null> {
    try {
      const electronApi = (window as any)?.electron;
      if (!electronApi?.ipcRenderer?.invoke) {
        alert('Uploader is unavailable: Electron IPC bridge not found.');
        return null;
      }

      const remainingVideoSlots = await this.getRemainingVideoSlots();
      if (remainingVideoSlots === 0) {
        const currentCount = await this.getSavedVideoCount();
        alert(
          `Trial limit reached (${currentCount}/${environment.trialLimits.maxVideos} videos). ` +
          'Delete a video from Home to add another, or run non-trial mode.'
        );
        return null;
      }

      const filePaths: string[] = await electronApi.ipcRenderer.invoke('openDialog');
      if (!filePaths?.length) {
        return null;
      }

      const acceptedFilePaths =
        remainingVideoSlots === null ? filePaths : filePaths.slice(0, remainingVideoSlots);

      if (!acceptedFilePaths.length) {
        return null;
      }

      if (remainingVideoSlots !== null && filePaths.length > acceptedFilePaths.length) {
        alert(
          `Trial mode only saved ${acceptedFilePaths.length} video(s). ` +
          `Limit is ${environment.trialLimits.maxVideos} total videos.`
        );
      }

      const newUploadCount = acceptedFilePaths.length;
      const savedPaths = await firstValueFrom(
        this.storageService.saveExtractedVideoPaths(this.createPathObject(acceptedFilePaths) as any)
      );

      const firstNewPathIndex = Math.max(0, (savedPaths?.length || 0) - newUploadCount);

      return {
        selectedFileNames: this.getUploadedFileNamesList(acceptedFilePaths),
        firstNewPathIndex,
      };
    } catch (error: any) {
      console.error('selectVideoAndPersist failed:', error);
      alert(`Upload failed: ${error?.message || 'unknown error'}`);
      return null;
    }
  }

  private async getRemainingVideoSlots(): Promise<number | null> {
    if (!environment.trialMode) {
      return null;
    }

    const currentCount = await this.getSavedVideoCount();
    return Math.max(0, environment.trialLimits.maxVideos - currentCount);
  }

  private async getSavedVideoCount(): Promise<number> {
    try {
      const savedPaths = await firstValueFrom(this.storageService.getSavedPaths());
      if (!Array.isArray(savedPaths)) {
        return 0;
      }

      return savedPaths.filter((entry: any) => typeof entry?.path === 'string' && entry.path.trim().length > 0).length;
    } catch {
      return 0;
    }
  }

  private getUploadedFileNamesList(filePaths: string[]): string[] {
    return filePaths.map(filePath => {
      const parts = filePath.split(/[/\\]/);
      return parts[parts.length - 1];
    });
  }

  private createPathObject(paths: string[]) {
    return paths.map(path => {
      return {
        path,
        notes: []
      }
    })
  }
}

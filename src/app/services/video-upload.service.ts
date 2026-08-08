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
        const maxVideos = this.getConfiguredMaxVideos();
        alert(
          `Video limit reached (${currentCount}/${maxVideos} videos). ` +
          'Delete a video from Home to add another.'
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
        const maxVideos = this.getConfiguredMaxVideos();
        alert(
          `Only saved ${acceptedFilePaths.length} video(s). ` +
          `Video limit is ${maxVideos} total.`
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
    const maxVideos = this.getConfiguredMaxVideos();
    if (!Number.isFinite(maxVideos) || maxVideos <= 0) {
      return null;
    }

    const currentCount = await this.getSavedVideoCount();
    return Math.max(0, maxVideos - currentCount);
  }

  private getConfiguredMaxVideos(): number {
    if (environment.trialMode) {
      return environment.trialLimits.maxVideos;
    }

    return environment.fullLimits.maxVideos;
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

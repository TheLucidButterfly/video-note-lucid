import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { StorageService } from './storage-service.service';

interface VideoUploadResult {
  selectedFileNames: string[];
  firstNewPathIndex: number;
}

@Injectable({
  providedIn: 'root'
})
export class VideoUploadService {

  constructor(
    private storageService: StorageService,
    private router: Router
  ) { }

  /**
   * Opens the native file picker, saves selected paths, and returns metadata
   * about the newly uploaded files. Returns null when user cancels.
   */
  async selectVideoAndPersist(): Promise<VideoUploadResult | null> {
    const electronApi = (window as any)?.electron;
    if (!electronApi?.ipcRenderer?.invoke) {
      console.warn('Electron IPC is not available in browser mode.');
      return null;
    }

    const filePaths: string[] = await electronApi.ipcRenderer.invoke('openDialog');
    if (!filePaths?.length) {
      return null;
    }

    const newUploadCount = filePaths.length;
    const savedPaths = await firstValueFrom(
      this.storageService.saveExtractedVideoPaths(this.createPathObject(filePaths) as any)
    );

    const firstNewPathIndex = Math.max(0, (savedPaths?.length || 0) - newUploadCount);

    return {
      selectedFileNames: this.getUploadedFileNamesList(filePaths),
      firstNewPathIndex,
    };
  }

  async selectVideoAndNavigate(): Promise<void> {
    const result = await this.selectVideoAndPersist();
    if (!result) {
      return;
    }

    this.router.navigate(['video'], { queryParams: { index: result.firstNewPathIndex } });
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

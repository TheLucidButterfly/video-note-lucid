import { Component } from '@angular/core';
import { StorageService } from '../../services/storage-service.service';
import { Router } from '@angular/router';
import { LoadingNotificationService } from 'src/app/services/loading-notification/loading-notification.service';
import { Observable } from 'rxjs';
import { CentralService } from 'src/app/services/central.service';
import { VideoUploadService } from 'src/app/services/video-upload.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-home-view',
  templateUrl: './home-view.component.html',
  styleUrls: ['./home-view.component.css']
})
export class HomeViewComponent {

  readonly environment = environment;
  readonly homeDevButtonsDeveloped = false;
  locationRef = location;
  title = 'video-notes';

  // *legacy
  // savedVideos: SavedVideo[] = []

  storedPaths: any
  pageViewing = 'Home'
  loading = false;
  devMode = true;
  showDialog = false;
  showDeleteDialog = false;
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
        this.isLoading(false);
      },
      error: (error) => {
        console.error('test1: Failed to load stored paths', error);
        this.storedPaths = [];
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

  // *Legacy
  // refreshVideoList() {
  //   this.isLoading(true);
  //   this.storageService
  //     .getVideos()
  //     .subscribe((storedVideos) => {
  //       storedVideos ? this.savedVideos = storedVideos : [];
  //       this.isLoading(false);
  //     })
  // }

  // *Legacy
  // navigateToVideoScreen(videoIndex: any) {
  //   let index = { index: videoIndex }
  //   this.router.navigate(['video'], { queryParams: index })
  // }

  nagivateToUrlScreen(videoUrlIndex: any) {
    let index = { index: videoUrlIndex }
    this.router.navigate(['video'], { queryParams: index })
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
